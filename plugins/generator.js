
const fp = require('fastify-plugin')
const mongoose = require('mongoose')
const mongodb = require('mongodb')
const TokenGenerator = require('uuid-token-generator')
const axios = require('axios')
const qs = require('qs');
var FCM = require('fcm-node')
// const categories = require('../admin/items/categories')
var serverKey = 'AAAACPKexKE:APA91bHcaxbRaXNjWGaxWglbs0U4OpbI1MLxb1IvF3UY1OZnkllgQ_nizhvVyr9fXv2EBVyZxjb3C9rmrXFDuMap4Z96bgZ_kcVM7YA0kWgvMbpUAisdycuxCdUd_x3ib4gMN0y5Mlml'
var fcm = new FCM(serverKey)
var removeFromArray = (array, item) => {
  var Answer = []
  if (array == null) {
    array = []
  }
  for (var arr of array) {
    if (arr != item) {
      Answer.push(arr)
    }
  }
  return Answer
}
var wrong_token = {
  statusCode: 498,
  error: "Invalid token",
  message: "Invalid token"
}

var fire_token_error = {
  statusCode: 495,
  message: "Firebase token error"
}

const BASE_URL2 = 'http://localhost:3000'
var BASE_URL = 'http://178.218.207.90'
BASE_URL = 'http://localhost:3000'

mongoose.connect(process.env.INVAN_DB_CONN_STR || 'mongodb://localhost:27017/invandb', {
  useNewUrlParser: true,
  useFindAndModify: false,
  useUnifiedTopology: true,
  useCreateIndex: true,
})

function send_to_slack(method, model, er_or_suc) {
  // axios.post('https://slack.com/api/chat.postMessage', qs.stringify({
  //   channel: "GLT5K8EMU",
  //   text: `on ${method}    ${model}  ${er_or_suc} `
  // }), {headers: my_headers}).then(response => {}).catch((error) =>{console.log('Error on ')})
  // if (er_or_suc != "Success")
  //   axios.post(`https://api.telegram.org/bot769464007:AAFjO5cpIsqUMbhG0rTLkQ4dex63fjs1nUM/sendMessage?chat_id=-1001434635647&parse_mode=html&text=${er_or_suc}  On ${method} method   ${model}`)
  //     .then(function (response) { }).catch(function (err) { }).then(function () { })
}

function send_Error(url, error) {
  axios.post(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage?chat_id=${process.env.SEND_ERROR_GROUP}&parse_mode=html&text=Error On ${url} url :  \n${error}`)
    .then(function (response) { }).catch(function (err) { }).then(function () { })
}

module.exports = fp((instance, _, next) => {

  instance.get('/', (request, reply) => {
    axios.post(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage?chat_id=${process.env.TELEGRAMID}&parse_mode=html&text=Hostname of server is ${request.hostname} \n ip of server is ${request.ip}`)
      .then(function (response) { }).catch(function (err) { }).then(function () { })
    reply.sendFile("./send.html")
  })

  instance.decorate('send_Error', (url, error) => {
    const msg = `Error On ${url} url:\n${error}\n\n${process.env.NODE_ENV}`;
    const tg_url = `https://api.telegram.org/bot${process.env.BOT_TOKEN}`;

    axios.post(`${tg_url}/sendMessage?chat_id=${process.env.SEND_ERROR_GROUP}&parse_mode=html&text=${msg}`)
      .catch(function (err) { })
  })

  instance.decorate('DATE', (timestamp) => {
    return (new Date(timestamp).toDateString())
  })

  instance.decorate('pushnotification', (TYPE, user, service_id = "") => {
    // if (TYPE == 0) {
    //   service_id = '12345'
    // }
    // if (user == undefined) {
    //   user = {}
    // }
    // if (user._id == undefined) {
    //   user._id = '12345'
    // }

    // var message = {
    //   to: '/topics/' + service_id,
    //   data: Object.assign({
    //     type: TYPE,
    //     type_message: "DATA_CHANGES",
    //     method: TYPE,
    //     cashier_id: user._id
    //   })
    // };
    // fcm.send(message, function (err, response) {
    //   // if (err) {
    //   //   send_Error('pushnotification', JSON.stringify(err))
    //   // }
    // })
  })

  function pushnotification(TYPE, model, user, method, This, GR = false, only_bos = false, is_ticket = false) {
    // var TTTT = true
    // var id = "1234567"
    // if (user._id) {
    //   id = user._id
    // }
    // var TTT = user.service

    // if (TTT != undefined) {

    //   var message = {
    //     to: '/topics/' + TTT,
    //     data: Object.assign({
    //       type: TYPE,
    //       type_message: "DATA_CHANGES",
    //       method: TYPE,
    //       cashier_id: id
    //     })
    //   };
    //   if (is_ticket == true) {
    //     fcm.send(message, function (err, response) {
    //       if (err) {
    //         send_Error('pushnotification', JSON.stringify(err))
    //       }
    //     })
    //   }
    //   else if (TYPE == 106) {
    //     if (GR) {
    //       if (model != null)
    //         This.ok(model)
    //       else {
    //         This.error('Not found')
    //       }
    //     }
    //     else {
    //       if (model.length > 0)
    //         This.ok(model[0])
    //       else {
    //         This.error('Not found')
    //       }
    //     }
    //   }
    //   else {
    //     fcm.send(message, function (err, response) {
    //       if (err) {
    //         send_Error('pushnotification', JSON.stringify(err))
    //         This.error('ERROR: ' + err)
    //       } else {
    //         if (TTTT) {
    //           TTTT = false
    //           model = [...new Set(model)]
    //           if (method == 'delete') {
    //             if (GR) {
    //               if (model == null) {
    //                 send_to_slack('push delete', JSON.stringify(model), 'Error')
    //                 send_Error('push delete', JSON.stringify({
    //                   statusCode: 404,
    //                   message: 'Does not exist'
    //                 }))
    //                 This.send({
    //                   statusCode: 404,
    //                   message: 'Does not exist'
    //                 })
    //               }
    //               else {
    //                 send_to_slack('push delete', JSON.stringify(model), 'Success')
    //                 This.ok(model)
    //               }
    //             }
    //             else {
    //               if (model[0] == null) {
    //                 send_to_slack('push delete', JSON.stringify(model), 'Error')
    //                 send_Error('push delete', JSON.stringify({
    //                   statusCode: 404,
    //                   message: 'Does not exist'
    //                 }))
    //                 This.send({
    //                   statusCode: 404,
    //                   message: 'Does not exist'
    //                 })
    //               }
    //               else {
    //                 send_to_slack('pushnotification', JSON.stringify(model), 'Success')
    //                 This.ok(model[0])
    //               }
    //             }
    //           }
    //           else if (GR) {
    //             send_to_slack('pushnotification', JSON.stringify(model), 'Success')
    //             This.ok(model)
    //           }
    //           else {
    //             send_to_slack('pushnotification', JSON.stringify(model), 'Success')
    //             This.ok(model[0])
    //           }
    //         }
    //       }
    //     });
    //   }
    // }
    // else {
    //   if (GR) {
    //     if (model != null)
    //       This.ok(model)
    //     else {
    //       This.error('Not found')
    //     }
    //   }
    //   else {
    //     if (model.length > 0)
    //       This.ok(model[0])
    //     else {
    //       This.error('Not found')
    //     }
    //   }
    // }
  }

  instance.decorate('db', mongoose)
  instance.decorate('model', function (name, schema) {
    return mongoose.model(name, new mongoose.Schema(schema, { timestamps: true }))
  })

  ///////////////////////////////////////////

  function Ready_to_update(one, user, TAXES, taxes, products, reply) {
    for (let i = 0; i < taxes.length; i++) {
      var tax = taxes[i]
      if (tax) {
        instance.settingsTaxes.findOneAndUpdate({ _id: tax._id }, { $set: tax }, (err, doc) => {
          if (err) {
            send_to_slack('update', 'settingstaxes', 'Error')
            reply.error("Error on updating taxes")
          }
          else {
            if (doc) {
              if (i + 1 == taxes.length) {
                products = removeFromArray(products, undefined)

                if (products.length > 0) {
                  for (let j = 0; j < products.length; j++) {
                    var product = products[j]
                    instance.goodsSales.findOneAndUpdate({ _id: product._id }, { $set: product }, (err, doc) => {
                      if (err) {
                        reply.error('Error on updsting goods')
                      }
                      else {
                        if (doc) {
                          if (j + 1 == products.length) {
                            doPretty(one, 105, TAXES, user, 'update', reply)
                          }
                        }
                        else {
                          reply.error('goods not found')
                        }
                      }
                    })
                  }
                }
                else {
                  doPretty(one, 105, TAXES, user, 'update', reply)
                }

              }
            }
            else {
              reply.error('tax not found')
            }
          }
        })

      }
    }
  }

  function Taxes_Update(request, model, user, reply, handler = Ready_to_update) {
    var ids = request.body.products
    var unchecked_ids = request.body.un_products
    instance.settingsTaxes.findOne({
      organization: user.organization,
      name: request.body.name,
      tax: request.body.tax
    }, (err, taaxx) => {
      if (err) {
        reply.error('Error on updating')
        instance.send_Error('finding tax', JSON.stringify(err))
      }
      else {
        var valid = false
        if (taaxx) {
          if (taaxx._id == request.params.id) {
            valid = true
          }
        }
        else {
          valid = true
        }
        if (valid == false) {
          reply.send({
            statusCode: 411,
            message: "Allready exist"
          })
        }
        else {
          model.updateOne({
            _id: request.params.id
          }, {
            $set: request.body
          }, (err) => {
            if (err) {
              reply.error('Error on updating')
              instance.send_Error('updating goods for tax', JSON.stringify(err))
            }
            else {
              instance.goodsSales.updateMany({
                organization: user.organization,
                _id: {
                  $in: unchecked_ids
                }
              }, {
                $set: {
                  "taxes.$[elem].available": false,
                  last_updated: new Date().getTime(),
                  last_stock_updated: new Date().getTime()
                }
              }, {
                arrayFilters: [{
                  "elem.tax_id": {
                    $eq: instance.ObjectId(request.params.id)
                  },
                  'elem.available': {
                    $eq: true
                  }
                }]
              }, (err) => {
                if (err) {
                  reply.error('Error on updating')
                  instance.send_Error('updating goods for tax', JSON.stringify(err))
                }
                else {
                  instance.goodsSales.updateMany({
                    _id: {
                      $in: ids
                    }
                  }, {
                    $set: {
                      "taxes.$[elem].available": true,
                      last_updated: new Date().getTime(),
                      last_stock_updated: new Date().getTime()
                    }
                  }, {
                    arrayFilters: [{
                      "elem.tax_id": {
                        $eq: instance.ObjectId(request.params.id)
                      }
                    }]
                  }, (err, result) => {

                    if (err) {
                      reply.error('Error on updating')
                      instance.send_Error('updating goods for tax', JSON.stringify(err))
                    }
                    else {
                      instance.settingsTaxes.findOne({
                        _id: request.params.id
                      }, { services: 0 }, (_, tax) => {
                        if (tax) {
                          try {
                            tax = tax.toObject()
                          }
                          catch (error) {
                            instance.send_Error('to Object', error.message)
                          }
                          tax.products = []
                          reply.ok(tax)
                        }
                        else {
                          reply.error('tax not found')
                        }
                      })
                    }
                  })
                }
              })
            }
          })
        }
      }
    })
  }

  function taxToSave(user, taxes, This, empty, one) {
    var TT = true
    var Answer = empty
    instance.settingsTaxes.insertMany(taxes, (err, result) => {
      if (err) {
        This.error('Error on creating taxes')
      }
      else {
        if (result) {
          for (const tax of result) {
            for (const product of tax.products) {
              product.taxes.push(tax._id)
              var db = mongoose.connection;
              var collection = db.collection('goodssales')
              collection.findOneAndUpdate({ _id: product._id }, { $set: { taxes: product.taxes } }, (err, doc) => {
                if (err) {
                  This.error('Error on updating Product')
                }
                Answer.push(tax)
                if (Answer.length == result.length) {
                  if (one)
                    pushnotification(105, Answer, user, 'create', This, false)
                  else
                    pushnotification(105, Answer, user, 'create', This, true)
                }
              })
            }
            if (Answer.length == result.length) {
              if (one)
                pushnotification(105, Answer, user, 'create', This, GR = false)
              else
                pushnotification(105, Answer, user, 'create', This, GR = true)
            }
          }
        }
        else {
          This.error('Error on saving data')
        }
      }
    })
  }


  function taxesCreate(request, user, tax, reply, handler = taxToSave) {
    instance.settingsTaxes.find({
      organization: user.organization,
      name: request.body.name,
      tax: request.body.tax
    }, (err, taxes) => {
      if (taxes != null) {
        if (taxes.length > 0) {
          reply.send({
            statusCode: 411,
            message: 'Allready exist'
          })
        }
        else {
          instance.goodsSales.find({
            _id: {
              $in: request.body.products
            }
          }, (err, goods) => {
            request.body.organization = user.organization
            instance.services.find({
              organization: user.organization
            }, (err, services) => {
              if (services == null) {
                services = []
              }
              var taxModel = new instance.settingsTaxes(request.body)
              if (request.headers['accept-service'] != undefined) {
                taxModel.services = []
                for (var s of services) {
                  taxModel.services.push({
                    service: instance.ObjectId(s._id),
                    available: false
                  })
                  if (s._id + '' == '' + request.headers['accept-service']) {
                    if (taxModel.services[taxModel.services.length - 1])
                      taxModel.services[taxModel.services.length - 1].available = true
                  }
                }
              }
              else {
                var serviceObj = {}
                if (taxModel.services) {
                  if (taxModel.services.length > 0) {
                    for (var s of taxModel.services) {
                      if (s)
                        serviceObj[s.service] = s.available
                    }
                  }
                }
                taxModel.services = []
                for (var s of services) {
                  taxModel.services.push({
                    service: instance.ObjectId(s._id),
                    service_name: s.name,
                    available: serviceObj[s._id] ? true : false
                  })
                }
              }
              taxModel.save((err, result) => {
                if (err) {
                  reply.error('Error on saving')
                  instance.send_Error('creating tax', JSON.stringify(err))
                }
                else {
                  var send_goods = []
                  for (var g of goods) {
                    try {
                      g = g.toObject()
                    }
                    catch (error) {
                      instance.send_Error('to Object', error.message)
                    }
                    var taxes = [result._id]
                    for (var t of g.taxes) {
                      if (t)
                        if (t.available) {
                          taxes.push(t.tax_id)
                        }
                    }
                    for (var s of g.services) {
                      if (s.service + '' == request.headers['accept-service']) {
                        g.in_stock = s.in_stock
                      }
                    }
                    g.taxes = taxes
                    send_goods.push(g)
                  }
                  if (result) {
                    try {
                      result = result.toObject()
                    }
                    catch (error) {
                      instance.send_Error('to Object', error.message)
                    }
                    result.products = send_goods
                    reply.ok(result)
                    instance.push_to_organization(105, user.organization)
                    instance.settingsTaxes.find({
                      organization: user.organization
                    }, (err, TAXES) => {
                      if (TAXES == null) {
                        TAXES = []
                      }
                      instance.goodsSales.updateMany({
                        organization: user.organization
                      }, {
                        $push: {
                          taxes: {
                            tax_id: instance.ObjectId(taxModel._id),
                            available: false,
                            name: taxModel.name,
                            tax: taxModel.tax,
                            type: taxModel.type
                          }
                        }
                      }, (err) => {
                        instance.goodsSales.updateMany({
                          _id: {
                            $in: request.body.products
                          }
                        }, {
                          $set: {
                            "taxes.$[elem].available": true
                          }
                        }, {
                          arrayFilters: [{
                            "elem.tax_id": {
                              $eq: instance.ObjectId(taxModel._id)
                            }
                          }]
                        }, (err, _) => {
                          if (err) {
                            instance.send_Error('updating goods2', JSON.stringify(err))
                          }
                        })
                        if (err) {
                          instance.send_Error('updating goods1', JSON.stringify(err))
                        }
                      })
                    })
                  }
                }
              })
            })
          })
        }
      }
    })
  }
  // pushnotification('tax', TAXES, user, 'update', reply)
  function doPretty(one, TYPE, TAXES, user, method, reply) {
    var product_used = {}
    var product_index = []
    var product_taxes = []
    var ind = 0
    var empty = []
    for (const taxes of TAXES) {
      if (taxes.products.length == 0) {
        empty.push(taxes)
      }
      for (const product_id of taxes.products) {
        if (product_used[product_id] == undefined) {
          product_used[product_id] = ind
          product_index.push(product_id)
          product_taxes.push({
            taxes: [taxes]
          })
          ind++
        } else {
          index = product_used[product_id]
          product_taxes[index].taxes.push(taxes)
        }
      }
    }
    instance.goodsSales.find({ _id: { $in: product_index } }, (error, products) => {
      if (error) {
        reply.error('Error on finding Products')
      } else {
        if (products) {
          var final_taxes = []
          var inde = 0
          var taxes_index = {}
          for (const product of products) {
            index = product_used[product._id]
            for (const taxessss of product_taxes[index].taxes) {
              if (taxes_index[taxessss._id] == undefined) {
                final_taxes.push({
                  _id: taxessss._id,
                  name: taxessss.name,
                  tax: taxessss.tax,
                  organization: taxessss.organization,
                  service: taxessss.service,
                  type: taxessss.type,
                  option: taxessss.option,
                  products: [product]
                })
                taxes_index[taxessss._id] = inde
                inde++
              } else {
                final_taxes[taxes_index[taxessss._id]].products.push(product)
              }
            }
          }
          var Answer = final_taxes.concat(empty)
          if (one) {
            pushnotification(TYPE, Answer, user, method, reply, GR = false)
          }
          else {
            pushnotification(TYPE, Answer, user, method, reply, GR = true)
          }
        } else {
          reply.error('Error on finding Products')
        }
      }
    })
  }

  function UpdateGoodsSales(request, user, model, taxes, reply) {
    var tax = taxes[0]
    var a = []
    for (var tax of taxes) {
      a.push(1)
      instance.settingsTaxes.deleteOne({
        _id: tax._id
      }, (err, result) => {
        if (result) {
          instance.goodsSales.updateMany({
            organization: user.organization
          }, {
            $set: {
              last_updated: new Date().getTime(),
              last_stock_updated: new Date().getTime()
            },
            $pull: {
              "taxes": {
                "tax_id": {
                  $eq: instance.ObjectId(tax._id)
                }
              }
            }
          }, (err, _) => {
            if (err) {
              instance.send_Error('deleting tax update item', JSON.stringify(err))
            }
            if (a.length == taxes.length) {
              reply.ok(tax)
              instance.push_to_organization(101, user.organization)
              instance.push_to_organization(105, user.organization)
            }
          })
        }
        else {
          reply.error('Not found')
        }
      })
    }
  }

  ///////////////////////////////////////////

  async function forReceiptToWorkCreate(request, user, receipt, is_refund = false) {
    var objects = receipt.sold_item_list
    if (objects == undefined) {
      objects = []
    }

    var pro_ids = []
    var pro_index = {}
    const sold_by_types = {}

    for (var obj of objects) {
      try {
        obj = obj.toObject()
      } catch (error) { }
      if (obj.product_id != null && obj.product_id != "") {
        pro_ids.push(obj.product_id)
        if (obj.sold_item_type == 'box_item') {
          if (typeof sold_by_types[obj.product_id] != typeof 5) {
            sold_by_types[obj.product_id] = 0
          }
          if (is_refund) {
            obj.value *= (-1)
          }
          sold_by_types[obj.product_id] += obj.value
          if (!pro_index[obj.product_id]) {
            pro_index[obj.product_id] = 0
          }
        }
        else if (obj.sold_item_type == 'pcs_item') {
          if (typeof sold_by_types[obj.product_id] != typeof 5) {
            sold_by_types[obj.product_id] = 0
          }
          if (is_refund) {
            obj.value *= (-1)
            obj.reminder *= (-1)
          }
          sold_by_types[obj.product_id] += (obj.value * obj.count_by_type) + obj.reminder
          if (!pro_index[obj.product_id]) {
            pro_index[obj.product_id] = 0
          }
        }
        else {
          if (pro_index[obj.product_id] == undefined) {
            if (is_refund) {
              pro_index[obj.product_id] = (-1) * obj.value
            }
            else {
              pro_index[obj.product_id] = obj.value
            }
          }
          else {
            if (is_refund) {
              pro_index[obj.product_id] -= obj.value
            }
            else {
              pro_index[obj.product_id] += obj.value
            }
          }
        }
      }
    }

    ////'update_in_stock_of_sold_items', (id, service_id, in_stock, user, receipt, REASON = 'other', request)
    pro_ids = [...new Set(pro_ids)]
    for (var r of pro_ids) {
      await instance.update_in_stock_of_sold_items(r, request.headers['accept-service'], pro_index[r] * (-1), user, receipt, 'other', request, sold_by_types[r])
    }
  }
  instance.decorate('forReceiptToWorkCreate', forReceiptToWorkCreate)

  function findCollectionName(name) {
    var TYPE = 0
    switch (name) {
      case 'goodssales':
        TYPE = 101
        break;
      case 'receipts':
        TYPE = 102
        break;
      case 'goodscategories':
        TYPE = 103
        break;
      case 'goodsdiscounts':
        TYPE = 104
        break;
      case 'settingstaxes':
        TYPE = 105
        break;
      case 'shifts':
        TYPE = 106
        break;
      case 'tickets':
        TYPE = 107
        break
      case 'item_datas':
        TYPE = 107
        break
      case 'inoneservices':
        TYPE = 109
        break
      case 'goodssections':
        TYPE = 110
        break
      case 'employeeslists':
      case 'inonebos':
      case 'inoneadmins':
      case 'users':
        TYPE = 111
        break
      case 'paysbuttons':
        TYPE = 112
        break
      case 'tables':
        TYPE = 113
        break
      case 'orders':
        TYPE = 114
        break
      case 'order_items':
        TYPE = 114
        break
    }
    return TYPE
  }
  instance.decorate('findCollectionName', findCollectionName)

  function category_count(method, models, old_product = null, one = true, token = null, service_id = null) {
    if (method == 'create' || method == 'delete') {
      var index_category = {}
      var categories = []
      for (var good of models) {
        if (good.category != undefined) {
          if (index_category[good.category] == undefined) {
            index_category[good.category] = 1
            categories.push(good.category)
          }
          else {
            index_category[good.category]++
          }
        }
      }
      for (let i = 0; i < categories.length; i++) {
        instance.goodsCategory.findOne({ _id: categories[i] }, (err, category) => {
          if (err) {
            send_Error('goods sales create error category find', JSON.stringify(err))
          }
          else {
            if (category) {
              if (method == 'create')
                category.count += index_category[category._id]
              else
                category.count -= index_category[category._id]
              instance.goodsCategory.updateOne({ _id: category._id }, { $set: { count: category.count } }, (err, result) => {
                if (err) {
                  send_Error('category update error category find', JSON.stringify(err))
                }
                else {
                  if (result) {
                    send_to_slack('category update', 'goods category updated', 'Success')
                  }
                  else {
                    send_Error('category update ', 'category -> ' + JSON.stringify(result))
                  }
                }
              })
            }
          }
        })
      }
    }
    else if (method == 'update') {
      if (one) {
        var A = false
        if (models != undefined && old_product != undefined) {
          A = models.category == old_product.category
        }
        if (!A) {
          if (old_product != undefined) {
            if (old_product.category != undefined) {
              if (old_product.category != "")
                instance.goodsCategory.findOne({ _id: old_product.category }, (err, category) => {
                  if (err) {
                    send_Error('goods sales update category find', JSON.stringify(err))
                  } else {
                    if (category) {
                      category.count--
                      instance.goodsCategory.updateOne({ _id: category._id }, { $set: { count: category.count } }, (err, result) => {
                        if (err) {
                          send_Error('goods sales update category update ', JSON.stringify(err))
                        }
                        else {
                          if (result) {
                            send_to_slack('category update', 'goods category updated', 'Success')
                          }
                          else {
                            send_Error('category update ', 'category -> ' + JSON.stringify(result))
                          }
                        }
                      })
                    }
                    else {
                      send_Error('goods sales update ', 'category -> null')
                    }
                  }
                })
            }
          }
          if (models != undefined) {
            if (models.category != undefined) {
              if (models.category != "") {
                instance.goodsCategory.findOne({ _id: models.category }, (err, category) => {
                  if (err) {
                    send_Error('goods sales update category find', JSON.stringify(err))
                  } else {
                    if (category) {
                      category.count++
                      instance.goodsCategory.updateOne({ _id: category._id }, { $set: { count: category.count } }, (err, result) => {
                        if (err) {
                          send_Error('goods sales update category update ', JSON.stringify(err))
                        }
                        else {
                          if (result) {
                            send_to_slack('category update', 'goods category updated', 'Success')
                          }
                          else {
                            send_Error('category update ', 'category -> ' + JSON.stringify(result))
                          }
                        }
                      })
                    }
                    else {
                      send_Error('goods sales update ', 'category -> null')
                    }
                  }
                })
              }
              else {
                instance.goodsCategory.findOne({ is_other: true, service: models.service }, (err, category) => {
                  if (err) {
                    send_Error('goods sales update category find', JSON.stringify(err))
                  } else {
                    if (category) {
                      category.count++
                      instance.goodsCategory.updateOne({ _id: category._id }, { $set: { count: category.count } }, (err, result) => {
                        if (err) {
                          send_Error('goods sales update category update ', JSON.stringify(err))
                        }
                        else {
                          if (result) {
                            send_to_slack('category update', 'goods category updated', 'Success')
                          }
                          else {
                            send_Error('category update ', 'category -> ' + JSON.stringify(result))
                          }
                        }
                      })
                    }
                    else {
                      send_Error('goods sales update ', 'category -> null')
                    }
                  }
                })
              }
            }
          }
        }
      }
      else {
        if (models.length > 0) {
          instance.goodsCategory.findOne({ is_other: true, service: service_id }, (err, categ) => {
            if (err || categ == null) {
              if (err)
                send_Error('finding otehr category', JSON.stringify(err))
            }
            else {
              var CATEGORY = {}
              var changing_category = []
              for (var model of models) {
                if (model.category == "") {
                  model.category = categ._id
                }
                changing_category.push(model.category)
                if (CATEGORY[model.category] == undefined) {
                  CATEGORY[model.category] = 1
                }
                else {
                  CATEGORY[model.category]++
                }
              }
              var old_categories_ids = []
              for (var cat of old_product) {
                old_categories_ids.push(cat)
                if (CATEGORY[cat] == undefined) {
                  CATEGORY[cat] = -1
                }
                else {
                  CATEGORY[cat]--
                }
              }
              changing_category = changing_category.concat(old_categories_ids)
              changing_category = [...new Set(changing_category)]
              var changing_category_real = []
              for (var ch of changing_category) {
                if (ch != null && ch != "")
                  changing_category_real.push(ch)
              }
              instance.goodsCategory.find({ _id: { $in: changing_category_real } }, (err, categories) => {
                if (err) {
                  send_Error('category count', JSON.stringify(err))
                }
                else {
                  var Answer = []
                  var CATEGORIES = []
                  for (var category of categories) {
                    category.count += CATEGORY[category._id]
                    CATEGORIES.push(category)
                  }
                  for (let k = 0; k < CATEGORIES.length; k++) {
                    var category = categories[k]
                    category.is_group = true
                    axios.defaults.headers.common['Authorization'] = token;
                    axios.defaults.headers.common['Accept-Version'] = '1.0.0';
                    axios.defaults.headers.post['Content-Type'] = 'application/json';
                    axios.defaults.data = category
                    axios.post(BASE_URL + '/goods/category/update/' + category._id, category)
                      .then(function (response) {
                        if (response.data.data != null)
                          Answer.push(response.data.data)
                        if (!response.data.data) {
                          Answer.push({})
                        }
                      })
                      .catch(function (error) {
                        send_to_slack('update_group', 'category update', 'Error')
                        send_Error("category count update", JSON.stringify(error))
                      })
                      .then(function () {
                        if (Answer.length == categories.length) {
                          send_to_slack('update_group', JSON.stringify(Answer), 'Success')
                        }
                      });
                  }
                }
              })
            }
          })
        }
      }
    }
  }

  function section_count(method, models, old_product = null, one = true, token = null, service_id = null) {
    if (method == 'create' || method == 'delete') {
      var index_section = {}
      var sections = []
      for (var good of models) {
        if (good.section != undefined) {
          if (index_section[good.section] == undefined) {
            index_section[good.section] = 1
            sections.push(good.section)
          }
          else {
            index_section[good.section]++
          }
        }
      }
      for (let i = 0; i < sections.length; i++) {
        instance.goodsSection.findOne({ _id: sections[i] }, (err, section) => {
          if (err) {
            send_Error('goods sales create error section find', JSON.stringify(err))
          }
          else {
            if (section) {
              if (method == 'create')
                section.count += index_section[section._id]
              else
                section.count -= index_section[section._id]
              instance.goodsSection.updateOne({ _id: section._id }, { $set: { count: section.count } }, (err, result) => {
                if (err) {
                  send_Error('section update error section find', JSON.stringify(err))
                }
                else {
                  if (result) {
                    send_to_slack('section update', 'goods section updated', 'Success')
                  }
                  else {
                    send_Error('section update ', 'section -> ' + JSON.stringify(result))
                  }
                }
              })
            }
          }
        })
      }
    }
    else if (method == 'update') {
      if (one) {
        var A = false
        if (models != undefined && old_product != undefined) {
          A = models.section == old_product.section
        }
        if (!A) {
          if (old_product != undefined) {
            if (old_product.section != undefined) {
              if (old_product.section != "")
                instance.goodsSection.findOne({ _id: old_product.section }, (err, section) => {
                  if (err) {
                    send_Error('goods sales update section find', JSON.stringify(err))
                  } else {
                    if (section) {
                      section.count--
                      instance.goodsSection.updateOne({ _id: section._id }, { $set: { count: section.count } }, (err, result) => {
                        if (err) {
                          send_Error('goods sales update section update ', JSON.stringify(err))
                        }
                        else {
                          if (result) {
                            send_to_slack('section update', 'goods section updated', 'Success')
                          }
                          else {
                            send_Error('section update ', 'section -> ' + JSON.stringify(result))
                          }
                        }
                      })
                    }
                    else {
                      send_Error('goods sales update ', 'section -> null')
                    }
                  }
                })
            }
          }
          if (models != undefined) {
            if (models.section != undefined) {
              if (models.section != "") {
                instance.goodsSection.findOne({ _id: models.section }, (err, section) => {
                  if (err) {
                    send_Error('goods sales update section find', JSON.stringify(err))
                  } else {
                    if (section) {
                      section.count++
                      instance.goodsSection.updateOne({ _id: section._id }, { $set: { count: section.count } }, (err, result) => {
                        if (err) {
                          send_Error('goods sales update section update ', JSON.stringify(err))
                        }
                        else {
                          if (result) {
                            send_to_slack('section update', 'goods section updated', 'Success')
                          }
                          else {
                            send_Error('section update ', 'section -> ' + JSON.stringify(result))
                          }
                        }
                      })
                    }
                    else {
                      send_Error('goods sales update ', 'section -> null')
                    }
                  }
                })
              }
              else {
                instance.goodsSection.findOne({ is_other: true, service: models.service }, (err, section) => {
                  if (err) {
                    send_Error('goods sales update section find', JSON.stringify(err))
                  } else {
                    if (section) {
                      section.count++
                      instance.goodsSection.updateOne({ _id: section._id }, { $set: { count: section.count } }, (err, result) => {
                        if (err) {
                          send_Error('goods sales update section update ', JSON.stringify(err))
                        }
                        else {
                          if (result) {
                            send_to_slack('section update', 'goods section updated', 'Success')
                          }
                          else {
                            send_Error('section update ', 'section -> ' + JSON.stringify(result))
                          }
                        }
                      })
                    }
                    else {
                      send_Error('goods sales update ', 'section -> null')
                    }
                  }
                })
              }
            }
          }
        }
      }
      else {
        if (models.length > 0) {
          instance.goodsSection.findOne({ is_other: true, service: service_id }, (err, sect) => {
            if (err || sect == null) {
              if (err)
                send_Error('finding otehr section', JSON.stringify(err))
            }
            else {
              var SECTION = {}
              var changing_section = []
              for (var model of models) {
                if (model.section == "") {
                  model.section = sect._id
                }
                changing_section.push(model.section)
                if (SECTION[model.section] == undefined) {
                  SECTION[model.section] = 1
                }
                else {
                  SECTION[model.section]++
                }
              }
              var old_sections_ids = []
              for (var sec of old_product) {
                old_sections_ids.push(sec)
                if (SECTION[sec] == undefined) {
                  SECTION[sec] = -1
                }
                else {
                  SECTION[sec]--
                }
              }
              changing_section = changing_section.concat(old_sections_ids)
              changing_section = [...new Set(changing_section)]
              var changing_section_real = []
              for (var ch of changing_section) {
                if (ch != null && ch != "")
                  changing_section_real.push(ch)
              }
              instance.goodsSection.find({ _id: { $in: changing_section_real } }, (err, sections) => {
                if (err) {
                  send_Error('section count', JSON.stringify(err))
                }
                else {
                  var Answer = []
                  var SECTIONS = []
                  for (var section of sections) {
                    section.count += SECTION[section._id]
                    SECTIONS.push(section)
                  }
                  for (let k = 0; k < SECTIONS.length; k++) {
                    var section = sections[k]
                    section.is_group = true
                    axios.defaults.headers.common['Authorization'] = token;
                    axios.defaults.headers.common['Accept-Version'] = '1.0.0';
                    axios.defaults.headers.post['Content-Type'] = 'application/json';
                    axios.defaults.data = section
                    axios.post(BASE_URL + '/goods/section/update/' + section._id, section)
                      .then(function (response) {
                        if (response.data.data != null)
                          Answer.push(response.data.data)
                        if (!response.data.data) {
                          Answer.push({})
                        }
                      })
                      .catch(function (error) {
                        send_to_slack('update_group', 'section update', 'Error')
                        send_Error("section count update", JSON.stringify(error))
                      })
                      .then(function () {
                        if (Answer.length == sections.length) {
                          send_to_slack('update_group', JSON.stringify(Answer), 'Success')
                        }
                      });
                  }
                }
              })
            }
          })
        }
      }
    }
  }

  function update_shifts(user, receipts, Taxes) {
    var gross_sales = 0.0
    var refunds = 0.0
    var refunds_cash = 0.0
    var discounts = 0.0
    var net_sales = 0.0
    var cash = 0.0
    var taxes = 0.0
    for (var rec of receipts) {
      for (var pro of rec.sold_item_list) {
        if (Array.isArray(pro.taxes)) {
          for (var tax of pro.taxes) {
            if (Taxes[tax] != null || Taxes[tax] != undefined) {
              if (Taxes[tax].type == 'include') {
                taxes += (pro.value * pro.price) / (1 + Taxes[tax].tax / 100.0) * Taxes[tax].tax / 100.0
              }
              else {
                taxes += (pro.value * pro.price) * (Taxes[tax].tax / 100.0)
              }
            }
          }
        }
      }
    }
    if (taxes > 0) {
      var n = Math.round(Math.log10(taxes))
      taxes = parseFloat(taxes.toPrecision(n + 2))
    }
    for (var rec of receipts) {
      if (rec.is_refund == false || rec.is_refund == undefined) {
        gross_sales += rec.total_price;
        if (rec.discount)
          for (const __dis of rec.discount) {
            if (__dis.type == 'percentage') {
              discounts += __dis.value * rec.total_price / 100;
            }
            else {
              discounts += __dis.value;
            }
          }
      }
      else {
        refunds += rec.total_price;
        if (rec.discount)
          for (const __dis of rec.discount) {
            if (__dis.type == 'percentage') {
              discounts -= __dis.value * rec.total_price / 100;
            }
            else {
              discounts -= __dis.value;
            }
          }
      }
      for (var pay of rec.payment) {
        if (pay.name == 'cash' && rec.is_refund == false) {
          cash += pay.value
        } else if (pay.name == 'cash') {
          refunds_cash += pay.value
        }
      }
      if (rec.is_refund) {
        refunds += rec.total_price
      }
    }
    net_sales = gross_sales - (refunds + discounts)

    instance.Shifts.findOne({ organization: user.organization, service: user.service, by_whom: user._id, closing_time: 0 }, (err, shift) => {
      if (shift) {
        shift.cash_drawer.cash_payment += cash
        shift.cash_drawer.cash_refund += refunds_cash
        shift.cash_drawer.exp_cash_amount = shift.cash_drawer.starting_cash + shift.cash_drawer.cash_payment - shift.cash_drawer.cash_refund + shift.cash_drawer.paid_in - shift.cash_drawer.paid_out
        shift.cash_drawer.act_cash_amount = shift.cash_drawer.exp_cash_amount
        shift.sales_summary.gross_sales += gross_sales
        shift.sales_summary.refunds += refunds
        shift.sales_summary.discounts += discounts
        shift.sales_summary.net_sales += net_sales
        shift.sales_summary.cash += cash
        shift.sales_summary.taxes += taxes
        instance.Shifts.updateOne({ _id: shift._id }, { $set: shift }, (err, doc) => {
          if (err) {
            send_Error('update shift', JSON.stringify(err))
          }
          else {
            send_to_slack('update shift', 'shifts', 'Success')
          }
        })
      }
    })
  }

  function get_taxes(user, receipts, handler = update_shifts) {
    var Taxes = {}
    var taxes = []
    for (var re of receipts) {
      for (var item of re.sold_item_list) {
        taxes = taxes.concat(item.taxes)
        taxes = [...new Set(taxes)]
      }
    }
    if (taxes.length == 0) {
      handler(user, receipts, {})
    }
    else {
      instance.settingsTaxes.find({ _id: { $in: taxes } }, (err, TAXES) => {
        if (err) {
          send_Error('to find taxes for shifts', JSON.stringify(err))
        }
        else {
          if (TAXES == null) {
            TAXES = []
          }
          for (var tax of TAXES) {
            if (tax != null || tax != undefined) {
              if (tax._id != null || tax._id != undefined) {
                Taxes[tax._id] = {
                  type: tax.type,
                  tax: tax.tax
                }
              }
            }
          }
          handler(user, receipts, Taxes)
        }
      })
    }
  }

  function create_shifts_helper(request, user, models, reply, is_group) {
    var opening_times = []
    for (var m of models) {
      opening_times.push(m.opening_time)
    }
    instance.posDevices.findOne({
      _id: request.headers['accept-id']
    }, (err, device) => {
      if (device) {
        instance.Shifts.find({
          $and: [
            {
              opening_time: {
                $in: opening_times
              }
            },
            {
              pos_id: request.headers['accept-id']
            }
          ]
        }, (err, shifts) => {
          if (err || shifts == undefined) {
            shifts = []
          }
          var save = []
          var saved = []
          var shiftObj = {}
          for (var sh of shifts) {
            shiftObj[sh.opening_time] = sh
          }
          var idObj = {}
          for (var m of models) {
            m.pos = device.name
            m.pos_id = device._id
            if (shiftObj[m.opening_time] == undefined) {
              idObj[m.old_id] = m._id
              save.push(m)
            }
            else {
              saved.push(shiftObj[m.opening_time])
            }
          }
          for (let i = 0; i < save.length; i++) {
            save[i] = JSON.parse(JSON.stringify(save[i]))
            for (let j = 0; j < save[i].Pays.length; j++) {
              save[i].Pays[j].shift_id = idObj[save[i].Pays[j].shift_id]
              save[i].Pays[j].created_shift_id = idObj[save[i].Pays[j].created_shift_id]
            }
            delete save[i]._id
          }

          instance.Shifts.insertMany(save, (err, result) => {
            if (err) {
              instance.send_Error('createshifthelper', JSON.stringify(err))
              reply.error('Error on creating')
            }
            else {
              if (result) {
                if (result == null) {
                  result = []
                }
                result = result.concat(saved)
                if (result.length > 0) {
                  if (is_group) {
                    reply.ok(result)
                  }
                  else {
                    reply.ok(result[0])
                  }
                }
                else {
                  reply.error('Error on creating shift')
                }
              }
              else {
                reply.error('Nothing to save')
              }
            }
          })
        })
      }
      else {
        reply.error('Device not found')
      }
    })
  }

  function subtrack_or_add_products(is_group, request, user, reply, tickets, item_datas) {
    if (tickets != null) {
      var withoutids = []
      var delete_item_ids = []
      for (var t of tickets) {
        t.offline_id = t._id + request.headers['accept-id']
        delete t._id
        var item_datawithoutids = []
        if (t.item_data == null || t.item_data == undefined || t.item_data.length == undefined) {
          t.item_data = []
        }
        for (var itd of t.item_data) {
          delete_item_ids.push(itd._id)
          delete itd._id
          item_datawithoutids.push(itd)
        }
        t.item_data = item_datawithoutids
        withoutids.push(t)
      }
      tickets = withoutids
      var tickets_models = []
      var item_datas_models = []
      for (var tic of tickets) {
        var tic_model = new instance.Tickets(
          Object.assign({
            organization: user.organization,
            service: user.service
          }, tic)
        )
        if (tic.item_data == null) {
          tic.item_data = []
        }
        for (var itd of tic.item_data) {
          if (itd.ticket_id == '' || itd.ticket_id == undefined || itd.ticket_id.includes('-') || itd.ticket_id.length != 24) {
            itd.ticket_id = tic_model._id
          }
          itd.offline_ticket_id = tic.offline_id
          var itd_model = new instance.Item_Data(
            Object.assign({
              organization: user.organization,
              service: user.service
            }, itd))
          item_datas_models.push(itd_model)
        }
        if (tic_model.waiter_id == undefined) {
          tic_model.waiter_name = user.name
          tic_model.waiter_id = user._id
        }
        tic_model.item_data = undefined
        tickets_models.push(tic_model)
      }
      instance.Tickets.insertMany(tickets_models, (err, tics) => {
        if (err) {
          instance.send_Error('inserting ticket', JSON.stringify(err))
          reply.error('Error on creating ticket')
        }
        else {
          if (tics == null) {
            tics = []
          }
          instance.Item_Data.insertMany(item_datas_models, (err, itds) => {
            if (err) {
              reply.error('Error on creating item data')
            }
            else {
              if (itds == null) {
                itds = []
              }
              var Answer = []
              var helpObj = {}
              for (var itd of itds) {
                if (helpObj[itd.ticket_id] == undefined) {
                  helpObj[itd.ticket_id] = [itd]
                }
                else {
                  helpObj[itd.ticket_id].push(itd)
                }
              }
              for (var tic of tics) {
                tic.item_data = helpObj[tic._id]
                Answer.push(tic)
              }
              instance.Item_Data.deleteMany({
                _id: {
                  $in: delete_item_ids
                }
              }, (err) => {
                reply.ok(Answer)
                instance.push_changes(request, 107)
                if (err) {
                  instance.send_Error('deleting item data', JSON.stringify(err))
                }
              })
              var tables = []
              var goods_obj = {}
              var goods_ids = []
              for (var a of Answer) {
                if (a.is_receipt_created == false) {
                  if (a.table_id != '') {
                    tables.push(a.table_id)
                  }
                }
                if (a.item_data == null) {
                  a.item_data = []
                }
                for (var it of a.item_data) {
                  goods_ids.push(it.product_id)
                  if (goods_obj[it.product_id] == undefined) {
                    goods_obj[it.product_id] = it.count
                  }
                  else {
                    goods_obj[it.product_id] += it.count
                  }
                }
              }
              tables = [...new Set(tables)]
              goods_ids = [...new Set(goods_ids)]
              instance.Tables.updateMany({ _id: { $in: tables } }, { $set: { is_empty: false } }, (err, _) => {
                if (err) {
                  instance.send_Error('updating Tables ', JSON.stringify(err))
                }
              })
            }
          })
        }
      })
    }
    else if (item_datas != []) {
      var item_datas2 = []
      for (var item of item_datas) {
        item.organization = user.organization
        item.service = user.service
        delete item._id
        item_datas2.push(item)
      }
      item_datas = item_datas2
      instance.Item_Data.insertMany(item_datas, (err, item_datass) => {
        if (err) {
          instance.send_Error('item data create', JSON.stringify(err))
          reply.error('Error on creating Item data')
        }
        else {
          if (item_datass == null) {
            item_datass = []
          }
          reply.ok(item_datass)
          instance.push_changes(request, 107)
        }
      })
    }
    else if (item_datas == null) {
      reply.error('Nothing to save')
    }
  }

  function subtrack_or_add_products_update(is_group, user, reply, item_datas) {
    var valid = false
    for (var item_data of item_datas) {
      valid = valid || (item_data._id == '' || item_data._id == null)
    }
    if (valid) {
      reply.error('id can\'t be null')
    }
    else {
      for (var item_data of item_datas) {
        instance.update_item_data(item_data)
      }
      reply.ok()
    }
  }

  function update_tables(table_ids) {
    instance.Tickets.find({ table_id: { $in: table_ids }, is_receipt_created: false }, (err, tickets) => {
      if (err) {
        instance.send_Error('tickets find', JSON.stringify(err))
      }
      var table_ids2 = []
      for (var ti of tickets) {
        table_ids2.push(ti.table_id)
      }
      var update_tables = []
      for (var tab of table_ids) {
        if (table_ids2.includes(tab) == false && tab != '') {
          update_tables.push(tab)
        }
      }
      instance.Tables.updateMany({ _id: { $in: update_tables } }, { $set: { is_empty: true } }, (err, _) => {
        if (err) {
          instance.send_Error('update tables', JSON.stringify(err))
        }
      })
    })
  }

  function delete_ticket_and_item_data(request, receipts = [], tables = [], user) {
    //pushnotification(107, {}, user, "delete", {}, false, false, true)
    var ticket_ids = []
    var offline_ids = []
    for (var rec of receipts) {
      if (rec.ticket_id != undefined && rec.ticket_id != null) {
        if (rec.ticket_id.includes('-') == false && rec.ticket_id != '') {
          ticket_ids.push(rec.ticket_id)
        }
        else {
          if (rec.ticket_id != '') {
            offline_ids.push(rec.ticket_id + request.headers['accept-id'])
          }
        }
      }
    }
    instance.Tickets.find({ $or: [{ _id: { $in: ticket_ids } }, { offline_id: { $in: offline_ids } }] }, (err, tickets) => {
      if (err) {
        instance.send_Error('tickets find', JSON.stringify(err))
      }
      if (tickets == null) {
        tickets = []
      }
      var table_ids = []
      for (var t of tickets) {
        table_ids.push(t.table_id)
      }
      instance.Tickets.deleteMany({ $or: [{ _id: { $in: ticket_ids } }, { offline_id: { $in: offline_ids } }] }, (err, _) => {
        if (err) {
          instance.send_Error('Tickets delete', JSON.stringify(err))
        }
        update_tables(table_ids)
      })
    })
    instance.Item_Data.deleteMany({ $or: [{ ticket_id: { $in: ticket_ids } }, { offline_ticket_id: { $in: offline_ids } }] }, (err, _) => {
      if (err) {
        instance.send_Error('Item Data delete', JSON.stringify(err))
      }
    })
  }
  instance.decorate('delete_ticket_and_item_data', delete_ticket_and_item_data)
  ////////////createway

  instance.decorateReply('create', function (request, model, user, options) {
    if (model.collection.name == 'goodssales') {
      request.body.last_updated = new Date().getTime()
      request.body.last_stock_updated = new Date().getTime()
      request.body.last_price_change = new Date().getTime()
      if (request.body.sale_is_avialable == "") {
        request.body.sale_is_avialable = false
      }
      if (request.body.representation_type == "") {
        delete request.body.representation_type
      }
      if (request.body.created_time == undefined) {
        request.body.created_time = new Date().getTime()
      }
      if (request.body.in_stock == '') {
        delete request.body.in_stock
      }
      if (request.body.representation == "") {
        delete request.body.representation
      }
      if (request.body.shape == "") {
        delete request.body.shape
      }
      if (request.body.is_composite_item == '') {
        request.body.is_composite_item == false
      }
      if (request.body.is_composite_item == false) {
        request.body.composite_items = []
      }
      // if(request.body.is_composite_item) {
      //   if(request.body.composite_items == null) {
      //     request.body.composite_items = []
      //   }
      //   var BBODY = request.body.composite_items
      //   var BODY = []
      //   for(let kk=0; kk<BBODY.length-1; kk++) {
      //     BODY.push({
      //       product_name: BBODY[kk].product_name,
      //       product_id: BBODY[kk + 1].product_id,
      //       quality: parseFloat(BBODY[kk].quality),
      //       cost: BBODY[kk].cost
      //     })
      //   }
      //   request.body.composite_items = BODY
      // }
    }
    if (options.public_search && request.headers['accept-user'] == 'QRCode') {
      if (request.body.table_id != '') {
        instance.Tables.findOne({ _id: request.body.table_id }, (err, table) => {
          if (err || table == null) {
            this.send({
              statusCode: 404,
              message: 'table not found'
            })
          }
          else {
            if (model.collection.name == 'feedbacks') {
              request.body.created_time = new Date().getTime()
            }
            if (model.collection.name == 'orders') {
              request.body.table_name = table.name
            }
            var $model = new model(
              Object.assign({
                organization: table.organization,
                service: table.service
              }, request.body)
            )
            $model.save((err, item) => {
              if (err) {
                this.error('Error on saving')
              }
              else {
                if (model.collection.name != 'orders') {
                  instance.pushnotification(findCollectionName(model.collection.name), {}, table.service)
                }
                this.ok(item)
              }
            })
          }
        })
      }
      else {
        this.send({
          statusCode: 404,
          message: 'table not found'
        })
      }
    }
    else if (options.public) {
      var $model = new model(request.body)
      if (model.collection.name == "accountmantreports") {
        instance.generate_auto_increment(request.body.accountmant_id, (n) => {
          $model.report_number = n + 1
          $model.save((error, item) => {
            if (error) {
              send_to_slack('create', $model.collection.name, 'Error')
              send_Error(request.raw.url, JSON.stringify(error))
              this.error('Error')
            } else {
              send_to_slack('create', $model.collection.name, 'Success')
              this.ok(item)
            }
          })
        })
      }
      else {
        $model.save((error, item) => {
          if (error) {
            send_to_slack('create', $model.collection.name, 'Error')
            send_Error(request.raw.url, JSON.stringify(error))
            this.error('Error')
          } else {
            send_to_slack('create', $model.collection.name, 'Success')
            this.ok(item)
          }
        })
      }
    }
    else {
      if (model.collection.name == 'printers') {
        if (request != undefined) {
          if (request.body != undefined) {
            request.body.pos_id = request.headers['accept-id']
          }
        }
      }
      if (!user) {
        this.error('Access')
      }
      else if (model.collection.name == 'receipts' && request.body.sold_item_list.length == 0 || request.body == undefined) {
        this.error('Nothing to save')
      }
      else {
        var service_id;
        if (user != null) {
          if (request.headers['accept-service'] != undefined) {
            service_id = request.headers['accept-service']
          }
          else {
            service_id = request.body.service
          }
        }
        else {
          service_id = request.body.service
        }
        if (request.body) {
          if (request.body.service != '' && request.body.service != null) {
            service_id = request.body.service
          }
        }
        if (request.headers['accept-service'] != '' && request.headers['accept-service'] != null) {
          service_id = request.headers['accept-service']
        }
        if (request.body._id == "" || request.body._id == null) {
          delete request.body._id;
        }
        if (model.collection.name == 'receipts') {
          var sold_item_list = []
          // request.body.pos_name = request.body.pos_id + ""
          request.body.created_time = new Date().getTime();
          request.body.pos_id = request.headers['accept-id'];
          request.body.service = request.headers['accept-service'];
          if (request.body.sold_item_list == undefined) {
            request.body.sold_item_list = []
          }
          for (var s of request.body.sold_item_list) {
            delete s._id
            sold_item_list.push(s)
          }
          request.body.sold_item_list = sold_item_list
          var payment = []
          if (request.body.payment == undefined) {
            request.body.payment = []
          }
          for (var p of request.body.payment) {
            delete p._id
            payment.push(p)
          }
          request.body.payment = payment
        }
        if (model.collection.name == 'tickets' || model.collection.name == 'item_datas') {
          if (model.collection.name == 'tickets') {
            subtrack_or_add_products(false, request, user, this, [request.body], null)
          }
          else {
            subtrack_or_add_products(false, request, user, this, null, [request.body])
          }
        }
        else {
          if (model.collection.name == "receipts") {
            if (request.body.cashier_id == undefined) {
              request.body.cashier_id = user._id
            }
            if (request.body.cashier_name == undefined) {
              request.body.cashier_name = user.name
            }
            if (request.body.cashier_name == undefined) {
              request.body.cashier_name = user.full_name
            }
            var IS_R = request.body.is_refund
            if (IS_R == undefined) {
              IS_R = false
            }
            if (request.body.ticket_id == "" || request.body.ticket_id == undefined) {
              instance.Receipts.findOne({
                organization: user.organization,
                service: service_id,
                date: request.body.date,
                receipt_no: request.body.receipt_no
              }, (err, receip) => {
                if (err) {
                  instance.send_Error('forReceiptToWorkCreate to find receipt', JSON.stringify(err))
                }
                else {
                  if (receip) {
                    var name = receip.cashier_name
                    if (name == undefined) {
                      name = receip.waiter_name
                    }
                    if (name == undefined) {
                      name = "NAME"
                    }
                    instance.send_Error('receipt allready exist', name)
                  }
                  else {
                    forReceiptToWorkCreate(request, user, request.body, IS_R)
                  }
                }
              })
            }
          }
          var added = {}
          // if(model.collection.name == 'receipts'){
          //   get_taxes(user, [request.body])
          // }
          if (model.collection.name == 'shifts') {
            added.by_whom = user._id
            added.by_whom_name = user.name
            added.service = service_id
          }
          request.body.old_id = request.body._id
          var $model = new model(
            Object.assign(
              request.body,
              added,
              {
                organization: user.organization,
              }
            )
          )
          if (model.collection.name == 'receipts') {
            for (let i = 0; i < $model.sold_item_list.length; i++) {
              $model.sold_item_list[i].receipt_id = $model._id
            }
          }
          if (model.collection.name == 'shifts') {
            if ($model.Pays == undefined) {
              $model.Pays = []
            }
            var Pays = []
            for (var pay of $model.Pays) {
              pay.shift_id = $model._id
              Pays.push(pay)
            }
            $model.Pays = Pays
          }
          if ($model.collection.name == 'settingstaxes') {
            taxesCreate(request, user, $model, this)
          }
          else {
            if ($model.collection.name == 'paysbuttons') {
              instance.paysButtons.find({
                organization: user.organization,
                service: request.body.service
              }, (err, buttons) => {
                if (err) {
                  this.error('Error on finding buttons')
                }
                else {
                  if (buttons == null) {
                    buttons = []
                  }
                  if (buttons.length > 5) {
                    this.error('buttons range error')
                  }
                  else {
                    if (request.body.name.length > 10) {
                      this.error('buttons length range error')
                    }
                    else if (request.body.type == undefined && request.body.name == undefined) {
                      this.error('Error on saving')
                    }
                    else {
                      $model.save((err, item) => {
                        if (err) {
                          instance.send_Error('creating button', JSON.stringify(err))
                          this.error('Error to save button')
                        }
                        else {
                          instance.push_to_organization(112, user.organization)
                          this.ok(item)
                        }
                      })
                    }
                  }
                }
              })
            }
            else if ($model.collection.name == 'posdevices') {
              var query = {
                organization: user.organization
              }
              query.service = service_id
              instance.posDevices.find(query, (err, len) => {
                if (err || len == null) {
                  if (err) {
                    instance.send_Error(request.raw.url, JSON.stringify(err))
                  }
                  this.error('Error on creating Device')
                }
                else {
                  var think = (len.length) % 26 + 65
                  var tt = parseInt(len.length / 26)
                  if (tt != 0) {
                    $model.check_id = String.fromCharCode(tt + 65) + String.fromCharCode(think)
                  }
                  else {
                    $model.check_id = String.fromCharCode(think)
                  }
                  $model.service_id = instance.ObjectId($model.service)
                  $model.save((err, item) => {
                    if (err) {
                      instance.send_Error(request.raw.url, JSON.stringify(err))
                      this.error('Error on creating device')
                    }
                    else {
                      this.ok(item)
                    }
                  })
                }
              })
            }
            else if ($model.collection.name == 'goodssales') {
              request.body.last_updated = new Date().getTime()
              request.body.last_stock_updated = new Date().getTime()
              instance.check_sku(request, user.organization, (result) => {
                if (result.success == 1) {
                  var created_time = request.body.created_time
                  if (created_time == undefined) {
                    created_time = new Date().getTime()
                  }
                  instance.goodsSales.findOne({ organization: user.organization, created_time: created_time }, (err, good) => {
                    if (err || good == null) {
                      var valid_comp = false
                      if ($model.is_composite_item) {
                        if ($model.composite_items == null) {
                          $model.composite_items = []
                        }
                        valid_comp = $model.composite_items.length == 0
                        for (var com of $model.composite_items) {
                          valid_comp = valid_comp || com.product_id === undefined || com.product_id === ""
                            || com.product_name === undefined || com.product_name === ""
                            || com.quality === undefined || com.quality === ""
                            || com.cost === undefined || com.cost === ""
                        }
                      }
                      if (valid_comp) {
                        this.error('Error on saving composite item')
                      }
                      else {
                        instance.services.find({ organization: user.organization }, (err, services) => {
                          if (err || services == null) {
                            this.error('Error on saving')
                          }
                          else if (services) {
                            if (!(services.length > 0)) {
                              services = []
                            }
                            $model.services = []
                            for (var s of services) {
                              if (s._id + '' == service_id + '') {
                                $model.services.push({
                                  available: true,
                                  service: s._id,
                                  price: request.body.price,
                                  in_stock: request.body.in_stock,
                                  low_stock: 0,
                                  optimal_stock: 0
                                })
                              }
                              else {
                                $model.services.push({
                                  available: false,
                                  service: s._id,
                                  price: request.body.price,
                                  in_stock: 0,
                                  low_stock: 0,
                                  optimal_stock: 0
                                })
                              }
                            }
                            instance.goodsCategory.findOne({ _id: request.body.category }, (err, category) => {
                              if (category == null || err != null) {
                                instance.goodsCategory.findOne({ is_other: true, organization: user.organization }, (err, category) => {
                                  if (err) {
                                    this.error('Error on finding category')
                                  }
                                  else {
                                    if (category) {
                                      $model.category = category._id
                                      $model.category_id = instance.ObjectId(category._id)
                                      $model.category_name = category.name
                                      $model.save((error, item) => {
                                        if (error) {
                                          send_to_slack('create', $model.collection.name, 'Error')
                                          send_Error(request.raw.url, JSON.stringify(error))
                                          this.error('Error on saving')
                                        } else {
                                          if (findCollectionName($model.collection.name) !== 'null') {
                                            this.ok($model)
                                            instance.push_changes(request, findCollectionName(model.collection.name), request.headers['accept-service'])
                                          }
                                          else {
                                            this.ok(item)
                                          }
                                        }
                                      })
                                    }
                                    else {
                                      this.error('category does not exist')
                                    }
                                  }
                                })
                              }
                              else {
                                $model.category_name = category.name
                                $model.category_id = instance.ObjectId(category._id)
                                $model.save((error, item) => {
                                  if (error) {
                                    send_Error(request.raw.url, JSON.stringify(error))
                                    this.error('Error on saving')
                                  } else {
                                    if (findCollectionName($model.collection.name) !== 'null') {
                                      this.ok($model)
                                      instance.push_changes(request, findCollectionName(model.collection.name), request.headers['accept-service'])
                                    }
                                    else {
                                      this.ok(item)
                                    }
                                  }
                                })
                              }
                            })
                          }
                        })
                      }
                    }
                    else {
                      this.ok(good)
                    }
                  })
                }
                else {
                  this.send({
                    statusCode: 411,
                    message: 'Allready exist'
                  })
                }
              })
            } else if ($model.collection.name == 'goodscategories') {
              instance.goodsCategory.findOne({
                organization: user.organization,
                name: request.body.name
              }, async (err, categg) => {
                if (err) {
                  this.error('Error on finding categ')
                  instance.send_Error('finding category', JSON.stringify(err))
                }
                else if (categg) {
                  if (typeof categg.services != typeof []) {
                    categg.services = []
                  }
                  const serviceObj = {}
                  for (const s of categg.services) {
                    serviceObj[s.service] = s
                  }
                  let services = []
                  let category_services = []
                  try {
                    const service_id = request.headers['accept-service']
                    services = await instance.services.find({ organization: user.organization })
                    for (const s of services) {
                      if (s._id == service_id) {
                        serviceObj[s._id] = {
                          service: s._id,
                          service_name: s.name,
                          available: true
                        }
                      }
                      if (serviceObj[s._id]) {
                        category_services.push(serviceObj[s._id])
                      }
                      else {
                        category_services.push({
                          service: s._id,
                          service_name: s.name,
                          available: true
                        })
                      }
                    }
                    if (category_services.length == 0) {
                      category_services = categg.services
                    }
                  } catch (error) { }
                  instance.goodsCategory.updateOne({
                    _id: categg._id
                  }, {
                    $set: {
                      services: category_services
                    }
                  }, () => {
                    instance.goodsCategory.findOne({
                      _id: categg._id
                    }, (_, ready_categg) => {
                      this.ok(ready_categg)
                    })
                  })
                  // this.send({
                  //   statusCode: 411,
                  //   message: 'Allready exist'
                  // })
                }
                else {
                  if (request.body.section == undefined) {
                    request.body.section = ''
                  }
                  instance.goodsSection.findOne({ _id: request.body.section }, (err, section) => {
                    if (section == null || err) {
                      instance.goodsSection.findOne({ organization: user.organization }, (err, section) => {
                        if (err) {
                          this.error('Error on finding section')
                        }
                        else {
                          if (section) {
                            $model.section = section._id
                            $model.section_id = instance.ObjectId(section._id)
                            $model.save((error, item) => {
                              if (error) {
                                send_to_slack('create', $model.collection.name, 'Error')
                                send_Error(request.raw.url, JSON.stringify(error))
                                this.error('Error on saving')
                              } else {
                                if (findCollectionName($model.collection.name) !== 'null') {
                                  this.ok($model)
                                  instance.push_to_organization(findCollectionName(model.collection.name), user.organization)
                                }
                                else {
                                  this.ok(item)
                                }
                              }
                            })
                          }
                          else {
                            var sectionModel = new instance.goodsSection({
                              organization: user.organization,
                              name: 'Other'
                            })
                            sectionModel.save((err) => {
                              $model.section = sectionModel._id
                              $model.section_id = instance.ObjectId(sectionModel._id)
                              $model.save((error, item) => {
                                if (error) {
                                  send_to_slack('create', $model.collection.name, 'Error')
                                  send_Error(request.raw.url, JSON.stringify(error))
                                  this.error('Error on saving')
                                } else {
                                  if (findCollectionName($model.collection.name) !== 'null') {
                                    this.ok($model)
                                    instance.push_to_organization(findCollectionName($model.collection.name), user.organization)
                                  }
                                  else {
                                    this.ok(item)
                                  }
                                }
                              })
                            })
                          }
                        }
                      })
                    }
                    else {
                      $model.section_id = instance.ObjectId(section._id)
                      $model.save((error, item) => {
                        if (error) {
                          send_to_slack('create', $model.collection.name, 'Error')
                          send_Error(request.raw.url, JSON.stringify(error))
                          this.error('Error on saving')
                        } else {
                          if (findCollectionName($model.collection.name) !== 'null') {
                            this.ok($model)
                            instance.push_to_organization(findCollectionName($model.collection.name), user.organization)
                          }
                          else {
                            this.ok(item)
                          }
                        }
                      })
                    }
                  })
                }
              })
            }
            else {
              if ($model.collection.name == 'shifts') {
                instance.posDevices.updateOne({
                  _id: request.headers['accept-id']
                }, {
                  $set: {
                    receipt_no: 0
                  }
                }, (err, _) => {
                  if (err) {
                    instance.send_Error(request.raw.url + " update pos devices", JSON.stringify(err))
                  }
                })
                $model.pos_id = request.headers['accept-id']
                create_shifts_helper(request, user, [$model], this, false)
              }
              else if ($model.collection.name == 'receipts') {
                if ((request.body.ticket_id != "" && request.body.ticket_id != undefined)) {
                  delete_ticket_and_item_data(request, [request.body], [], user)
                }
                instance.Receipts.findOne({
                  organization: user.organization,
                  service: service_id,
                  date: request.body.date,
                  receipt_no: request.body.receipt_no
                }, (err, receip) => {
                  if (err) {
                    instance.send_Error('receipt create ', JSON.stringify(err))
                  }
                  if (receip) {
                    this.ok(receip)
                  }
                  else {
                    $model.save((err, receipt) => {
                      if (err) {
                        instance.send_Error('Error to save receipt', JSON.stringify(err))
                        this.error('Error to save receipts')
                      }
                      else {
                        instance.push_changes(request, findCollectionName(model.collection.name), service_id)
                        this.ok(receipt)
                        if (receipt) {
                          instance.customer_points([receipt])
                        }
                        if (receipt.is_refund) {
                          instance.update_receipt_sold_item(receipt.refund, receipt.sold_item_list)
                        }
                      }
                    })
                  }
                })
              }
              else if (model.collection.name == 'inventorypurchases') {
                model.find({ organization: user.organization, service: request.body.service }, (err, purchases) => {
                  if (err || purchases == null) {
                    purchases = []
                  }
                  var p_order = 'P' + ('00' + (purchases.length + 1000)).slice(-5);
                  added.p_order = p_order
                  $model = new model(
                    Object.assign(
                      {
                        organization: user.organization,
                      },
                      added,
                      request.body
                    )
                  )
                  $model.save((err, item) => {
                    if (err) {
                      this.error('Error on saving purchase order')
                    }
                    else {
                      this.ok(item)
                      var purchaseObj = {}
                      var purchase_ids = []
                      var purchase_items = []
                      for (var g of request.body.items) {
                        g.purchase_cost = parseFloat(g.purchase_cost)
                        g.quality = parseFloat(g.quality)
                        instance.update_instock(g.product_id, g.quality)
                        if (purchaseObj[g.product_id] == undefined) {
                          purchase_ids.push(g.product_id)
                          purchaseObj[g.product_id] = {
                            purchase_cost: g.purchase_cost,
                            quality: g.quality
                          }
                        }
                        else {
                          var quality = purchaseObj[g.product_id].quality + g.quality
                          purchaseObj[g.product_id] = {
                            purchase_cost: (purchaseObj[g.product_id].purchase_cost * purchaseObj[g.product_id].quality + g.purchase_cost * g.quality) / quality,
                            quality: quality
                          }
                        }
                        purchase_items.push({
                          organization: user.organization,
                          service: request.body.service,
                          purchase_id: item._id,

                        })
                      }
                      for (var id of purchase_ids) {
                        instance.update_goods_cost(id, purchaseObj[id])
                      }
                    }
                  })
                })
              }
              else {
                if (model.collection.name == 'goodsdiscounts') {
                  instance.goodsDiscount.findOne({
                    organization: user.organization,
                    name: request.body.name,
                    value: request.body.value,
                    type: request.body.type
                  }, (err, discount) => {
                    if (err) {
                      this.error('Error on finding discount')
                    }
                    else {
                      if (discount) {
                        this.send({
                          statusCode: 411,
                          message: 'Allready exist'
                        })
                      }
                      else {
                        instance.services.find({
                          organization: user.organization
                        }, (err, servicesss) => {
                          if (err || servicesss == undefined) {
                            servicesss = []
                          }
                          var discount = new instance.goodsDiscount(Object.assign(request.body, {
                            organization: user.organization
                          }))
                          discount.services = []
                          for (var s of servicesss) {
                            if (s._id + '' == '' + request.headers['accept-service']) {
                              discount.services.push({
                                available: true,
                                service: instance.ObjectId(s._id)
                              })
                            }
                            else {
                              discount.services.push({
                                available: false,
                                service: instance.ObjectId(s._id)
                              })
                            }
                          }
                          discount.save((err, result) => {
                            if (result) {
                              this.ok(result)
                              instance.push_to_organization(findCollectionName(model.collection.name), user.organization)
                            }
                            else {
                              this.error('Error on saving')
                            }
                          })
                        })
                      }
                    }
                  })
                }
                else {
                  if (model.collection.name == 'scales') {
                    $model.organization = user.organization
                    $model.service = request.headers['accept-service']
                  }
                  $model.save((error, item) => {
                    if (error) {
                      send_Error(request.raw.url, JSON.stringify(error))
                      this.error('Error on saving')
                    } else {
                      if (findCollectionName($model.collection.name) !== 'null') {
                        this.ok($model)
                        if ($model.service != undefined) {
                          request.headers['accept-service'] = $model.service
                        }
                        instance.push_changes(request, findCollectionName($model.collection.name), request.headers['accept-service'])
                      }
                      else {
                        this.ok(item)
                      }
                    }
                  })
                }
              }
            }
          }
        }
      }
    }
  })

  function goods_sales_create_group(model, items, user, service_id, reply) {
    var Answer = []
    var indexes = []
    for (let i = 0; i < items.length; i++) {
      if (items[i].category)
        indexes.push(items[i].category)
    }
    instance.services.find({ organization: user.organization }, (err, servicesss) => {
      if (err || servicesss == null) {
        reply.error('Error on finding organization')
      }
      else {
        var to_save = []
        for (let i = 0; i < items.length; i++) {
          items[i] = JSON.parse(JSON.stringify(items[i]))
          items[i].organization = user.organization
          var services = []
          for (var s of servicesss) {
            if (s._id + '' == '' + user.service) {
              services.push({
                available: true,
                service: s.toString(),
                price: items[i].price,
                in_stock: items[i].in_stock,
                low_stock: items[i].low_stock,
                optimal_stock: items[i].optimal_stock
              })
            }
            else {
              services.push({
                available: false,
                service: s.toString(),
                price: items[i].price,
                in_stock: 0,
                low_stock: 0,
                optimal_stock: 0
              })
            }
          }
          items[i].services = services
          to_save.push(new model(items[i]))
        }
        items = to_save
        instance.goodsCategory.find({ _id: { $in: indexes } }, (err, categories) => {
          if (categories == null) {
            categories = []
          }
          instance.goodsCategory.findOne({ is_other: true, organization: user.organization }, (err, categ) => {
            if (err || categ == null) {
              reply.error('Other Category does not exist')
            }
            else {
              var result_indexes = []
              var categObjj = {}
              for (var category of categories) {
                categObjj[category._id] = category.name
                result_indexes.push(category._id + "")
              }
              for (let i = 0; i < items.length; i++) {
                delete items[i]._id
                if (items[i].category)
                  if (result_indexes.includes(items[i].category)) {
                    items[i].category_id = instance.ObjectId(items[i].category)
                    items[i].category_name = categObjj[items[i].category]
                    Answer.push(items[i])
                  }
                  else {
                    items[i].category = categ._id
                    items[i].category_id = instance.ObjectId(categ._id)
                    items[i].category_name = categ.name
                    Answer.push(items[i])
                  }
              }
              var db = mongoose.connection;
              var collection = db.collection('goodssales')
              try {
                collection.insertMany(Answer, (err, result) => {
                  if (err) {
                    instance.send_Error('creating goods', JSON.stringify(err))
                    reply.error('Error on creating')
                  }
                  else {
                    if (result) {
                      reply.ok(result.ops)
                    }
                    else {
                      reply.error('Nothing to save')
                    }
                  }
                })
              }
              catch (e) {
                reply.error('Error on creating items')
              }
            }
          })
        })
      }
    })
  }

  function goods_categories_create_group(model, items, user, service_id, reply) {
    var Answer = []
    var indexes = []
    for (let i = 0; i < items.length; i++) {
      if (items[i].section)
        indexes.push(items[i].section)
    }
    instance.goodsSection.find({ _id: { $in: indexes } }, (err, sections) => {
      if (sections == null) {
        sections = []
      }
      instance.goodsSection.findOne({ is_other: true, service: service_id }, (err, sect) => {
        if (err || sect == null) {
          reply.error('Other Section does not exist')
        }
        else {
          var result_indexes = []
          for (var section of sections) {
            result_indexes.push(section._id + "")
          }
          for (let i = 0; i < items.length; i++) {
            if (items[i].section)
              if (result_indexes.includes(items[i].section))
                Answer.push(items[i])
              else {
                items[i].section = sect._id
                Answer.push(items[i])
              }
          }
          var db = mongoose.connection;
          var collection = db.collection('goodscategories')
          collection.insertMany(Answer, (err, result) => {
            if (err) {
              reply.error('Other Section did not choosen')
            }
            else {
              if (result) {
                section_count('create', Answer)
                pushnotification(findCollectionName(model.collection.name), result.ops, user, 'create', reply, GR = true)
              }
              else {
                reply.error('Nothing to save')
              }
            }
          })
        }
      })
    })
  }

  ///////creategroupway

  instance.decorateReply('create_group', function (request, model, user, options) {
    var service_id;
    var allready_send = false
    if (!request.body) {
      this.error('Body is empty')
      allready_send = true
    }
    else if (request.body.length == 0) {
      this.error('Body is empty')
      allready_send = true
    }
    else {
      if (user) {
        if (request.headers['accept-user'] == 'employee') {
          service_id = request.headers['accept-service']
        }
        else {
          service_id = request.body[0].service
        }
      }
      else {
        service_id = request.body[0].service
      }
    }
    if (allready_send == false) {
      if (options.public_search && request.headers['accept-user'] == 'QRCode') {
        if (request.body.length > 0) {
          var reply = this
          if (request.body[0].table_id != '') {
            instance.Tables.findOne({ _id: request.body[0].table_id }, (err, table) => {
              if (err || table == null) {
                this.send({
                  statusCode: 404,
                  message: 'table not found'
                })
              }
              else {
                var Answer = []
                for (var r of request.body) {
                  Answer.push(Object.assign({
                    organization: table.organization,
                    service: table.service
                  }, r))
                }
                instance.order_items.insertMany(Answer, (err, result) => {
                  if (err) {
                    reply.error('Error on saving')
                  }
                  else {
                    reply.ok(result)
                    instance.pushnotification(findCollectionName(model.collection.name), {}, table.service)
                  }
                })
              }
            })
          }
          else {
            this.send({
              statusCode: 404,
              message: 'table not found'
            })
          }
        }
        else {
          this.error('Body can\'t be empty')
        }
      }
      else if (options.public) {
        if (request.body.length) {
          var items = []
          var objects = request.body
          for (let i = 0; i < objects.length; i++) {
            var obj = objects[i]
            if (obj._id == null || obj._id == "") {
              delete obj._id
            }
            if (obj.sold_item_list) {
              var objj = []
              for (var ob of obj.sold_item_list) {
                delete ob._id
                objj.push(ob)
              }
              obj.sold_item_list = objj
            }
            var $model = new model(obj)
            $model.save((error, item) => {
              if (error) {
                send_to_slack('create_group', $model.collection.name, 'Error')
                send_Error(request.raw.url, JSON.stringify(error))
                this.error('Could not save')
              } else {
                if (i == objects.length - 1) {
                  if (items) {
                    send_to_slack('create_group', $model.collection.name, 'Success')
                    this.ok(items)
                  }
                  else {
                    send_to_slack('create_group', $model.collection.name, 'Error')
                    send_Error(request.raw.url, $model.collection.name + ' is null')
                    this.error("Error on creating")
                  }
                }
              }
            })
          }
        }
      }
      else {
        if (!user) {
          this.error('Access denied')
        }
        else {
          user.service = request.headers['accept-service']
          if (model.collection.name == 'printers') {
            if (request != undefined) {
              if (request.body != undefined) {
                if (request.body.length != undefined) {
                  for (let tt = 0; tt < request.body.length; tt++) {
                    request.body[tt].pos_id = request.headers['accept-id']
                  }
                }
              }
            }
          }
          if (model.collection.name == 'tickets' || model.collection.name == 'item_datas') {
            if (model.collection.name == 'tickets') {
              subtrack_or_add_products(true, request, user, this, request.body, [])
            }
            else {
              subtrack_or_add_products(true, request, user, this, null, request.body)
            }
          }
          else if (model.collection.name == 'goodssales') {
            goods_sales_create_group(model, request.body, user, service_id, this)
          }
          else {
            var items = []
            var objects = request.body
            var LIMIT = objects.length
            var settingstaxes = []
            var to_sent = []
            var T = 1
            var SeLimit = 1
            if (model.collection.name == 'shifts') {
              var MODEL = []
              for (var obj of objects) {
                obj.old_id = obj._id + ''
                obj._id = undefined
                var added = {}
                added.by_whom = user._id
                var $model = new model(
                  Object.assign(
                    added, obj,
                    {
                      organization: user.organization,
                      service: service_id,
                      pos_id: request.headers['accept-id']
                    }
                  )
                )
                MODEL.push($model)
              }
              create_shifts_helper(request, user, MODEL, this, true)
            }
            else if (model.collection.name == 'receipts') {
              delete_ticket_and_item_data(request, request.body, [], user)
              var dates = []
              var receipt_numbers = []
              for (var r of request.body) {
                dates.push(r.date)
                receipt_numbers.push(r.receipt_no)
              }
              instance.Receipts.find({
                organization: user.organization,
                service: user.service,
                $and: [
                  { date: { $in: dates } },
                  { receipt_no: { $in: receipt_numbers } }
                ]
              }, (err, receiptss) => {
                if (err || receiptss == null) {
                  if (err) {
                    instance.send_Error('RECEIPT CRATE GROUP', JSON.stringify(err))
                  }
                  else {
                    instance.send_Error('RECEIPT CRATE GROUP', 'Receipt null')
                  }
                  receiptss = []
                }
                var allready_exist = []
                var need_to_save = []
                var date_and_numbers = []
                var receiptObj = {}
                for (var re of receiptss) {
                  date_and_numbers.push(JSON.stringify({ date: re.date, number: re.receipt_no }))
                  receiptObj[JSON.stringify({ date: re.date, number: re.receipt_no })] = re
                }
                for (var rr of request.body) {
                  if (date_and_numbers.includes(JSON.stringify({ date: rr.date, number: rr.receipt_no }))) {
                    allready_exist.push(receiptObj[JSON.stringify({ date: rr.date, number: rr.receipt_no })])
                  }
                  else {
                    delete rr._id
                    rr.organization = user.organization
                    rr.service = request.headers['accept-service']
                    var sold = []
                    for (var ss of rr.sold_item_list) {
                      delete ss._id
                      sold.push(ss)
                    }
                    rr.sold_item_list = sold
                    var payment = []
                    for (var ss of rr.payment) {
                      delete ss._id
                      payment.push(ss)
                    }

                    rr.pos_id = request.headers['accept-id']
                    rr.created_time = new Date().getTime()

                    var $receiptModel = new instance.Receipts(rr)


                    for (let i = 0; i < $receiptModel.sold_item_list.length; i++) {
                      $receiptModel.sold_item_list[i].receipt_id = $receiptModel._id
                    }

                    // rr.pos_name = rr.pos_id + ""

                    need_to_save.push($receiptModel)
                  }
                }
                instance.Receipts.insertMany(need_to_save, async (err, result) => {
                  if (err) {
                    instance.send_Error('receipts create', JSON.stringify(err))
                    this.error('Error to save receipts')
                  }
                  else {
                    //user, objects, reply, is_refund = false)
                    for (var r of result) {
                      forReceiptToWorkCreate(request, user, r, r.is_refund)
                    }
                    for (var rr of result) {
                      if (rr.is_refund) {
                        instance.update_receipt_sold_item(rr.refund, rr.sold_item_list)
                      }
                      else {
                        // cashbackni hisoblash
                        if (rr.cashback_phone)
                          await instance.CashBackClientUpdate(
                            { ...{ ...rr }._doc },
                            { phone_number: rr.cashback_phone, },
                            user
                          )
                      }
                    }
                    instance.customer_points(result)
                    result = result.concat(allready_exist)
                    this.ok(result)
                    instance.push_changes(request, findCollectionName(model.collection.name), service_id)
                  }
                })
              })
            }
            else {
              for (let i = 0; i < objects.length; i++) {
                var obj = objects[i]
                if (obj._id == null || obj._id == "") {
                  delete obj._id
                }
                if (obj.sold_item_list) {
                  var objj = []
                  for (var ob of obj.sold_item_list) {
                    delete ob._id
                    objj.push(ob)
                  }
                  obj.sold_item_list = objj
                  var pay = []
                  for (var ob of obj.payment) {
                    delete ob._id
                    pay.push(ob)
                  }
                  obj.payment = pay
                }
                var added = {}
                if (model.collection.name == 'receipts') {
                  get_taxes(user, request.body)
                }
                if (model.collection.name == 'shifts') {
                  added.by_whom = user._id
                }
                obj._id = undefined
                var $model = new model(
                  Object.assign(
                    {
                      organization: user.organization,
                      service: user.service
                    }, added, obj))
                if ($model.collection.name == 'goodscategories') {
                  SeLimit++
                  to_sent.push($model)
                  if (SeLimit == LIMIT + 1) {
                    goods_categories_create_group($model, to_sent, user, service_id, this)
                  }
                }
                else if ($model.collection.name == 'goodssales') {
                  to_sent.push($model)
                  T++
                  if (T == LIMIT + 1) {
                    goods_sales_create_group($model, to_sent, user, service_id, this)
                  }
                }
                else {
                  SeLimit++
                  T++
                  $model.save((error, item) => {
                    if (error) {
                      this.error(error)
                    } else {
                      items.push(item)
                      if (items.length == request.body.length) {
                        if (findCollectionName($model.collection.name) !== 'null') {
                          pushnotification(findCollectionName($model.collection.name), items, user, 'create', this, GR = true)
                        }
                        else {
                          this.ok(items)
                        }
                      }
                    }
                  })
                }
              }
            }
          }
        }
      }
    }
  })

  // getway

  instance.decorateReply('get', function (request, model, user, options) {
    if (options.public_search && request.headers['accept-user'] == 'QRCode') {
      model.findOne({ "_id": request.params.id }, { table_name: 0 }, (err, item) => {
        if (err) {
          send_Error(request.raw.url, JSON.stringify(err))
          this.error('Error on  finding ' + model.collection.name)
        }
        else {
          if (item) {
            this.ok(item)
          }
          else {
            this.send({
              statusCode: 404,
              error: 'Not found',
              message: 'Error: Not found'
            })
          }
        }
      })
    }
    else {
      if (model.collection.name == 'goodssales') {
        instance.get_product_by_id(request.params.id, this, user)
      }
      else if (model.collection.name == 'goodscategories') {
        model.findOne({
          _id: request.params.id
        }, (err, item) => {
          if (item == null || err) {
            return this.fourorfour('category')
          }
          model.findOne({
            _id: item.type
          }, async (err, parent) => {
            item.parent_categories = [{
              name: parent ? parent.name : 'Top'
            }]
            let services = []
            const serviceObj = {}
            if (typeof item.services == typeof []) {
              for (const s of item.services) {
                serviceObj[s.service] = s
              }
            }
            else {
              item.services = []
            }
            const category_services = []
            try {
              services = await instance.services.find({ organization: user.organization })
              for (const s of services) {
                if (serviceObj[s._id]) {
                  category_services.push(serviceObj[s._id])
                }
                else {
                  category_services.push({
                    available: true,
                    service: s._id,
                    service_name: s.name
                  })
                }
              }
            } catch (error) {
              return this.error(error.message)
            }
            item.services = category_services
            this.ok(item)
          })
        })
      }
      else {
        instance.services.find({
          organization: user.organization
        }, (err, services) => {
          if (services == undefined) {
            services = []
          }
          var serviceObj = {}
          for (var s of services) {
            serviceObj[s._id + ""] = s.name
          }
          model.findOne({ "_id": request.params.id }, async (err, item) => {
            if (err) {
              send_Error(request.raw.url, JSON.stringify(err))
              this.error('Error on  finding ' + model.collection.name)
            }
            else {
              if (item) {
                if (item.services != undefined) {
                  for (let i = 0; i < item.services.length; i++) {
                    if (serviceObj[item.services[i].service + ''] != undefined)
                      item.services[i].service_name = serviceObj[item.services[i].service + '']
                  }
                }

                if (typeof item.service == typeof 'invan' && item.service.length == 24) {
                  let item_service;
                  try {
                    item_service = await instance.services.findById(item.service)
                    item = item.toObject()
                    if (item_service) {
                      item.service_name = item_service.name
                    }
                  }
                  catch (error) { }
                  if (model.collection.name == 'receipts' && item.user_id) {
                    try {
                      const client = await instance.clientsDatabase.findOne({ user_id: item.user_id })
                      if (client) {
                        item.client_name = client.first_name
                      }
                    } catch (error) { }
                  }
                }
                // if (item.service != undefined) {
                //   instance.services.findOne({
                //     _id: item.service
                //   }, (err, service) => {
                //     if (err || service == null) {
                //       service = {}
                //       service.name = 'Something'
                //     }
                //     item.service_name = service.name
                //     this.ok(item)
                //   })
                // }
                // else {
                if (item.primary_supplier_id) {
                  instance.adjustmentSupplier.findOne({
                    _id: item.primary_supplier_id
                  }, (err, supp) => {
                    if (supp != undefined) {
                      item.primary_supplier_name = supp.supplier_name
                      this.ok(item)
                    }
                    else {
                      this.ok(item)
                    }
                  })
                }
                else {
                  this.ok(item)
                }
                // }
              }
              else {
                this.send({
                  statusCode: 404,
                  error: 'Not found',
                  message: 'Error: Not found'
                })
              }
            }
          })
        })
      }
    }
  })

  ///////////////findway

  instance.decorateReply('find', function (request, model, user, options) {
    if (options.public) {
      if (model.collection.name == 'inoneorgaziations') {
        instance.organizations.find({}, (error, organizations) => {
          if (error) {
            send_to_slack('find', model.collection.name, 'Error')
            send_Error(request.raw.url, JSON.stringify(error))
            this.error('Could not found')
          } else {
            var items = []
            for (var org of organizations) {
              if (org.is_verify) {
                items.push(org)
              }
            }
            send_to_slack('find', model.collection.name, 'Success')
            this.ok(items)
          }
        })
      }
      else {
        model.find({}, { __v: 0 }, (error, items) => {
          if (error) {
            send_to_slack('find', model.collection.name, 'Error')
            send_Error(request.raw.url, JSON.stringify(error))
            this.error('Could not found')
          } else {
            send_to_slack('find', model.collection.name, 'Success')
            this.ok(items)
          }
        })
      }
    }
    else {
      if (!user) {
        if (options.access_get) {
          if (model.collection.name == 'inoneorgaziations') {
            instance.organizations.find({}, (error, organizations) => {
              if (error) {
                send_to_slack('find', model.collection.name, 'Error')
                send_Error(request.raw.url, JSON.stringify(error))
                this.error('Could not found')
              } else {
                var items = []
                for (var or of organizations) {
                  if (or.is_verify) {
                    items.push(or)
                  }
                }
                send_to_slack('find', model.collection.name, 'Success')
                this.ok(items)
              }
            })
          }
          else {
            model.find({}, (error, items) => {
              if (error) {
                send_to_slack('find', model.collection.name, 'Error')
                send_Error(request.raw.url, JSON.stringify(error))
                this.error('Could not found')
              } else {
                send_to_slack('find', model.collection.name, 'Success')
                this.ok(items)
              }
            })
          }
        }
        else {
          if (request.headers['accept-user'] == 'admin') {
            this.status(401).send({
              message: 'Unauthorized'
            })
          }
          else {
            this.send({
              statusCode: 499,
              message: 'Token required'
            })
          }
        }
      }
      else {
        if (model.collection.name == 'inoneservices' || model.collection.name == 'inoneorgaziations') {
          var query = {}
          if (model.collection.name == 'inoneservices') {
            query._id = request.headers['accept-service']
          }
          else {
            query._id = user.organization
          }
          instance.organizations.findOne({
            _id: user.organization
          }, (err, org) => {
            model.findOne(query, (err, result) => {
              if (err) {
                this.error('Error on finding service')
              }
              else {
                if (result) {
                  try {
                    result = result.toObject()
                  }
                  catch (error) {
                    instance.send_Error('to Object', error.message)
                  }
                  result.payments = org.payments
                  this.ok(result)
                }
                else {
                  this.error('Service does not exist')
                }
              }
            })
          })
        }
        else {
          var query = { organization: user.organization, service: request.headers['accept-service'] }

          if (request.headers['accept-user'] == 'employee') {
            if (
              model.collection.name == 'goodssales' ||
              model.collection.name == 'goodsdiscounts' ||
              model.collection.name == 'modifiers') {
              delete query.service
              query.services = {
                $elemMatch: {
                  service: {
                    $eq: instance.ObjectId(request.headers['accept-service'])
                  },
                  available: {
                    $eq: true
                  }
                }
              }
            }
            else if (['settingstaxes', 'employees'].includes(model.collection.name)) {
              delete query.service
              query.services = { $elemMatch: { service: { $eq: user.service } } }
            }
          }
          if (model.collection.name == 'printers' || model.collection.name == 'shifts') {
            query.pos_id = request.headers['accept-id']
          }
          if (model.collection.name == 'goodscategories') {
            const service_id = request.headers['accept-service']
            model.find({
              organization: user.organization,
              $or: [
                {
                  services: {
                    $elemMatch: {
                      service: {
                        $eq: service_id
                      },
                      available: {
                        $ne: false
                      }
                    }
                  }
                },
                {
                  services: {
                    $in: [null, undefined, []]
                  }
                },
                {
                  is_other: true
                }
              ]
            }, {
              services: 0
            }, (_, categories) => {
              if (!categories) {
                categories = []
              }
              return this.ok(categories)
            })
            // model.aggregate([
            //   {
            //     $match: {
            //       organization: user.organization
            //     }
            //   },
            //   {
            //     $lookup: {
            //       from: 'goodssales',
            //       localField: '_id',
            //       foreignField: 'category_id',
            //       as: 'goods'
            //     }
            //   }
            // ], (err, categories) => {
            //   if (err) {
            //     this.error('Error on finding categories')
            //   }
            //   else {
            //     for (let i = 0; i < categories.length; i++) {
            //       var count = 0
            //       for (var g of categories[i].goods) {
            //         var A = false
            //         for (var s of g.services) {
            //           // CHANGE
            //           if (s)
            //             if (request.headers['accept-service'] == s.service && s.available) {
            //               A = true
            //             }
            //         }
            //         if (A) count++;
            //       }
            //       categories[i].count = count
            //       delete categories[i].goods
            //       categories[i].goods = undefined
            //     }
            //     this.ok(categories)
            //   }
            // })
          }
          else if (model.collection.name == 'goodssections') {
            model.aggregate([
              {
                $match: {
                  organization: user.organization
                }
              },
              {
                $lookup: {
                  from: 'goodscategories',
                  localField: '_id',
                  foreignField: 'section_id',
                  as: 'categories'
                }
              }
            ], (err, sections) => {
              if (err) {
                this.error('Error on finding section')
              }
              else {
                for (let i = 0; i < sections.length; i++) {
                  sections[i].count = sections[i].categories.length
                  delete sections[i].categories
                  sections[i].categories = undefined
                }
                this.ok(sections)
              }
            })
          }
          // else if(model.collection.name == 'goodssales') {
          //   instance.getGoodsSales(request, reply)
          // }
          else {
            model.find(query, { language: 0, __v: 0 }, (error, items) => {
              if (error) {
                send_to_slack('find', model.collection.name, 'Error')
                send_Error(request.raw.url, JSON.stringify(error))
                this.error('Could not found')
              } else {
                if (model.collection.name == 'settingstaxes') {
                  var Items = []
                  for (let item of items) {
                    item.products = undefined
                    Items.push(item)
                  }
                  send_to_slack('find', model.collection.name, 'Success')
                  this.ok(Items)
                }
                else {
                  if (model.collection.name == 'orders') {
                    var user_ids = []
                    for (var t of items) {
                      user_ids.push(t.user_id)
                    }
                    instance.clientsDatabase.find({
                      user_id: {
                        $in: user_ids
                      }
                    }, { first_name: 1, last_name: 1, phone_number: 1, user_id: 1 }, (err, users) => {
                      if (err || users == null) {
                        users = []
                      }
                      var userObj = {}
                      for (var u of users) {
                        userObj[u.user_id] = u
                      }
                      var Answer = []
                      for (let t = 0; t < items.length; t++) {
                        try {
                          items[t] = items[t].toObject()
                        }
                        catch (error) {
                          instance.send_Error('to Object', error.message)
                        }
                        items[t].user_data = userObj[items[t].user_id]
                        Answer.push(items[t])
                      }
                      this.ok(items)
                    })
                  }
                  else if (model.collection.name == 'goodssales') {
                    instance.settingsTaxes.find({
                      organization: user.organization,
                      services: { $elemMatch: { service: { $eq: instance.ObjectId(request.headers['accept-service']) }, available: { $eq: true } } }
                    }, (err, taxess) => {
                      if (taxess == undefined) {
                        taxess = []
                      }
                      var tObj = {}
                      for (var t of taxess) {
                        tObj[instance.ObjectId(t._id)] = t
                      }
                      for (let i = 0; i < items.length; i++) {
                        for (var s of items[i].services) {
                          if (s.service + '' === request.headers['accept-service'] + "") {
                            items[i].in_stock = s.in_stock
                            items[i].stopped_item = s.stopped_item
                            try {
                              items[i] = items[i].toObject()
                            }
                            catch (error) {
                              instance.send_Error('to Object', error.message)
                            }
                            if (typeof s.prices == typeof []) {
                              items[i].prices = s.prices
                            }
                            else {
                              items[i].prices = []
                            }
                            if (s.price) {
                              items[i].price = s.price
                            }
                          }
                        }
                        items[i].services = undefined
                        var taxes = []
                        if (items[i].taxes) {
                          if (items[i].taxes.length > 0) {
                            for (var t of items[i].taxes) {
                              if (t)
                                if (t.available && tObj[t.tax_id] != undefined) {
                                  taxes.push(t.tax_id)
                                }
                            }
                          }
                        }
                        items[i].taxes = taxes
                      }
                      this.ok(items)
                    })
                  }
                  else {
                    send_to_slack('find', model.collection.name, 'Success')
                    this.ok(items)
                  }
                }
              }
            }).limit(200);
          }
        }
      }
    }
  })

  instance.decorateReply('finds', function (request, model, user, options) {
    if (user) {
      var query = ({ organization: user.organization, service: user.service })
      model.find(query, (err, items) => {
        var ids = []
        if (items == null) {
          items = []
        }
        for (var item of items) {
          ids.push(item._id)
        }
        this.ok(ids)
      })
    }
    else {
      this.error('Error')
    }
  })

  // searchway

  instance.decorateReply('search', function (request, model, user, options) {
    if (options.public_search && request.headers['accept-user'] == 'QRCode') {
      instance.Tables.findOne({
        _id: request.body.table_id
      }, (err, table) => {
        if (err) {
          this.error('Error on finding table')
        }
        else {
          if (table) {
            var query = {
              organization: table.organization
            }
            if (request.body.category) {
              query.category = request.body.category
            }
            if (model.collection.name == 'order_items') {
              query.order_id = request.body.order_id
            }
            if (model.collection.name == 'goodssales') {
              query.services = { $elemMatch: { service: { $eq: instance.ObjectId(table.service) }, available: { $eq: true } } }
              query.sale_is_avialable = true
              model.find(query, { _id: 1, name: 1, price: 1, cost: 1, representation_type: 1, representation: 1, category: 1, composite_items: 1, services: 1 }, (err, goods) => {
                if (err || goods == null) {
                  goods = []
                }
                var category_ids = []
                for (var g of goods) {
                  if (g.category != '') {
                    category_ids.push(g.category)
                  }
                }
                instance.goodsCategory.find({ _id: { $in: category_ids } }, (err, categories) => {
                  if (err || categories == null) {
                    categories = []
                  }
                  var catObj = {}
                  for (var ca of categories) {
                    catObj[ca._id] = ca.name
                  }
                  var goodss = []
                  for (var g of goods) {
                    try {
                      g = g.toObject()
                    }
                    catch (error) {
                      instance.send_Error('to Object', error.message)
                    }
                    for (var s of g.services) {
                      if (s.service + '' == table.service) {
                        g.in_stock = s.in_stock
                        g.price = s.price
                      }
                    }
                    g.services = undefined
                    if (catObj[g.category] == undefined) {
                      g.category_name = 'Other'
                    }
                    else {
                      g.category_name = catObj[g.category]
                    }
                    goodss.push(g)
                  }
                  this.ok(goodss)
                })
              })
            }
            else {
              if (model.collection.name == 'inoneservices') {
                query = {}
                query._id = table.service
                model.findOne(query, {
                  location: 1,
                  service_value: 1,
                  address: 1,
                  name: 1,
                  phone_number: 1,
                  image_url: 1
                }, (err, item) => {
                  if (err || item == null) {
                    this.error(`Error on finding ${model.collection.name}`)
                  }
                  else {
                    this.ok(item)
                  }
                })
              }
              else {
                query.service = table.service
                if (model.collection.name == 'goodscategories') {
                  query.service = undefined
                  delete query.service
                  model.find(query, { name: 1 }, (err, item) => {
                    if (err || item == null) {
                      this.error(`Error on finding ${model.collection.name}`)
                    }
                    else {
                      this.ok(item)
                    }
                  })
                }
                else {
                  model.find(query, { table_name: 0 }, (err, item) => {
                    if (err || item == null) {
                      this.error(`Error on finding ${model.collection.name}`)
                    }
                    else {
                      this.ok(item)
                    }
                  })
                }
              }
            }
          }
          else {
            this.error('Table not found')
          }
        }
      })
    }
    else if (options.public) {
      var query = request.body
      if (model.collection.name == 'accountmantreports' && request.body.accountmant_id != null) {
        instance.accountmant.findOne({ _id: request.body.accountmant_id }, (err, acc) => {
          if (err || acc == null) {
            reply.error('Accountmant does not exist')
          }
          else {
            if (acc.is_admin) {
              query = {}
            }
            model.find(query, (error, items) => {
              if (error) {
                send_to_slack('search', model.collection.name, 'Error')
                send_Error(request.raw.url, JSON.stringify(error))
                this.error('Could not found')
              } else {
                send_to_slack('search', model.collection.name, 'Success')
                this.ok(items)
              }
            })
          }
        })
      }
      else {
        model.find(query, (error, items) => {
          if (error) {
            send_to_slack('search', model.collection.name, 'Error')
            send_Error(request.raw.url, JSON.stringify(error))
            this.error('Could not found')
          } else {
            send_to_slack('search', model.collection.name, 'Success')
            this.ok(items)
          }
        })
      }
    }
    else {
      if (request.body) {
        if (request.body.service == '') {
          request.body.service = undefined
          delete request.body.service
        }
      }
      if (!user) {
        this.error('Access!')
      }
      else {
        if (model.collection.name == 'products') {
          model.find(request.body, (error, items) => {
            if (error) {
              send_to_slack('search', model.collection.name, 'Error')
              send_Error(request.raw.url, JSON.stringify(error))
              this.error('Could not found')
            }
            else {
              send_to_slack('search', model.collection.name, 'Success')
              this.ok(items)
            }
          })
        }
        else {
          var query = Object.assign({
            organization: user.organization,
          }, request.body)
          if (user.service) {
            query.service = user.service
          }
          if (model.collection.name == 'goodscategories' || model.collection.name == 'goodssections') {
            delete query.service
          }
          if (model.collection.name == 'tables' && request.body.is_charged == false) {
            delete query.is_charged
            query.receipt_id = { $ne: "" }
            model.find(query, (error, items) => {
              if (error) {
                send_to_slack('search', model.collection.name, 'Error')
                send_Error(request.raw.url, JSON.stringify(error))
                this.error('Could not found')
              } else {
                send_to_slack('search', model.collection.name, 'Success')
                this.ok(items)
              }
            })
          }
          else {
            if (model.collection.name == 'shifts') {
              query.closing_time = { $ne: 0 }
            }
            if (model.collection.name == 'goodssales') {
              if (request.headers['accept-user'] == 'boss') {
                query.services = { $elemMatch: { service: { $eq: instance.ObjectId(request.body.service) }, available: { $eq: true } } }
                query.service = undefined
                delete query.service
              }
            }
            model.find(query, (error, items) => {
              if (error) {
                send_to_slack('search', model.collection.name, 'Error')
                send_Error(request.raw.url, JSON.stringify(error))
                this.error('Could not found')
              } else {
                // if(model.collection.name == 'goodssales' && request.headers['accept-user'] == 'boss'){
                //   for(let i=0; i<items.length; i++) {
                //     for(var s of items[i].services) {
                //       if(s.service+'' === request.body.service+"") {
                //         items[i].in_stock = s.in_stock
                //       }
                //     }
                //     items[i].services = undefined
                //   }
                // }
                if (model.collection.name == 'goodssales') {
                  instance.settingsTaxes.find({
                    organization: user.organization,
                    services: { $elemMatch: { service: { $eq: instance.ObjectId(request.body.service) }, available: { $eq: true } } }
                  }, (err, taxess) => {
                    if (taxess == undefined) {
                      taxess = []
                    }
                    var tObj = {}
                    for (var t of taxess) {
                      tObj[instance.ObjectId(t._id)] = t
                    }
                    for (let i = 0; i < items.length; i++) {
                      for (var s of items[i].services) {
                        if (s.service + '' === request.body.service + "") {
                          items[i].in_stock = s.in_stock
                          items[i].price = s.price
                        }
                      }
                      if (items[i].in_stock == undefined || items[i].in_stock == '') {
                        items[i].in_stock = 0
                      }
                      if (items[i].price == undefined || items[i].price == '') {
                        items[i].price = 0
                      }
                      items[i].services = undefined
                      var taxes = []
                      if (items[i].taxes) {
                        if (items[i].taxes.length > 0) {
                          for (var t of items[i].taxes) {
                            if (t)
                              if (t.available && tObj[t.tax_id] != undefined) {
                                taxes.push(t.tax_id)
                              }
                          }
                        }
                      }
                      items[i].taxes = taxes
                    }
                    this.ok(items)
                  })
                }
                else {
                  this.ok(items)
                }
              }
            }).sort({ category: 1, position: 1, _id: -1 })
          }
        }
      }
    }
  })

  // searchingway

  instance.decorateReply('searching', function (request, model, user, options) {
    if (request.body) {
      if (request.body.service == '') {
        request.body.service = undefined
        delete request.body.service
      }
    }
    if (options.public_search && request.headers['accept-user'] == 'QRCode') {
      instance.Tables.findOne({
        _id: request.body.table_id
      }, (err, table) => {
        if (err) {
          this.error('Error on finding table')
        }
        else {
          if (table) {
            var page = parseInt(request.params.list)
            var limit = parseInt(request.params.page)
            var query = {
              organization: table.organization,
              service: table.service
            }
            if (model.collection.name == 'goodssales') {
              query.sale_is_avialable = true
            }
            model.find(query, (err, goods) => {
              if (err || goods == null) {
                goods = []
              }
              var total = goods.length
              this.ok({
                total: total,
                data: goods.splice((page - 1) * limit, limit)
              })
            })
          }
          else {
            this.error('Table not found')
          }
        }
      })
    }
    else if (user) {
      if (model.collection.name == 'shifts') {
        model.find({
          organization: user.organization,
          service: request.body.service,
          opening_time: {
            $lte: request.body.end,
            $gte: request.body.start
          }
          // $ne: [ 'closing_time', 0 ]
        }, {
          _id: 1, pos: 1, opening_time: 1, closing_time: 1, cash_drawer: 1
        }, (err, shifts) => {
          if (err) {
            this.error('Error on finding Shifts')
          }
          else {
            if (shifts == null) {
              shifts = []
            }
            var Shifts = []
            for (var t of shifts) {
              if (t.closing_time != 0)
                Shifts.push(t)
            }
            shifts = Shifts
            var total = shifts.length
            shifts = shifts.slice(request.params.page * (request.params.list - 1), request.params.page * request.params.list)
            var Answer = []
            for (var shift of shifts) {
              Answer.push({
                _id: shift._id,
                pos: shift.pos,
                opening_time: shift.opening_time,
                closing_time: shift.closing_time,
                exp_cash_amount: shift.cash_drawer.exp_cash_amount,
                act_cash_amount: shift.cash_drawer.act_cash_amount,
                difference: shift.cash_drawer.difference
              })
            }
            this.ok({
              total: total,
              page: Math.ceil(total / (request.params.page ? request.params.page : 1)),
              data: Answer
            })
          }
        })
      }
      else {
        var query = {}
        if (model.collection.name == 'goodssales') {
          if (request.body.in_stock == false) {
            query.in_stock = {
              $lte: 0
            }
          }
          if (request.body.category == null) {
            delete request.body.category
          }
          // if(request.body.name !== undefined) {
          //   var a = "{name: " + '/' + request.body.name + '/' + "}";

          // }
        }
        delete request.body.in_stock
        query = Object.assign({
          organization: user.organization
        }, request.body, query)
        model.find(query, (err, items) => {
          if (err) {
            send_Error(request.raw.url, JSON.stringify(err))
            this.error('Error on finding')
          }
          else {
            if (items == null) {
              items = []
            }
            var data = {}
            if (model.collection.name == "goodssales") {
              var category_ids = []
              var categObj = {}
              for (var item of items) {
                categObj[item._id] = item.category
                if (item.category != "" && item.category != null) {
                  category_ids.push(item.category)
                }
              }
              instance.goodsCategory.find({ _id: { $in: category_ids } }, (err, categories) => {
                if (err) {
                  send_Error(request.raw.url, JSON.stringify(err))
                  this.error('Error on finding category')
                }
                else {
                  if (categories == null) {
                    categories = []
                  }
                  var Answer = []
                  var catObj = {}
                  for (var categ of categories) {
                    catObj[categ._id] = categ
                  }
                  for (var good of items) {
                    if (catObj[categObj[good._id]] != undefined) {
                      good.category = catObj[categObj[good._id]].name
                      Answer.push(good)
                    }
                  }
                  this.ok({
                    total: Answer.length,
                    page: Math.ceil(Answer.length / request.params.page),
                    data: Answer.slice(request.params.page * (request.params.list - 1), request.params.page * request.params.list)
                  })
                }
              })
            }
            else {
              this.ok({
                total: items.length,
                page: Math.ceil(items.length / request.params.page),
                data: items.slice(request.params.page * (request.params.list - 1), request.params.page * request.params.list)
              })
            }
          }
        }).sort({ category: 1 }).sort({ name: 1 })
      }
    }
    else {
      this.send(wrong_token)
    }
  })

  function messageTo(receiver) {
    var P = receiver.is_active ? 1 : 0
    var message = {
      to: receiver.fire_token,
      data: {
        type_message: "ALLOW",
        message: P
      }
    }

    fcm.send(message, function (err, response) {
      if (err) {
        send_Error('Allow employee to ' + receiver.name, JSON.stringify(err))
        // reply.error('Invalid firebase token')
      } else {
        instance.send_Error('working', 'working')
        send_to_slack('Allow employee to ' + receiver.name, 'employeeslists', 'Success')
        // reply.ok(receiver)
      }
    })
  }

  //////////////////updateway

  instance.decorateReply('update', function (request, model, user, options) {
    if (!request.body) {
      request.body.last_updated = new Date().getTime()
      request.body.last_stock_updated = new Date().getTime()
    }
    if (request.body.is_group == undefined) {
      if (request.body.sale_is_avialable == "") {
        request.body.sale_is_avialable = false
      }
      if (request.body.representation_type == "") {
        delete request.body.representation_type
      }
      if (request.body.in_stock == '') {
        delete request.body.in_stock
      }
      if (request.body.representation == "") {
        delete request.body.representation
      }
      if (request.body.shape == "") {
        delete request.body.shape
      }
      if (request.body.is_composite_item == '') {
        request.body.is_composite_item == false
      }
      if (request.body.is_composite_item) {
        if (request.body.composite_items == null) {
          request.body.composite_items = []
        }
        var a = true
        AA = []
        var index = 0
        for (let tt = 0; tt < request.body.composite_items.length - 1; tt++) {
          AA.push(request.body.composite_items[tt])
          if (request.body.composite_items[tt].product_id == '') {
            a = false
            index = tt
            break
          }
        }
        if (a) {
          if (request.body.composite_items[request.body.composite_items.length - 1].product_id !== '') {
            AA.push(request.body.composite_items[request.body.composite_items.length - 1])
          }
        }
        if (a == false) {
          if (request.body.composite_items == null) {
            request.body.composite_items = []
          }
          var BBODY = request.body.composite_items
          var BODY = []
          var invalid = false
          for (let kk = 0; kk < BBODY.length - 1; kk++) {
            if (BBODY[kk].product_name != '') {
              BODY.push({
                product_name: BBODY[kk].product_name,
                product_id: BBODY[kk + 1].product_id,
                quality: parseFloat(BBODY[kk].quality),
                cost: BBODY[kk].cost
              })
              var com = BBODY[kk]
              var comm = BBODY[kk + 1]
              invalid = invalid || comm.product_id === undefined || comm.product_id === ""
                || com.product_name === undefined || com.product_name === ""
                || com.quality === undefined || com.quality === ""
                || com.cost === undefined || com.cost === ""
            }
          }
          if (invalid) {
            request.body.composite_items = []
            request.body.is_composite_item = false
          }
          else {
            request.body.composite_items = BODY
          }
        }
        else {
          request.body.composite_items = AA
          if (AA.length > 0) {
            request.body.is_composite_item = true
          }
        }
      }
      // else {
      //   request.body.composite_items = []
      // }
    }
    if (options.public_search && request.headers['accept-user'] == 'QRCode') {
      model.updateOne({
        _id: request.params.id
      }, { $set: request.body }, (err, result) => {
        if (err) {
          this.error('Error on updating')
        }
        else {
          this.ok(result)
        }
      })
    }
    else if (user) {
      if (model.collection.name == 'inoneservices') {
        try {
          user = user.toObject()
        }
        catch (error) {
          instance.send_Error('to Object', error.message)
        }
        user.service = request.params.id
      }
      if (model.collection.name == 'employeeslists') {
        instance.employees.findOne({
          _id: request.params.id
        }, (err, employeee) => {
          if (err || employeee == null) {
            if (request.headers['accept-user']) {
              delete request.body.category
            }
            this.send({
              statusCode: 404,
              message: 'Employee does not exist'
            })
          }
          else {
            instance.employees.find({
              organization: employeee.organization,
              service: employeee.service
            }, (err, employeess) => {
              if (err || employeess == null) {
                this.send({
                  statusCode: 404,
                  message: 'Employee does not exist'
                })
              }
              else {
                var valid = false
                if (request.body.password == undefined) {
                  valid = true
                }
                else {
                  request.body.password = parseInt(request.body.password)
                  var check = true
                  for (var e of employeess) {
                    check = check && (!(e._id != request.params.id && e.password == request.body.password))
                  }
                  valid = check && request.body.password >= 1000 && request.body.password <= 9999
                }
                if (valid) {
                  model.updateOne({ _id: request.params.id }, { $set: request.body }, (err) => {
                    if (err) {
                      instance.send_Error(request.raw.url, JSON.stringify(err))
                      this.error('Error on updating')
                    }
                    else {
                      instance.employees.findOne({ _id: request.params.id }, (err, employee) => {
                        if (err) {
                          instance.send_Error(request.raw.url, JSON.stringify(err))
                          this.error('Erorr on finding employee')
                        }
                        else {
                          if (employee) {
                            instance.employees.find({
                              organization: employee.organization,
                              service: employee.service
                            }, (err, employees) => {
                              if (err || employees == null) {
                                employees = []
                              }
                              for (var e of employees) {
                                messageTo(e)
                              }
                            })
                            this.ok(employee)
                          }
                          else {
                            this.error('Error on finding')
                          }
                        }
                      })
                    }
                  })
                }
                else {
                  this.send({
                    statusCode: 450,
                    message: 'Password must be unique'
                  })
                }
              }
            })
          }
        })
      }
      else if (request.body.is_group == true && model.collection.name == 'item_datas') {
        request.body.is_group = undefined
        model.updateOne({
          _id: request.params.id
        }, request.body, (error, result) => {
          if (error) {
            send_to_slack('update', model.collection.name, 'Error')
            send_Error(request.raw.url, JSON.stringify(error))
            this.error('Could not update')
          } else {
            if (result.ok) {
              model.findOne({
                _id: request.params.id
              }, (error, item) => {
                if (error) {
                  send_to_slack('update', model.collection.name, 'Error')
                  send_Error(request.raw.url, JSON.stringify(error))
                  this.error('Could not found')
                } else {
                  instance.push_changes(request, findCollectionName(model.collection.name), request.headers['accept-service'])
                  if (request.body.is_cancel) {
                    // var cancelled_item_data_model = new instance.cancelledItemDatas(Object.assign({
                    //   waiter_id: user._id,
                    //   waiter_name: user.name
                    // }, item))
                    // cancelled_item_data_model.save((err) => {
                    //   instance.send_Error('creating cancelled item data', JSON.stringify(err))
                    // })
                  }
                  // this.ok(item)
                }
              })
            }
            else {
              send_to_slack('update', model.collection.name, 'Error')
              send_Error(request.raw.url, JSON.stringify(result))
              this.error('Error on updating')
            }
          }
        })
      }
      else {
        if (model.collection.name == 'settingstaxes') {
          Taxes_Update(request, model, user, this)
        }
        else {
          model.findOne({ _id: request.params.id }, (err, results) => {
            if (err) {
              send_Error(request.raw.url, JSON.stringify(err))
              this.error('Could not find')
            } else {
              if (results) {

                if (model.collection.name == 'goodssales') {
                  let old_prices;
                  let old_price;
                  if (!(results.services instanceof Array)) {
                    results.services = []
                  }
                  for (const s of results.services) {
                    if (s.service + '' == request.headers['accept-service'] + '') {
                      old_prices = s.prices
                      old_price = s.price
                    }
                  }

                  if (request.body && typeof request.body.price == typeof 5) {
                    if (request.body.price != old_price) {
                      request.body.last_price_change = new Date().getTime()
                    }
                  }

                  if (request.body && request.body.prices instanceof Array) {
                    if (request.body.prices != old_prices) {
                      request.body.last_price_change = new Date().getTime()
                    }
                  }
                  request.body.last_updated = new Date().getTime()
                  request.body.last_stock_updated = new Date().getTime()

                  if (request.body.cost) {
                    if (request.body.cost > results.max_cost || results.max_cost == 0) {
                      results.max_cost = request.body.cost
                    }
                  }

                  var old_edited_item = {}
                  var new_edited_item = {}
                  if (request.headers['accept-user'] == 'employee') {
                    delete request.body.is_composite_item
                  }
                  if (request.body.category == '' || request.body.category == undefined) {
                    request.body.category = '123'
                  }
                  request.body.last_updated = new Date().getTime()
                  request.body.last_stock_updated = new Date().getTime()
                  var change = 0
                  var next_stock = 0
                  if (request.body.sku) {
                    old_edited_item.sku = results.sku
                    new_edited_item.sku = request.body.sku
                    old_edited_item._id = request.params.id
                  }
                  if (request.body.name) {
                    old_edited_item.name = results.name
                    new_edited_item.name = request.body.name
                  }
                  let prices = []
                  for (let i = 0; i < results.services.length; i++) {
                    if (results.services[i].service + '' == request.headers['accept-service'] + '') {
                      old_edited_item.price = results.services[i].price
                      results.services[i].price = request.body.price
                      if (request.body.prices instanceof Array) {
                        results.services[i].prices = request.body.prices
                        prices = request.body.prices
                      }
                      else if (results.services[i].prices instanceof Array) {
                        prices = results.services[i].prices
                      }
                      results.services[i].stopped_item = request.body.stopped_item
                      new_edited_item.price = results.services[i].price
                      if (results.services[i].in_stock != request.body.in_stock) {
                        change = request.body.in_stock - results.services[i].in_stock
                        next_stock = request.body.in_stock
                      }
                      results.services[i].in_stock = request.body.in_stock
                    }
                  }

                  request.body.services = JSON.parse(JSON.stringify(results.services));

                  instance.check_sku(request, user.organization, (result) => {
                    if (result.success == 1) {
                      instance.goodsCategory.findOne({ _id: request.body.category }, (err, category) => {
                        if (category == null || err) {
                          instance.goodsCategory.findOne({ is_other: true, organization: user.organization }, (err, categ) => {
                            if (err || categ == null) {
                              if (err != null)
                                send_Error(request.raw.url, JSON.stringify(err))
                              this.error('Other Category does not exist')
                            }
                            else {
                              request.body.category = categ._id
                              request.body.category_id = instance.ObjectId(categ._id)
                              request.body.category_name = categ.name
                              model.updateOne({
                                _id: request.params.id
                              }, request.body, (error, result) => {
                                if (error) {
                                  send_Error(request.raw.url, JSON.stringify(error))
                                  this.error('Could not update')
                                } else {
                                  if (result.ok) {
                                    // save changed item
                                    old_edited_item.category = results.category_name
                                    new_edited_item.category = categ.name
                                    instance.create_item_edit_by_employee(old_edited_item, new_edited_item, request.headers['accept-service'], user)

                                    // 'create_inventory_history', (user, reason, unique, service_id, product_id, cost, adjustment, stock_after, date)
                                    if (change != 0) {
                                      instance.create_inventory_history(user, 'item edit', "", request.headers['accept-service'], request.params.id, results.cost, change, next_stock, new Date().getTime())
                                    }
                                    /////
                                    if (request.body && typeof request.body.price == typeof 5) {
                                      if (request.body.price != old_price) {
                                        instance.create_price_change_history(
                                          user,
                                          request.headers['accept-service'],
                                          request.params.id,
                                          old_price,
                                          request.body.price,
                                          new Date().getTime()
                                        )
                                      }
                                    }

                                    if (request.body && request.body.prices instanceof Array) {
                                      if (request.body.prices != old_prices) {
                                        instance.create_prices_change_history(
                                          user,
                                          request.headers['accept-service'],
                                          request.params.id,
                                          old_prices,
                                          request.body.prices,
                                          new Date().getTime()
                                        )
                                      }
                                    }
                                    /////
                                    model.findOne({
                                      _id: request.params.id
                                    }, (error, item) => {
                                      if (error) {
                                        send_Error(request.raw.url, JSON.stringify(error))
                                        this.error('Could not found')
                                      } else {
                                        if (request.body.is_group == undefined) {
                                          category_count('update', item, results)
                                        }
                                        instance.change_all_composite(item._id, user)
                                        item.prices = prices

                                        if (request.body.in_stock_changed == true) {
                                          this.ok(item)
                                        }
                                        else {
                                          this.ok(item)
                                          instance.push_changes(request, findCollectionName(model.collection.name), request.headers['accept-service'])
                                        }
                                      }
                                    })
                                  }
                                  else {
                                    send_Error(request.raw.url, JSON.stringify(result))
                                    this.error('Error on updating')
                                  }
                                }
                              })
                            }
                          })
                        }
                        else {
                          request.body.category_name = category.name
                          request.body.category_id = instance.ObjectId(category._id)
                          request.body.category = category._id
                          model.updateOne({
                            _id: request.params.id
                          }, request.body, (error, result) => {
                            if (error) {
                              send_to_slack('update', model.collection.name, 'Error')
                              send_Error(request.raw.url, JSON.stringify(error))
                              this.error('Could not update')
                            } else {
                              if (result.ok) {
                                // save changed item
                                old_edited_item.category = results.category_name
                                new_edited_item.category = category.name
                                instance.create_item_edit_by_employee(old_edited_item, new_edited_item, request.headers['accept-service'], user)

                                if (change != 0) {
                                  instance.create_inventory_history(user, 'item edit', "", request.headers['accept-service'], request.params.id, results.cost, change, next_stock, new Date().getTime())
                                }
                                if (request.body && typeof request.body.price == typeof 5) {
                                  if (request.body.price != old_price) {
                                    instance.create_price_change_history(
                                      user,
                                      request.headers['accept-service'],
                                      request.params.id,
                                      old_price,
                                      request.body.price,
                                      new Date().getTime()
                                    )
                                  }
                                }

                                if (request.body && request.body.prices instanceof Array) {
                                  if (request.body.prices != old_prices) {
                                    instance.create_prices_change_history(
                                      user,
                                      request.headers['accept-service'],
                                      request.params.id,
                                      old_prices,
                                      request.body.prices,
                                      new Date().getTime()
                                    )
                                  }
                                }
                                model.findOne({
                                  _id: request.params.id
                                }, (error, item) => {
                                  if (error) {
                                    send_to_slack('update', model.collection.name, 'Error')
                                    send_Error(request.raw.url, JSON.stringify(error))
                                    this.error('Could not found')
                                  } else {
                                    if (request.body.is_group == undefined) {
                                      category_count('update', item, results)
                                    }
                                    item.prices = prices
                                    instance.change_all_composite(item._id, user)

                                    if (request.body.in_stock_changed == true) {
                                      this.ok(item)
                                    }
                                    else {
                                      this.ok(item)
                                      instance.push_changes(request, findCollectionName(model.collection.name), request.headers['accept-service'])
                                    }
                                  }
                                })
                              }
                              else {
                                send_Error(request.raw.url, JSON.stringify(result))
                                this.error('Error on updating')
                              }
                            }
                          })
                        }
                      })
                    }
                    else {
                      if (result.sku) {
                        this.send({
                          statusCode: 411,
                          message: 'SKU Allready exist'
                        })
                      }
                      else if (result.barcode) {
                        this.send({
                          statusCode: 412,
                          message: 'Barcode Allready exist'
                        })
                      }
                      else {
                        this.error('Error on creating item')
                      }
                    }
                  })
                } else if (model.collection.name == 'goodscategories' && request.body.section != null) {
                  instance.goodsCategory.find({
                    organization: user.organization,
                    name: request.body.name
                  }, (err, cats) => {
                    if (cats == undefined) {
                      cats = []
                    }
                    if (cats.length < 2) {
                      instance.goodsSection.findOne({ _id: request.body.section }, (err, section) => {
                        if (section == null) {
                          instance.goodsSection.findOne({ is_other: true, organization: user.organization }, (err, sect) => {
                            if (err || sect == null) {
                              if (err != null)
                                send_Error(request.raw.url, JSON.stringify(err))
                              this.error('Other Section does not exist')
                            }
                            else {
                              request.body.section = sect._id
                              request.body.section_id = instance.ObjectId(sect._id)
                              if (request.headers['accept-user'] == 'admin') {
                                instance.update_sub_category(request, this, results)
                              }
                              else {
                                model.updateOne({
                                  _id: request.params.id
                                }, request.body, (error, result) => {
                                  if (error) {
                                    send_to_slack('update', model.collection.name, 'Error')
                                    send_Error(request.raw.url, JSON.stringify(error))
                                    this.error('Could not update')
                                  } else {
                                    if (result.ok) {
                                      model.findOne({
                                        _id: request.params.id
                                      }, (error, item) => {
                                        if (error) {
                                          send_to_slack('update', model.collection.name, 'Error')
                                          send_Error(request.raw.url, JSON.stringify(error))
                                          this.error('Could not found')
                                        } else {
                                          if (request.body.is_group == undefined) {
                                            section_count('update', item, results)
                                          }
                                          // pushnotification(findCollectionName(model.collection.name), [item], user, 'update', this, false)
                                          this.ok(item)
                                          instance.push_to_organization(findCollectionName(model.collection.name), user.organization)
                                        }
                                      })
                                    }
                                    else {
                                      send_to_slack('update', model.collection.name, 'Error')
                                      send_Error(request.raw.url, JSON.stringify(result))
                                      this.error('Error on updating')
                                    }
                                  }
                                })
                              }
                            }
                          })
                        }
                        else {
                          request.body.section_id = instance.ObjectId(section._id)
                          if (request.headers['accept-user'] == 'admin') {
                            instance.update_sub_category(request, this, results)
                          }
                          else {
                            model.updateOne({
                              _id: request.params.id
                            }, request.body, (error, result) => {
                              if (error) {
                                send_to_slack('update', model.collection.name, 'Error')
                                send_Error(request.raw.url, JSON.stringify(error))
                                this.error('Could not update')
                              } else {
                                if (result.ok) {
                                  model.findOne({
                                    _id: request.params.id
                                  }, (error, item) => {
                                    if (error) {
                                      send_to_slack('update', model.collection.name, 'Error')
                                      send_Error(request.raw.url, JSON.stringify(error))
                                      this.error('Could not found')
                                    } else {
                                      this.ok(item)
                                      instance.push_to_organization(findCollectionName(model.collection.name), user.organization)
                                    }
                                  })
                                }
                                else {
                                  send_to_slack('update', model.collection.name, 'Error')
                                  send_Error(request.raw.url, JSON.stringify(result))
                                  this.error('Error on updating')
                                }
                              }
                            })
                          }
                        }
                      })
                    }
                    else {
                      this.error('Error on updating category')
                    }
                  })
                }
                else {
                  if (model.collection.name == 'inventorypurchases') {
                    for (var r = 0; r < request.body.items; r++) {
                      if (request.body.items[r].to_receive != null)
                        request.body.items[r].received += request.body.items[r].to_receive
                      request.body.items[r].to_receive = 0
                    }
                  }
                  if (model.collection.name == 'item_datas' && request.body.is_group == undefined) {
                    request.body._id = request.params.id
                    subtrack_or_add_products_update(false, user, this, [request.body])
                    model.findOne({ _id: request.params.id }, (err, item) => {
                      if (request.body.is_cancel) {
                        // var cancelled_item_data_model = new instance.cancelledItemDatas(Object.assign({
                        //   waiter_id: user._id,
                        //   waiter_name: user.name
                        // }, item))
                        // cancelled_item_data_model.save((err) => {
                        //   instance.send_Error('creating cancelled item data', JSON.stringify(err))
                        // })
                      }
                    })
                  }
                  else {
                    if (['goodscategories', 'goodsdiscounts', 'goodssections', 'settingstaxes'].includes(model.collection.name)) {
                      var query = {
                        organization: user.organization
                      }
                      if (['goodscategories', 'goodssections'].includes(model.collection.name)) {
                        query.name = request.body.name
                      }
                      else if (model.collection.name == 'goodsdiscounts') {
                        query.name = request.body.name
                        query.value = request.body.value
                      }
                      else {
                        query.name = request.body.name
                        query.tax = request.body.tax
                      }
                      model.findOne(query, (err, check) => {
                        if (err) {
                          this.error('Error on updating')
                          instance.send_Error('finding unique', JSON.stringify(err))
                        }
                        var valid = false
                        if (check != null) {
                          if (check._id == request.params.id) {
                            valid = true
                          }
                          else {
                            valid = false
                          }
                        }
                        else {
                          valid = true
                        }
                        if (valid) {
                          if (model.collection.name == 'goodscategories' && request.headers['accept-user'] == 'admin') {
                            instance.update_sub_category(request, this, results)
                          }
                          else {
                            model.findOneAndUpdate({
                              _id: request.params.id
                            }, request.body, (error, result) => {
                              if (error) {
                                send_Error(request.raw.url, JSON.stringify(error))
                                this.error('Could not update')
                              } else {

                                if (result) {
                                  model.findOne({
                                    _id: request.params.id
                                  }, (error, item) => {
                                    if (error) {
                                      send_Error(request.raw.url, JSON.stringify(error))
                                      this.error('Could not found')
                                    } else {
                                      // this.ok(model)
                                      if (model.collection.name == 'settingstaxes') {

                                        var ITEM = Object.assign({
                                          _id: item._id,
                                          organization: item.organization,
                                          service: item.service,
                                          name: item.name,
                                          tax: item.tax,
                                          type: item.type,
                                          option: item.option,
                                          __v: item.__v,
                                          products: []
                                        })
                                        if (findCollectionName(model.collection.name) !== 'null') {
                                          this.ok(ITEM)
                                          instance.push_to_organization(findCollectionName(model.collection.name), user.organization)
                                        }
                                        else {
                                          this.ok(ITEM)
                                        }
                                      }
                                      else {
                                        if (findCollectionName(model.collection.name) !== 'null') {
                                          var service_id = user.service
                                          if (service_id == undefined) {
                                            service_id = model.service
                                          }
                                          this.ok(item)
                                          instance.push_to_organization(findCollectionName(model.collection.name), user.organization)
                                        }
                                        else {
                                          this.ok(item)
                                        }
                                      }
                                    }
                                  })
                                }
                                else {
                                  send_Error(request.raw.url, JSON.stringify(result))
                                  this.error('Error on updating')
                                }
                              }
                            })
                          }
                        }
                        else {
                          this.send({
                            statusCode: 411,
                            message: 'Allready exist'
                          })
                        }
                      })
                    }
                    else {
                      model.updateOne({
                        _id: request.params.id
                      }, {
                        $set: request.body
                      }, (error, result) => {
                        if (error) {
                          send_to_slack('update', model.collection.name, 'Error')
                          send_Error(request.raw.url, JSON.stringify(error))
                          this.error('Could not update')
                        } else {
                          if (result) {
                            model.findOne({
                              _id: request.params.id
                            }, (error, item) => {
                              if (error) {
                                send_to_slack('update', model.collection.name, 'Error')
                                send_Error(request.raw.url, JSON.stringify(error))
                                this.error('Could not found')
                              } else {
                                // this.ok(model)
                                if (model.collection.name == 'settingstaxes') {

                                  var ITEM = Object.assign({
                                    _id: item._id,
                                    organization: item.organization,
                                    service: item.service,
                                    name: item.name,
                                    tax: item.tax,
                                    type: item.type,
                                    option: item.option,
                                    __v: item.__v,
                                    products: []
                                  })
                                  if (findCollectionName(model.collection.name) !== 'null') {
                                    this.ok(ITEM)
                                    instance.push_to_organization(findCollectionName(model.collection.name), user.organization)
                                  }
                                  else {
                                    this.ok(ITEM)
                                  }
                                }
                                else {
                                  if (findCollectionName(model.collection.name) !== 'null') {
                                    var service_id = user.service
                                    if (service_id == undefined) {
                                      service_id = model.service
                                    }
                                    this.ok(item)
                                    instance.push_to_organization(findCollectionName(model.collection.name), user.organization)
                                  }
                                  else {
                                    this.ok(item)
                                  }
                                  if (model.collection.name == 'tickets' && request.body.is_receipt_created == true) {
                                    update_tables([item.table_id])
                                  }
                                }
                              }
                            })
                          }
                          else {
                            send_Error(request.raw.url, JSON.stringify(result))
                            this.error('Error on updating')
                          }
                        }
                      })
                    }
                  }
                }
              }
              else {
                this.error('Does not exist')
              }
            }
          })
        }
      }
    }
    else {
      this.error('Access Error')
    }
  })

  function get_url_of_model(model) {
    var a = ''
    switch (model.collection.name) {
      case 'goodssales':
        a = '/goods/sales'
        break
      case 'goodscategories':
        a = '/goods/category'
        break
      case 'goodssections':
        a = '/goods/section'
        break
      case 'goodsdiscounts':
        a = '/goods/discount'
        break
      case 'settingstaxes':
        a = '/settings/tax'
        break
      case 'debts':
        a = '/debts'
        break
      case 'gifts':
        a = '/gifts'
        break
      case 'receipts':
        a = '/receipts'
        break
      case 'shifts':
        a = '/shifts'
        break
      case 'tables':
        a = '/tables'
        break
      case 'tickets':
        a = '/tickets'
        break
      case 'item_datas':
        a = '/item_datas'
        break
      case 'employeeslists':
        a = '/employees/list'
        break
      case 'posdevices':
        a = '/posdevices'
        break
      case 'printers':
        a = '/settings/printer'
        break
    }
    return a
  }


  function goods_sales_update_group_helper(request, reply, available_categories, goods_own, updated_category_index, categories, goods) {
    var t = 0
    for (var cat of categories) {
      t++
      cat.count += updated_category_index[cat._id]
      instance.goodsCategory.updateOne({ _id: cat._id }, { $set: { count: cat.count } }, (err, result) => {
        if (t == categories.length) {
          var Goods = []
          for (var good of goods) {
            if (!available_categories.includes(goods_own[good._id].category)) {
              goods_own[good._id].category = ''
            }
            Goods.push(goods_own[good._id])
          }
          reply.ok(Goods)
        }
      })
    }
  }

  function goods_sales_update_group(request, reply, only = false) {
    if (!only) {
      goods_own = {}
      goods_indexes = []
      updated_category_index = {}
      updated_category_ids = []
      for (var good of request.body) {
        goods_indexes.push(good._id)
        goods_own[good._id] = good
        if (good.category != undefined || good.category != "") {
          if (updated_category_index[good.category] == undefined) {
            updated_category_index[good.category] = 1
            updated_category_ids.push(good.category)
          }
          else {
            updated_category_index[good.category] += 1
          }
        }
      }
      instance.goodsSales.find({ _id: { $in: goods_indexes } }, (err, goods) => {
        if (err) {
          reply.error('Error on finding goods sales')
        }
        if (goods) {
          for (var good of goods) {
            if (good.category != undefined || good.category != "") {
              if (updated_category_index[good.category] == undefined) {
                updated_category_index[good.category] = -1
                updated_category_ids.push(good.category)
              }
              else {
                updated_category_index[good.category] -= 1
              }
            }
          }
          instance.goodsCategory.find({ _id: { $in: updated_category_ids } }, (err, categories) => {
            if (err) {
              reply.error('Error on finding category')
            }
            var available_categories = []
            for (var cat of categories) {
              available_categories.push(cat._id + "")
            }
            goods_sales_update_group_helper(request, reply, available_categories, goods_own, updated_category_index, categories, goods)
          })
        }
        else {
          reply.error('Not found')
        }
      })
    }
    else {

    }
  }

  // updategroupway

  instance.decorateReply('update_group', function (request, model) {
    if (!request.body) {
      return this.error('Body is empty')
    }
    if (request.body.length == 0) {
      return this.error('Body is empty')
    }
    if (model.collection.name == "goodssales") {
      var model_to_send = []
      var product_ids = []
      for (var req of request.body) {
        if (req.category != null) {
          model_to_send.push(req)
          product_ids.push(req._id)
        }
      }
      instance.goodsSales.find({ _id: { $in: product_ids } }, (err, goods) => {
        if (err) {
          send_Error(request.raw.url, JSON.stringify(err))
        }
        else {
          var service_id;
          if (goods == null) {
            goods = []
          }
          else {
            if (goods.length > 0)
              service_id = goods[0].service
          }
          var old_categories = []
          for (var good of goods) {
            old_categories.push(good.category)
          }
        }
      })
    }
    // if (model.collection.name == "goodscategories") {
    //   var model_to_send = []
    //   var product_ids = []
    //   for (var req of request.body) {
    //     if (req.section != null) {
    //       model_to_send.push(req)
    //       product_ids.push(req._id)
    //     }
    //   }
    //   instance.goodsCategory.find({ _id: { $in: product_ids } }, (err, goods) => {
    //     if (err) {
    //       send_Error(request.raw.url, JSON.stringify(err))
    //     }
    //     else {
    //       var service_id;
    //       if (goods == null) {
    //         goods = []
    //       }
    //       else {
    //         if (goods.length > 0)
    //           service_id = goods[0].service
    //       }
    //       var old_sections = []
    //       for (var good of goods) {
    //         old_sections.push(good.section)
    //       }
    //       // section_count('update', model_to_send, old_sections, false, request.headers['authorization'], service_id)
    //     }
    //   })
    // }
    // if (model.collection.name == 'tables') {
    //   var token = request.headers['authorization']
    //   if (token)
    //     instance.User.findOne({ employee_token: token }, (err, employer) => {
    //       if (err) {
    //         this.error('Error on finding employee')
    //       }
    //       else {
    //         if (employer) {
    //           // delete_ticket_and_item_data([], request.body, employer)
    //         }
    //         else {
    //           this.send(wrong_token)
    //         }
    //       }
    //     })
    //   else
    //     this.send(wrong_token)
    // }
    if (model.collection.name == 'item_datas') {
      var token = request.headers['authorization']
      if (token)
        instance.User.findOne({ employee_token: token }, (err, employer) => {
          if (err) {
            this.error('Error on finding employee')
          }
          else {
            if (employer) {
              subtrack_or_add_products_update(true, employer, this, request.body)
            }
            else {
              this.send(wrong_token)
            }
          }
        })
      else
        this.send(wrong_token)
    }
    else {
      var Answer = []
      var length = request.body.length
      for (let i = 0; i < request.body.length; i++) {
        var This = this
        var obj = request.body[i]
        axios.defaults.headers.common['Authorization'] = request.headers.authorization;
        axios.defaults.headers.common['Accept-Version'] = '1.0.0';
        axios.defaults.headers.common['Accept-Service'] = request.headers['accept-service'];
        axios.defaults.headers.post['Content-Type'] = 'application/json';
        axios.defaults.headers.post['Accept-User'] = request.headers['accept-user']
        axios.defaults.headers.post['Accept-Id'] = request.headers['accept-id']
        obj.is_group = true
        obj.taxes = undefined
        obj.is_composite_item = undefined
        delete obj.taxes
        axios.defaults.data = obj
        axios.post(BASE_URL + get_url_of_model(model) + '/update/' + obj._id, obj)
          .then(function (response) {
            if (response.data.data != null) {
              var OBJ = response.data.data
              if (model.collection.name == 'goodssales') {
                for (var s of OBJ.services) {
                  if (s.service + '' == request.headers['accept-service'] + '') {
                    OBJ.in_stock = s.in_stock
                  }
                }
                var taxes = []
                for (var t of OBJ.taxes) {
                  if (t.available) {
                    taxes.push(t.tax_id + '')
                  }
                }
                OBJ.taxes = taxes
                delete OBJ.services
              }
              Answer.push(OBJ)
            }
            if (!response.data.data) {
              Answer.push({})
            }
          })
          .catch(function (error) {
            Answer.push({})
            send_to_slack('update_group', model.collection.name, 'Error')
            send_Error(request.raw.url, JSON.stringify(error))
          })
          .then(function () {
            if (Answer.length == length) {
              send_to_slack('update_group', model.collection.name, 'Success')
              var Results = []
              for (var answer of Answer) {
                if (Object.values(answer).length > 0) {
                  Results.push(answer)
                }
              }
              This.ok(Results)
            }
          });
      }
    }
  })

  function recursive_delete_categories(id) {
    instance.goodsCategory.find({ type: id }, (err, categories) => {
      instance.goodsCategory.deleteOne({ _id: id, is_other: { $ne: true } }, () => {
        instance.goodsSales.updateMany({
          category: id
        }, {
          $set: {
            category: '',
            category_name: 'No Category'
          }
        }, (_, res) => { })
        for (const cat of categories) {
          recursive_delete_categories(cat._id)
        }
      })
    })
  }

  async function forCategoryAndDiscountDelete(id) {
    recursive_delete_categories(id)
    instance.goodsCategory.findOne({ _id: id }, async (err, category) => {
      if (err) {
        send_Error('finding category', JSON.stringify(err))
      }
      else {
        if (category == null) {
          instance.goodsSales.findOne({ discount: id }, (err, goodsSale) => {
            if (err) {
              send_Error('goods sales update on discount deleted to find discount', JSON.stringify(err))
            }
            else {
              if (goodsSale) {
                instance.goodsSales.findOneAndUpdate({ _id: goodsSale._id }, {
                  $set: {
                    discount: undefined
                  }
                }, function (err, doc) {
                  if (err) {
                    send_Error('goods sales update on discount deleted ', JSON.stringify(err))
                  }
                })
              }
              else {
                send_Error('goods sales update on category and discount deleted', 'id not found')
              }
            }
          })
        }
        else {
          // change item_tree

          instance.delete_sub_category(id, category.organization)
          try {
            if (category.type != 'top') {
              if (await instance.goodsCategory.findOne({ _id: { $ne: category._id }, type: category.type + '' })) {
                await instance.goodsCategory.updateOne({ _id: category.type }, { $set: { item_tree: true } })
              }
              else {
                await instance.goodsCategory.updateOne({ _id: category.type }, { $set: { item_tree: false } })
              }
            }
          }
          catch (error) {
            instance.send_Error('delete_sub_category', error.message)
          }
          // change goods category
          if (category.is_other == false) {
            instance.goodsSales.find({ category: id }, (err, goodsSaless) => {
              if (err) {
                send_Error('goods sales update on category deleted to find category', JSON.stringify(err))
              }
              else {
                if (goodsSaless == null) {
                  goodsSaless = []
                }
                if (goodsSaless.length > 0) {
                  instance.goodsCategory.findOne({ is_other: true }, (err, categ) => {
                    if (err) {
                      send_Error('finding other category', JSON.stringify(err))
                    }
                    else {
                      if (categ) {
                        instance.goodsSales.updateMany({ category: id }, {
                          $set: {
                            category: categ._id
                          }
                        }, function (err, doc) {
                          if (err) {
                            send_Error('goods sales update on category deleted ', JSON.stringify(err))
                          }
                          else {
                            send_to_slack('category delete', 'goodssales', 'Success')
                          }
                        })
                        categ.count += category.count
                        instance.goodsCategory.updateOne({ _id: categ._id }, { $set: { count: categ.count } }, (err, categg) => {
                          if (err) {
                            send_Error('update other category', JSON.stringify(err))
                          }
                        })
                      }
                    }
                  })
                }
              }
            })
          }
        }
      }
    })
  }

  function forSectionDelete(id) {
    instance.goodsSection.findOne({ _id: id }, (err, section) => {
      if (err) {
        send_Error('finding section', JSON.stringify(err))
      }
      else {
        if (section == null) {
          send_Error('deleting setion', 'section -> null')
        }
        else {
          if (section.is_other == false) {
            instance.goodsSales.find({ section: id }, (err, goodsSaless) => {
              if (err) {
                send_Error('goods sales update on category deleted to find category', JSON.stringify(err))
              }
              else {
                if (goodsSaless == null) {
                  goodsSaless = []
                }
                if (goodsSaless.length > 0) {
                  instance.goodsSection.findOne({ is_other: true, service: goodsSaless[0].service }, (err, sect) => {
                    if (err) {
                      send_Error('finding other section', JSON.stringify(err))
                    }
                    else {
                      if (sect) {
                        instance.goodsSales.updateMany({ section: id }, {
                          $set: {
                            section: sect._id
                          }
                        }, function (err, doc) {
                          if (err) {
                            send_Error('goods sales update on section deleted ', JSON.stringify(err))
                          }
                          else {
                            send_to_slack('section delete', 'goodssales', 'Success')
                          }
                        })
                        sect.count += section.count
                        instance.goodsSection.updateOne({ _id: sect._id }, { $set: { count: sect.count } }, (err, categg) => {
                          if (err) {
                            send_Error('update other section', JSON.stringify(err))
                          }
                        })
                      }
                    }
                  })
                }
                else {
                  send_Error('goods sales ', 'does not exist')
                }
              }
            })
          }
        }
      }
    })
  }

  function delete_all_depends_service(service, reply) {
    var db = mongoose.connection;
    var collection = db.collection('receipts')
    collection.deleteMany({ service: service }, (err) => {
      if (err) {
        send_Error('service delete', JSON.stringify(err))
      }
    })
    collection = db.collection('tables')
    collection.deleteMany({ service: service }, (err) => {
      if (err) {
        send_Error('service delete', JSON.stringify(err))
      }
    })
    collection = db.collection('shifts')
    collection.deleteMany({ service: service }, (err) => {
      if (err) {
        send_Error('service delete', JSON.stringify(err))
      }
    })
    collection = db.collection('settingstaxes')
    collection.deleteMany({ service: service }, (err) => {
      if (err) {
        send_Error('service delete', JSON.stringify(err))
      }
    })
    collection = db.collection('goodscategories')
    collection.deleteMany({ service: service }, (err) => {
      if (err) {
        send_Error('service delete', JSON.stringify(err))
      }
    })
    collection = db.collection('goodssections')
    collection.deleteMany({ service: service }, (err) => {
      if (err) {
        send_Error('service delete', JSON.stringify(err))
      }
    })
    collection = db.collection('goodsdiscounts')
    collection.deleteMany({ service: service }, (err) => {
      if (err) {
        send_Error('service delete', JSON.stringify(err))
      }
    })
    collection = db.collection('gifts')
    collection.deleteMany({ service: service }, (err) => {
      if (err) {
        send_Error('service delete', JSON.stringify(err))
      }
    })
    collection = db.collection('debts')
    collection.deleteMany({ service: service }, (err) => {
      if (err) {
        send_Error('service delete', JSON.stringify(err))
      }
    })
    collection = db.collection('item_datas')
    collection.deleteMany({ service: service }, (err) => {
      if (err) {
        send_Error('service delete', JSON.stringify(err))
      }
    })
    collection = db.collection('tickets')
    collection.deleteMany({ service: service }, (err) => {
      if (err) {
        send_Error('service delete', JSON.stringify(err))
      }
    })
    collection = db.collection('goodssales')
    collection.deleteMany({ service: service }, (err) => {
      if (err) {
        send_Error('service delete', JSON.stringify(err))
      }
    })
    instance.employees.find({ service: service }, (err, employees) => {
      if (err) {
        send_Error('service delete to find employee', JSON.stringify(err))
      }
      else {
        if (employees == null) {
          employees = []
        }
        var employee_ids = []
        for (var emp of employees) {
          employee_ids.push(emp._id)
        }
        collection = db.collection('employeeslists')
        collection.deleteMany({ _id: { $in: employee_ids } }, (err) => {
          if (err) {
            send_Error('service delete', JSON.stringify(err))
          }
        })
        collection = db.collection('fcmnotifications')
        collection.deleteMany({ $or: [{ receipt_id: { $in: employee_ids } }, { sender_id: { $in: employee_ids } }] }, (err) => {
          if (err) {
            send_Error('service delete', JSON.stringify(err))
          }
        })
      }
    })
    instance.services.findOne({ _id: service }, (err, SERVICE) => {
      if (err) {
        send_Error('service delete', JSON.stringify(err))
        reply.error('Error on finding service')
      }
      else {
        if (SERVICE) {
          instance.services.deleteOne({ _id: service }, (err, _) => {
            if (err) {
              send_Error('service delete', JSON.stringify(err))
              reply.error('Error on deleting service')
            }
            else {
              reply.ok(SERVICE)
            }
          })
          instance.organizations.findOne({ _id: SERVICE.organization }, (err, organization) => {
            if (err) {
              send_Error('service delete', JSON.stringify(err))
            }
            else {
              if (organization) {
                var services = []
                for (var s of organization.services) {
                  if (s != service)
                    services.push(s)
                }
                instance.organizations.updateOne({ _id: organization._id }, { $set: { services: services, is_service_created: true } }, (err) => {
                  if (err) {
                    send_Error('service delete', JSON.stringify(err))
                  }
                })
              }
            }
          })
        }
        else {
          send_Error('service delete', 'NOT found')
          reply.send({
            statusCode: 404,
            message: 'Not found'
          })
        }
      }
    })
  }

  ///////////deleteway

  instance.decorate('send_deleted', (dels, name) => {
    if (dels instanceof Array) {
      for (var del of dels) {
        axios.post(`https://api.telegram.org/bot769464007:AAFjO5cpIsqUMbhG0rTLkQ4dex63fjs1nUM/sendMessage?chat_id=-1001431847518&parse_mode=html&text=On ${new Date().getTime()} deleted from ${name}\n ${JSON.stringify(del)}`)
          .then(function (response) { }).catch(function (err) { }).then(function () { })
      }
    }
  })

  instance.decorateReply('delete', function (request, model, user, options) {
    if (options.public_search && request.headers['accept-user'] == 'QRCode') {
      model.deleteOne({ _id: request.params.id }, (err, result) => {
        if (err) {
          this.error('Error on deleting')
        }
        else {
          this.ok(result)
        }
      })
    }
    if (user) {
      if (model.collection.name == 'inoneservices') {
        // on helper
        instance.delete_service(request, this, user)

        // instance.organizations.findOne({_id: user.organization}, (err, organization) => {
        //   if(err) {
        //     instance.send_Error('organization find to delete service', JSON.stringify(err))
        //     reply.error('Organization does not exist')
        //   }
        //   else {
        //     if(organization){
        //       if(organization.services == null) {
        //         organization.services = []
        //       }
        //       if(organization.services.includes(request.params.id)) {
        //         delete_all_depends_service(request.params.id, this)
        //       }
        //       else {
        //         reply.error('Error to delete service')
        //       }
        //     }
        //     else {
        //       reply.error('Organization not found')
        //     }
        //   }
        // })
      }
      else {
        if (model.collection.name == 'goodscategories' || model.collection.name == 'goodsdiscounts')
          forCategoryAndDiscountDelete(request.params.id)
        if (model.collection.name == 'goodssections') {
          forSectionDelete(request.params.id)
        }
        if (model.collection.name == 'settingstaxes') {
          instance.settingsTaxes.findOne({ _id: request.params.id }, (error, taxes) => {
            if (error) {
              instance.send_Error(request.raw.url, JSON.stringify(error))
              reply.error('Error on finding Taxes')
            }
            else {
              if (taxes) {
                if (model.collection.name == 'settingstaxes') {
                  UpdateGoodsSales(request, user, model, [taxes], this, false)
                }
              }
              else {
                reply.error('Taxes not found')
              }
            }
          });
        }
        else {
          model.findOne({ _id: request.params.id }, (err, item) => {
            if (err) {
              instance.send_Error(request.raw.url, JSON.stringify(err))
              this.fourorfour(model.collection.name)
            }
            else {
              if (item) {
                var A = false
                if (model.collection.name == 'goodscategories' || model.collection.name == 'goodssections') {
                  A = item.is_other
                }
                if (!A) {
                  instance.send_deleted([item], model.collection.name)
                  // if(model.collection.name != 'goodssales'){
                  model.deleteOne({
                    _id: request.params.id
                  }, (error, itemm) => {
                    if (error) {
                      send_to_slack('delete', model.collection.name, 'Error')
                      send_Error(request.raw.url, JSON.stringify(error))
                      this.fourorfour(model.collection.name)
                    } else {
                      if (model.collection.name == 'goodssales') {
                        instance.change_all_composite(request.params.id, user)
                        instance.push_deleted_items(request, [request.params.id], user.organization)
                        if (item != undefined) {
                          if (item.category && item.category != "") {
                            category_count('delete', [item])
                          }
                        }
                      }
                      if (model.collection.name == 'goodscategories') {
                        if (item != undefined) {
                          if (item.section && item.section != "") {
                            section_count('delete', [item])
                          }
                        }
                      }
                      if (model.collection.name == 'inoneservices') {
                        this.ok(item)
                      }
                      else {
                        var service_id = user.service
                        if (service_id == undefined) {
                          service_id = item.service
                        }
                        this.ok(item)
                        instance.push_to_organization(findCollectionName(model.collection.name), user.organization)
                      }
                    }
                  })
                  // }
                  // else {
                  //   for(let i=0; i<item.services.length; i++) {
                  //     if(item.services[i].service+'' == request.headers['accept-service']) {
                  //       item.services[i].available = false
                  //     }
                  //   }
                  //   model.updateOne({
                  //     _id: item._id
                  //   }, {
                  //     $set: {
                  //       services: item.services
                  //     }
                  //   }, (err) => {
                  //     if(err) {
                  //       reply.error('Error on deleting')
                  //       instance.send_Error('deleting item', JSON.stringify(err))
                  //     }
                  //     else {
                  //       reply.ok(item)
                  //       instance.push_to_organization(findCollectionName(model.collection.name), user.organization)
                  //     }
                  //   })
                  // }
                }
                else {
                  this.ok()
                }
              }
              else {
                this.send({
                  statusCode: 404,
                  error: 'Nothing to delete'
                })
              }
            }
          })
        }
      }
    }
    else {
      this.error('User not found')
    }
  })

  // deletegroupway

  instance.decorateReply('delete_group', async function (request, model, user) {
    if (user) {
      if (model.collection.name == 'inoneservices') {
        try {
          return this.callNotFound()
          // const devices = await instance.posDevices.find({ service: { $in: request.body.indexes } }).countDocuments()
          // if (devices > 0) {
          //   return this.error('Pos devices')
          // }
          // // await model.deleteMany({ organization: user.organization, _id: request.body.indexes })
          // for (const id of request.body.indexes) {
          //   request.params.id = id
          //   instance.delete_service(request, this, user)
          // }
          // // this.ok()
        } catch (error) {
          this.error(error.message)
        }
      }
      else if (model.collection.name == 'tickets') {
        var indexes = []
        for (var id of request.body.indexes) {
          if (id != undefined && id != null && id != "") {
            if (id.includes('-') == false) {
              indexes.push(id)
            }
          }
        }
        instance.Tickets.find({ _id: { $in: indexes } }, (err, tickets) => {
          instance.send_deleted(tickets, 'tickets')
          instance.Item_Data.deleteMany({ ticket_id: { $in: request.body.indexes } }, (err, _) => {
            if (err) {
              instance.send_Error(request.raw.url, JSON.stringify(err))
            }
          })
          if (err) {
            instance.send_Error(request.raw.url, JSON.stringify(err))
            this.error('Error on finding tickets')
          }
          else {
            if (tickets == null) {
              tickets = []
            }
            var table_ids = []
            for (var tic of tickets) {
              table_ids.push(tic.table_id)
            }
            instance.Tickets.find({ _id: { $in: indexes } }, (err, TICKETS) => {
              if (err) {
                instance.send_Error('finding tickets to delete', JSON.stringify(err))
                reply.error('Error on finding tickets')
              }
              else {
                if (TICKETS == null) {
                  TICKETS = []
                }
                instance.Tickets.deleteMany({ _id: { $in: indexes } }, (err, _) => {
                  if (err) {
                    instance.send_Error(request.raw.url, JSON.stringify(err))
                    this.error('Error on deleting')
                  }
                  else {
                    this.ok(TICKETS)
                    instance.Tickets.find({ table_id: { $in: table_ids } }, (err, ticketss) => {
                      if (err) {
                        instance.send_Error(request.raw.url, JSON.stringify(err))
                      }
                      else {
                        if (ticketss == null) {
                          ticketss = []
                        }
                        var table_ids2 = []
                        for (var tic of ticketss) {
                          table_ids2.push(tic.table_id)
                        }
                        var update_tables = []
                        for (var tab of table_ids) {
                          if (table_ids2.includes(tab) == false) {
                            update_tables.push(tab)
                          }
                        }
                        instance.Tables.updateMany({ _id: { $in: update_tables } }, { $set: { is_empty: true } }, (err, _) => {
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
          }
        })
      }
      else {
        if (model.collection.name == 'goodscategories' || model.collection.name == 'goodsdiscounts') {
          for (var id of request.body.indexes) {
            await forCategoryAndDiscountDelete(id)
          }
        }
        if (model.collection.name == 'goodssections') {
          for (var id of request.body.indexes) {
            forSectionDelete(id)
          }
        }
        model.find({ _id: { $in: request.body.indexes } }, async (err, items) => {
          if (err) {
            send_Error(request.raw.url, JSON.stringify(err))
            this.error('Error on finding...')
          }
          else {
            if (items) {
              if (model.collection.name == 'goodssales') {
                const deleted_items = []
                for (const item of items) {
                  try {
                    deleted_items.push({
                      organization: user.organization,
                      item_id: item._id,
                      created_by: user.name,
                      created_by_id: user._id,
                      date: new Date().getTime()
                    })
                    const variant_items = await instance.goodsSales.find(
                      {
                        organization: user.organization,
                        _id: {
                          $in: item.variant_items
                        }
                      },
                      {
                        _id: 1,
                      },
                    )
                      .lean()

                    for (const v of variant_items) {
                      deleted_items.push({
                        organization: user.organization,
                        item_id: v._id,
                        created_by: user.name,
                        created_by_id: user._id,
                        date: new Date().getTime()
                      })
                    }
                  } catch (err) { }
                  try {
                    await instance.goodsSales.deleteMany({
                      organization: user.organization,
                      _id: {
                        $in: item.variant_items
                      }
                    })
                  } catch (err) { }
                }
                try {
                  await instance.deletedGoodsSales.insertMany(deleted_items)
                } catch (error) { }
              }
              instance.send_deleted(items, model.collection.name)
              if (model.collection.name == 'settingstaxes') {
                UpdateGoodsSales(request, user, model, items, this)
              }
              else {
                var deleted_ids = []
                var tosend = []
                if (model.collection.name == 'goodscategories') {
                  for (var item of items) {
                    if (item.is_other == false) {
                      deleted_ids.push(item._id)
                      tosend.push(item)
                    }
                  }
                } else {
                  tosend = items
                  deleted_ids = request.body.indexes
                }
                let query = { _id: { $in: deleted_ids } }
                if (model.collection.name == 'goodscategories') {
                  query.is_other = {
                    $ne: true
                  }
                }
                if (model.collection.name == 'posdevices') {
                  query.is_active = false
                }
                model.find(query).deleteMany((error) => {
                  if (error) {
                    send_Error(request.raw.url, JSON.stringify(error))
                    this.error('Error on deleting')
                  }
                  else {
                    if (findCollectionName(model.collection.name) !== 'null') {
                      if (model.collection.name == 'goodssales') {
                        if (request.body.indexes) {
                          if (request.body.indexes.length > 0) {
                            for (var id of request.body.indexes) {
                              instance.change_all_composite(id, user)
                            }
                          }
                        }
                        instance.push_deleted_items(request, request.body.indexes, user.organization)
                      }
                      var service_id = user.service
                      if (service_id == undefined) {
                        if (tosend.length > 0) {
                          service_id = tosend[0].service
                        }
                      }
                      this.ok(tosend)
                      instance.push_to_organization(findCollectionName(model.collection.name), user.organization)
                    }
                    else {
                      this.ok(tosend)
                    }
                  }
                })
              }
            }
            else {
              send_to_slack('delete_group', model.collection.name, 'Error')
              var err = {
                statusCode: 404,
                message: "Does not exist",
                error: "Does not exist"
              }
              send_Error(request.raw.url, JSON.stringify(err))
              this.send(err)
            }
          }
        })
          .lean()
      }
    }
    else {
      this.send(wrong_token)
    }
  })

  instance.decorate('fit', (path, method, model, options) => {
    const $method = method !== 'find' && method !== 'delete' && method !== 'finds' && method != 'get' ? 'POST' : (
      (method == 'find' || method == 'finds' || method == 'get') ? 'GET' : 'DELETE'
    )
    // console.log($method, path + '/' + method + (method == 'update' || method == 'delete' || method == 'get' ? '/:id' : (method == 'searching' ? '/:page/:list' : '')))
    instance.route({
      method: $method,
      url: path + '/' + method + (method == 'update' || method == 'delete' || method == 'get' ? '/:id' : (method == 'searching' ? '/:page/:list' : '')),
      version: options.version,
      handler: (request, reply) => {
        switch (method) {
          case 'create_group':
            options.on(request, reply, (user) => {
              reply.create_group(request, model, user, options);
            });
            break;
          case 'create':
            options.on(request, reply, (user) => {
              reply.create(request, model, user, options);
            });
            break;

          case 'find':
            options.on(request, reply, (user) => {
              reply.find(request, model, user, options);
            });
            break;
          case 'get':
            options.on(request, reply, (user) => {
              reply.get(request, model, user, options);
            });
            break;
          case 'finds':
            options.on(request, reply, (user) => {
              reply.finds(request, model, user, options);
            });
            break
          case 'search':
            options.on(request, reply, (user) => {
              reply.search(request, model, user, options);
            });
            break;
          case 'searching':
            options.on(request, reply, (user) => {
              reply.searching(request, model, user, options)
            })
            break
          case 'update':
            options.on(request, reply, (user) => {
              reply.update(request, model, user, options);
            });
            break;
          case 'delete':
            options.on(request, reply, (user) => {
              reply.delete(request, model, user, options);
            });
            break;
          case 'delete_group':
            options.on(request, reply, (user) => {
              reply.delete_group(request, model, user);
            });
            break;
          case 'update_group':
            reply.update_group(request, model, options);
            break;
          default:
            reply.callNotFound();
            break;
        }
      }
    })
  })

  instance.decorate('generate', (path, model, options) => {
    // console.log('On Generator')
    // var on = function (request, reply, next) {
    //   if (request.headers.authorization) {
    //     var token = request.headers['authorization']
    //     instance.employees.findOne({ token: token }, (error, employer) => {
    //       if (error) {
    //         send_Error(request.raw.url, JSON.stringify(error))
    //         reply.send({
    //           statusCode: 404,
    //           error: 'Not found',
    //           message: 'Employee not found'
    //         })
    //       }
    //       else {
    //         if (employer) {
    //           if (employer.is_active) {
    //             next(employer)
    //           }
    //           else {
    //             send_Error(request.raw.url, JSON.stringify({
    //               statusCode: 497,
    //               error: 'Employee do not have an access',
    //               message: 'Not allowed'
    //             }))
    //             reply.send({
    //               statusCode: 497,
    //               error: "Employee do not have an access",
    //               message: "Not allowed"
    //             })
    //           }
    //         }
    //         else {
    //           instance.BOS.findOne({ token: token }, (error, bos) => {
    //             if (error) {
    //               send_Error(request.raw.url, JSON.stringify({
    //                 statusCode: 404,
    //                 error: 'Not found',
    //                 message: 'Bos not found'
    //               }))
    //               reply.send({
    //                 statusCode: 404,
    //                 error: 'Not found',
    //                 message: 'Bos not found'
    //               })
    //             }
    //             else {
    //               if (bos) {
    //                 next(bos)
    //               }
    //               else {
    //                 instance.Admin.findOne({ token: token }, (err, admin) => {
    //                   if (err) {
    //                     send_Error(request.raw.url, JSON.stringify({
    //                       statusCode: 404,
    //                       error: 'Not found',
    //                       message: 'Bos not found'
    //                     }))
    //                     reply.send({
    //                       statusCode: 404,
    //                       error: 'Not found',
    //                       message: 'Bos not found'
    //                     })
    //                   }
    //                   else {
    //                     if (admin) {
    //                       next(admin)
    //                     }
    //                     else {
    //                       send_Error(request.raw.url, JSON.stringify({
    //                         statusCode: 498,
    //                         error: 'Invalid token',
    //                         message: 'Invalid token'
    //                       }))
    //                       if (request.headers['accept-user'] == 'admin') {
    //                         reply.status(401).send({
    //                           message: 'Unauthorized'
    //                         })
    //                       }
    //                       else {
    //                         reply.send({
    //                           statusCode: 498,
    //                           error: "Invalid token",
    //                           message: "Invalid token"
    //                         })
    //                       }
    //                     }
    //                   }
    //                 })
    //               }
    //             }
    //           })
    //         }
    //       }
    //     })
    //   }
    //   else {
    //     if (request.headers['accept-user'] == 'admin') {
    //       reply.status(401).send({
    //         message: 'Unauthorized'
    //       })
    //     }
    //     else {
    //       next(null)
    //     }
    //   }
    // }
    var on = function (request, reply, next) {
      instance.authorization(request, reply, (user) => {
        next(user)
      })
    }
    var defaultOptions = {
      methods: ['find', 'finds', 'get', 'search', 'searching', 'update', 'delete', 'create', 'create_group', 'delete_group', 'update_group'],
      escape: null,
      version: '1.0.0',
      on: on
    }
    options = options !== undefined ? options : {}
    options = Object.assign(defaultOptions, options)
    for (const method of options.methods) {

      instance.fit(path, method, model, options)
    }
  })



  next()
})