module.exports = (instance, options, next) => {

  // create stock adjustment

  function update_goods_cost(item, cost) {
    instance.goodsSales.findOne({
      _id: item.product_id
    }, (_, good) => {
      if (good) {
        var update = {
          cost: cost
        }
        if (good.max_cost < cost|| good.max_cost == 0) {
          update.max_cost = cost
        }
        instance.goodsSales.updateOne({
          _id: item.product_id
        }, {
          $set: update
        }, (err) => {
          if (err) {
            instance.send_Error('updating goods cost', JSON.stringify(err))
          }
        })
      }
    })
  }

  function receive(adjustment, items, user, reply) {
    var time = new Date().getTime()
    adjustment.date = time
    var quality = 0.0
    for (let i = 0; i < items.length; i++) {
      items[i].changed = parseFloat(items[i].changed)
      let new_cost = (items[i].changed * items[i].next_cost + items[i].all_stock * items[i].own_cost) / (items[i].all_stock + items[i].changed)
      items[i].changed = parseInt(items[i].changed)

      quality += items[i].changed
      update_goods_cost(items[i], new_cost)
      instance.update_in_stock_of_sold_items(items[i].product_id, adjustment.service, items[i].changed, user, { receipt_no: adjustment.p_order, date: time }, 'received')
      items[i].cost = items[i].next_cost
    }
    adjustment.quality = quality
    adjustment.save((err) => {
      if (err) {
        reply.error('Error on saving')
        instance.send_Error('creating adjustment', JSON.stringify(err))
      }
      else {
        instance.stockAdjustmentItems.insertMany(items, (err) => {
          if (err) {
            reply.error('Error on creating items')
            instance.send_Error('creating items', JSON.stringify(err))
          }
          else {
            reply.ok({
              _id: adjustment._id
            })
          }
        })
      }
    })
  }

  function recount(adjustment, items, user, reply) {
    var time = new Date().getTime()
    adjustment.date = time
    var quality = 0.0
    for (let i = 0; i < items.length; i++) {
      items[i].changed = parseInt(items[i].changed)
      quality += items[i].changed
      instance.update_in_stock_of_sold_items(items[i].product_id, adjustment.service, items[i].changed - items[i].in_stock, user, { receipt_no: adjustment.p_order, date: time }, 'recounted')
    }
    adjustment.quality = quality
    adjustment.save((err) => {
      if (err) {
        reply.error('Error on saving')
        instance.send_Error('creating adjustment', JSON.stringify(err))
      }
      else {
        instance.stockAdjustmentItems.insertMany(items, (err) => {
          if (err) {
            reply.error('Error on creating items')
            instance.send_Error('creating items', JSON.stringify(err))
          }
          else {
            reply.ok({
              _id: adjustment._id
            })
          }
        })
      }
    })
  }

  function loss_damage(adjustment, items, user, reply) {
    var time = new Date().getTime()
    adjustment.date = time
    var quality = 0.0
    for (let i = 0; i < items.length; i++) {
      items[i].changed = parseFloat(items[i].changed)
      quality += items[i].changed
      let reason = 'fee'
      if (adjustment.reason == 'loss') {
        reason = adjustment.reason
      }
      else if(adjustment.reason == 'damage') {
        reason = adjustment.reason
      }
      instance.update_in_stock_of_sold_items(items[i].product_id, adjustment.service, (-1) * items[i].changed, user, { receipt_no: adjustment.p_order, date: time }, reason)
    }
    adjustment.quality = quality
    adjustment.save((err) => {
      if (err) {
        reply.error('Error on saving')
        instance.send_Error('creating adjustment', JSON.stringify(err))
      }
      else {
        instance.stockAdjustmentItems.insertMany(items, (err) => {
          if (err) {
            reply.error('Error on creating items')
            instance.send_Error('creating items', JSON.stringify(err))
          }
          else {
            reply.ok({
              _id: adjustment._id
            })
          }
        })
      }
    })
  }

  var create_adjustment = (request, reply, admin) => {
    var my_var = request.body
    if (my_var) {
      delete my_var._id
      if (my_var.service) {
        var service = instance.ObjectId(my_var.service)
        instance.services.findOne({
          _id: service
        }, (err, service) => {
          if (err) {
            instance.send_Error('creating adjustment', JSON.stringify(err))
          }
          if (service) {
            my_var.service_name = service.name
            my_var.service = instance.ObjectId(service._id)
            instance.stockAdjustment.find({
              organization: admin.organization
            }, (err, items) => {
              if (err) {
                instance.send_Error('finding adjustment', JSON.stringify(err))
              }
              if (items == null) {
                items = []
              }
              var p_order = 'SA' + ('00' + (items.length + 1001)).slice(-5);
              request.body.p_order = p_order
              request.body.organization = admin.organization
              request.body.adjusted_by = admin.name
              request.body.create_time = new Date().getTime()
              request.body.adjusted_by_id = instance.ObjectId(admin._id)
              var stock_adjustment = new instance.stockAdjustment(request.body)
              var item_ids = []
              if (request.body.items == undefined) {
                request.body.items = []
              }
              var itemObj = {}
              for (var it of request.body.items) {
                item_ids.push(it.product_id)
                itemObj[it.product_id] = it
              }
              instance.goodsSales.find({
                _id: {
                  $in: item_ids
                }
              }, (err, goods) => {
                if (err) {
                  instance.send_Error('finding goods on stock ajd', JSON.stringify(err))
                }
                if (goods == undefined) {
                  goods = []
                }
                items = []
                for (var g of goods) {
                  var in_stock
                  var all_stock = 0
                  for (var s of g.services) {
                    all_stock += s.in_stock
                    if (s.service + '' === service._id + '') {
                      in_stock = s.in_stock
                    }
                  }
                  if (itemObj[g._id] != undefined) {
                    items.push({
                      stock_adjustment_id: instance.ObjectId(stock_adjustment._id),
                      category_id: g.category,
                      category_name: g.category_name,
                      product_id: instance.ObjectId(g._id),
                      product_name: g.name,
                      product_sku: g.sku,
                      changed: itemObj[g._id].changed,
                      stock_after: itemObj[g._id].stock_after,
                      own_cost: g.cost,
                      next_cost: itemObj[g._id].cost,
                      cost_currency: g.cost_currency,
                      in_stock: in_stock,
                      all_stock: all_stock
                    })
                  }
                }
                if (stock_adjustment.reason == 'receive') {
                  receive(stock_adjustment, items, admin, reply)
                }
                else if (stock_adjustment.reason == 'recount') {
                  recount(stock_adjustment, items, admin, reply)
                }
                else {
                  loss_damage(stock_adjustment, items, admin, reply)
                }
              })
            })
          }
          else {
            reply.error('Error on saving')
          }
        })
      }
      else {
        reply.error('Error on saving')
      }
    }
    else {
      reply.error('Error on saving')
    }
  }

  instance.post('/inventory/stock_adjustment/create', options.version, (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      if (admin) {
        create_adjustment(request, reply, admin)
      }
    })
  })

  // get inventory stock adjustment

  var get_adjustment = (request, reply, admin) => {
    var page = parseInt(request.params.page)
    var limit = parseInt(request.params.limit)
    var query = {
      organization: admin.organization
    }
    if (request.body) {
      if (request.body.service != '' && request.body.service != null) {
        query.service = instance.ObjectId(request.body.service)
      }
      if (request.body.reason != '' && request.body.reason != null) {
        query.reason = request.body.reason
      }
      if (request.body.search != '' && request.body.search != null) {
        query['$or'] = [
          {
            p_order: {
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
    }
    instance.stockAdjustment.aggregate([
      {
        $match: query
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
        $sort: {
          _id: -1
        }
      }
    ], (err, stocks) => {
      var total = stocks.length
      stocks = stocks.slice((page - 1) * limit, limit * page)
      for (var i = stocks.length - 1; i >= 0; i--) {
        if (stocks[i].serviceObj.length > 0) {
          stocks[i].service_name = stocks[i].serviceObj[0].name
        }
        stocks[i].serviceObj = undefined
      }
      reply.ok({
        total: total,
        page: Math.ceil(total / limit),
        data: stocks
      })
    })
  }
  // instance.stockAdjustment.find(query, (err, stocks) => {
  //   if(err || stocks == null) {
  //     stocks = []
  //   }
  //   var total = stocks.length
  //   reply.ok({
  //     total: total,
  //     data: stocks.slice((page-1)*limit, limit*page)
  //   })
  // })

  instance.post('/inventory/stock_adjustment/get/:limit/:page', options.version, (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      if (admin) {
        get_adjustment(request, reply, admin)
      }
    })
  })

  // get by id

  var get_adjustment_by_id = (request, reply, admin) => {
    instance.stockAdjustment.aggregate([
      {
        $match: {
          _id: instance.ObjectId(request.params.id)
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
          from: 'users',
          localField: 'adjusted_by_id',
          foreignField: '_id',
          as: 'userObj'
        }
      }
    ], (err, stocks) => {
      if (err || stocks == null) {
        reply.error('Error on finding')
      }
      else {
        if (stocks.length > 0) {
          var stock = stocks[0]
          if (stock.serviceObj.length > 0) {
            stock.service_name = stock.serviceObj[0].name
          }
          stock.serviceObj = undefined
          if (stock.userObj.length > 0) {
            stock.adjusted_by = stock.userObj[0].name
          }
          stock.userObj = undefined
          instance.stockAdjustmentItems.aggregate([
            {
              $match: {
                stock_adjustment_id: instance.ObjectId(request.params.id)
              }
            },
            {
              $lookup: {
                from: 'goodssales',
                localField: 'product_id',
                foreignField: '_id',
                as: 'goodsObj'
              }
            }
          ], async (err, items) => {
            if (err || items == null) {
              items = []
            }
            for (var i = items.length - 1; i >= 0; i--) {
              if (items[i].goodsObj.length > 0) {
                items[i].product_name = items[i].goodsObj[0].name
                items[i].sku = items[i].goodsObj[0].sku
                items[i].product_name = items[i].goodsObj[0].name
                let price = items[i].goodsObj[0].price
                if (typeof items[i].goodsObj[0].services == typeof []) {
                  for (const s of items[i].goodsObj[0].services) {
                    if (s.service + '' == stock.service + '') {
                      price = s.price
                    }
                  }
                }
                items[i].price = price
                if (items[i].goodsObj[0].item_type == 'variant') {
                  try {
                    const parent = await instance.goodsSales.findOne({
                      variant_items: {
                        $elemMatch: {
                          $eq: items[i].goodsObj[0]._id
                        }
                      }
                    })
                    if (parent) {
                      items[i].product_name = `${parent.name} ( ${items[i].product_name} )`
                    }
                  } catch (error) { }
                }
              }
            }
            stock.items = items
            reply.ok(stock)
          })
        }
        else {
          reply.error('Error on finding')
        }
      }
    })
    // instance.stockAdjustment.findOne({
    //   _id: request.params.id
    // }, (err, stock) => {
    //   if(err || stock == null) {
    //     reply.error('Error on finding')
    //   }
    //   else {
    //     instance.stockAdjustmentItems.find({
    //       stock_adjustment_id: instance.ObjectId(request.params.id)
    //     }, (err, items) => {
    //       if(err) {
    //         instance.send_Error('finding items', JSON.stringify(err))
    //       }
    //       if(items == null) {
    //         items = []
    //       }

    //     })
    //   }
    // })
  }

  instance.get('/inventory/stock_adjustment/get/:id', options.version, (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      if (admin) {
        get_adjustment_by_id(request, reply, admin)
      }
    })
  })

  next()
}