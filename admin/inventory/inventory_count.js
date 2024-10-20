const fp = require("fastify-plugin");

const getCountItems = async (request, reply, instance) => {
  try {
    const admin = request.user;
    const suppliers = request.body.suppliers;
    const categories = [];
    const service = request.body.service;
    for (const cat of request.body.categories) {
      categories.push(cat);
      const childs = await instance.get_child_category(cat);
      for (const ch of childs) {
        categories.push(ch);
      }
    }
    let query = {
      organization: admin.organization,
      has_variants: {
        $ne: true,
      },
      $and: [
        {
          $or: [
            { is_track_stock: true },
            { use_production: true },
            { item_type: "variant" },
          ],
        },
      ],
    };

    const search_text = request.body.search;
    let or_query = [];
    if (typeof search_text == typeof "invan") {
      or_query = [
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
        or_query.push({
          sku: +search_text,
        });
      }
      query["$and"].push({ $or: or_query });
    }

    if (suppliers.length > 0) {
      query.primary_supplier_id = {
        $in: suppliers,
      };
    }
    if (categories.length > 0) {
      query.category = {
        $in: categories,
      };
    }
    const count_goods = await instance.goodsSales.countDocuments(query);
    const limit =
      request.params.limit == "all"
        ? count_goods == 0
          ? 1
          : count_goods
        : request.params.limit;
    const page = request.params.page;
    const goods = await instance.goodsSales
      .find(query)
      .skip(limit * (page - 1))
      .limit(limit)
      .sort({ _id: 1 });
    const Answer = [];
    for (const index in goods) {
      goods[index].in_stock = null;
      for (const ser of goods[index].services) {
        if (ser.service + "" == service) {
          goods[index].in_stock = ser.in_stock;
          goods[index].price = ser.price;
        }
      }

      if (goods[index].item_type == "variant") {
        try {
          const parent = await instance.goodsSales.findOne({
            variant_items: {
              $elemMatch: {
                $eq: goods[index]._id,
              },
            },
          });
          if (parent) {
            goods[index].name = `${parent.name} ( ${goods[index].name} )`;
            if (parent.is_track_stock || parent.use_production) {
              Answer.push(goods[index]);
            }
          }
        } catch (err) {}
      } else {
        Answer.push(goods[index]);
      }
    }
    reply.ok(Answer);
  } catch (error) {
    reply.error(error.message);
  }
};

module.exports = fp((instance, options, next) => {
  const countItemsHandler = (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      request.user = admin;
      return getCountItems(request, reply, instance);
    });
  };

  const countItemsBodySchema = {
    body: {
      type: "object",
      required: ["service", "categories", "suppliers"],
      properties: {
        service: { type: "string" },
        categories: {
          type: "array",
          items: {
            type: "string",
          },
        },
        suppliers: {
          type: "array",
          items: {
            type: "string",
          },
        },
        search: {
          type: "string",
          default: "",
        },
      },
    },
  };

  instance.post(
    "/inventory/count/items",
    {
      version: "1.0.0",
      schema: {
        ...countItemsBodySchema,
      },
      preHandler: (request, reply, done) => {
        request.params = {
          limit: "all",
          page: 1,
        };
        done();
      },
    },
    countItemsHandler,
  );

  instance.post(
    "/inventory/count/items/:limit/:page",
    {
      version: "1.0.0",
      schema: {
        ...countItemsBodySchema,
        params: {
          type: "object",
          required: ["limit", "page"],
          properties: {
            limit: { type: "integer", minimum: 1 },
            page: { type: "integer", minimum: 1 },
          },
        },
      },
    },
    countItemsHandler,
  );

  // inv count items refresh
  // -> items/list_of_inv/refresh

  // create inventory count

  const create_inventory_count = async (request, reply, admin) => {
    try {
      let invcount = request.body;
      invcount.created_time = new Date().getTime();
      delete invcount._id;
      invcount.service = instance.ObjectId(invcount.service);
      let service = await instance.services.findOne({ _id: invcount.service });
      if (!service) {
        return reply.fourorfour("Service");
      }
      let count_length = await instance.inventoryCount.countDocuments({
        organization: admin.organization,
      });
      let p_order = "IC" + (1001 + count_length);
      invcount.p_order = p_order;
      invcount.service_name = service.name;
      if (!(invcount.items instanceof Array)) {
        invcount.items = [];
      }

      let ids = [];
      let total = {
        total_difference: 0,
        total_cost_difference: 0,
      };

      for (var it of invcount.items) {
        if (it.product_id != "" && it.product_id != null) {
          ids.push(it.product_id);
        }
      }

      let query = {
        organization: admin.organization,
        _id: {
          $in: ids,
        },
      };

      invcount.status = "in_progress";
      if (invcount.type == "full") {
        invcount.status = "pending";
        query = {
          organization: admin.organization,
          has_variants: false,
          $or: [
            { is_track_stock: true },
            { use_production: true },
            { item_type: "variant" },
          ],
        };
      }
      let goods = await instance.goodsSales.find(query);

      let gObj = {};
      for (let g of goods) {
        let in_stock = 0;
        for (let s of g.services) {
          if (s.service + "" == invcount.service + "") {
            in_stock += s.in_stock;
          }
        }
        g.in_stock = in_stock;
        gObj[g._id] = g;
      }
      invcount.organization = admin.organization;
      invcount.created_by = admin.name;
      invcount.created_by_id = instance.ObjectId(admin._id);
      let invCount = new instance.inventoryCount(invcount);
      let items = [];

      for (let i = 0; i < invcount.items.length; i++) {
        if (gObj[invcount.items[i].product_id] != undefined) {
          invcount.items[i].product_id = instance.ObjectId(
            invcount.items[i].product_id,
          );
          invcount.items[i].product_name =
            gObj[invcount.items[i].product_id].name;
          invcount.items[i].exp_in_stock =
            gObj[invcount.items[i].product_id].in_stock;
          invcount.items[i].cost = gObj[invcount.items[i].product_id].cost;
          invcount.items[i].cost_currency =
            gObj[invcount.items[i].product_id].cost_currency;
          invcount.items[i].count_id = instance.ObjectId(invCount._id);
          items.push(invcount.items[i]);
        }
      }
      invCount.total_difference = total.total_difference;
      invCount.total_cost_difference = total.total_cost_difference;
      await invCount.save();
      await instance.inventoryCountItem.insertMany(items);
      reply.ok({
        _id: invCount._id,
      });
    } catch (error) {
      reply.error(error.message);
    }
    return reply;
  };

  instance.post(
    "/inventory/count/create",
    options.version,
    (request, reply) => {
      instance.oauth_admin(request, reply, (admin) => {
        if (!admin) {
          return reply.error("Access");
        }
        create_inventory_count(request, reply, admin);
      });
    },
  );

  // update inventory count

  const update_inventory_count = async (request, reply, admin) => {
    try {
      let id = request.params.id;
      if (
        !request.body ||
        !(request.body.items instanceof Array) ||
        request.body.items.length == 0
      ) {
        return reply.validation("body is not in format");
      }
      let invcount = await instance.inventoryCount.findOne({ _id: id });
      if (!invcount) {
        return reply.fourorfour("invcount");
      }
      let service = await instance.services.findOne({ _id: invcount.service });
      if (!service) {
        return reply.fourorfour("service");
      }
      invcount.service_name = service.name;
      let invitems = await instance.inventoryCountItem.find({
        count_id: invcount._id,
      });
      var new_items = {};
      for (var it of request.body.items) {
        if (it.product_id != undefined && it.product_id != "") {
          new_items[it.product_id + ""] = true;
        }
      }
      var total = {
        total_difference: invcount.total_difference,
        total_cost_difference: invcount.total_cost_difference,
      };
      var delete_ids = [];
      var deleting_ids = [];
      var old_items = {};
      for (var it of invitems) {
        if (!new_items[it.product_id + ""]) {
          if (it.difference) {
            total.total_difference -= it.difference;
            total.total_cost_difference -= it.total_cost_difference;
          }
          delete_ids.push(it._id);
        } else {
          old_items[it.product_id + ""] = true;
        }
      }
      var save = [];
      var item_ids = [];
      for (var it of request.body.items) {
        if (
          !old_items[it.product_id + ""] &&
          it.product_id != "" &&
          it.product_id != null
        ) {
          it.count_id = instance.ObjectId(invcount._id);
          it.product_id = instance.ObjectId(it.product_id);
          it.product_name = "NEXT";
          save.push(it);
          item_ids.push(it.product_id);
        }
      }
      await instance.inventoryCountItem.deleteMany({
        _id: {
          $in: delete_ids,
        },
      });
      await instance.inventoryCountHistory.deleteMany({
        count_id: invcount._id,
        product_id: {
          $in: deleting_ids,
        },
      });
      await instance.inventoryCount.updateOne(
        {
          _id: invcount._id,
        },
        {
          $set: {
            notes: request.body.notes,
            total_difference: total.total_difference,
            total_cost_difference: total.total_cost_difference,
          },
        },
      );

      let goods = await instance.goodsSales.find({ _id: { $in: item_ids } });
      let gObj = {};
      for (var g of goods) {
        gObj[g._id + ""] = g;
        let in_stock = 0;
        if (typeof g.services == typeof []) {
          for (const s of g.services) {
            if (invcount.service + "" == s.service) {
              in_stock = s.in_stock;
            }
          }
        }
        if (in_stock) {
          g.in_stock = in_stock;
        }
      }

      for (let i = 0; i < save.length; i++) {
        save[i].product_name = gObj[save[i].product_id].name;
        save[i].product_sku = gObj[save[i].product_id].sku;
        save[i].cost = gObj[save[i].product_id].cost;
        save[i].exp_in_stock = gObj[save[i].product_id].in_stock;
      }

      await instance.inventoryCountItem.insertMany(save);
      reply.ok();
    } catch (error) {
      reply.error(error.message);
    }
    return reply;
  };

  instance.post(
    "/inventory/count/update/:id",
    options.version,
    (request, reply) => {
      instance.oauth_admin(request, reply, (admin) => {
        if (!admin) {
          return reply.error("Access");
        }
        update_inventory_count(request, reply, admin);
      });
    },
  );

  // inventory count complete

  async function create_history(request, it, invcount, admin) {
    try {
      if (!it.difference) {
        return;
      }

      const good = await instance.goodsSales.updateOne(
        { _id: it.product_id },
        {
          $inc: {
            "services.$[elem].in_stock": it.difference,
          },
          $set: {
            last_updated: new Date().getTime(),
          },
        },
        {
          lean: true,
          new: true,
          projection: { cost: 1 },
          arrayFilters: [
            {
              "elem.service": {
                $eq: instance.ObjectId(invcount.service),
              },
            },
          ],
        },
      );
      // await instance.goodsSales.updateOne(
      //   {
      //     _id: it.product_id,
      //   },
      //   {
      //     $set: {
      //       last_updated: new Date().getTime(),
      //     },
      //   },
      // );
      instance.push_changes(request, 101, invcount.service);

      // const good = await instance.goodsSales
      //   .findOne(
      //     {
      //       _id: it.product_id,
      //     },
      //     { cost: 1 },
      //   )
      //   .lean();
      await instance.create_inventory_history(
        admin,
        "recounted",
        invcount.p_order,
        invcount.service,
        it.product_id,
        good.cost,
        it.difference,
        it.counted,
        new Date().getTime(),
      );
    } catch (error) {
      console.log(error.message);
    }
  }

  /**
   *
   * @param {{
   *  _id: any
   *  product_id: any
   *  product_name: any
   *  exp_in_stock: any
   *  cost: any
   *  count_id: any
   *  cost_difference: any
   *  counted: any
   *  difference: any
   * }} item
   */
  async function update_count_item(item) {
    try {
      await instance.inventoryCountItem.updateOne(
        {
          _id: item._id,
        },
        {
          $set: {
            product_id: item.product_id,
            product_name: item.product_name,
            exp_in_stock: item.exp_in_stock,
            cost: item.cost,
            count_id: item.count_id,
            cost_difference: item.cost_difference,
            counted: item.counted,
            difference: item.difference,
          },
        },
      );
    } catch (error) {
      console.log(error.message);
    }
  }

  let complete_count = async (request, reply, admin) => {
    try {
      const id = request.params.id;
      const invcount = await instance.inventoryCount
        .findOne({
          _id: id,
        })
        .lean();
      if (!invcount) {
        return reply.fourorfour("invcount");
      }
      if (invcount.status == "completed") {
        return reply.error("Allready done");
      }
      const items = await instance.inventoryCountItem
        .find({
          count_id: invcount._id,
        })
        .lean();

      const ids = [];
      for (const it of items) {
        ids.push(it.product_id);
      }
      const goods = await instance.goodsSales
        .find(
          {
            _id: {
              $in: ids,
            },
          },
          {
            in_stock: 1,
            product_id: 1,
            cost: 1,
          },
        )
        .lean();

      const gObj = {};
      for (const g of goods) {
        let in_stock = 0;
        for (var s of g.services) {
          if (s.service + "" == invcount.service + "") {
            in_stock += s.in_stock;
          }
        }
        g.in_stock = in_stock;
        gObj[g._id + ""] = g;
      }

      for (let i = 0; i < items.length; i++) {
        if (gObj[items[i].product_id + ""].in_stock != undefined) {
          items[i].exp_in_stock = gObj[items[i].product_id].in_stock;
          items[i].difference = items[i].counted - items[i].exp_in_stock;

          items[i].cost_difference =
            items[i].difference * gObj[items[i].product_id].cost;
          await update_count_item(items[i]);
        }
      }
      let counts = items;
      // let counts = await instance.inventoryCountItem
      //   .find({
      //     count_id: invcount._id,
      //   },)
      //   .lean();
      const total = {
        total_difference: 0,
        total_cost_difference: 0,
      };
      if (!(counts instanceof Array)) {
        counts = [];
      }

      const item_ids = [];
      for (const t of items) {
        if (t.difference != undefined) {
          total.total_difference += t.difference;
          total.total_cost_difference += t.cost_difference;
        } else {
          item_ids.push(t._id);
        }
      }
      if (item_ids.length == counts.length) {
        return reply.error("Error on completing");
      }
      for (const it of items) {
        await create_history(request, it, invcount, admin);
      }

      await instance.inventoryCountItem.deleteMany({
        _id: {
          $in: item_ids,
        },
      });
      await instance.inventoryCount.updateOne(
        {
          _id: invcount._id,
        },
        {
          $set: {
            total_difference: total.total_difference,
            total_cost_difference: total.total_cost_difference,
            status: "completed",
          },
        },
      );
      reply.ok();
    } catch (error) {
      reply.error(error.message);
    }
    return reply;
  };

  instance.post(
    "/inventory/count/complete/:id",
    options.version,
    (request, reply) => {
      instance.oauth_admin(request, reply, (admin) => {
        if (!admin) {
          return reply.error("Access");
        }
        complete_count(request, reply, admin);
      });
    },
  );

  instance.get(
    "/inventory/count/complete/:id",
    options.version,
    (request, reply) => {
      instance.oauth_admin(request, reply, (admin) => {
        if (!admin) {
          return reply.error("Access");
        }
        complete_count(request, reply, admin);
      });
    },
  );

  // get counts

  const getcounts = async (request, reply, admin) => {
    try {
      var query = {
        organization: admin.organization,
      };

      if (request.body) {
        if (request.body.status) {
          if (request.body.status != null || request.body.status != "") {
            query.status = request.body.status;
          }
        }
        if (request.body.service) {
          if (request.body.service.length > 0) {
            query.service = {
              $in: request.body.service,
            };
          }
        }
        if (request.body.services) {
          if (request.body.services.length > 0) {
            query.service = {
              $in: request.body.services,
            };
          }
        }
        if (request.body.search != null && request.body.search != "") {
          query["$or"] = [
            {
              notes: {
                $regex: request.body.search,
                $options: "i",
              },
            },
            {
              p_order: {
                $regex: request.body.search,
                $options: "i",
              },
            },
          ];
        }
      }

      const page = parseInt(request.params.page);
      const limit = parseInt(request.params.limit);
      const skip = limit * (page - 1);
      const total = await instance.inventoryCount.countDocuments(query);

      const counts = await instance.inventoryCount
        .find(query)
        .sort({ _id: -1 })
        .skip(skip)
        .limit(limit);

      reply.ok({
        total,
        page: Math.ceil(total / limit),
        data: counts,
      });
    } catch (error) {
      reply.error(error.message);
    }
    return reply;
  };

  instance.post(
    "/inventory/count/get/:limit/:page",
    options.version,
    (request, reply) => {
      instance.oauth_admin(request, reply, (admin) => {
        if (!admin) {
          return reply.error("Access");
        }
        getcounts(request, reply, admin);
      });
    },
  );

  // get by id

  const getCount = async (request, reply, admin) => {
    try {
      const count = await instance.inventoryCount
        .findOne({
          _id: request.params.id,
        })
        .lean();
      if (!count) {
        return reply.fourorfour("count");
      }

      const countItems = await instance.inventoryCountItem
        .find({
          count_id: count._id,
        })
        .lean();
      const ids = [];
      for (const c of countItems) {
        ids.push(c.product_id);
      }
      const goods = await instance.goodsSales
        .find(
          {
            _id: {
              $in: ids,
            },
          },
          {
            _id: 1,
            name: 1,
            item_type: 1,
            sku: 1,
          },
        )
        .lean();

      const gObj = {};
      for (const g of goods) {
        var in_stock = 0;
        for (var s of g.services) {
          if (s.service + "" == count.service + "") {
            in_stock += s.in_stock;
          }
        }
        g.in_stock = in_stock;
        gObj[g._id] = g;
      }

      count.total_difference = 0;
      count.total_cost_difference = 0;
      for (let i = 0; i < countItems.length; i++) {
        countItems[i]._id = countItems[i].product_id;
        if (gObj[countItems[i].product_id]) {
          countItems[i].product_name = gObj[countItems[i].product_id].name;
          if (gObj[countItems[i].product_id].item_type == "variant") {
            const parent = await instance.goodsSales.findOne({
              variant_items: {
                $elemMatch: {
                  $eq: countItems[i].product_id,
                },
              },
            });
            if (parent) {
              countItems[
                i
              ].product_name = `${parent.name} ( ${countItems[i].product_name} )`;
            }
          }

          countItems[i].sku = gObj[countItems[i].product_id].sku;
          if (countItems[i].counted) {
            countItems[i].difference =
              countItems[i].counted - countItems[i].exp_in_stock;
            count.total_difference += countItems[i].difference;
            countItems[i].cost_difference =
              countItems[i].difference * countItems[i].cost;
            count.total_cost_difference += countItems[i].cost_difference;
          }
        }
      }

      count.items = countItems;
      reply.ok(count);
    } catch (error) {
      reply.error(error.message);
    }
    return reply;
  };

  instance.get(
    "/inventory/count/get/:id",
    options.version,
    (request, reply) => {
      instance.oauth_admin(request, reply, (admin) => {
        if (!admin) {
          return reply.error("Access");
        }
        getCount(request, reply, admin);
      });
    },
  );

  // get items

  const get_items = async (request, reply, admin) => {
    try {
      const invcount = await instance.inventoryCount.findOne({
        _id: request.params.id,
      });
      let query = {
        organization: admin.organization,
      };
      if (invcount.service != undefined && invcount.service != "") {
        query.services = { $elemMatch: { service: { $eq: invcount.service } } };
      }
      let goods = await instance.goodsSales.find(query, {
        name: 1,
        sku: 1,
        cost: 1,
        services: 1,
      });

      for (let i = 0; i < goods.length; i++) {
        try {
          goods[i] = goods[i].toObject();
        } catch (error) {
          instance.send_Error("to Object", error.message);
        }
        for (var s of goods[i].services) {
          if (s.in_stock) {
            if (invcount.service) {
              if (invcount.service == s.service + "") {
                goods[i].in_stock = s.in_stock;
              }
            }
          }
        }
        if (!goods[i].in_stock) {
          goods[i].in_stock = 0;
        }
        goods[i].services = undefined;
      }
      reply.ok(goods);
    } catch (error) {
      reply.error(error.message);
    }
    return reply;
  };

  instance.get(
    "/inventory/count/get_items/:id",
    options.version,
    (request, reply) => {
      instance.oauth_admin(request, reply, (admin) => {
        if (!admin) {
          return reply.error("Access");
        }
        get_items(request, reply, admin);
      });
    },
  );

  // create history

  async function update_inv_count(history, goodObj, reply) {
    try {
      let items = await instance.inventoryCountItem.find({
        count_id: history.count_id,
        product_id: history.product_id,
      });
      let item = null;
      history.value = parseFloat(history.value);

      for (var it of items) {
        if (it.product_id + "" == history.product_id + "") {
          if (it.counted) {
            history.value += it.counted;
            if (history.value <= 0) {
              history.value = null;
            }
          }

          item = {
            _id: it._id,
            count_id: it.count_id,
            product_id: it.product_id,
            counted: history.value,
            cost: goodObj.cost,
            cost_currency: goodObj.cost_currency,
            difference: 0,
            cost_difference: 0,
          };
        }
      }
      if (item) {
        let bor = await instance.inventoryCountHistory.findOne({
          product_id: item.product_id,
          count_id: item.count_id,
        });
        if (!bor) {
          item.counted = undefined;
          item.difference = undefined;
          item.cost_difference = undefined;
        }

        item.exp_in_stock = goodObj.in_stock ? goodObj.in_stock : 0;
        item.difference =
          item.counted - goodObj.in_stock ? item.counted - goodObj.in_stock : 0;
        item.cost_difference = item.difference * item.cost;
        await instance.inventoryCountItem.updateOne(
          {
            _id: item._id,
          },
          {
            $set: item,
          },
        );
        reply.ok();
      } else {
        let inv = await instance.inventoryCount.findOne({
          _id: history.count_id,
        });
        if (!inv) {
          return reply.fourorfour("inv");
        }
        let good = await instance.goodsSales.findOne({
          _id: history.product_id,
        });
        if (!good) {
          return reply.fourorfour("good");
        }
        let myvar = {
          product_id: instance.ObjectId(good._id),
          product_name: good.name,
          product_sku: good.sku,
          count_id: history.count_id,
        };
        let in_stock = 0;
        for (var s of good.services) {
          if (s.in_stock) {
            if (inv.service + "" == s.service + "") {
              in_stock = s.in_stock ? s.in_stock : 0;
            }
          }
        }
        myvar.exp_in_stock = in_stock;
        myvar.cost =
          good.cost && typeof good.cost == typeof 5.5 ? good.cost : 0;
        myvar.counted = history.value;
        myvar.difference = myvar.counted - myvar.exp_in_stock;

        myvar.cost_difference = myvar.cost * myvar.difference;
        await new instance.inventoryCountItem(myvar);
        reply.ok();
      }
    } catch (error) {
      reply.error(error.message);
    }
    return reply;
  }

  instance.post(
    "/inventory/count/history/create",
    options.version,
    async (request, reply) => {
      try {
        let count = await instance.inventoryCount.findOne({
          _id: request.body.count_id,
        });
        if (!count) {
          return reply.fourorfour("Count not found");
        }
        let pro = await instance.goodsSales.findOne({
          _id: request.body.product_id,
        });
        if (!pro) {
          return reply.fourorfour("Item");
        }
        if (pro.item_type == "variant") {
          const parent = await instance.goodsSales.findOne({
            variant_items: {
              $elemMatch: {
                $eq: pro._id,
              },
            },
          });
          if (parent) {
            pro.name = `${parent.name} ( ${pro.name} )`;
          }
        }

        let in_stock = 0;
        let goodObj = {
          cost: pro.cost,
          cost_currency: pro.cost_currency,
        };
        if (typeof pro.services == typeof []) {
          for (const s of pro.services) {
            if (s.service + "" == count.service + "") {
              in_stock = s.in_stock;
            }
          }
        }

        goodObj.in_stock = in_stock;
        if (request.body.input_changed) {
          let countitem = await instance.inventoryCountItem.findOne({
            count_id: request.body.count_id,
            product_id: request.body.product_id,
          });
          if (!countitem) {
            return reply.fourorfour("countitem");
          }
          if (!countitem.counted) {
            countitem.counted = 0;
          }
          request.body.value -= countitem.counted;
          if (request.body.value == 0) {
            return reply.error("Not changed");
          }
          let history = await new instance.inventoryCountHistory(
            Object.assign({ product_name: pro.name }, request.body),
          ).save();
          return await update_inv_count(history, goodObj, reply);
        }
        let history = await new instance.inventoryCountHistory(
          Object.assign({ product_name: pro.name }, request.body),
        ).save();
        return await update_inv_count(history, goodObj, reply);
      } catch (error) {
        reply.error(error.message);
      }
      return reply;
    },
  );

  // get histories

  instance.get(
    "/inventory/count/history/get/:id",
    options.version,
    async (request, reply) => {
      try {
        let histories = await instance.inventoryCountHistory.find({
          count_id: request.params.id,
        });
        reply.ok(histories);
      } catch (error) {
        reply.error(error.message);
      }
      return reply;
    },
  );

  // delete history

  instance.delete(
    "/inventory/count/history/delete/:id",
    options.version,
    async (request, reply) => {
      try {
        let history = await instance.inventoryCountHistory.findOne({
          _id: request.params.id,
        });
        await instance.inventoryCountHistory.deleteOne({
          _id: request.params.id,
        });
        if (!history) {
          return reply.fourorfour("history");
        }
        let gObj = {
          cost: 0,
          cost_currency: "uzs",
          in_stock: 0,
        };
        const count = await instance.inventoryCount.findById(history.count_id);
        if (count) {
          const product = await instance.goodsSales.findById(
            history.product_id,
          );
          if (product && typeof product.services == typeof []) {
            let in_stock = 0;
            for (const s of product.services) {
              if (s.service + "" == count.service + "") {
                in_stock = s.in_stock;
              }
            }
            gObj.in_stock = in_stock;
            gObj.cost = product.cost;
            gObj.cost_currency = product.cost_currency;
          }
        }

        history.value *= -1;
        await update_inv_count(history, gObj, reply);
      } catch (error) {
        reply.error(error.message);
      }
      return reply;
    },
  );

  next();
});
