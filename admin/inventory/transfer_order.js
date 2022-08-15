const axios = require("axios");

module.exports = (instance, options, next) => {
  // create transfer order

  const create_transfer = (request, reply, admin) => {
    const trans = request.body;
    delete trans._id;
    const status = trans.status;
    trans.status = "in_transit";
    if (trans.date == null || trans.date == "") {
      trans.date = new Date().getTime();
    }
    trans.organization = admin.organization;
    try {
      trans.first_service = instance.ObjectId(trans.first_service);
      trans.second_service = instance.ObjectId(trans.second_service);
      trans.ordered_by_id = instance.ObjectId(admin._id);
    } catch (error) {
      instance.log.error(error.message);
    }
    trans.ordered_by_name = admin.name;
    instance.services.find(
      {
        _id: {
          $in: [trans.first_service, trans.second_service],
        },
      },
      (err, services) => {
        if (err || services == null) {
          services = [];
        }
        if (services.length == 2) {
          instance.Transfer.find(
            {
              organization: admin.organization,
            },
            (err, aaa) => {
              if (aaa == undefined) {
                aaa = [];
              }
              const p_order = "TO" + ("00" + (aaa.length + 1001)).slice(-5);
              trans.p_order = p_order;
              for (const s of services) {
                if (trans.first_service + "" == s._id + "") {
                  trans.first_service_name = s.name;
                } else if (trans.second_service + "" == s._id + "") {
                  trans.second_service_name = s.name;
                }
              }
              const ids = [];
              for (const it of trans.items) {
                if (it.product_id != undefined && it.product_id != "") {
                  ids.push(it.product_id);
                }
              }
              instance.goodsSales.find(
                {
                  _id: {
                    $in: ids,
                  },
                },
                (err, goods) => {
                  if (err || goods == null) {
                    goods = [];
                  }
                  const gObj = {};
                  for (const g of goods) {
                    if (g.services instanceof Array) {
                      let item_price = g.price;
                      for (const item_service of g.services) {
                        if (
                          item_service.service + "" ==
                          trans.first_service + ""
                        ) {
                          item_price = item_service.price;
                        }
                      }
                      g.price = item_price;
                    }
                    gObj[g._id] = g;
                  }
                  trans.quality = 0;
                  const ITEMS = [];
                  for (let i = 0; i < trans.items.length; i++) {
                    if (
                      gObj[trans.items[i].product_id + ""] &&
                      trans.items[i].product_id != "" &&
                      trans.items[i].product_id != undefined
                    ) {
                      trans.items[i].product_name =
                        gObj[trans.items[i].product_id].name;
                      trans.items[i].price =
                        gObj[trans.items[i].product_id].price;
                      trans.items[i].product_sku =
                        gObj[trans.items[i].product_id].sku;
                      trans.quality += 0;
                      if (parseFloat(trans.items[i].quality)) {
                        trans.quality += parseFloat(trans.items[i].quality);
                      }
                      ITEMS.push(trans.items[i]);
                    }
                  }
                  // console.log(ITEMS)
                  trans.items = ITEMS;
                  const transferModel = instance.Transfer(trans);
                  // console.log(transferModel.items)
                  transferModel.save((err, tran) => {
                    if (err) {
                      reply.error("Error on saving transfer");
                      instance.send_Error(
                        "saving transfer",
                        JSON.stringify(err)
                      );
                    } else {
                      if (status == "transferred") {
                        axios.defaults.headers.common["Authorization"] =
                          admin.admin_token;
                        axios.defaults.headers.common["Accept-Version"] =
                          "1.0.0";
                        axios.defaults.headers.common["Accept-User"] = "admin";
                        axios.defaults.headers.common["Accept-who"] = "me";
                        axios
                          .get(
                            `http://localhost:3000/inventory/transfer/receive/${tran._id}`
                          )
                          .then((response) => {
                            reply.send(response.data);
                          });
                      } else {
                        tran.status = "in_transit";
                        reply.ok(tran);
                      }
                    }
                  });
                }
              )
                .lean();
            }
          )
            .lean();
        } else {
          reply.error("Services could not found");
        }
      }
    )
      .lean();
  };

  instance.post(
    "/inventory/transfer/create",
    options.version,
    (request, reply) => {
      instance.oauth_admin(request, reply, (admin) => {
        if (admin) {
          create_transfer(request, reply, admin);
        }
      });
    }
  );

  // receive

  // receive function
  function receive_function(request, it, trans, admin) {
    if (it)
      if (it.product_id)
        instance.goodsSales.findOne(
          {
            _id: it.product_id,
          },
          (err, item) => {
            if (err) {
              instance.send_Error("Finding product", JSON.stringify(err));
            } else if (item) {
              var stock_after1, stock_after2;
              for (let i = 0; i < item.services.length; i++) {
                if (trans.first_service + "" == "" + item.services[i].service) {
                  item.services[i].in_stock -= 0;
                  if (parseFloat(it.quality)) {
                    item.services[i].in_stock -= it.quality;
                  }
                  stock_after1 = item.services[i].in_stock;
                }
                if (
                  trans.second_service + "" ==
                  "" + item.services[i].service
                ) {
                  item.services[i].in_stock += 0;
                  if (parseFloat(it.quality)) {
                    item.services[i].in_stock += it.quality;
                  }
                  stock_after2 = item.services[i].in_stock;
                }
              }
              item.last_updated = new Date().getTime();
              item.last_stock_updated = new Date().getTime();
              instance.goodsSales.updateOne(
                {
                  _id: it.product_id,
                },
                {
                  $set: {
                    services: item.services,
                  },
                },
                (err, _) => {
                  if (err) {
                    instance.send_Error(
                      "updating good sales",
                      JSON.stringify(err)
                    );
                  } else {
                    instance.create_inventory_history(
                      admin,
                      "transferred",
                      trans.p_order,
                      trans.first_service,
                      it.product_id,
                      item.cost,
                      it.quality * -1,
                      stock_after1,
                      new Date().getTime()
                    );
                    instance.create_inventory_history(
                      admin,
                      "transferred",
                      trans.p_order,
                      trans.second_service,
                      it.product_id,
                      item.cost,
                      it.quality,
                      stock_after2,
                      new Date().getTime()
                    );
                    instance.push_changes(request, 101, trans.first_service);
                    instance.push_changes(request, 101, trans.second_service);
                  }
                }
              );
            }
          }
        )
          .lean();
  }

  const receive_transfer = (request, reply, admin) => {
    const id = instance.ObjectId(request.params.id);
    instance.Transfer.findOne(
      {
        _id: id,
        organization: admin.organization,
      },
      (err, trans) => {
        if (err || trans == null) {
          reply.error("finding transfer");
          if (err) {
            instance.send_Error("finding transfer", JSON.stringify(err));
          }
        } else {
          if (trans.status == "in_transit") {
            trans.status = "transferred";
            instance.Transfer.updateOne(
              { _id: id },
              { $set: trans },
              (err, _) => {
                if (err) {
                  reply.error("Error on updating");
                  instance.send_Error("updating transfer", JSON.stringify(err));
                } else {
                  reply.ok({
                    tansfer_id: id,
                  });
                  try {
                    // update item partiation queue
                    instance.create_partiation_queue(
                      trans.items.map(item => {
                        return {
                          product_id: item.product_id,
                          purchase_cost: item.cost,
                          received: item.quality,
                        }
                      }),
                      trans.second_service,
                      trans.first_service,
                      {
                        _id: trans._id,
                        p_order: trans.p_order,
                        service: trans.second_service,
                      }, // purchase
                      trans.date,
                      'receive_transfer'
                    )
                  } catch (error) {
                    instance.send_Error(
                      `create_partiation_queue
                      \nfunksiyani chaqirishda, transfer
                      \nservice_id: ${trans.second_service}
                      \nsupplier_id: ${trans.second_service}`,
                      error,
                    )
                  }

                  for (const it of trans.items) {
                    receive_function(request, it, trans, admin);
                  }
                }
              }
            );
          } else {
            reply.error("Error on updating");
          }
        }
      }
    )
      .lean();
  };

  instance.get(
    "/inventory/transfer/receive/:id",
    options.version,
    (request, reply) => {
      instance.oauth_admin(request, reply, (admin) => {
        if (admin) {
          receive_transfer(request, reply, admin);
        }
      });
    }
  );

  // updating transfer

  var update_trans = (request, reply, admin) => {
    var id = request.params.id;
    var transs = new instance.Transfer(request.body);
    instance.Transfer.findOne(
      {
        _id: id,
        organization: admin.organization,
      },
      (err, trans) => {
        if (err || trans == null) {
          reply.error("Transfer could not found");
        } else {
          // reply.ok(trans)
          if (trans.status == "in_transit") {
            trans.organization = admin.organization;
            trans.notes = transs.notes;
            trans.data = transs.data;
            if (
              transs.first_service != undefined &&
              transs.first_service != ""
            ) {
              trans.first_service = instance.ObjectId(transs.first_service);
            }
            if (
              transs.second_service != "" &&
              transs.second_service != undefined
            ) {
              trans.second_service = instance.ObjectId(transs.second_service);
            }
            instance.services.find(
              {
                _id: {
                  $in: [trans.first_service, trans.second_service],
                },
              },
              (err, services) => {
                if (err || services == null) {
                  services = [];
                }
                if (services.length == 2) {
                  trans.notes = transs.notes;
                  for (var s of services) {
                    if (trans.first_service + "" == s._id + "") {
                      trans.first_service_name = s.name;
                    }
                    if (trans.second_service + "" == s._id + "") {
                      trans.second_service_name = s.name;
                    }
                  }
                  var ids = [];
                  for (var it of transs.items) {
                    if (it)
                      if (it.product_id != "" && it.product_id != null) {
                        ids.push(it.product_id);
                      }
                  }
                  instance.goodsSales.find(
                    {
                      _id: {
                        $in: ids,
                      },
                    },
                    (err, goods) => {
                      if (err || goods == null) {
                        goods = [];
                      }
                      var gObj = {};
                      for (var g of goods) {
                        if (g.services instanceof Array) {
                          let item_price = g.price;
                          for (const item_service of g.services) {
                            if (
                              item_service.service + "" ==
                              trans.first_service + ""
                            ) {
                              item_price = item_service.price;
                            }
                          }
                          g.price = item_price;
                        }
                        gObj[g._id] = g;
                      }
                      trans.quality = 0;
                      var ITEMS = [];
                      for (let i = 0; i < transs.items.length; i++) {
                        if (transs.items[i])
                          if (
                            gObj[transs.items[i].product_id + ""] &&
                            transs.items[i]
                          ) {
                            if (trans.items[i]) {
                              if (
                                trans.items[i].product_id != "" &&
                                transs.items[i].product_id != null
                              ) {
                                trans.items[i].product_name =
                                  gObj[transs.items[i].product_id].name;
                                trans.items[i].price =
                                  gObj[transs.items[i].product_id].price;
                                trans.items[i].product_sku =
                                  gObj[transs.items[i].product_id].sku;
                                trans.items[i].quality = 0;
                                if (parseFloat(request.body.items[i].quality)) {
                                  trans.items[i].quality = parseFloat(
                                    request.body.items[i].quality
                                  );
                                }
                                trans.quality += trans.items[i].quality;
                                ITEMS.push(transs.items[i]);
                              }
                            } else {
                              ITEMS.push(transs.items[i]);
                            }
                          }
                      }
                      trans.items = ITEMS;
                      instance.Transfer.updateOne(
                        { _id: id },
                        { $set: trans },
                        (err, result) => {
                          if (err) {
                            reply.error("on updating Transfer");
                          } else {
                            if (transs.status == "transferred") {
                              trans.status = "in_transit";
                              receive_transfer(request, reply, admin);
                            } else {
                              reply.ok();
                            }
                          }
                        }
                      );
                    }
                  );
                } else {
                  reply.error("Services could not found");
                }
              }
            );
          } else {
            reply.error("Error on updating");
          }
        }
      }
    );
  };

  instance.post(
    "/inventory/transfer/update/:id",
    options.version,
    (request, reply) => {
      instance.oauth_admin(request, reply, (admin) => {
        if (admin) {
          update_trans(request, reply, admin);
        }
      });
    }
  );

  // get transfer for table

  const get_transfer = (request, reply, admin) => {
    const user_available_services = request.user.services.map(serv => serv.service)

    const query = {
      organization: admin.organization,
      $or: {
        first_service: { $in: user_available_services },
        second_service: { $in: user_available_services },
      },
    };
    const limit = parseInt(request.params.limit);
    const page = parseInt(request.params.page);
    if (request.body.status != undefined && request.body.status != "") {
      query.status = request.body.status;
    }
    if (
      request.body.first_service != undefined &&
      request.body.first_service != ""
    ) {
      query.first_service = instance.ObjectId(request.body.first_service);
    }
    if (
      request.body.second_service != undefined &&
      request.body.second_service != ""
    ) {
      query.second_service = instance.ObjectId(request.body.second_service);
    }
    if (request.body.search != undefined) {
      query["$or"] = [
        {
          p_order: {
            $regex: request.body.search,
            $options: "i",
          },
        },
        {
          notes: {
            $regex: request.body.search,
            $options: "i",
          },
        },
      ];
    }

    instance.Transfer.aggregate(
      [
        {
          $match: query,
        },
        {
          $lookup: {
            from: "inoneservices",
            localField: "first_service",
            foreignField: "_id",
            as: "first",
          },
        },
        {
          $lookup: {
            from: "inoneservices",
            localField: "second_service",
            foreignField: "_id",
            as: "second",
          },
        },
        {
          $project: {
            items: 0,
            organization: 0,
            first_service: 0,
            second_service: 0,
          },
        },
        {
          $sort: {
            _id: -1,
          },
        },
      ],
      (err, trans) => {
        if (err || trans == null) {
          trans = [];
        }
        var total = trans.length;
        trans = trans.slice((page - 1) * limit, limit * page);
        for (let i = 0; i < trans.length; i++) {
          if (trans[i].first.length > 0) {
            trans[i].first_service_name = trans[i].first[0].name;
          }
          trans[i].first = undefined;
          if (trans[i].second.length > 0) {
            trans[i].second_service_name = trans[i].second[0].name;
          }
          trans[i].second = undefined;
        }
        reply.ok({
          total: total,
          page: Math.ceil(total / limit),
          data: trans,
        });
      }
    );
  };

  instance.post(
    "/inventory/transfer/get_for_table/:limit/:page",
    options.version,
    (request, reply) => {
      instance.oauth_admin(request, reply, (admin) => {
        if (admin) {
          get_transfer(request, reply, admin);
        }
      });
    }
  );

  // get inventory transfer by id

  var get_transfer_by_id = (request, reply, admin) => {
    if (request.params.id) {
      instance.Transfer.aggregate(
        [
          {
            $match: {
              _id: instance.ObjectId(request.params.id),
            },
          },
          {
            $lookup: {
              from: "inoneservices",
              localField: "first_service",
              foreignField: "_id",
              as: "first",
            },
          },
          {
            $lookup: {
              from: "inoneservices",
              localField: "second_service",
              foreignField: "_id",
              as: "second",
            },
          },
        ],
        async (err, tran) => {
          if (tran) {
            if (tran.length > 0) {
              if (tran[0].first.length > 0) {
                tran[0].first_service_name = tran[0].first[0].name;
              }
              tran[0].first = undefined;
              if (tran[0].second.length > 0) {
                tran[0].second_service_name = tran[0].second[0].name;
              }
              tran[0].second = undefined;
              let total_cost = 0;
              for (let i = 0; i < tran[0].items.length; i++) {
                const current_item = tran[0].items[i];
                try {
                  const item = await instance.goodsSales.findOne({
                    _id: current_item.product_id,
                  });
                  if (item) {
                    if (item.item_type == "variant") {
                      const parent = await instance.goodsSales.findOne({
                        variant_items: {
                          $elemMatch: {
                            $eq: item._id,
                          },
                        },
                      });
                      if (parent) {
                        current_item.product_name = `${parent.name} ( ${item.name} )`;
                      }
                    } else {
                      current_item.product_name = item.name;
                    }
                    current_item.sku = item.sku;
                    current_item.cost = item.cost;
                    current_item.barcode = item.barcode;
                    total_cost += (current_item.quality * current_item.price) ? current_item.quality * current_item.price : 0;
                    // let price = item.price;
                    // if (typeof item.services == typeof []) {
                    //   for (const s of item.services) {
                    //     if (s.service + "" == tran[0].second_service + "") {
                    //       price = s.price;
                    //     }
                    //   }
                    // }
                    // current_item.price = price;
                  }
                } catch (error) { }
                tran[0].items[i].first_stock = 0;
                tran[0].items[i].second_stock = 0;
                tran[0].items[i] = current_item;
              }
              tran[0].total = total_cost;
              reply.ok(tran[0]);
            } else {
              reply.error("Not Found");
            }
          } else {
            reply.error("Not found");
          }
        }
      );
    } else {
      reply.error("Error id not found");
    }
  };

  instance.get(
    "/inventory/transfer/get/:id",
    options.version,
    (request, reply) => {
      instance.oauth_admin(request, reply, (admin) => {
        if (admin) {
          get_transfer_by_id(request, reply, admin);
        }
      });
    }
  );

  // get items for transfer

  var get_items = async (request, reply, admin) => {
    var query = {
      organization: admin.organization,
      has_variants: {
        $ne: true,
      },
      $or: [
        {
          is_track_stock: true,
        },
        {
          use_production: true,
        },
        {
          item_type: "variant",
        },
      ],
    };
    if (request.body) {
      if (request.body.indexes) {
        if (request.body.indexes.length > 0) {
          query._id = {
            $in: request.body.indexes,
          };
        }
      }
    }
    if (request.body.service != undefined && request.body.service != "") {
      query.services = {
        $elemMatch: { service: { $eq: request.body.service } },
      };
    }
    const search_text = request.body.search;
    if (typeof search_text == typeof "invan") {
      query["$or"] = [
        {
          name: { $regex: search_text, $options: "i" },
        },
        {
          name: {
            $regex:
              instance.converter(search_text) != ""
                ? instance.converter(search_text)
                : "salom_dunyo_ishla_qale",
            $options: "i",
          },
        },
        {
          barcode: { $regex: search_text, $options: "i" },
        },
      ];
      if (+search_text) {
        query["$or"].push({
          sku: +search_text,
        });
      }
    }
    let count_items = 0;
    try {
      count_items = await instance.goodsSales.countDocuments(query);
    } catch (error) { }
    const limit =
      request.params.limit == "all"
        ? count_items == 0
          ? 1
          : count_items
        : request.params.limit;
    const page = request.params.page;
    const Answer = [];
    instance.goodsSales
      .find(
        query,
        { name: 1, sku: 1, barcode: 1, cost: 1, services: 1, item_type: 1 },
        async (err, goods) => {
          if (err) {
            instance.send_Error("finding goods", JSON.stringify(err));
          }
          if (goods == null) {
            goods = [];
          }

          for (let i = 0; i < goods.length; i++) {
            // try {
            //   goods[i] = goods[i].toObject();
            // } catch (error) {
            //   instance.send_Error("to Object", error.message);
            // }
            goods[i].first = 0;
            goods[i].second = 0;
            for (var s of goods[i].services) {
              if (s.in_stock) {
                if (request.body.first_service)
                  if (request.body.first_service.length > 0)
                    if (s.service + "" == request.body.first_service + "") {
                      goods[i].first = s.in_stock;
                      goods[i].price = s.price;
                    }
                if (request.body.second_service)
                  if (request.body.second_service.length > 0)
                    if (s.service + "" == request.body.second_service + "") {
                      goods[i].second = s.in_stock;
                    }
                if (request.body.service) {
                  if (request.body.service == s.service + "") {
                    goods[i].in_stock = s.in_stock;
                  }
                }
              }
            }
            if (!goods[i].in_stock) {
              goods[i].in_stock = 0;
            }
            goods[i].services = undefined;

            if (goods[i].item_type == "variant") {
              try {
                const parent = await instance.goodsSales.findOne({
                  variant_items: {
                    $elemMatch: {
                      $eq: goods[i]._id,
                    },
                  },
                });
                if (parent) {
                  goods[i].name = `${parent.name} ( ${goods[i].name} )`;
                  if (parent.is_track_stock || parent.use_production) {
                    Answer.push(goods[i]);
                  }
                }
              } catch (err) { }
            } else {
              Answer.push(goods[i]);
            }
          }
          // if(request.body.first_service == '' || request.body.second_service == '' || request.body.indexes == []) {
          //   reply.ok([])
          // }
          // else {
          reply.ok(Answer);
          // }
        }
      )
      .skip(limit * (page - 1))
      .limit(limit)
      .lean()
      .sort({ _id: -1 });
  };

  const getItemsHandler = (request, reply) => {
    if (request.validationError) {
      return reply.validation(request.validationError.message);
    }
    instance.oauth_admin(request, reply, (admin) => {
      if (admin) {
        get_items(request, reply, admin);
      }
    });
  };

  instance.post(
    "/inventory/transfer/get_items",
    {
      ...options.version,
      preHandler: (request, reply, done) => {
        if (!request.body) {
          request.body = {};
        }
        request.body.search = "";
        request.params = {
          limit: "all",
          page: 1,
        };
        done();
      },
    },
    getItemsHandler
  );

  instance.post(
    "/inventory/transfer/get_items/:limit/:page",
    {
      ...options.version,
      schema: {
        params: {
          type: "object",
          required: ["limit", "page"],
          properties: {
            limit: { type: "integer", minimum: 1 },
            page: { type: "integer", minimum: 1 },
          },
        },
        body: {
          type: "object",
          properties: {
            first_service: { type: "string" },
            second_service: { type: "string" },
            search: {
              type: "string",
              default: "",
            },
          },
        },
      },
      attachValidation: true,
    },
    getItemsHandler
  );

  instance.post(
    "/inventory/transfer/items/refresh",
    {
      ...options.version,
      schema: {
        body: {
          type: "object",
          additionalProperties: false,
          required: ["first_service", "second_service", "indexes"],
          properties: {
            first_service: {
              type: "string",
              maxLength: 24,
            },
            second_service: {
              type: "string",
              maxLength: 24,
            },
            indexes: {
              type: "array",
              items: {
                type: "string",
                minLength: 24,
                maxLength: 24,
              },
            },
          },
        },
      },
      attachValidation: true,
      preValidation: instance.authorize_admin,
    },
    async (request, reply) => {
      if (request.validationError) {
        return reply.validation(request.validationError.message);
      }
      const { first_service, second_service, indexes } = request.body;
      for (const ind in indexes) {
        try {
          indexes[ind] = instance.ObjectId(indexes[ind]);
        } catch (error) { }
      }

      let firstServiceId = first_service;
      try {
        firstServiceId = instance.ObjectId(firstServiceId);
      } catch (error) { }

      let secondServiceId = second_service;
      try {
        secondServiceId = instance.ObjectId(secondServiceId);
      } catch (error) { }

      const matchQuery = {
        $match: {
          _id: {
            $in: indexes,
          },
        },
      };

      const stockGroup = {
        $project: {
          first: {
            $reduce: {
              input: "$services",
              initialValue: 0,
              in: {
                $sum: [
                  {
                    $cond: [
                      {
                        $or: [
                          {
                            $eq: ["$$this.service", first_service + ""],
                          },
                          {
                            $eq: ["$$this.service", firstServiceId],
                          },
                        ],
                      },
                      "$$this.in_stock",
                      0,
                    ],
                  },
                  "$$value",
                ],
              },
            },
          },
          in_stock: {
            $reduce: {
              input: "$services",
              initialValue: 0,
              in: {
                $sum: ["$$this.in_stock", "$$value"],
              },
            },
          },
          second: {
            $reduce: {
              input: "$services",
              initialValue: 0,
              in: {
                $sum: [
                  {
                    $cond: [
                      {
                        $or: [
                          {
                            $eq: ["$$this.service", second_service + ""],
                          },
                          {
                            $eq: ["$$this.service", secondServiceId],
                          },
                        ],
                      },
                      "$$this.in_stock",
                      0,
                    ],
                  },
                  "$$value",
                ],
              },
            },
          },
          price: {
            $reduce: {
              input: "$services",
              initialValue: 0,
              in: {
                $sum: [
                  {
                    $cond: [
                      {
                        $or: [
                          {
                            $eq: ["$$this.service", first_service + ""],
                          },
                          {
                            $eq: ["$$this.service", firstServiceId],
                          },
                        ],
                      },
                      "$$this.price",
                      0,
                    ],
                  },
                  "$$value",
                ],
              },
            },
          },
        },
      };

      const sort = {
        $sort: { _id: 1 },
      };

      const goods = await instance.goodsSales.aggregate([
        matchQuery,
        stockGroup,
        sort,
      ]);
      reply.ok(goods);
      return reply;
    }
  );

  next();
};
