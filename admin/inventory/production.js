module.exports = (instance, options, next) => {

  /**
   * Updates done tasks volume & re-calculates KPI.
   * The following conditions must be fulfilled:
   * - a user must be bound to a workgroup (workgroup_id)
   * - a workgroup must be bound to a task (task_id)
   * - a production model has to have items with quantity
   * @param request core fastify request object
   * @param {Production} production production model
   * @returns {Promise<void>}
   */
  const update_done_tasks = async (request, production) => {

    try {

      if (!production || !production.items) {
        return;
      }

      let user = request.user;
      const employee_id = request.body.employee
      if (employee_id) {
        try {
          const employee = await instance.User.findById(employee_id).exec()
          if (employee) {
            user = employee
          }
        }
        catch (err) { }
      }
      if (!user.workgroup_id) {
        return;
      }

      const group = await instance.Workgroup.findById(user.workgroup_id).exec();
      if (!group || !group.task_id) {
        return;
      }

      const executor_id = group._id;
      const executor_type = instance.ExecutorType.WorkGroup;
      const task_id = group.task_id;
      const volume = production.items.reduce((total, item) => total + item.quality, 0);

      instance.log.info(
        'Updating done task. Executor: "%s" of type "%s". Task: "%s". Volume: "%s".',
        executor_id, executor_type, task_id, volume
      );

      await instance.TaskDone.addVolume({
        executor_id,
        executor_type,
        task_id,
        volume,
      });

    } catch (error) {
      instance.log.warn('Could not update done task. Error: %O', error);
    }

  };

  // create production

  var create_production = (request, reply, admin) => {
    var my_var = request.body
    my_var.created_time = new Date().getTime()
    delete my_var._id
    var service_id = instance.ObjectId(request.body.service)
    instance.services.findOne({
      _id: service_id
    }, (err, service) => {
      if (err || service == null) {
        reply.error('error finding service')
        if (err) {
          instance.send_Error('finding service', JSON.stringify(err))
        }
      }
      else {
        var ids = []
        var itemObj = {}
        if (my_var.items == undefined) {
          my_var.items = []
        }
        var valid = true
        for (var item of my_var.items) {
          if (item.product_id != '' && item.product_id != undefined) {
            ids.push(item.product_id)
            if (itemObj[item.product_id] == undefined) {
              itemObj[item.product_id] = item
            }
            else {
              valid = false
            }
          }
        }
        if (!valid) {
          reply.error('multi product')
        }
        else {
          instance.goodsSales.find({
            _id: {
              $in: ids
            }
          }, { name: 1, cost: 1, cost_currency: 1, sku: 1, use_production: 1 }, (err, goods) => {
            if (err || goods == null) {
              goods = []
            }
            var items = []
            for (var g of goods) {
              itemObj[g._id].product_name = g.name
              itemObj[g._id].product_sku = g.sku
              itemObj[g._id].cost = g.cost
              itemObj[g._id].cost_currency = g.cost_currency
              items.push(itemObj[g._id])
            }

            if (!['production', 'disassembly'].includes(request.body.type)) {
              my_var.type = 'production'
            }
            my_var.items = items
            instance.Production.countDocuments({
              organization: admin.organization,
              type: my_var.type
            }, (err, countedProductions) => {
              if (err || countedProductions == undefined) {
                countedProductions = 0
              }
              var p_order = ((my_var.type == 'production') ? 'PR' : 'DS') + (10001 + countedProductions);
              my_var.p_order = p_order
              my_var.organization = admin.organization
              my_var.service = service_id
              my_var.service_name = service.name
              my_var.created_by_id = instance.ObjectId(admin._id)
              my_var.created_by = admin.name
              my_var.date = new Date().getTime()
              var productionModel = instance.Production(my_var)
              productionModel.save(async (err) => {
                if (err) {
                  reply.error('Error on saving')
                  instance.send_Error('creating production', JSON.stringify(err))
                }
                else {

                  await update_done_tasks(request, productionModel);

                  reply.ok({
                    _id: productionModel._id
                  })
                  for (var it of items) {
                    try {
                      let G = await instance.goodsSales.findById(it.product_id);
                      if(!G) {
                        instance.log.error(`Item not found with id -> ${it.product_id}`);
                        continue;
                      }
                      G = G.toObject();
                      G.quality = it.quality;
                      if (G.is_composite_item && G.use_production && G.use_sub_production) {
                        const ids = []
                        if (!(G.composite_items instanceof Array)) {
                          G.composite_items = []
                        }
                        const cItemMap = {}
                        for (const cItem of G.composite_items) {
                          ids.push(cItem.product_id)
                          cItemMap[cItem.product_id] = cItem
                        }
                        const subItems = await instance.goodsSales.find({ _id: { $in: ids } })
                        if (subItems.length > 0) {
                          for (const ind in subItems) {
                            try { subItems[ind] = subItems[ind].toObject() }
                            catch (error) { }
                            subItems[ind].quality = G.quality * cItemMap[subItems[ind]._id].quality;
                          }
                          G = subItems
                        }
                      }
                      if (!(G instanceof Array)) {
                        G = [G]
                      }
                      
                      for (const g of G) {
                        var stock_after = 0
                        for (var s of g.services) {
                          if (s.service + '' == service_id + '') {
                            stock_after = s.in_stock
                          }
                        }
                        var next_stock = my_var.type == 'production' ? +g.quality : ((-1) * (+g.quality))
                        stock_after += next_stock
                        var val1 = `{
                          "$inc": {
                            "services.$[elem].in_stock": ${next_stock}
                          }
                        }`;
                        var val2 = `{
                          "arrayFilters": [
                              {
                                "elem.service": {
                                  "$eq": "${service_id}"
                                }
                              }
                            ]
                        }`;
                        var updateQuery1 = JSON.parse(val1)
                        var updateQuery2 = JSON.parse(val2)
                        try {
                          await instance.goodsSales.updateOne({ _id: g._id }, updateQuery1, updateQuery2);
                          await instance.goodsSales.updateOne({
                            _id: g._id
                          }, {
                            $set: {
                              last_updated: new Date().getTime()
                            }
                          });
                          instance.push_changes(request, 101, service_id);
                          const good = await instance.goodsSales.findOne({
                            _id: g._id
                          });
                          if (good) {
                            await instance.create_inventory_history(admin, 'production', p_order, service_id, g._id, good.cost, next_stock, stock_after, my_var.date)
                            instance.update_composite_items_for_pro(g._id, service_id, (-1) * next_stock, admin, { receipt_no: p_order, date: my_var.date }, 'production')
                          }
                        } catch (error) {
                          instance.log.error(error.message)
                          instance.send_Error('updating product in stock', error.message)
                        }
                      }
                    } catch (error) {
                      instance.log.error(error.message)
                      instance.send_Error('creating production', JSON.stringify(error))
                    }
                  }
                }
              })
            })
          })
        }
      }
    })
  }

  const checkEmployee = async (request, reply, done) => {
    try {
      const employee_id = request.body.employee
      const employee = await instance.User.findById(employee_id).exec()

      if (!employee) {
        return reply.fourorfour('Employee')
      }
      request.body.employee = employee._id
      request.body.employee_name = employee.name
    } catch (error) {
      return reply.fourorfour('Employee')
    }
  }

  instance.post(
    '/inventory/production/create',
    {
      ...options.version,

      preHandler: checkEmployee
    },
    (request, reply) => {
      instance.oauth_admin(request, reply, (admin) => {
        if (admin) { create_production(request, reply, admin) }
      })
    })

  // get production

  var get_pro = (request, reply, admin) => {
    var query = { organization: admin.organization }
    var limit = parseInt(request.params.limit)
    var page = parseInt(request.params.page)
    if (request.body.search != undefined && request.body.search != '') {
      query['$or'] = [
        {
          p_order: {
            $regex: request.body.search
          }
        },
        {
          notes: {
            $regex: request.body.search
          }
        }
      ]
    }
    if (request.body.service != null && request.body.service != '') {
      query.service = instance.ObjectId(request.body.service)
    }
    if (request.body.type != null && request.body.type != '') {
      query.type = request.body.type
    }
    instance.Production.aggregate([
      {
        $match: query
      },
      {
        $sort: {
          _id: -1
        }
      }
    ], (err, res) => {
      if (err || res == null) {
        res = []
      }
      var total = res.length
      res = res.slice(limit * (page - 1), limit * page)
      for (let i = 0; i < res.length; i++) {
        res[i].quality = 0
        if (res[i].items) {
          if (res[i].items.length > 0) {
            res[i].quality = res[i].items.reduce(function (a, b) {
              if (b.quality != undefined) {
                return a + parseFloat(b.quality)
              }
            }, 0)
          }
        }
      }
      reply.ok({
        total: total,
        page: Math.ceil(total / limit),
        data: res
      })
    })
  }

  instance.post('/inventory/production/get_table/:limit/:page', options.version, (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      get_pro(request, reply, admin)
    })
  })

  // get pro by id

  var get_pro_by_id = (request, reply, admin) => {
    if (request.params.id) {
      instance.Production.findOne({
        _id: request.params.id
      }, async (err, pro) => {
        if (pro) {
          if (typeof pro.items != typeof []) {
            pro.items = []
          }
          for (const ind in pro.items) {
            try {
              const item = await instance.goodsSales.findById(pro.items[ind].product_id)
              if (item) {
                pro.items[ind].barcode = item.barcode
                pro.items[ind].sku = item.sku
                pro.items[ind].cost = item.cost
                let price = item.price
                if (typeof item.services == typeof []) {
                  for (const s of item.services) {
                    if (pro.service + '' == s.service + '') {
                      price = s.price
                    }
                  }
                }
                pro.items[ind].price = price
              }
            } catch (error) { }
          }
          reply.ok(pro)
        }
        else {
          reply.error('Error on finding')
        }
      })
    }
    else {
      reply.error('Error on finding')
    }
  }

  instance.get('/inventory/production/get/:id', options.version, (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      get_pro_by_id(request, reply, admin)
    })
  })

  // get items for production

  const get_items = async (request, reply, user) => {
    try {
      const query = {
        organization: user.organization,
        use_production: true
      }
      const search_text = request.body ? request.body.search : ''
      if (typeof search_text == typeof 'invan') {
        query['$or'] = [
          {
            name: { $regex: search_text, $options: 'i' }
          },
          {
            name: { $regex: (instance.converter(search_text) != "" ? instance.converter(search_text) : "salom_dunyo_ishla_qale"), $options: 'i' }
          },
          {
            barcode: { $regex: search_text, $options: 'i' }
          }
        ]
        if (+search_text) {
          query['$or'].push({
            sku: +search_text
          })
        }
      }

      const count_goods = await instance.goodsSales.countDocuments(query)
      const limit = request.params.limit == 'all' ? (count_goods == 0 ? 1 : count_goods) : request.params.limit
      const page = request.params.page
      const goods = await instance.goodsSales.find(query, {
        name: 1,
        sku: 1,
        cost: 1,
        cost_currency: 1
      }).skip(limit * (page - 1)).limit(limit).sort({ _id: 1 });
      return reply.ok(goods)
      // instance.goodsSales.find(query, {
      //   name: 1,
      //   sku: 1,
      //   cost: 1,
      //   cost_currency: 1
      // }, (err, goods) => {
      //   if (err || goods == null) {
      //     goods = []
      //   }
      //   reply.ok(goods)
      // })
    }
    catch (error) {
      return reply.error(error.message)
    }
  }

  const productionItemsHandler = (request, reply) => {
    if (request.validationError) {
      return reply.validation(request.validationError.message)
    }
    instance.oauth_admin(request, reply, (admin) => {
      if (admin) {
        return get_items(request, reply, admin)
      }
    })
  }

  instance.get(
    '/inventory/production/get_items',
    {
      ...options.version,
      preHandler: (request, reply, done) => {
        request.params = {
          limit: 'all',
          page: 1
        }
        request.body = {
          search: ''
        }
        done();
      }
    },
    productionItemsHandler
  )

  instance.post(
    '/inventory/production/get_items/:limit/:page',
    {
      ...options.version,
      schema: {
        params: {
          type: 'object',
          required: ['limit', 'page'],
          properties: {
            limit: { type: 'integer', minimum: 1 },
            page: { type: 'integer', minimum: 1 }
          }
        }
      },
      attachValidation: true
    },
    productionItemsHandler
  )

  next()
}