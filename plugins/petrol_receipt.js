const fp = require("fastify-plugin");

const petrolReceiptCreate = async (request, reply, instance) => {
  const user = request.user;
  const body = request.body;

  try {
    const client = await instance.clientsDatabase.findOne(
      {
        organization: user.organization,
        user_id: body.user_id,
      },
      {
        _id: 1,
      }
    )
      .lean()

    if (!client) return reply.fourorfour("Client")

    const organization = await instance.organizations
      .findById(
        user.organization,
        { loyalty_bonus: 1 },
      )
      .lean()

    const cashback = body.item.value * body.item.price * organization.loyalty_bonus / 100


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

    reply.ok();
  } catch (error) {
    reply.error(error.message);
    instance.send_Error(`receiptCreateGroup, service_id: ${service_id}, pos_id: ${pos_id}`, error)
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
          "user_id",
        ],
        properties: {
          // cashier_id: { type: "string" },
          cashier_name: { type: "string" },
          date: { type: "number" },
          user_id: { type: "string" },
          receipt_no: { type: "string" },
          total_price: { type: "number" },
          currency: {
            type: "string",
            enum: ["uzs", "usd"],
            default: "uzs",
          },
          item: {
            type: "object",
            properties: {
              // product_id: { type: "string" },
              product_name: { type: "string" },
              price: { type: "number" },
              price_currency: { type: "string" },
              currency: {
                type: 'string',
                default: 'uzs'
              },
              value: { type: "number" },
              comment: { type: "string", default: "" },
            },
          },
          comment: { type: "string" },
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
        return petrolReceiptCreate(request, reply, instance);
      });
    }
  );

  next();
});
