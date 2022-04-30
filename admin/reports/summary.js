module.exports = (instance, _, next) => {
  var version = { version: '1.0.0' };

  // reports summary first page of back office
  // chart and table

  var return_dates = (start, end, cnt) => {
    var times = [start];
    for (let i = 0; i < cnt - 2; i++) {
      if (cnt - 1 > 0) {
        times.push(parseInt(start + (end - start) / (cnt - 1)));
        start += (end - start) / (cnt - 1);
      }
    }
    if (cnt > 1) times.push(end);
    return times;
  };

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
    var refund_array = [];
    var discount_array = [];
    var gross_sales_array = [];
    var gross_profit_array = [];
    var taxes_array = [];
    var cost_of_goods_array = [];
    var debt_array = [];
    var start_time = request.params.min,
      end_time = request.params.max;
    if (items == null) {
      items = [];
    }
    for (var d of paid_debts) {
      debt -= d.total_price;
      // debt_array.push({
      //   time: d.date,
      //   value: d.total_price
      // })
    }

    items.sort((a, b) => (a.date > b.date ? 1 : b.date > a.date ? -1 : 0));
    var percent_of_gift = {};
    var percent_of_debt = {};
    var giftObj = {};
    var add_gift_to_disc = {};
    for (var re of items) {
      var g = 0.0;
      var d = 0.0;
      for (var p of re.payment) {
        if (p.name == 'gift') {
          g += p.value;
        }
        if (p.name == 'debt') {
          d += p.value;
        }
      }
      if (re.total_price != 0) {
        percent_of_gift[re._id] = g / re.total_price;
        percent_of_debt[re._id] = d / re.total_price;
      } else {
        percent_of_gift[re._id] = 0;
        percent_of_debt[re._id] = 0;
      }
      add_gift_to_disc[re._id] = g;
      debt_array.push({
        time: re.date,
        value: d,
      });
    }
    debt_array.sort((a, b) => (a.time > b.time ? 1 : b.date > a.date ? -1 : 0));
    var ids_for_gift = [];

    var debt_timer = 0;
    if (items.length > 0) {
      debt_timer = items[0].date;
    }
    var increment = 0;
    for (const item of items) {
      net_sales_array.push({
        time: item.date,
        value: 0,
      });
      while (
        increment < paid_debts.length &&
        item.date >= paid_debts[increment].date
      ) {
        if (net_sales_array[net_sales_array.length - 1]) {
          net_sales_array[net_sales_array.length - 1].value +=
            paid_debts[increment].total_price;
        }
        increment++;
      }
      debt += item.total_price * percent_of_debt[item._id];
      if (giftObj[item._id] == undefined) {
        giftObj[item._id] = 0;
        ids_for_gift.push(item._id);
      }
      if (item.is_refund == false) {
        for (const __dis of item.discount) {
          if (__dis != undefined) {
            if (__dis.type != undefined) {
              if (__dis.type == 'percentage') {
                item.total_price = Math.round(
                  (item.total_price * 100) / (100 - __dis.value)
                );
                discount += Math.round((__dis.value * item.total_price) / 100);
              } else {
                item.total_price += __dis.value;
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
                item.total_price = Math.round(
                  (item.total_price * 100) / (100 - __dis.value)
                );
                discount -= Math.round((__dis.value * item.total_price) / 100);
              } else {
                item.total_price += __dis.value;
                discount -= __dis.value;
              }
            }
          }
        }
      }
      if (item.is_self == false && item.service_value != undefined) {
        if (item.is_refund == false) {
          service_value += (item.total_price * item.service_value) / 100.0;
        } else {
          service_value -= (item.total_price * item.service_value) / 100.0;
        }
      }
      var tax = 0.0;
      var cost_of_good = 0.0;
      for (var sold_item of item.sold_item_list) {
        cost_of_good +=
          sold_item.cost * sold_item.value * (item.is_refund == false ? 1 : -1);
        for (var i = sold_item.taxes.length - 1; i >= 0; i--) {
          if (item.is_refund == false) {
            if (sold_item.taxes[i].type != 'include') {
              tax +=
                (sold_item.price * sold_item.value * sold_item.taxes[i].tax) /
                100.0;
            } else {
              tax +=
                (sold_item.price * sold_item.value * sold_item.taxes[i].tax) /
                (100.0 + sold_item.taxes[i].tax);
            }
          } else {
            if (sold_item.taxes[i].type != 'include') {
              tax -=
                (sold_item.price * sold_item.value * sold_item.taxes[i].tax) /
                100.0;
            } else {
              tax -=
                (sold_item.price * sold_item.value * sold_item.taxes[i].tax) /
                (100.0 + sold_item.taxes[i].tax);
            }
          }
        }
      }
      cost_of_goods_array.push({
        value: cost_of_good,
        time: item.date,
      });
      taxes_array.push({
        value: tax,
        time: item.date,
      });
      //gross sales is gathering in one array

      if (item.is_refund == false) {
        gross_sales_array.push({
          time: item.date,
          value: item.total_price,
        });
      }
      //calculate unrefund item
      if (item.is_refund == false) {
        gross_sale += item.total_price;
        var show_total = item.total_price;
        if (percent_of_gift[item._id] != undefined) {
          show_total -= item.total_price * percent_of_gift[item._id];
        }
        if (item.debtData == null) {
          if (net_sales_array[net_sales_array.length - 1]) {
            net_sales_array[net_sales_array.length - 1].value += show_total;
          }
        }

        for (const __dis of item.discount) {
          if (__dis.type == 'percentage') {
            //gathering discounts of unrefund items in the array
            discount_array.push({
              time: item.date,
              value: (__dis.value * item.total_price) / 100,
            });
            if (net_sales_array[net_sales_array.length - 1]) {
              net_sales_array[net_sales_array.length - 1].value -=
                (__dis.value * item.total_price) / 100;
            }
          } else {
            discount_array.push({
              time: item.date,
              value: __dis.value,
            });
            if (net_sales_array[net_sales_array.length - 1]) {
              net_sales_array[net_sales_array.length - 1].value -= __dis.value;
            }
          }
        }
        discount_array.push({
          time: item.date,
          value: add_gift_to_disc[item._id],
        });
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
          value: item.total_price,
        });
        var show_total = item.total_price;
        if (percent_of_gift[item._id] != undefined) {
          if (item.is_refund == false) {
            show_total += item.total_price * percent_of_gift[item._id];
          } else {
            show_total -= item.total_price * percent_of_gift[item._id];
          }
        }
        if (item.debtData == 0) {
          net_sales_array[net_sales.length - 1] -= show_total;
        }
        refund += item.total_price;
        for (const __dis of item.discount) {
          if (__dis.type == 'percentage') {
            if (net_sales_array[net_sales_array.length - 1]) {
              net_sales_array[net_sales_array.length - 1].value +=
                (__dis.value * item.total_price) / 100;
            }
            discount_array.push({
              time: item.date,
              value: ((__dis.value * item.total_price) / 100) * -1,
            });
          } else {
            if (net_sales_array[net_sales_array.length - 1]) {
              net_sales_array[net_sales_array.length - 1].value += __dis.value;
            }
            discount_array.push({
              time: item.date,
              value: __dis.value * -1,
            });
          }
        }
        discount_array.push({
          time: item.date,
          value: add_gift_to_disc[item._id],
        });
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

      var current_cost_of_goods = 0;

      for (const __saled_item of item.sold_item_list) {
        if (item.is_refund == false) {
          cost_of_goods += __saled_item.cost * __saled_item.value;
        } else {
          cost_of_goods -= __saled_item.cost * __saled_item.value;
        }
        current_cost_of_goods += __saled_item.cost * __saled_item.value;
      }
      if (item.is_refund == false) {
        if (net_sales_array[net_sales_array.length - 1]) {
          gross_profit_array.push({
            time: item.date,
            value:
              net_sales_array[net_sales_array.length - 1].value -
              current_cost_of_goods,
          });
        }
      } else {
        if (net_sales_array[net_sales_array.length - 1]) {
          gross_profit_array.push({
            time: item.date,
            value:
              net_sales_array[net_sales_array.length - 1].value +
              current_cost_of_goods,
          });
        }
      }

      // calculate gifts
      if (percent_of_gift[item._id] != undefined) {
        if (item.is_refund == false) {
          gifts += percent_of_gift[item._id] * item.total_price;
        } else {
          gifts += percent_of_gift[item._id] * item.total_price * -1;
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
        net_sales_array[net_sales_array.length - 1].value +=
          paid_debts[increment].total_price;
      }
      if (gross_profit_array[net_sales_array.length - 1]) {
        gross_profit_array[net_sales_array.length - 1].value +=
          paid_debts[increment].total_price;
      }
      increment++;
    }

    start_time = parseInt(request.params.min, 10);
    end_time = parseInt(request.params.max, 10);
    var cnt = 30;
    if (request.body.count > 0) {
      cnt = Math.round(request.body.count);
    }
    if (
      end_time - start_time == 86400000 ||
      end_time - start_time == 86400000 - 60000
    ) {
      cnt = 24;
    }
    if (request.body.service != null && request.body.service != '') {
      cnt = 1;
    }
    var net_sales = instance.calculator(
      net_sales_array,
      start_time,
      end_time,
      cnt
    );
    var gross_profits = instance.calculator(
      gross_profit_array,
      start_time,
      end_time,
      cnt
    );
    var gross_sales = instance.calculator(
      gross_sales_array,
      start_time,
      end_time,
      cnt
    );
    var discounts = instance.calculator(
      discount_array,
      start_time,
      end_time,
      cnt
    );
    var refunds = instance.calculator(refund_array, start_time, end_time, cnt);
    var debts = instance.calculator(debt_array, start_time, end_time, cnt);
    var cost_of_goods_;
    if (cost_of_goods_array.length != 0) {
      cost_of_goods_ = instance.calculator(
        cost_of_goods_array,
        start_time,
        end_time,
        cnt
      );
    } else {
      cost_of_goods_ = [];
      for (var f of net_sales) {
        cost_of_goods_.push({
          value: 0,
          time: f.time,
        });
      }
    }
    var taxes_;
    if (taxes_array.length != 0) {
      taxes_ = instance.calculator(taxes_array, start_time, end_time, cnt);
    } else {
      taxes_ = [];
      for (var f of net_sales) {
        taxes_.push({
          value: 0,
          time: f.time,
        });
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
      debt_values = [];
    for (var item of net_sales) {
      net_sale_times.push(item.time);
      net_sale_values.push(item.value);
    }
    for (var item of refunds) {
      refund_times.push(item.time);
      refund_values.push(item.value);
    }
    for (var item of discounts) {
      discount_times.push(item.time);
      discount_values.push(item.value);
    }
    for (var item of gross_sales) {
      gross_sale_times.push(item.time);
      gross_sale_values.push(item.value);
    }
    for (var item of gross_profits) {
      gross_profit_times.push(item.time);
      gross_profit_values.push(item.value);
    }
    taxes_times = Object.values(gross_profit_times);
    var TAXES = 0;
    for (var item of taxes_) {
      taxes_values.push(item.value);
      TAXES += item.value;
    }
    cost_of_goods_times = Object.values(gross_profit_times);
    for (var item of cost_of_goods_) {
      cost_of_goods_values.push(item.value);
    }
    for (var de of debts) {
      debt_times.push(de.time);
      debt_values.push(de.value);
    }
    discount += gifts;
    var net_sale = gross_sale - (refund + discount + debt);
    var gross_profit = net_sale - cost_of_goods;
    var recepts = items.length;

    var default_arr = new Array(cnt).fill(0);
    // if (request.body.page == undefined) {
    //   reply.ok({
    //     gross_sale: gross_sale,
    //     refund: refund,
    //     discount: discount,
    //     service_value: service_value,
    //     cost_of_goods: cost_of_goods,
    //     net_sale: net_sale,
    //     gross_profit: gross_profit,
    //     recepts: recepts,
    //     net_sale_times: net_sale_times,
    //     net_sale_values: net_sale_values,
    //     refund_times: refund_times,
    //     refund_values: refund_values,
    //     discount_times: discount_times,
    //     discount_values: discount_values,
    //     gross_sale_times: gross_sale_times,
    //     gross_sale_values: gross_sale_values,
    //     gross_profit_times: gross_profit_times,
    //     gross_profit_values: gross_profit_values
    //   });
    // }
    // else {
    var summ = 0.0;
    summ += gross_sale_values.reduce((a, b) => a + b, 0);
    summ += net_sale_values.reduce((a, b) => a + b, 0);
    summ += discount_values.reduce((a, b) => a + b, 0);
    summ += refund_values.reduce((a, b) => a + b, 0);
    summ += cost_of_goods_values.reduce((a, b) => a + b, 0);
    summ += debt_values.reduce((a, b) => a + b, 0);
    if (summ != 0) {
      var page = parseInt(request.body.page);
      var limit = parseInt(request.body.limit);
      // refund_times = refund_times.splice(limit * (page - 1), limit)
      // refund_values = refund_values.splice(limit * (page - 1), limit)
      // net_sale_times = net_sale_times.splice(limit * (page - 1), limit)
      // net_sale_values = net_sale_values.splice(limit * (page - 1), limit)
      // discount_times = discount_times.splice(limit * (page - 1), limit)
      // discount_values = discount_values.splice(limit * (page - 1), limit)
      // gross_sale_times = gross_sale_times.splice(limit * (page - 1), limit)
      // gross_sale_values = gross_sale_values.splice(limit * (page - 1), limit)
      // gross_profit_times = gross_profit_times.splice(limit * (page - 1), limit)
      // gross_profit_values = gross_profit_values.splice(limit * (page - 1), limit)
      // cost_of_goods_times = cost_of_goods_times.splice(limit * (page - 1), limit)
      // cost_of_goods_values = cost_of_goods_values.splice(limit * (page - 1), limit)
      // taxes_values = taxes_values.splice(limit * (page - 1), limit)
      // taxes_times = taxes_times.splice(limit * (page - 1), limit)
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
        line: {
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
          debt_times: debt_times,
          debt_values: debt_values,
        },
        data: {
          refund_times: refund_times.slice(limit * (page - 1), limit * page),
          refund_values: refund_values.slice(limit * (page - 1), limit * page),
          net_sale_times: net_sale_times.slice(
            limit * (page - 1),
            limit * page
          ),
          net_sale_values: net_sale_values.slice(
            limit * (page - 1),
            limit * page
          ),
          discount_times: discount_times.slice(
            limit * (page - 1),
            limit * page
          ),
          discount_values: discount_values.slice(
            limit * (page - 1),
            limit * page
          ),
          gross_sale_times: gross_sale_times.slice(
            limit * (page - 1),
            limit * page
          ),
          gross_sale_values: gross_sale_values.slice(
            limit * (page - 1),
            limit * page
          ),
          gross_profit_times: gross_profit_times.slice(
            limit * (page - 1),
            limit * page
          ),
          gross_profit_values: gross_profit_values.slice(
            limit * (page - 1),
            limit * page
          ),
          cost_of_goods_times: cost_of_goods_times.slice(
            limit * (page - 1),
            limit * page
          ),
          cost_of_goods_values: cost_of_goods_values.slice(
            limit * (page - 1),
            limit * page
          ),
          taxes_values: taxes_values.slice(limit * (page - 1), limit * page),
          taxes_times: taxes_times.slice(limit * (page - 1), limit * page),
          debt_times: debt_times.slice(limit * (page - 1), limit * page),
          debt_values: debt_values.slice(limit * (page - 1), limit * page),
          // net_sale_times: net_sale_times,
          // net_sale_values: net_sale_values,
          // refund_times: refund_times,
          // refund_values: refund_values,
          // discount_times: discount_times,
          // discount_values: discount_values,
          // gross_sale_times: gross_sale_times,
          // gross_sale_values: gross_sale_values,
          // gross_profit_times: gross_profit_times,
          // gross_profit_values: gross_profit_values,
          // cost_of_goods_times: cost_of_goods_times,
          // cost_of_goods_values: cost_of_goods_values,
          // taxes_values: taxes_values,
          // taxes_times: taxes_times
        },
        total: cnt,
      });
    } else {
      var times = return_dates(start_time, end_time, cnt);
      reply.ok({
        gross_sale: 0,
        refund: 0,
        discount: 0,
        debt: 0,
        service_value: 0,
        cost_of_goods: 0,
        net_sale: 0,
        gross_profit: 0,
        recepts: 0,
        line: {
          net_sale_times: times,
          net_sale_values: default_arr,
          refund_times: times,
          refund_values: default_arr,
          discount_times: times,
          discount_values: default_arr,
          gross_sale_times: times,
          gross_sale_values: default_arr,
          gross_profit_times: times,
          gross_profit_values: default_arr,
          debt_times: default_arr,
          debt_values: default_arr,
        },
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
          taxes_times: [],
          debt_times: [],
          debt_values: [],
        },
        total: 0,
      });
    }
    // }
  };

  function find_paid_debts(request, reply, items, admin) {
    var query = {
      organization: admin.organization,
      debt_id: {
        $ne: null,
      },
      date: {
        $gte: request.params.min,
        $lte: request.params.max,
      },
    };
    if (request.body) {
      // if(request.body.employees.length > 0) {
      //   query.service = {
      //     $in: request.body.employees
      //   }
      // }
      if (request.body.services) {
        if (request.body.services.length > 0) {
          query.service = {
            $in: request.body.services,
          };
        }
      }
      if (request.body.service != null && request.body.service != '') {
        query.service = request.body.service;
      }
    }
    instance.Receipts.find(query, (err, recepts) => {
      if (recepts == null) {
        recepts = [];
      }
      calculate_summary(request, reply, items, recepts);
    });
  }

  const summaryOptions = {
    version: '1.0.0',
    schema: {
      params: {
        type: 'object',
        required: ['min', 'max'],
        properties: {
          min: {
            type: 'number',
            minimum: 1,
          },
          max: {
            type: 'number',
            minimum: 1,
          },
          limit: {
            type: 'number',
            minimum: 1,
          },
          page: {
            type: 'number',
            minimum: 1,
          },
        },
      },
      body: {
        type: 'object',
        required: [
          'custom',
          'start',
          'end',
          'services',
          'employees',
          'count_type',
        ],
        properties: {
          custom: {
            type: 'boolean',
            default: false,
          },
          start: {
            type: 'number',
          },
          end: {
            type: 'number',
          },
          services: {
            type: 'array',
            default: [],
            items: {
              type: 'string',
              minLength: 24,
              maxLength: 24,
            },
          },
          employees: {
            type: 'array',
            default: [],
            items: {
              type: 'string',
              minLength: 24,
              maxLength: 24,
            },
          },
          count_type: {
            type: 'integer',
            enum: [1, 2, 3, 4, 5, 6],
          },
          target: {
            type: 'string',
            enum: [
              'gross_sales',
              'refunds',
              'discounts',
              'net_sales',
              'gross_profit',
            ],
          },
        },
      },
    },
  };

  const calculateReportSummary = async (request, reply, admin) => {
    try {
      const TIME_DIFF =
        typeof process.env.TIME_DIFF == typeof 5
          ? process.env.TIME_DIFF
          : +process.env.TIME_DIFF;

      const { min, max, limit, page } = request.params;
      const { custom, start, end, services, employees, count_type, target } =
        request.body;
      const user_available_services = request.user.services.map((serv) =>
        serv.service.toString()
      );
      const filterReceipts = {
        organization: admin.organization,
        receipt_state: {
          $ne: 'draft',
        },
        // service: { $in: user_available_services },
        debt_id: null,
        date: {
          // $gte: min - (TIME_DIFF | 0),
          // $lte: max - (TIME_DIFF | 0),
          $gte: min,
          $lte: max,
        },
      };

      if (services && services.length > 0) {
        for (const serv of services) {
          if (!user_available_services.includes(serv)) {
            return reply.error('Acces denied');
          }
        }
        // filter qilish krk return error Access
        filterReceipts.service = {
          $in: services,
        };
      }

      if (custom) {
        const additional_query = [];
        for (let i = min; i < max; i += 86400000) {
          additional_query.push({
            date: {
              $lte: i + end * 3600000,
              $gte: i + start * 3600000,
            },
          });
        }
        delete filterReceipts.date;
        filterReceipts['$or'] = additional_query;
      }

      if (employees && employees.length > 0) {
        const employeesFilter = [
          {
            $and: [
              {
                waiter_id: '',
              },
              {
                cashier_id: {
                  $in: employees,
                },
              },
            ],
          },
          {
            $and: [
              {
                cashier_id: '',
              },
              {
                waiter_id: {
                  $in: employees,
                },
              },
            ],
          },
          {
            $and: [
              {
                waiter_id: {
                  $ne: '',
                },
              },
              {
                cashier_id: {
                  $ne: '',
                },
              },
              {
                waiter_id: {
                  $in: employees,
                },
              },
            ],
          },
        ];
        if (filterReceipts['$or']) {
          filterReceipts['$and'] = [
            { $or: employeesFilter },
            { $or: filterReceipts['$or'] },
          ];
          delete filterReceipts['$or'];
        } else {
          filterReceipts['$or'] = employeesFilter;
        }
      }

      let dateDiffer = 24 * 60 * 60 * 1000;

      switch (count_type) {
        case 1: {
          dateDiffer = 60 * 60 * 1000;
          break;
        }
        case 2: {
          dateDiffer = 24 * 60 * 60 * 1000;
          break;
        }
        case 3: {
          dateDiffer = 7 * 24 * 60 * 60 * 1000;
          break;
        }
        case 4: {
          dateDiffer = 30 * 24 * 60 * 60 * 1000;
          break;
        }
        case 5: {
          dateDiffer = 4 * 30 * 24 * 60 * 60 * 1000;
          break;
        }
        case 6: {
          dateDiffer = 365 * 24 * 60 * 60 * 1000;
          break;
        }
      }

      const sortByDate = {
        $sort: {
          date: 1,
        },
      };

      const projectReport = {
        $project: {
          count_type: {
            $floor: {
              $divide: [{ $max: [0, { $add: ['$date', 18000000] }] }, dateDiffer],
            },
          },
          date: {
            $multiply: [
              {
                $floor: {
                  $divide: [{ $max: [0, { $add: ['$date', 18000000] }] }, dateDiffer],
                },
              },
              dateDiffer,
            ],
          },
          is_refund: 1,
          total_discount: 1,
          total_price: 1,
          cost_of_goods: {
            $reduce: {
              input: '$sold_item_list',
              initialValue: 0,
              in: {
                $add: [
                  '$$value',
                  {
                    $multiply: [
                      { $max: [0, '$$this.value'] },
                      { $max: [0, '$$this.cost'] },
                    ],
                  },
                ],
              },
            },
          },
          cash_back: 1,
        },
      };

      const groupByDate = {
        $group: {
          _id: '$count_type',
          cash_backs: { $sum: '$cash_back' },
          date: {
            $first: '$date',
          },
          cost_of_goods: {
            $sum: {
              $multiply: [
                '$cost_of_goods',
                {
                  $cond: ['$is_refund', -1, 1],
                },
              ],
            },
            // "$cost_of_goods"
          },
          discounts: {
            $sum: {
              $multiply: [
                {
                  $cond: ['$is_refund', -1, 1],
                },
                {
                  $max: ['$total_discount', 0],
                },
              ],
            },
          },
          gross_sales: {
            $sum: {
              $cond: [
                '$is_refund',
                0,
                {
                  $add: [
                    {
                      $max: [0, '$total_price'],
                    },
                    {
                      $max: [0, '$total_discount'],
                    },
                  ],
                },
              ],
            },
          },
          refunds: {
            $sum: {
              $cond: [
                '$is_refund',
                {
                  $add: [
                    {
                      $max: [0, '$total_price'],
                    },
                    {
                      $max: [0, '$total_discount'],
                    },
                  ],
                },
                0,
              ],
            },
          },
        },
      };

      const sortById = {
        $sort: {
          _id: 1,
        },
      };

      const groupTotalReport = {
        $group: {
          _id: null,
          cash_backs: { $sum: '$cash_back' },
          cost_of_goods: {
            $sum: '$cost_of_goods',
          },
          discounts: {
            $sum: '$discounts',
          },
          gross_sales: {
            $sum: '$gross_sales',
          },
          refunds: {
            $sum: '$refunds',
          },
          net_sales: {
            $sum: {
              $subtract: ['$gross_sales', { $add: ['$discounts', '$refunds'] }],
            },
          },
          gross_profit: {
            $sum: {
              $subtract: [
                {
                  $subtract: [
                    '$gross_sales',
                    { $add: ['$discounts', '$refunds'] },
                  ],
                },
                '$cost_of_goods',
              ],
            },
          },
          data: {
            $push: {
              date: {
                $multiply: ['$_id', dateDiffer],
              },
              gross_sales: '$gross_sales',
              discounts: '$discounts',
              refunds: '$refunds',
              net_sales: {
                $subtract: [
                  '$gross_sales',
                  { $add: ['$discounts', '$refunds'] },
                ],
              },
              gross_profit: {
                $subtract: [
                  {
                    $subtract: [
                      '$gross_sales',
                      { $add: ['$discounts', '$refunds'] },
                    ],
                  },
                  '$cost_of_goods',
                ],
              },
            },
          },
        },
      };

      if (!limit) {
        const result = await instance.Receipts.aggregate([
          {
            $match: filterReceipts,
          },
          sortByDate,
          projectReport,
          groupByDate,
          sortById,
          groupTotalReport,
        ])
          .allowDiskUse(true)
          .exec();

        if (!result || result.length == 0 || !(result instanceof Array)) {
          return reply.ok({
            cost_of_goods: 0,
            discounts: 0,
            gross_profit: 0,
            gross_sales: 0,
            net_sales: 0,
            refunds: 0,
            data: [[min, 0]],
          });
        }

        const data = [];
        let lastDate = Math.floor(min / dateDiffer) * dateDiffer;
        let lastDateTail = Math.floor(min / dateDiffer) * dateDiffer;
        let lastMax = Math.floor(min / dateDiffer) * dateDiffer;
        const existTime = {};
        for (const r of result[0].data) {
          for (let i = lastDate; i < r.date; i += dateDiffer) {
            if (!existTime[i]) {
              if (min <= i || i <= max)
                data.push([i, 0]);
              lastDateTail = i;
              existTime[i] = true;
            }
          }
          lastDate = lastDateTail;
          lastMax = r.date;
          existTime[r.date] = true;
          if (min <= r.date || r.date <= max)
            data.push([r.date, r[target]]);
        }

        // for (let i = lastMax; i < max - TIME_DIFF; i += dateDiffer) {
        for (let i = lastMax; i <= max; i += dateDiffer) {
          if (!existTime[i]) {
            data.push([i, 0]);
            existTime[i] = true;
          }
        }

        result[0].data = data;
        return reply.ok(result[0]);
      } else {
        const countTotalReport = {
          $group: {
            _id: null,
            count: {
              $sum: 1,
            },
          },
        };

        const totalReport = await instance.Receipts.aggregate([
          {
            $match: filterReceipts,
          },
          projectReport,
          groupByDate,
          countTotalReport,
        ])
          .allowDiskUse(true)
          .exec();

        const totalResult =
          totalReport && totalReport.length && totalReport[0].count
            ? totalReport[0].count
            : 1;
        const skipResult = {
          $skip: limit * (page - 1),
        };
        const limitResult = {
          $limit: limit,
        };

        const netSalesAndProfit = {
          $project: {
            gross_sales: 1,
            cost_of_goods: 1,
            refunds: 1,
            discounts: 1,
            date: 1,
            net_sales: {
              $subtract: [
                {
                  $max: [0, '$gross_sales'],
                },
                {
                  $add: [
                    {
                      $max: [0, '$refunds'],
                    },
                    {
                      $max: [0, '$discounts'],
                    },
                  ],
                },
              ],
            },
            gross_profit: {
              $subtract: [
                {
                  $subtract: [
                    {
                      $max: [0, '$gross_sales'],
                    },
                    {
                      $add: [
                        {
                          $max: [0, '$refunds'],
                        },
                        {
                          $max: [0, '$discounts'],
                        },
                      ],
                    },
                  ],
                },
                {
                  $max: [0, '$cost_of_goods'],
                },
              ],
            },
          },
        };

        const result = await instance.Receipts.aggregate([
          {
            $match: filterReceipts,
          },
          sortByDate,
          projectReport,
          groupByDate,
          sortById,
          skipResult,
          limitResult,
          netSalesAndProfit,
        ])
          .allowDiskUse(true)
          .exec();
        result.filter(res => res.date >= min && res.date <= max)
        reply.ok({
          total: totalResult,
          page: Math.ceil(totalResult / limit),
          data: result,
        });
      }
      // instance.get_receipt_by_range(request, reply, admin, find_paid_debts)
    } catch (error) {
      reply.error(error.message);
    }
  };

  instance.post(
    '/reports/summary/:min/:max',
    summaryOptions,
    (request, reply) => {
      instance.oauth_admin(request, reply, (admin) => {
        if (!admin) {
          return reply.error('Access');
        }
        calculateReportSummary(request, reply, admin);
        // instance.get_receipt_by_range(request, reply, admin, find_paid_debts)
      });
    }
  );

  instance.post(
    '/reports/summary/:min/:max/:limit/:page',
    summaryOptions,
    (request, reply) => {
      instance.oauth_admin(request, reply, (admin) => {
        if (!admin) {
          return reply.error('Access');
        }
        calculateReportSummary(request, reply, admin);
        // if(admin){
        //   instance.get_receipt_by_range(request, reply, admin, find_paid_debts)
        // }
      });
    }
  );

  // for boss application

  instance.post(
    '/reports/:min/:max',
    {
      version: '1.0.0',
    },
    (request, reply) => {
      instance.oauth_admin(request, reply, (user) => {
        instance.get_receipt_by_range(request, reply, user, find_paid_debts);
      });
    }
  );

  next();
};
