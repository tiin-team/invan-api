
const getItemsForPurchase = async (request, reply, instance) => {
  try {
    const service_id = request.body.service
    const state = request.body.state
    const admin = request.user
    const query = {
      organization: admin.organization,
      has_variants: { $ne: true }
    }
    if (request.body.supplier) {
      try {
        query.primary_supplier_id = instance.ObjectId(request.body.supplier)
      } catch (error) { }
    }

    const search_text = request.body.search
    if (typeof search_text === 'string') {

      const converted_search_text = instance.converter(search_text)
      const has_converted = converted_search_text && converted_search_text !== 'nothing_to_change'
      const reg_exp = has_converted ? `${search_text}|${converted_search_text}` : search_text
      const only_digits = /^\d+$/.test(search_text)

      query['$or'] = [
        { name: { $regex: reg_exp, $options: 'i' } },
        { parent_name: { $regex: reg_exp, $options: 'i' } },
      ]

      if (only_digits) {
        query['$or'].push({ sku: +search_text })

        query['$or'].push({ barcode: { $regex: search_text } })
      }

    }

    const count_items = await instance.goodsSales.countDocuments(query)
    const limit = request.params.limit == 'all' ? (count_items != 0 ? count_items : 1) : request.params.limit
    const page = request.params.page

    let goods = await instance.goodsSales.aggregate([
      { $match: query },
      {
        $lookup: {
          from: 'purchaseitems',
          localField: '_id',
          foreignField: 'product_id',
          as: 'item'
        }
      },
      {
        $project: {
          services: 1,
          name: 1,
          barcode: 1,
          sku: 1,
          cost: 1,
          cost_currency: 1,
          default_purchase_cost: 1,
          purchase_cost_currency: 1,
          item: {
            $filter: {
              input: "$item",
              as: "itm",
              cond:
                { $gt: ["$$itm.quality", "$$itm.received"] }
            }
          },
          item_type: 1
        }
      },
      { $skip: limit * (page - 1) },
      { $limit: limit },
      { $sort: { _id: 1 } }
    ])

    if (typeof goods != typeof []) {
      goods = []
    }

    var Answer = []
    for (var g of goods) {
      var incoming = 0
      if (g.item && g.item.length > 0) {
        for (var it of g.item) {
          if (it.service + '' == service_id + '') {
            incoming += (it.quality - (it.received))
          }
        }
      }
      g.item = undefined
      g.in_stock = 0
      let low_stock = 0
      for (var s of g.services) {
        if (s.in_stock && s.service + '' == service_id + '') {
          g.in_stock = s.in_stock

          if (s.low_stock && typeof s.low_stock == typeof 5) {
            low_stock = s.low_stock
          }
        }
      }
      g.services = undefined
      g.incoming = incoming
      g.purchase_cost = g.default_purchase_cost
      if (!g.cost_currency) {
        g.cost_currency = 'uzs'
      }
      if (!g.purchase_cost_currency) {
        g.purchase_cost_currency = 'uzs'
      }

      if (g.item_type == 'variant') {
        try {
          const parent = await instance.goodsSales.findOne({
            variant_items: {
              $elemMatch: {
                $eq: g._id
              }
            }
          })
          if (parent) {
            g.name = `${parent.name} ( ${g.name} )`;
            if (!g.default_purchase_cost) {
              g.purchase_cost = parent.default_purchase_cost;
            }
            if (parent.purchase_cost_currency) {
              g.purchase_cost_currency = parent.purchase_cost_currency;
            }
            if (state == 'low' && low_stock > g.in_stock) {
              Answer.push(g)
            }
            else if (state != 'low') {
              Answer.push(g)
            }
          }
        }
        catch (err) { }
      }
      else {
        if (state == 'low' && low_stock > g.in_stock) {
          Answer.push(g)
        }
        else if (state != 'low') {
          Answer.push(g)
        }
      }
    }

    reply.ok(Answer)
  } catch (error) {
    reply.error(error.message)
  }
}

const purchaseItemsRefresh = async (request, reply, instance) => {
  try {
    const { service: service_id, indexes } = request.body;

    const service = await instance.services.findById(service_id);
    if (!service) {
      return reply.fourorfour('Service')
    }

    for (const ind in indexes) {
      try {
        indexes[ind] = instance.ObjectId(indexes[ind])
      } catch (error) { }
    }

    let goods = await instance.goodsSales.aggregate([
      {
        $match: {
          _id: {
            $in: indexes
          }
        }
      },
      {
        $lookup: {
          from: 'purchaseitems',
          localField: '_id',
          foreignField: 'product_id',
          as: 'item'
        }
      },
      {
        $project: {
          services: 1,
          name: 1,
          barcode: 1,
          sku: 1,
          cost: 1,
          cost_currency: 1,
          default_purchase_cost: 1,
          purchase_cost_currency: 1,
          item: 1,
          item_type: 1
        }
      }
    ])

    if (!(goods instanceof Array)) {
      goods = []
    }

    const Answer = []
    for (var g of goods) {
      var incoming = 0
      if (g.item && g.item.length > 0) {
        for (var it of g.item) {
          if (it.service + '' == service_id + '') {
            incoming += (it.quality - (it.received))
          }
        }
      }
      g.item = undefined
      g.in_stock = 0
      let low_stock = 0
      for (var s of g.services) {
        if (s.in_stock && s.service + '' == service_id + '') {
          g.in_stock = s.in_stock

          if (s.low_stock && typeof s.low_stock == typeof 5) {
            low_stock = s.low_stock
          }
        }
      }
      g.services = undefined
      g.incoming = incoming
      g.purchase_cost = g.default_purchase_cost
      if (!g.cost_currency) {
        g.cost_currency = 'uzs'
      }

      if (!g.purchase_cost_currency) {
        g.purchase_cost_currency = 'uzs'
      }

      if (g.item_type == 'variant') {
        try {
          const parent = await instance.goodsSales.findOne({
            variant_items: {
              $elemMatch: {
                $eq: g._id
              }
            }
          })
          if (parent) {
            g.name = `${parent.name} ( ${g.name} )`;
            g.purchase_cost_currency = parent.purchase_cost_currency;
            Answer.push(g);
          }
        }
        catch (err) { }
      }
      else {
        Answer.push(g)
      }
    }

    reply.ok(Answer);
  } catch (error) {
    return reply.error(error.message)
  }
}

const fp = require('fastify-plugin');

module.exports = fp((instance, options, next) => {

  instance.get(
    '/inventory/purchase/count/not-pricing',
    { version: '1.0.0' },
    (request, reply) => {
      instance.oauth_admin(request, reply, async (admin) => {
        try {
          const counted = await instance.inventoryPurchase.countDocuments({
            organization: admin.organization,
            status: 'closed',
            pricing_status: false
          })
          reply.ok({ counted: counted })
        } catch (error) {
          reply.error(error.message)
        }
      })
    }
  )

  // get items for inventory purchase

  const getItemsSchemaBody = {
    body: {
      type: 'object',
      required: ['service'],
      properties: {
        service: { type: 'string' },
        supplier: { type: 'string' },
        state: { type: 'string' },
        search: { type: 'string' }
      }
    }
  }

  const getPurchaseItemsHanler = (request, reply) => {
    if (request.validationError) {
      return reply.validation(request.validationError.message)
    }
    instance.oauth_admin(request, reply, (admin) => {
      request.user = admin
      return getItemsForPurchase(request, reply, instance)
    })
  }

  instance.post(
    '/inventory/purchase/items/get',
    {
      ...options.version,
      schema: {
        ...getItemsSchemaBody
      },
      preHandler: (request, reply, done) => {
        request.params = {
          limit: 'all',
          page: 1
        }
        done()
      },
      attachValidation: true
    },
    getPurchaseItemsHanler
  )

  const invItemsRefreshIdsSchema = {
    body: {
      type: 'object',
      additionalProperties: false,
      properties: {
        service: {
          type: 'string',
          minLength: 24,
          maxLength: 24
        },
        indexes: {
          type: 'array',
          items: {
            type: 'string',
            minLength: 24,
            maxLength: 24
          }
        }
      }
    }
  }

  instance.post(
    '/inventory/purchase/items/refresh',
    {
      ...options.version,
      schema: invItemsRefreshIdsSchema,
      attachValidation: true
    },
    (request, reply) => {
      instance.authorization(request, reply, (user) => {
        if (request.validationError) {
          return reply.validation(request.validationError.message)
        }
        return purchaseItemsRefresh(request, reply, instance)
      })
    }
  )

  instance.post(
    '/inventory/purchase/items/get/:limit/:page',
    {
      ...options.version,
      schema: {
        ...getItemsSchemaBody,
        params: {
          type: 'object',
          required: ['limit', 'page'],
          properties: {
            limit: { type: 'integer', minimum: 1 },
            page: { type: 'integer', minimun: 1 }
          }
        }
      },
      attachValidation: true
    },
    getPurchaseItemsHanler
  )

  // create purchase order

  // receive function

  const receive_purchase = async (request, reply, admin) => {
    try {
      if (request.body == undefined) {
        request.body = {}
      }
      if (!(request.body.items instanceof Array)) {
        request.body.items = []
      }
      if (!(request.body.additional_cost instanceof Array)) {
        request.body.additional_cost = []
      }
      const purch = await instance.inventoryPurchase
        .findOne({ _id: request.params.id })
        .lean();
      if (!purch) return reply.fourorfour('purchase_order')

      let items = request.body.items;
      let item_ids = [];
      let reqObj = {};
      for (let i = 0; i < items.length; i++) {
        item_ids.push(items[i]._id)
        reqObj[items[i]._id] = items[i]
        reqObj[items[i]._id].to_receive = parseFloat(reqObj[items[i]._id].to_receive)
      }
      items = await instance.purchaseItem.find({ _id: { $in: item_ids } });

      let goodsObj = {}
      let pro_ids = []
      let itemObj = {}
      let received = 0
      let is_changed = false

      let check_closed = true
      let used_transaction = 0.0;
      let currency;
      try {
        currency = await instance.Currency.findOne({ organization: admin.organization })
        if (!currency || !currency.value) {
          currency = { value: 1 }
        }
      } catch (error) { }
      for (let i = 0; i < items.length; i++) {
        if (reqObj[items[i]._id].to_receive + items[i].received <= items[i].quality && reqObj[items[i]._id].to_receive >= 0) {
          items[i].to_receive = +reqObj[items[i]._id].to_receive
          purch.is_service_changable = false
          if (items[i].to_receive != 0) {
            var pro_id = instance.ObjectId(items[i].product_id)

            if (goodsObj[pro_id] == undefined) {
              pro_ids.push(items[i].product_id)
              try {
                goodsObj[pro_id] = items[i].toObject()
              }
              catch (error) {
                console.log(error.message)
              }
            }
            else {
              goodsObj[pro_id].purchase_cost =
                ((+goodsObj[pro_id].purchase_cost) * (+goodsObj[pro_id].to_receive)
                  + (+items[i].purchase_cost) * (+items[i].to_receive)) / ((+items[i].to_receive) + (+goodsObj[pro_id].to_receive))
              goodsObj[pro_id].to_receive += (+items[i].to_receive);
            }
          }
          is_changed = is_changed || items[i].to_receive > 0
          received += reqObj[items[i]._id].to_receive
          let used_purchase_cost = items[i].purchase_cost

          if (items[i].purchase_cost_currency == 'usd') {
            used_purchase_cost = used_purchase_cost * currency.value
          }
          used_transaction += (+reqObj[items[i]._id].to_receive) * (+used_purchase_cost)
          items[i].to_receive = 0
          items[i].received += (+reqObj[items[i]._id].to_receive)
        }
        check_closed = check_closed && (items[i].received == items[i].quality)
        itemObj[items[i]._id] = items[i]
      }
      let additional_costObj = {}
      for (const add of request.body.additional_cost) {
        additional_costObj[add._id] = add
      }

      for (let i = 0; i < purch.additional_cost.length; i++) {
        if (additional_costObj[purch.additional_cost[i]._id] !== undefined) {
          if (is_changed) {
            if (!purch.additional_cost[i].is_received && additional_costObj[purch.additional_cost[i]._id].is_received) {
              let received_amount = +purch.additional_cost[i].amount

              if (purch.additional_cost[i].amount_currency == 'usd') {
                received_amount = received_amount * currency.value
              }
              used_transaction += received_amount
            }
            purch.additional_cost[i].is_received = additional_costObj[purch.additional_cost[i]._id].is_received
            check_closed = check_closed && (additional_costObj[purch.additional_cost[i]._id].is_received)
          }
        }
      }
      let status = (check_closed) ? "closed" : (is_changed || received > 0) ? 'partially' : 'pending'
      await instance.inventoryPurchase.updateOne(
        { _id: request.params.id },
        {
          $inc: { received: received },
          $set: {
            status: status,
            additional_cost: purch.additional_cost,
            is_service_changable: purch.is_service_changable,
          }
        });
      if (item_ids && item_ids.length == 0) {
        return reply.ok(purch)
      }
      for (const id of item_ids) {
        await instance.purchaseItem.updateOne({ _id: id }, { $set: itemObj[id] })
      };

      // supplier transaction
      const current_supplier = await instance.adjustmentSupplier
        .findOne({ _id: purch.supplier_id })
        .lean();
      if (current_supplier) {
        if (!current_supplier.balance) {
          current_supplier.balance = 0
        }
        if (!current_supplier.balance_usd) {
          current_supplier.balance_usd = 0
        }
        let supplier_used_transaction;
        if (purch.total_currency == 'usd') {
          // current_supplier.balance_usd -= used_transaction / currency.value;
          // supplier_used_transaction = -1 * used_transaction / currency.value;
          current_supplier.balance_usd -= used_transaction / currency.value;
          supplier_used_transaction = -1 * used_transaction / currency.value;
        }
        else {
          // current_supplier.balance -= used_transaction;
          // supplier_used_transaction = -1 * used_transaction;
          current_supplier.balance -= used_transaction;
          supplier_used_transaction = -1 * used_transaction;
        }
        await instance.adjustmentSupplier.updateOne(
          { _id: purch.supplier_id, 'services.serivce': purch.service },
          {
            $set: {
              balance: current_supplier.balance,
              balance_usd: current_supplier.balance_usd,
              'services.$.serivce': purch.service,
              'services.$.balance': { $inc: urrent_supplier.balance },
              'services.$.balance_usd': { $inc: current_supplier.balance_usd },
            },
          }
        )

        await new instance.supplierTransaction({
          service: purch.service,
          supplier_id: current_supplier._id,
          document_id: purch.p_order,
          employee: admin._id,
          employee_name: admin.name,
          status: 'active',
          balance: supplier_used_transaction,
          currency: purch.total_currency,
          date: new Date().getTime(),
          purchase_id: purch._id
        })
          .save();
      }

      // update items cost
      const goods = await instance.goodsSales.find({ _id: { $in: pro_ids } });

      for (var g of goods) {
        var in_stock = null
        var index = -1
        var In_STOCK = 0;
        for (let i = 0; i < g.services.length; i++) {
          if (g.services[i].in_stock != '' && g.services[i].in_stock != null) {
            In_STOCK += +g.services[i].in_stock
          }
          if (g.services[i].service + "" == purch.service + "") {
            in_stock = +g.services[i].in_stock
            index = i
          }
        }
        if (in_stock != null) {
          if (in_stock > 0) {
            if (g.cost_currency == 'usd') {
              g.cost = g.cost * currency.value
            }
            if (goodsObj[g._id].purchase_cost_currency == 'usd') {
              goodsObj[g._id].purchase_cost = (+goodsObj[g._id].purchase_cost) * currency.value
            }
            g.cost = (g.cost * In_STOCK + (+goodsObj[g._id].purchase_cost) * (+goodsObj[g._id].to_receive))
              / (In_STOCK + (+goodsObj[g._id].to_receive))
            if (g.max_cost < g.cost || g.max_cost == 0) {
              g.max_cost = g.cost
            }
          }
          else {
            if (g.max_cost < goodsObj[g._id].purchase_cost || g.max_cost == 0) {
              g.max_cost = +goodsObj[g._id].purchase_cost
            }
            if (goodsObj[g._id].purchase_cost_currency == 'usd') {
              goodsObj[g._id].purchase_cost = (+goodsObj[g._id].purchase_cost) * currency.value
            }
            g.cost = (+goodsObj[g._id].purchase_cost)
          }

          if (g.cost_currency == 'usd') {
            g.cost = g.cost / currency.value
          }
          g.services[index].in_stock += (+goodsObj[g._id].to_receive)

          // create inv history

          // ('create_inventory_history', (user, reason, unique, service_id, product_id, cost, adjustment, stock_after, date)

          await instance.create_inventory_history(admin, 'received', purch.p_order, purch.service, g._id, g.cost, +goodsObj[g._id].to_receive, +in_stock + +goodsObj[g._id].to_receive, new Date().getTime())
          g.last_updated = new Date().getTime()
          g.last_stock_updated = new Date().getTime()
          await instance.goodsSales.updateOne({ _id: g._id }, { $set: g })
        }
      }

      reply.ok(purch)

    } catch (error) {
      reply.error(error.message)
    }

    return reply;
  };

  instance.decorate('receivePurchase', receive_purchase)

  const return_purchase_order = (purch, items, admin) => {
    // 'update_in_stock_of_sold_items', (id, service_id, in_stock, user, receipt, REASON = 'other', request = null
    for (const it of items) {
      instance.update_in_stock_of_sold_items(
        it.product_id,
        purch.service,
        (-1) * it.quality,
        admin,
        {
          date: purch.purchase_order_date,
          receipt_no: purch.p_order
        },
        'returned_order',
      )
    }
  }

  const create_purchase_order = async (request, reply, admin) => {
    if (!request.body) {
      request.body = {}
    }
    request.body.type = 'coming'
    const id = request.body.supplier_id
    if (id != '' && id != undefined) {
      var valid = true
      if (request.body.purchase_order_date == "" || request.body.purchase_order_date == null) {
        request.body.purchase_order_date = new Date().getTime()
      }
      if (request.body.purchase_order_date != "" && request.body.expected_on) {
        if (request.body.purchase_order_date > request.body.expected_on) {
          valid = false
        }
      }

      if (valid) {
        let currency = { value: 1 };
        try {
          currency = await instance.Currency.findOne({ organization: admin.organization })
          if (!currency || !currency.value) {
            currency = { value: 1 }
          }
        } catch (error) { }
        instance.adjustmentSupplier.findOne(
          { _id: id },
          (err, supp) => {
            if (supp) {
              instance.inventoryPurchase.countDocuments(
                { organization: admin.organization },
                async (err, orders) => {
                  if (err || !orders) orders = 0

                  const p_order = 'P' + ('00000000000' + (orders + 1001)).slice(-5);
                  request.body.p_order = p_order

                  try {
                    request.body.supplier_id = instance.ObjectId(request.body.supplier_id)
                    request.body.service = instance.ObjectId(request.body.service)
                    request.body.ordered_by_id = instance.ObjectId(admin._id)
                  } catch (error) {
                    return reply.error(error.message)
                  }

                  request.body.ordered_by_name = admin.name
                  request.body.organization = admin.organization
                  delete request.body._id
                  if (request.body.status != 'returned_order' && request.body.status != 'closed') {
                    request.body.status = 'pending'
                  }
                  const purchaseModel = new instance.inventoryPurchase(request.body)

                  if (purchaseModel.status == 'closed') purchaseModel.status = 'pending'

                  purchaseModel.supplier_name = supp.supplier_name
                  purchaseModel.service_name = (
                    await instance.services.findById(request.body.service, { name: 1 }).lean()
                  ).name
                  const purchase_items = []
                  var total_count = 0
                  var total = 0

                  if (request.body.items != undefined) {
                    if (request.body.items.length > 0) {
                      for (let i = 0; i < request.body.items.length; i++) {
                        delete request.body.items[i]._id
                        request.body.items[i].purchase_id = instance.ObjectId(purchaseModel._id)
                        request.body.items[i].ordered = request.body.items[i].quality
                        request.body.items[i].service = instance.ObjectId(request.body.service)
                        if (request.body.items[i].quality != undefined && parseFloat(request.body.items[i].quality)) {
                          total_count += parseFloat(request.body.items[i].quality)
                          if (request.body.items[i].purchase_cost != undefined && parseFloat(request.body.items[i].quality) && parseFloat(request.body.items[i].purchase_cost)) {
                            let amount_quality = parseFloat(request.body.items[i].quality) * parseFloat(request.body.items[i].purchase_cost)
                            if (request.body.items[i].purchase_cost_currency == 'usd') {
                              amount_quality = amount_quality * currency.value
                            }
                            total += amount_quality
                          }

                        }
                        if (parseFloat(request.body.items[i].purchase_cost) && parseFloat(request.body.items[i].quality)) {
                          request.body.items[i].purchase_cost = parseFloat(request.body.items[i].purchase_cost)
                          request.body.items[i].amount = request.body.items[i].purchase_cost * parseFloat(request.body.items[i].quality)
                          await instance.goodsSales.updateOne({ _id: request.body.items[i].product_id }, { default_purchase_cost: request.body.items[i].purchase_cost })
                        }
                        purchase_items.push(request.body.items[i])

                      }
                      if (request.body.additional_cost == undefined) {
                        request.body.additional_cost = []
                      }
                      for (const r in request.body.additional_cost) {
                        delete request.body.additional_cost[r]._id
                        if (parseFloat(request.body.additional_cost[r].amount)) {
                          let additional_amount = parseFloat(request.body.additional_cost[r].amount)
                          if (request.body.additional_cost[r].amount_currency == 'usd') {
                            additional_amount = additional_amount * currency.value
                          }
                          total += additional_amount
                        }
                      }
                    }
                  }
                  purchaseModel.total_count = total_count
                  if (request.body.total_currency == 'usd') {
                    total = total / currency.value
                  }
                  purchaseModel.total = total
                  purchaseModel.items = purchase_items
                  if (purchaseModel.items.length > 0) {
                    purchaseModel.save((err, purch) => {
                      if (err || purch == null) {
                        reply.error('Error on saving purchase order')
                        instance.send_Error('saving purchase', JSON.stringify(err))
                      }
                      else {
                        instance.purchaseItem.insertMany(purchase_items, (err, purchaseitems) => {
                          if (err || purchaseitems == null) {
                            reply.error('Error on saving purchase items')
                            instance.send_Error('saving purchase item', JSON.stringify(err))
                          }
                          else {
                            if (request.body.status == 'returned_order') {
                              reply.ok(purch)
                              return_purchase_order(purch, purchase_items, admin)
                            }
                            else if (request.body.status == 'closed') {
                              for (let i = 0; i < purchaseitems.length; i++) {
                                purchaseitems[i].to_receive = purchaseitems[i].quality
                              }
                              for (let i = 0; i < purch.additional_cost.length; i++) {
                                purch.additional_cost[i].is_received = true
                              }
                              purch.items = purchaseitems
                              receive_purchase({ body: purch, params: { id: purch._id } }, reply, admin)
                            }
                            else {
                              reply.ok(purch)
                            }
                          }
                        })
                      }
                    })
                  }
                  else {
                    reply.error('items can\'t be empty')
                  }
                })
            }
            else {
              reply.error('Supplier not found')
            }
          })
      }
      else {
        reply.error('Time error')
      }
    }
    else {
      reply.error('Error on finding supplier')
    }
  }
  instance.decorate('create_purchase_order', create_purchase_order)

  instance.post('/inventory/create_purchase_order', options.version, (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      if (admin) {
        create_purchase_order(request, reply, admin)
      }
    })
  })

  // create purchase refund

  const createPurchaseOrderRefund = async (request, reply) => {
    const service_id = request.body.service
    const supplier_id = request.body.supplier_id
    const body = request.body
    const admin = request.user
    try {
      const service = await instance.services.findOne({ _id: service_id }).lean();

      if (!service) return reply.fourorfour('Service')

      body.service_name = service.name

      const supplier = await instance.adjustmentSupplier.findOne({ _id: supplier_id }).lean();
      if (!supplier) {
        return reply.fourorfour('Supplier')
      }
      body.supplier_name = supplier.supplier_name

      const orders_length = await instance.inventoryPurchase.countDocuments({ organization: admin.organization })
      const p_order = 'P' + ('00000000000' + (orders_length + 1001)).slice(-5);
      body.organization = admin.organization
      body.p_order = p_order
      body.status = ['closed', 'pending', 'partially', 'returned_order'].includes(body.status) ? body.status : 'closed'
      body.type = 'refund'
      body.ordered_by_id = admin._id
      body.ordered_by_name = admin.name
      body.additional_cost = []
      const items = []
      let total = 0
      let total_count = 0
      // get currency
      let currency = { value: 1 }
      try {
        currency = await instance.Currency.findOne({ organization: admin.organization })
        if (!currency || !currency.value) {
          currency = { value: 1 }
        }
      } catch (error) { }

      for (const index in body.items) {
        const current_item = await instance.goodsSales.findOne({
          organization: admin.organization,
          _id: body.items[index].product_id
        })
          .lean();
        if (current_item) {
          items.push({
            organization: admin.organization,
            service: service_id,
            product_id: body.items[index].product_id,
            product_name: current_item.name,
            purchase_cost: body.items[index].purchase_cost,
            purchase_cost_currency: body.items[index].purchase_cost_currency,
            quality: body.items[index].quality,
            ordered: body.items[index].quality,
            received: body.items[index].quality,
            sku: current_item.sku,
            barcode: current_item.barcode,
            amount: body.items[index].quality * body.items[index].purchase_cost,
          })
          total_count += body.items[index].quality
          let purchase_cost = body.items[index].purchase_cost
          if (body.items[index].purchase_cost_currency == 'usd') {
            purchase_cost = purchase_cost * currency.value
          }
          total += body.items[index].quality * purchase_cost
        }
      }
      if (items.length == 0) {
        return reply.fourorfour('Items')
      }
      delete body.items
      body.total = total;
      if (!supplier.balance) {
        supplier.balance = 0;
      }
      if (!supplier.balance_usd) {
        supplier.balance_usd = 0;
      }
      let balance_uzs = 0;
      let balance_usd = 0;
      if (body.total_currency == 'usd') {
        body.total = body.total / currency.value;
        supplier.balance_usd += body.total
        balance_usd = body.total;
        // supplier.balance_usd -= body.total
      }
      else {
        balance_uzs = body.total;
        supplier.balance += body.total
        // supplier.balance -= body.total
      }
      body.total_count = total_count
      body.received = total_count
      const { _id: purchase_id } = await new instance.inventoryPurchase(body).save()
      if (body.status == 'pending')
        return reply.ok({ _id: purchase_id })
      await instance.adjustmentSupplier.updateOne(
        { _id: supplier._id, 'services.serivce': service_id },
        {
          $set: {
            balance: supplier.balance,
            balance_usd: supplier.balance_usd,
            'services.$.serivce': service_id,
            'services.$.balance': { $inc: balance_uzs },
            'services.$.balance_usd': { $inc: balance_usd },
          },
        })

      try {
        await new instance.supplierTransaction({
          supplier_id: supplier._id,
          service: service._id,
          document_id: body.p_order,
          employee: admin._id,
          employee_name: admin.name,
          status: 'active',
          balance: total,
          balance_currency: body.total_currency,
          date: new Date().getTime(),
          purchase_id: purchase_id
        }).save();
      } catch (error) { }
      for (const index in items) {
        items[index].purchase_id = purchase_id
        await new instance.purchaseItem(items[index]).save()
        // update cost and in_stock
        const item = await instance.goodsSales.findOne({ _id: items[index].product_id }).lean();
        if (item) {
          let in_stock = 0
          if (typeof item.services == typeof []) {
            for (const ser of item.services) {
              in_stock += ser.in_stock ? ser.in_stock : 0
            }
          }
          if (in_stock != items[index].quality && in_stock > 0 && item.cost) {
            if (item.cost_currency == 'usd') {
              item.cost = item.cost * currency.value
            }
            if (items[index].purchase_cost_currency == 'usd') {
              items[index].purchase_cost = items[index].purchase_cost * currency.value
            }
            let new_cost = (item.cost * in_stock - items[index].quality * items[index].purchase_cost) / (in_stock - items[index].quality)
            if (item.cost_currency == 'usd') {
              new_cost = new_cost / currency.value
            }
            await instance.goodsSales.updateOne(
              { _id: item._id },
              { $set: { cost: new_cost } },
            )
          }
          instance.update_in_stock_of_sold_items(item._id, service_id, (-1) * items[index].quality, admin, { date: body.purchase_order_date, receipt_no: body.p_order }, 'returned_order')
        }
      }
      return reply.ok({ _id: purchase_id })
    } catch (error) {
      return reply.error(error.message)
    }
  }
  instance.decorate('createPurchaseOrderRefund', createPurchaseOrderRefund)

  const refundPurchaseOrderSchema = {
    schema: {
      body: {
        type: 'object',
        additionalProperties: false,
        required: [
          'supplier_id', 'purchase_order_date',
          'service', 'items'
        ],
        properties: {
          status: { type: 'string' },
          supplier_id: { type: 'string' },
          purchase_order_date: { type: 'number' },
          service: { type: 'string' },
          notes: { type: 'string' },
          total_currency: {
            type: 'string',
            default: 'uzs'
          },
          items: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              additionalProperties: false,
              required: [
                'product_id', 'purchase_cost', 'quality'
              ],
              properties: {
                product_id: { type: 'string' },
                purchase_cost: { type: 'number' },
                quality: { type: 'number' },
                purchase_cost_currency: {
                  type: 'string',
                  default: 'uzs'
                }
              }
            }
          }
        }
      }
    },
    attachValidation: true
  }

  instance.post(
    '/inventory/create_refund_purchase_order',
    {
      ...options.version,
      ...refundPurchaseOrderSchema
    },
    (request, reply) => {

      if (request.validationError) {
        return reply.validation(request.validationError.message)
      }
      instance.oauth_admin(request, reply, (admin) => {
        return createPurchaseOrderRefund(request, reply)
      })
    }
  )

  // get purchase orders

  var get_purchase_order = (request, reply, admin) => {
    var limit = parseInt(request.params.limit)
    var page = parseInt(request.params.page)
    var query = {
      organization: admin.organization
    }
    if (request.body == undefined) {
      a
      request.body = {}
    }
    if (request.body.status != undefined && request.body.status != '') {
      query.status = request.body.status
    }
    if (request.body.supplier_id != undefined && request.body.supplier_id != '') {
      query.supplier_id = instance.ObjectId(request.body.supplier_id)
    }
    if (request.body.services != undefined && request.body.services != '') {
      if (request.body.services.length > 0) {
        for (let i = 0; i < request.body.services.length; i++) {
          request.body.services[i] = instance.ObjectId(request.body.services[i])
        }
        query.service = { $in: request.body.services }
      }
    }
    if (request.body.service) {
      query.service = instance.ObjectId(request.body.service)
    }
    if (request.body.search != undefined && request.body.search != '') {
      query['$or'] = [
        {
          p_order: {
            $regex: request.body.search,
            $options: 'i'
          }
        },
        {
          supplier_name: {
            $regex: request.body.search,
            $options: 'i'
          }
        },
        {
          notes: {
            $regex: request.body.search,
            $options: 'i'
          }
        }
      ]
    }
    instance.inventoryPurchase.aggregate([
      {
        $match: query
      },
      {
        $lookup: {
          from: 'adjustmentsuppliers',
          localField: 'supplier_id',
          foreignField: '_id',
          as: 'supplier'
        }
      },
      {
        $lookup: {
          from: 'inoneservices',
          localField: 'service',
          foreignField: '_id',
          as: 'serviceObj'
        }
      },
      {
        $project: {
          serviceObj: {
            name: 1
          },
          supplier: {
            supplier_name: 1
          },
          p_order: 1,
          purchase_order_date: 1,
          supplier_id: 1,
          supplier_name: 1,
          service: 1,
          service_name: 1,
          status: 1,
          received: 1,
          total_count: 1,
          expected_on: 1,
          total: 1,
          type: 1,
          total_currency: 1,
          pricing_status: 1,
          last_pricing_date: 1,
          notes: 1
        }
      }, {
        $sort: {
          _id: -1
        }
      },
      {
        $skip: (page - 1) * limit
      },
      {
        $limit: limit
      }
    ], async (err, orders) => {
      if (err || !orders) {
        orders = []
      }
      // const total = orders.length
      const total = await instance.inventoryPurchase.countDocuments(query);

      // orders = orders.splice(limit * (page - 1), limit)
      for (let i = 0; i < orders.length; i++) {
        if (orders[i].supplier.length > 0) {
          orders[i].supplier_name = orders[i].supplier[0].supplier_name
          // orders[i].supplier_name = orders[i].supplier.supplier_name
        }
        delete orders[i].supplier
        if (orders[i].serviceObj.length > 0) {
          orders[i].service_name = orders[i].serviceObj[0].name
        }
        delete orders[i].serviceObj
      }
      reply.ok({
        total: total,
        page: Math.ceil(total / limit),
        data: orders
      })
    })
  }
  const get_purchase_order_new_ = (request, reply, admin) => {
    const limit = parseInt(request.params.limit)
    const page = parseInt(request.params.page)
    const query = {
      organization: admin.organization
    }
    if (request.body == undefined) {
      request.body = {}
    }
    if (request.body.status != undefined && request.body.status != '') {
      query.status = request.body.status
    }
    if (request.body.supplier_id != undefined && request.body.supplier_id != '') {
      query.supplier_id = instance.ObjectId(request.body.supplier_id)
    }
    if (request.body.employee_id != undefined && request.body.employee_id != '') {
      query.ordered_by_id = instance.ObjectId(request.body.employee_id)
    }
    if (request.body.services != undefined && request.body.services != '') {
      if (request.body.services.length > 0) {
        for (let i = 0; i < request.body.services.length; i++) {
          request.body.services[i] = instance.ObjectId(request.body.services[i])
        }
        query.service = { $in: request.body.services }
      }
    }
    if (request.body.service) {
      query.service = instance.ObjectId(request.body.service)
    }
    if (request.body.search != undefined && request.body.search != '') {
      query['$or'] = [
        {
          p_order: {
            $regex: request.body.search,
            $options: 'i'
          }
        },
        {
          supplier_name: {
            $regex: request.body.search,
            $options: 'i'
          }
        },
        {
          notes: {
            $regex: request.body.search,
            $options: 'i'
          }
        }
      ]
    }
    instance.inventoryPurchase.aggregate([
      {
        $match: query
      },
      // {
      //   $lookup: {
      //     from: 'adjustmentsuppliers',
      //     // localField: 'supplier_id',
      //     // foreignField: '_id',
      //     let: { supplier_id: "$supplier_id" },
      //     pipeline: [
      //       {
      //         $match: {
      //           $expr: { $eq: ["$$supplier_id", "$_id"] }
      //         },
      //       },
      //       {
      //         $project: {
      //           _id: 0,
      //           supplier_name: "$supplier_name"
      //         }
      //       }
      //     ],
      //     as: 'supplier'
      //   }
      // },
      // {
      //   $lookup: {
      //     from: 'inoneservices',
      //     // localField: 'service',
      //     // foreignField: '_id',
      //     let: { service: "$service" },
      //     pipeline: [
      //       {
      //         $match: {
      //           $expr: { $eq: ["$$service", "$_id"] }
      //         },
      //       },
      //       {
      //         $project: {
      //           _id: 0,
      //           service_name: "$name"
      //         }
      //       }
      //     ],
      //     as: 'serviceObj'
      //   }
      // },
      {
        $project: {
          // supplier_name: { $first: "$supplier.supplier_name" },
          // service_name: { $first: "$serviceObj.service_name" },
          supplier_name: 1,
          service_name: 1,
          p_order: 1,
          purchase_order_date: 1,
          supplier_id: 1,
          status: 1,
          received: 1,
          total_count: 1,
          expected_on: 1,
          total: 1,
          type: 1,
          total_currency: 1,
          pricing_status: 1,
          last_pricing_date: 1,
          notes: 1,
          ordered_by_name: 1
        }
      },
      {
        $sort: {
          _id: -1
        }
      },
      {
        $skip: (page - 1) * limit
      },
      {
        $limit: limit
      }
    ], async (err, orders) => {
      if (err || orders == null) {
        orders = []
      }
      // const total = orders.length
      // for (const order of orders) {
      //   await instance.inventoryPurchase.findByIdAndUpdate(order._id, { supplier_name: order.supplier_name, service_name: order.service_name }).lean()
      // }
      const total = await instance.inventoryPurchase.countDocuments(query);

      reply.ok({
        total: total,
        page: Math.ceil(total / limit),
        data: orders
      })
    })
  }
  instance.post('/inventory/get_purchase_order/:limit/:page', options.version, (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      get_purchase_order_new_(request, reply, admin)
      // get_purchase_order(request, reply, admin)
    })
  })

  // get purchase order by an id

  var get_purchase_order_by_id = (request, reply, admin) => {
    instance.inventoryPurchase.findOne({
      _id: request.params.id,
      organization: admin.organization
    }, (err, purch) => {
      if (err || purch == null) {
        reply.error('Error on finding purchase order')
        if (err) {
          instance.send_Error('finding purchase order', JSON.stringify(err))
        }
      }
      else {
        instance.purchaseItem.find({
          purchase_id: purch._id
        }, (err, items) => {
          if (err || items == null) {
            items = []
          }
          var pro_ids = []
          for (var t of items) {
            if (t.product_id) {
              pro_ids.push(t.product_id + '')
            }
          }
          instance.services.findOne({
            _id: purch.service
          }, (err, service) => {
            if (service) {
              purch.service_name = service.name
            }
            instance.goodsSales.find({
              _id: {
                $in: pro_ids
              }
            }, { name: 1, sku: 1, barcode: 1, in_stock: 1, item_type: 1, services: 1, cost: 1 }, async (err, goods) => {
              if (err || goods == null) {
                goods = []
              }
              var gObj = {}
              var valid = true
              for (var g of goods) {
                gObj[g._id] = g
                if (g.in_stock == null) {
                  valid = false
                }
              }
              // if(valid == false && request.params.receive === 1){
              //   reply.error('Receive error')
              // }
              // else {
              var purchase_items = []
              for (let i = 0; i < items.length; i++) {
                if (gObj[instance.ObjectId(items[i].product_id)] != undefined) {
                  const current_item = gObj[items[i].product_id]
                  items[i].sku = current_item.sku
                  items[i].cost = current_item.cost
                  let price = current_item.price
                  if (typeof current_item.services == typeof []) {
                    for (const s of current_item.services) {
                      if (purch.service + '' == s.service + '') {
                        price = s.price
                      }
                    }
                  }
                  items[i].price = price
                  items[i].barcode = current_item.barcode
                  if (current_item.item_type != 'variant') {
                    items[i].product_name = current_item.name
                  }
                  else {
                    try {
                      const parent = await instance.goodsSales.findOne({
                        variant_items: {
                          $elemMatch: {
                            $eq: current_item._id
                          }
                        }
                      })
                      if (parent) {
                        items[i].product_name = `${parent.name} ( ${current_item.name} )`
                      }
                    } catch (error) { }
                  }
                }
                if (items[i].received == undefined) {
                  items[i].received = 0
                }
                if (request.params.receive === 1 && items[i].quality > items[i].received) {
                  purchase_items.push(items[i])
                }
                else if (request.params.receive !== 1) {
                  purchase_items.push(items[i])
                }
              }
              var additional_costs = []
              if (purch.additional_cost == undefined) {
                purch.additional_cost = []
              }
              for (var a of purch.additional_cost) {
                if (request.params.receive === 1 && a.is_received === false) {
                  additional_costs.push(a)
                }
                else if (request.params.receive !== 1) {
                  additional_costs.push(a)
                }
              }
              purch.items = purchase_items
              purch.additional_cost = additional_costs
              reply.ok(purch)
              // }
            })
          })
        })
      }
    })
  }

  var handle = (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      get_purchase_order_by_id(request, reply, admin)
    })
  }

  instance.get('/inventory/get_purchase_order/:id', options.version, handle)

  // purchase receive items
  //     // get for receive

  var receive = (request, reply) => {
    request.params.receive = 1
    handle(request, reply)
  }

  instance.get('/inventory/get_purchase_order/:id/receive', options.version, receive)


  // purchase items receive api

  instance.post('/inventory/purchase/receive/:id', options.version, (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      receive_purchase(request, reply, admin)
    })
  })


  // edit purchase 

  // get for edit

  var get_for_edit = (request, reply, admin) => {
    var id = instance.ObjectId(request.params.id)
    instance.inventoryPurchase.aggregate([
      {
        $match: {
          organization: admin.organization,
          _id: id
        }
      },
      {
        $lookup: {
          from: 'inoneservices',
          localField: 'service',
          foreignField: '_id',
          as: 'serviceObj'
        }
      },
      {
        $lookup: {
          from: 'adjustmentsuppliers',
          localField: 'supplier_id',
          foreignField: '_id',
          as: 'supplier'
        }
      },
      {
        $project: {
          items: 0,
          supplier_id: 0
        }
      }
    ], (err, purch) => {
      if (err || purch == null) {
        reply.fourorfour('purchase order')
      }
      else if (purch.length == 0) {
        reply.fourorfour('purchase order')
      }
      else {
        purch = purch[0]

        // show service name
        if (purch.serviceObj.length > 0) {
          purch.service_name = purch.serviceObj[0].name
        }
        delete purch.serviceObj

        // show supplier name
        if (purch.supplier.length > 0) {
          purch.supplier_name = purch.supplier[0].supplier_name
        }
        delete purch.supplier

        id = instance.ObjectId(id)
        instance.purchaseItem.aggregate([
          {
            $match: {
              purchase_id: id
            }
          },
          {
            $lookup: {
              from: 'goodssales',
              localField: 'product_id',
              foreignField: '_id',
              as: 'good'
            }
          },
          {
            $lookup: {
              from: 'purchaseitems',
              let: { product_id: "$product_id" },
              pipeline: [{
                $match: {
                  $expr: {
                    $and: [
                      {
                        $eq: ["$$product_id", "$product_id"]
                      },
                      {
                        $lt: ["$received", "$quality"]
                      }
                    ]
                  }
                }
              }],
              as: 'calculate_incoming'
            }
          }
        ], (err, items) => {
          if (err || items == null) {
            items = []
          }
          // reply.ok(items)
          var split_items = []
          for (var item of items) {
            if (item.good.length > 0) {
              item.product_name = item.good[0].name
              item.product_sku = item.good[0].sku
              item.in_stock = "--"
              for (var s of item.good[0].services) {
                if (s.in_stock && purch.service + "" == s.service + "") {
                  item.in_stock = s.in_stock
                }
              }
            }
            delete item.good

            // calculate incoming
            var incoming = 0

            if (item.calculate_incoming.length > 0) {
              for (var c of item.calculate_incoming) {
                incoming += c.quality - c.received
              }
            }
            delete item.calculate_incoming
            item.incoming = incoming
            split_items.push(JSON.parse(JSON.stringify(item)))
            if (item.received < item.quality && item.received > 0) {
              split_items[split_items.length - 1].in_stock = item.in_stock
              split_items[split_items.length - 1].quality = item.received
              split_items[split_items.length - 1].is_received = true
              split_items[split_items.length - 1].amount = item.received * item.purchase_cost
              item.quality -= item.received
              item.amount = item.quality * item.purchase_cost
              split_items.push(item)
            }
          }
          purch.items = split_items
          reply.ok(purch)
        })
      }
    })
  }

  instance.get('/invenory/purchase/get_for_edit/:id', options.version, (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      get_for_edit(request, reply, admin)
    })
  })


  // edit purchase order

  var edit_purchase = (request, reply, admin) => {
    var id = request.params.id
    if (request.body.purchase_order_date == "") {
      request.body.purchase_order_date = undefined
    }
    instance.inventoryPurchase.findOne({
      _id: id,
      organization: admin.organization
    }, (err, purch) => {
      if (err || purch == null) {
        reply.fourorfour('purchase orders ')
      }
      else {
        instance.purchaseItem.deleteMany({
          purchase_id: id
        }, async () => {
          let currency = { value: 1 };
          try {
            currency = await instance.Currency.findOne({ organization: admin.organization })
            if (!currency || !currency.value) {
              currency = { value: 1 }
            }
          } catch (error) { }
          if (request.body.service != "" && request.body.service != null) {
            purch.service = instance.ObjectId(request.body.service)
          }
          if (request.body.purchase_order_date) {
            purch.purchase_order_date = request.body.purchase_order_date
          }
          if (request.body.expected_on) {
            purch.expected_on = request.body.expected_on
          }
          purch.notes = request.body.notes
          var items = []
          var total = 0, total_count = 0;
          for (var it of request.body.items) {
            if (it.product_id != '' && it.product_id != null) {
              it.product_id = instance.ObjectId(it.product_id)
              it.purchase_id = instance.ObjectId(purch._id)
              it.service = instance.ObjectId(purch.service)
              // it.quality = 0
              if (parseFloat(it.quality)) {
                it.quality = parseFloat(it.quality)
              }
              else {
                it.quality = 0
              }
              // it.purchase_cost = 0
              if (parseFloat(it.purchase_cost)) {
                it.purchase_cost = parseFloat(it.purchase_cost)
              }
              else {
                it.purchase_cost = 0
              }
              it.amount = it.purchase_cost * it.quality
              let item_amount = it.amount
              if (it.purchase_cost_currency == 'usd') {
                item_amount = item_amount * currency.value
              }
              total += item_amount
              total_count += it.quality
              items.push(it)
            }
          }
          purch.additional_cost = []
          for (var add of request.body.additional_cost) {
            let amount = 0
            if (parseFloat(add.amount)) {
              amount += parseFloat(add.amount)
              add.amount = parseFloat(add.amount)
            }
            if (add.amount_currency == 'usd') {
              amount = amount * currency.value
            }
            total += amount
            purch.additional_cost.push(add)
          }
          if (request.body.total_currency == 'usd') {
            total = total / currency.value
          }
          purch.total = total
          purch.total_currency = request.body.total_currency ? request.body.total_currency : 'uzs'
          purch.total_count = total_count
          instance.inventoryPurchase.updateOne(
            { _id: purch._id },
            { $set: purch },
            (err, _) => {
              if (err) {
                reply.error('Error on updating')
                instance.send_Error('updating purchase', JSON.stringify(err))
              }
              else {
                instance.purchaseItem.insertMany(items, (err) => {
                  if (err) {
                    reply.error('Error on saving')
                    instance.send_Error('creating items', JSON.stringify(err))
                  }
                  else {
                    reply.ok()
                  }
                })
              }
            })
        })
      }
    })
  }

  const editPurchaseHandler = (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      edit_purchase(request, reply, admin)
    })
  }

  instance.post('/invenory/purchase/edit/:id', options.version, editPurchaseHandler)
  instance.post('/inventory/purchase/edit/:id', options.version, editPurchaseHandler)

  // get incoming

  var get_incoming = (request, reply, admin) => {
    instance.goodsSales.aggregate([
      {
        $match: {
          organization: admin.organization
        }
      },
      {
        $lookup: {
          from: 'purchaseitems',
          localField: '_id',
          foreignField: 'product_id',
          as: 'item'
        }
      },
      {
        $project: {
          services: 1,
          name: 1,
          barcode: 1,
          sku: 1,
          cost: 1,
          item: 1
        }
      }
    ], (err, goods) => {
      if (err) {
        reply.error('Error on finding')
      }
      else {
        instance.inventoryPurchase.findOne({
          _id: request.body.purchase_id
        }, (err, purch) => {
          if (err || purch == null) {
            reply.error('Error on finding purchase')
            if (err) {
              instance.send_Error('finding purchase', JSON.stringify(err))
            }
          }
          else {
            if (goods == null) {
              goods = []
            }
            var Answer = []
            for (var g of goods) {
              var incoming = 0
              if (g.item.length > 0) {
                for (var it of g.item) {
                  incoming += (it.quality - (it.received + it.cancelled))
                }
              }
              g.item = undefined
              for (var s of g.services) {
                if (s.in_stock && s.service + '' == purch.service + '') {
                  g.in_stock = s.in_stock
                }
              }
              g.services = undefined
              g.incoming = incoming
              Answer.push(g)
            }
            reply.ok(Answer)
          }
        })
      }
    })
  }

  instance.post('/inventory/purchase/get_incoming', options.version, (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      get_incoming(request, reply, admin)
    })
  })


  // cancel purchase items

  var cancel_items = (request, reply, admin) => {
    var id = instance.ObjectId(request.params.id)
    instance.inventoryPurchase.findOne({
      _id: id,
      organization: admin.organization
    }, (err, purch) => {
      if (err || purch == undefined) {
        reply.error('Error on finding purchase')
        if (err) {
          instance.send_Error('finding purchase', JSON.stringify(err))
        }
      }
      else {
        var total = 0.0
        var additional_costs = []
        for (var a of purch.additional_cost) {
          if (a.is_received) {
            additional_costs.push(a)
            total += a.amount
          }
          else {
            a.is_cancelled = true
            additional_costs.push(a)
          }
        }
        instance.purchaseItem.find({
          purchase_id: id
        }, (err, items) => {
          if (err || items == null) {
            items = []
          }
          var new_items = []
          var updating_items = []
          var items2 = JSON.parse(JSON.stringify(items))
          for (var r of items) {
            r.quality = r.received
            r.amount = r.received * r.purchase_cost
            total += r.amount
            updating_items.push(r)
          }
          items = items2
          for (var r of items) {
            if (r.received < r.quality) {
              r._id = undefined
              r.quality -= r.received
              r.cancelled = r.quality
              r.amount = r.quality * r.purchase_cost
              r.is_cancelled = true
              new_items.push(r)
            }
          }
          instance.inventoryPurchase.updateOne({
            _id: id
          }, {
            $set: {
              additional_cost: additional_costs,
              total: total,
              status: 'closed'
            }
          }, (err, _) => {
            if (err) {
              instance.send_Error('updating purchase', JSON.stringify(err))
            }
            for (var it of updating_items) {
              instance.purchaseItem.updateOne({
                _id: it._id
              }, {
                $set: it
              }, (err, _) => {
                if (err) {
                  instance.send_Error('updating purch item', JSON.stringify(err))
                }
              })
            }
            instance.purchaseItem.insertMany(new_items, (err, _) => {
              if (err) {
                instance.send_Error('creating new cancelled items', JSON.stringify(err))
              }
              reply.ok()
            })
          })
        })
      }
    })
  }

  instance.get('/inventory/purchase/cancel_items/:id', options.version, (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      cancel_items(request, reply, admin)
    })
  })

  var get_items = (request, reply, admin) => {
    var query = {
      organization: admin.organization
    }
    if (request.body) {
      if (request.body.indexes) {
        query._id = {
          $in: request.body.indexes
        }
      }
    }
    instance.goodsSales.find(query, {
      name: 1,
      services: 1,
      sku: 1,
      cost: 1
    }, (err, goods) => {
      for (let i = 0; i < goods.length; i++) {
        goods[i].in_stock = '-'
        for (var s of goods[i].services) {
          if (request.body && s.in_stock) {
            if (s.service + '' == request.body.service) {
              goods[i].in_stock = s.in_stock
            }
          }
        }
        goods[i].services = undefined
      }
      reply.ok(goods)
    })
  }

  instance.post('/inventory/get/items', options.version, (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      get_items(request, reply, admin)
    })
  })

  var get_saved_items = (request, reply, admin) => {
    instance.purchaseItem.aggregate([
      {
        $match: {
          purchase_id: instance.ObjectId(request.body.purchase_id)
        }
      },
      {
        $lookup: {
          from: 'goodssales',
          localField: 'product_id',
          foreignField: '_id',
          as: 'good'
        }
      },
      {
        $lookup: {
          from: 'purchaseitems',
          let: { product_id: "$product_id" },
          pipeline: [{
            $match: {
              $expr: {
                $and: [
                  {
                    $eq: ["$service", instance.ObjectId(request.body.service)]
                  },
                  {
                    $eq: ["$$product_id", "$product_id"]
                  },
                  {
                    $lt: ["$received", "$quality"]
                  }
                ]
              }
            }
          }],
          as: 'calculate_incoming'
        }
      }
    ], (err, items) => {
      if (err || items == null) {
        items = []
      }
      var split_items = []
      for (var item of items) {
        item.in_stock = "--"
        if (item.good.length > 0) {
          item.product_name = item.good[0].name,
            item.product_sku = item.good[0].sku
          for (var s of item.good[0].services) {
            if (s.in_stock && s.service + '' == request.body.service + '') {
              item.in_stock = s.in_stock
            }
          }
        }
        delete item.good

        // calculate incoming
        var incoming = 0

        if (item.calculate_incoming.length > 0) {
          for (var c of item.calculate_incoming) {
            incoming += c.quality - c.received
          }
        }
        delete item.calculate_incoming
        item.incoming = incoming
        split_items.push(JSON.parse(JSON.stringify(item)))
        if (item.received > item.quality) {
          split_items[split_items.length - 1].quality = item.received
          split_items[split_items.length - 1].is_received = true
          split_items[split_items.length - 1].amount = item.received * item.purchase_cost
          item.quality -= item.received
          item.amount = item.quality * item.purchase_cost
          split_items.push(item)
        }
      }
      reply.ok(split_items)
    })
  }

  instance.post('/inventory/get/saved/items', options.version, (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      get_saved_items(request, reply, admin)
    })
  })

  next()
})
