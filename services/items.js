const axios = require('axios')
const qs = require('qs');

module.exports = (instance, _, next) => {
  function send_Error(url, error) {
    axios.post(`https://api.telegram.org/bot769464007:AAFjO5cpIsqUMbhG0rTLkQ4dex63fjs1nUM/sendMessage?chat_id=-1001434635647&parse_mode=html&text=<strong>Error</strong> On <b>${url}</b> url :  <i>\n${error}</i>`)
      .then(function (response) { }).catch(function (err) { }).then(function () { })
  }

  var update_in_stock = (request, reply, user) => {
    if(request.body){
      if(request.body.length > 0) {
        var pro_ids = []
        var proObj = {}
        var ready = []
        for(var r of request.body) {
          if(proObj[r._id] == undefined) {
            proObj[r._id] = r.in_stock
            pro_ids.push(r._id)
          }
          else {
            proObj[r._id] += r.in_stock
          }
        }
        var service_id = request.headers['accept-service'];
        var receipt = {
          receipt_no: '',
          date: new Date().getTime()
        }
        for(var id of pro_ids) {
          instance.update_in_stock_of_sold_items(id, service_id, proObj[id], user, receipt, 'item edit',)
          ready.push(5)
          if(ready.length == pro_ids.length) {
            reply.ok()
          }
        }
      }
      else {
        reply.error('Something wrong')
      }
    }
    else {
      reply.error('Something wrong')
    }
  }

  instance.post('/goods/sales/update_in_stock', {version: '1.0.0'}, (request, reply) => {
    instance.authorization(request, reply, (user) => {
      update_in_stock(request, reply, user)
    })
  })

  var on = function(request, reply, next) {
    instance.authorization(request, reply, (user) => {
      next(user)
    })
  }

  instance.post('/goods/get_available_sku', { version: '1.0.0' }, (request, reply) => {
    on(request, reply, (user) => {
      if (user) {
        var service_id = user.service
        if (request.body.service_id != undefined) {
          service_id = request.body.service_id
        }
        instance.goodsSales.find({ organization: user.organization, service: service_id }, { sku: 1 }, (err, goods) => {
          var default_sku = 10000
          if (err) {
            reply.error('Error on finding sku')
          }
          else {
            if (goods == null) {
              goods = []
            }
            goods.sort((a, b) => {
              if (a.sku != undefined && b.sku != undefined) {
                return (a.sku > b.sku) ? 1 : -1
              }
              else {
                return -1
              }
            })
            for (var g of goods) {
              if (default_sku == g.sku) {
                default_sku += 1
              }
            }
            reply.ok(default_sku)
          }
        })
      }
    })
  })

  instance.post('/goods/check_sku', { version: '1.0.0' }, (request, reply) => {
    on(request, reply, (user) => {
      if (user) {
        var service_id = user.service
        if (request.body.service_id != undefined) {
          service_id = request.body.service_id
        }
        instance.goodsSales.find({ organization: user.organization, service: service_id }, { sku: 1 }, (err, goods) => {
          if (err) {
            instance.send_Error('goods sales find', JSON.stringify(err))
            reply.error('Error on finding service')
          }
          else {
            if (goods == null) {
              goods = []
            }
            var A = false
            for (var g of goods) {
              A = A || request.body.sku == g.sku
            }
            reply.ok({
              has_sku: A
            })
          }
        })
      }
    })
  })

  instance.generate('/goods/sales', instance.goodsSales, {
    on: on,
    public_search: true
  })

  instance.generate('/getProducts', instance.Products)

  instance.generate('/tickets', instance.Tickets)

  instance.generate('/item_data', instance.Item_Data)

  instance.generate('/goods/category', instance.goodsCategory, {
    on: on,
    public_search: true
  })

  instance.generate('/goods/section', instance.goodsSection, {
    on: on
  })

  instance.generate('/goods/discount', instance.goodsDiscount, {
    on: on
  })

  instance.generate('/receipts', instance.Receipts, {
    on: on
  })

  var delete_unused_receipt = (request, reply, user) => {
    if (user) {
      var time = new Date().getTime()
      var starting_time = time - time % 86400000
      instance.Receipts.find({
        organization: user.organization,
        service: user.service,
        date: {
          $gte: starting_time
        }
      }, (err, reces) => {
        if (err) {
          reply.error('Access')
        }
        else {
          if (reces == null) {
            reces = []
          }
          var receipt_numbers = []
          var delete_receipts = []
          for (var rec of reces) {
            if (rec.receipt_no != "") {
              if (receipt_numbers.includes(rec.receipt_no)) {
                delete_receipts.push(rec._id)
              }
              else {
                receipt_numbers.push(rec.receipt_no)
              }
            }
          }
          instance.pushnotification(102, { _id: '12345' }, user.service)
          instance.Receipts.deleteMany({ _id: { $in: delete_receipts } }, (err, _) => {
            if (err) {
              instance.send_Error('receipt delete many', JSON.stringify(err))
              reply.error('Error on deleting')
            }
            reply.ok()
          })
        }
      })
    }
    else {
      if (request.headers['accept-user'] == 'admin') {
        reply.status(401).send({
          message: 'Unauthorized'
        })
      }
      else {
        reply.send({
          statusCode: 498,
          error: "Invalid token",
          message: "Invalid token"
        })
      }
    }
  }

  instance.post('/check_receipts', { version: '1.0.0' }, (request, reply) => {
    on(request, reply, (user) => {
      delete_unused_receipt(request, reply, user)
    })
  })

  instance.post('/receipt/debt/update', { version: '1.0.0' }, (request, reply) => {
    on(request, reply, (user) => {
      if (user) {
        instance.Receipts.findOne({ _id: request.body.id }, (err, receipt) => {
          if (err) {
            instance.send_Error('finding receipt', JSON.stringify(err))
            reply.error('Error on finding receipt')
          }
          else {
            if (receipt) {
              receipt.debtData.is_done = request.body.is_done
              instance.Receipts.updateOne({ _id: receipt._id }, { $set: receipt }, (err, _) => {
                if (err) {
                  instance.send_Error('updating receipt', JSON.stringify(err))
                  reply.error('Error on updating')
                }
                else {
                  reply.ok(receipt)
                }
              })
            }
            else {
              reply.error('receipt not found')
            }
          }
        })
      }
      else {
        reply.error("Access")
      }
    })
  })

  /// update in stock on any time

  var update_in_stock_by_time = (request, reply, user) => {
    if (user) {
      var max = request.params.max
      var min = request.params.min
      instance.Receipts.find({
        organization: user.organization,
        service: user.service,
        date: {
          $lte: max,
          $gte: min
        }
      }, (err, receipts) => {
        if (err || receipts == null) {
          receipts = []
        }
        var proObj = {}
        var ids = []
        for (var r of receipts) {
          for (var s of r.sold_item_list) {
            if (proObj[s.product_id] == undefined) {
              proObj[s.product_id] = 0
              ids.push(s.product_id)
            }
            if (r.is_refund == false) {
              proObj[s.product_id] += s.value
            }
            else {
              proObj[s.product_id] -= s.value
            }
          }
        }
        instance.goodsSales.find({
          _id: {
            $in: ids
          }
        }, (err, goods) => {
          if (err || goods == null) {
            goods = []
          }
          var procountObj = {}
          for (var g of goods) {
            if (g.is_composite_item) {
              for (var c of g.composite_items) {
                if (procountObj[c.product_id] == undefined) {
                  procountObj[c.product_id] = 0
                  ids.push(c.product_id)
                }
                procountObj[c.product_id] += parseFloat(c.quality) * proObj[g._id]
              }
            }
            else {
              procountObj[g._id] = proObj[g._id]
            }
          }
          for (var id of ids) {
            if (procountObj[id] != undefined) {
              instance.update_instock(id, procountObj[id] * (-1))
            }
          }
          reply.ok()
        })
      })
    }
    else {
      reply.send({
        statusCode: 498,
        message: 'Wrong token'
      })
    }
  }

  instance.post('/goods/sales/update_in_stock_by_time/:min/:max', {
    version: '1.0.0'
  }, (request, reply) => {
    instance.on(request, reply, (user) => {
      update_in_stock_by_time(request, reply, user)
    })
  })


  instance.post('/delete_ddd', {
    version: '1.0.0'
  }, (req, res) => {
    instance.on(req, res, (user) => {
      instance.goodsSales.find({}, (err, goods) => {
        if (err || goods == null) {
          goods = []
        }
        for (let i = 0; i < goods.length; i++) {
          if (goods[i].is_composite_item) {
            if (goods[i].composite_items == null || goods[i].composite_items == []) {
              goods[i].composite_items = []
              goods[i].is_composite_item = false
            }
            var commm = []
            for (var com of goods[i].composite_items) {
              if (com.quality !== '') {
                com.quality = parseFloat(com.quality)
                commm.push(com)
              }
            }
            goods[i].composite_items = commm
          }
          else {
            goods[i].composite_items = []
          }
          instance.update_instock_equal(goods[i]._id, goods[i])
        }
        res.ok()
      })
    })
  })

  instance.generate('/tables', instance.Tables, {
    on: on
  })

  var Debts = instance.model('Debts', {
    organization: String,
    service: String,
    receipt_id: String,
    phone_number: String,
    name: String,
    is_done: Boolean,
    description: String
  })

  instance.decorate('Debts', Debts)
  instance.generate('/debts', instance.Debts, {
    on: on
  })

  var Gifts = instance.model('Gifts', {
    organization: String,
    service: String,
    comment: String,
    receipt_id: String
  })
  instance.decorate('Gifts', Gifts)
  instance.generate('/gifts', instance.Gifts, {
    on: on
  })

  next()
}