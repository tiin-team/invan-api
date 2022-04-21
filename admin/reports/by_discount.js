module.exports = (instance, _, next) => {

  var version = { version: '1.0.0' }

  // reports by discounts

  const params = {
    version: '1.0.0',
    schema: {
      params: {
        type: 'object',
        required: [
          'min', 'max', 'limit', 'page'
        ],
        properties: {
          min: { type: 'number', minimum: 1 },
          max: { type: 'number', minimum: 1 },
          limit: { type: 'number', minimum: 1 },
          page: { type: 'number', minimum: 1 },
        }
      },
      body: {
        type: 'object',
        required: [
          'custom', 'employees',
          'end', 'services', 'start'
        ],
        properties: {
          custom: { type: 'boolean' },
          start: { type: 'number' },
          end: { type: 'number' },
          employees: {
            type: 'array',
            items: {
              type: 'string',
              minLength: 24,
              maxLength: 24
            }
          },
          services: {
            type: 'array',
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

  const by_discount = async (request, reply, admin) => {

    const { min, max, limit, page } = request.params;
    const { custom, start, end, services, employees } = request.body;

    const filterReceipts = {
      organization: admin.organization,
      debt_id: null,
      receipt_state: {
        $ne: 'draft'
      },
      date: {
        // $gte: min - (process.env.TIME_DIFF | 0),
        // $lte: max - (process.env.TIME_DIFF | 0),
        $gte: min,
        $lte: max,
      }
    }

    if (services && services.length > 0) {
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

    const unwindSoldItemList = {
      $unwind: '$sold_item_list'
    }

    const unwindItemDiscounts = {
      $unwind: '$sold_item_list.discount'
    }

    const calculateDiscount = {
      $group: {
        _id: "$sold_item_list.discount._id",
        name: {
          $last: "$sold_item_list.discount.name"
        },
        applied: {
          $sum: {
            $cond: [
              { $gt: ["$sold_item_list.discount.value", 0] },
              1,
              0
            ]
          }
        },
        amount: {
          $sum: {
            $multiply: [
              {
                $max: [
                  "$sold_item_list.discount.total_value", 0
                ]
              },
              {
                $cond: [
                  '$is_refund',
                  -1, 1
                ]
              }
            ]

            // $cond: [
            //   {
            //     $eq: ["$sold_item_list.discount.type", 'sum']
            //   },
            //   {
            //     $max: [
            //       "$sold_item_list.discount.total_value",
            //       {
            //         $multiply: ["$sold_item_list.discount.value", "$sold_item_list.value"]
            //       },
            //       "$sold_item_list.discount.total",
            //       0
            //     ]
            //   },
            //   {
            //     $max: [
            //       "$sold_item_list.discount.total_value", 0
            //     ]
            //     // $cond: [
            //     //   // {
            //     //   //   $gt: [
            //     //   //     "$sold_item_list.discount.total_value", 0
            //     //   //   ],
            //     //   // },
            //     //   "$sold_item_list.discount.total_value",
            //     //   // {
            //     //   //   $max: [
            //     //   //     "$sold_item_list.discount.total_value",
            //     //   //     "$sold_item_list.discount.total",
            //     //   //     0
            //     //   //   ]
            //     //   // }
            //     // ]
            //   }
            // ]
          }
        }
      }
    }

    const sortResult = {
      $sort: {
        total_value: -1
      }
    }

    const skipResult = {
      $skip: limit * (page - 1)
    }

    const limitResult = {
      $limit: limit
    }

    let time = new Date().getTime()
    const result = await instance.Receipts.aggregate([
      {
        $match: filterReceipts
      },
      unwindSoldItemList,
      unwindItemDiscounts,
      calculateDiscount,
      sortResult,
      skipResult,
      limitResult
    ])
      .allowDiskUse(true)
      .exec();

    time = new Date().getTime()
    const groupDiscounts = {
      $group: {
        _id: "$sold_item_list.discount._id"
      }
    }

    const countDiscounts = {
      $group: {
        _id: null,
        count: {
          $sum: 1
        }
      }
    }

    const totalDiscount = await instance.Receipts.aggregate([
      {
        $match: filterReceipts
      },
      unwindSoldItemList,
      unwindItemDiscounts,
      groupDiscounts,
      countDiscounts
    ])
      .allowDiskUse(true)
      .exec();

    const total_discounts = totalDiscount && totalDiscount.length > 0 && totalDiscount[0].count ? totalDiscount[0].count : 0;

    reply.ok({
      total: total_discounts,
      page: Math.ceil(total_discounts / limit),
      data: result
    })
    /*
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
              apply = 0
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
        if (request.params.name == undefined) {
          var total = discounts.length
          discounts = discounts.splice(request.params.limit * (request.params.page - 1), request.params.limit)
          reply.ok({
            total: total,
            page: Math.ceil(total / request.params.limit),
            data: discounts
          })
        }
        else {
          var answer = [[
            'name',
            'applied',
            'amount'
          ]]
          for (var d of discounts) {
            answer.push([
              d.name,
              d.applied,
              d.amount
            ])
          }
          instance.send_csv(answer, 'by_discount', reply)
        }
    */
  }

  instance.post('/reports/by_discount/:min/:max/:limit/:page', params, (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      if (!admin) {
        return reply.error('Access')
      }
      by_discount(request, reply, admin)
      // if (admin) { instance.get_receipt_by_range(request, reply, admin, by_discount) }
    })
  })

  // instance.get('/reports/sales/by_discount/:token/:services/:employees/:custom/:start/:end/:min/:max/:name', (request, reply) => {
  //   instance.make_beauty_for_export(request, reply, () => {
  //     instance.oauth_admin(request, reply, (admin) => {
  //       if(admin){
  //         instance.get_receipt_by_range(request, reply, admin, by_discount)
  //       }
  //     })
  //   })
  // })

  next()
}
