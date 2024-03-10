const { default: axios } = require("axios");
const fp = require("fastify-plugin");

const calculateDefaultCash = async (items, percent = 1) => {
  let cash_back = 0;

  for (const item of items) {
    cash_back += item.value * item.price * (percent / 100);
  }
  return cash_back;
};

module.exports = fp((instance, _, next) => {
  async function updateClient(query, receipt, cash_back, minus_cash) {
    minus_cash = minus_cash ? minus_cash : 0;
    return await instance.clientsDatabase
      .findOneAndUpdate(
        query,
        {
          $inc: {
            point_balance: cash_back - minus_cash,
            total_sale: receipt.total_price,
            sales: 1,
          },
          // $push: {
          //   debt_pay_history: {
          //     receipt_id: receipt._id,
          //     receipt_no: receipt.receipt_no,
          //     cash_back: cash_back,
          //     total_price: receipt.total_price,
          //     currency: receipt.currency,
          //     currency_value: receipt.currency_value,
          //     total_price: receipt.total_price,
          //     date: receipt.date,
          //     minus_cash: minus_cash ? minus_cash : 0,
          //     comment: receipt.comment
          //       ? receipt.comment
          //       : `receipt cash-back ${minus_cash ? `cashback used ${minus_cash}` : ''}`,
          //   }
          // }
        },
        { new: true },
      )
      .lean()
      .then((res) => res)
      .catch((err) => {
        const text =
          `\norganization: ${
            receipt.organization && receipt.organization._id
              ? receipt.organization._id
              : receipt.organization
          }` +
          `\n\nClient phone: ${receipt.cashback_phone}` +
          `\n\nReceipt: ${receipt._id}\n\n` +
          err +
          `\n\nLine: 43`;
        instance.send_Error(
          `${process.env.cash_back_URL}/clients?phone=${receipt.cashback_phone}`,
          text,
        );
      });
  }
  async function calculateCash(receipt, client, user) {
    try {
      const zdachi_to_cashback = isNaN(receipt.zdachi_to_cashback)
        ? 0
        : receipt.zdachi_to_cashback;
      const phone_number = receipt.cashback_phone
        .replace("+", "")
        .replace("+", "");

      const organization = await instance.organizations
        .findById(receipt.organization)
        .lean();
      if (!organization)
        instance.send_Error(
          `organization not found, _id: ${receipt.organization}. receipt: ${receipt._id}`,
          `calculateCash`,
        );

      receipt.organization = organization;

      const query = {
        phone_number: { $regex: phone_number, $options: "i" },
        organization:
          organization._id == "61ae2917a914c3ba42fc626f"
            ? "5f5641e8dce4e706c062837a"
            : organization._id,
      };
      const clientsDatabase = await instance.clientsDatabase
        .findOne(query, { _id: 1 })
        .lean();
      const default_cash_back =
        (await calculateDefaultCash(
          receipt.sold_item_list,
          organization.loyalty_bonus,
        )) + zdachi_to_cashback;

      // agar cashbackni ishlatsa minus qilish
      const gift = receipt.payment.find((pay) => pay.name == "gift");
      const cashback_pay = receipt.payment.find(
        (pay) => pay.name == "cashback",
      );

      minus_cash =
        cashback_pay && cashback_pay.value
          ? cashback_pay.value
          : gift && gift.value
          ? gift.value
          : 0;

      //Yilmaz cashback
      if (organization._id == "6087b4bc3ca09c0c71d6b52f") {
        if (!clientsDatabase)
          return instance.send_Error(
            `${process.env.cash_back_URL}/clients?phone=${phone_number}`,
            `Yilmazni clienti topilmadi!\nphone_number: ${phone_number}`,
          );
        return await updateClient(
          query,
          receipt,
          default_cash_back,
          minus_cash,
        );
      }

      if (!clientsDatabase) {
        // const CashBackClient = await axios.get(`${process.env.cash_back_URL}/clients?phone=${phone_number}`)
        const CashBackClient = await axios
          .get(`${process.env.cash_back_URL}/users?phone=${phone_number}`)
          .then((res) => res.data)
          .catch((err) => {});

        if (!CashBackClient) {
          const text =
            `\norganization: ${organization._id}` +
            `\nOrganization name: ${organization.name}` +
            `\n\nClient phone: ${phone_number}` +
            `\n\nReceipt: ${receipt._id}` +
            `\n\nLine: 82`;
          //send error to devs
          return instance.send_Error(
            `${process.env.cash_back_URL}/users?phone=${phone_number}`,
            text,
          );
        }
        let user_id = new Date().getTime();
        try {
          user_id =
            CashBackClient.birthDate
              .replace(".", "")
              .replace(".", "")
              .replace(".", "") +
            CashBackClient.phoneNumber.replace("+", "") +
            new Date().getTime();
        } catch (error) {}
        await new instance.clientsDatabase({
          user_id: user_id,
          organization: organization._id,
          first_name: CashBackClient.firstName,
          last_name: CashBackClient.LastName,
          phone_number: CashBackClient.phoneNumber,
          point_balance: 0,
          total_sale: 0,
          sales: 0,
        }).save();
      }
      let cash_back = default_cash_back;

      if (clientsDatabase && organization && organization.webhook_url) {
        await axios
          .post(`${organization.webhook_url}`, {
            clientId: clientsDatabase._id,
            usedCashback: minus_cash,
            givenCashback: cash_back,
          })
          .catch(async (err) => {
            return {
              statusText: `organization.webhook_url: ${
                organization.webhook_url
              }/receipts end pointga post qilib bolmadi!\n${JSON.stringify(
                err,
                null,
                "\t",
              )}`,
              status: 404,
              cash_back: cash_back,
            };
          });
      }

      //Tiin uchun
      if (
        organization._id == "5f5641e8dce4e706c062837a" ||
        organization._id == "61ae2917a914c3ba42fc626f"
      ) {
        const res = await axios
          .post(`${process.env.cash_back_URL}/receipts`, receipt)
          .then((res) => res)
          .catch(async (err) => {
            return {
              statusText: `${
                process.env.cash_back_URL
              }/receipts end pointga post qilib bolmadi!\n${JSON.stringify(
                err,
                null,
                "\t",
              )}`,
              status: 404,
              cash_back: default_cash_back,
            };
          });
        // console.log(res?.status, 'res status');
        if (res.data && res.data.cash_back && !isNaN(res.data.cash_back))
          cash_back = parseFloat(res.data.cash_back) + zdachi_to_cashback;

        if (res.status !== 201) {
          //send error
          const text2 =
            `Error on post, \nstatusText: ${res.statusText}` +
            `\nStatus: ${res.status}` +
            `\norganization: ${organization._id}` +
            `\nOrganization name: ${organization.name}` +
            `\n\nClient phone: ${phone_number}` +
            `\n\nReceipt: ${receipt._id}`;

          instance.send_Error(
            `${process.env.cash_back_URL}/clients?phone=${phone_number}`,
            text2,
          );
        }
      }
      await updateClient(query, receipt, cash_back, minus_cash);
      return cash_back;
    } catch (err) {
      const text =
        `\norganization: ${
          receipt.organization && receipt.organization._id
            ? receipt.organization._id
            : receipt.organization
        }` +
        `\n\nClient phone: ${receipt.cashback_phone}` +
        `\n\nReceipt: ${receipt._id}\n\n` +
        err +
        `\n\nLine: 147`;
      //send error to devs
      return instance.send_Error(
        `${process.env.cash_back_URL}/clients?phone=${receipt.cashback_phone}`,
        text,
      );
    }
  }

  async function findCashbackProvider(organization) {
    return await instance.cashBackProviders
      .findOne({
        organization: instance.ObjectId(organization),
        is_active: true,
      })
      .lean();
  }
  instance.decorate("CashBackClientUpdate", calculateCash);

  async function get_client(phone, organizationId) {
    try {
      return await instance.clientsDatabase
        .findOne(
          {
            phone_number: `+${phone.replace("+", "")}`,
            organization: organizationId,
          },
          {
            first_name: 1,
            last_name: 1,
            point_balance: 1,
            phone_number: 1,
            organization: 1,
            status: 1,
            is_minimum_price: 1,
          },
        )
        .lean();
    } catch (error) {
      return null;
    }
  }
  instance.get("/cash-back/client", { version: "1.1.0" }, (request, reply) => {
    instance.authorization(request, reply, async (admin) => {
      if (admin) {
        if (!request.query.phone) return reply.fourorfour("client");

        const organization = admin.organization;
        const client = await get_client(request.query.phone, organization);
        if (!client) return reply.fourorfour("client");

        return reply.ok(client);
      } else return reply.unauthorized();
    });
  });
  instance.get(
    "/cash-back/client",
    { version: "1.0.0" },
    async (request, reply) => {
      const organization = request.query.organization
        ? request.query.organization
        : "";
      // instance.authProvider(request, reply, (provider) => {
      // if (provider) {
      // }
      // return await get_client(request.query.phone, organization)
      const client = await get_client(request.query.phone, organization);
      return reply.ok(client);
      // if (admin) { get_sku(request, reply, admin) }
      // })
    },
  );
  next();
});
