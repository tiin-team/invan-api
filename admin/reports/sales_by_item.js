module.exports = (instance, _, next) => {

  version = {version: '1.0.0'}

  // reports sales by item above

  const by_item_above = (request, reply, items) => {
    var ctn = 7;
    if (request.body.count != undefined) {
      ctn = Math.round(request.body.count)
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
    var default_id = 'default_id'
    if(request.body.product_id) {
      default_id = request.body.product_id
    }
    // help to draw
    var start = parseInt(request.params.min)
    var end = parseInt(request.params.max)
    if(end - start == 86400000 || end - start == 86400000-60000) {
      ctn = 24
    }

    var right = start
    var diff = parseInt((end - start) / ctn)
    var middle = right + diff
    // var inc = start+0.0
    // diff *= 2
    var left = start + diff
    var pro_names = []
    var percent_of_gift = {}

    var default_times = []
    var default_values = []
    for(var time = start; time < end; time += diff) {
      default_times.push(time)
      default_values.push(0)
    }

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
          sold_values[s.product_name] = default_values.concat([])
        }

        if (sold_times[s.product_name] == undefined) {
          sold_times[s.product_name] = default_times.concat([])
        }
      }
    }
    pro_names = [...new Set(pro_names)]
    for (var item of items) {
      // sold times and values
      // for (var s of item.sold_item_list) {
      //   if (sold_times[s.product_name] == undefined) {
      //     sold_times[s.product_name] = [right]
      //     sold_values[s.product_name] = [0]
      //   }
      //   if (sold_values[s.product_name] == undefined) {
      //     sold_values[s.product_name] = [0]
      //   }
      // }
      // while (item.date > left) {
      //   right += diff
      //   left += diff
      //   for (var nnn of pro_names) {
      //     if(sold_times[nnn] != undefined){
      //       sold_times[nnn].push(right)
      //       if(sold_values[nnn] == undefined) {
      //         sold_values[nnn] = []
      //       }
      //       sold_values[nnn].push(0)
      //     }
      //   }
      // }
      for (var s of item.sold_item_list) {
        if(default_id == 'default_id' || s.product_id == default_id) {
          var disc = 0.0;
          for (var dic of item.discount) {
            if (dic.type == 'percentage') {
              disc += s.price * s.value * dic.value / 100.0
            }
          }
          if (item.is_refund == false) {
            // sold_values[s.product_name][sold_values[s.product_name].length - 1] += (s.price * s.value - s.cost * s.value - disc) * (1 - percent_of_gift[item._id])
            sold_values[s.product_name][Math.floor((item.date-start)/diff)] += (s.price * s.value - disc) * (1 - percent_of_gift[item._id])
          }
          else {
            // sold_values[s.product_name][sold_values[s.product_name].length - 1] -= (s.price * s.value - s.cost * s.value - disc) * (1 - percent_of_gift[item._id])
            sold_values[s.product_name][Math.floor((item.date-start)/diff)] -= (s.price * s.value - disc) * (1 - percent_of_gift[item._id])
          }
        }
      }
      for (var s of item.sold_item_list) {
        if(default_id == 'default_id' || s.product_id == default_id) {
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
        // Sold_times: sold_times[name],
        // Sold_values: sold_values[name],
        sold_times: sold_times[name],
        sold_values: sold_values[name]
      })
    }
    data.sort((a, b) => (a.net_sales > b.net_sales) ? -1 : ((b.net_sales > a.net_sales) ? 1 : 0));
    var Answer = []
    for (let t = 0; t < 5; t++) {
      if (data.length > t) {
        Answer.push(data[t])
      }
    }
    // for (let t = 0; t < ctn; t++) {
    //   var summ = 0.0;
    //   for (let gg = 0; gg < Answer.length; gg++) {
    //     summ += Answer[gg].Sold_values[t]
    //   }
    //   // if (summ != 0) {
    //     for (let gg = 0; gg < Answer.length; gg++) {
    //       if (Answer[gg].Sold_times[t] != null && Answer[gg].Sold_values[t] != null) {
    //         Answer[gg].sold_times.push(Answer[gg].Sold_times[t])
    //         Answer[gg].sold_values.push(Answer[gg].Sold_values[t])
    //       }
    //     }
    //   // }
    // }
    // for (let t = 0; t < Answer.length; t++) {
    //   Answer[t].Sold_times = undefined
    //   Answer[t].Sold_values = undefined
    // }
    reply.ok(Answer)
  }

  instance.post('/reports/sales/by_item/above/:min/:max', version, (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      instance.get_receipt_by_range(request, reply, admin, by_item_above)
    })
  })


  // reports sales by item below

  const by_item_below = (request, reply, items) => {
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
    var excel_items = []
    var default_id = 'default_id';
    if(request.body.product_id) {
      default_id = request.body.product_id
    }
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
        if(default_id == 'default_id' || default_id == s.product_id) {
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
    var page = parseInt(request.params.page)
    var limit = parseInt(request.params.limit)
    // if(request.params.name == undefined) {
    //   data = data.slice((page-1) * limit, limit*page)
    // }
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
        if(request.params.name != undefined) {
          Answer=[[
            'name',
            'category',
            'gross_sales',
            'items_sold',
            'refunds',
            'items_refunded',
            'cost_of_goods',
            'discounts',
            'net_sales',
            'gross_profit',
            'taxes'
          ]]
        }
        for (var d of data) {
          if (d.id != undefined) {
            if (goodObj[d.id] != undefined) {
              if (categoryObj[goodObj[d.id]] != undefined) {
                d.category = categoryObj[goodObj[d.id]]
              }
            }
          }
          if(request.params.name == undefined) {
            Answer.push(d)
          }
          else {
            Answer.push([
              d.name,
              d.category,
              d.gross_sales,
              d.items_sold,
              d.refunds,
              d.items_refunded,
              d.cost_of_goods,
              d.discounts,
              d.net_sales,
              d.gross_profit,
              d.taxes
            ])
          }
        }
        if(request.params.name == undefined) {
          reply.ok({
            total: total,
            excel_items: Answer,
            page: Math.ceil(total/limit),
            data: Answer.slice((page-1) * limit, limit*page),
          })
        }
        else {
          instance.send_csv(Answer, 'by_item', reply)
        }
      })
    })
  }

  instance.post('/reports/sales/by_item/below/:min/:max/:limit/:page', version, (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      if(admin){
        instance.get_receipt_by_range(request, reply, admin, by_item_below)
      }
    })
  })

  instance.get('/reports/sales/by_item/:token/:services/:employees/:custom/:start/:end/:min/:max/:name', (request, reply) => {
    request.headers = {
      'authorization': request.params.token,
      'accept-user': 'admin'
    }
    request.params.services = request.params.services.split('[').join('').split(']').join('').split('\'').join('').split('"').join('').split('`')
    request.params.employees = request.params.employees.split('[').join('').split(']').join('').split('\'').join('').split('"').join('').split('`')
    const services = []
    for(var s of request.params.services) {
      if(s != '') {
        services.push(s)
      }
    }
    const employees = []
    for(var s of request.params.employees) {
      if(s != '') {
        employees.push(s)
      }
    }
    request.body = {
      services: services,
      employees: employees,
      custom: request.params.custom=='true',
      start: request.params.start,
      end: request.params.end
    }
    instance.oauth_admin(request, reply, (admin) => {
      instance.get_receipt_by_range(request, reply, admin, by_item_below)
    })
  })

  next()
}