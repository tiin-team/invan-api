module.exports = (instance, _, next) => {

  // reports sales by supplier

  const supplierParams = {
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
          },
          search: {
            type: 'string',
            default: ''
          }
        }
      }
    }
  }

  const by_supplier_report = async (request, reply, admin) => {
    const { min, max, limit, page } = request.params;
    const { custom, start, end, services, employees, search } = request.body;

    const user_available_services = request.user.services.map(serv => serv.service.toString())

    const filterReceipts = {
      organization: admin.organization,
      receipt_state: {
        $ne: 'draft'
      },
      debt_id: null,
      service: { $in: user_available_services },
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
          return reply.error('Acces denied')
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

    const unwindSoldItemList = {
      $unwind: "$sold_item_list"
    }

    const calculateItemsReport = {
      $group: {
        _id: "$sold_item_list.supplier_id",
        supplier_name: {
          $last: "$sold_item_list.supplier_name"
        },
        cost_of_goods: {
          $sum: {
            $multiply: [
              { $max: ["$sold_item_list.cost", 0] },
              { $max: ["$sold_item_list.value", 0] },
              {
                $cond: [
                  "$is_refund",
                  -1, 1
                ]
              }
            ]
          }
        },
        gross_sales: {
          $sum: {
            $multiply: [
              { $max: ["$sold_item_list.price", 0] },
              { $max: ["$sold_item_list.value", 0] },
              {
                $cond: [
                  "$is_refund",
                  0, 1
                ]
              }
            ]
          }
        },
        refunds: {
          $sum: {
            $multiply: [
              { $max: ["$sold_item_list.price", 0] },
              { $max: ["$sold_item_list.value", 0] },
              {
                $cond: [
                  "$is_refund",
                  1, 0
                ]
              }
            ]
          }
        },
        discounts: {
          $sum: {
            $multiply: [
              {
                $max: [
                  "$sold_item_list.total_discount",
                  0
                ]
              },
              {
                $cond: [
                  "$is_refund",
                  -1, 1
                ]
              }
            ]
          }
        },
        items_sold: {
          $sum: {
            $cond: [
              "$is_refund",
              0,
              { $max: ["$sold_item_list.value", 0] }
            ]
          }
        },
        items_refunded: {
          $sum: {
            $cond: [
              "$is_refund",
              { $max: ["$sold_item_list.value", 0] },
              0
            ]
          }
        },
        taxes: { $sum: 0 }
      }
    }

    const searchByItemName = {
      $match: {
        supplier_name: {
          $regex: (search ? search : ''),
          $options: 'i'
        }
      }
    }

    const sortResult = {
      $sort: {
        gross_sales: -1
      }
    }

    const skipResult = {
      $skip: limit * (page - 1)
    }

    const limitResult = {
      $limit: limit
    }

    const projectResult = {
      $project: {
        id: "$_id",
        supplier_name: "$supplier_name",
        cost_of_goods: 1,
        gross_sales: 1,
        refunds: 1,
        discounts: 1,
        items_sold: 1,
        items_refunded: 1,
        taxes: 1,
        net_sales: {
          $subtract: [
            "$gross_sales",
            {
              $add: ["$refunds", "$discounts"]
            }
          ]
        },
        gross_profit: {
          $subtract: [
            {
              $subtract: [
                "$gross_sales",
                {
                  $add: ["$refunds", "$discounts"]
                }
              ]
            },
            "$cost_of_goods"
          ]
        }
      }
    }

    const result = await instance.Receipts.aggregate([
      {
        $match: filterReceipts
      },
      unwindSoldItemList,
      calculateItemsReport,
      searchByItemName,
      sortResult,
      skipResult,
      limitResult,
      projectResult
    ])
      .allowDiskUse(true)
      .exec();

    const groupSoldItems = {
      $group: {
        _id: "$sold_item_list.supplier_id",
        supplier_name: {
          $last: "$sold_item_list.supplier_name"
        }
      }
    }

    const countAllItems = {
      $group: {
        _id: null,
        count: {
          $sum: 1
        }
      }
    }

    const totalCount = await instance.Receipts.aggregate([
      {
        $match: filterReceipts
      },
      unwindSoldItemList,
      groupSoldItems,
      searchByItemName,
      countAllItems
    ])
      .allowDiskUse(true)
      .exec();

    const total_result = totalCount && totalCount.length > 0 && totalCount[0].count ? totalCount[0].count : 0;

    reply.ok({
      total: total_result,
      page: Math.ceil(total_result / limit),
      data: result
    })
  }
  const by_supplier_report_for_bot2 = async (request, reply, admin) => {
    const { services, search, organization, min, max, supplier } = request.body;

    const filterReceipts = {
      organization: organization,
      receipt_state: {
        $ne: 'draft'
      },
      debt_id: null,
      date: {
        // $gte: min - (process.env.TIME_DIFF | 0),
        // $lte: max - (process.env.TIME_DIFF | 0),
        $gte: min,
        $lte: max,
        // $gte: min,
        // $lte: max
      }
    }

    if (services && services.length > 0) {
      filterReceipts.service = {
        $in: services
      }
    }

    // if (custom) {
    //   const additional_query = []
    //   for (let i = min; i < max; i += 86400000) {
    //     additional_query.push({
    //       date: {
    //         $lte: i + end * 3600000 - (process.env.TIME_DIFF | 0),
    //         $gte: i + start * 3600000 - (process.env.TIME_DIFF | 0)
    //       }
    //     })
    //   }
    //   delete filterReceipts.date
    //   filterReceipts['$or'] = additional_query
    // }

    const unwindSoldItemList = {
      $unwind: "$sold_item_list"
    }

    const calculateItemsReport = {
      $group: {
        _id: "$sold_item_list.supplier_id",
        supplier_name: {
          $last: "$sold_item_list.supplier_name"
        },
        supplier_id: {
          $last: "$sold_item_list.supplier_id"
        },
        // cost_of_goods: {
        //   $sum: {
        //     $multiply: [
        //       { $max: ["$sold_item_list.cost", 0] },
        //       { $max: ["$sold_item_list.value", 0] },
        //       {
        //         $cond: [
        //           "$is_refund",
        //           -1, 1
        //         ]
        //       }
        //     ]
        //   }
        // },
        gross_sales: {
          $sum: {
            $multiply: [
              { $max: ["$sold_item_list.price", 0] },
              { $max: ["$sold_item_list.value", 0] },
              {
                $cond: [
                  "$is_refund",
                  0, 1
                ]
              }
            ]
          }
        },
        // refunds: {
        //   $sum: {
        //     $multiply: [
        //       { $max: ["$sold_item_list.price", 0] },
        //       { $max: ["$sold_item_list.value", 0] },
        //       {
        //         $cond: [
        //           "$is_refund",
        //           1, 0
        //         ]
        //       }
        //     ]
        //   }
        // },
        // discounts: {
        //   $sum: {
        //     $multiply: [
        //       {
        //         $max: [
        //           "$sold_item_list.total_discount",
        //           0
        //         ]
        //       },
        //       {
        //         $cond: [
        //           "$is_refund",
        //           -1, 1
        //         ]
        //       }
        //     ]
        //   }
        // },
        // items_sold: {
        //   $sum: {
        //     $cond: [
        //       "$is_refund",
        //       0,
        //       { $max: ["$sold_item_list.value", 0] }
        //     ]
        //   }
        // },
        // items_refunded: {
        //   $sum: {
        //     $cond: [
        //       "$is_refund",
        //       { $max: ["$sold_item_list.value", 0] },
        //       0
        //     ]
        //   }
        // },
        // taxes: { $sum: 0 }
      }
    }

    const searchByItemName = {
      $match: {
        supplier_name: {
          $regex: (search ? search : ''),
          $options: 'img'
        }
      }
    }
    if (supplier) {
      searchByItemName.$match = { supplier_id: supplier }
    }
    const sortResult = {
      $sort: {
        gross_sales: -1
      }
    }


    const projectResult = {
      $project: {
        id: "$_id",
        supplier_name: "$supplier_name",
        cost_of_goods: 1,
        gross_sales: 1,
        refunds: 1,
        discounts: 1,
        items_sold: 1,
        items_refunded: 1,
        taxes: 1,
        net_sales: {
          $subtract: [
            "$gross_sales",
            {
              $add: ["$refunds", "$discounts"]
            }
          ]
        },
        gross_profit: {
          $subtract: [
            {
              $subtract: [
                "$gross_sales",
                {
                  $add: ["$refunds", "$discounts"]
                }
              ]
            },
            "$cost_of_goods"
          ]
        }
      }
    }

    const result = await instance.Receipts.aggregate([
      {
        $match: filterReceipts
      },
      unwindSoldItemList,
      calculateItemsReport,
      searchByItemName,
      sortResult,
      projectResult
    ])
      .allowDiskUse(true)
      .exec();

    reply.ok(result)
  }
  instance.post(
    '/reports/sales/by_supplier/:min/:max/:limit/:page',
    supplierParams,
    (request, reply) => {
      instance.authorization(request, reply, (admin) => {
        if (!admin) {
          return reply.error('Access')
        }
        by_supplier_report(request, reply, admin)
      })
    })
  instance.post(
    '/bot/reports/sales/by_supplier/for_bot',
    // supplierParams,
    (request, reply) => {
      // instance.authorization(request, reply, (admin) => {
      by_supplier_report_for_bot2(request, reply)
      // })
    })
  next()
}
