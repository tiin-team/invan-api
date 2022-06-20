const fp = require('fastify-plugin')

module.exports = fp((instance, _, next) => {

  const ObjectIdReturned = (id) => {
    try {
      return require('mongodb').ObjectID(id)
    } catch (error) {
      return id
    }
  }

  instance.decorate('ObjectId', ObjectIdReturned)

  instance.post('/makeallObjectId', (request, reply) => {
    instance.goodsCategory.find({}, (err, cats) => {
      if (err || cats == null) {
        cates = []
      }
      for (let i = 0; i < cats.length; i++) {
        if (cats[i].section != '' || cats[i].section != null) {
          cats[i].section_id = require('mongodb').ObjectID(cats[i].section)
          // cats[i].section = cats[i].section_id.toString()
          instance.goodsCategory.updateOne({ _id: cats[i]._id }, { $set: { section_id: cats[i].section_id } }, (err, _) => {
            if (err) { instance.send_Error('eeee', JSON.stringify(err)) }
          })
        }
      }
      reply.ok()
    })
  })

  instance.post('/available_on_store', (request, reply) => {
    instance.goodsDiscount.find({}, (err, goods) => {
      if (err || goods == null) {
        goods = []
      }
      for (var g of goods) {
        instance.goodsDiscount.updateOne({ _id: g._id }, { $set: { services: { available: true, service: g.service } } }, (err, _) => {
          if (err) {
            instance.send_Error('aaaaaaaaaaaa', JSON.stringify(err))
          }
        })
        reply.ok()
      }
    })
  })

  instance.decorate('on', (request, reply, next) => {
    instance.authorization(request, reply, (user) => {
      next(user)
    })
    // var token = request.headers['authorization']
    // if (token) {
    //   instance.employees.findOne({ token: token }, (error, employer) => {
    //     if (error) {
    //       instance.unauthorized(reply)
    //     }
    //     else {
    //       if (employer) {
    //         if (employer.is_active) {
    //           next(employer)
    //         }
    //         else {
    //           instance.send_Error(request.raw.url, JSON.stringify({
    //             statusCode: 497,
    //             error: 'Employee do not have an access',
    //             message: 'Not allowed'
    //           }))
    //           reply.send({
    //             statusCode: 497,
    //             error: "Employee do not have an access",
    //             message: "Not allowed"
    //           })
    //         }
    //       }
    //       else {
    //         instance.BOS.findOne({ token: token }, (error, bos) => {
    //           if (error) {
    //             instance.unauthorized(reply)
    //           }
    //           else {
    //             if (bos) {
    //               next(bos)
    //             }
    //             else {
    //               instance.Admin.findOne({ token: token }, (err, admin) => {
    //                 if (err) {
    //                   instance.unauthorized(reply)
    //                 }
    //                 else {
    //                   if (admin) {
    //                     next(admin)
    //                   }
    //                   else {
    //                     instance.unauthorized(reply)
    //                   }
    //                 }
    //               })
    //             }
    //           }
    //         })
    //       }
    //     }
    //   })
    // }
    // else {
    //   instance.unauthorized(reply)
    // }
  })


  instance.decorate('generate_auto_increment', (id, next) => {
    instance.accountmantReports.find({ accountmant_id: id }, (err, rs) => {
      if (err || rs == null) {
        rs = []
      }
      next(rs.length)
    })
  })

  instance.decorate('close_shift', (shift, user) => {
    var start_time = shift.opening_time
    var end_time = shift.closing_time
    var act_cash_amount = shift.cash_drawer.act_cash_amount
    instance.Receipts.find({
      organization: shift.organization,
      service: shift.service,
      date: {
        $gte: start_time,
        $lte: end_time
      }
    }, (err, receipts) => {
      if (err || receipts == null) {
        if (err) {
          instance.send_Error('finding receipts', JSON.stringify(err))
        }
        receipts = []
      }
      var gross_sales = 0.0;
      var refunds = 0.0;
      var discounts = 0.0;
      var net_sales = 0.0;
      var Payment = {
        cash: 0,
        card: 0,
        gift: 0,
        debt: 0,
        qr_code: 0,
        nfc: 0
      }
      var taxes = 0.0;
      var cash_payment = 0.0;
      var cash_refund = 0.0;
      for (var rec of receipts) {
        for (var p of rec.payment) {
          if (p.name == 'cash') {
            if (rec.is_refund == false) {
              cash_payment += p.value
            }
            else {
              cash_refund += p.value
            }
          }
          if (rec.is_refund) {
            Payment[p.name] -= p.value
          }
          else {
            Payment[p.name] += p.value
          }
        }
        for (var item of rec.sold_item_list) {
          for (var tax of item.taxes) {
            if (tax.type == 'include') {
              if (rec.is_refund == false) {
                taxes += item.value * item.price * tax.tax / (100 + tax.tax)
              }
              else {
                taxes -= item.value * item.price * tax.tax / (100 + tax.tax)
              }
            }
            else {
              if (rec.is_refund == false) {
                taxes += item.value * item.price * tax.tax / 100
              }
              else {
                taxes -= item.value * item.price * tax.tax / 100
              }
            }
          }
        }
        if (rec.is_refund) {
          refunds += rec.total_price
        }
        else {
          gross_sales += rec.total_price
        }
        if (rec.discounts == undefined) {
          rec.discounts = []
        }
        for (var dic of rec.discounts) {
          if (rec.is_refund == false) {
            if (dic.type == 'percentage') {
              discounts += rec.total_price * dic.value
            }
            else {
              discounts += dic.value
            }
          }
          else {
            if (dic.type == 'percentage') {
              discounts -= rec.total_price * dic.value
            }
            else {
              discounts -= dic.value
            }
          }
        }
      }
      net_sales = gross_sales - refunds - discounts
      shift.cash_drawer.cash_payment = cash_payment
      shift.cash_drawer.cash_refund = cash_refund
      shift.cash_drawer.exp_cash_amount = shift.cash_drawer.starting_cash + cash_payment - cash_refund + shift.cash_drawer.paid_in - shift.cash_drawer.paid_out
      shift.cash_drawer.difference = shift.cash_drawer.act_cash_amount - shift.cash_drawer.exp_cash_amount
      shift.sales_summary.gross_sales = gross_sales
      shift.sales_summary.refunds = refunds
      shift.sales_summary.discounts = discounts
      shift.sales_summary.net_sales = net_sales
      shift.sales_summary.taxes = taxes
      shift.sales_summary = {
        ...shift.sales_summary,
        ...Payment
      }
      instance.Shifts.updateOne({ _id: shift._id }, { $set: shift }, (err, _) => {
        instance.pushnotification(106, user, user.service)
        if (err) {
          instance.send_Error('shift update', JSON.stringify(err))
        }
      })
    })
  })

  instance.decorate('update_instock', (id, in_stock) => {
    instance.goodsSales.updateOne({
      _id: id
    }, {
      $inc: {
        in_stock: in_stock
      }
    }, (err, res) => {
      if (err) {
        instance.send_Error('updating goods sales in_stock', JSON.stringify(err))
      }
    })
  })

  instance.decorate('update_instock_equal', (id, good) => {
    instance.goodsSales.updateOne({
      _id: id
    }, {
      $set: good
    }, (err, res) => {
      if (err) {
        instance.send_Error('updating goods sales in_stock', JSON.stringify(err))
      }
    })
  })

  instance.decorate('update_goods_cost', (id, good) => {
    instance.goodsSales.findOne({
      _id: id
    }, (err, g) => {
      if (err || g == null) {
        if (err) {
          instance.send_Error('goods update cost', JSON.stringify(err))
        }
      }
      else {
        if (g.in_stock - good.quality > 0) {
          g.cost = ((g.in_stock - good.quality) * g.cost + good.purchase_cost * good.quality) / g.in_stock
        }
        else {
          g.cost = good.purchase_cost
        }
        if (g.max_cost < g.cost || g.max_cost == 0) {
          g.max_cost = g.cost
        }
        instance.goodsSales.updateOne({
          _id: id
        }, {
          $set: {
            cost: g.cost,
            max_cost: g.max_cost
          }
        }, (err, _) => {
          if (err) {
            instance.send_Error('updating good cost', JSON.stringify(err))
          }
        })
      }
    })
  })

  instance.decorate('update_item_data', (item_data) => {
    instance.Item_Data.updateOne({ _id: item_data._id }, { $set: item_data }, (err, _) => {
      if (err) {
        instance.send_Error('updating item data', JSON.stringify(err))
      }
    })
  })

  instance.decorate('update_category_name', (id, name) => {
    instance.goodsSales.updateOne({
      _id: id
    }, {
      $set: {
        category_name: name
      }
    }, (err, _) => {
      if (err) {
        instance.send_Error('category name update', JSON.stringify(err))
      }
    })
  })

  instance.decorate('update_receipt_sold_item', async (id, sold_list) => {
    try {
      const receipt = await instance.Receipts.findById(id).lean();

      if (!receipt) return;
      var soldObj = {}
      var ids = []

      for (const s of sold_list) {
        if (s.sold_item_id != undefined && s.sold_item_id != '') {
          if (s.reset_count === '' || s.reset_count === undefined) {
            s.reset_count = 0
          }
          if (typeof s.returned_reminder != 'number') {
            s.returned_reminder = 0;
          }

          if (!soldObj[s.sold_item_id]) {
            ids.push(s.sold_item_id)
            soldObj[s.sold_item_id] = {
              reset_count: s.value,
              returned_reminder: 0
            }
            if (['box_item', 'pcs_item'].includes(s.sold_item_type)) {
              if (!soldObj[s.sold_item_id].returned_reminder) {
                soldObj[s.sold_item_id].returned_reminder = 0;
              }
              soldObj[s.sold_item_id].returned_reminder = s.reminder
              if (
                soldObj[s.sold_item_id].returned_reminder > s.count_by_type
              ) {
                soldObj[s.sold_item_id].returned_reminder -= s.count_by_type;
                soldObj[s.sold_item_id].reset_count += 1;
              }
            }
          }
          else {
            soldObj[s.sold_item_id].reset_count += s.value;

            if (['box_item', 'pcs_item'].includes(s.sold_item_type)) {
              soldObj[s.sold_item_id].returned_reminder += s.reminder;
              if (
                soldObj[s.sold_item_id].returned_reminder > s.count_by_type
              ) {
                soldObj[s.sold_item_id].returned_reminder -= s.count_by_type;
                soldObj[s.sold_item_id].reset_count += 1;
              }
            }
          }
        }
      }

      var sold_item_list = []
      for (const sold_item of receipt.sold_item_list) {
        if (sold_item != null) {
          if (soldObj[sold_item._id] != null) {
            if (!sold_item.reset_count) {
              sold_item.reset_count = 0;
            }

            sold_item.reset_count += soldObj[sold_item._id].reset_count
            if (['box_item', 'pcs_item'].includes(sold_item.sold_item_type)) {
              if (!sold_item.returned_reminder) {
                sold_item.returned_reminder = 0;
              }
              sold_item.returned_reminder += soldObj[sold_item._id].returned_reminder;
              if (sold_item.returned_reminder > sold_item.count_by_type) {
                sold_item.returned_reminder -= sold_item.count_by_type;
                sold_item.reset_count += 1;
              }
            }
          }
        }

        sold_item_list.push(sold_item)
      }

      await instance.Receipts.updateOne({ _id: id }, { $set: { sold_item_list: sold_item_list, created_time: new Date().getTime() } });
    } catch (error) {
      console.log(error.message)
    }
  })

  // service

  instance.decorate('delete_service', (request, reply, user) => {
    instance.posDevices.find({
      service: request.params.id,
      is_active: true
    }, (err, poss) => {
      if (poss) {
        poss = []
      }
      if (poss.length > 0) {
        reply.couldnotdelete('service')
      }
      else {
        instance.services.find({
          organization: user.organization
        }, (err, services) => {
          if (services == null) {
            services = []
          }
          if (services.length < 2) {
            reply.couldnotdelete('service')
          }
          else {
            instance.services.deleteOne({
              _id: request.params.id
            }, (err, result) => {
              if (result) {
                instance.Tables.deleteMany({
                  service: request.params.id
                }, (err) => {
                  if (err) {
                    instance.send_Error('deleting tables', JSON.stringify(err))
                  }
                })
                instance.goodsSales.updateMany({
                  organization: user.organization
                }, {
                  $pull: {
                    "services": {
                      "service": {
                        $eq: instance.ObjectId(request.params.id)
                      }
                    }
                  }
                }, (err) => {
                  if (err) {
                    instance.send_Error('updating goodssales', JSON.stringify(err))
                  }
                })
                instance.goodsDiscount.updateMany({
                  organization: user.organization
                }, {
                  $pull: {
                    "services": {
                      "service": {
                        $eq: instance.ObjectId(request.params.id)
                      }
                    }
                  }
                }, (err) => {
                  if (err) {
                    instance.send_Error('updating goodsdiscounds', JSON.stringify(err))
                  }
                })
                instance.settingsTaxes.updateMany({
                  organization: user.organization
                }, {
                  $pull: {
                    "services": {
                      "service": {
                        $eq: instance.ObjectId(request.params.id)
                      }
                    }
                  }
                }, (err) => {
                  if (err) {
                    instance.send_Error('updating taxes', JSON.stringify(err))
                  }
                })
                instance.User.updateMany({
                  organization: user.organization
                }, {
                  $pull: {
                    "services": {
                      "service": {
                        $eq: instance.ObjectId(request.params.id)
                      }
                    }
                  }
                }, (err) => {
                  if (err) {
                    instance.send_Error('updating users', JSON.stringify(err))
                  }
                })
                reply.ok()
              }
              else {
                reply.couldnotdelete('Service')
              }
            })
          }
        })
          .lean()
      }
    })
      .lean()
  })

  instance.decorate('csv_to_json_converter', (data) => {
    var result = []
    var headers = data[0].join().split(',');
    for (var i = 1; i < data.length; i++) {
      var row = data[i].join().split(',');
      var obj = {};
      for (var j = 0; j < row.length; j++) {
        obj[headers[j]] = row[j];
      }
      result.push(obj);
    }
    return result
  })

  instance.decorate('update_customer', async (receipt, user_id, used_loyalty) => {
    instance.organizations.findOne({
      _id: receipt.organization
    }, async (_, org) => {
      if (org) {
        var loyalty = (receipt.total_price * org.loyalty_bonus / 100.0 * ((receipt.is_refund) ? -1 : 1)) - used_loyalty
        let debt = 0;
        let no_debt_refund = 0;
        for (let p of receipt.payment) {
          if (p.name == 'debt') {
            debt += p.value * (receipt.is_refund ? (-1) : 1)
          }
          else if (receipt.is_refund) {
            no_debt_refund += p.value;
          }
        }

        try {
          const client = await instance.clientsDatabase.findOne({
            user_id: user_id,
            organization: receipt.organization
          })

          if (client) {
            if (!client.debt) {
              await instance.clientsDatabase.updateOne(
                {
                  user_id: user_id,
                  organization: receipt.organization
                },
                {
                  $set: {
                    debt: 0
                  }
                }
              )
            }

            let result = await instance.clientsDatabase.findOneAndUpdate(
              {
                _id: client._id
              },
              {
                $inc: {
                  point_balance: receipt.receipt_type == 'debt' ? 0 : loyalty,
                  visit_counter: 1,
                  sales: 1,
                  total_sale: receipt.total_price * ((receipt.is_refund == false) ? 1 : 0),
                  refunds: receipt.total_price * ((receipt.is_refund) ? 1 : 0),

                },
                $set: {
                  last_visit: receipt.date
                }
              },
              {
                new: true
              }
            );

            // if (debt > 0) {
            result = await instance.clientsDatabase.findOneAndUpdate(
              {
                _id: client._id
              },
              {
                $inc: {
                  debt: debt
                },
                $push: {
                  debt_pay_history: {
                    "paid": debt,
                    "currency": receipt.currency,
                    "currency_value": receipt.currency,
                    "date": new Date().getTime(),
                    "comment": "receipt sold",
                  }
                }
              },
              {
                new: true
              }
            );

            // }

            if (result.debt > 0 && no_debt_refund) {
              await instance.clientsDatabase.updateOne(
                { _id: client._id },
                {
                  $inc: {
                    debt: no_debt_refund * (-1)
                  },
                  $push: {
                    debt_pay_history: {
                      "paid": no_debt_refund,
                      "currency": receipt.currency,
                      "currency_value": receipt.currency,
                      "date": new Date().getTime(),
                      "comment": "receipt refund",
                    }
                  }
                }
              );
            }

          }

        } catch (err) {
          console.log(err.message)
        }
      }
    })
  })

  instance.decorate('customer_points', async (receipts) => {
    for (var r of receipts) {
      if (r.user_id) {
        if (!r.currency_value) {
          r.currency_value = 1;
        }
        var loyalty = (r.point_balance ? r.point_balance : 0) * ((r.is_refund) ? -1 : 1);

        await instance.update_customer(r, r.user_id, loyalty)
      }
    }
  })

  instance.decorate('update_sub_category', (request, reply, results) => {
    instance.goodsCategory.updateOne({
      _id: results._id
    }, {
      $set: request.body
    }, async () => {
      try { await instance.goodsCategory.updateOne({ _id: request.body.type }, { $set: { item_tree: true } }) }
      catch (err) { }
      try {
        if (!await instance.goodsCategory.findOne({ type: results.type })) {
          await instance.goodsCategory.updateOne({ _id: results.type }, { $set: { item_tree: false } })
        }
      } catch (err) { }
      reply.ok()
    })
  })

  instance.decorate('make_regexable_text', (text) => {
    let search = ''
    try {
      // search = text.replace(/\(/g, "\\\(").replace(/\)/g, "\\\(");
      for (const index in text) {
        if (text[index] == '(') {
          search += "\\";
          search += "\(";
          continue;
        }
        if (text[index] == ')') {
          search += "\\";
          search += '\)';
          continue;
        }
        search += text[index]
      }
    } catch (error) {
      return ''
    }
    return search;
  })

  next()
})