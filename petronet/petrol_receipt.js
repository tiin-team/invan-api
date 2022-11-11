const fp = require("fastify-plugin");

const petrolReceiptCreate = async (request, reply, instance) => {

  const user = request.user, body = request.body;

  try {
    let client = await instance.clientsDatabase.findOne(
      {
        organization: user.organization,
        user_id: body.client.card_no,
        note: body.client.id,
      },
      {
        _id: 1,
      }
    )
      .lean()

    if (!client) {
      client = await instance.clientsDatabase.create({
        id: body.client.id,
        organization: user.organization,
        user_id: body.client.card_no,
      })
      // return reply.fourorfour("Client")
    }

    const organization = await instance.organizations
      .findById(
        user.organization,
        { loyalty_bonus: 1 },
      )
      .lean()

    let cashback = 0, total_price = 0, total_pay = 0

    for (const item of body.items) {
      total_price += item.value * item.price
      cashback += item.value * item.price * organization.loyalty_bonus / 100
    }

    if (total_price != body.total_price)
      return reply.code(400).send({
        message: "TOTAL_PRICE_ERROR"
      })

    for (const pay of body.payment) {
      total_pay += pay.value
    }

    if (total_price != total_pay)
      return reply.code(400).send({
        message: "TOTAL_PAYMENT_SUM_ERROR"
      })

    body.client = client._id
    body.cash_back = cashback

    await instance.petronetReceipt.create(body)

    await instance.clientsDatabase.findByIdAndUpdate(
      client._id,
      {
        $inc: {
          point_balance: cashback,
          visit_counter: 1,
          sales: 1,
          total_sale: 1,
        },
        $set: {
          last_visit: body.date
        }
      },
      {
        new: true,
        lean: true,
      }
    );

    reply.code(201).send({
      message: "SUCCESS"
    });
  } catch (error) {
    reply.code(500).send({
      message: "INTERNAL_SERVER_ERROR"
    });
    instance.send_Error(`petronet receiptCreate`, error)
  }
  return reply;
};

module.exports = fp((instance, _, next) => {

  const petrolReceiptSchema = {
    shema: {
      body: {
        type: "object",
        additionalProperties: false,
        required: [
          "date",
          "total_price",
          "payment",
          "items",
          "client",
        ],
        properties: {
          // cashier_id: { type: "string" },
          cashier_name: { type: "string" },
          date: { type: "number" },
          receipt_no: { type: "string" },
          total_price: { type: "number" },
          currency: {
            type: "string",
            enum: ["uzs", "usd"],
            default: "uzs",
          },
          client: {
            type: "object",
            required: ["id", "card_no"],
            properties: {
              id: { type: "string" },
              card_no: { type: "string" },
            },
          },
          items: {
            type: "array",
            items: {
              type: "object",
              required: ["name", "price", "value"],
              properties: {
                discount: { type: "number", default: 0, },
                product_id: { type: "string" },
                name: { type: "string" },
                price: { type: "number" },
                barcode: { type: "string", default: "" },
                currency: {
                  type: 'string',
                  default: 'uzs'
                },
                value: { type: "number" },
                comment: { type: "string", default: "" },
              },
            }
          },
          payment: {
            type: "array",
            items: {
              type: "object",
              required: ["name", "value"],
              properties: {
                name: {
                  type: "string",
                  enum: ["cash", "card", "gift", "debt", "qr_code", "nfc", "cashback"],
                },
                value: { type: "number" },
              },
            },
          },
          comment: { type: "string", default: "" },
        },
      },
    },
  }

  instance.post(
    "/petrol-receipt/create",
    {
      version: "2.0.0",
      ...petrolReceiptSchema,
      attachValidation: true,
    },
    async (request, reply) => {
      if (request.validationError) {
        return reply.validation(request.validationError.message);
      }

      if (request.headers["authorization"] != "KKHUs4zMeQYGndkhvjrXXN") {
        return instance.unauthorized(reply)
      }

      const admin = await instance.User
        .findOne(
          {
            organization: "623fc1a1710dc4e2f01fa304",
            $and: [
              { admin_token: { $exists: true } },
              { admin_token: { $ne: "" } },
            ],
          },
          {
            admin_token: 1,
          },
        )
        .lean()

      request.headers["authorization"] = admin.admin_token;
      request.headers["accept-user"] = "admin";

      instance.authorization(request, reply, (user) => {
        request.user = user;
        petrolReceiptCreate(request, reply, instance);
      });
    }
  );

  next();
});
