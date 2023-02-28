module.exports = (instance, _, next) => {
  var version = { version: '1.0.0' }

  const params = {
    version: '1.0.0',
    schema: {
      params: {
        type: 'object',
        required: [
          'min', 'max',
          'limit', 'page'
        ],
        properties: {
          min: {
            type: 'number',
            minimum: 1
          },
          max: {
            type: 'number',
            minimum: 1
          },
          limit: {
            type: 'number',
            minimum: 1
          },
          page: {
            type: 'number',
            minimum: 1
          }
        }
      },
      body: {
        type: 'object',
        required: [
          'custom', 'start', 'end',
          'services', 'employees'
        ],
        properties: {
          custom: {
            type: 'boolean',
            default: false
          },
          start: {
            type: 'number'
          },
          end: {
            type: 'number'
          },
          services: {
            type: 'array',
            default: [],
            items: {
              type: 'string',
              minLength: 24,
              maxLength: 24
            }
          },
          employees: {
            type: 'array',
            default: [],
            items: {
              type: 'string',
              minLength: 24,
              maxLength: 24
            }
          }
        }
      }
    }
  }

  // reports sales by employee

  const by_employee = async (request, reply, admin) => {
    const { min, max, limit, page } = request.params;
    const { custom, start, end, services, employees } = request.body;

    const user_available_services = request.user.services.map(serv => serv.service.toString())

    const filterReceipts = {
      organization: admin.organization,
      receipt_state: {
        $ne: 'draft'
      },
      service: { $in: user_available_services },
      debt_id: null,
      date: {
        // $gte: min - (process.env.TIME_DIFF | 0),
        // $lte: max - (process.env.TIME_DIFF | 0),
        $gte: min,
        $lte: max,
      }
    }

    if (services && services.length > 0) {
      for (const service of services) {
        if (!user_available_services.includes(service)) {
          return reply.error('Access denied!')
        }
      }

      filterReceipts.service = {
        $in: services
      }
    }

    if (custom) {
      const additional_query = []
      for (let i = min; i < max; i += 86400000) {
        additional_query.push({
          date: {
            // $lte: i + end * 3600000 - (process.env.TIME_DIFF | 0),
            // $gte: i + start * 3600000 - (process.env.TIME_DIFF | 0),
            $lte: i + end * 3600000,
            $gte: i + start * 3600000,
          }
        })
      }
      delete filterReceipts.date
      filterReceipts['$or'] = additional_query
    }

    if (employees && employees.length > 0) {
      const employeesFilter = [
        {
          $and: [
            {
              waiter_id: ""
            },
            {
              cashier_id: {
                $in: employees
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
                $in: employees
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
                $in: employees
              }
            }
          ]
        }
      ]
      if (filterReceipts['$or']) {
        filterReceipts['$and'] = [
          { $or: employeesFilter },
          { $or: filterReceipts['$or'] }
        ]
        delete filterReceipts['$or']
      }
      else {
        filterReceipts['$or'] = employeesFilter
      }
    }

    const groupCashier = {
      $group: {
        _id: '$cashier_id'
      }
    }

    const countCashier = {
      $group: {
        _id: null,
        count: {
          $sum: 1
        }
      }
    }

    const calculateEmployeeReport = {
      $group: {
        _id: '$cashier_id',
        name: {
          $last: '$cashier_name'
        },
        receipts: {
          $sum: 1
        },
        gross_sales: {
          $sum: {
            $cond: [{ $eq: ["$is_refund", false] },
            {
              $add: [
                "$total_price",
                {
                  $max: [
                    "$total_discount",
                    0
                  ]
                }
              ]
            },
              0]
          }
        },
        refunds: {
          $sum: {
            $cond: [{ $eq: ["$is_refund", true] }, {
              $add: [
                "$total_price",
                {
                  $max: [
                    "$total_discount",
                    0
                  ]
                }
              ]
            }, 0]
          }
        },
        discount: {
          $sum: {
            $cond: [{ $eq: ["$is_refund", false] }, { $max: ["$total_discount", 0] }, { $multiply: [{ $max: ["$total_discount", 0] }, -1] }]
          }
        },
        net_sales: {
          $sum: {
            $multiply: [
              {
                $cond: [
                  {
                    $eq: ["$is_refund", false]
                  },
                  1,
                  -1
                ]
              },
              {
                $subtract: [
                  {
                    $add: [
                      { $max: ["$total_price", 0] },
                      {
                        $max: [
                          "$total_discount",
                          0
                        ]
                      }
                    ]
                  },
                  { $max: ["$total_discount", 0] }
                ]
              }
            ]
          }
        }
      }
    }

    const sortResult = {
      $sort: {
        net_sales: -1
      }
    };

    const skipResult = {
      $skip: (page - 1) * limit
    };

    const limitResult = {
      $limit: limit
    }

    const calculateAverage = {
      $project: {
        name: 1,
        receipts: 1,
        gross_sales: 1,
        refunds: 1,
        discount: 1,
        net_sales: 1,
        average_sale: {
          $divide: [
            '$net_sales',
            '$receipts'
          ]
        }
      }
    }


    const total = await instance.Receipts.aggregate([
      {
        $match: filterReceipts
      },
      groupCashier,
      countCashier
    ])

    const total_cashiers = total && total.length > 0 && total[0].count ? total[0].count : 0

    const result = await instance.Receipts.aggregate([
      {
        $match: filterReceipts
      },
      calculateEmployeeReport,
      sortResult,
      skipResult,
      limitResult,
      calculateAverage
    ])
      .allowDiskUse(true)
      .exec();

    reply.ok({
      total: total_cashiers,
      page: Math.ceil(total_cashiers / limit),
      data: result
    })

    /*
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
    instance.User.find({
    _id: {
      $in: ids
    }}, (err, employees) => {
      if(err || employees == null) {
        employees = []
      }
      for(var e of employees) {
        names[e._id] = e.name
      }
      var Answer = []
      if(request.params.name != undefined) {
        Answer = [[
          'name',
          'gross_sales',
          'receipts',
          'net_sales',
          'discount',
          'refunds',
          'average_sale'
        ]]
      }
      for (var id of ids) {
        if (id != '12345') {
          if(request.params.name == undefined){
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
          else {
            Answer.push([
              names[id],
              gssales[id],
              count_receipts[id],
              (gssales[id] - refunds[id] - discounts[id]),
              discounts[id],
              refunds[id],
              count_receipts[id] != 0 ? (gssales[id] - refunds[id] - discounts[id]) / count_receipts[id] : 0
            ])
          }
        }
      }
      var total = Answer.length
      if(request.params.name == undefined) {
        reply.ok({
          total: total,
          page: Math.ceil(total/request.params.limit),
          data: Answer.splice(request.params.limit * (request.params.page - 1), request.params.limit)
        })
      }
      else {
        instance.send_csv(Answer, 'by_employee', reply)
      }
    })
    */
  }


  instance.post('/reports/sales/by_employee/:min/:max/:limit/:page', params, (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      if (!admin) {
        return reply.error('Access!')
      }
      by_employee(request, reply, admin)
      // instance.get_receipt_by_range(request, reply, admin, by_employee)
    })
  })

  next()
}