
module.exports = (instance, _, next) => {
  var on = function (request, reply, next) {
    instance.authorization(request, reply, (user) => {
      next(user)
    })
    // if (request.headers.authorization) {
    //   var token = request.headers['authorization']
    //   instance.employees.findOne({
    //     token: token
    //   }, (error, employer) => {
    //     if (error) {
    //       reply.send({
    //         statusCode: 404,
    //         error: 'Not found',
    //         message: 'Employee not found'
    //       })
    //     } else {
    //       if (employer) {
    //         if (employer.is_active) {
    //           next(employer)
    //         } else {
    //           reply.send({
    //             statusCode: 497,
    //             error: "Employee do not have an access",
    //             message: "Not allowed"
    //           })
    //         }
    //       } else {
    //         instance.BOS.findOne({
    //           token: token
    //         }, (error, bos) => {
    //           if (error) {
    //             reply.send({
    //               statusCode: 404,
    //               error: 'Not found',
    //               message: 'Bos not found'
    //             })
    //           } else {
    //             if (bos) {
    //               next(bos)
    //             } else {
    //               instance.Admin.findOne({
    //                 token: token
    //               }, (err, admin) => {
    //                 if (err) {
    //                   reply.error('Error on finding admin')
    //                 } else {
    //                   if (admin) {
    //                     next(admin)
    //                   } else {
    //                     if (request.headers['accept-user'] == 'admin') {
    //                       reply.status(401).send({
    //                         message: 'Unauthorized'
    //                       })
    //                     }
    //                     else {
    //                       reply.send({
    //                         statusCode: 498,
    //                         error: "Invalid token",
    //                         message: "Invalid token"
    //                       })
    //                     }
    //                   }
    //                 }
    //               })
    //             }
    //           }
    //         })
    //       }
    //     }
    //   })
    // } else {
    //   if (request.headers['accept-user'] == 'admin') {
    //     reply.status(401).send({
    //       message: 'Unauthorized'
    //     })
    //   }
    //   else {
    //     reply.send({
    //       statusCode: 499,
    //       message: 'Token required'
    //     })
    //   }
    // }
  }

  var sub_service = (handler = handler, service_id, request, reply, items, user = {}) => {
    instance.services.findOne({ _id: service_id }, (err, service) => {
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
          if (handler.name == 'reportsGoodsSales') {
            handler(request, reply, receipts, user)
          }
          else if (handler.name == 'taxes_added') {
            handler(request, reply, receipts, service.service_value)
          }
          else {
            handler(request, reply, receipts)
          }
          // var receipts = []
          // var table_ids = []
          // for(var item of items){
          //   if(item.ticket_id != undefined && item.ticket_id != "")
          //     table_ids.push(item.ticket_id)
          // }
          // instance.Tables.find({_id: {$in: table_ids}}, (err, tables) => {
          //   if(err || tables == null){
          //     tables = []
          //   }
          //   var table_obj = {}
          //   for(var tab of tables){
          //     table_obj[tab._id] = tab.is_self
          //   }
          //   for(var item of items){
          //     if(item.table_id != undefined && item.table_id != ""){
          //       if(table_obj[item.table_id] == false){
          //         item.total_price /= (1+item.service_value/100)
          //       }
          //     }
          //     receipts.push(item)
          //   }
          //   if(handler.name == 'reportsGoodsSales'){
          //     handler(request, reply, receipts, user)
          //   }
          //   else if(handler.name == 'taxes_added'){
          //     handler(request, reply, receipts, service.service_value)
          //   }
          //   else{
          //     handler(request, reply, receipts)
          //   }
          // })
        }
        else {
          reply.error('Service not found')
        }
      }
    })
  }

  var preprocessing = (request, reply, items, service_percentage, Taxes) => {
    var gross_sales = 0.0;
    var refunds = 0.0;
    var discounts = 0.0;
    var cost_of_goods = 0.0;
    var taxes = 0.0;
    var service_value = 0.0;
    var refunded_service_value = 0.0;
    var percent_of_gift = {}
    var giftsss = 0.0
    for (var rec of items) {
      var gg = 0.0
      for (var p of rec.payment) {
        if (p.name == 'gift') {
          if(rec.is_refund) {
            gg -= p.value
          }
          else {
            gg += p.value
          }
        }
      }
      giftsss += gg
      // if (rec.total_price != 0) {
      //   percent_of_gift[rec._id] = gg / rec.total_price
      // }

      if (rec.is_self == false && rec.service_value != undefined) {
        if (rec.is_refund == false)
          service_value += rec.total_price * (rec.service_value / 100.0)
        else {
          refunded_service_value += rec.total_price * (rec.service_value / 100.0)
          service_value -= rec.total_price * (rec.service_value / 100.0)
        }
      }
      var A = (rec.is_refund == false) ? 1 : -1
      for (var pro of rec.sold_item_list) {
        for (var tax of pro.taxes) {
          tax = tax._id
          if (Taxes[tax] != undefined) {
            if (Taxes[tax].type != undefined) {
              if (Taxes[tax].type == 'include') {
                taxes += (pro.value * pro.price) / (1 + Taxes[tax].tax / 100.0) * Taxes[tax].tax / 100.0 * A
              } else {
                taxes += (pro.value * pro.price) * (Taxes[tax].tax / 100.0) * A
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
    var anohters = [];
    var bn, ed
    var A = true
    items.sort((a, b) => (a.date > b.date) ? 1 : ((b.date > a.date) ? -1 : 0));
    for (const item of items) {
      if (item != undefined) {
        if (item.date != undefined) {
          anohters.push({
            time: item.date,
            value: item.total_price
          })
        }
      }
      if (A) {
        A = false
        bn = item.date
      }
      ed = item.date
      // console.log(item.date)
      if (item.is_refund == false) {
        for (const __dis of item.discount) {
          if (__dis != undefined) {
            if (__dis.type != undefined) {
              if (__dis.type == 'percentage') {
                item.total_price = Math.round(item.total_price * 100 / (100 - __dis.value))
                discounts += Math.round(__dis.value * item.total_price / 100);
              } else {
                item.total_price += __dis.value
                discounts += __dis.value;
              }
            }
          }
        }
        gross_sales += item.total_price;
      } else {
        for (const __dis of item.discount) {
          if (__dis != undefined) {
            if (__dis.type != undefined) {
              if (__dis.type == 'percentage') {
                item.total_price = Math.round(item.total_price * 100 / (100 - __dis.value))
                discounts -= Math.round(__dis.value * item.total_price / 100);
              } else {
                item.total_price += __dis.value
                discounts -= __dis.value;
              }
            }
          }
        }
        refunds += item.total_price;
      }
      for (const __saled_item of item.sold_item_list) {
        if (item.is_refund == false)
          cost_of_goods += __saled_item.cost * __saled_item.value
        else
          cost_of_goods -= __saled_item.cost * __saled_item.value
      }
    }
    var banother = [
      Object.assign({
        time: 0,
        value: 0
      })
    ]
    var cnt = 30;
    if (request.body.count) {
      cnt = request.body.count;
    }
    if (items.length >= cnt) {
      var dif = (ed - bn) / cnt
      var half = dif / 2
      var talf = 0
      var my = bn
      var id = 0
      for (let i = 0; i < anohters.length; i++) {
        if (my + talf <= anohters[i].time) {
          my = my + dif
          banother.push({
            time: Math.floor(my - half),
            value: anohters[i].value
          })
          id++
          talf = dif / 2
          half = 0
        } else {
          banother[id].value += anohters[i].value
        }
      }
    } else {
      for (let i = 0; i < items.length; i++) {
        banother.push({
          time: items[i].date,
          value: items[i].total_price
        })
      }
    }
    banother.shift()
    gross_sales += service_value
    discounts += giftsss
    var net_sales = parseInt((gross_sales - (refunds + discounts))*100)/100;
    var debt = 0
    var gross_profit = net_sales - cost_of_goods;
    var recepts = items.length;
    gross_sales += refunded_service_value;
    refunds += refunded_service_value
    reply.ok({
      gross_sales: gross_sales,
      refunds: refunds,
      discounts: discounts,
      cost_of_goods: cost_of_goods,
      debt: debt,
      net_sales: net_sales,
      gross_profit: gross_profit,
      service_value: service_value,
      recepts: recepts,
      taxes: taxes,
      plotting: banother
    });
  }

  var taxes_added = (request, reply, items, service_value, handler = preprocessing) => {
    // var Products = []
    // var PRO = []
    var Obj = {}
    for (let i=0; i<items.length; i++) {
      var tax_value = 0.0
      for (var t of items[i].sold_item_list) {
        if (t.taxes == undefined)
          t.taxes = []
        for (var ta of t.taxes) {
          if (Obj[ta._id] == undefined) {
            Obj[ta._id] = {
              type: ta.type,
              tax: ta.tax
            }
          }
          if(ta.type != 'include') {
            tax_value += ta.tax
          }
        }
      }
      for(let j=0; j<items[i].payment.length; j++) {
        items[i].payment[j].value /= (1+tax_value/100)
      }
      items[i].total_price = items[i].total_price / (1+tax_value/100)
      // Products = [...new Set(Products.concat(ids))]
      // PRO = PRO.concat(item.sold_item_list)
    }
    handler(request, reply, items, service_value, Obj)
    // var Taxes = []

    // for (var pro of PRO) {
    //   Taxes = [...new Set(Taxes.concat(pro.taxes))]
    // }
    // if (Taxes.length == 0) {
    //   handler(request, reply, items, service_value, {})
    // } else {
    //   instance.settingsTaxes.find({
    //     _id: {
    //       $in: Taxes
    //     }
    //   }, (err, TAXES) => {
    //     if (err) {
    //       reply.error('Error on finding taxes')
    //     } else {

    //       if(TAXES == null){
    //         TAXES = []
    //       }
    //       for (var tax of TAXES) {
    //         Obj[tax._id] = {
    //           type: tax.type,
    //           tax: tax.tax
    //         }
    //       }

    //     }
    //   })
    // }
  }

  var reports = (request, reply, user, handler = taxes_added) => {
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
          reply.error('Items could found')
        } else {
          if (items == null) {
            items = []
          }
          sub_service(handler, request.body.service, request, reply, items)
          // handler(request, reply, items)
        }
      })
    }
  }

  /////////////////////////////////////////////////////////////// needs to refactoring
  var sales_by_category = (request, reply, user, recepts, goods_sales, goods_category) => {
    var forindex = {}
    var sales = []
    var sold_product = []
    var prd = []
    var prd_index = {}
    var prd_ind = 0
    var goodsObj = {}
    for (var g of goods_sales) {
      goodsObj[g._id] = g.sold_by
    }
    for (const item of recepts) {
      if (item.is_refund == true) {
        for (const currentproduct of item.sold_item_list) {
          if (prd_index[currentproduct.product_id]) {
            var ind = prd_index[currentproduct.product_id]
            prd[ind].refund_value += currentproduct.value
            prd[ind].refund_price += currentproduct.price * currentproduct.value
            for (const dis of item.discount)
              if (dis.type == 'percentage') {
                prd[ind].discount += dis.value * currentproduct.price * (-1) * (currentproduct.value) / 100
              } else {
                prd[ind].discount += dis.value
              }
          } else {
            prd.push({
              refund_value: currentproduct.value,
              refund_price: currentproduct.price * currentproduct.value,
              discount: 0
            })
            for (const dis of item.discount)
              if (dis.type == 'percentage') {
                prd[prd_ind].discount -= dis.value * currentproduct.price * (-1) * (currentproduct.value) / 100
              } else {
                prd[prd_ind].discount -= dis.value
              }
            prd_index[currentproduct.product_id] = prd_ind
            prd_ind++
          }
          currentproduct.value *= (-1)
          sold_product.push(currentproduct)
        }
      }
      else {
        for (const currentproduct of item.sold_item_list) {
          if (prd_index[currentproduct.product_id]) {
            var ind = prd_index[currentproduct.product_id]
            for (const dis of item.discount)
              if (dis.type == 'percentage') {
                if (currentproduct.value > 0)
                  prd[ind].discount += dis.value * currentproduct.price * currentproduct.value / 100
              } else {
                if (currentproduct.value > 0)
                  prd[ind].discount += dis.value
              }
          }
          else {
            prd.push({
              refund_price: 0,
              refund_value: 0,
              discount: 0
            })
            for (const dis of item.discount)
              if (dis.type == 'percentage') {
                if (currentproduct.value > 0)
                  prd[prd_ind].discount += dis.value * currentproduct.price * currentproduct.value / 100
              } else {
                if (currentproduct.value > 0)
                  prd[prd_ind].discount += dis.value
              }
            prd_index[currentproduct.product_id] = prd_ind
            prd_ind++
          }
          sold_product.push(currentproduct)
        }
      }
    }
    var sold_item = []
    for (const cproduct of sold_product) {
      for (const goodsSale of goods_sales) {
        if (goodsSale._id == cproduct.product_id) {
          sold_item.push(goodsSale)
          break;
        }
      }
    }

    // console.log(sold_item.length)
    for (const currentItem of sold_item) {
      if (forindex[currentItem.category] == undefined) {
        for (const goodCateg of goods_category)
          if (goodCateg._id == currentItem.category) {
            forindex[currentItem.category] = {
              name: goodCateg.name,
              section_id: goodCateg.section,
              id: goodCateg._id
            }
          }
          else if (currentItem.category == "") {
            forindex['NoCategory_test'] = {
              name: "other",
              id: "0102030405"
            }
          }
      }
    }
    // console.log(prd_ind)
    var setitem = {}
    var indexitem = []
    var setted = {}
    var ind = 0
    var inde = 0
    for (let i = 0; i < sold_item.length; i++) {
      // console.log(setted[sold_item[i].category])
      if (setted[sold_item[i].category] == undefined) {
        if (sold_item[i].category != "")
          setted[sold_item[i].category] = ind
        else
          setted["NoCategory_test"] = ind
        ind++
        indexitem[inde] = 0
        setitem[sold_item[i].name] = inde
        // console.log(i)
        // console.log(sold_item[i])
        // console.log('////////////')

        inde++
        if (sold_item[i].category != '') {
          if (forindex[sold_item[i].category]) {
            var item_refund = 0
            var item_sold = 0
            if (sold_product[i].value > 0) {
              item_sold += sold_product[i].value
            }
            else {
              item_refund += sold_product[i].value * (-1)
            }
            var TOTAL = 0
            var TOTAL_PRICE = 0
            TOTAL = sold_product[i].price * sold_product[i].value
            TOTAL_PRICE = sold_product[i].price * sold_product[i].value
            if (goodsObj[sold_product[i].product_id] == 'karaoke') {
              var tt = (sold_product[i].closed_time - sold_product[i].created_time) / 60000
              if (parseInt(tt) * 60000 < tt * 60000) {
                TOTAL *= (parseInt(tt) + 1)
                TOTAL_PRICE *= (parseInt(tt) + 1)
              }
              else {
                TOTAL_PRICE *= parseInt(tt)
                TOTAL *= parseInt(tt)
              }
            }
            sales.push({
              category_name: forindex[sold_item[i].category].name,
              category_id: forindex[sold_item[i].category].id,
              section_id: forindex[sold_item[i].category].section_id,
              total: TOTAL,
              cost_of_goods: sold_product[i].cost * sold_product[i].value,
              items_refunded: prd[prd_index[sold_item[i]._id]].refund_value,
              refunds: prd[prd_index[sold_item[i]._id]].refund_price,
              discount: prd[prd_index[sold_item[i]._id]].discount,
              items: [Object.assign({
                name: sold_item[i].name,
                inStock: sold_item[i].in_stock,
                total_price: TOTAL_PRICE,
                item_sold: item_sold,
                item_refund: item_refund,
                price: sold_product[i].price
              })],
              items_sold: sold_product[i].value,
              count: 1
            })
          }
        }
        else {
          if (forindex['NoCategory_test']) {
            sales.push({
              category_name: forindex['NoCategory_test'].name,
              category_id: forindex['NoCategory_test'].id,
              total: sold_product[i].price * sold_product[i].value,
              cost_of_goods: sold_product[i].cost * sold_product[i].value,
              items_refunded: prd[prd_index[sold_item[i]._id]].refund_value,
              refunds: prd[prd_index[sold_item[i]._id]].refund_price,
              discount: prd[prd_index[sold_item[i]._id]].discount,
              items: [Object.assign({
                name: sold_item[i].name,
                inStock: sold_item[i].in_stock,
                total_price: sold_product[i].price * sold_product[i].value
              })],
              items_sold: sold_product[i].value,
              count: 1
            })
          }
        }
      } else {
        if (sold_item[i].category != '') {
          var TOTAL = 0
          var TOTAL_PRICE = 0
          TOTAL = sold_product[i].price * sold_product[i].value
          TOTAL_PRICE = sold_product[i].price * sold_product[i].value
          if (goodsObj[sold_product[i].product_id] == 'karaoke') {
            var tt = (sold_product[i].closed_time - sold_product[i].created_time) / 60000
            if (parseInt(tt) * 60000 < tt * 60000) {
              TOTAL *= (parseInt(tt) + 1)
              TOTAL_PRICE *= (parseInt(tt) + 1)
            }
            else {
              TOTAL_PRICE *= parseInt(tt)
              TOTAL *= parseInt(tt)
            }
          }
          var j = setted[sold_item[i].category]
          if (sales[j] != undefined) {
            if (sold_product[i].value > 0)
              sales[j].total += TOTAL
            sales[j].cost_of_goods += sold_product[i].cost * sold_product[i].value
            if (sold_product[i].value > 0)
              sales[j].items_sold += sold_product[i].value
            sales[j].count++
            if (setitem[sold_item[i].name] == undefined) {
              indexitem[inde] = sales[j].items.length
              setitem[sold_item[i].name] = inde
              inde++
              var item_refund = 0
              var item_sold = 0
              if (sold_product[i].value > 0) {
                item_sold += sold_product[i].value
              }
              else {
                item_refund += sold_product[i].value * (-1)
              }
              sales[j].items.push({
                name: sold_item[i].name,
                inStock: sold_item[i].in_stock,
                total_price: TOTAL_PRICE,
                item_sold: item_sold,
                item_refund: item_refund,
                price: sold_product[i].price
              })
            } else {
              var index = indexitem[setitem[sold_item[i].name]]
              if (sales[j] != undefined)
                if (sales[j].items[index] != undefined)
                  if (sales[j].items[index].total_price == undefined) {
                    if (sold_product[i].value > 0) {
                      sales[j].items[index].item_sold = sold_product[i].value
                    }
                    else {
                      sales[j].items[index].item_refund = sold_product[i].value * (-1)
                    }
                    sales[j].items[index].total_price = TOTAL_PRICE
                  }
                  else {
                    if (sold_product[i].value > 0) {
                      sales[j].items[index].item_sold += sold_product[i].value
                    }
                    else {
                      sales[j].items[index].item_refund += sold_product[i].value * (-1)
                    }
                    sales[j].items[index].total_price += TOTAL_PRICE
                  }
            }
          }
        }
        else {
          var j = setted['NoCategory_test']
          if (sales[j] != undefined) {
            sales[j].total += sold_product[i].price * sold_product[i].value
            sales[j].cost_of_goods += sold_product[i].cost * sold_product[i].value
            sales[j].items_sold += sold_product[i].value
            sales[j].count++
            if (setitem[sold_item[i].name] == undefined) {
              indexitem[inde] = sales[j].items.length
              setitem[sold_item[i].name] = inde
              inde++
              sales[j].items.push({
                name: sold_item[i].name,
                inStock: sold_item[i].in_stock,
                total_price: sold_product[i].price * sold_product[i].value
              })
            } else {
              var index = indexitem[setitem[sold_item[i].name]]
              if (sales[j] != undefined)
                if (sales[j].items[index] != undefined)
                  if (sales[j].items[index].total_price == undefined)
                    sales[j].items[index].total_price = sold_product[i].price * sold_product[i].value
                  else
                    sales[j].items[index].total_price += sold_product[i].price * sold_product[i].value
            }
          }
        }
      }
    }
    var Answer = []
    for (var sale of sales) {
      sale.gross_sales = sale.total
      var ref = 0
      if (sale.items == null) {
        sale.items = []
      }
      for (var item of sale.items) {
        ref += (item.price * item.item_refund)
      }
      sale.refunds = ref
      sale.net_sales = sale.gross_sales - sale.discount - sale.refunds
      sale.gross_profit = sale.net_sales - sale.cost_of_goods
      sale.items = sale.items
      Answer.push(sale)
    }
    if (request.body.section_id) {
      var Answer2 = []
      for (var i of Answer) {
        if (i.section_id == request.body.section_id) {
          Answer2.push(i)
        }
      }
      Answer = Answer2
    }
    if (request.params.page != undefined) {
      var total = Answer.length
      Answer = {
        data: Answer.splice(request.params.limit * (request.params.page - 1), request.params.limit * request.params.page),
        total: total
      }
    }
    reply.ok(Answer)
  }
  var reportsGoodsCategories = (request, reply, user, recepts, goodsSales, handler = sales_by_category) => {
    if (!user) {
      reply.error("Access")
    } else {
      var ides = []
      for (const goodsSale of goodsSales) {
        if (goodsSale.category != "") {
          ides.push(goodsSale.category)
        }
      }
      instance.goodsCategory.find({
        _id: {
          $in: ides
        }
      }, (err, items) => {
        if (err) {
          reply.error('Error on finding category')
        } else {
          if (items == null) {
            items = []
          }
          handler(request, reply, user, recepts, goodsSales, items)
        }
      })
    }
  }
  var reportsGoodsSales = (request, reply, recepts, user, handler = reportsGoodsCategories) => {
    if (!user) {
      reply.error('Access')
    } else {
      instance.goodsSales.find({
        services: { $elemMatch: { service: { $eq: request.body.service }}}
      }, (error, items) => {
        if (error) {
          reply.error('Items could found')
        } else {
          if (items == null) {
            items = []
          }
          handler(request, reply, user, recepts, items)
        }
      })
    }
  }
  var reports1 = (request, reply, user, handler = reportsGoodsSales) => {
    if (!user) {
      reply.error('Access')
    } else {
      var query = {
        organization: user.organization,
        service: request.body.service,
        debt_id: null,
        date: {
          $lt: request.params.max,
          $gt: request.params.min
        }
      }
      instance.Receipts.find(query, (error, items) => {
        if (error) {
          reply.error('Items could found')
        } else {
          if (items == null) {
            items = []
          }
          // sub_service(handler, request.body.service, request, reply, items, user)
          handler(request, reply, items, user)
        }
      })
    }
  }

  ///////////////////////////////////////////////

  instance.post('/sales_by_category/:min/:max/:limit/:page', {
    version: '1.0.0'
  }, (request, reply) => {
    on(request, reply, (user) => {
      reports1(request, reply, user)
    })
  })

  instance.post('/sales_by_category/:min/:max', {
    version: '1.0.0'
  }, (request, reply) => {
    on(request, reply, (user) => {
      reports1(request, reply, user)
    })
  })
  ///////////////////////////////////////////////

  var preproccessing = (request, reply, items) => {
    var gross_sales = 0.0;
    var refunds = 0.0;
    var discounts = 0.0;
    for (const item of items) {
      // console.log(item.date)
      if (item.is_refund == false) {
        for (const __dis of item.discount) {
          if (__dis != undefined) {
            if (__dis.type != undefined) {
              if (__dis.type == 'percentage') {
                item.total_price = Math.round(item.total_price * 100 / (100 - __dis.value))
                discounts += Math.round(__dis.value * item.total_price / 100);
              } else {
                item.total_price += __dis.value
                discounts += __dis.value;
              }
            }
          }
        }
        gross_sales += item.total_price;
      } else {
        for (const __dis of item.discount) {
          if (__dis != undefined) {
            if (__dis.type != undefined) {
              if (__dis.type == 'percentage') {
                item.total_price = Math.round(item.total_price * 100 / (100 - __dis.value))
                discounts -= Math.round(__dis.value * item.total_price / 100);
              } else {
                item.total_price += __dis.value
                discounts -= __dis.value;
              }
            }
          }
        }
        refunds += item.total_price;
      }
    }
    var net_sales = gross_sales - (refunds + discounts);
    reply.ok(net_sales);
  }
  var reportss = (request, reply, user, handler = preproccessing) => {
    if (!user) {
      reply.error('Access')
    } else {
      instance.Receipts.find({
        organization: user.organization,
        debt_id: null,
        date: {
          $lt: request.params.max,
          $gt: request.params.min
        }
      }, (error, items) => {
        if (error) {
          reply.error('Items could found')
        } else {
          if (items) {
            // sub_service(handler, user.service, request, reply, items)
            handler(request, reply, items)
          } else {
            reply.error("Employee has not started to work yet!!")
          }
        }
      })
    }
  }
  instance.get('/reports/organization/:min/:max', {
    version: '1.0.0'
  }, (request, reply) => {
    on(request, reply, (user) => {
      reportss(request, reply, user)
    })
  })

  var reports_by_cashier = (request, reply, receipts, cashiers, self_of_employees, service_of_cashiers, ides, without_Service) => {
    receipts = receipts.length
    var IDES = []
    for (var ID of ides) {
      if (ID != "" && ID != undefined) {
        IDES.push(ID)
      }
    }
    ides = IDES
    if (request.body.employer_id) {
      instance.User.findOne({
        _id: request.body.employer_id
      }, (error, employer) => {
        if (error) {
          reply.error('Error on finding employeers')
        } else {
          if (employer) {
            var Total_price = 0
            if (cashiers[employer._id] != undefined) {
              Total_price = cashiers[employer._id].reduce(
                (a, b) => a + b, 0
              )
            }
            if (cashiers[employer._id] == undefined) {
              reply.ok(Object.assign({
                receipts_number: 25,
                total: Total_price + (without_Service[employer._id] != 0 ? without_Service[employer._id] : 0),
                salary: Total_price * employer.percentage / 100.0,
                name: employer.name,
                _id: employer._id,
                image_url: employer.image_url,
                role: employer.role,
                password: employer.password
              }))
            } else {
              reply.ok(Object.assign({
                receipts_number: 25,
                total: Total_price + (without_Service[employer._id] != 0 ? without_Service[employer._id] : 0),
                salary: Total_price * employer.percentage / 100.0,
                name: employer.name,
                _id: employer._id,
                image_url: employer.image_url,
                role: employer.role,
                password: employer.password
              }))
            }
          }
        }
      })
    } else {
      var result = []
      instance.User.find({
        _id: {
          $in: ides
        }
      }, (error, employees) => {
        if (error) {
          instance.send_Error('finding employee', JSON.stringify(error))
          reply.error('Error on finding employeers')
        } else {
          var service_id = "";
          for (const employee of employees) {
            var AA = 0;
            if (self_of_employees[employee._id] != undefined) {
              AA = self_of_employees[employee._id]
            }
            if(request.body.service != undefined) {
              service_id = request.body.service
            }
            var Total_price = 0
            if (cashiers[employee._id] != undefined) {
              receipts = cashiers[employee._id].length
              Total_price = cashiers[employee._id].reduce(
                (a, b) => a + b, 0
              )
            }
            var AAAAAA = without_Service[employee._id]
            if(!AAAAAA) {
              AAAAAA = 0
            }
            if (cashiers[employee._id] == undefined) {
              result.push(Object.assign({
                receipts_number: receipts,
                total: Total_price + AAAAAA,
                salary: (Total_price - AA) * employee.percentage / 100.0,
                salary_percentage: employee.percentage,
                name: employee.name,
                _id: employee._id,
                image_url: employee.image_url,
                role: employee.role
              }))
            } else {
              result.push(Object.assign({
                receipts_number: receipts,
                total: Total_price + AAAAAA,
                salary: (Total_price - AA) * employee.percentage / 100.0,
                salary_percentage: employee.percentage,
                name: employee.name,
                _id: employee._id,
                image_url: employee.image_url,
                role: employee.role
              }))
            }
          }
          if (service_id == "") {
            reply.ok(result)
          }
          else {
            instance.services.findOne({ _id: service_id }, (err, service) => {
              if (err || service == null) {
                reply.error('Error on finding service')
              }
              else {
                var Result = []
                for (var r of result) {
                  if (service_of_cashiers[r._id] != undefined) {
                    r.total += service_of_cashiers[r._id]
                    Result.push(Object.assign(r, {
                      total_service: service_of_cashiers[r._id],
                      service_percentage: service.service_value
                    }))
                  }
                  else {
                    Result.push(Object.assign(r, {
                      total_service: 0,
                      service_percentage: 0
                    }))
                  }
                }
                reply.ok(Result)
              }
            })
          }
        }
      })
    }
  }

  var cashiers = (request, reply, receipts, handler = reports_by_cashier) => {
    var cashiers = {}
    var without_Service = {}
    var self_of_employees = {}
    var ides = []
    var service_of_cashiers = {}
    for (const item of receipts) {
      if(item.waiter_id != '' && item.waiter_id != null) {
        ides.push(item.waiter_id)
      }
      else {
        ides.push(item.cashier_id)
      }
      // var ID = null;
      // if(item.waiter_id != undefined){
      //   ID = item.waiter_id
      // } else if(item.cashier_id != undefined){
      //   ID = item.cashier_id
      // }
      // if(item.is_self == true && ID != null) {
      //   if(item.is_refund == false) {
      //     if(self_of_employees[ID] == undefined) {
      //       self_of_employees[ID] = item.total_price
      //     }
      //     else {
      //       self_of_employees[ID] += item.total_price
      //     }
      //   }
      //   else {
      //     if(self_of_employees[ID] == undefined) {
      //       self_of_employees[ID] = item.total_price * (-1)
      //     }
      //     else {
      //       self_of_employees[ID] -= item.total_price
      //     }
      //   }
      // }
      var BOT = {
        total_price: item.total_price,
        is_refund: item.is_refund,
        is_self: item.is_self,
        service_value: item.service_value,
        waiter_id: item.waiter_id,
        waiter_name: item.waiter_name,
        cashier_id: item.cashier_id,
        cashier_name: item.cashier_name
      }
      if (item.is_self == false) {
        if (item.is_refund == false) {
          if (item.waiter_id != null && item.waiter_id != "") {
            if (cashiers[item.waiter_id]) {
              if (item.service_value != null)
                if (service_of_cashiers[item.waiter_id] == undefined) {
                  service_of_cashiers[item.waiter_id] = item.total_price * item.service_value / 100.0
                }
                else {
                  service_of_cashiers[item.waiter_id] += item.total_price * item.service_value / 100.0
                }
                if(item.total_price != null)
              cashiers[item.waiter_id].push(item.total_price)
            } else {
              if (item.service_value != null)
                if (service_of_cashiers[item.waiter_id] == undefined) {
                  service_of_cashiers[item.waiter_id] = item.total_price * item.service_value / 100.0
                }
                else {
                  service_of_cashiers[item.waiter_id] += item.total_price * item.service_value / 100.0
                }
                if(item.total_price != null)
              cashiers[item.waiter_id] = [item.total_price]
            }
          }
          else {
            if (cashiers[item.cashier_id]) {
              if (item.service_value != null)
                if (service_of_cashiers[item.cashier_id] == undefined) {
                  service_of_cashiers[item.cashier_id] = item.total_price * item.service_value / 100.0
                }
                else {
                  service_of_cashiers[item.cashier_id] += item.total_price * item.service_value / 100.0
                }
                if(item.total_price != null)
              cashiers[item.cashier_id].push(item.total_price)
            } else {
              if (item.service_value != null)
                if (service_of_cashiers[item.cashier_id] == undefined) {
                  service_of_cashiers[item.cashier_id] = item.total_price * item.service_value / 100.0
                }
                else {
                  service_of_cashiers[item.cashier_id] += item.total_price * item.service_value / 100.0
                }
                if(item.total_price != null)
              cashiers[item.cashier_id] = [item.total_price]
            }
          }
        }
        else {
          if (item.waiter_id != null && item.waiter_id != "") {
            if (cashiers[item.waiter_id]) {
              if (item.service_value != null) {
                if (service_of_cashiers[item.waiter_id] == undefined) {
                  service_of_cashiers[item.waiter_id] = item.total_price * item.service_value / 100.0 * (-1)
                }
                else {
                  service_of_cashiers[item.waiter_id] += item.total_price * item.service_value / 100.0 * (-1)
                }
              }
              if(item.total_price != null)
              cashiers[item.waiter_id].push(item.total_price * (-1))
            } else {
              if (item.service_value != null) {
                if (service_of_cashiers[item.waiter_id] == undefined) {
                  service_of_cashiers[item.waiter_id] = item.total_price * item.service_value / 100.0
                }
                else {
                  service_of_cashiers[item.waiter_id] -= item.total_price * item.service_value / 100.0
                }
              }
              if(item.total_price != null)
              cashiers[item.waiter_id] = [item.total_price * (-1)]
            }
          }
          else {
            if (cashiers[item.cashier_id]) {
              if (item.service_value != null)
                if (service_of_cashiers[item.cashier_id] == undefined) {
                  service_of_cashiers[item.cashier_id] = item.total_price * item.service_value / 100.0 * (-1)
                }
                else {
                  service_of_cashiers[item.cashier_id] += item.total_price * item.service_value / 100.0 * (-1)
                }
                if(item.total_price != null)
              cashiers[item.cashier_id].push(item.total_price * (-1))
            } else {
              if (item.service_value != null)
                if (service_of_cashiers[item.cashier_id] == undefined) {
                  service_of_cashiers[item.cashier_id] = item.total_price * item.service_value / 100.0
                }
                else {
                  service_of_cashiers[item.cashier_id] -= item.total_price * item.service_value / 100.0
                }
                if(item.total_price != null)
              cashiers[item.cashier_id] = [item.total_price * (-1)]
            }
          }
        }
      }
      else {
        cashier_id = item.cashier_id
        if(item.waiter_id) {
          cashier_id = item.waiter_id
        }
        if(without_Service[cashier_id] == undefined) {
          without_Service[cashier_id] = 0
        }
        without_Service[cashier_id] += item.total_price * (item.is_refund ? (-1) : 1)
      }
    }
    handler(request, reply, receipts, cashiers, self_of_employees, service_of_cashiers, ides, without_Service)
  }

  ///////////////////////
  var reports2 = (request, reply, user, handler = cashiers) => {
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
          reply.error('Items could found')
        } else {
          // sub_service(handler, request.body.service, request, reply, items)
          handler(request, reply, items)
        }
      })
    }
  }
  instance.post('/reports_by_cashier/:min/:max', {
    version: '1.0.0'
  }, (request, reply) => {
    on(request, reply, (user) => {
      reports2(request, reply, user)
    })
  })

  instance.post('/reports_by_cashier_id/:min/:max', {
    version: '1.0.0'
  }, (request, reply) => {
    on(request, reply, (user) => {
      reports2(request, reply, user)
    })
  })

  //////////////////////////For employee

  var employee_reports = (reply, user) => {
    if (!user) {
      reply.error('Not allowed')
    } else {
      instance.Receipts.find({
        organization: user.organization,
        service: user.service,
        debt_id: null,
        cashier_id: user._id
      }, (err, receipts) => {
        if (err) {
          reply.error('Error on finding receipts')
        } else {
          if (receipts) {
            var max_receipt = 0,
              min_receipt = 0,
              all_receipts = 0,
              count_receipt = receipts.length
            last_receipt = {
              date: 0,
              value: 0
            }
            instance.services.findOne({ _id: user.service }, (err, service) => {
              if (err) {
                reply.error('Error on finding service')
              }
              else {
                if (service) {
                  for (var rec of receipts) {
                    rec.total_price *= (1 - service.service_value / 100)
                    if (max_receipt < rec.total_price && !rec.is_refund)
                      max_receipt = rec.total_price
                    if (min_receipt > rec.total_price && !rec.is_refund)
                      min_receipt = rec.total_price
                    if (!rec.is_refund && last_receipt.date < rec.date)
                      last_receipt.value = rec.total_price
                    if (rec.is_refund)
                      all_receipts -= rec.total_price
                    else
                      all_receipts += rec.total_price
                  }

                  min_receipt = max_receipt
                  for (var rec of receipts) {
                    rec.total_price *= (1 - service.service_value / 100)
                    if (min_receipt > rec.total_price && !rec.is_refund)
                      min_receipt = rec.total_price
                  }

                  reply.ok(Object.assign({
                    max_receipt: max_receipt,
                    min_receipt: min_receipt,
                    count_receipt: count_receipt,
                    all_receipts: all_receipts,
                    last_receipt: last_receipt.value
                  }))
                }
                else {
                  reply.error('Service not found')
                }
              }
            })
          } else {
            reply.ok(Object.assign({
              max_receipt: 0,
              min_receipt: 0,
              count_receipt: 0,
              all_receipts: 0,
              last_receipt: 0
            }))
          }
        }
      })
    }
  }

  instance.get('/employee/reports', {
    version: '1.0.0'
  }, (request, reply) => {
    on(request, reply, (user) => {
      employee_reports(reply, user)
    })
  })

  ////////////////////////////////////

  var goods_sales_search = (request, reply, user) => {
    if (user) {
      instance.goodsSales.find({
        organization: user.organization,
        service: request.body.service
      }, (err, items) => {
        if (err) {
          reply.error('Error on finding products')
        } else {
          if (items) {
            var id = 0,
              pages = request.params.pages,
              list = request.params.list,
              result = []
            for (const product of items) {
              id++
              if (id > pages * (list - 1) && id <= pages * list) {
                result.push(product)
              }
            }
            reply.ok(result)
          } else {
            reply.error('Does not exist')
          }
        }
      })
    }
    else {
      reply.error('Not allowed')
    }
  }

  instance.post('/goods/sales/search/:pages/:list', {
    version: '1.0.0'
  }, (request, reply) => {
    on(request, reply, (user) => {
      goods_sales_search(request, reply, user)
    })
  })

  var less_products = (request, reply, user) => {
    if (user) {
      instance.goodsSales.find({ organization: user.organization, service: request.body.service, in_stock: { $lte: 10, $gte: 0 } }, (err, products) => {
        if (err) {
          reply.error('Error on finding products')
        }
        else {
          if (products == null) {
            products = []
          }
          reply.ok(products)
        }
      })
    }
    else {
      reply.error('Not allowed')
    }
  }

  instance.post('/goods/sales/less', { version: '1.0.0' }, (request, reply) => {
    on(request, reply, (user) => {
      less_products(request, reply, user)
    })
  })

  var finished_products = (request, reply, user) => {
    if (user) {
      instance.goodsSales.find({ organization: user.organization, service: request.body.service, in_stock: { $lte: 0 } }, (err, products) => {
        if (err) {
          reply.error('Error on finding products')
        }
        else {
          if (products == null) {
            products = []
          }
          reply.ok(products)
        }
      })
    }
    else {
      reply.error('Not allowes')
    }
  }

  instance.post('/goods/sales/finished', { version: '1.0.0' }, (request, reply) => {
    on(request, reply, (user) => {
      finished_products(request, reply, user)
    })
  })


  var get_feedback_by_range = (request, reply, user) => {
    if (user) {
      var min = parseInt(request.params.min),
        max = parseInt(request.params.max)
      instance.feedback.find({
        organization: user.organization,
        service: request.body.service,
        created_time: {
          $lte: max,
          $gte: min
        }
      }, { comment: 1, username: 1, _id: 0 }, (err, feedbacks) => {
        if (err || feedbacks == null) {
          reply.error('Service does not exist')
        }
        else {
          reply.ok(feedbacks)
        }
      })
    }
    else {
      reply.send({
        statusCode: 498,
        message: 'Invalid token'
      })
    }
  }

  instance.post('/feedback/get_by_range/:min/:max', {
    version: '1.0.0'
  }, (request, reply) => {
    on(request, reply, (user) => {
      get_feedback_by_range(request, reply, user)
    })
  })

  next()
}