module.exports = (instance, _, next) => {
  const params = {
    schema: {
      params: {
        type: "object",
        required: ["min", "max", "organization"],
        properties: {
          min: {
            type: "number",
            minimum: 1,
          },
          max: {
            type: "number",
            minimum: 1,
          },
          organization: {
            type: "string",
            minLength: 24,
            maxLength: 24,
          },
        },
      },
    },
  };

  // reports by receipts

  const export_receipts = async (request, reply, admin) => {
    try {
      const { organization, min, max } = request.params;

      const filterReceipts = {
        organization: organization,
        receipt_state: {
          $ne: "draft",
        },
        debt_id: null,
        date: {
          $gte: min - 5 * 60 * 60 * 1000,
          $lte: max - 5 * 60 * 60 * 1000,
        },
      };

      const receipts = await instance.Receipts.aggregate([
        {
          $match: filterReceipts,
        },
        {
          $project: {
            receipt_no: 1,
            date: 1,
            employee: 1,
            total_price: 1,
            is_refund: 1,
            service: 1,
            cashier_id: 1,
            user_id: 1,
          },
        },
        {
          $sort: {
            date: -1,
          },
        },
        {
          $limit: 1000,
        },
      ]);

      const serviceMap = {};
      const employeeMap = {};
      const customerMap = {};

      const excelRows = [];
      for (const index in receipts) {
        try {
          receipts[index] = receipts[index].toObject();
        } catch (error) {}

        // service
        if (!serviceMap[receipts[index].service]) {
          try {
            const service = await instance.services.findById(
              receipts[index].service
            );
            if (service) {
              serviceMap[service._id] = service;
            }
          } catch (error) {}
        }

        if (serviceMap[receipts[index].service]) {
          receipts[index].service_name =
            serviceMap[receipts[index].service].name;
        }

        // employee
        if (!employeeMap[receipts[index].cashier_id]) {
          try {
            const cashier = await instance.User.findById(
              receipts[index].cashier_id
            );
            if (cashier) {
              employeeMap[cashier._id] = cashier;
            }
          } catch (error) {}
        }

        if (employeeMap[receipts[index].cashier_id]) {
          receipts[index].cashier_name =
            employeeMap[receipts[index].cashier_id].name;
        }

        // customer
        if (receipts[index].user_id && !customerMap[receipts[index].user_id]) {
          try {
            const customer = await instance.clientsDatabase.findOne({
              user_id: receipts[index].user_id,
            });
            if (customer) {
              customerMap[customer._id] = customer;
            }
          } catch (error) {}
        }

        if (receipts[index].user_id && customerMap[receipts[index].user_id]) {
          receipts[index].customer_name =
            customerMap[receipts[index].user_id].name;
        } else {
          receipts[index].customer_name = "-";
        }

        const user = request.user;
        if (user.ui_language && user.ui_language.value != undefined) {
          instance.i18n.setLocale(user.ui_language.value);
        }

        excelRows.push({
          [`${instance.i18n.__("number")}`]: receipts[index].receipt_no,
          [`${instance.i18n.__("date")}`]: instance.date_ddmmyy_hhmm(
            receipts[index].date
          ),
          [`${instance.i18n.__("service_name")}`]: receipts[index].service_name,
          [`${instance.i18n.__("cashier_name")}`]: receipts[index].cashier_name,
          [`${instance.i18n.__("customer_name")}`]: receipts[index]
            .customer_name,
          [`${instance.i18n.__("type")}`]: receipts[index].is_refund
            ? "Debt"
            : "Sale",
          [`${instance.i18n.__("total_cost")}`]: receipts[index].total_price,
        });
      }

      const fs = require("fs");
      const json2xls = require("json2xls");
      const xls = json2xls(excelRows);
      const timeStamp = new Date().getTime();

      fs.writeFileSync(`./static/receipts-${timeStamp}.xls`, xls, "binary");

      reply.sendFile(`./receipts-${timeStamp}.xls`);
      setTimeout(() => {
        fs.unlink(`./static/receipts-${timeStamp}.xls`, (err) => {
          if (err) {
            instance.send_Error(
              "exported " + name + " file",
              JSON.stringify(err)
            );
          }
        });
      }, 2000);
    } catch (error) {
      reply.error(error.message);
    }
    return reply;
  };

  instance.get(
    "/reports/by_receipt/export/:min/:max/:organization/:token/:name",
    params,
    (request, reply) => {
      const { token } = request.params;
      request.headers["authorization"] = token;
      request.headers["accept-user"] = "admin";
      instance.oauth_admin(request, reply, (user) => {
        if (!user) {
          return reply.error("Access");
        }
        request.user = user;
        export_receipts(request, reply);
      });
    }
  );

  next();
};
