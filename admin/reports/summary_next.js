const fs = require('fs');
module.exports = (instance, _, next) => {

  var version = { version: '1.0.0' }

  // reports summary first page of back office
  // chart and table

  var return_dates = (start, end, cnt) => {
    var times = [start, 0]
    for (let i = 0; i < cnt - 2; i++) {
      if (cnt - 1 > 0) {
        times.push([parseInt(start + (end - start) / (cnt - 1)), 0])
        start += (end - start) / (cnt - 1)
      }
    }
    if (cnt > 1)
      times.push([end, 0])
    return times
  }

  var calculate_summary = (request, reply, items, paid_debts) => {
    var gross_sale = 0.0;
    var refund = 0.0;
    var gifts = 0.0;
    var debt = 0.0;
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
    var debt_array = []
    var start_time = request.params.min, end_time = request.params.max
    if (items == null) {
      items = []
    }
    for (var d of paid_debts) {
      debt -= d.total_price
      // debt_array.push({
      //   time: d.date,
      //   value: d.total_price
      // })
    }
    items.sort((a, b) => (a.date > b.date) ? 1 : ((b.date > a.date) ? -1 : 0));
    var percent_of_gift = {}
    var percent_of_debt = {}
    var giftObj = {}
    var add_gift_to_disc = {}
    for (var re of items) {
      var g = 0.0
      var d = 0.0
      for (var p of re.payment) {
        if (p.name == 'gift') {
          g += p.value
        }
        if (p.name == 'debt') {
          d += p.value
        }
      }
      if (re.total_price != 0) {
        percent_of_gift[re._id] = g / re.total_price
        percent_of_debt[re._id] = d / re.total_price
      }
      else {
        percent_of_gift[re._id] = 0
        percent_of_debt[re._id] = 0
      }
      add_gift_to_disc[re._id] = g
      debt_array.push({
        time: re.date,
        value: d
      })
    }
    debt_array.sort((a, b) => (a.time > b.time) ? 1 : ((b.date > a.date) ? -1 : 0))
    var ids_for_gift = []

    var debt_timer = 0
    if (items.length > 0) {
      debt_timer = items[0].date
    }
    var increment = 0
    for (const item of items) {
      net_sales_array.push({
        time: item.date,
        value: 0
      })
      while (increment < paid_debts.length && item.date >= paid_debts[increment].date) {
        net_sales_array[net_sales_array.length - 1].value += paid_debts[increment].total_price;
        increment++;
      }

      debt += item.total_price * percent_of_debt[item._id]
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
        cost_of_good += sold_item.cost * sold_item.value * (item.is_refund == false ? 1 : (-1))
        for (var i = sold_item.taxes.length - 1; i >= 0; i--) {
          if (item.is_refund == false) {
            if (sold_item.taxes[i].type != 'include') {
              tax += sold_item.price * sold_item.value * sold_item.taxes[i].tax / 100.0
            }
            else {
              tax += sold_item.price * sold_item.value * sold_item.taxes[i].tax / (100.0 + sold_item.taxes[i].tax)
            }
          }
          else {
            if (sold_item.taxes[i].type != 'include') {
              tax -= sold_item.price * sold_item.value * sold_item.taxes[i].tax / 100.0
            }
            else {
              tax -= sold_item.price * sold_item.value * sold_item.taxes[i].tax / (100.0 + sold_item.taxes[i].tax)
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
        if (item.debtData == null) {
          net_sales_array[net_sales_array.length - 1].value += show_total
        }

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
        discount_array.push({
          time: item.date,
          value: add_gift_to_disc[item._id]
        })
        // if(discount_array.length > 0) {
        //   discount_array[discount_array.length-1].value += add_gift_to_disc[item._id]
        // }
        // else {
        //   discount_array.push({
        //     time: item.date,
        //     value: add_gift_to_disc[item._id]
        //   })
        // }
      } else {
        //here refund items are found, it is gathering in the array
        refund_array.push({
          time: item.date,
          value: item.total_price
        })
        var show_total = item.total_price
        if (percent_of_gift[item._id] != undefined) {
          if (item.is_refund == false) {
            show_total += item.total_price * percent_of_gift[item._id]
          }
          else {
            show_total -= item.total_price * percent_of_gift[item._id]
          }
        }
        if (item.debtData == 0) {
          net_sales_array[net_sales.length - 1] -= show_total
        }
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
        discount_array.push({
          time: item.date,
          value: add_gift_to_disc[item._id]
        })
        // if(discount_array.length > 0) {
        //   discount_array[discount_array.length-1].value -= add_gift_to_disc[item._id]
        // }
        // else {
        //   discount_array.push({
        //     time: item.date,
        //     value: -1*add_gift_to_disc[item._id]
        //   })
        // }
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
        if (item.is_refund == false) {
          gifts += percent_of_gift[item._id] * item.total_price
        }
        else {
          gifts += percent_of_gift[item._id] * item.total_price * (-1)
        }
      }
    }
    while (increment < paid_debts.length) {
      // var current_cost_of_goods = 0
      // for (const __saled_item of paid_debts[increment].sold_item_list) {
      //   if (paid_debts[increment].is_refund == false) {
      //     cost_of_goods += __saled_item.cost * __saled_item.value
      //   }
      //   else {
      //     cost_of_goods -= __saled_item.cost * __saled_item.value
      //   }
      //   current_cost_of_goods += __saled_item.cost * __saled_item.value
      // }
      if (net_sales_array[net_sales_array.length - 1]) {
        net_sales_array[net_sales_array.length - 1].value += paid_debts[increment].total_price;
      }
      if (gross_profit_array[net_sales_array.length - 1]) {
        gross_profit_array[net_sales_array.length - 1].value += paid_debts[increment].total_price;
      }
      increment++;
    }

    start_time = parseInt(request.params.min, 10)
    end_time = parseInt(request.params.max, 10)
    var cnt = 30
    if (request.body.count > 0) {
      cnt = Math.round(request.body.count)
    }
    let count_type = +request.body.count_type
    if (count_type) {
      switch (count_type) {
        case 1: {
          if (request.body.custom) {
            cnt = Math.abs(request.body.end - request.body.start)
          }
          else {
            cnt = 24
          }
          break;
        }
        case 2: {
          cnt = Math.ceil((end_time - start_time) / (24 * 60 * 60 * 1000))
          break;
        }
        case 3: {
          cnt = Math.ceil((end_time - start_time) / (7 * 24 * 60 * 60 * 1000))
          break;
        }
        case 4: {
          cnt = Math.ceil((end_time - start_time) / (30 * 24 * 60 * 60 * 1000))
          break;
        }
        case 5: {
          cnt = Math.ceil((end_time - start_time) / (6 * 30 * 24 * 60 * 60 * 1000))
          break;
        }
        case 6: {
          cnt = Math.ceil((end_time - start_time) / (365 * 24 * 60 * 60 * 1000))
          break;
        }
      }
    }

    // cnt = Math.round((end_time - start_time) / 86400000)
    // if (end_time - start_time == 86400000 || end_time - start_time == 86400000 - 60000) {
    //   cnt = 24
    // }
    if (request.body.service != null && request.body.service != '') {
      cnt = 1
    }
    var net_sales = instance.calculator(net_sales_array, start_time, end_time, cnt)
    var gross_profits = instance.calculator(gross_profit_array, start_time, end_time, cnt)
    var gross_sales = instance.calculator(gross_sales_array, start_time, end_time, cnt)
    var discounts = instance.calculator(discount_array, start_time, end_time, cnt)
    var refunds = instance.calculator(refund_array, start_time, end_time, cnt)
    var debts = instance.calculator(debt_array, start_time, end_time, cnt)
    var cost_of_goods_
    if (cost_of_goods_array.length != 0) {
      cost_of_goods_ = instance.calculator(cost_of_goods_array, start_time, end_time, cnt)
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
      taxes_ = instance.calculator(taxes_array, start_time, end_time, cnt)
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
      taxes_times = [],
      debt_times = [],
      debt_values = [],
      times_array = []
    for (var item of net_sales) {
      times_array.push(item.time)
      // net_sale_times.push(item.time)
      if (request.params.page == undefined) {
        net_sale_values.push([item.time, item.value])
      }
      else {
        net_sale_values.push(item.value)
      }
    }
    for (var item of refunds) {
      // refund_times.push(item.time)
      if (request.params.page == undefined) {
        refund_values.push([item.time, item.value])
      }
      else {
        refund_values.push(item.value)
      }
    }
    for (var item of discounts) {
      // discount_times.push(item.time)
      if (request.params.page == undefined) {
        discount_values.push([item.time, item.value])
      }
      else {
        discount_values.push(item.value)
      }
    }
    for (var item of gross_sales) {
      // gross_sale_times.push(item.time)
      if (request.params.page == undefined) {
        gross_sale_values.push([item.time, item.value])
      }
      else {
        gross_sale_values.push(item.value)
      }
    }
    for (var item of gross_profits) {
      // gross_profit_times.push(item.time)
      if (request.params.page == undefined) {
        gross_profit_values.push([item.time, item.value])
      }
      else {
        gross_profit_values.push(item.value)
      }
    }
    taxes_times = Object.values(gross_profit_times)
    var TAXES = 0
    // for (var item of taxes_) {
    //   taxes_values.push(item.value)
    //   TAXES += item.value
    // }
    for (let i = 0; i < taxes_.length; i++) {
      if (request.params.page == undefined) {
        taxes_values.push([gross_profits[i].time, taxes_[i].value])
      }
      else {
        taxes_values.push(taxes_[i].value)
      }
      TAXES += taxes_[i].value
    }
    // cost_of_goods_times = Object.values(gross_profit_times)
    // for (var item of cost_of_goods_) {
    //   cost_of_goods_values.push(item.value)
    // }
    for (let i = 0; i < cost_of_goods_.length; i++) {
      if (request.params.page == undefined) {
        cost_of_goods_values.push([gross_profits[i].time, cost_of_goods_[i].value])
      }
      else {
        cost_of_goods_values.push(cost_of_goods_[i].value)
      }
    }
    for (var de of debts) {
      // debt_times.push(de.time)
      if (request.params.page == undefined) {
        debt_values.push([de.time, de.value])
      }
      else {
        debt_values.push(de.value)
      }
    }
    discount += gifts
    var net_sale = gross_sale - (refund + discount + debt);
    var gross_profit = net_sale - cost_of_goods;
    var recepts = items.length;

    var page = parseInt(request.params.page)
    var limit = parseInt(request.params.limit)
    var default_arr = new Array(cnt).fill(0);
    if (request.params.page == undefined && request.params.name == undefined) {
      reply.ok({
        gross_sale: gross_sale,
        refund: refund,
        discount: discount,
        debt: debt,
        service_value: service_value,
        cost_of_goods: cost_of_goods,
        net_sale: net_sale,
        gross_profit: gross_profit,
        recepts: recepts,
        // for boss 
        gross_sales: gross_sale,
        refunds: refund,
        discounts: discount,
        cost_of_goods: cost_of_goods,
        net_sales: net_sale,
        taxes: TAXES,
        data: request.body.target == 'gross_sales' ? gross_sale_values :
          request.body.target == 'refunds' ? refund_values :
            request.body.target == 'discounts' ? discount_values :
              request.body.target == 'debts' ? debt_values :
                request.body.target == 'net_sales' ? net_sale_values : gross_profit_values
        // net_sale_times: net_sale_times,
        // net_sale_values: net_sale_values,
        // refund_times: refund_times,
        // refund_values: refund_values,
        // discount_times: discount_times,
        // discount_values: discount_values,
        // gross_sale_times: gross_sale_times,
        // gross_sale_values: gross_sale_values,
        // gross_profit_times: gross_profit_times,
        // gross_profit_values: gross_profit_values
      });
    }
    else {
      if (request.params.name) {
        var answer = [[
          'time',
          'gross_sale',
          'refund',
          'discount',
          'net_sale',
          'tax',
          'cost_of_good',
          'debt',
          'gross_profit'
        ]]
        var TT = 1
        // console.log(TT)
        for (let i = 0; i < times_array.length; i++) {
          TT++
          answer.push([
            // new Date(times_array[i] + 5 * 60 * 60 * 1000),
            new Date(times_array[i]),
            gross_sale_values[i][1],
            refund_values[i][1],
            discount_values[i][1],
            net_sale_values[i][1],
            taxes_values[i][1],
            cost_of_goods_values[i][1],
            debt_values[i][1],
            gross_profit_values[i][1]
          ])
        }
        const CSVString = answer.join('\n');
        var file = new Date().getTime() + 'Summary_ITEMS.csv'
        fs.writeFile('./static/' + file, CSVString, (err) => {
          if (err) {
            instance.send_Error('writing to file', JSON.stringify(err))
          }
          reply.sendFile('./' + file, (err) => {
            if (err) {
              instance.send_Error('on sending file', JSON.stringify(err))
            }
          })
          setTimeout(() => {
            fs.unlink('./static/' + file, (err) => {
              if (err) {
                instance.send_Error('exported summary file', JSON.stringify(err))
              }
            })
          }, 1000)
        });
      }
      else {
        var total = gross_sale_values.length
        gross_sale_values = gross_sale_values.splice(limit * (page - 1), limit)
        var summ = 0.0;
        summ += gross_sale_values.reduce((a, b) => a + b, 0)
        summ += net_sale_values.reduce((a, b) => a + b, 0)
        summ += discount_values.reduce((a, b) => a + b, 0)
        summ += refund_values.reduce((a, b) => a + b, 0)
        summ += cost_of_goods_values.reduce((a, b) => a + b, 0)
        summ += debt_values.reduce((a, b) => a + b, 0)
        refund_values = refund_values.splice(limit * (page - 1), limit)
        discount_values = discount_values.splice(limit * (page - 1), limit)
        net_sale_values = net_sale_values.splice(limit * (page - 1), limit)
        taxes_values = taxes_values.splice(limit * (page - 1), limit)
        cost_of_goods_values = cost_of_goods_values.splice(limit * (page - 1), limit)
        gross_profit_values = gross_profit_values.splice(limit * (page - 1), limit)
        debt_values = debt_values.splice(limit * (page - 1), limit)
        times_array = times_array.splice(limit * (page - 1), limit)
        if (summ != 0) {
          var answer = []
          for (let i = 0; i < times_array.length; i++) {
            answer.push({
              time: times_array[i],
              gross_sale: gross_sale_values[i],
              refund: refund_values[i],
              discount: discount_values[i],
              net_sale: net_sale_values[i],
              tax: taxes_values[i],
              cost_of_good: cost_of_goods_values[i],
              debt: debt_values[i],
              gross_profit: gross_profit_values[i]
            })
          }
          reply.ok({
            total: total,
            page: Math.ceil(total / limit),
            data: answer
          })
          // reply.ok(answer)
          // reply.ok({
          //   times: times_array,
          //   // line: {
          //   //   net_sale_times: net_sale_times,
          //   //   net_sale_values: net_sale_values,
          //   //   refund_times: refund_times,
          //   //   refund_values: refund_values,
          //   //   discount_times: discount_times,
          //   //   discount_values: discount_values,
          //   //   gross_sale_times: gross_sale_times,
          //   //   gross_sale_values: gross_sale_values,
          //   //   gross_profit_times: gross_profit_times,
          //   //   gross_profit_values: gross_profit_values,
          //   //   debt_times: debt_times,
          //   //   debt_values: debt_values
          //   // },
          //   // data: {
          //     // refund_times: refund_times.slice(limit * (page - 1), limit*page),
          //     refund_values: refund_values.slice(limit * (page - 1), limit*page),
          //     // net_sale_times: net_sale_times.slice(limit * (page - 1), limit*page),
          //     net_sale_values: net_sale_values.slice(limit * (page - 1), limit*page),
          //     // discount_times: discount_times.slice(limit * (page - 1), limit*page),
          //     discount_values: discount_values.slice(limit * (page - 1), limit*page),
          //     // gross_sale_times: gross_sale_times.slice(limit * (page - 1), limit*page),
          //     gross_sale_values: gross_sale_values.slice(limit * (page - 1), limit*page),
          //     // gross_profit_times: gross_profit_times.slice(limit * (page - 1), limit*page),
          //     gross_profit_values: gross_profit_values.slice(limit * (page - 1), limit*page),
          //     // cost_of_goods_times: cost_of_goods_times.slice(limit * (page - 1), limit*page),
          //     cost_of_goods_values: cost_of_goods_values.slice(limit * (page - 1), limit*page),
          //     taxes_values: taxes_values.slice(limit * (page - 1), limit*page),
          //     // taxes_times: taxes_times.slice(limit * (page - 1), limit*page),
          //     // debt_times: debt_times.slice(limit * (page - 1), limit*page),
          //     debt_values: debt_values.slice(limit * (page - 1), limit*page),
          //     // net_sale_times: net_sale_times,
          //     // net_sale_values: net_sale_values,
          //     // refund_times: refund_times,
          //     // refund_values: refund_values,
          //     // discount_times: discount_times,
          //     // discount_values: discount_values,
          //     // gross_sale_times: gross_sale_times,
          //     // gross_sale_values: gross_sale_values,
          //     // gross_profit_times: gross_profit_times,
          //     // gross_profit_values: gross_profit_values,
          //     // cost_of_goods_times: cost_of_goods_times,
          //     // cost_of_goods_values: cost_of_goods_values,
          //     // taxes_values: taxes_values,
          //     // taxes_times: taxes_times
          //   // },
          //   total: cnt
          // })
        }
        else {
          reply.ok({
            total: 0,
            page: 0,
            data: [],
          })
          // var times = return_dates(start_time, end_time, cnt)
          // reply.ok({
          //   gross_sale: 0,
          //   refund: 0,
          //   discount: 0,
          //   debt: 0,
          //   service_value: 0,
          //   cost_of_goods: 0,
          //   net_sale: 0,
          //   gross_profit: 0,
          //   recepts: 0,
          //   data: [],
          //   // line: {
          //   //   net_sale_times: times,
          //   //   net_sale_values: default_arr,
          //   //   refund_times: times,
          //   //   refund_values: default_arr,
          //   //   discount_times: times,
          //   //   discount_values: default_arr,
          //   //   gross_sale_times: times,
          //   //   gross_sale_values: default_arr,
          //   //   gross_profit_times: times,
          //   //   gross_profit_values: default_arr,
          //   //   debt_times: default_arr,
          //   //   debt_values: default_arr,
          //   // },
          //   // data: {
          //   //   net_sale_times: [],
          //   //   net_sale_values: [],
          //   //   refund_times: [],
          //   //   refund_values: [],
          //   //   discount_times: [],
          //   //   discount_values: [],
          //   //   gross_sale_times: [],
          //   //   gross_sale_values: [],
          //   //   gross_profit_times: [],
          //   //   gross_profit_values: [],
          //   //   cost_of_goods_times: [],
          //   //   cost_of_goods_values: [],
          //   //   taxes_values: [],
          //   //   taxes_times: [],
          //   //   debt_times: [],
          //   //   debt_values:[]
          //   // },
          //   total: 0
          // })
        }
      }
    }
  }

  function find_paid_debts(request, reply, items, admin) {

    if (request.body.count_type == 1 && request.params.max - request.params.min == 86400000) {
      request.params.min = request.params.min * 1 + request.body.start * 60 * 60 * 1000
      request.params.max = request.params.max * 1 - (24 - request.body.end) * 60 * 60 * 1000
    }
    var min = parseInt(request.params.min)
    var max = parseInt(request.params.max)

    const {services} = request.body;

    const user_available_services = request.user.services.map(serv => serv.service.toString())

    var query = {
      organization: admin.organization,
      debt_id: {
        $ne: null
      },
      service: { $in: user_available_services },
      date: {
        $gte: min,
        $lte: max
      }
    }
    if (request.body) {
      // if(request.body.employees.length > 0) {
      //   query.service = {
      //     $in: request.body.employees
      //   }
      // }
      if (services) {
        if (services.length > 0) {
          for(const service of services){
            if(!user_available_services.includes(service)){
              return reply.error('Access denied!')
            }
          }
          query.service = {
            $in: services
          }
        }
      }
      if (request.body.service != null && request.body.service != '') {
        query.service = request.body.service
      }
    }
    instance.Receipts.find(query, (err, recepts) => {
      if (recepts == null) {
        recepts = []
      }
      calculate_summary(request, reply, items, recepts)
    })
  }

  instance.post('/report/summary/:min/:max', version, (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      if (!admin) {
        return reply.error('Access')
      }
      instance.get_receipt_by_range(request, reply, admin, find_paid_debts)
    })
  })

  instance.post('/report/summary/:min/:max/:limit/:page', version, (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      if (!admin) {
        return reply.error('Access')
      }
      // calculateReportSummary(request, reply, admin)
      instance.get_receipt_by_range(request, reply, admin, find_paid_debts)
    })
  })

  instance.get('/report/summary/:min/:max/:token/:name', (request, reply) => {
    request.headers = {
      'Authorization': request.params.token,
      'Accept-User': 'admin'
    }
    instance.oauth_admin(request, reply, (admin) => {
      instance.get_receipt_by_range(request, reply, admin, find_paid_debts)
    })
  })

  instance.get('/report/summary/:token/:services/:employees/:count/:custom/:start/:end/:min/:max/:name', (request, reply) => {
    request.headers = {
      'authorization': request.params.token,
      'accept-user': 'admin'
    }
    request.params.services = request.params.services.split('[').join('').split(']').join('').split('\'').join('').split('"').join('').split('`')
    request.params.employees = request.params.employees.split('[').join('').split(']').join('').split('\'').join('').split('"').join('').split('`')
    var services = []
    for (var s of request.params.services) {
      if (s != '') {
        services.push(s)
      }
    }
    var employees = []
    for (var s of request.params.employees) {
      if (s != '') {
        employees.push(s)
      }
    }
    request.body = {
      services: services,
      employees: employees,
      custom: request.params.custom,
      count: request.params.count,
      start: request.params.start,
      end: request.params.end
    }
    instance.oauth_admin(request, reply, (admin) => {
      instance.get_receipt_by_range(request, reply, admin, find_paid_debts)
    })
    // reply.sendFile('./MyCompany_ITEMS.csv')
  })

  // for boss application


  // instance.post('/reports/:min/:max', {
  //   version: '1.0.0'
  // }, (request, reply) => {
  //   instance.oauth_admin(request, reply, (user) => {
  //     instance.get_receipt_by_range(request, reply, user, find_paid_debts)
  //   })
  // })

  next()
}