const fs = require("fs");
const csvParser = require("csv-parse");

module.exports = (instance, options, next) => {
  function update_customer(user, query, customer) {
    instance.clientsDatabase.updateOne(
      query,
      {
        $set: customer,
      },
      (err) => {
        instance.send_Error("update customer", JSON.stringify(err));
      }
    );
  }

  instance.post("/clients/import", options.version, (request, reply) => {
    instance.oauth_admin(request, reply, async (user) => {
      const files = request.raw.files;
      if (!files || !files["file"]) {
        return reply.fourorfour("file");
      }

      const file = files["file"];
      const url = `./static/${file.md5}${file.name}`;
      const wstream = fs.createWriteStream(url);
      wstream.write(file.data);
      wstream.end();

      let csvData;
      try {
        csvData = await fs.promises.readFile(url, "utf-8");
      } catch (error) {
        instance.send_Error("upload file customers", JSON.stringify(error));
        return reply.error("Error on uploading file");
      }

      csvParser(csvData, async function (err, data) {
        if (err) {
          instance.send_Error(
            "parse uploaded customers file",
            JSON.stringify(err)
          );
          return reply.error("Error on parsing uploaded customers file");
        }

        const customers = instance.csv_to_json_converter(data);

        const phone_numbers = [];
        const mapCustomerByPhone = {};
        const mapIsCustomerByPhone = {};

        for (let i = 0; i < customers.length; i++) {
          customers[i].organization = user.organization;
          const phone = customers[i].phone_number;
          if (phone) {
            phone_numbers.push(phone);
          }
          mapCustomerByPhone[phone] = customers[i];
          mapIsCustomerByPhone[phone] = true;
        }

        try {
          const foundCustomers = await instance.clientsDatabase.find({
            organization: user.organization,
            phone_number: { $in: phone_numbers },
          });
          for (let i = 0; i < foundCustomers.length; i++) {
            const query = {
              organization: user.organization,
              phone_number: foundCustomers[i].phone_number,
            };
            update_customer(
              user,
              query,
              mapCustomerByPhone[foundCustomers[i].phone_number]
            );
            mapIsCustomerByPhone[foundCustomers[i].phone_number] = false;
          }
        } catch (error) {
          instance.send_Error("updating customers", JSON.stringify(err));
        }

        try {
          const customersToSave = customers.filter(
            (c) => mapIsCustomerByPhone[c.phone_number]
          );
          if (!customersToSave) {
            return reply.ok();
          }

          for (const c of customersToSave) {
            try {
              await new instance.clientsDatabase(c).save();
            } catch (error) {
              instance.send_Error("saving customers", JSON.stringify(err));
            }
          }

          // await instance.clientsDatabase.insertMany(customersToSave);
          return reply.ok();
        } catch (error) {
          instance.send_Error("saving customers", JSON.stringify(err));
          return reply.error("Error on saving uploaded customers");
        }
      });
    });
  });

  instance.get("/clients/export/:token/:name", (request, reply) => {
    request.headers["authorization"] = request.params.token;
    request.headers["accept-user"] = "admin";
    instance.oauth_admin(request, reply, (user) => {
      instance.clientsDatabase.find(
        {
          organization: user.organization,
        },
        (err, clients) => {
          var title = [
            "user_id",
            "first_name",
            "last_name",
            "phone_number",
            "email",
            "note",
            "total_spent",
            "point_balance",
            "visit_counter",
          ];
          var clients_array = [title];
          for (var c of clients) {
            var client = [];
            client.push(c.user_id);
            client.push(c.first_name);
            client.push(c.last_name);
            client.push(c.phone_number);
            client.push(c.email);
            client.push(c.note);
            client.push(c.total_spent);
            client.push(c.point_balance);
            client.push(c.visit_counter);
            clients_array.push(client);
          }
          const CSVString = clients_array.join("\n");
          var file = "customers.csv";
          fs.writeFile("./static/" + file, CSVString, (err) => {
            if (err) {
              instance.send_Error("writing to file", JSON.stringify(err));
            }
            reply.sendFile("./" + file, (err) => {
              instance.send_Error("on sending file", JSON.stringify(err));
            });
            setTimeout(() => {
              fs.unlink("./static/" + file, (err) => {
                if (err) {
                  instance.send_Error(
                    "exported items file",
                    JSON.stringify(err)
                  );
                }
              });
            }, 1000);
          });
        }
      );
    });
  });

  const get_customers = async (request, reply, user) => {

    try {
      // organization: user.organization,
      const query = {
        organization: user.organization == '61ae2917a914c3ba42fc626f' ? '5f5641e8dce4e706c062837a' : user.organization,
      };

      if (request.body && typeof request.body.search == typeof "invan") {
        const search = request.body.search.replace('+', '');
        query["$or"] = [
          {
            first_name: {
              $regex: search,
              $options: "i",
            },
          },
          {
            cartame_id: {
              $regex: search,
              $options: "i",
            },
          },
          {
            last_name: {
              $regex: search,
              $options: "i",
            },
          },
          {
            phone_number: {
              $regex: search,
              $options: "i",
            },
          },
          {
            user_id: {
              $regex: search,
              $options: "i",
            },
          },
        ];
      }
      const $project = {
        _id: 1,
        user_id: 1,
        first_name: 1,
        last_name: 1,
        visit_counter: 1,
        total_sale: 1,
        sales: 1,
        refunds: 1,
        debt: 1,
        first_visit: 1,
        last_visit: 1,
        point_balance: 1,
        debt_pay_history: 1,
        is_minimum_price: 1,
        organization: 1,
        phone_number: 1,
        createdAt: 1,
        updatedAt: 1,
      }
      if (request.params.page == undefined) {
        const clients = await instance.clientsDatabase.find(query, $project)
          .sort({ point_balance: -1 })
          .limit(1000);

        return reply.ok(clients);
      }

      const total = await instance.clientsDatabase.countDocuments(query);
      const limit = parseInt(request.params.limit);
      const page = parseInt(request.params.page);
      const clients = await instance.clientsDatabase.find(query, $project).sort({ _id: 1 })
        // .sort({ _id: 1 })
        .sort({ point_balance: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

      reply.ok({
        total,
        data: clients
      })

      // instance.clientsDatabase.find(query, (err, clients) => {
      //   if (request.params.page == undefined) {
      //     return reply.ok(clients);
      //   }
      //   var total = clients.length;
      //   var page = parseInt(request.params.page);
      //   var limit = parseInt(request.params.limit);
      //   reply.ok({
      //     total: total,
      //     data: clients.splice(limit * (page - 1), limit),
      //   });
      // }).sort({ _id: -1 });
    }
    catch (error) {
      reply.error(error.message)
    }
    return reply;

  };
  const get_customers_point_balance = async (request, reply, user) => {

    try {
      const query = {
        organization: user.organization == '61ae2917a914c3ba42fc626f' ? '5f5641e8dce4e706c062837a' : user.organization,
      };

      if (request.query && typeof request.query.search == typeof "invan") {
        const search = request.query.search;
        query["$or"] = [
          {
            first_name: {
              $regex: search,
              $options: "i",
            },
          },
          {
            last_name: {
              $regex: search,
              $options: "i",
            },
          },
          {
            phone_number: {
              $regex: search,
              $options: "i",
            },
          },
          {
            user_id: {
              $regex: search,
              $options: "i",
            },
          },
        ];
      }
      const $project = {
        _id: 1,
        total_sale: 1,
        organization: 1,
        sales: 1,
        refunds: 1,
        point_balance: 1,
      }
      const $group = {
        _id: "$organization",
        total: { $sum: "$point_balance" }
      }

      const clients = await instance.clientsDatabase.aggregate([
        {
          $match: query,
        },
        {
          $project: $project,
        },
        {
          $group: $group,
        },
        // {
        //   $sort: { point_balance: -1 },
        // }
      ]);

      reply.ok(clients[0])
    }
    catch (error) {
      reply.error(error.message)
    }
    return reply;

  };
  const handler = (request, reply) => {
    instance.authorization(request, reply, (user) => {
      get_customers(request, reply, user);
    });
  };
  async function create_customer_cashback(request, reply, is_reply = true) {

    try {
      const customer = await get_client(
        request.body.phone_number,
        request.body.organization
      );
      if (customer && request.body.phone_number) {
        await change_client(customer._id, request.body);
        return reply.ok(customer);
      }

      request.body.user_id = await get_default_user_id(request.body.organization, request.body.phone_number)
      // request.body.organization = request.body.organization;
      const created_customer = await insert_new_client(request.body);
      return reply.ok(created_customer);
    } catch (error) {
      if (error.code === -55000) {
        instance.send_Error(error.message, JSON.stringify(error.data));
        if (is_reply) {
          return reply.error(error.message);
        } else {
          return null;
        }
      }
      throw error;
    }
  }
  instance.get("/clients/point_balance", { version: "2.0.0" }, (request, reply) => {
    // instance.authorization(request, reply, (user) => {
    // get_customers_point_balance(request, reply, user);
    get_customers_point_balance(request, reply, { organization: '61ae2917a914c3ba42fc626f' });
    // });
  });
  instance.post("/customer/create", { version: "2.0.0" }, create_customer_cashback);
  instance.post("/clients/search", { version: "1.0.0" }, handler);

  instance.get("/clients/search", { version: "1.1.0" }, handler);

  instance.post(
    "/clients/searching/:limit/:page",
    { version: "1.0.0" },
    (request, reply) => {
      instance.authorization(request, reply, (user) => {
        get_customers(request, reply, user);
      });
    }
  );

  /**
   * Create a custom user error with given message and details. Code is always -55000.
   * @param {string} message error message to identify an error
   * @param {*} data error details
   * @returns {{code: number, message: string, data: *}}
   */
  function UserError(message, data) {
    return {
      code: -55000,
      message,
      data,
    };
  }

  /**
   * Retrieve a client by phone number & organization ID.
   * @param {string} phone phone number
   * @param {string} organizationId organization ID
   * @returns {Promise<any>} found client instance or null if not found
   * @throws UserError on any db errors
   */
  async function get_client(phone, organizationId) {
    try {
      return await instance.clientsDatabase
        .findOne({
          phone_number: phone,
          organization: organizationId,
        })
        .lean()
        .exec();
    } catch (error) {
      throw UserError("error on client database find by phone number", error);
    }
  }

  /**
   * Updates a client by ID with the given client data.
   * @param {ObjectId} id ID of the client
   * @param {*} client client data
   * @returns {Promise<*>} update operation result
   * @throws UserError on any db errors
   */
  async function change_client(id, client) {
    try {
      return await instance.clientsDatabase.updateOne(
        { _id: id },
        { $set: client }
      );
    } catch (error) {
      throw UserError("error on updating", error);
    }
  }

  /**
   * Generates a new user ID for the specified organization
   * @param {string} organizationId ID of the organization
   * @returns {Promise<number|*>} a new user ID
   * @throws UserError on any db errors
   */
  async function get_default_user_id(organizationId, phone_number) {
    try {
      const date = new Date()
      // let default_user_id = 10000;

      // const client = await instance.clientsDatabase
      //   .findOne({ organization: organizationId }, { user_id: 1 })
      //   .sort({ user_id: -1 })
      //   .lean()
      //   .exec();

      // if (!client || !client.user_id) {
      //   return default_user_id;
      // }

      // return +client.user_id + 1;
      return phone_number ?
        phone_number.replace(/\+/, "") + date.getTime()
        : date.getTime()

    } catch (error) {
      throw UserError("error on getting a default user id", error);
    }
  }

  /**
   * Creates a new client record in DB
   * @param {*} clientData client data
   * @returns {Promise<*>} the new client record
   * @throws UserError on any db errors
   */
  async function insert_new_client(clientData) {
    try {
      if (!clientData.user_id) {
        clientData.user_id = clientData.phone_number.replace(/\+/, "") + new Date().getTime();
      }
      clientData.gender = ['male', 'female', 'not_set'].includes(clientData.gender) ? clientData.gender : 'not_set'
      const newClient = new instance.clientsDatabase(clientData);
      const result = await newClient.save();
      if (!result) {
        throw "save failed";
      }
      return result;
    } catch (error) {
      throw UserError("error on creating a customer", error);
    }
  }

  async function create_customer(request, reply, user, is_reply = true) {
    try {
      delete request.body._id
      const customer = await get_client(
        request.body.phone_number,
        user.organization
      );

      if (customer && request.body.phone_number) {
        await change_client(customer._id, request.body);
        if (is_reply) {
          return reply.ok(customer);
        } else {
          return customer;
        }
      }

      request.body.user_id = await get_default_user_id(user.organization, request.body.phone_number)
      request.body.organization = user.organization;
      const created_customer = await insert_new_client(request.body);
      if (is_reply) {
        return reply.ok(created_customer);
      } else {
        return created_customer;
      }
    } catch (error) {
      if (error.code === -55000) {
        instance.send_Error(error.message, JSON.stringify(error.data));
        if (is_reply) {
          return reply.error(error.message);
        } else {
          return null;
        }
      }
      throw error;
    }
  }

  const createHandler = (request, reply) => {
    instance.authorization(request, reply, (user) => {
      return create_customer(request, reply, user);
    });
  };

  instance.post("/customer/create", options.version, createHandler);
  instance.post("/customer/create", { version: "1.1.0" }, createHandler);

  const clientCreateGroup = async (request, reply, instance) => {
    const user = request.user;
    const customers = [];
    for (const body of request.body) {
      let saved_customer = await create_customer(
        { body: body },
        reply,
        user,
        false
      );
      if (saved_customer) {
        customers.push(saved_customer);
      }
    }
    reply.ok(customers);
  };

  instance.post(
    "/customer/create_group",
    {
      version: "1.1.0",
      schema: {
        body: {
          type: "array",
          items: {
            type: "object",
            required: [
              "phone_number",
              "first_name",
              "last_name",
              "email",
              "note",
              "user_id",
            ],
            additionalProperties: false,
            properties: {
              phone_number: { type: "string" },
              first_name: { type: "string" },
              last_name: { type: "string" },
              email: { type: "string" },
              note: { type: "string" },
              user_id: { type: "string" },
              is_minimum_price: { type: "boolean" }
            },
          },
        },
      },
      attachValidation: true,
    },
    (request, reply) => {
      if (request.validationError) {
        return reply.validation(request.validationError.message);
      }
      instance.authorization(request, reply, (admin) => {
        request.user = admin;
        return clientCreateGroup(request, reply, instance);
      });
    }
  );

  async function update_client(request, reply, user) {
    try {
      const id = request.params.id;
      const body = request.body;
      const customer = await instance.clientsDatabase
        .findOne({ _id: id })
        .lean();
      if (!customer) {
        return reply.fourorfour("Customer");
      }
      if (body.paid) {
        if (!(customer.debt_pay_history instanceof Array)) {
          customer.debt_pay_history = [];
        }
        if (!customer.debt) {
          customer.debt = 0;
        }

        let current_currency = await instance.Currency
          .findOne({
            organization: user.organization,
          })
          .lean();
        if (!current_currency) {
          current_currency = {
            value: 1,
            currency: "uzs",
          };
        }

        let paid_debt =
          body.currency != current_currency.currency && current_currency.currency == 'usd'
            ? body.currency == "usd"
              ? body.paid * current_currency.value
              : body.paid / current_currency.value
            : body.paid;

        customer.debt -= paid_debt;

        const current_date = new Date().getTime();
        customer.debt_pay_history.push({
          paid: body.paid,
          currency: body.currency,
          currency_value: current_currency.value,
          date: current_date,
          comment: body.comment,
          by_id: user._id,
          by_name: user.name,
          amount_type: body.amount_type,
        });
        body.debt = customer.debt;
        body.debt_pay_history = customer.debt_pay_history;

        /** add to safe */
        const safe_data = {
          organization: user.organization,
          type: body.currency,
          value: body.paid
        }
        const safe_history = {
          by_user: user._id,
          by_user_name: user.name,
          history_type: 'customer_debt',
          value: body.paid,
          date: current_date
        }
        await instance.Safe.updateValue(safe_data, safe_history)

        await instance.clientsDebtPayHistory.create({
          organization: customer.organization,
          client_id: customer._id,
          client_name: customer.name,
          paid: body.paid,
          date: new Date().getTime(),
          comment: body.comment,
          created_by_name: user.by_name,
          created_by_id: user._id,
        })
        /** */
      }
      await instance.clientsDatabase.updateOne({ _id: id }, { $set: body }, { lean: true });
      return reply.ok({ id });
    } catch (error) {
      return reply.error(error.message);
    }
  }

  const updateHandler = (request, reply) => {
    if (request.validationError) {
      return reply.validation(request.validationError.message);
    }
    instance.authorization(request, reply, (user) => {
      return update_client(request, reply, user);
    });
  };

  const customerSchema = {
    schema: {
      body: {
        type: "object",
        additionalProperties: false,
        required: ["first_name", "phone_number"],
        properties: {
          first_name: { type: "string" },
          last_name: { type: "string" },
          email: { type: "string" },
          phone_number: { type: "string" },
          paid: { type: "number" },
          amount_type: {
            type: "string",
            enum: ["cash", "card"],
            default: "cash",
          },
          comment: { type: "string" },
          currency: {
            type: "string",
            default: "uzs",
          },
          note: {
            type: "string"
          },
          user_id: { type: "string" },
          tariff_id: {
            type: "string",
            minLength: 24,
            maxLength: 24
          },
          tariff_name: { type: "string" },
          is_minimum_price: { type: "boolean" },
          user_type: { type: "string", enum: ["", "legal", "natural"] },
          inn: { type: "string" },
        },
      },
    },
    attachValidation: true,
  };

  instance.post(
    "/customer/update/:id",
    { version: "1.0.0", ...customerSchema },
    updateHandler
  );

  instance.post(
    "/customer/update/:id",
    { version: "1.1.0", ...customerSchema },
    updateHandler
  );

  async function delete_clients(request, reply) {
    try {
      await instance.clientsDatabase.deleteMany({
        _id: { $in: request.body.indexes },
      });
      return reply.ok();
    } catch (error) {
      instance.send_Error("deleting customer", JSON.stringify(error));
      return reply.error("Error on deleting");
    }
  }

  instance.post("/customer/delete_group", options.version, (request, reply) => {
    instance.authorization(request, reply, (user) => {
      return delete_clients(request, reply);
    });
  });
  const calculateDebt = async (instance, customer, user) => {

    const matchReceipts = {
      $match: {
        organization: user.organization,
        receipt_type: 'debt',
        user_id: customer.user_id
      }
    }
    const unwindItems = {
      $unwind: {
        path: '$sold_item_list'
      }
    }
    const projectItems = {
      $project: {
        // product_name: '$sold_item_list.product_name',
        price: '$sold_item_list.price',
        // value: '$sold_item_list.value',
        // reminder: '$sold_item_list.reminder',
        currency: '$currency',
        currency_value: '$currency_value',
        total_debt: '$sold_item_list.total_debt',
        is_refund: '$is_refund',
        // receipt_id: "$_id",
        // product_id: "$sold_item_list.product_id",
        // sold_id: "$sold_item_list._id",
      }
    }

    const receiptsResult = await instance.Receipts.aggregate([
      matchReceipts,
      unwindItems,
      projectItems
    ])
      .allowDiskUse(true)
      .exec();
    let total = 0
    for (const index in receiptsResult) {
      if (receiptsResult[index].is_refund) {
        total -= receiptsResult[index].total_debt
      } else {
        total += receiptsResult[index].total_debt
      }
    }
    return total
  }
  // const get_customer_by_id = async (request, reply, user) => {
  //   try {
  //     const id = request.params.id;
  //     let customer = await instance.clientsDatabase.findOne({ _id: id })
  //       .lean();
  //     if (!customer) {
  //       return reply.fourorfour("Customer");
  //     }
  //     // try {
  //     //   customer = customer.toObject();
  //     // } catch (error) { }
  //     customer.debt = await calculateDebt(instance, customer, user)

  //     const matchReceipts = {
  //       $match: {
  //         organization: user.organization,
  //         receipt_type: "debt",
  //         user_id: customer.user_id,
  //       },
  //     };

  //     const unwindItems = {
  //       $unwind: {
  //         path: "$sold_item_list",
  //       },
  //     };

  //     const groupItemsByCategory = {
  //       $group: {
  //         _id: "$sold_item_list.category_id",
  //         category_name: {
  //           $last: "$sold_item_list.category_name",
  //         },
  //         total_debt: {
  //           $sum: {
  //             $multiply: [
  //               { $max: ["$sold_item_list.total_debt", 0] },
  //               {
  //                 $cond: [
  //                   "$is_refund",
  //                   -1, 1
  //                 ]
  //               }
  //             ]
  //           },
  //         },
  //         /*
  //         total_debt: {
  //           $sum: {
  //             $subtract: [
  //               {
  //                 $multiply: [
  //                   "$sold_item_list.price",
  //                   {
  //                     $add: [
  //                       "$sold_item_list.value",
  //                       {
  //                         $cond: [
  //                           {
  //                             $gt: ["$sold_item_list.reminder", 0],
  //                           },
  //                           {
  //                             $divide: [
  //                               "$sold_item_list.reminder",
  //                               {
  //                                 $max: ["$sold_item_list.count_by_type", 1],
  //                               },
  //                             ],
  //                           },
  //                           0,
  //                         ],
  //                       },
  //                     ],
  //                   },
  //                 ],
  //               },
  //               {
  //                 $max: ["$sold_item_list.total_discount", 0],
  //               },
  //             ],
  //           },
  //         },
  //         */
  //         paid_debt: {
  //           $sum: {
  //             $max: ["$sold_item_list.total_paid_debt", 0],
  //           },
  //         },
  //         /*
  //         paid_debt: {
  //           $sum: {
  //             $multiply: [
  //               "$sold_item_list.price",
  //               {
  //                 $add: [
  //                   {
  //                     $max: ["$sold_item_list.paid_value", 0],
  //                   },
  //                   {
  //                     $cond: [
  //                       {
  //                         $gt: ["$sold_item_list.paid_reminder", 0],
  //                       },
  //                       {
  //                         $divide: [
  //                           "$sold_item_list.paid_reminder",
  //                           {
  //                             $max: ["$sold_item_list.count_by_type", 1],
  //                           },
  //                         ],
  //                       },
  //                       0,
  //                     ],
  //                   },
  //                 ],
  //               },
  //             ],
  //           },
  //         },
  //         */
  //         past_debt: {
  //           $sum: {
  //             $subtract: [
  //               {
  //                 $multiply: [
  //                   { $max: ["$sold_item_list.total_debt", 0] },
  //                   {
  //                     $cond: [
  //                       "$is_refund",
  //                       -1, 1
  //                     ]
  //                   }
  //                 ]
  //               },
  //               {
  //                 $max: ["$sold_item_list.total_paid_debt", 0],
  //               },
  //             ],
  //           },
  //         },
  //         /*
  //         past_debt: {
  //           $sum: {
  //             $subtract: [
  //               {
  //                 $multiply: [
  //                   "$sold_item_list.price",
  //                   {
  //                     $subtract: [
  //                       {
  //                         $add: [
  //                           "$sold_item_list.value",
  //                           {
  //                             $cond: [
  //                               {
  //                                 $gt: ["$sold_item_list.reminder", 0],
  //                               },
  //                               {
  //                                 $divide: [
  //                                   "$sold_item_list.reminder",
  //                                   {
  //                                     $max: [
  //                                       "$sold_item_list.count_by_type",
  //                                       1,
  //                                     ],
  //                                   },
  //                                 ],
  //                               },
  //                               0,
  //                             ],
  //                           },
  //                         ],
  //                       },
  //                       {
  //                         $max: [
  //                           {
  //                             $add: [
  //                               "$sold_item_list.paid_value",
  //                               {
  //                                 $cond: [
  //                                   {
  //                                     $gt: ["$sold_item_list.paid_reminder", 0],
  //                                   },
  //                                   {
  //                                     $divide: [
  //                                       "$sold_item_list.paid_reminder",
  //                                       {
  //                                         $max: [
  //                                           "$sold_item_list.count_by_type",
  //                                           1,
  //                                         ],
  //                                       },
  //                                     ],
  //                                   },
  //                                   0,
  //                                 ],
  //                               },
  //                             ],
  //                           },
  //                           0,
  //                         ],
  //                       },
  //                     ],
  //                   },
  //                 ],
  //               },
  //               {
  //                 $max: ["$sold_item_list.total_discount", 0],
  //               },
  //             ],
  //           },
  //         }
  //         */
  //       },
  //     };

  //     const receiptResult = await instance.Receipts.aggregate([
  //       matchReceipts,
  //       unwindItems,
  //       groupItemsByCategory,
  //     ])
  //       .allowDiskUse(true)
  //       .exec();

  //     return reply.ok({
  //       ...customer,
  //       receipts: receiptResult,
  //     });
  //   } catch (error) {
  //     console.log(error.message);
  //     return reply.fourorfour("Customer");
  //   }
  // };

  const get_customer_by_id = async (request, reply, user) => {
    try {
      const id = request.params.id;

      const customer = await instance.clientsDatabase
        .findOne(
          { _id: id },
          {
            debt: 1,
            first_name: 1,
            last_name: 1,
            is_minimum_price: 1,
            organization: 1,
            percentage: 1,
            phone_number: 1,
            point_balance: 1,
            tariff_id: 1,
            user_id: 1,
            visit_counter: 1,
            createdAt: 1,
            user_type: 1,
            inn: 1,
          },
        )
        .lean();
      if (!customer) {
        return reply.fourorfour("Customer");
      }

      return reply.ok(customer);
    } catch (error) {
      console.log(error.message);
      return reply.fourorfour("Customer");
    }
  };

  instance.get("/customer/get/:id", options.version, (request, reply) => {
    instance.authorization(request, reply, (user) => {
      return get_customer_by_id(request, reply, user);
    });
  });

  next()
}