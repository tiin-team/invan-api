module.exports = (instance, options, next) => {

  var calculate_abc = (request, reply, goods, receipts, admin) => {
    var sold_itemObj = {}
    var gross_sales_total = 0;
    var items_sold_total = 0;
    var net_sales_total = 0;
    var gross_profit_total = 0;
    var ids = []
    for (var g of goods) {
      ids.push(g._id)
      sold_itemObj[g._id] = {
        name: g.name,
        items_sold: 0,
        gross_sales: 0,
        net_sales: 0,
        gross_profit: 0
      }
    }
    for (var r of receipts) {
      var gift_persent = 0
      for (var p of r.payment) {
        if (p.name == 'gift') {
          gift_persent += p.value
        }
      }
      gift_persent = (gift_persent / r.total_price) * 100
      r.total_price -= r.total_price * gift_persent / 100
      r.discount.push({
        name: 'Gift',
        type: 'percentage',
        value: gift_persent
      })
      for (var s of r.sold_item_list) {
        if (sold_itemObj[s.product_id] == undefined) {
          ids.push(s.product_id)
          sold_itemObj[s.product_id] = {
            name: s.product_name,
            items_sold: 0,
            gross_sales: 0,
            net_sales: 0,
            gross_profit: 0
          }
        }
        var gross_sales = s.value * s.price
        var discount = 0
        for (var d of r.discount) {
          if (d.type == 'percentage') {
            discount += gross_sales * d.value / 100
            gross_sales -= gross_sales * d.value / 100
          }
        }
        var net_sales = gross_sales - discount
        var cost_of_good = s.cost * s.value
        var items_sold = s.value
        var gross_profit = net_sales - cost_of_good
        var k = 1
        if (r.is_refund) {
          k = -1
        }
        gross_sales *= k
        net_sales *= k
        gross_profit *= k
        items_sold *= k
        sold_itemObj[s.product_id].gross_sales += gross_sales
        sold_itemObj[s.product_id].items_sold += items_sold
        sold_itemObj[s.product_id].net_sales += net_sales
        sold_itemObj[s.product_id].gross_profit += gross_profit
        gross_sales_total += gross_sales
        net_sales_total += net_sales
        gross_profit_total += gross_profit
        items_sold_total += items_sold
      }
    }
    var items = []
    for (var id of ids) {
      items.push(sold_itemObj[id])
    }
    items.sort((a, b) => (a.net_sales >= b.net_sales) ? 1 : (b.net_sales > a.net_sales) ? -1 : 0)
    // items.sort((a, b) => (a.gross_profit >= b.gross_profit) ? 1 : (b.gross_profit > a.gross_profit) ? -1 : 0)
    var gross_profit_analysis = 0
    for (let i = 0; i < items.length; i++) {
      gross_profit_analysis += items[i].gross_profit
      if ((gross_profit_analysis / gross_profit_total).toFixed(1) >= 0.6) {
        items[i].gross_profit_analysis = 'A'
      }
      else if ((gross_profit_analysis / gross_profit_total).toFixed(1) >= 0.1) {
        items[i].gross_profit_analysis = 'B'
      }
      else {
        items[i].gross_profit_analysis = 'C'
      }
    }
    // items.sort((a, b) => (a.net_sales >= b.net_sales) ? 1 : (b.net_sales > a.net_sales) ? -1 : 0)
    var net_sales_analysis = 0
    for (let i = 0; i < items.length; i++) {
      net_sales_analysis += items[i].net_sales
      if ((net_sales_analysis / net_sales_total).toFixed(1) >= 0.6) {
        items[i].net_sales_analysis = 'A'
      }
      else if ((net_sales_analysis / net_sales_total).toFixed(1) >= 0.1) {
        items[i].net_sales_analysis = 'B'
      }
      else {
        items[i].net_sales_analysis = 'C'
      }
    }
    // items.sort((a, b) => (a.gross_sales >= b.gross_sales) ? 1 : (b.gross_sales > a.gross_sales) ? -1 : 0)
    var gross_sales_analysis = 0
    for (let i = 0; i < items.length; i++) {
      gross_sales_analysis += items[i].items_sold
      if ((gross_sales_analysis / items_sold_total).toFixed(1) >= 0.6) {
        items[i].gross_sales_analysis = 'A'
      }
      else if ((gross_sales_analysis / items_sold_total).toFixed(1) >= 0.1) {
        items[i].gross_sales_analysis = 'B'
      }
      else {
        items[i].gross_sales_analysis = 'C'
      }
    }

    // items.sort((a, b) => (a.gross_profit <= b.gross_profit) ? 1 : (b.gross_profit < a.gross_profit) ? -1 : 0)
    items.sort((a, b) => (a.gross_sales <= b.gross_sales) ? 1 : (b.gross_sales < a.gross_sales) ? -1 : 0)
    items.sort((a, b) => (a.net_sales <= b.net_sales) ? 1 : (b.net_sales < a.net_sales) ? -1 : 0)

    var gross_profit_analysis = 0
    for (let i = 0; i < items.length; i++) {
      gross_profit_analysis += items[i].gross_profit
      if ((gross_profit_analysis / gross_profit_total) <= 0.8) {
        items[i].gross_profit_analysis = 'A'
      }
      else if (i != 0 && (gross_profit_analysis / gross_profit_total).toFixed(1) >= 0.8) {
        items[i].gross_profit_analysis = 'B'
        break;
      }
      else {
        break;
      }
    }
    // items.sort((a, b) => (a.net_sales >= b.net_sales) ? 1 : (b.net_sales > a.net_sales) ? -1 : 0)
    var net_sales_analysis = 0
    for (let i = 0; i < items.length; i++) {
      net_sales_analysis += items[i].net_sales
      if ((net_sales_analysis / net_sales_total) <= 0.8) {
        items[i].net_sales_analysis = 'A'
      }
      else if (i != 0 && (net_sales_analysis / net_sales_total).toFixed(1) >= 0.8) {
        items[i].net_sales_analysis = 'B'
        break;
      }
      else {
        break;
      }
    }
    // items.sort((a, b) => (a.gross_sales >= b.gross_sales) ? 1 : (b.gross_sales > a.gross_sales) ? -1 : 0)
    var gross_sales_analysis = 0
    for (let i = 0; i < items.length; i++) {
      gross_sales_analysis += items[i].items_sold
      if ((gross_sales_analysis / items_sold_total) <= 0.8) {
        items[i].gross_sales_analysis = 'A'
      }
      else if (i != 0 && (gross_sales_analysis / items_sold_total).toFixed(1) >= 0.8) {
        items[i].gross_sales_analysis = 'B'
        break;
      }
      else {
        break;
      }
    }

    reply.ok(items)
  }

  var get_receipts_calculate = (request, reply, goods, admin) => {
    var min = parseInt(request.params.min)
    var max = parseInt(request.params.max)
    var query = {
      organization: admin.organization,
      debt_id: null,
      date: {
        $lte: max,
        $gte: min
      }
    }
    if (request.body.service) {
      query.service = request.body.service
    }
    if (request.body.employees) {
      if (request.body.employees.length > 0) {
        var employee_ids = request.body.employees
        query['$or'] = [
          {
            $and: [
              {
                waiter_id: ""
              },
              {
                cashier_id: {
                  $in: employee_ids
                }
              }
            ]
          },
          {
            $and: [
              {
                cashier_id: ""
              },
              {
                waiter_id: {
                  $in: employee_ids
                }
              }
            ]
          },
          {
            $and: [
              {
                waiter_id: {
                  $ne: ""
                }
              },
              {
                cashier_id: {
                  $ne: ""
                }
              },
              {
                waiter_id: {
                  $in: employee_ids
                }
              }
            ]
          }
        ]
      }
    }
    instance.Receipts.find(query, (err, receipts) => {
      if (err) {
        reply.error('Error on finding receipts')
        instance.send_Error('ABC receipts', JSON.stringify(err))
      }
      else {
        if (receipts == null) {
          receipts = []
        }
        calculate_abc(request, reply, goods, receipts, admin)
      }
    })
  }

  var get_goods_calculate = (request, reply, admin) => {
    var query = {
      organization: admin.organization
    }
    if (request.body) {
      if (request.body.categories) {
        if (request.body.categories.length > 0) {
          query.category = {
            $in: request.body.categories
          }
        }
      }
    }
    instance.goodsSales.find(query, (err, goods) => {
      if (err) {
        reply.error('Error on finding goods')
        instance.send_Error('ABC', JSON.stringify(err))
      }
      else {
        if (goods == null) {
          goods = []
        }
        get_receipts_calculate(request, reply, goods, admin)
      }
    }).limit(50)
  }

  instance.post('/report/abc/:min/:max', options.version, (request, reply) => {
    return reply.ok([])
    instance.oauth_admin(request, reply, (admin) => {
      get_goods_calculate(request, reply, admin)
    })
  })

  const bodySchema = {
    schema: {
      body: {
        type: 'object',
        properties: {
          limit: { type: 'integer', minimum: 1 },
          page: { type: 'integer', minimum: 1 },
          startDate: { type: 'integer', minimum: 1 },
          endDate: { type: 'integer', minimum: 1 },
          employee: { type: 'string' },
          service: { type: 'string' }
        },
        required: ['limit', 'page', 'startDate', 'endDate', 'employee', 'service']
      }
    }
  }

  instance.post(
    '/report/abc',
    {
      ...options.version,
      ...bodySchema,
      preHandler: instance.authorize_admin
    },
    async (request, reply) => {

      return reply.ok([])

      const user = request.user
      const { limit, page, startDate, endDate, service, employee } = request.body;

      const filterReceipts = {
        $match: {
          organization: user.organization,
          date: {
            $gte: startDate,
            $lte: endDate
          }
        }
      }
      if (typeof service == typeof 'invan' && service.length > 0) {
        filterReceipts['$match']['service'] = { $eq: service }
      }
      if (typeof employee == typeof 'invan' && employee.length > 0) {
        filterReceipts['$match']['cashier_id'] = { $eq: employee }
      }

      const unwindSOldItems = {
        $unwind: {
          path: '$sold_item_list'
        }
      }

      const calculateSalesOfItems = {
        $group: {
          _id: '$sold_item_list.product_id',
          name: {
            $first: '$sold_item_list.product_name'
          },
          items_sold: {
            $sum: {
              $multiply: [
                {
                  $max: ['$sold_item_list.value', 0]
                },
                {
                  $cond: [
                    '$is_refund',
                    -1,
                    1
                  ]
                }
              ]
            }
          },
          gross_sales: {
            $sum: {
              $multiply: [
                {
                  $max: ['$sold_item_list.price', 0]
                },
                {
                  $max: ['$sold_item_list.value', 0]
                },
                {
                  $cond: [
                    '$is_refund',
                    -1,
                    1
                  ]
                }
              ]
            }
          },
          discount: {
            $sum: {
              $reduce: {
                input: "$sold_item_list.discount",
                initialValue: {
                  total_percent: 0,
                  total_amount: 0
                },
                in: {
                  $cond: [
                    {
                      $eq: ['$$this.type', 'sum'],
                    },
                    {

                    },
                    {
                      $multiply: [
                        
                      ]
                    }
                  ],
                  "$add": [
                    {
                      $max: ["$$value", 0]
                    },
                    {
                      $max: [
                        {
                          $cond: [
                            {
                              $eq: ['$$this.type', 'sum']
                            },
                            '$$this.value',
                            {
                              $multiply: [
                                {
                                  $max: ['$sold_item_list.price', 0]
                                },
                                {
                                  $max: ['$sold_item_list.value', 0]
                                },
                                { $divide: ['$$this.value', 100] },
                                {
                                  $cond: [
                                    '$is_refund',
                                    -1,
                                    1
                                  ]
                                }
                              ]
                            }
                          ]
                        },
                        0
                      ]
                    }
                  ]
                }
              }
            }
          },
          gross_profit: {
            $sum: {
              $multiply: [
                {
                  $subtract: [
                    {
                      $multiply: [
                        {
                          $max: ['$sold_item_list.price', 0]
                        },
                        {
                          $max: ['$sold_item_list.value', 0]
                        }
                      ]
                    },
                    {
                      $multiply: [
                        {
                          $max: ['$sold_item_list.cost', 0]
                        },
                        {
                          $max: ['$sold_item_list.value', 0]
                        }
                      ]
                    }
                  ]
                },
                {
                  $cond: [
                    '$is_refund',
                    -1,
                    1
                  ]
                }
              ]
            }
          }
        }
      }

      const skips = {
        $skip: limit * (page - 1)
      }

      const limits = {
        $limit: limit
      }

      const sortByDate = {
        $sort: {
          date: -1
        }
      }

      const receipts = await instance.Receipts.find(filterReceipts[`$match`]).sort({ _id: -1 })
      
      // for (const r of receipts) {
      //   for (const s of r.sold_item_list) {
      //     console.log(s)
      //   }
      // }
      // console.log(receipts[0].sold_item_list[0])

      const items = await instance.Receipts.aggregate([
        filterReceipts,
        unwindSOldItems,
        calculateSalesOfItems,
        skips,
        limits,
        sortByDate
      ])

      reply.ok(items)
      return reply;
    }
  )

  next()
}
