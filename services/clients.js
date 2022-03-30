
const axios = require('axios')


module.exports = (instance, _, next) => {

  instance.generate('/client', instance.clientsDatabase)

  instance.post('/clients/check', { version: '1.0.0' }, (request, reply) => {
    instance.clientsDatabase.findOne({ user_id: request.body.user_id }, (err, client) => {
      if (err || client == null) {
        reply.ok({
          status: false
        })
      }
      else {
        reply.ok({
          status: true
        })
      }
    })
  })

  instance.post('/clients/create', { version: '1.0.0' }, (request, reply) => {
    if (request.body.phone_number != '' && request.body.phone_number != null &&
      request.body.user_id != '' && request.body.user_id != null) {
      instance.clientsDatabase.findOne({
        user_id: request.body.user_id
      }, (err, userr) => {
        if (request.body.first_name == null) {
          request.body.first_name = ''
        }
        if (request.body.last_name == null) {
          request.body.last_name = ''
        }
        if (err || userr == null) {
          var clientModel = new instance.clientsDatabase({
            user_id: request.body.user_id,
            phone_number: request.body.phone_number,
            first_name: request.body.first_name,
            last_name: request.body.last_name
          })
          clientModel.save((err, _) => {
            if (err) {
              instance.send_Error('client create', JSON.stringify(err))
              reply.ok({
                status: false
              })
            }
            else {
              reply.ok({
                status: true
              })
            }
          })
        }
        else {
          reply.ok({
            status: true
          })
        }
      })
    }
    else {
      reply.ok({
        status: false
      })
    }
  })

  instance.post('/clients/check_qr', { version: '1.0.0' }, (request, reply) => {
    instance.on(request, reply, (user) => {
      instance.clientsDatabase.findOne({
        user_id: request.body.user_id
      }, { __v: 0 }, (err, costumer) => {
        if (err || costumer == null) {
          reply.send({
            statusCode: 404,
            error: "Costumer not found"
          })
        }
        else {
          instance.Receipts.find({
            user_id: costumer.user_id,
            service: request.headers['accept-service']
          }, (err, receipts) => {
            if (err || receipts == null) {
              receipts = []
            }
            costumer.visit_counter = receipts.length
            reply.ok(costumer)
          })
        }
      })
    })
  })

  instance.post('/orders-old/activate_or_reject', { version: '1.0.0' }, (request, reply) => {
    instance.on(request, reply, (user) => {
      instance.orders.findOne({
        _id: request.body.order_id
      }, (err, order) => {
        if (err || order == null) {
          reply.error('Error on finding order')
          if (err) {
            instance.send_Error(request.raw.url, JSON.stringify(err))
          }
        }
        else {
          var status = request.body.is_reject ? 3 : 2
          if (status == 3) {
            axios.get(`https://moynyamnyam.invan.uz/notificate/${order.language}/${order._id}/${status}`)
              .then(() => { }).catch((err) => { }).then(() => { })
            reply.ok()
            instance.order_items.deleteMany({
              order_id: request.body.order_id
            }, (err, _) => {
              if (err) {
                instance.send_Error(request.raw.url, JSON.stringify(err))
              }
              else {
                instance.pushnotification(114, user, request.headers['accept-service'])
                instance.pushnotification(107, user, request.headers['accept-service'])
                instance.orders.deleteOne({ _id: order._id }, (err, _) => {
                  if (err) {
                    instance.send_Error(request.raw.url, JSON.stringify(err))
                  }
                })
              }
            })
          }
          else {
            instance.order_items.find({
              order_id: order._id
            }, (err, order_items) => {
              if (err || order_items == null) {
                order_items = []
              }
              var good_ids = []
              for (var o of order_items) {
                if (o.product_id != undefined) {
                  good_ids.push(o.product_id)
                }
              }
              instance.goodsSales.find({
                _id: { $in: good_ids }
              }, {
                category: 1,
                sold_by: 1
              }, (err, goods) => {
                if (err || goods == null) {
                  goods = []
                }
                var goodObj = {}
                for (var g of goods) {
                  goodObj[g._id] = g
                }
                var newItemDatas = []
                var $ticket_model = new instance.Tickets(
                  Object.assign({
                    organization: user.organization,
                    service: user.service,
                    created_time: new Date().getTime(),
                    opening_time: new Date().getTime(),
                    waiter_id: user._id,
                    waiter_name: user.name,
                    table_id: order.table_id,
                    table_name: order.table_name,
                    is_closed: false,
                    user_id: order.user_id
                  }, order)
                )
                for (var i of order_items) {
                  if (goodObj[i.product_id] != undefined) {
                    newItemDatas.push({
                      organization: i.organization,
                      service: i.service,
                      is_karaoke: goodObj[i.product_id].sold_by == 'karaoke' ? true : false,
                      name: i.product_name,
                      product_id: i.product_id,
                      price: i.price,
                      count: i.count,
                      cost: i.cost,
                      category_id: goodObj[i.product_id].category,
                      created_time: new Date().getTime(),
                      ticket_id: $ticket_model._id
                    })
                  }
                }
                instance.Item_Data.insertMany(newItemDatas, (err, item_datas) => {
                  if (err || item_datas == null) {
                    reply.error('Error on creaing item data')
                  }
                  else {
                    $ticket_model.save((err) => {
                      if (err) {
                        reply.error('Error on saving ticket')
                      }
                      else {
                        instance.Tables.updateOne({
                          _id: $ticket_model.table_id
                        }, {
                          $set: {
                            is_empty: false
                          }
                        }, (err, _) => {
                          if (err) {
                            instance.send_Error(request.raw.url, JSON.stringify(err))
                          }
                        })
                        $ticket_model.item_data = item_datas
                        reply.ok($ticket_model)
                        axios.get(`https://moynyamnyam.invan.uz/notificate/${order.language}/${order._id}/${status}`)
                          .then(() => { }).catch((err) => { }).then(() => { })
                        instance.pushnotification(114, user, user.service)
                        instance.pushnotification(107, user, user.service)
                        instance.order_items.deleteMany({
                          order_id: request.body.order_id
                        }, (err, _) => {
                          if (err) {
                            instance.send_Error(request.raw.url, JSON.stringify(err))
                          }
                          else {
                            instance.orders.deleteOne({ _id: order._id }, (err, _) => {
                              if (err) {
                                instance.send_Error(request.raw.url, JSON.stringify(err))
                              }
                            })
                          }
                        })
                      }
                    })
                  }
                })
              })
            })
          }
        }
      })
    })
  })

  next()
}