
const TokenGenerator = require('uuid-token-generator')
const fs = require('fs')
const axios = require('axios')
const csvParser = require('csv-parse');
var wrong_token = {
  statusCode: 498,
  error: "Invalid token",
  message: "Invalid token"
}

const tiin_id = '5f4fbc5245f359319e3d2635'

module.exports = (instance, _, next) => {
  var on = (request, reply, next) => {
    instance.authorization(request, reply, (user) => {
      next(user)
    })
  }

  function send_sms_code(sms_code, phone_number, reply) {
    reply.ok({
      phone_number: phone_number
    })
  }

  function send_slack(sms_code, phone_number, reply) {
    axios.post(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage?chat_id=-1001258934534&parse_mode=html&text=${sms_code} is Sms code of ${phone_number}`)
      .then(function (response) { }).catch(function (err) { }).then(function () { })
  }

  function sent_token(name, token) {
    axios.post(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage?chat_id=${TELEGRAMID}&parse_mode=html&text=Token of <b>${name}</b> is <i>${token}</i>`)
      .then(function (response) { }).catch(function (err) { }).then(function () { })
  }

  instance.generate('/admin', instance.Admin)

  instance.post('/fix_base', (request, reply) => {
    reply.ok()
    instance.goodsDiscount.find({}, (err, goods) => {
      if (err || goods == null) {
        goods = []
      }
      for (var g of goods) {
        instance.goodsDiscount.updateOne({ _id: g._id }, { $set: { services: [{ service: g.service }] } },
          (err, _) => {
            if (err) {
              instance.send_Error('updating discount', JSON.stringify(err))
            }
          })
      }
    })
    instance.employees.find({}, (err, employees) => {
      if (err || employees == null) {
        employees = []
      }
      for (var e of employees) {
        instance.employees.updateOne({ _id: e._id }, { $set: { services: [{ service: e.service }] } },
          (err, _) => {
            if (err) {
              instance.send_Error('updating employee', JSON.stringify(err))
            }
          })
      }
    })
    instance.settingsTaxes.find({}, (err, taxes) => {
      if (err || taxes == null) {
        taxes = []
      }
      for (var t of taxes) {
        instance.settingsTaxes.updateOne({ _id: t._id }, { $set: { services: [{ service: t.service }] } },
          (err, _) => {
            if (err) {
              instance.send_Error('updating tax', JSON.stringify(err))
            }
          })
      }
    })
  })

  instance.post('/category_base', { version: '1.0.0' }, (request, reply) => {
    instance.goodsSales.find({}, (err, goods) => {
      if (err || goods == null) {
        goods = []
      }
      for (var g of goods) {
        if (g.category != '' && g.category != null) {
          instance.goodsSales.updateOne({ _id: g._id }, { $set: { category_id: g.category } }, (err, _) => {
            if (err) {
              instance.send_Error('update goods', JSON.stringify(err))
            }
          })
        }
      }
      reply.ok()
    })
  })

  instance.get('/get_organizations', {
    version: '1.0.0'
  }, (request, reply) => {
    instance.organizations.find({}, { name: 1, _id: 1 }, (err, organizations) => {
      if (err) {
        reply.error('Error on finding organizations')
      }
      else {
        if (organizations == null) {
          organizations = []
        }
        reply.ok(organizations)
      }
    })
  })

  instance.post('/admin/register', {
    version: '1.0.0'
  }, (request, reply) => {
    var id = request.body.organization;
    instance.organizations.findOne({
      _id: id
    }, (err, organization) => {
      if (err) {
        reply.error('Error on finding organization')
      } else {
        if (organization) {
          if (organization.inn == request.body.inn) {
            var data = {
              organization: organization._id,
              name: request.body.name,
              phone_number: request.body.phone_number,
              image_url: request.body.image_url
            }
            var Admin_model = new instance.Admin(data)
            instance.Admin.findOne({
              phone_number: data.phone_number
            }, (err, admin) => {
              if (err) {
                reply.error('Error to find Admin')
              } else {
                if (admin) {
                  reply.send({
                    statusCode: 420,
                    message: 'Admin already exist'
                  })
                } else {
                  Admin_model.save((error) => {
                    if (error) {
                      reply.error('Could not save')
                    } else {
                      reply.ok()
                    }
                  })
                }
              }
            })
          } else {
            reply.send({
              statusCode: 421,
              message: 'Does not match'
            })
          }
        } else {
          reply.send({
            statusCode: 404,
            error: "Not found"
          })
        }
      }
    })
  })

  function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
  }

  instance.post('/admin/login', {
    version: '1.0.0'
  }, (request, reply) => {
    var phone_number = request.body.phone_number
    instance.Admin.findOne({
      phone_number: phone_number
    }, (err, admin) => {
      if (err) {
        reply.error('Error occured to find admin')
      } else {
        if (admin) {
          instance.SMS.findOne({
            phone_number: phone_number,
            user: 'admin'
          }, (err, Sms) => {
            if (err) {
              reply.error('Error to find sms code')
            } else {
              var sms_code = getRandomInt(9000) + 1000;
              var timer = new Date().getTime()
              if (Sms) {
                instance.SMS.updateOne({
                  _id: Sms._id
                }, {
                  $set: {
                    sms_code: sms_code,
                    timer: timer
                  }
                }, (err, doc) => {
                  if (err) {
                    reply.error('Error to update sms code')
                  } else {
                    send_slack(sms_code, admin.phone_number, reply)
                    send_sms_code(sms_code, admin.phone_number, reply)
                  }
                })
              } else {
                var model = new instance.SMS({
                  phone_number: phone_number,
                  user: 'admin',
                  sms_code: sms_code,
                  timer: timer
                })
                model.save((error) => {
                  if (error) {
                    reply.error('Error to save sms code')
                  } else {
                    send_slack(sms_code, admin.phone_number, reply)
                    send_sms_code(sms_code, admin.phone_number, reply)
                  }
                })
              }
            }
          })
        } else {
          reply.send({
            statusCode: 404,
            error: 'Admin does not exist'
          })
        }
      }
    })
  })

  instance.post('/admin/login/verify', {
    version: '1.0.0'
  }, (request, reply) => {
    var phone_number = request.body.phone_number
    instance.Admin.findOne({
      phone_number: phone_number
    }, (err, admin) => {
      if (err) {
        reply.error('Error to find admin')
      } else {
        if (admin) {
          instance.SMS.findOne({
            phone_number: phone_number,
            user: 'admin'
          }, (err, Sms) => {
            if (err || Sms == null) {
              reply.error('Error to find sms code')
            } else {
              if (Sms) {
                var timer = new Date().getTime()
                var token = (new TokenGenerator()).generate()
                if (Sms.sms_code == request.body.sms_code && timer - Sms.timer <= 180000) {
                  instance.SMS.deleteOne({
                    _id: Sms._id
                  }, (err, _) => {
                    if (err) {
                      instance.send_Error(request.raw.url, JSON.stringify(err))
                    }
                  })
                  instance.Admin.findOneAndUpdate({
                    _id: admin._id
                  }, {
                    $set: {
                      token: token
                    }
                  }, (err, doc) => {
                    if (err) {
                      reply.error('Error on updating admin')
                    } else {
                      var data = {
                        _id: admin._id,
                        organization: admin.organization,
                        name: admin.name,
                        phone_number: admin.phone_number,
                        image_url: admin.image_url,
                        token: token
                      }
                      sent_token(admin.name, token)
                      reply.ok(data)
                    }
                  })
                } else {
                  reply.error('Timeout or incorrect sms code')
                }
              }
            }
          })
        } else {
          reply.error('Admin does not exist')
        }
      }
    })
  })

  //handler(request, items, reply, request.params.pages, request.params.list)

  var sub_service = (handler = handler, request, items, reply, Taxes = []) => {
    instance.services.findOne({ _id: request.body.service }, (err, service) => {
      if (err) {
        reply.error('Error on finding service')
      }
      else {
        if (service) {
          var receipts = []
          for (var item of items) {
            if (item.is_self == false) {
              item.total_price /= (1 + item.service_value / 100)
            }
            receipts.push(item)
          }
          if (handler.name == 'calculateSalesByItem') {
            handler(request, receipts, reply, Taxes)
          }
          else {
            handler(request, receipts, reply)
          }
        }
        else {
          reply.error('Service not found')
        }
      }
    })
  }

  function sales_by_payment_type(request, reply, user) {
    instance.Receipts.find({
      organization: user.organization,
      service: request.body.service,
      debt_id: null,
      date: {
        $lt: request.params.max,
        $gt: request.params.min
      }
    }, (err, items) => {
      if (err) {
        reply.error('Error')
      } else {
        if (items == null) {
          items = []
        }
        items.sort((a, b) => (a.date > b.date) ? -1 : ((b.date > a.date) ? 1 : 0));
        //cash card gift debt qr_code nfc
        var payment_type = {}
        var names = ['cash', 'card', 'gift', 'debt', 'qr_code', 'nfc', 'online_payment', 'transfer_pay']
        for (const name of names) {
          payment_type[name] = {
            payment_amount: 0,
            refund_amount: 0
          }
        }
        for (const rec of items) {
          for (const pay of rec.payment) {
            if (rec.is_refund == false) {
              if (payment_type[pay.name].payment_transaction) {
                payment_type[pay.name].payment_transaction++
                payment_type[pay.name].payment_amount += pay.value
              } else {
                payment_type[pay.name].payment_transaction = 1
                payment_type[pay.name].payment_amount = pay.value
              }
            } else {
              if (payment_type[pay.name].refund_transaction) {
                payment_type[pay.name].refund_transaction++
                payment_type[pay.name].refund_amount += pay.value
              } else {
                payment_type[pay.name].refund_transaction = 1
                payment_type[pay.name].refund_amount = pay.value
              }
            }
          }
        }
        for (var name of names) {
          payment_type[name].net_amount = payment_type[name].payment_amount - payment_type[name].refund_amount
        }
        reply.ok(payment_type)
      }
    })
  }

  instance.post('/sales_by_payment_type/:min/:max', {
    version: '1.0.0'
  }, (request, reply) => {
    on(request, reply, (user) => {
      sales_by_payment_type(request, reply, user)
    })
  })

  function calculator(items, start_time, end_time, cnt) {
    var result = []
    var dif = (end_time - start_time) / cnt
    var half = dif / 2
    var my = start_time
    var id = 0
    for (let i = 0; i < cnt; i++) {
      my = my + dif
      result.push({
        time: Math.floor(my - half),
        value: 0
      })
      half = 0
    }
    half = dif / 2
    var iter = 0
    while (id < cnt && iter < items.length) {

      if (result[id].time + half < items[iter].time)
        id++

      if (id < cnt && result[id].time + half >= items[iter].time) {
        result[id].value += items[iter].value
        iter++
      }
    }
    return result
  }

  const calculate = (request, items, reply) => {
    var gross_sale = 0.0;
    var refund = 0.0;
    var gifts = 0.0;
    var gift_helper = 0.0;
    var discount = 0.0;
    var service_value = 0.0;
    var cost_of_goods = 0.0;
    var net_sales_array = [];
    var refund_array = []
    var discount_array = []
    var gross_sales_array = []
    var gross_profit_array = []
    var taxes_array = []
    var cost_of_goods_array = []
    var start_time = request.params.min, end_time = request.params.max
    if (items == null) {
      items = []
    }
    items.sort((a, b) => (a.date > b.date) ? 1 : ((b.date > a.date) ? -1 : 0));
    var percent_of_gift = {}
    var giftObj = {}
    for (var re of items) {
      var g = 0.0
      for (var p of re.payment) {
        if (p.name == 'gift') {
          g += p.value
        }
      }
      if (re.total_price != 0) {
        percent_of_gift[re._id] = g / re.total_price
      }
    }
    var ids_for_gift = []
    for (const item of items) {
      if (giftObj[item._id] == undefined) {
        giftObj[item._id] = 0;
        ids_for_gift.push(item._id)
      }
      if (item.is_refund == false) {
        for (const __dis of item.discount) {
          if (__dis != undefined) {
            if (__dis.type != undefined) {
              if (__dis.type == 'percentage') {
                item.total_price = Math.round(item.total_price * 100 / (100 - __dis.value))
                discount += Math.round(__dis.value * item.total_price / 100);
              } else {
                item.total_price += __dis.value
                discount += __dis.value;
              }
            }
          }
        }
      } else {
        for (const __dis of item.discount) {
          if (__dis != undefined) {
            if (__dis.type != undefined) {
              if (__dis.type == 'percentage') {
                item.total_price = Math.round(item.total_price * 100 / (100 - __dis.value))
                discount -= Math.round(__dis.value * item.total_price / 100);
              } else {
                item.total_price += __dis.value
                discount -= __dis.value;
              }
            }
          }
        }
      }
      if (item.is_self == false && item.service_value != undefined) {
        if (item.is_refund == false) {
          service_value += item.total_price * item.service_value / 100.0
        }
        else {
          service_value -= item.total_price * item.service_value / 100.0
        }
      }
      var tax = 0.0
      var cost_of_good = 0.0
      for (var sold_item of item.sold_item_list) {
        if (item.is_refund == false) {
          cost_of_good += sold_item.cost * sold_item.value
        }
        for (var i = sold_item.taxes.length - 1; i >= 0; i--) {
          if (item.is_refund == false) {
            if (sold_item.taxes[i].type == 'include') {
              tax += sold_item.price * sold_item.value * sold_item.taxes[i].tax / 100.0
            }
            else {
              tax += sold_item.price * sold_item.value * sold_item.taxes[i] / (100.0 + sold_item.taxes[i])
            }
          }
          else {
            if (sold_item.taxes[i].type == 'include') {
              tax -= sold_item.price * sold_item.value * sold_item.taxes[i].tax / 100.0
            }
            else {
              tax -= sold_item.price * sold_item.value * sold_item.taxes[i] / (100.0 + sold_item.taxes[i])
            }
          }
        }
      }
      cost_of_goods_array.push({
        value: cost_of_good,
        time: item.date
      })
      taxes_array.push({
        value: tax,
        time: item.date
      })
      //gross sales is gathering in one array

      if (item.is_refund == false) {
        gross_sales_array.push({
          time: item.date,
          value: item.total_price
        })
      }

      //calculate unrefund item
      if (item.is_refund == false) {
        gross_sale += item.total_price;
        var show_total = item.total_price
        if (percent_of_gift[item._id] != undefined) {
          show_total -= item.total_price * percent_of_gift[item._id]
        }
        net_sales_array.push({
          time: item.date,
          value: show_total
        })

        for (const __dis of item.discount) {
          if (__dis.type == 'percentage') {
            //gathering discounts of unrefund items in the array
            discount_array.push({
              time: item.date,
              value: __dis.value * item.total_price / 100
            })
            net_sales_array[net_sales_array.length - 1].value -= __dis.value * item.total_price / 100
          } else {
            discount_array.push({
              time: item.date,
              value: __dis.value
            })
            net_sales_array[net_sales_array.length - 1].value -= __dis.value
          }
        }
      } else {
        //here refund items are found, it is gathering in the array
        refund_array.push({
          time: item.date,
          value: item.total_price
        })
        var show_total = item.total_price
        if (percent_of_gift[item._id] != undefined) {
          show_total += item.total_price * percent_of_gift[item._id]
        }
        net_sales_array.push({
          time: item.date,
          value: -1 * show_total
        })
        refund += item.total_price;
        for (const __dis of item.discount) {
          if (__dis.type == 'percentage') {
            net_sales_array[net_sales_array.length - 1].value += __dis.value * item.total_price / 100
            discount_array.push({
              time: item.date,
              value: __dis.value * item.total_price / 100 * (-1)
            })
          } else {
            net_sales_array[net_sales_array.length - 1].value += __dis.value
            discount_array.push({
              time: item.date,
              value: __dis.value * (-1)
            })
          }
        }
      }

      var current_cost_of_goods = 0

      for (const __saled_item of item.sold_item_list) {
        if (item.is_refund == false) {
          cost_of_goods += __saled_item.cost * __saled_item.value
        }
        else {
          cost_of_goods -= __saled_item.cost * __saled_item.value
        }
        current_cost_of_goods += __saled_item.cost * __saled_item.value
      }
      if (item.is_refund == false) {
        gross_profit_array.push({
          time: item.date,
          value: net_sales_array[net_sales_array.length - 1].value - current_cost_of_goods
        })
      }
      else {
        gross_profit_array.push({
          time: item.date,
          value: net_sales_array[net_sales_array.length - 1].value + current_cost_of_goods
        })
      }

      // calculate gifts
      if (percent_of_gift[item._id] != undefined) {
        gifts += percent_of_gift[item._id] * item.total_price
      }
    }
    start_time = parseInt(request.params.min, 10)
    end_time = parseInt(request.params.max, 10)
    var cnt = 30
    if (request.body.count) {
      cnt = request.body.count
    }
    var net_sales = calculator(net_sales_array, start_time, end_time, cnt)
    var gross_profits = calculator(gross_profit_array, start_time, end_time, cnt)
    var gross_sales = calculator(gross_sales_array, start_time, end_time, cnt)
    var discounts = calculator(discount_array, start_time, end_time, cnt)
    var refunds = calculator(refund_array, start_time, end_time, cnt)
    var cost_of_goods_
    if (cost_of_goods_array.length != 0) {
      cost_of_goods_ = calculator(cost_of_goods_array, start_time, end_time, cnt)
    }
    else {
      cost_of_goods_ = []
      for (var f of net_sales) {
        cost_of_goods_.push({
          value: 0,
          time: f.time
        })
      }
    }
    var taxes_
    if (taxes_array.length != 0) {
      taxes_ = calculator(taxes_array, start_time, end_time, cnt)
    }
    else {
      taxes_ = []
      for (var f of net_sales) {
        taxes_.push({
          value: 0,
          time: f.time
        })
      }
    }
    var net_sale_times = [],
      net_sale_values = [],
      refund_times = [],
      refund_values = [],
      discount_times = [],
      discount_values = [],
      gross_profit_times = [],
      gross_profit_values = [],
      gross_sale_times = [],
      gross_sale_values = [],
      cost_of_goods_values = [],
      cost_of_goods_times = [],
      taxes_values = [],
      taxes_times = []
    for (var item of net_sales) {
      net_sale_times.push(item.time)
      net_sale_values.push(item.value)
    }
    for (var item of refunds) {
      refund_times.push(item.time)
      refund_values.push(item.value)
    }
    for (var item of discounts) {
      discount_times.push(item.time)
      discount_values.push(item.value)
    }
    for (var item of gross_sales) {
      gross_sale_times.push(item.time)
      gross_sale_values.push(item.value)
    }
    for (var item of gross_profits) {
      gross_profit_times.push(item.time)
      gross_profit_values.push(item.value)
    }
    taxes_times = Object.values(gross_profit_times)
    for (var item of taxes_) {
      taxes_values.push(item.value)
    }
    cost_of_goods_times = Object.values(gross_profit_times)
    for (var item of cost_of_goods_) {
      cost_of_goods_values.push(item.value)
    }
    discount += gifts
    var net_sale = gross_sale - (refund + discount);
    var gross_profit = net_sale - cost_of_goods;
    var recepts = items.length;

    if (request.body.page == undefined) {
      reply.ok({
        gross_sale: gross_sale,
        refund: refund,
        discount: discount,
        service_value: service_value,
        cost_of_goods: cost_of_goods,
        net_sale: net_sale,
        gross_profit: gross_profit,
        recepts: recepts,
        net_sale_times: net_sale_times,
        net_sale_values: net_sale_values,
        refund_times: refund_times,
        refund_values: refund_values,
        discount_times: discount_times,
        discount_values: discount_values,
        gross_sale_times: gross_sale_times,
        gross_sale_values: gross_sale_values,
        gross_profit_times: gross_profit_times,
        gross_profit_values: gross_profit_values
      });
    }
    else {
      var summ = 0.0;
      summ += gross_sale_values.reduce((a, b) => a + b, 0)
      summ += net_sale_values.reduce((a, b) => a + b, 0)
      summ += discount_values.reduce((a, b) => a + b, 0)
      summ += refund_values.reduce((a, b) => a + b, 0)
      summ += cost_of_goods_values.reduce((a, b) => a + b, 0)
      if (summ != 0) {
        var page = request.body.page
        var limit = request.body.limit
        refund_times = refund_times.splice(limit * (page - 1), limit)
        refund_values = refund_values.splice(limit * (page - 1), limit)
        net_sale_times = net_sale_times.splice(limit * (page - 1), limit)
        net_sale_values = net_sale_values.splice(limit * (page - 1), limit)
        discount_times = discount_times.splice(limit * (page - 1), limit)
        discount_values = discount_values.splice(limit * (page - 1), limit)
        gross_sale_times = gross_sale_times.splice(limit * (page - 1), limit)
        gross_sale_values = gross_sale_values.splice(limit * (page - 1), limit)
        gross_profit_times = gross_profit_times.splice(limit * (page - 1), limit)
        gross_profit_values = gross_profit_values.splice(limit * (page - 1), limit)
        cost_of_goods_times = cost_of_goods_times.splice(limit * (page - 1), limit)
        cost_of_goods_values = cost_of_goods_values.splice(limit * (page - 1), limit)
        taxes_values = taxes_values.splice(limit * (page - 1), limit)
        taxes_times = taxes_times.splice(limit * (page - 1), limit)
        reply.ok({
          data: {
            net_sale_times: net_sale_times,
            net_sale_values: net_sale_values,
            refund_times: refund_times,
            refund_values: refund_values,
            discount_times: discount_times,
            discount_values: discount_values,
            gross_sale_times: gross_sale_times,
            gross_sale_values: gross_sale_values,
            gross_profit_times: gross_profit_times,
            gross_profit_values: gross_profit_values,
            cost_of_goods_times: cost_of_goods_times,
            cost_of_goods_values: cost_of_goods_values,
            taxes_values: taxes_values,
            taxes_times: taxes_times
          },
          total: cnt
        })
      }
      else {
        reply.ok({
          data: {
            net_sale_times: [],
            net_sale_values: [],
            refund_times: [],
            refund_values: [],
            discount_times: [],
            discount_values: [],
            gross_sale_times: [],
            gross_sale_values: [],
            gross_profit_times: [],
            gross_profit_values: [],
            cost_of_goods_times: [],
            cost_of_goods_values: [],
            taxes_values: [],
            taxes_times: []
          },
          total: 0
        })
      }
    }
  }
  const reports = (request, reply, user, handler = calculate) => {
    if (!user) {
      reply.error('Access')
    } else {
      instance.Receipts.find({
        organization: user.organization,
        service: request.body.service,
        debt_id: null,
        date: {
          $lt: request.params.max,
          $gt: request.params.min
        }
      }, (error, items) => {
        if (error) {
          instance.send_Error('receipt find', JSON.stringify(error))
          reply.error('Items could found')
        } else {
          if (items == null) {
            items = []
          }
          items.sort((a, b) => (a.date > b.date) ? -1 : ((b.date > a.date) ? 1 : 0));
          handler(request, items, reply)
        }
      })
    }
  }
  instance.post('/reports_summary/:min/:max', {
    version: '1.0.0'
  }, (request, reply) => {
    on(request, reply, (user) => {
      reports(request, reply, user)
    })
  })

  // for receipt debts
  const calculate_receipt_debts = (request, reply, receipts, user) => {
    var Ans = []
    var inc = 0
    var inc_id = {}
    for (var r of receipts) {
      var name = 'Waiter'
      if (r.waiter_name != undefined && r.waiter_name != "") {
        name = r.waiter_name
      } else if (r.cashier_name != undefined && r.cashier_name != "") {
        name = r.cashier_name
      }
      if (r.is_refund == false) {
        if (r.debt_id == undefined) {
          Ans.push({
            _id: r._id,
            receipt_no: r.receipt_no,
            given_time: r.date,
            donator: name,
            total: r.total_price,
            is_charged: false,
            receiver: ""
          })
          inc_id[r._id] = inc
          inc++
        }
        else {
          if (inc_id[r.debt_id] != undefined) {
            Ans[inc_id[r.debt_id]].is_charged = true
            Ans[inc_id[r.debt_id]].receiver = name
            Ans[inc_id[r.debt_id]].accepted_time = r.date
          }
        }
      }
      else {
        if (inc_id[r.refund] != undefined) {
          if (Ans[inc_id[r.refund]] != undefined) {
            Ans[inc_id[r.refund]].total -= r.total_price
          }
        }
      }
    }
    var Answer = []
    for (var a of Ans) {
      if (a.total != 0) {
        Answer.push(a)
      }
    }
    Ans = Answer
    var total = Ans.length
    Ans = Ans.splice(request.params.limit * (request.params.page - 1), request.params.limit)
    reply.ok({
      total: total,
      data: Ans
    })
  }

  var find_debts = (request, reply, user, handler = calculate_receipt_debts) => {
    instance.Receipts.find({
      organization: user.organization,
      service: request.body.service,
      $or: [{
        debtData: {
          $ne: null
        }
      }, {
        debt_id: {
          $ne: null
        }
      }],
      date: {
        $gte: request.params.min,
        $lte: request.params.max
      }
    }, (err, receipts) => {
      if (err || receipts == null) {
        receipts = []
      }
      // reply.ok(receipts)
      handler(request, reply, receipts, user)
    })
  }

  instance.post('/reports_receipt_debt/:min/:max/:limit/:page', { version: '1.0.0' }, (request, reply) => {
    on(request, reply, (user) => {
      find_debts(request, reply, user)
    })
  })

  // get refunded debt

  var get_debt = (request, reply, user) => {
    if (user) {
      instance.Receipts.findOne({ _id: request.params.id }, (err, receipt) => {
        if (err || receipt == null) {
          reply.error('Error on finding receipt')
        }
        else {
          var proObj = {}
          var ids = []
          for (var it of receipt.sold_item_list) {
            if (proObj[it.product_id] == undefined) {
              ids.push(it.product_id)
              proObj[it.product_id] = it
            }
            else {
              proObj[it.product_id].value += it.value
            }
          }
          instance.Receipts.find({
            refund: request.params.id
          }, (err, receipts) => {
            if (err || receipts == null) {
              receipts = []
            }
            for (var rr of receipts) {
              for (var it of rr.sold_item_list) {
                proObj[it.product_id].value -= it.value
              }
              receipt.total_price -= rr.total_price
            }
            receipt.sold_item_list = []
            for (var id of ids) {
              if (proObj[id].value > 0) {
                receipt.sold_item_list.push(proObj[id])
              }
            }

            reply.ok(receipt)
          })
        }
      })
    }
    else {
      reply.status(401).send({
        message: 'Unauthorized'
      })
    }
  }

  instance.post('/receipts/get_debt/:id', { version: '1.0.0' }, (request, reply) => {
    on(request, reply, (user) => {
      get_debt(request, reply, user)
    })
  })

  ///// for debts

  var shifts_debts = (request, reply, receipt_debts, total_receipt_debt, user) => {
    instance.Shifts.find({
      organization: user.organization,
      service: request.body.service,
      opening_time: {
        $gte: request.params.min,
        $lte: request.params.max
      }
    }, (err, shifts) => {
      if (err || shifts == null) {
        if (err) {
          instance.send_Error('finding shifts to debts', JSON.stringify(err))
        }
        shifts = []
      }
      var shift_debts = []
      var total_shift_debt = 0.0
      for (var sh of shifts) {
        for (var p of sh.Pays) {
          if (p.type == 'debt') {
            shift_debts.push({
              time: p.time,
              value: p.value,
              comment: p.comment
            })
            total_shift_debt += p.value
          }
        }
      }
      var Answer = {
        total_receipt_debt: total_receipt_debt,
        total_shift_debt: total_shift_debt,
        receipt_debts: receipt_debts,
        shift_debts: shift_debts
      }
      reply.ok(Answer)
    })
  }

  var receipts_debts = (request, reply, user) => {
    instance.Receipts.find({
      organization: user.organization,
      service: request.body.service,
      date: {
        $gte: request.params.min,
        $lte: request.params.max
      },
      debtData: {
        $ne: null
      }
    }, (err, receipts) => {
      if (err || receipts == null) {
        if (err)
          instance.send_Error('finding receipt to debt', JSON.stringify(err))
        receipts = []
      }
      var receipt_debts = []
      var total_receipt_debt = 0.0
      for (var rec of receipts) {
        var dbvalue = 0.0
        for (var p of rec.payment) {
          if (p.name == 'debt') {
            dbvalue += p.value
          }
        }
        var new_debt_data = {
          time: rec.date,
          value: dbvalue,
          phone_number: rec.debtData.phone_number,
          name: rec.debtData.name,
          is_done: rec.debtData.is_done,
        }
        total_receipt_debt += dbvalue
        receipt_debts.push(new_debt_data)
      }
      shifts_debts(request, reply, receipt_debts, total_receipt_debt, user)
    })
  }

  const handle = (request, reply) => {
    on(request, reply, (user) => {
      receipts_debts(request, reply, user)
    })
  }
  instance.post('/reports_debts/:min/:max', { version: '1.0.0' }, handle)

  instance.post('/reports_debts/:min/:max', { version: '1.0.1' }, handle)

  var preprocessing_of_item = (request, items, reply) => {
    var products = []
    var products_index = {}
    var products_id = []
    var ind = 0
    // items.sort((a, b) => (a.date > b.date) ? 1 : ((b.date > a.date) ? -1 : 0));
    var start_time, end_time
    var found_time = true
    var cnt = 30
    if (request.body.count) {
      cnt = request.body.count
    }
    for (const item of items) {
      if (found_time) {
        found_time = false
        start_time = item.date
      }
      end_time = item.date
      if (item.is_refund == false) {
        for (const product of item.sold_item_list) {
          if (products_index[product.product_id]) {
            var index = products_index[product.product_id]
            products[index].total_sold += product.value * product.price
            products[index].items_sold += product.value
            products[index].total_cost += product.value * product.cost
            products[index].solds.push({
              time: item.date,
              value: product.value * product.price
            })
          } else {
            products.push({
              total_sold: product.value * product.price,
              items_sold: product.value,
              total_cost: product.value * product.cost,
              solds: [{
                time: item.date,
                value: product.value * product.price
              }]
            })
            products_index[product.product_id] = ind
            if (product.product_id != '' && product.product_id != undefined && product.product_id.includes('-') == false)
              products_id.push(product.product_id)
            ind++
          }
        }
      } else {
        for (const product of item.sold_item_list) {
          if (products_index[product.product_id]) {
            var index = products_index[product.product_id]
            products[index].total_sold -= product.value * product.price
            products[index].items_sold -= product.value
            products[index].total_cost -= product.value * product.cost
            products[index].solds.push({
              time: item.date,
              value: -1 * product.value * product.price
            })
          } else {
            products.push({
              total_sold: -1 * product.value * product.price,
              items_sold: -1 * product.value,
              total_cost: -1 * product.value * product.cost,
              solds: [{
                time: item.date,
                value: -1 * product.value * product.price
              }]
            })
            products_index[product.product_id] = ind
            if (product.product_id != '' && product.product_id != undefined && product.product_id.includes('-') == false)
              products_id.push(product.product_id)
            ind++
          }
        }
      }
    }
    for (var item of items) {
      if (item.is_refund == false) {
        for (var product of item.sold_item_list) {
          var index = products_index[product.product_id]
          for (const __dis of item.discount) {
            if (__dis.type == 'percentage') {
              if (products[index].discounts == undefined) {
                item.total_price = Math.round(item.total_price * 100 / (100 - __dis.value))
                products[index].discounts = __dis.value * item.total_price / 100;
              } else {
                item, total_price = Math.round(item.total_price * 100 / (100 - __dis.value))
                products[index].discounts += __dis.value * item.total_price / 100;
              }
            } else {
              if (products[index].discounts == undefined) {
                item.total_price += __dis.value
                products[index].discounts = __dis.value;
              }
              else {
                item.total_price += __dis.value
                products[index].discounts += __dis.value;
              }
            }
          }
        }
      } else {
        for (var product of item.sold_item_list) {
          var index = products_index[product.product_id]
          for (const __dis of item.discount) {
            if (__dis.type == 'percentage') {
              if (products[index].discounts == undefined) {
                item.total_price = Math.round(item.total_price * 100 / (100 - __dis.value))
                products[index].discounts = (-1) * __dis.value * item.total_price / 100;
              }
              else {
                item.total_price = Math.round(item.total_price * 100 / (100 - __dis.value))
                products[index].discounts -= __dis.value * item.total_price / 100;
              }
            } else {
              if (products[index].discounts == undefined) {
                item.total_price += __dis.value
                products[index].discounts -= __dis.value;
              }
              else {
                item.total_price += __dis.value
                products[index].discounts -= __dis.value;
              }
            }
          }
        }
      }
    }
    var indexes = []
    for (var item of items) {
      for (var product of item.sold_item_list) {
        var index = products_index[product.product_id]
        indexes.push(index)
        if (products[index] == undefined) {
          if (products[index].discounts == undefined) {
            products[index].discounts = 0
          }
        }
        else if (products[index].discounts == undefined) {
          products[index].discounts = 0
        }
      }
    }
    indexes = [...new Set(indexes)]
    for (var inde of indexes) {
      if (products[inde]) {
        products[inde].net_sales = products[inde].total_sold - products[inde].discounts
      }
    }
    var result = []
    for (const product of products) {
      result.push({
        name: "",
        total_sold: product.total_sold,
        items_sold: product.items_sold,
        total_cost: product.total_cost,
        discount: product.discounts,
        net_sales: (product.net_sales != undefined) ? product.net_sales : 0,
        solds: calculator(product.solds, start_time, end_time, cnt)
      })
    }

    result.sort((a, b) => (a.net_sales < b.net_sales) ? 1 : ((b.net_sales < a.net_sales) ? -1 : 0));
    products_id = [...new Set(products_id)]
    instance.goodsSales.find({
      _id: {
        $in: products_id
      }
    }, (err, goods) => {
      if (err) {
        instance.send_Error('goods sales find', JSON.stringify(err))
        reply.error("Error on finding GoodsID")
      } else {
        if (goods == null) {
          goods = []
        }
        for (const good of goods) {
          result[products_index[good._id]].name = good.name
        }
        var prd = []
        var R = []
        for (var re of result) {
          re.sold_times = []
          re.sold_values = []
          for (var sold of re.solds) {
            re.sold_times.push(sold.time)
            re.sold_values.push(sold.value)
          }
          re.solds = undefined
          R.push(re)
        }
        result = R
        for (const good of result) {
          if (good.name.length > 0)
            prd.push(good)
        }
        var Ans = prd.splice(request.params.limit * (request.params.page - 1), request.params.limit)
        reply.ok(Ans)
      }
    })
  }

  var preprocessing_of_item2 = (request, items, reply) => {
    var ctn = 7;
    if (request.body.count != undefined) {
      ctn = request.body.count
    }
    var sold_times = {}
    var sold_values = {}
    var gsoitem = {}
    var giftoitem = {}
    var countsitem = {}
    var countritem = {}
    var rfoitem = {}
    var cogitem = {}
    var disoitem = {}
    var names = []
    // help to draw
    var start = parseInt(request.params.min)
    var end = parseInt(request.params.max)
    var right = start
    var diff = parseInt((end - start) / ctn / 2)
    var middle = right + diff
    diff *= 2
    var left = start + diff
    if (middle == 1570842000000) {
      middle += diff
      left += diff
    }
    var pro_names = []
    var percent_of_gift = {}


    for (var item of items) {

      // calculate persentage of gift
      var g = 0.0
      for (var p of item.payment) {
        if (p.name == 'gift') {
          g += p.value
        }
      }
      if (item.total_price != 0) {
        percent_of_gift[item._id] = g / item.total_price
      }
      else {
        percent_of_gift[item._id] = 0
      }

      for (var s of item.sold_item_list) {
        // calculating gitf on goods
        if (giftoitem[s.product_name] == undefined) {
          giftoitem[s.product_name] = 0
        }
        giftoitem[s.product_name] += percent_of_gift[item._id] * (s.value * s.price)

        pro_names.push(s.product_name)
        if (sold_values[s.product_name] == undefined) {
          sold_values[s.product_name] = []
        }
        if (sold_times[s.product_name] == undefined) {
          sold_times[s.product_name] = []
        }
      }
    }
    pro_names = [...new Set(pro_names)]
    for (var item of items) {
      // sold times and values
      for (var s of item.sold_item_list) {
        if (sold_times[s.product_name] == undefined) {
          sold_times[s.product_name] = [middle]
        }
        if (sold_values[s.product_name] == undefined) {
          sold_values[s.product_name] = [0]
        }
      }
      while (item.date > left) {
        middle += diff
        left += diff
        for (var nnn of pro_names) {
          sold_times[nnn].push(middle)
          sold_values[nnn].push(0)
        }
      }
      for (var s of item.sold_item_list) {
        var disc = 0.0;
        for (var dic of item.discount) {
          if (dic.type == 'percentage') {
            disc += s.price * s.value * dic.value / 100.0
          }
        }
        if (item.is_refund == false) {
          sold_values[s.product_name][sold_values[s.product_name].length - 1] += (s.price * s.value - s.cost * s.value - disc) * (1 - percent_of_gift[item._id])
        }
        else {
          sold_values[s.product_name][sold_values[s.product_name].length - 1] -= (s.price * s.value - s.cost * s.value - disc) * (1 - percent_of_gift[item._id])
        }
      }
      for (var s of item.sold_item_list) {
        names.push(s.product_name)
        // calculate cost of goods
        if (cogitem[s.product_name] == undefined) {
          cogitem[s.product_name] = 0
        }
        if (item.is_refund == false) {
          cogitem[s.product_name] += s.value * s.cost
        }
        else {
          cogitem[s.product_name] -= s.value * s.cost
        }
        // calculate gross sales and refunds of good
        // also calculate sold and refund items
        if (gsoitem[s.product_name] == undefined) {
          gsoitem[s.product_name] = 0
        }
        if (countsitem[s.product_name] == undefined) {
          countsitem[s.product_name] = 0
        }
        if (rfoitem[s.product_name] == undefined) {
          rfoitem[s.product_name] = 0
        }
        if (countritem[s.product_name] == undefined) {
          countritem[s.product_name] = 0
        }
        if (item.is_refund == false) {
          gsoitem[s.product_name] += s.value * s.price
          countsitem[s.product_name] += s.value
        }
        else {
          rfoitem[s.product_name] += s.value * s.price
          countritem[s.product_name] += s.value
        }
        // calculate discount
        if (disoitem[s.product_name] == undefined) {
          disoitem[s.product_name] = 0
        }
        for (var d of item.discount) {
          if (d.type == 'percentage') {
            if (item.is_refund == false) {
              disoitem[s.product_name] += s.value * s.price * d.value / 100.0
            }
            else {
              disoitem[s.product_name] -= s.value * s.price * d.value / 100.0
            }
          }
        }
      }
      names = [...new Set(names)]
    }
    var data = []
    for (var name of names) {
      data.push({
        name: name,
        total_sold: gsoitem[name],
        items_sold: countsitem[name],
        total_cost: cogitem[name],
        discount: disoitem[name],
        net_sales: gsoitem[name] - rfoitem[name] - disoitem[name] - giftoitem[name],
        Sold_times: sold_times[name],
        Sold_values: sold_values[name],
        sold_times: [],
        sold_values: []
      })
    }
    data.sort((a, b) => (a.net_sales > b.net_sales) ? -1 : ((b.net_sales > a.net_sales) ? 1 : 0));
    var Answer = []
    for (let t = 0; t < 5; t++) {
      if (data.length > t) {
        Answer.push(data[t])
      }
    }
    for (let t = 0; t < ctn; t++) {
      var summ = 0.0;
      for (let gg = 0; gg < Answer.length; gg++) {
        summ += Answer[gg].Sold_values[t]
      }
      if (summ != 0) {
        for (let gg = 0; gg < Answer.length; gg++) {
          if (Answer[gg].Sold_times[t] != null && Answer[gg].Sold_values[t] != null) {
            Answer[gg].sold_times.push(Answer[gg].Sold_times[t])
            Answer[gg].sold_values.push(Answer[gg].Sold_values[t])
          }
        }
      }
    }
    for (let t = 0; t < Answer.length; t++) {
      Answer[t].Sold_times = undefined
      Answer[t].Sold_values = undefined
    }
    reply.ok(Answer)
  }

  var salesbyItem = (request, reply, user, handler = preprocessing_of_item2) => {
    if (!user) {
      reply.error('Access')
    } else {
      instance.Receipts.find({
        organization: user.organization,
        service: request.body.service,
        debt_id: null,
        date: {
          $lt: request.params.max,
          $gt: request.params.min
        }
      }, (error, items) => {
        if (error) {
          instance.send_Error('receipt find', JSON.stringify(error))
          reply.error('Items could found')
        } else {
          if (items == null) {
            items = []
          }
          items.sort((a, b) => (a.date > b.date) ? 1 : ((b.date > a.date) ? -1 : 0));
          // items.sort(compare)
          // sub_service(handler, request, items, reply)
          handler(request, items, reply)
        }
      })
    }
  }
  instance.post('/salesbyItem/:min/:max/:limit/:page', {
    version: '1.0.0'
  }, (request, reply) => {
    on(request, reply, (user) => {
      salesbyItem(request, reply, user)
    })
  })
  ////////////////////////////////

  //###################Sales by Items bottom div######################

  var calculateSalesByItem = (request, items, reply) => {
    var gsoitem = {}
    var countsitem = {}
    var countritem = {}
    var rfoitem = {}
    var cogitem = {}
    var disoitem = {}
    var taxes = {}
    var names = []
    var nameObj = {}
    var giftoitem = {}
    var percent_of_gift = {}
    for (var item of items) {
      // calculate percentage of gift
      var gi = 0.0
      for (var s of item.payment) {
        if (s.name == 'gift') {
          gi += s.value
        }
      }
      if (item.total_price != 0) {
        percent_of_gift[item._id] = gi / item.total_price
      }
      else {
        percent_of_gift[item._id] = 0.0
      }

      for (var s of item.sold_item_list) {
        names.push(s.product_name)
        if (nameObj[s.product_name] == undefined) {
          nameObj[s.product_name] = s.product_id
        }
        // calculate taxes
        if (taxes[s.product_name] == undefined) {
          taxes[s.product_name] = 0
        }
        for (var t of s.taxes) {
          if (item.is_refund == false) {
            if (t.type == 'include') {
              taxes[s.product_name] += s.price * s.value * t.tax / 100.0
            }
            else {
              taxes[s.product_name] += s.price * s.value * t.tax / (100.0 + t.tax)
            }
          }
          else {
            if (t.type == 'include') {
              taxes[s.product_name] -= s.price * s.value * t.tax / 100.0
            }
            else {
              taxes[s.product_name] -= s.price * s.value * t.tax / (100.0 + t.tax)
            }
          }
        }
        // calculate gifts
        if (giftoitem[s.product_name] == undefined) {
          giftoitem[s.product_name] = 0
        }
        if (item.is_refund == false) {
          giftoitem[s.product_name] += percent_of_gift[item._id] * s.price * s.value
        }
        else {
          giftoitem[s.product_name] -= percent_of_gift[item._id] * s.price * s.value
        }

        // calculate cost of goods
        if (cogitem[s.product_name] == undefined) {
          cogitem[s.product_name] = 0
        }
        if (item.is_refund == false) {
          cogitem[s.product_name] += s.value * s.cost
        }
        else {
          cogitem[s.product_name] -= s.value * s.cost
        }
        // calculate gross sales and refunds of good
        // also calculate sold and refund items
        if (gsoitem[s.product_name] == undefined) {
          gsoitem[s.product_name] = 0
        }
        if (countsitem[s.product_name] == undefined) {
          countsitem[s.product_name] = 0
        }
        if (rfoitem[s.product_name] == undefined) {
          rfoitem[s.product_name] = 0
        }
        if (countritem[s.product_name] == undefined) {
          countritem[s.product_name] = 0
        }
        if (item.is_refund == false) {
          gsoitem[s.product_name] += s.value * s.price
          countsitem[s.product_name] += s.value
        }
        else {
          rfoitem[s.product_name] += s.value * s.price
          countritem[s.product_name] += s.value
        }
        // calculate discount
        if (disoitem[s.product_name] == undefined) {
          disoitem[s.product_name] = 0
        }
        for (var d of item.discount) {
          if (d.type == 'percentage') {
            if (item.is_refund == false) {
              disoitem[s.product_name] += s.value * s.price * d.value / 100.0
            }
            else {
              disoitem[s.product_name] -= s.value * s.price * d.value / 100.0
            }
          }
        }
      }
      names = [...new Set(names)]
    }
    var data = []
    for (var name of names) {
      data.push({
        id: nameObj[name],
        name: name,
        gross_sales: gsoitem[name],
        items_sold: countsitem[name],
        refunds: rfoitem[name],
        items_refunded: countritem[name],
        cost_of_goods: cogitem[name],
        discounts: disoitem[name],
        net_sales: gsoitem[name] - rfoitem[name] - disoitem[name] - giftoitem[name],
        gross_profit: gsoitem[name] - rfoitem[name] - disoitem[name] - cogitem[name] - giftoitem[name],
        taxes: taxes[name],
        category: "Other"
      })
    }
    data.sort((a, b) => (a.net_sales > b.net_sales) ? -1 : ((b.net_sales > a.net_sales) ? 1 : 0));
    var total = data.length
    data = data.splice(request.params.pages * (request.params.list - 1), request.params.pages)
    var good_ids = []
    for (var d of data) {
      good_ids.push(d.id)
    }
    instance.goodsSales.find({ _id: { $in: good_ids } }, (err, goods) => {
      if (err || goods == null) {
        goods = []
      }
      var category_ids = []
      var goodObj = {}
      for (var g of goods) {
        goodObj[g._id] = g.category
        category_ids.push(g.category)
      }
      instance.goodsCategory.find({ _id: { $in: category_ids } }, (err, categories) => {
        if (err || categories == null) {
          categories = []
        }
        var categoryObj = {}
        for (var ca of categories) {
          categoryObj[ca._id] = ca.name
        }
        var Answer = []
        for (var d of data) {
          if (d.id != undefined) {
            if (goodObj[d.id] != undefined) {
              if (categoryObj[goodObj[d.id]] != undefined) {
                d.category = categoryObj[goodObj[d.id]]
              }
            }
          }
          Answer.push(d)
        }
        reply.ok({
          total: total,
          data: Answer
        })
      })
    })
  }

  var reportsSalesByItems = (request, reply, user, handler = calculateSalesByItem) => {
    if (!user) {
      reply.error('Access')
    } else {
      instance.Receipts.find({
        organization: user.organization,
        service: request.body.service,
        debt_id: null,
        date: {
          $lt: request.params.max,
          $gt: request.params.min
        }
      }, (error, items) => {
        if (error) {
          instance.send_Error('receipt find', JSON.stringify(error))
          reply.error('Items could found')
        } else {
          if (items == null) {
            items = []
          }
          items.sort((a, b) => (a.date > b.date) ? -1 : ((b.date > a.date) ? 1 : 0));
          // items.sort(compare)
          var taxes = []
          for (var rec of items) {
            for (var item of rec.sold_item_list) {
              taxes = taxes.concat(item.taxes)
              taxes = [...new Set(taxes)]
            }
          }
          handler(request, items, reply)
        }
      })
    }
  }
  instance.post('/reports_sales_by_item/:min/:max/:pages/:list', {
    version: '1.0.0'
  }, (request, reply) => {
    on(request, reply, (user) => {
      reportsSalesByItems(request, reply, user)
    })
  })

  ////////////////////////////////

  var calculate_discounts = (request, items, reply) => {
    var discounts = []
    var discounts_index = {}
    var ind_disc = 0
    for (const item of items) {
      for (const __dis of item.discount) {
        var amount = __dis.value
        var apply = 1
        if (__dis.type == 'percentage') {
          item.total_price = Math.round(item.total_price * 100 / (100 - __dis.value))
          amount *= item.total_price / 100
        }
        if (item.is_refund == true) {
          amount *= -1
          apply = -1
        }
        if (discounts_index[__dis._id] == undefined) {
          discounts_index[__dis._id] = ind_disc
          discounts.push({
            name: __dis.name,
            applied: apply,
            amount: amount
          })
          ind_disc++
        } else {
          var ind = discounts_index[__dis._id]
          discounts[ind].applied += apply
          discounts[ind].amount += amount
        }
      }
    }
    var total = discounts.length
    discounts = discounts.splice(request.params.limit * (request.params.page - 1), request.params.limit)
    reply.ok({
      total: total,
      data: discounts
    })
  }

  var report_of_discounts = (request, reply, user, handler = calculate_discounts) => {
    if (!user) {
      reply.error('Access')
    } else {
      instance.Receipts.find({
        organization: user.organization,
        service: request.body.service,
        debt_id: null,
        date: {
          $lt: request.params.max,
          $gt: request.params.min
        }
      }, (error, items) => {
        if (error) {
          instance.send_Error('receipt find', JSON.stringify(error))
          reply.error('Items could found')
        } else {
          if (items == null) {
            items = []
          }
          items.sort((a, b) => (a.date > b.date) ? -1 : ((b.date > a.date) ? 1 : 0));
          // items.sort(compare)
          sub_service(handler, request, items, reply)
          // handler(request, items, reply)
        }
      })
    }
  }
  instance.post('/report_discounts/:min/:max/:limit/:page', {
    version: '1.0.0'
  }, (request, reply) => {
    on(request, reply, (user) => {
      report_of_discounts(request, reply, user)
    })
  })

  /////////////////////////////////////

  var reports_by_employee = (request, receipts, reply) => {
    var employees = {}
    var set_of_empl = []
    var RR = []
    for (var rec of receipts) {
      if (rec.is_self == false) {
        RR.push(rec)
      }
    }
    receipts = RR
    for (var rec of receipts) {
      var __discount = 0
      for (var dic of rec.discount) {
        if (rec.is_refund) {
          if (dic.type == 'percentage') {
            __discount -= dic.value * rec.total_price / 100
          } else {
            __discount -= dic.value
          }
        } else {
          if (dic.type == 'percentage') {
            __discount += dic.value * rec.total_price / 100
          } else {
            __discount += dic.value
          }
        }
      }
      var User_ID = '12345'
      if (rec.waiter_id != undefined) {
        User_ID = rec.waiter_id
      }
      else if (rec.cashier_id != undefined) {
        User_ID = rec.waiter_id
      }
      if (!employees[User_ID]) {
        employees[User_ID] = {}
        employees[User_ID].refunds = 0
        employees[User_ID].gross_sales = 0
        employees[User_ID].discount = 0
      }
      employees[User_ID].discount += __discount
      set_of_empl.push(User_ID)
      set_of_empl = [...new Set(set_of_empl)]
      if (rec.is_refund) {
        if (employees[rec.cashier_id]) {
          employees[User_ID].refunds += rec.total_price
        } else {
          employees[User_ID].refunds = rec.total_price
        }
      } else {
        if (employees[User_ID]) {
          employees[User_ID].gross_sales += rec.total_price
        } else {
          employees[User_ID].gross_sales = rec.total_price
        }
      }
      if (employees[User_ID].receipts) {
        employees[User_ID].receipts++
      } else {
        employees[User_ID].receipts = 1
      }
      if (employees[User_ID].name == undefined) {
        employees[User_ID].name = rec.cashier_name
      }
    }
    var Answer = []
    for (var id of set_of_empl) {
      employees[id].net_sales = employees[id].gross_sales - (employees[id].refunds + employees[id].discount)
      employees[id].average_sale = employees[id].net_sales / employees[id].receipts
      Answer.push(employees[id])
    }
    var total = Answer.length
    reply.ok({
      total: total,
      data: Answer.splice(request.params.limit * (request.params.page - 1), request.params.limit)
    })
  }

  var reports_by_employee2 = (request, receipts, reply) => {
    var gssales = {}
    var refunds = {}
    var discounts = {}
    var count_receipts = {}
    var names = {}
    var ids = []
    for (var rec of receipts) {
      var ID = '12345';
      if (rec.waiter_id != undefined && rec.waiter_id != '') {
        ID = rec.waiter_id
      }
      else if (rec.cashier_id != undefined && rec.cashier_id != '') {
        ID = rec.cashier_id
      }
      ids.push(ID)
      var name = 'Unknown';
      // calculate discount
      if (discounts[ID] == undefined) {
        discounts[ID] = 0
      }
      for (var dis of rec.discount) {
        if (rec.is_refund == false) {
          if (dis.type == 'percentage') {
            rec.total_price = Math.round(rec.total_price * 100 / (100 - dis.value))
            discounts[ID] += rec.total_price * dis.value / 100.0
          }
          else {
            rec.total_price += dis.value
            discounts[ID] += dis.value
          }
        }
        else {
          if (dis.type == 'percentage') {
            rec.total_price = Math.round(rec.total_price * 100 / (100 - dis.value))
            discounts[ID] -= rec.total_price * dis.value / 100.0
          }
          else {
            rec.total_price += dis.value
            discounts[ID] -= dis.value
          }
        }
      }
      if (rec.waiter_name != undefined && rec.waiter_name != '') {
        name = rec.waiter_name
      }
      else if (rec.cashier_name != undefined && rec.cashier_name != '') {
        name = rec.cashier_name
      }
      names[ID] = name
      // calculate gross sales and refunds
      if (gssales[ID] == undefined) {
        gssales[ID] = 0
      }
      if (refunds[ID] == undefined) {
        refunds[ID] = 0
      }
      if (rec.is_refund == false) {
        gssales[ID] += rec.total_price
      }
      else {
        refunds[ID] += rec.total_price
      }
      // count receipts
      if (count_receipts[ID] == undefined) {
        count_receipts[ID] = 0
      }
      count_receipts[ID] += 1
    }
    ids = [...new Set(ids)]
    var Answer = []
    for (var id of ids) {
      if (id != '12345') {
        Answer.push({
          refunds: refunds[id],
          gross_sales: gssales[id],
          discount: discounts[id],
          receipts: count_receipts[id],
          name: names[id],
          net_sales: (gssales[id] - refunds[id] - discounts[id]),
          average_sale: count_receipts[id] != 0 ? (gssales[id] - refunds[id] - discounts[id]) / count_receipts[id] : 0
        })
      }
    }
    var total = Answer.length
    reply.ok({
      total: total,
      data: Answer.splice(request.params.limit * (request.params.page - 1), request.params.limit)
    })
  }

  var reports2 = (request, reply, user, handler = reports_by_employee2) => {
    if (!user) {
      reply.error('Access')
    } else {
      instance.Receipts.find({
        organization: user.organization,
        service: request.body.service,
        debt_id: null,
        date: {
          $lt: request.params.max,
          $gt: request.params.min
        }
      }, (error, items) => {
        if (error) {
          instance.send_Error('receipt find', JSON.stringify(error))
          reply.error('Items could found')
        } else {
          if (items == null) {
            items = []
          }
          items.sort((a, b) => (a.date > b.date) ? -1 : ((b.date > a.date) ? 1 : 0));
          handler(request, items, reply)
        }
      })
    }
  }

  instance.post('/reports_by_employee/:min/:max/:limit/:page', {
    version: "1.0.0"
  }, (request, reply) => {
    on(request, reply, (user) => {
      reports2(request, reply, user)
    })
  })

  var calculate_taxes = (request, items, reply) => {
    var products = []
    var products_id = []
    var products_index = {}
    var ind = 0
    var net_sale = 0
    for (const item of items) {
      if (item.is_refund == true) {
        net_sale -= item.total_price
        for (const __dis of item.discount) {
          if (__dis.type == 'sum') {
            net_sale += __dis.value
          } else {
            net_sale += __dis.value * item.total_price / 100
          }
        }
      } else {
        net_sale += item.total_price
        for (const __dis of item.discount) {
          if (__dis.type == 'sum') {
            net_sale -= __dis.value
          } else {
            net_sale -= __dis.value * item.total_price / 100
          }
        }
      }
      for (const product of item.sold_item_list) {
        if (products_index[product.product_id] == undefined) {
          products.push(product)
          if (product.product_id != '' && product.product_id != undefined && product.product_id.includes('-') == false)
            products_id.push(product.product_id)
          products_index[product.product_id] = ind
          ind++
        }
      }
    }
    instance.goodsSales.find({
      _id: {
        $in: products_id
      }
    }, (err, goods) => {
      if (err) {
        instance.send_Error('goods sales', JSON.stringify(err))
        reply.error("GoodsSales dont exist")
      } else {
        if (goods) {
          var taxes = []
          var taxes_id = []
          var taxes_index = {}
          var ind_tax = 0
          for (const good of goods) {
            for (const tax of good.taxes) {
              if (taxes_index[tax] == undefined) {
                taxes.push({
                  product: [products[products_index[good._id]]]
                })
                taxes_id.push(tax)
                taxes_index[tax] = ind_tax
                ind_tax++
              } else {
                taxes[taxes_index[tax]].product.push(products[products_index[good._id]])
              }
            }
          }
          instance.settingsTaxes.find({
            _id: {
              $in: taxes_id
            }
          }, (err, taxs) => {
            if (err) {
              reply.error("TAXES dont exist")
            } else {
              if (taxs == null) {
                taxs = []
              }
              var result = []
              var id = 0
              var taxable_sales = 0
              for (const Tax of taxs) {
                result.push({
                  name: Tax.name,
                  taxable_sales: 0,
                  tax_amount: 0
                })
                for (const product of taxes[taxes_index[Tax._id]].product) {
                  result[id].taxable_sales += product.value * product.price
                  taxable_sales += product.value * product.price
                  if (Tax.type == 'include') {
                    result[id].tax_amount += product.price - product.price / (1.0 + Tax.tax / 100.0)
                  } else {
                    result[id].tax_amount += product.price * Tax.tax / 100.0
                  }
                }
                id++
              }
              reply.ok({
                taxable_sales: Math.round(taxable_sales * 100) / 100,
                non_taxable_sales: Math.round((net_sale - taxable_sales) * 100) / 100,
                total_net_sales: Math.round(net_sale * 100) / 100,
                total: result.length,
                taxes: result.splice(request.params.limit * (request.params.page - 1), request.params.limit)
              })
            }
          })
        } else {
          reply.error("Error on finding GoodsSales")
        }
      }
    })
  }
  var report_of_taxes = (request, reply, user, handler = calculate_taxes) => {
    if (!user) {
      reply.error('Access')
    } else {
      instance.Receipts.find({
        organization: user.organization,
        service: request.body.service,
        debt_id: null,
        date: {
          $lt: request.params.max,
          $gt: request.params.min
        }
      }, (error, items) => {
        if (error) {
          instance.send_Error('receipt find', JSON.stringify(error))
          reply.error('Items could found')
        } else {
          if (items == null) {
            items = []
          }
          items.sort((a, b) => (a.date > b.date) ? -1 : ((b.date > a.date) ? 1 : 0));
          // items.sort(compare)
          // sub_service(handler, request, items, reply)
          handler(request, items, reply)
        }
      })
    }
  }
  instance.post('/report_taxes/:min/:max/:limit/:page', {
    version: '1.0.0'
  }, (request, reply) => {
    on(request, reply, (user) => {
      report_of_taxes(request, reply, user)
    })
  })

  var report_receipt_calculate = (request, items, reply) => {
    var pages = request.params.pages
    var list = request.params.list
    // items.sort((a, b) => (a.date > b.date) ? 1 : ((b.date > a.date) ? -1 : 0));
    var id = 0
    var refund = 0
    var new_item = []
    var refund_values = []
    var sales_values = []
    for (const item of items) {
      var User_Name = 'Unknown'
      if (item.waiter_name != undefined && item.waiter_name != "") {
        User_Name = item.waiter_name
      }
      else if (item.cashier_name != undefined && item.cashier_name != "") {
        User_Name = item.cashier_name
      }
      var dis = 1
      if (id >= pages * (list - 1) && id < pages * list) {
        var discount = 0
        for (const __dis of item.discount)
          if (__dis.type == 'percentage') {
            item.total_price = Math.round(item.total_price * 100 / (100 - __dis.value))
            discount += Math.round(__dis.value * item.total_price / 100)
          }
          else {
            item.total_price += __dis.value
            discount += __dis.value;
          }
        discount *= dis
        if (item.is_self == false && item.service_value != undefined) {
          item.total_price += item.total_price * item.service_value / 100.0
        }
        new_item.push({
          // receipt_no: Math.floor(item.receipt_no / 10000) + "-" + item.receipt_no % 10000 + "",
          _id: item._id,
          receipt_no: item.receipt_no,
          date: item.date,
          employee: item.cashier_name,
          customer: "-",
          amount: item.total_price,
          discount: discount,
          total: item.total_price - discount,
          is_refund: item.is_refund
        })
      }
      if (item.is_refund) {
        refund++
        dis = -1
        refund_values.push({
          // receipt_no: Math.floor(item.receipt_no / 10000) + "-" + item.receipt_no % 10000 + "",
          _id: item._id,
          receipt_no: item.receipt_no,
          date: item.date,
          employee: User_Name,
          customer: "-",
          amount: item.total_price,
          discount: discount,
          total: item.total_price - discount,
          is_refund: item.is_refund
        })
      }
      else {
        sales_values.push({
          // receipt_no: Math.floor(item.receipt_no / 10000) + "-" + item.receipt_no % 10000 + "",
          _id: item._id,
          receipt_no: item.receipt_no,
          date: item.date,
          employee: User_Name,
          customer: "-",
          amount: item.total_price,
          discount: discount,
          total: item.total_price - discount,
          is_refund: item.is_refund
        })
      }
      id++
    }
    reply.ok({
      all_receipts: items.length,
      sales: items.length - refund,
      refunds: refund,
      loyalty: 0,
      total_receipts: items.length,
      receipts: new_item,
      total_refund: refund_values.length,
      refund_values: refund_values.splice(pages * (list - 1), pages),
      total_sales: sales_values.length,
      sales_values: sales_values.splice(pages * (list - 1), pages)
    })
  }

  var reports_receipt = (request, reply, user, handler = report_receipt_calculate) => {
    if (!user) {
      reply.error('Access')
    } else {
      instance.Receipts.find({
        organization: user.organization,
        service: request.body.service,
        debt_id: null,
        date: {
          $lte: request.params.max,
          $gte: request.params.min
        }
      }, (error, items) => {
        if (error) {
          instance.send_Error('receipt find', JSON.stringify(error))
          reply.error('Items could found')
        } else {
          if (items == null) {
            items = []
          }
          items.sort((a, b) => (a.date > b.date) ? -1 : ((b.date > a.date) ? 1 : 0));
          // items.sort(compare)
          sub_service(handler, request, items, reply)
          // handler(request, items, reply, request.params.pages, request.params.list)
        }
      })
    }
  }
  instance.post('/report_receipts/:min/:max/:pages/:list', {
    version: '1.0.0'
  }, (request, reply) => {
    on(request, reply, (user) => {
      reports_receipt(request, reply, user)
    })
  })

  // function getRandomInt(max) {
  //   return Math.floor(Math.random() * Math.floor(max));
  // }

  function upload_file(files, user, id, reply) {
    const excel = files['excel']
    var url = './static/' + excel.md5 + excel.name
    var wstream = fs.createWriteStream(url);
    wstream.write(excel.data)
    wstream.end()
    fs.readFile(url, {
      encoding: 'utf-8'
    }, function (err, csvData) {
      if (err) {
        instance.send_Error('upload file', JSON.stringify(err))
      }
      csvParser(csvData, {
        delimiter: ',',
        skip_empty_lines: true
      }, function (err, data) {
        if (err) {
          reply.error('File must be .csv Error on reading file ')
        } else {
          var json_data = convertToJSON(data)
          var colors = ['#E0E0E0', '#F44336', '#E91E63', '#FF9800', '#CDDC39', '#4CAF50', '#2196F3', '#9C27B0']
          var data_to_save = []
          for (var json of json_data) {
            json.organization = user.organization
            json.service = id

            if (json.cost == undefined || json.cost == "") {
              json.cost = "0"
            }
            var replaced = json.cost.replace(/ /g, '');
            replaced = replaced.replace(',', '.')
            json.cost = parseFloat(replaced)

            if (json.price == undefined || json.price == "") {
              json.price = "0"
            }
            replaced = json.price.replace(/ /g, '');
            replaced = replaced.replace(',', '.')
            json.price = parseFloat(json.price)

            if (json.count_by_type == undefined || json.count_by_type == "") {
              json.count_by_type = "0"
            }
            replaced = json.count_by_type.replace(/ /g, '');
            replaced = replaced.replace(',', '.')
            json.count_by_type = parseFloat(json.count_by_type)

            if (json.expire_date == undefined || json.expire_date == "") {
              json.expire_date = "0"
            }
            replaced = json.expire_date.replace(/ /g, '');
            replaced = replaced.replace(',', '.')
            json.expire_date = parseFloat(json.expire_date)

            if (json.reminder == undefined || json.reminder == "") {
              json.reminder = "0"
            }
            replaced = json.reminder.replace(/ /g, '');
            replaced = replaced.replace(',', '.')
            json.reminder = parseFloat(json.reminder)

            if (json.in_stock == undefined || json.in_stock == "") {
              json.in_stock = "0"
            }
            replaced = json.in_stock.replace(/ /g, '');
            replaced = replaced.replace(',', '.')
            json.in_stock = parseFloat(json.in_stock)

            if (json.category == undefined || json.category == null) {
              json.category = ""
            }

            if (json.shape == undefined) {
              json.shape = 'square'
            }

            if (json.sold_by == undefined) {
              json.sold_by = 'each'
            }
            if (json.sold_by != 'each' && json.sold_by != 'list' && json.sold_by != 'weight') {
              json.sold_by = 'each'
            }

            if (json.is_track_stock == undefined) {
              json.is_track_stock = 'true'
            }
            json.is_track_stock = json.is_track_stock[0] == 't' || json.is_track_stock[0] == 'T'

            if (json.is_composite_item == undefined) {
              json.is_composite_item = 'false'
            }
            json.is_composite_item = json.is_composite_item[0] == 't' || json.is_composite_item[0] == 'T'

            if (json.sale_is_avialable == undefined) {
              json.sale_is_avialable = 'true'
            }
            json.sale_is_avialable = json.sale_is_avialable[0] == 't' || json.sale_is_avialable == 'T'

            data_to_save.push(json)
          }
          reply.ok(data_to_save)

          // var db = mongoose.connection;
          // var collection = db.collection('goodssales')
          // collection.insertMany(json_data, (err, result) => {
          //   if (err) {
          //     reply.error('Error on saving data')
          //   } else {
          //     reply.ok(json_data)
          //   }
          // })
        }
      });
    });
  }

  instance.post('/upload_excel/:id', (request, reply) => {
    const files = request.raw.files
    if (files == undefined) {
      reply.error('Not found')
    } else {
      if (request.headers.authorization) {
        var token = request.headers['authorization']
        instance.BOS.findOne({
          token: token
        }, (err, bos) => {
          if (err) {
            reply.error('Error on finding bos')
          } else {
            if (bos) {
              if (files['excel']) {
                upload_file(files, bos, request.params.id, reply)
              } else {
                reply.callNotFound()
              }
            } else {
              instance.Admin.findOne({ token: token }, (err, admin) => {
                if (err) {
                  reply.error('Error on finding admin')
                }
                else {
                  if (admin) {
                    upload_file(files, admin, request.params.id, reply)
                  }
                  else {
                    instance.employees.findOne({
                      token: token
                    }, (err, employer) => {
                      if (err) {
                        reply.error('Error on finding employee')
                      } else {
                        if (employer) {
                          if (files['excel']) {
                            upload_file(files, employer, request.params.id, reply)
                          } else {
                            reply.callNotFound()
                          }
                        } else {
                          if (request.headers['accept-user'] == 'admin') {
                            reply.status(401).send({
                              message: 'Unauthorized'
                            })
                          }
                          else {
                            reply.send(wrong_token)
                          }
                        }
                      }
                    })
                  }
                }
              })
            }
          }
        })
      } else {
        if (request.headers['accept-user'] == 'admin') {
          reply.status(401).send({
            message: 'Unauthorized'
          })
        }
        else {
          reply.send({
            statusCode: 499,
            error: "Token required",
            message: "Token required"
          })
        }
      }
    }
  })

  function return_service_name(str) {
    var s = ''
    var start = false, end = false
    for (let i = 0; i < str.length; i++) {
      if (str[i] == ']') {
        end = true
      }
      if (start && !end) {
        s += str[i]
      }
      if (str[i] == '[') {
        start = true
      }
    }
    return s
  }

  function convertToJSON(array, correct_names) {
    let first = array[0].join()
    let headers = first.split(',');
    if (!(headers instanceof Array)) {
      headers = []
    }
    let errors = []
    let Errors = {
      error: 'ok',
      errors: []
    }

    for (let i = 0; i < 23; i++) {
      if (i < headers.length) {
        if (headers[i] != correct_names[i]) {
          errors.push({
            place: String.fromCharCode(i + 65) + '1',
            Error: headers[i] + " must be " + correct_names[i]
          })
        }
      }
      else {
        errors.push({
          place: String.fromCharCode(i + 65) + '1',
          Error: correct_names[i] + ' Field does not exist'
        })
      }
    }
    if (errors.length > 1) {
      Errors.errors = errors
      return Errors
    }
    else {
      let json_data = [];
      let variant_itemsMap = {}
      let composite_skus = []
      let last_sku;
      let composite_item_datas = {}
      let updating_skus = []
      if (!(array instanceof Array)) {
        array = []
      }

      for (let i = 1, length = array.length; i < length; i++) {
        let myRow = array[i].join();
        let row = myRow.split(',');
        if (!(row instanceof Array)) {
          row = []
        }

        var data = {};
        var serviceObj = {}
        var service_names = []
        for (var j = 0; j < row.length; j++) {
          if (j < 23) {
            data[headers[j]] = row[j];
            if (
              headers[j] == 'sku' || headers[j] == 'cost'
              || headers[j] == 'price' || headers[j] == 'default_purchase_cost'
              || headers[j] == 'composite_sku' || headers[j] == 'composite_quality') {
              data[headers[j]] = parseFloat(data[headers[j]])
              if (Number.isNaN(data[headers[j]])) {
                var val_sku = true
                if (row[11] != null) {
                  if (row[11] == '') {
                    val_sku = false
                  }
                }
                if (headers[j] == 'sku' && val_sku) {
                  errors.push({
                    place: 'A' + (i + 1),
                    Error: "invalid SKU type"
                  })
                }
                else if (headers[j] == 'sku') {
                  data[headers[j]] = '';
                }
                else {
                  data[headers[j]] = 0.0;
                }
              }
              else if (headers[j] == 'sku') {
                updating_skus.push(parseInt(data[headers[j]]))
              }
              else if (headers[j] == 'composite_sku') {
                if (data[headers[j]] != '') {
                  composite_skus.push(parseInt(data[headers[j]]))
                }
              }
            }
            else if (headers[j] == 'track_stock' || headers[j] == 'use_production' || headers[j] == 'composite') {
              var key = 'is_track_stock'
              if (headers[j] == 'use_production') {
                key = 'use_production'
              }
              else if (headers[j] == 'composite') {
                key = 'is_composite_item'
              }
              if (data[headers[j]] == 'Y') {
                data[key] = true
              }
              else {
                data[key] = false
              }
            }
            else if (headers[j] == 'representation') {
              if (typeof data['representation'] == typeof 'invan' && data['representation'] != '') {
                const colors = ['#E0E0E0', '#F44336', '#E91E63', '#FF9800', '#CDDC39', '#4CAF50', '#2196F3', '#9C27B0']
                if (!colors.includes(data['representation'])) {
                  data['representation_type'] = 'image'
                }
              }
              else {
                data['representation_type'] = 'color'
                data['representation'] = '#4CAF50'
              }
              // if (data['representation']) {
              //   if (data['representation'].length > 0) {
              //     if (data['representation'][0] == 'h') {
              //       data['representation_type'] = 'image'
              //     }
              //   }
              // }
            }
            else if (headers[j] == 'category' && data[headers[j]] == "") {
              data[headers[j]] = "Other"
            }
            if (data[headers[j]] !== '' && headers[j] == 'sku') {
              last_sku = data[headers[j]]
            }
          }
          else {
            if (row) {
              while (j < row.length && j < headers.length) {
                if (j % 6 == 5) {
                  service_names.push(return_service_name(headers[j]))
                  serviceObj[return_service_name(headers[j])] = {
                    available: row[j]
                  }
                }
                else if (j % 6 == 0) {
                  if (serviceObj[return_service_name(headers[j])]) {
                    serviceObj[return_service_name(headers[j])].price = row[j]
                  }
                }
                else if (j % 6 == 1) {
                  if (serviceObj[return_service_name(headers[j])]) {
                    let prices = []
                    if (typeof row[j] == typeof 'invan') {
                      const price_str = row[j].split(';')
                      for (const pr in price_str) {
                        if (price_str[pr] != '' && (+price_str[pr] || +price_str[pr] == 0) && pr % 2 == 0) {
                          prices.push({
                            from: +price_str[pr]
                          })
                        }
                        else if (price_str[pr] != '' && (+price_str[pr] || +price_str[pr] == 0) && pr % 2 == 1) {
                          prices[prices.length - 1].price = +price_str[pr]
                        }
                        else {
                          break;
                        }
                      }
                    }
                    let PRICES = []
                    for (const p_ind in prices) {
                      if (p_ind != 0) {
                        if (prices[p_ind].from && prices[p_ind].price) {
                          PRICES.push(prices[p_ind])
                        }
                      }
                      else {
                        PRICES.push(prices[p_ind])
                      }
                    }
                    prices = PRICES
                    serviceObj[return_service_name(headers[j])].prices = prices
                  }
                }
                else if (j % 6 == 2) {
                  if (serviceObj[return_service_name(headers[j])]) {
                    serviceObj[return_service_name(headers[j])].in_stock = row[j]
                  }
                }
                else if (j % 6 == 3) {
                  if (serviceObj[return_service_name(headers[j])]) {
                    serviceObj[return_service_name(headers[j])].low_stock = row[j]
                  }
                }
                else if (j % 6 == 4) {
                  if (serviceObj[return_service_name(headers[j])]) {
                    serviceObj[return_service_name(headers[j])].optimal_stock = row[j]
                  }
                }
                j++;
              }
            }
          }
        }
        if (data['sku'] === '') {
          if (composite_item_datas[last_sku] === undefined) {
            composite_item_datas[last_sku] = []
          }
          var quality = parseFloat(data['composite_quality'])
          var composite_ssku = parseFloat(data['composite_sku'])
          composite_item_datas[last_sku].push({
            sku: composite_ssku,
            quality: quality
          })
          // skus.push(composite_ssku)
        }
        delete data['composite']
        delete data['composite_sku']
        delete data['composite_quality']
        data.serviceObj = serviceObj
        service_names = [...new Set(service_names)]
        data.service_names = service_names
        if (data['sku'] != '') {
          json_data.push(data);
        }
      }

      composite_skus = [...new Set(composite_skus)]
      Errors.errors = errors
      if (errors.length > 0) {
        return Errors
      }
      else {
        var categories = []
        var suppliers = []
        var skus = []
        var sold_by_errors = []
        let variant_errors = []
        const sold_by_types = ['each', 'weight', 'box', 'litre', 'metre', 'pcs']
        for (let l = 0; l < json_data.length; l++) {
          var js = json_data[l]
          if (js.sku != '') {
            skus.push(js.sku)
            if (!sold_by_types.includes(js.sold_by)) {
              json_data[l].sold_by = 'each'
            }
            if (js.option_name1 || js.option_name2 || js.option_name3) {
              json_data[l].item_type = 'item'
            }
            else if (!js.name && (js.option_value1 || js.option_value2 || js.option_value3)) {
              json_data[l].item_type = 'variant'
            }
            else {
              json_data[l].item_type = 'item'
            }
            if (json_data[l].item_type == 'item') {
              if (typeof js.category == typeof 'invan' && js.category.length > 0) {
                categories.push(js.category)
              }
              if (typeof js.supplier == typeof 'invan' && js.supplier.length > 0) {
                suppliers.push(js.supplier)
              }
            }
          }
        }

        const variantOptionsMap = {}
        const optionNameMap = {}
        let variant_option_errors = []
        let last_item_variant_sku;

        for (let i = 0; i < json_data.length; i++) {

          if (json_data[i].item_type == 'item') {
            last_item_variant_sku = json_data[i].sku
          }
          if (!variant_itemsMap[last_item_variant_sku]) {
            variant_itemsMap[last_item_variant_sku] = []
          }
          if (last_item_variant_sku) {
            if (!optionNameMap[last_item_variant_sku]) {
              optionNameMap[last_item_variant_sku] = []
            }
            if (json_data[i].item_type == 'variant') {
              const name = json_data[i].option_value1 + json_data[i].option_value2 + json_data[i].option_value3
              if (optionNameMap[last_item_variant_sku].includes(name)) {
                variant_option_errors.push(i + 2)
              }
              optionNameMap[last_item_variant_sku].push(name)
              if (json_data[i].sku) {
                variant_itemsMap[last_item_variant_sku].push(json_data[i].sku)
              }
            }
          }
          if (!variantOptionsMap[last_item_variant_sku]) {
            variantOptionsMap[last_item_variant_sku] = []
          }

          // v options
          if (json_data[i].option_name1) {
            variantOptionsMap[last_item_variant_sku].push({
              option_name: json_data[i].option_name1,
              option_values: []
            })
          }
          if (json_data[i].option_name2) {
            variantOptionsMap[last_item_variant_sku].push({
              option_name: json_data[i].option_name2,
              option_values: []
            })
            if (variantOptionsMap[last_item_variant_sku] && variantOptionsMap[last_item_variant_sku].length < 2) {
              variant_errors.push('E' + (i + 2))
            }
          }
          if (json_data[i].option_name3) {
            variantOptionsMap[last_item_variant_sku].push({
              option_name: json_data[i].option_name3,
              option_values: []
            })
            if (variantOptionsMap[last_item_variant_sku] && variantOptionsMap[last_item_variant_sku].length < 3) {
              if (json_data[i].option_name2) {
                variant_errors.push('E' + (i + 2))
              }
              else if (json_data[i].option_name1) {
                variant_errors.push('G' + (i + 2))
              }
              else {
                variant_errors.push('E' + (i + 2))
                variant_errors.push('G' + (i + 2))
              }
            }
          }

          // option values

          if (json_data[i].item_type == 'variant') {

            if (json_data[i].option_value1) {
              if (variantOptionsMap[last_item_variant_sku] && variantOptionsMap[last_item_variant_sku].length > 0) {
                variantOptionsMap[last_item_variant_sku][0].option_values.push(json_data[i].option_value1)
              }
              else {
                // if (json_data[i - 1] && json_data[i - 1].item_type == 'item') {
                //   variant_errors.push('E' + (i + 1))
                // }
              }
            }
            else {
              variant_errors.push('F' + (i + 1))
            }

            if (json_data[i].option_value2) {
              if (variantOptionsMap[last_item_variant_sku] && variantOptionsMap[last_item_variant_sku].length > 1) {
                variantOptionsMap[last_item_variant_sku][1].option_values.push(json_data[i].option_value2)
              }
              else if (json_data[i - 1]) {
                if (json_data[i - 1].item_type == 'item' && !json_data[i - 1].option_name2) {
                  variant_errors.push('G' + (i + 1))
                }
              }
            }

            if (json_data[i].option_value3) {
              if (variantOptionsMap[last_item_variant_sku] && variantOptionsMap[last_item_variant_sku].length > 2) {
                variantOptionsMap[last_item_variant_sku][2].option_values.push(json_data[i].option_value3)
              }
              else if (json_data[i - 1]) {
                if (json_data[i - 1].item_type == 'item' && !json_data[i - 1].option_name3) {
                  variant_errors.push('I' + 1)
                }
              }
            }
          }
        }

        variant_errors = [...new Set(variant_errors)]
        variant_option_errors = [...new Set(variant_option_errors)]
        categories = [...new Set(categories)]
        suppliers = [...new Set(suppliers)]
        var set_sku = [...new Set(skus)]
        if (set_sku.length !== skus.length || variant_errors.length > 0 || variant_option_errors.length > 0) {
          var skuObj = {}
          for (let t = 0; t < skus.length; t++) {
            var sku = skus[t]
            if (skuObj[sku] == undefined) {
              skuObj[sku] = ["A" + (t + 2)]
            }
            else {
              skuObj[sku].push("A" + (t + 2))
            }
          }
          for (var sku of set_sku) {
            if (skuObj[sku] && skuObj[sku].length > 1) {
              for (var er of skuObj[sku]) {
                errors.push({
                  place: er,
                  Error: "SKU must be unique"
                })
              }
            }
          }
          for (var sb of sold_by_errors) {
            errors.push({
              place: sb,
              Error: "Sold by type error"
            })
          }

          for (const err of variant_errors) {
            errors.push({
              place: err,
              Error: 'Can not be blank'
            })
          }
          for (const err of variant_option_errors) {
            errors.push({
              place: err,
              Error: 'Row is not unique'
            })
          }

          Errors.errors = errors
          return Errors
        }
        else {
          for (var sb of sold_by_errors) {
            errors.push({
              place: sb,
              Error: "Sold by type error"
            })
          }
          Errors.errors = errors
          if (errors.length > 0) {
            return Errors
          }
          else {
            let response = {
              skus: skus,
              categories: categories,
              suppliers: suppliers,
              data: json_data,
              composite_skus: composite_skus,
              composite_item_datas: composite_item_datas,
              updating_skus: updating_skus,
              variantOptionsMap: variantOptionsMap,
              variant_itemsMap: variant_itemsMap
            }
            return response
          }
        }
      }
    }
  };

  function update_goods_sales(good_id, good) {
    instance.goodsSales.updateOne({ _id: good_id }, { $set: good }, (err, _) => {
      if (err) {
        instance.send_Error('file upload update goods ', JSON.stringify(err))
      }
    })
  }

  function updated_goods_category(cat_id, cat_count) {
    instance.goodsCategory.updateOne({ _id: cat_id }, { $set: { count: cat_count } }, (err, _) => {
      if (err) {
        instance.send_Error('file upload update category', JSON.stringify(err))
      }
    })
  }

  function update_composite_item(sku, composite_item_datas, skuCompObj, admin) {
    var cost = 0.0
    var composite_items = []
    if (typeof composite_item_datas[sku] == typeof []) {
      for (var c of composite_item_datas[sku]) {
        if (c != undefined) {
          if (c.quality) {
            if (parseFloat(c.quality)) {
              c.quality = parseFloat(c.quality)
            }
            else {
              c.quality = 0
            }
          }
          else {
            c.quality = 0
          }
          if (skuCompObj[c.sku + ''] != undefined) {
            composite_items.push({
              product_id: instance.ObjectId(skuCompObj[c.sku]._id),
              quality: c.quality
            })
            cost += c.quality * skuCompObj[c.sku].cost
          }
        }
      }
    }
    var update = {
      is_composite_item: false
    }
    if (composite_items.length > 0) {
      update = {
        is_composite_item: true,
        composite_items: composite_items,
        cost: cost,
        last_updated: new Date().getTime(),
        last_stock_updated: new Date().getTime()
      }
    }
    instance.goodsSales.updateOne({
      sku: sku,
      organization: admin.organization
    }, {
      $set: update
    }, (err) => {
      if (err) {
        instance.send_Error('composite on upload', JSON.stringify(err))
      }
      else {
        instance.push_to_organization(101, admin.organization)
      }
    })
  }

  function update_composite_items(skuObj, skus, composite_item_datas, composite_skus, admin) {
    instance.goodsSales.find({
      organization: admin.organization,
      sku: {
        $in: composite_skus
      }
    }, (err, goods) => {
      var skuCompObj = {}
      for (var g of goods) {
        skuCompObj[g.sku] = g
      }
      for (var sku of skus) {
        if (skuObj[sku]) {
          if (skuObj[sku].is_composite_item) {
            update_composite_item(sku, composite_item_datas, skuCompObj, admin)
          }
        }
      }
    })
  }

  const continueWithItems = async (request, reply, user, url) => {
    try {
      fs.readFile(url, {
        encoding: 'utf-8'
      }, function (err, csvData) {
        if (err || !csvData) {
          instance.send_Error('upload file', JSON.stringify(err))
          if (!err) {
            err = { message: 'Failed' }
          }
          return reply.error(err.message)
        }
        csvParser(csvData, {
          delimiter: ',',
          skip_lines_with_error: true
        }, function (err, data) {
          if (err || typeof data != typeof []) {
            instance.send_Error('uploading excel file', JSON.stringify(err))
            return reply.invalidmediatype()
          }

          // var correct_names = ['sku', 'name', 'category', 'sold_by', 'cost', 'price', 'track_stock', 'in_stock', 'low_stock', 'barcode']
          //// composite	composite_sku	composite_quality
          let correct_names = [
            'sku', 'name', 'category', 'sold_by',
            'option_name1', 'option_value1',
            'option_name2', 'option_value2',
            'option_name3', 'option_value3',
            'price', 'cost', 'barcode', 'count_by_type',
            'barcode_by_type', 'representation', 'composite',
            'composite_sku', 'composite_quality', 'track_stock',
            'use_production', 'supplier', 'default_purchase_cost'
          ]
          let json_data = convertToJSON(data, correct_names)
          if (json_data.error == 'ok') {
            reply.send({
              statusCode: 205,
              errors: json_data.errors
            })
          }
          else {
            if (json_data.data == 0) {
              return reply.error('Nothing to save')
            }
            var service_names = json_data.data[0].service_names
            if (!(service_names instanceof Array)) {
              service_names = []
            }
            const variantOptionsMap = json_data.variantOptionsMap
            instance.services.find({
              organization: user.organization
            }, (err, test_services) => {
              if (test_services == null) {
                test_services = []
              }
              var service_nameObj = {}
              for (var s of test_services) {
                service_nameObj[s.name] = true
              }
              var valid_names = (service_names.length > 0)
              for (var name of service_names) {
                valid_names = valid_names && (service_nameObj[name] ? true : false)
              }
              if (valid_names) {
                var categories = json_data.categories
                var suppliers = json_data.suppliers
                var skus = json_data.skus
                if (!(skus instanceof Array)) {
                  skus = []
                }
                var csv_data = json_data.data

                var composite_skus = json_data.composite_skus
                var updating_skus = json_data.updating_skus
                var composite_item_datas = json_data.composite_item_datas
                instance.goodsCategory.find({
                  "$or": [{ name: { $in: categories } }, { is_other: true }],
                  organization: user.organization
                }, (err, categoriess) => {
                  if (err || categoriess == null) {
                    if (err) {
                      instance.send_Error('finding category', JSON.stringify(err))
                    }
                    categoriess = []
                  }
                  var categoryObj = {}
                  var category_nameObj = {}
                  for (var cat of categoriess) {
                    categoryObj[cat.name] = cat._id
                    category_nameObj[cat._id] = cat.name
                  }
                  let categories_to_save = []
                  for (var cat of categories) {
                    if (categoryObj[cat] == undefined) {
                      categories_to_save.push({
                        organization: user.organization,
                        name: cat,
                        color: '#E0E0E0'
                      })
                    }
                  }
                  var send_result = {}
                  if (categories_to_save.length > 0) {
                    send_result.category_created = categories_to_save.length
                  }
                  instance.adjustmentSupplier.find({
                    supplier_name: {
                      $in: suppliers
                    },
                    organization: user.organization
                  }, (_, supps) => {
                    if (supps == null) {
                      supps = []
                    }
                    var supObj = {}
                    for (var s of supps) {
                      supObj[s.supplier_name] = s
                    }
                    var suppliers_to_save = []
                    for (var n of suppliers) {
                      if (supObj[n] == undefined) {
                        suppliers_to_save.push({
                          supplier_name: n,
                          organization: user.organization
                        })
                      }
                    }
                    if (suppliers_to_save.length > 0) {
                      send_result.supplier_created = suppliers_to_save.length
                    }

                    instance.goodsSales.find({
                      sku: {
                        $in: skus
                      },
                      organization: user.organization
                    }, (err, goods) => {
                      if (err || goods == null) {
                        if (err) {
                          instance.send_Error('finding goods', JSON.stringify(err))
                        }
                        goods = []
                      }

                      if (goods.length > 0) {
                        send_result.goods_updated = goods.length
                      }
                      if (skus.length - goods.length > 0) {
                        send_result.goods_created = skus.length - goods.length
                      }

                      if (request.headers.save == 'false') {
                        reply.ok(send_result)
                      }
                      else {
                        instance.services.find({
                          organization: user.organization
                        }, (_, services) => {
                          if (services == null) {
                            services = []
                          }
                          const servicesNameMap = {}
                          for (const s of services) {
                            servicesNameMap[s.name] = s
                          }
                          var updated_goods = {}
                          var updated_good_ids = []
                          var created_goods = []
                          instance.goodsCategory.insertMany(categories_to_save, (err, CATEG) => {
                            if (err || CATEG == null) {
                              if (err) {
                                instance.send_Error('file upload creating category', JSON.stringify(err))
                              }
                              reply.error('Error on creating category')
                            }
                            else {
                              instance.adjustmentSupplier.insertMany(suppliers_to_save, async (err, suppss) => {
                                if (err || suppss == null) {
                                  if (err) {
                                    instance.send_Error('creating suppliers', JSON.stringify(err))
                                  }
                                  reply.error('Error on creating suppliers')
                                }
                                else {
                                  for (var s of suppss) {
                                    supObj[s.supplier_name] = s
                                  }
                                  for (var cat of CATEG) {
                                    categoryObj[cat.name] = cat._id
                                    category_nameObj[cat._id] = cat.name
                                  }
                                  var skuObj = {}
                                  for (var csv of csv_data) {
                                    skuObj[csv.sku] = csv
                                  }
                                  const ItemBySku = {}

                                  for (let kk = 0; kk < goods.length; kk++) {
                                    let good = goods[kk];
                                    try {
                                      good = good.toObject()
                                    }
                                    catch (error) {
                                      instance.send_Error('to Object', error.message)
                                    }
                                    if (skuObj[good.sku] != undefined) {
                                      good.price = skuObj[good.sku].price
                                      good.cost = skuObj[good.sku].cost
                                      good.in_stock = skuObj[good.sku].in_stock
                                      good.is_track_stock = skuObj[good.sku].is_track_stock
                                      good.use_production = skuObj[good.sku].use_production
                                      good.is_composite_item = skuObj[good.sku].is_composite_item
                                      good.sold_by = skuObj[good.sku].sold_by

                                      const goodOldServicesMap = {}
                                      if (typeof good.services != typeof []) {
                                        good.services = []
                                      }
                                      for (const s of good.services) {
                                        goodOldServicesMap[s.service] = s
                                      }
                                      const file_good_services = []
                                      if (typeof skuObj[good.sku].service_names == typeof []) {
                                        for (const name of skuObj[good.sku].service_names) {
                                          try {
                                            if (skuObj[good.sku].serviceObj[name] && servicesNameMap[name]) {
                                              file_good_services.push(skuObj[good.sku].serviceObj[name])
                                              file_good_services[file_good_services.length - 1].service = servicesNameMap[name]._id
                                              file_good_services[file_good_services.length - 1].service_name = servicesNameMap[name].name
                                              file_good_services[file_good_services.length - 1].available = (skuObj[good.sku].serviceObj[name].available == 'Y') ? true : false
                                              file_good_services[file_good_services.length - 1].price = parseFloat(skuObj[good.sku].serviceObj[name].price) ? parseFloat(skuObj[good.sku].serviceObj[name].price) : 0
                                              file_good_services[file_good_services.length - 1].in_stock = parseFloat(skuObj[good.sku].serviceObj[name].in_stock) ? parseFloat(skuObj[good.sku].serviceObj[name].in_stock) : 0
                                              file_good_services[file_good_services.length - 1].low_stock = parseFloat(skuObj[good.sku].serviceObj[name].low_stock) ? parseFloat(skuObj[good.sku].serviceObj[name].low_stock) : 0
                                              file_good_services[file_good_services.length - 1].optimal_stock = parseFloat(skuObj[good.sku].serviceObj[name].optimal_stock) ? parseFloat(skuObj[good.sku].serviceObj[name].optimal_stock) : 0
                                              file_good_services[file_good_services.length - 1].prices = skuObj[good.sku].serviceObj[name].prices instanceof Array ? skuObj[good.sku].serviceObj[name].prices : []
                                            }
                                          }
                                          catch (err) { }
                                        }
                                      }
                                      good.services = file_good_services

                                      if (typeof skuObj[good.sku].barcode == typeof 'invan' && skuObj[good.sku].barcode.length > 0) {
                                        let barcode = skuObj[good.sku].barcode.split(';')
                                        let barcodes = []
                                        for (const b of barcode) {
                                          if (typeof b == typeof 'invan' && b.length > 0) {
                                            barcodes.push(b)
                                          }
                                        }

                                        if (barcodes.length > 0) {
                                          const tiin_item = await instance.goodsSales.findOne({
                                            organization: tiin_id,
                                            barcode: {
                                              $in: barcodes
                                            }
                                          });
                                          if (tiin_item) {
                                            try {
                                              for (const b of tiin_item.barcode) {
                                                barcodes.push(b);
                                              }
                                            } catch (error) { };
                                            barcodes = [...new Set(barcodes)];
                                          }
                                        }

                                        good.barcode = barcodes
                                      }
                                      else {
                                        good.barcode = []
                                      }
                                      if (typeof skuObj[good.sku].name == typeof 'invan' && skuObj[good.sku].item_type != 'variant') {
                                        good.name = skuObj[good.sku].name
                                      }
                                      else if (skuObj[good.sku].item_type == 'variant') {
                                        let good_name = ''
                                        if (typeof skuObj[good.sku].option_value1 == typeof 'invan' && skuObj[good.sku].option_value1.length > 0) {
                                          good_name += skuObj[good.sku].option_value1
                                        }
                                        if (typeof skuObj[good.sku].option_value2 == typeof 'invan' && skuObj[good.sku].option_value2.length > 0) {
                                          if (good_name.length > 0) {
                                            good_name += ' / '
                                          }
                                          good_name += skuObj[good.sku].option_value2
                                        }
                                        if (typeof skuObj[good.sku].option_value3 == typeof 'invan' && skuObj[good.sku].option_value3.length > 0) {
                                          if (good_name.length > 0) {
                                            good_name += ' / '
                                          }
                                          good_name += skuObj[good.sku].option_value3
                                        }
                                        if (good_name.length > 0) {
                                          good.name = good_name
                                        }
                                      }

                                      good.representation_type = skuObj[good.sku].representation_type ? skuObj[good.sku].representation_type : 'color'
                                      good.representation = skuObj[good.sku].representation;

                                      var NAMES = []
                                      var NAMEOBJ = {}
                                      let org_services = []

                                      const itemServicesMap = {}
                                      if (typeof good.services != typeof []) {
                                        good.services = []
                                      }
                                      for (const s of good.services) {
                                        itemServicesMap[s.service + ''] = s
                                      }
                                      try {
                                        org_services = await instance.services.find({ organization: user.organization })
                                      } catch (error) { }
                                      const item_services = []
                                      for (const s of org_services) {
                                        if (itemServicesMap[s._id + '']) {
                                          item_services.push(itemServicesMap[s._id + ''])
                                        }
                                        else if (goodOldServicesMap[s._id]) {
                                          item_services.push(goodOldServicesMap[s._id])
                                        } else {
                                          item_services.push({
                                            service: s._id,
                                            service_name: s.name,
                                            price: good.price,
                                            price_currency: good.price_currency,
                                            prices: (good.prices instanceof Array) ? good.prices : [],
                                            in_stock: 0
                                          })
                                        }
                                      }
                                      good.services = item_services

                                      for (var s of good.services) {
                                        NAMES.push(s.service_name)
                                        NAMEOBJ[s.service_name] = s
                                      }

                                      if (skuObj[good.sku].serviceObj != undefined) {
                                        good.services = []
                                        for (var NAME of NAMES) {
                                          if (skuObj[good.sku].serviceObj[NAME] != undefined) {
                                            try {
                                              good.services.push(NAMEOBJ[NAME])
                                              good.services[good.services.length - 1].available = (skuObj[good.sku].serviceObj[NAME].available == 'Y') ? true : NAMEOBJ[NAME].available
                                              good.services[good.services.length - 1].price = parseFloat(skuObj[good.sku].serviceObj[NAME].price) ? parseFloat(skuObj[good.sku].serviceObj[NAME].price) : NAMEOBJ[NAME].price
                                              good.services[good.services.length - 1].in_stock = parseFloat(skuObj[good.sku].serviceObj[NAME].in_stock) ? parseFloat(skuObj[good.sku].serviceObj[NAME].in_stock) : NAMEOBJ[NAME].in_stock
                                              good.services[good.services.length - 1].low_stock = parseFloat(skuObj[good.sku].serviceObj[NAME].low_stock) ? parseFloat(skuObj[good.sku].serviceObj[NAME].low_stock) : NAMEOBJ[NAME].low_stock
                                              good.services[good.services.length - 1].optimal_stock = parseFloat(skuObj[good.sku].serviceObj[NAME].optimal_stock) ? parseFloat(skuObj[good.sku].serviceObj[NAME].optimal_stock) : NAMEOBJ[NAME].optimal_stock
                                              good.services[good.services.length - 1].prices = (skuObj[good.sku].serviceObj[NAME].prices instanceof Array) ? skuObj[good.sku].serviceObj[NAME].prices : NAMEOBJ[NAME].prices

                                            }
                                            catch (err) { }
                                          }
                                          else {
                                            good.services.push(NAMEOBJ[NAME])
                                          }
                                        }
                                      }

                                      if (skuObj[good.sku].supplier && supObj[skuObj[good.sku].supplier]) {
                                        good.primary_supplier_id = instance.ObjectId(supObj[skuObj[good.sku].supplier]._id)
                                        good.primary_supplier_name = skuObj[good.sku].supplier
                                        good.default_purchase_cost = skuObj[good.sku].default_purchase_cost
                                      }
                                      if (good.category != categoryObj[skuObj[good.sku].category]) {
                                        good.category = categoryObj[skuObj[good.sku].category]
                                        if (categoryObj[skuObj[good.sku].category] != '' && categoryObj[skuObj[good.sku].category] != null) {
                                          good.category_id = instance.ObjectId(categoryObj[skuObj[good.sku].category])
                                        }
                                        good.category_name = skuObj[good.sku].category
                                      }
                                      else {
                                        good.category_name = skuObj[good.sku].category
                                      }

                                      if (skuObj[good.sku].count_by_type && +skuObj[good.sku].count_by_type) {
                                        good.count_by_type = +skuObj[good.sku].count_by_type
                                      }
                                      if (typeof skuObj[good.sku].barcode_by_type === 'string' && skuObj[good.sku].barcode_by_type.length > 0) {
                                        good.barcode_by_type = skuObj[good.sku].barcode_by_type
                                      }
                                      skuObj[good.sku] = undefined
                                    }
                                    updated_good_ids.push(good._id)
                                    good.last_updated = new Date().getTime()
                                    good.last_stock_updated = new Date().getTime()

                                    updated_goods[good._id] = good

                                    ItemBySku[good.sku] = good
                                  }

                                  for (var csv of csv_data) {
                                    if (skuObj[csv.sku] != undefined) {

                                      if (typeof csv.barcode == typeof 'invan' && csv.barcode.length > 0) {
                                        let barcode = csv.barcode.split(';');

                                        let barcodes = []
                                        for (const b of barcode) {
                                          if (typeof b == typeof 'invan' && b.length > 0) {
                                            barcodes.push(b)
                                          }
                                        };
                                        if (barcodes.length > 0) {
                                          const tiin_item = await instance.goodsSales.findOne({
                                            organization: tiin_id,
                                            barcode: {
                                              $in: barcodes
                                            }
                                          });
                                          if (tiin_item) {
                                            try {
                                              for (const b of tiin_item.barcode) {
                                                barcodes.push(b);
                                              }
                                            } catch (error) { };
                                            barcodes = [...new Set(barcodes)];
                                          }
                                        }

                                        csv.barcode = barcodes
                                      }
                                      else {
                                        csv.barcode = []
                                      }

                                      csv.services = []
                                      for (var s of services) {
                                        if (csv.serviceObj[s.name] != undefined) {
                                          var available = false
                                          if (csv.serviceObj[s.name].available == 'Y') {
                                            available = true
                                          }
                                          var price = 0,
                                            in_stock = 0,
                                            low_stock = 0,
                                            optimal_stock = 0
                                          if (parseFloat(csv.serviceObj[s.name].in_stock)) {
                                            in_stock = parseFloat(csv.serviceObj[s.name].in_stock)
                                          }
                                          if (parseFloat(csv.serviceObj[s.name].low_stock)) {
                                            low_stock = parseFloat(csv.serviceObj[s.name].low_stock)
                                          }
                                          if (parseFloat(csv.serviceObj[s.name].optimal_stock)) {
                                            optimal_stock = parseFloat(csv.serviceObj[s.name].optimal_stock)
                                          }
                                          if (parseFloat(csv.serviceObj[s.name].price)) {
                                            price = parseFloat(csv.serviceObj[s.name].price)
                                          }
                                          let prices = []
                                          prices = (s.prices instanceof Array) ? s.prices : []
                                          csv.services.push({
                                            available: available,
                                            price: price,
                                            prices: prices,
                                            service: instance.ObjectId(s._id),
                                            service_name: s.name,
                                            in_stock: in_stock,
                                            low_stock: low_stock,
                                            optimal_stock: optimal_stock
                                          })
                                        }
                                      }
                                      delete csv.serviceObj
                                      delete csv.service_names
                                      csv.category_name = csv.category + ""

                                      if (skuObj[csv.sku].supplier) {
                                        csv.primary_supplier_id = instance.ObjectId(supObj[skuObj[csv.sku].supplier]._id)
                                        csv.primary_supplier_name = skuObj[csv.sku].supplier
                                        csv.default_purchase_cost = skuObj[csv.sku].default_purchase_cost
                                      }
                                      csv.category = categoryObj[csv.category]
                                      csv.category_id = instance.ObjectId(csv.category)
                                      csv.organization = user.organization
                                      csv.last_updated = new Date().getTime()
                                      csv.last_stock_updated = new Date().getTime();

                                      if (skuObj[csv.sku].count_by_type && +skuObj[csv.sku].count_by_type) {
                                        csv.count_by_type = +skuObj[csv.sku].count_by_type
                                      }
                                      if (typeof skuObj[csv.sku].barcode_by_type === 'string' && skuObj[csv.sku].barcode_by_type.length > 0) {
                                        csv.barcode_by_type = skuObj[csv.sku].barcode_by_type
                                      }

                                      if (csv.item_type == 'variant') {
                                        const options_array = []
                                        if (typeof csv.option_value1 == typeof 'string' && csv.option_value1 != '') {
                                          options_array.push(csv.option_value1)
                                        }
                                        if (typeof csv.option_value2 == typeof 'string' && csv.option_value2 != '') {
                                          options_array.push(csv.option_value2)
                                        }
                                        if (typeof csv.option_value3 == typeof 'string' && csv.option_value3 != '') {
                                          options_array.push(csv.option_value3)
                                        }
                                        let variant_item_name = '';
                                        for (const indexx in options_array) {
                                          if (indexx > 0) {
                                            variant_item_name += ' / ';
                                          }
                                          variant_item_name += options_array[indexx]
                                        }
                                        if (variant_item_name != '') {
                                          csv.name = variant_item_name
                                        }
                                      }
                                      created_goods.push(csv)
                                      ItemBySku[csv.sku] = csv
                                    }
                                  }
                                  for (const item of created_goods) {

                                    if (
                                      json_data.variant_itemsMap[item.sku] &&
                                      json_data.variant_itemsMap[item.sku].length > 0
                                    ) {
                                      const variant_items = []
                                      for (const sku of json_data.variant_itemsMap[item.sku]) {

                                        if (ItemBySku[sku]) {
                                          if (ItemBySku[sku]._id) {
                                            variant_items.push(ItemBySku[sku]._id)
                                            try {
                                              await instance.goodsSales.updateOne({
                                                _id: ItemBySku[sku]._id
                                              }, {
                                                $set: ItemBySku[sku]
                                              })
                                            } catch (err) { }
                                          }
                                          else {
                                            try {
                                              const res = await new instance.goodsSales(ItemBySku[sku]).save()
                                              variant_items.push(res._id)
                                              ItemBySku[sku]._id = res._id
                                            } catch (error) { }
                                          }
                                        }
                                      }
                                      item.variant_items = variant_items
                                      item.variant_options = variantOptionsMap[item.sku]
                                      try { variant_items.length > 0 ? item.has_variants = true : item.has_variants = false }
                                      catch (err) { }
                                      try {
                                        const result = await new instance.goodsSales(item).save()
                                        ItemBySku[item.sku] = result
                                      }
                                      catch (err) { }
                                    }
                                    else {
                                      try {
                                        const result = await new instance.goodsSales(item).save()
                                        ItemBySku[item.sku] = result
                                      }
                                      catch (err) {
                                        console.log(err.message)
                                      }
                                    }
                                  }

                                  for (const good_id of updated_good_ids) {
                                    try {
                                      if (
                                        json_data.variant_itemsMap[updated_goods[good_id].sku] &&
                                        json_data.variant_itemsMap[updated_goods[good_id].sku].length > 0
                                      ) {
                                        const variant_items = []
                                        for (const sku of json_data.variant_itemsMap[updated_goods[good_id].sku]) {
                                          if (ItemBySku[sku]) {
                                            if (ItemBySku[sku]._id) {
                                              variant_items.push(ItemBySku[sku]._id)
                                              try {
                                                await instance.goodsSales.updateOne({
                                                  _id: ItemBySku[sku]._id
                                                }, {
                                                  $set: ItemBySku[sku]
                                                })
                                              } catch (err) { }
                                            }
                                            else {
                                              try {
                                                const res = await new instance.goodsSales(ItemBySku[sku]).save()
                                                variant_items.push(res._id)
                                              } catch (error) { }
                                            }
                                          }
                                        }
                                        updated_goods[good_id].variant_items = updated_goods[good_id].variant_items.concat(variant_items)
                                        if (updated_goods[good_id].variant_items && updated_goods[good_id].variant_items.length > 0) {
                                          updated_goods[good_id].has_variants = true
                                        }
                                        updated_goods[good_id].variant_options = variantOptionsMap[item.sku]

                                        try {
                                          await instance.goodsSales.updateOne({
                                            _id: good_id
                                          }, {
                                            $set: updated_goods[good_id]
                                          })
                                        }
                                        catch (err) { }
                                      }
                                      else {

                                        await instance.goodsSales.updateOne({ _id: good_id }, { $set: updated_goods[good_id] })
                                      }
                                    } catch (err) { }
                                  }
                                  reply.ok()
                                  update_composite_items(skuObj, json_data.skus, json_data.composite_item_datas, json_data.composite_skus, user)
                                }
                              })
                            }
                          })
                        })
                      }
                    })
                  })
                })
              }
              else {
                reply.error('Service names')
              }
            })
          }

        });
      });
    } catch (error) {
      return reply.error(error.message)
    }
  }

  function upload_excel_file(request, reply, user) {
    try {
      var files = request.raw.files
      const excel = files['excel']
      if (excel) {
        var url = './static/' + excel.md5 + excel.name
        var wstream = fs.createWriteStream(url);
        wstream.on('error', error => { return reply.error(error.message) })
        wstream.on('finish', () => {
          return continueWithItems(request, reply, user, url)
        })
        wstream.write(excel.data)
        wstream.end()
      }
      else {
        reply.send({
          statusCode: 404,
          error: "File not found"
        })
      }
    }
    catch (err) {
      reply.error(error.message)
    }
  }

  instance.post('/upload_excel_file', { version: '1.0.0' }, (request, reply) => {
    instance.authorization(request, reply, (admin) => {
      upload_excel_file(request, reply, admin)
    })
  })

  var goodssalessearch = (request, reply, user) => {
    if (!user) {
      reply.error('Access')
    } else {
      instance.goodsSales.find({
        service: request.body.service
      }, (err, items) => {
        if (err) {
          reply.error('Error on finding')
        } else {
          if (items) {
            var category_names = {}
            var category_ids = []
            for (var item of items) {
              if (item.category != "") {
                if (category_names[item.category] == undefined) {
                  category_ids.push(item.category)
                  category_names[item.category] = ""
                }
              }
            }
            instance.goodsCategory.find({
              _id: {
                $in: category_ids
              }
            }, (err, categories) => {
              if (err) {
                reply.error('Error on finding category')
              } else {
                if (categories) {
                  for (var category of categories) {
                    if (category != undefined)
                      category_names[category._id] = category.name
                  }
                  var Answer = []
                  for (var item of items) {
                    item.category = category_names[item.category]
                    Answer.push(item)
                  }
                  reply.ok(Answer)
                } else {
                  for (var item of items) {
                    item.category = category_names[item.category]
                    Answer.push(item)
                  }
                  reply.ok(Answer)
                }
              }
            })
          } else {
            reply.error('Does not exist')
          }
        }
      })
    }
  }

  instance.post('/goodssalessearch', {
    version: '1.0.0'
  }, (request, reply) => {
    on(request, reply, (user) => {
      goodssalessearch(request, reply, user)
    })
  })

  const converter = (array) => {
    var first = array[0].join()
    var headers = first.split(',');
    if (!(headers instanceof Array)) {
      headers = []
    }
    const data = []
    for (let i = 1; i < array.length; i++) {
      data.push({
        name: array[i][0],
        in_stock: +array[i][1] ? +array[i][1] : 0
      })
    }
    return data
  }

  const controlItems = async (data1, data2, reply) => {
    try {

      const data1Js = converter(data1)
      const data2Js = converter(data2)
      const data2Map = {}
      for (const it of data2Js) {
        data2Map[it.name] = it.in_stock
      }

      const res = []

      for (const ind in data1Js) {

        if (data2Map[data1Js[ind].name] && typeof data1Js[ind].in_stock == typeof 5) {
          data1Js[ind].in_stock -= data2Map[data1Js[ind].name]
          // data2Map[data1Js[ind].in_stock += data2Map[data1Js[ind].name].in_stock
        }
      }
      return reply.ok(data1Js)
    } catch (error) {
      reply.error(error.message)
    }
  }

  const readFiles = async (url1, url2, reply) => {
    try {
      fs.readFile(url1, {
        encoding: 'utf-8'
      }, function (err, csvData) {
        if (err || !csvData) {
          instance.send_Error('upload file', JSON.stringify(err))
          if (!err) {
            err = { message: 'Failed' }
          }
          return reply.error(err.message)
        }
        csvParser(csvData, {
          delimiter: ',',
          skip_lines_with_error: true
        }, function (err, data1) {
          if (!data1) {
            return reply.error('FAIL!')
          }
          fs.readFile(url2, {
            encoding: 'utf-8'
          }, function (err, csvData) {
            if (err || !csvData) {
              instance.send_Error('upload file', JSON.stringify(err))
              if (!err) {
                err = { message: 'Failed' }
              }
              return reply.error(err.message)
            }
            csvParser(csvData, {
              delimiter: ',',
              skip_lines_with_error: true
            }, function (err, data2) {
              if (!data2) {
                return reply.error('FAIL2!')
              }
              controlItems(data1, data2, reply)

            })
          })

        })
      })

    } catch (error) {
      return reply.error(error.message)
    }
  }


  instance.post('/upload-items', async function (request, reply) {
    try {
      var files = request.raw.files
      const excel1 = files['excel1']
      if (excel1) {
        var url1 = './static/' + excel1.md5 + excel1.name
        var wstream1 = fs.createWriteStream(url1);
        wstream1.on('error', error => { return reply.error(error.message) })
        wstream1.on('finish', () => {
          const excel2 = files['excel2']
          if (excel2) {
            var url2 = './static/' + excel2.md5 + excel2.name
            var wstream2 = fs.createWriteStream(url2);
            wstream2.on('error', error => { return reply.error(error.message) })
            wstream2.on('finish', () => {
              readFiles(url1, url2, reply)
            })
            wstream2.write(excel2.data)
            wstream2.end()
          }
        })
        wstream1.write(excel1.data)
        wstream1.end()
      }
      else {
        reply.send({
          statusCode: 404,
          error: "File not found"
        })
      }
    }
    catch (err) {
      reply.error(error.message)
    }
    return reply;
  })
  function convertToJSON2(array, correct_names) {
    let first = array[0].join()
    let headers = first.split(',');
    if (!(headers instanceof Array)) {
      headers = []
    }
    let errors = []
    let Errors = {
      error: 'ok',
      errors: []
    }

    for (let i = 0; i < 24; i++) {
      if (i < headers.length) {
        if (headers[i] != correct_names[i]) {
          errors.push({
            place: String.fromCharCode(i + 65) + '1',
            Error: headers[i] + " must be " + correct_names[i]
          })
        }
      }
      else {
        errors.push({
          place: String.fromCharCode(i + 65) + '1',
          Error: correct_names[i] + ' Field does not exist'
        })
      }
    }
    if (errors.length > 1) {
      Errors.errors = errors
      return Errors
    }
    else {
      let json_data = [];
      let variant_itemsMap = {}
      let composite_skus = []
      let last_sku;
      let composite_item_datas = {}
      let updating_skus = []
      if (!(array instanceof Array)) {
        array = []
      }

      for (let i = 1, length = array.length; i < length; i++) {
        let myRow = array[i].join();
        let row = myRow.split(',');
        if (!(row instanceof Array)) {
          row = []
        }

        var data = {};
        var serviceObj = {}
        var service_names = []
        for (var j = 0; j < row.length; j++) {
          if (j < 24) {
            data[headers[j]] = row[j];
            if (
              headers[j] == 'sku' || headers[j] == 'cost'
              || headers[j] == 'price' || headers[j] == 'default_purchase_cost'
              || headers[j] == 'composite_sku' || headers[j] == 'composite_quality') {
              data[headers[j]] = parseFloat(data[headers[j]])
              if (Number.isNaN(data[headers[j]])) {
                var val_sku = true
                if (row[11] != null) {
                  if (row[11] == '') {
                    val_sku = false
                  }
                }
                if (headers[j] == 'sku' && val_sku) {
                  errors.push({
                    place: 'A' + (i + 1),
                    Error: "invalid SKU type"
                  })
                }
                else if (headers[j] == 'sku') {
                  data[headers[j]] = '';
                }
                else {
                  data[headers[j]] = 0.0;
                }
              }
              else if (headers[j] == 'sku') {
                updating_skus.push(parseInt(data[headers[j]]))
              }
              else if (headers[j] == 'composite_sku') {
                if (data[headers[j]] != '') {
                  composite_skus.push(parseInt(data[headers[j]]))
                }
              }
            }
            else if (headers[j] == 'track_stock' || headers[j] == 'use_production' || headers[j] == 'composite') {
              var key = 'is_track_stock'
              if (headers[j] == 'use_production') {
                key = 'use_production'
              }
              else if (headers[j] == 'composite') {
                key = 'is_composite_item'
              }
              if (data[headers[j]] == 'Y') {
                data[key] = true
              }
              else {
                data[key] = false
              }
            }
            else if (headers[j] == 'representation') {
              if (typeof data['representation'] == typeof 'invan' && data['representation'] != '') {
                const colors = ['#E0E0E0', '#F44336', '#E91E63', '#FF9800', '#CDDC39', '#4CAF50', '#2196F3', '#9C27B0']
                if (!colors.includes(data['representation'])) {
                  data['representation_type'] = 'image'
                }
              }
              else {
                data['representation_type'] = 'color'
                data['representation'] = '#4CAF50'
              }
              // if (data['representation']) {
              //   if (data['representation'].length > 0) {
              //     if (data['representation'][0] == 'h') {
              //       data['representation_type'] = 'image'
              //     }
              //   }
              // }
            }
            else if (headers[j] == 'category' && data[headers[j]] == "") {
              data[headers[j]] = "Other"
            }
            if (data[headers[j]] !== '' && headers[j] == 'sku') {
              last_sku = data[headers[j]]
            }
          }
          else {
            if (row) {
              while (j < row.length && j < headers.length) {
                if (j % 6 == 0) {
                  service_names.push(return_service_name(headers[j]))
                  serviceObj[return_service_name(headers[j])] = {
                    available: row[j]
                  }
                }
                else if (j % 6 == 1) {
                  if (serviceObj[return_service_name(headers[j])]) {
                    serviceObj[return_service_name(headers[j])].price = row[j]
                  }
                }
                else if (j % 6 == 2) {
                  if (serviceObj[return_service_name(headers[j])]) {
                    let prices = []
                    if (typeof row[j] == typeof 'invan') {
                      const price_str = row[j].split(';')
                      for (const pr in price_str) {
                        if (price_str[pr] != '' && (+price_str[pr] || +price_str[pr] == 0) && pr % 2 == 0) {
                          prices.push({
                            from: +price_str[pr]
                          })
                        }
                        else if (price_str[pr] != '' && (+price_str[pr] || +price_str[pr] == 0) && pr % 2 == 1) {
                          prices[prices.length - 1].price = +price_str[pr]
                        }
                        else {
                          break;
                        }
                      }
                    }
                    let PRICES = []
                    for (const p_ind in prices) {
                      if (p_ind != 0) {
                        if (prices[p_ind].from && prices[p_ind].price) {
                          PRICES.push(prices[p_ind])
                        }
                      }
                      else {
                        PRICES.push(prices[p_ind])
                      }
                    }
                    prices = PRICES
                    serviceObj[return_service_name(headers[j])].prices = prices
                  }
                }
                else if (j % 6 == 3) {
                  if (serviceObj[return_service_name(headers[j])]) {
                    serviceObj[return_service_name(headers[j])].in_stock = row[j]
                  }
                }
                else if (j % 6 == 4) {
                  if (serviceObj[return_service_name(headers[j])]) {
                    serviceObj[return_service_name(headers[j])].low_stock = row[j]
                  }
                }
                else if (j % 6 == 5) {
                  if (serviceObj[return_service_name(headers[j])]) {
                    serviceObj[return_service_name(headers[j])].optimal_stock = row[j]
                  }
                }
                j++;
              }
            }
          }
        }
        if (data['sku'] === '') {
          if (composite_item_datas[last_sku] === undefined) {
            composite_item_datas[last_sku] = []
          }
          var quality = parseFloat(data['composite_quality'])
          var composite_ssku = parseFloat(data['composite_sku'])
          composite_item_datas[last_sku].push({
            sku: composite_ssku,
            quality: quality
          })
          // skus.push(composite_ssku)
        }
        delete data['composite']
        delete data['composite_sku']
        delete data['composite_quality']
        data.serviceObj = serviceObj

        service_names = [...new Set(service_names)]
        data.service_names = service_names
        if (data['sku'] != '') {
          json_data.push(data);
        }
      }

      composite_skus = [...new Set(composite_skus)]
      Errors.errors = errors
      if (errors.length > 0) {
        return Errors
      }
      else {
        var categories = []
        var suppliers = []
        var skus = []
        var sold_by_errors = []
        let variant_errors = []
        const sold_by_types = ['each', 'weight', 'box', 'litre', 'metre', 'pcs']
        for (let l = 0; l < json_data.length; l++) {
          var js = json_data[l]
          if (js.sku != '') {
            skus.push(js.sku)
            if (!sold_by_types.includes(js.sold_by)) {
              json_data[l].sold_by = 'each'
            }
            if (js.option_name1 || js.option_name2 || js.option_name3) {
              json_data[l].item_type = 'item'
            }
            else if (!js.name && (js.option_value1 || js.option_value2 || js.option_value3)) {
              json_data[l].item_type = 'variant'
            }
            else {
              json_data[l].item_type = 'item'
            }
            if (json_data[l].item_type == 'item') {
              if (typeof js.category == typeof 'invan' && js.category.length > 0) {
                categories.push(js.category)
              }
              if (typeof js.supplier == typeof 'invan' && js.supplier.length > 0) {
                suppliers.push(js.supplier)
              }
            }
          }
        }

        const variantOptionsMap = {}
        const optionNameMap = {}
        let variant_option_errors = []
        let last_item_variant_sku;

        for (let i = 0; i < json_data.length; i++) {

          if (json_data[i].item_type == 'item') {
            last_item_variant_sku = json_data[i].sku
          }
          if (!variant_itemsMap[last_item_variant_sku]) {
            variant_itemsMap[last_item_variant_sku] = []
          }
          if (last_item_variant_sku) {
            if (!optionNameMap[last_item_variant_sku]) {
              optionNameMap[last_item_variant_sku] = []
            }
            if (json_data[i].item_type == 'variant') {
              const name = json_data[i].option_value1 + json_data[i].option_value2 + json_data[i].option_value3
              if (optionNameMap[last_item_variant_sku].includes(name)) {
                variant_option_errors.push(i + 2)
              }
              optionNameMap[last_item_variant_sku].push(name)
              if (json_data[i].sku) {
                variant_itemsMap[last_item_variant_sku].push(json_data[i].sku)
              }
            }
          }
          if (!variantOptionsMap[last_item_variant_sku]) {
            variantOptionsMap[last_item_variant_sku] = []
          }

          // v options
          if (json_data[i].option_name1) {
            variantOptionsMap[last_item_variant_sku].push({
              option_name: json_data[i].option_name1,
              option_values: []
            })
          }
          if (json_data[i].option_name2) {
            variantOptionsMap[last_item_variant_sku].push({
              option_name: json_data[i].option_name2,
              option_values: []
            })
            if (variantOptionsMap[last_item_variant_sku] && variantOptionsMap[last_item_variant_sku].length < 2) {
              variant_errors.push('E' + (i + 2))
            }
          }
          if (json_data[i].option_name3) {
            variantOptionsMap[last_item_variant_sku].push({
              option_name: json_data[i].option_name3,
              option_values: []
            })
            if (variantOptionsMap[last_item_variant_sku] && variantOptionsMap[last_item_variant_sku].length < 3) {
              if (json_data[i].option_name2) {
                variant_errors.push('E' + (i + 2))
              }
              else if (json_data[i].option_name1) {
                variant_errors.push('G' + (i + 2))
              }
              else {
                variant_errors.push('E' + (i + 2))
                variant_errors.push('G' + (i + 2))
              }
            }
          }

          // option values

          if (json_data[i].item_type == 'variant') {

            if (json_data[i].option_value1) {
              if (variantOptionsMap[last_item_variant_sku] && variantOptionsMap[last_item_variant_sku].length > 0) {
                variantOptionsMap[last_item_variant_sku][0].option_values.push(json_data[i].option_value1)
              }
              else {
                // if (json_data[i - 1] && json_data[i - 1].item_type == 'item') {
                //   variant_errors.push('E' + (i + 1))
                // }
              }
            }
            else {
              variant_errors.push('F' + (i + 1))
            }

            if (json_data[i].option_value2) {
              if (variantOptionsMap[last_item_variant_sku] && variantOptionsMap[last_item_variant_sku].length > 1) {
                variantOptionsMap[last_item_variant_sku][1].option_values.push(json_data[i].option_value2)
              }
              else if (json_data[i - 1]) {
                if (json_data[i - 1].item_type == 'item' && !json_data[i - 1].option_name2) {
                  variant_errors.push('G' + (i + 1))
                }
              }
            }

            if (json_data[i].option_value3) {
              if (variantOptionsMap[last_item_variant_sku] && variantOptionsMap[last_item_variant_sku].length > 2) {
                variantOptionsMap[last_item_variant_sku][2].option_values.push(json_data[i].option_value3)
              }
              else if (json_data[i - 1]) {
                if (json_data[i - 1].item_type == 'item' && !json_data[i - 1].option_name3) {
                  variant_errors.push('I' + 1)
                }
              }
            }
          }
        }

        variant_errors = [...new Set(variant_errors)]
        variant_option_errors = [...new Set(variant_option_errors)]
        categories = [...new Set(categories)]
        suppliers = [...new Set(suppliers)]
        var set_sku = [...new Set(skus)]
        if (set_sku.length !== skus.length || variant_errors.length > 0 || variant_option_errors.length > 0) {
          var skuObj = {}
          for (let t = 0; t < skus.length; t++) {
            var sku = skus[t]
            if (skuObj[sku] == undefined) {
              skuObj[sku] = ["A" + (t + 2)]
            }
            else {
              skuObj[sku].push("A" + (t + 2))
            }
          }
          for (var sku of set_sku) {
            if (skuObj[sku] && skuObj[sku].length > 1) {
              for (var er of skuObj[sku]) {
                errors.push({
                  place: er,
                  Error: "SKU must be unique"
                })
              }
            }
          }
          for (var sb of sold_by_errors) {
            errors.push({
              place: sb,
              Error: "Sold by type error"
            })
          }

          for (const err of variant_errors) {
            errors.push({
              place: err,
              Error: 'Can not be blank'
            })
          }
          for (const err of variant_option_errors) {
            errors.push({
              place: err,
              Error: 'Row is not unique'
            })
          }

          Errors.errors = errors
          return Errors
        }
        else {
          for (var sb of sold_by_errors) {
            errors.push({
              place: sb,
              Error: "Sold by type error"
            })
          }
          Errors.errors = errors
          if (errors.length > 0) {
            return Errors
          }
          else {
            let response = {
              skus: skus,
              categories: categories,
              suppliers: suppliers,
              data: json_data,
              composite_skus: composite_skus,
              composite_item_datas: composite_item_datas,
              updating_skus: updating_skus,
              variantOptionsMap: variantOptionsMap,
              variant_itemsMap: variant_itemsMap
            }
            return response
          }
        }
      }
    }
  };
  const continueWithItems2 = async (request, reply, user, url) => {
    try {
      fs.readFile(url, {
        encoding: 'utf-8'
      }, function (err, csvData) {
        if (err || !csvData) {
          instance.send_Error('upload file', JSON.stringify(err))
          if (!err) {
            err = { message: 'Failed' }
          }
          return reply.error(err.message)
        }
        csvParser(csvData, {
          delimiter: ',',
          skip_lines_with_error: true
        }, function (err, data) {
          if (err || typeof data != typeof []) {
            instance.send_Error('uploading excel file', JSON.stringify(err))
            return reply.invalidmediatype()
          }

          // var correct_names = ['sku', 'name', 'category', 'sold_by', 'cost', 'price', 'track_stock', 'in_stock', 'low_stock', 'barcode']
          //// composite	composite_sku	composite_quality
          const correct_names = [
            'sku', 'name', 'category', 'sold_by',
            'option_name1', 'option_value1',
            'option_name2', 'option_value2',
            'option_name3', 'option_value3',
            'price', 'cost', 'barcode', 'count_by_type',
            'barcode_by_type', 'representation', 'composite',
            'composite_sku', 'composite_quality', 'track_stock',
            'use_production', 'supplier', 'default_purchase_cost', 'mxik'
          ]
          let json_data = convertToJSON2(data, correct_names)
          if (json_data.error == 'ok') {
            reply.send({
              statusCode: 205,
              errors: json_data.errors
            })
          }
          else {
            if (json_data.data == 0) {
              return reply.error('Nothing to save')
            }
            let service_names = json_data.data[0].service_names
            if (!(service_names instanceof Array)) {
              service_names = []
            }
            const variantOptionsMap = json_data.variantOptionsMap
            instance.services.find({
              organization: user.organization
            }, (err, test_services) => {
              if (test_services == null) {
                test_services = []
              }
              var service_nameObj = {}
              for (var s of test_services) {
                service_nameObj[s.name] = true
              }

              var valid_names = (service_names.length > 0)
              for (var name of service_names) {
                valid_names = valid_names && (service_nameObj[name] ? true : false)
              }

              console.log(valid_names);
              if (valid_names) {
                var categories = json_data.categories
                var suppliers = json_data.suppliers
                var skus = json_data.skus
                if (!(skus instanceof Array)) {
                  skus = []
                }
                var csv_data = json_data.data

                var composite_skus = json_data.composite_skus
                var updating_skus = json_data.updating_skus
                var composite_item_datas = json_data.composite_item_datas
                instance.goodsCategory.find({
                  "$or": [{ name: { $in: categories } }, { is_other: true }],
                  organization: user.organization
                }, (err, categoriess) => {
                  if (err || categoriess == null) {
                    if (err) {
                      instance.send_Error('finding category', JSON.stringify(err))
                    }
                    categoriess = []
                  }
                  var categoryObj = {}
                  var category_nameObj = {}
                  for (var cat of categoriess) {
                    categoryObj[cat.name] = cat._id
                    category_nameObj[cat._id] = cat.name
                  }
                  let categories_to_save = []
                  for (var cat of categories) {
                    if (categoryObj[cat] == undefined) {
                      categories_to_save.push({
                        organization: user.organization,
                        name: cat,
                        color: '#E0E0E0'
                      })
                    }
                  }
                  var send_result = {}
                  if (categories_to_save.length > 0) {
                    send_result.category_created = categories_to_save.length
                  }
                  instance.adjustmentSupplier.find({
                    supplier_name: {
                      $in: suppliers
                    },
                    organization: user.organization
                  }, (_, supps) => {
                    if (supps == null) {
                      supps = []
                    }
                    var supObj = {}
                    for (var s of supps) {
                      supObj[s.supplier_name] = s
                    }
                    var suppliers_to_save = []
                    for (var n of suppliers) {
                      if (supObj[n] == undefined) {
                        suppliers_to_save.push({
                          supplier_name: n,
                          organization: user.organization
                        })
                      }
                    }
                    if (suppliers_to_save.length > 0) {
                      send_result.supplier_created = suppliers_to_save.length
                    }

                    instance.goodsSales.find({
                      sku: {
                        $in: skus
                      },
                      organization: user.organization
                    }, (err, goods) => {
                      if (err || goods == null) {
                        if (err) {
                          instance.send_Error('finding goods', JSON.stringify(err))
                        }
                        goods = []
                      }

                      if (goods.length > 0) {
                        send_result.goods_updated = goods.length
                      }
                      if (skus.length - goods.length > 0) {
                        send_result.goods_created = skus.length - goods.length
                      }

                      if (request.headers.save == 'false') {
                        reply.ok(send_result)
                      }
                      else {
                        instance.services.find({
                          organization: user.organization
                        }, (_, services) => {
                          if (services == null) {
                            services = []
                          }
                          const servicesNameMap = {}
                          for (const s of services) {
                            servicesNameMap[s.name] = s
                          }
                          var updated_goods = {}
                          var updated_good_ids = []
                          var created_goods = []
                          instance.goodsCategory.insertMany(categories_to_save, (err, CATEG) => {
                            if (err || CATEG == null) {
                              if (err) {
                                instance.send_Error('file upload creating category', JSON.stringify(err))
                              }
                              reply.error('Error on creating category')
                            }
                            else {
                              instance.adjustmentSupplier.insertMany(suppliers_to_save, async (err, suppss) => {
                                if (err || suppss == null) {
                                  if (err) {
                                    instance.send_Error('creating suppliers', JSON.stringify(err))
                                  }
                                  reply.error('Error on creating suppliers')
                                }
                                else {
                                  for (var s of suppss) {
                                    supObj[s.supplier_name] = s
                                  }
                                  for (var cat of CATEG) {
                                    categoryObj[cat.name] = cat._id
                                    category_nameObj[cat._id] = cat.name
                                  }
                                  var skuObj = {}
                                  for (var csv of csv_data) {
                                    skuObj[csv.sku] = csv
                                  }
                                  const ItemBySku = {}

                                  for (let kk = 0; kk < goods.length; kk++) {
                                    let good = goods[kk];
                                    try {
                                      good = good.toObject()
                                    }
                                    catch (error) {
                                      instance.send_Error('to Object', error.message)
                                    }
                                    if (skuObj[good.sku] != undefined) {
                                      good.price = skuObj[good.sku].price
                                      good.cost = skuObj[good.sku].cost
                                      good.in_stock = skuObj[good.sku].in_stock
                                      good.is_track_stock = skuObj[good.sku].is_track_stock
                                      good.use_production = skuObj[good.sku].use_production
                                      good.is_composite_item = skuObj[good.sku].is_composite_item
                                      good.sold_by = skuObj[good.sku].sold_by
                                      good.mxik = skuObj[good.sku].mxik

                                      const goodOldServicesMap = {}
                                      if (typeof good.services != typeof []) {
                                        good.services = []
                                      }
                                      for (const s of good.services) {
                                        goodOldServicesMap[s.service] = s
                                      }
                                      const file_good_services = []
                                      if (typeof skuObj[good.sku].service_names == typeof []) {
                                        for (const name of skuObj[good.sku].service_names) {
                                          try {
                                            if (skuObj[good.sku].serviceObj[name] && servicesNameMap[name]) {
                                              file_good_services.push(skuObj[good.sku].serviceObj[name])
                                              file_good_services[file_good_services.length - 1].service = servicesNameMap[name]._id
                                              file_good_services[file_good_services.length - 1].service_name = servicesNameMap[name].name
                                              file_good_services[file_good_services.length - 1].available = (skuObj[good.sku].serviceObj[name].available == 'Y') ? true : false
                                              file_good_services[file_good_services.length - 1].price = parseFloat(skuObj[good.sku].serviceObj[name].price) ? parseFloat(skuObj[good.sku].serviceObj[name].price) : 0
                                              file_good_services[file_good_services.length - 1].in_stock = parseFloat(skuObj[good.sku].serviceObj[name].in_stock) ? parseFloat(skuObj[good.sku].serviceObj[name].in_stock) : 0
                                              file_good_services[file_good_services.length - 1].low_stock = parseFloat(skuObj[good.sku].serviceObj[name].low_stock) ? parseFloat(skuObj[good.sku].serviceObj[name].low_stock) : 0
                                              file_good_services[file_good_services.length - 1].optimal_stock = parseFloat(skuObj[good.sku].serviceObj[name].optimal_stock) ? parseFloat(skuObj[good.sku].serviceObj[name].optimal_stock) : 0
                                              file_good_services[file_good_services.length - 1].prices = skuObj[good.sku].serviceObj[name].prices instanceof Array ? skuObj[good.sku].serviceObj[name].prices : []
                                            }
                                          }
                                          catch (err) { }
                                        }
                                      }
                                      good.services = file_good_services

                                      if (typeof skuObj[good.sku].barcode == typeof 'invan' && skuObj[good.sku].barcode.length > 0) {
                                        let barcode = skuObj[good.sku].barcode.split(';')
                                        let barcodes = []
                                        for (const b of barcode) {
                                          if (typeof b == typeof 'invan' && b.length > 0) {
                                            barcodes.push(b)
                                          }
                                        }

                                        if (barcodes.length > 0) {
                                          const tiin_item = await instance.goodsSales.findOne({
                                            organization: tiin_id,
                                            barcode: {
                                              $in: barcodes
                                            }
                                          });
                                          if (tiin_item) {
                                            try {
                                              for (const b of tiin_item.barcode) {
                                                barcodes.push(b);
                                              }
                                            } catch (error) { };
                                            barcodes = [...new Set(barcodes)];
                                          }
                                        }

                                        good.barcode = barcodes
                                      }
                                      else {
                                        good.barcode = []
                                      }
                                      if (typeof skuObj[good.sku].name == typeof 'invan' && skuObj[good.sku].item_type != 'variant') {
                                        good.name = skuObj[good.sku].name
                                      }
                                      else if (skuObj[good.sku].item_type == 'variant') {
                                        let good_name = ''
                                        if (typeof skuObj[good.sku].option_value1 == typeof 'invan' && skuObj[good.sku].option_value1.length > 0) {
                                          good_name += skuObj[good.sku].option_value1
                                        }
                                        if (typeof skuObj[good.sku].option_value2 == typeof 'invan' && skuObj[good.sku].option_value2.length > 0) {
                                          if (good_name.length > 0) {
                                            good_name += ' / '
                                          }
                                          good_name += skuObj[good.sku].option_value2
                                        }
                                        if (typeof skuObj[good.sku].option_value3 == typeof 'invan' && skuObj[good.sku].option_value3.length > 0) {
                                          if (good_name.length > 0) {
                                            good_name += ' / '
                                          }
                                          good_name += skuObj[good.sku].option_value3
                                        }
                                        if (good_name.length > 0) {
                                          good.name = good_name
                                        }
                                      }

                                      good.representation_type = skuObj[good.sku].representation_type ? skuObj[good.sku].representation_type : 'color'
                                      good.representation = skuObj[good.sku].representation;

                                      var NAMES = []
                                      var NAMEOBJ = {}
                                      let org_services = []

                                      const itemServicesMap = {}
                                      if (typeof good.services != typeof []) {
                                        good.services = []
                                      }
                                      for (const s of good.services) {
                                        itemServicesMap[s.service + ''] = s
                                      }
                                      try {
                                        org_services = await instance.services.find({ organization: user.organization })
                                      } catch (error) { }
                                      const item_services = []
                                      for (const s of org_services) {
                                        if (itemServicesMap[s._id + '']) {
                                          item_services.push(itemServicesMap[s._id + ''])
                                        }
                                        else if (goodOldServicesMap[s._id]) {
                                          item_services.push(goodOldServicesMap[s._id])
                                        } else {
                                          item_services.push({
                                            service: s._id,
                                            service_name: s.name,
                                            price: good.price,
                                            price_currency: good.price_currency,
                                            prices: (good.prices instanceof Array) ? good.prices : [],
                                            in_stock: 0
                                          })
                                        }
                                      }
                                      good.services = item_services

                                      for (var s of good.services) {
                                        NAMES.push(s.service_name)
                                        NAMEOBJ[s.service_name] = s
                                      }

                                      if (skuObj[good.sku].serviceObj != undefined) {
                                        good.services = []
                                        for (var NAME of NAMES) {
                                          if (skuObj[good.sku].serviceObj[NAME] != undefined) {
                                            try {
                                              good.services.push(NAMEOBJ[NAME])
                                              good.services[good.services.length - 1].available = (skuObj[good.sku].serviceObj[NAME].available == 'Y') ? true : NAMEOBJ[NAME].available
                                              good.services[good.services.length - 1].price = parseFloat(skuObj[good.sku].serviceObj[NAME].price) ? parseFloat(skuObj[good.sku].serviceObj[NAME].price) : NAMEOBJ[NAME].price
                                              good.services[good.services.length - 1].in_stock = parseFloat(skuObj[good.sku].serviceObj[NAME].in_stock) ? parseFloat(skuObj[good.sku].serviceObj[NAME].in_stock) : NAMEOBJ[NAME].in_stock
                                              good.services[good.services.length - 1].low_stock = parseFloat(skuObj[good.sku].serviceObj[NAME].low_stock) ? parseFloat(skuObj[good.sku].serviceObj[NAME].low_stock) : NAMEOBJ[NAME].low_stock
                                              good.services[good.services.length - 1].optimal_stock = parseFloat(skuObj[good.sku].serviceObj[NAME].optimal_stock) ? parseFloat(skuObj[good.sku].serviceObj[NAME].optimal_stock) : NAMEOBJ[NAME].optimal_stock
                                              good.services[good.services.length - 1].prices = (skuObj[good.sku].serviceObj[NAME].prices instanceof Array) ? skuObj[good.sku].serviceObj[NAME].prices : NAMEOBJ[NAME].prices

                                            }
                                            catch (err) { }
                                          }
                                          else {
                                            good.services.push(NAMEOBJ[NAME])
                                          }
                                        }
                                      }

                                      if (skuObj[good.sku].supplier && supObj[skuObj[good.sku].supplier]) {
                                        good.primary_supplier_id = instance.ObjectId(supObj[skuObj[good.sku].supplier]._id)
                                        good.primary_supplier_name = skuObj[good.sku].supplier
                                        good.default_purchase_cost = skuObj[good.sku].default_purchase_cost
                                      }
                                      if (good.category != categoryObj[skuObj[good.sku].category]) {
                                        good.category = categoryObj[skuObj[good.sku].category]
                                        if (categoryObj[skuObj[good.sku].category] != '' && categoryObj[skuObj[good.sku].category] != null) {
                                          good.category_id = instance.ObjectId(categoryObj[skuObj[good.sku].category])
                                        }
                                        good.category_name = skuObj[good.sku].category
                                      }
                                      else {
                                        good.category_name = skuObj[good.sku].category
                                      }

                                      if (skuObj[good.sku].count_by_type && +skuObj[good.sku].count_by_type) {
                                        good.count_by_type = +skuObj[good.sku].count_by_type
                                      }
                                      if (typeof skuObj[good.sku].barcode_by_type === 'string' && skuObj[good.sku].barcode_by_type.length > 0) {
                                        good.barcode_by_type = skuObj[good.sku].barcode_by_type
                                      }
                                      skuObj[good.sku] = undefined
                                    }
                                    updated_good_ids.push(good._id)
                                    good.last_updated = new Date().getTime()
                                    good.last_stock_updated = new Date().getTime()

                                    updated_goods[good._id] = good

                                    ItemBySku[good.sku] = good
                                  }

                                  for (var csv of csv_data) {
                                    if (skuObj[csv.sku] != undefined) {

                                      if (typeof csv.barcode == typeof 'invan' && csv.barcode.length > 0) {
                                        let barcode = csv.barcode.split(';');

                                        let barcodes = []
                                        for (const b of barcode) {
                                          if (typeof b == typeof 'invan' && b.length > 0) {
                                            barcodes.push(b)
                                          }
                                        };
                                        if (barcodes.length > 0) {
                                          const tiin_item = await instance.goodsSales.findOne({
                                            organization: tiin_id,
                                            barcode: {
                                              $in: barcodes
                                            }
                                          });
                                          if (tiin_item) {
                                            try {
                                              for (const b of tiin_item.barcode) {
                                                barcodes.push(b);
                                              }
                                            } catch (error) { };
                                            barcodes = [...new Set(barcodes)];
                                          }
                                        }

                                        csv.barcode = barcodes
                                      }
                                      else {
                                        csv.barcode = []
                                      }

                                      csv.services = []
                                      for (var s of services) {
                                        if (csv.serviceObj[s.name] != undefined) {
                                          var available = false
                                          if (csv.serviceObj[s.name].available == 'Y') {
                                            available = true
                                          }
                                          var price = 0,
                                            in_stock = 0,
                                            low_stock = 0,
                                            optimal_stock = 0
                                          if (parseFloat(csv.serviceObj[s.name].in_stock)) {
                                            in_stock = parseFloat(csv.serviceObj[s.name].in_stock)
                                          }
                                          if (parseFloat(csv.serviceObj[s.name].low_stock)) {
                                            low_stock = parseFloat(csv.serviceObj[s.name].low_stock)
                                          }
                                          if (parseFloat(csv.serviceObj[s.name].optimal_stock)) {
                                            optimal_stock = parseFloat(csv.serviceObj[s.name].optimal_stock)
                                          }
                                          if (parseFloat(csv.serviceObj[s.name].price)) {
                                            price = parseFloat(csv.serviceObj[s.name].price)
                                          }
                                          let prices = []
                                          prices = (s.prices instanceof Array) ? s.prices : []
                                          csv.services.push({
                                            available: available,
                                            price: price,
                                            prices: prices,
                                            service: instance.ObjectId(s._id),
                                            service_name: s.name,
                                            in_stock: in_stock,
                                            low_stock: low_stock,
                                            optimal_stock: optimal_stock
                                          })
                                        }
                                      }
                                      delete csv.serviceObj
                                      delete csv.service_names
                                      csv.category_name = csv.category + ""

                                      if (skuObj[csv.sku].supplier) {
                                        csv.primary_supplier_id = instance.ObjectId(supObj[skuObj[csv.sku].supplier]._id)
                                        csv.primary_supplier_name = skuObj[csv.sku].supplier
                                        csv.default_purchase_cost = skuObj[csv.sku].default_purchase_cost
                                      }
                                      csv.category = categoryObj[csv.category]
                                      csv.category_id = instance.ObjectId(csv.category)
                                      csv.organization = user.organization
                                      csv.last_updated = new Date().getTime()
                                      csv.last_stock_updated = new Date().getTime();

                                      if (skuObj[csv.sku].count_by_type && +skuObj[csv.sku].count_by_type) {
                                        csv.count_by_type = +skuObj[csv.sku].count_by_type
                                      }
                                      if (typeof skuObj[csv.sku].barcode_by_type === 'string' && skuObj[csv.sku].barcode_by_type.length > 0) {
                                        csv.barcode_by_type = skuObj[csv.sku].barcode_by_type
                                      }

                                      if (csv.item_type == 'variant') {
                                        const options_array = []
                                        if (typeof csv.option_value1 == typeof 'string' && csv.option_value1 != '') {
                                          options_array.push(csv.option_value1)
                                        }
                                        if (typeof csv.option_value2 == typeof 'string' && csv.option_value2 != '') {
                                          options_array.push(csv.option_value2)
                                        }
                                        if (typeof csv.option_value3 == typeof 'string' && csv.option_value3 != '') {
                                          options_array.push(csv.option_value3)
                                        }
                                        let variant_item_name = '';
                                        for (const indexx in options_array) {
                                          if (indexx > 0) {
                                            variant_item_name += ' / ';
                                          }
                                          variant_item_name += options_array[indexx]
                                        }
                                        if (variant_item_name != '') {
                                          csv.name = variant_item_name
                                        }
                                      }
                                      created_goods.push(csv)
                                      ItemBySku[csv.sku] = csv
                                    }
                                  }
                                  for (const item of created_goods) {

                                    if (
                                      json_data.variant_itemsMap[item.sku] &&
                                      json_data.variant_itemsMap[item.sku].length > 0
                                    ) {
                                      const variant_items = []
                                      for (const sku of json_data.variant_itemsMap[item.sku]) {

                                        if (ItemBySku[sku]) {
                                          if (ItemBySku[sku]._id) {
                                            variant_items.push(ItemBySku[sku]._id)
                                            try {
                                              await instance.goodsSales.updateOne({
                                                _id: ItemBySku[sku]._id
                                              }, {
                                                $set: ItemBySku[sku]
                                              })
                                            } catch (err) { }
                                          }
                                          else {
                                            try {
                                              const res = await new instance.goodsSales(ItemBySku[sku]).save()
                                              variant_items.push(res._id)
                                              ItemBySku[sku]._id = res._id
                                            } catch (error) { }
                                          }
                                        }
                                      }
                                      item.variant_items = variant_items
                                      item.variant_options = variantOptionsMap[item.sku]
                                      try { variant_items.length > 0 ? item.has_variants = true : item.has_variants = false }
                                      catch (err) { }
                                      try {
                                        const result = await new instance.goodsSales(item).save()
                                        ItemBySku[item.sku] = result
                                      }
                                      catch (err) { }
                                    }
                                    else {
                                      try {
                                        const result = await new instance.goodsSales(item).save()
                                        ItemBySku[item.sku] = result
                                      }
                                      catch (err) {
                                        console.log(err.message)
                                      }
                                    }
                                  }

                                  for (const good_id of updated_good_ids) {
                                    try {
                                      if (
                                        json_data.variant_itemsMap[updated_goods[good_id].sku] &&
                                        json_data.variant_itemsMap[updated_goods[good_id].sku].length > 0
                                      ) {
                                        const variant_items = []
                                        for (const sku of json_data.variant_itemsMap[updated_goods[good_id].sku]) {
                                          if (ItemBySku[sku]) {
                                            if (ItemBySku[sku]._id) {
                                              variant_items.push(ItemBySku[sku]._id)
                                              try {
                                                await instance.goodsSales.updateOne({
                                                  _id: ItemBySku[sku]._id
                                                }, {
                                                  $set: ItemBySku[sku]
                                                })
                                              } catch (err) { }
                                            }
                                            else {
                                              try {
                                                const res = await new instance.goodsSales(ItemBySku[sku]).save()
                                                variant_items.push(res._id)
                                              } catch (error) { }
                                            }
                                          }
                                        }
                                        updated_goods[good_id].variant_items = updated_goods[good_id].variant_items.concat(variant_items)
                                        if (updated_goods[good_id].variant_items && updated_goods[good_id].variant_items.length > 0) {
                                          updated_goods[good_id].has_variants = true
                                        }
                                        updated_goods[good_id].variant_options = variantOptionsMap[item.sku]

                                        try {
                                          await instance.goodsSales.updateOne({
                                            _id: good_id
                                          }, {
                                            $set: updated_goods[good_id]
                                          })
                                        }
                                        catch (err) { }
                                      }
                                      else {

                                        await instance.goodsSales.updateOne({ _id: good_id }, { $set: updated_goods[good_id] })
                                      }
                                    } catch (err) { }
                                  }
                                  reply.ok()
                                  update_composite_items(skuObj, json_data.skus, json_data.composite_item_datas, json_data.composite_skus, user)
                                }
                              })
                            }
                          })
                        })
                      }
                    })
                  })
                })
              }
              else {
                reply.error('Service names')
              }
            })
              .lean()
          }

        });
      });
    } catch (error) {
      console.log(error);
      return reply.error(error.message)
    }
  }
  function upload_excel_file_mxik(request, reply, user) {
    try {
      const files = request.raw.files
      console.log(files);
      const excel = files['excel']
      console.log(excel);
      if (excel) {
        const url = './static/' + excel.md5 + excel.name
        const wstream = fs.createWriteStream(url);
        wstream.on('error', error => { return reply.error(error.message) })
        wstream.on('finish', () => {
          return continueWithItems2(request, reply, user, url)
        })
        wstream.write(excel.data)
        wstream.end()
      }
      else {
        reply.send({
          statusCode: 404,
          error: "File not found"
        })
      }
    }
    catch (err) {
      reply.error(error.message)
    }
  }

  instance.post('/upload_excel_file_mxik', { version: '1.0.0' }, (request, reply) => {
    console.log('here');
    instance.authorization(request, reply, (admin) => {
      upload_excel_file_mxik(request, reply, admin)
    })
  })
  next()
}
