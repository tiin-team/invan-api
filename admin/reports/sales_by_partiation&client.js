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
          limit: {
            oneOf: [
              { type: 'number', minimum: 5 },
              {
                type: 'string',
                enum: ['all'],
              }
            ],
          },
          page: { type: 'number', minimum: 1 },
        }
      },
      body: {
        type: 'object',
        // required: [
        //   'custom', 'employees',
        //   'end', 'services', 'start'
        // ],
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

  const by_partiation_report_group = async (request, reply, admin) => {
    const { min, max, page } = request.params;
    let limit = request.params.limit;
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

    const projectBeforUnwind = {
      $project: {
        date: {
          $multiply: [
            {
              $floor: {
                $divide: [
                  {
                    $max: [
                      0,
                      {
                        $add: [
                          '$date',
                          18000000
                        ]
                      }
                    ]
                  },
                  86400000
                ],
              },
            },
            86400000,
          ],
        },
        sold_item_list: 1,
        user_id: 1,
        cashier_id: 1,
        cashier_name: 1,
        organization: 1,
      }
    }
    const unwindSoldItemList = {
      $unwind: "$sold_item_list"
    }

    const calculateItemsReport = {
      $group: {
        _id: {
          queue_id: '$sold_item_list.queue_id',
          user_id: '$user_id',
          date: '$date',
        },
        supplier_name: {
          $last: "$sold_item_list.supplier_name"
        },
        product_name: {
          $first: "$sold_item_list.product_name"
        },
        category_name: {
          $first: "$sold_item_list.category_name"
        },
        value: {
          $sum: "$sold_item_list.value"
        },
        p_order: {
          $last: "$sold_item_list.p_order"
        },
        cashier_id: {
          $first: "$cashier_id"
        },
        cashier_name: {
          $first: "$cashier_name"
        },
        organization: {
          $first: "$organization"
        },
        poss_count: { $sum: 1 },
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
        "sold_item_list.queue_id": -1
      }
    }

    const groupSoldItems = {
      $group: {
        _id: calculateItemsReport.$group._id,
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

    limit = limit == 'all'
      ? !isNaN(total_result) && total_result > 0
        ? total_result
        : 1
      : limit
    const skipResult = {
      $skip: limit * (page - 1)
    }

    const limitResult = {
      $limit: limit
    }

    const projectResult = {
      $project: {
        partiation_id: '$_id.queue_id',
        user_id: '$_id.user_id',
        date: '$_id.date',
        supplier_name: 1,
        product_name: 1,
        product_id: 1,
        category_name: 1,
        value: 1,
        p_order: 1,
        cashier_id: 1,
        cashier_name: 1,
        poss_count: 1,
        organization: 1,
      }
    }

    const result = await instance.Receipts.aggregate([
      {
        $match: filterReceipts
      },
      projectBeforUnwind,
      unwindSoldItemList,
      calculateItemsReport,
      // searchByItemName,
      // sortResult,
      skipResult,
      limitResult,
      projectResult,
    ])
      .allowDiskUse(true)
      .exec();

    if (result.length <= 0) {
      return reply.ok({
        total: total_result,
        page: Math.ceil(total_result / limit),
        data: result
      })
    }

    const clients = await instance.clientsDatabase
      .find(
        {
          user_id: { $in: result.map(r => r.user_id) },
          organization: result[0].organization,
        },
        {
          user_id: 1,
          first_name: 1,
          last_name: 1,
        },
      )
      .lean()

    const users_obj = {}
    for (const user of clients) {
      users_obj[user.user_id] = user
    }
    const partiation_ids = []
    for (let i = 0; i < result.length; i++) {
      if (result[i].partiation_id)
        partiation_ids.push(instance.ObjectId(result[i].partiation_id))
    }
    const partiations = await instance.goodsSaleQueue
      .find({
        _id: { $in: partiation_ids },
      })
      .lean()

    const partiations_obj = {}
    for (const partiation of partiations) {
      partiations_obj[partiation._id] = partiation
    }

    for (let i = 0; i < result.length; i++) {
      if (users_obj[result[i].user_id])
        result[i].client_name = users_obj[result[i].user_id].first_name + users_obj[result[i].user_id].last_name
      if (users_obj[result[i].partiation_id]) {
        result[i].p_order = partiations_obj[result[i].partiation_id].p_order
        result[i].supplier_name = partiations_obj[result[i].partiation_id].supplier_name
      }
    }

    reply.ok({
      total: total_result,
      page: Math.ceil(total_result / limit),
      data: result
    })
  }

  const by_partiation_report_by_item = async (request, reply, admin) => {
    const { min, max, page } = request.params;
    let limit = request.params.limit;
    const { services } = request.body;

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

    const projectBeforUnwind = {
      $project: {
        date: 1,
        // date: {
        //   $multiply: [
        //     {
        //       $floor: {
        //         $divide: [
        //           {
        //             $max: [
        //               0,
        //               {
        //                 $add: [
        //                   '$date',
        //                   18000000
        //                 ]
        //               }
        //             ]
        //           },
        //           86400000
        //         ],
        //       },
        //     },
        //     86400000,
        //   ],
        // },
        receipt_no: 1,
        is_refund: 1,
        sold_item_list: 1,
        user_id: 1,
        cashier_id: 1,
        cashier_name: 1,
        organization: 1,
        service: 1,
        payment: 1,
      }
    }
    const unwindSoldItemList = {
      $unwind: "$sold_item_list"
    }

    const sortResult = {
      $sort: {
        date: -1
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
      countAllItems
    ])
      .allowDiskUse(true)
      .exec();

    const total_result = totalCount && totalCount.length > 0 && totalCount[0].count ? totalCount[0].count : 0;
    console.log(total_result, 'total_result');
    limit = limit == 'all'
      ? !isNaN(total_result) && total_result > 0
        ? total_result
        : 1
      : limit
    const skipResult = {
      $skip: limit * (page - 1)
    }

    const limitResult = {
      $limit: limit
    }

    const projectResult = {
      $project: {
        partiation_id: '$sold_item_list.partiation_id',
        receipt_no: 1,
        user_id: 1,
        date: 1,
        supplier_name: 1,
        is_refund: 1,
        product_id: '$sold_item_list.product_id',
        product_name: '$sold_item_list.product_name',
        category_name: '$sold_item_list.category_name',
        p_order: '$sold_item_list.p_order',
        value: '$sold_item_list.value',
        price: '$sold_item_list.price',
        discount: '$sold_item_list.discount',
        payment: 1,
        qty_box: '$sold_item_list.qty_box',
        avg_qty_box: {
          $divide: [
            {
              $max: [
                '$sold_item_list.qty_box',
                0
              ],
            },
            {
              $cond: [
                { $isNumber: '$sold_item_list.value' },
                // '$sold_item_list.value',
                1,
                1,
              ],
            },
          ],
        },
        tota_price: {
          $multiply: [
            {
              $max: [
                '$sold_item_list.price',
                0
              ],
            },
            {
              $max: [
                '$sold_item_list.value',
                0
              ],
            },
          ],
        },
        // cashier_id: 1,
        cashier_name: 1,
        // poss_count: 1,
        organization: 1,
        service: 1,
      }
    }

    const result = await instance.Receipts.aggregate([
      {
        $match: filterReceipts
      },
      projectBeforUnwind,
      unwindSoldItemList,
      sortResult,
      skipResult,
      limitResult,
      projectResult,
    ])
      .allowDiskUse(true)
      .exec();

    if (result.length <= 0) {
      return reply.ok({
        total: total_result,
        page: Math.ceil(total_result / limit),
        data: result
      })
    }

    const clients = await instance.clientsDatabase
      .find(
        {
          user_id: { $in: result.map(r => r.user_id) },
          organization: result[0].organization,
        },
        {
          user_id: 1,
          first_name: 1,
          last_name: 1,
        },
      )
      .lean()

    const users_obj = {}
    for (const user of clients) {
      users_obj[user.user_id] = user
    }

    const partiation_ids = new Set();
    const product_ids = new Set();
    const service_ids = new Set();
    for (let i = 0; i < result.length; i++) {
      if (result[i].partiation_id) {
        partiation_ids.add(instance.ObjectId(result[i].partiation_id))
      }
      if (result[i].product_id) {
        product_ids.add(result[i].product_id)
      }
      if (result[i].service) {
        service_ids.add(result[i].service)
      }
    }

    const stores = await instance.services
      .find({
        _id: { $in: [...service_ids] },
      })
      .lean()
    const stores_obj = {}
    for (const store of stores) {
      stores_obj[store._id] = store
    }


    const partiations = await instance.goodsSaleQueue
      .find({
        _id: { $in: [...partiation_ids] },
      })
      .lean()

    const partiations_obj = {}
    for (const partiation of partiations) {
      partiations_obj[partiation._id] = partiation
    }

    const goods = await instance.goodsSales
      .find(
        { _id: { $in: [...product_ids] } },
        {
          sold_by: 1,
          sku: 1,
        },
      )
      .lean()
    const goods_obj = {}
    for (const good of goods) {
      goods_obj[good._id] = good
    }

    for (let i = 0; i < result.length; i++) {

      if (users_obj[result[i].user_id]) {
        result[i].client_name = users_obj[result[i].user_id].first_name + users_obj[result[i].user_id].last_name
      } else {
        result[i].client_name = ""
      }

      result[i].partiation_no = ""

      if (partiations_obj[result[i].partiation_id]) {
        result[i].p_order = partiations_obj[result[i].partiation_id].p_order
        result[i].partiation_no = partiations_obj[result[i].partiation_id].partiation_no
          ? partiations_obj[result[i].partiation_id].partiation_no
          : result[i].p_order
        result[i].supplier_name = partiations_obj[result[i].partiation_id].supplier_name
      }

      result[i].service_id = stores_obj[result[i].service]._id
      result[i].service_name = stores_obj[result[i].service].name

      result[i].qty_box = result[i].qty_box ? result[i].qty_box : 0
      if (goods_obj[result[i].product_id]) {
        result[i].sold_by = goods_obj[result[i].product_id].sold_by
          ? goods_obj[result[i].product_id].sold_by
          : "each"

        result[i].sku = goods_obj[result[i].product_id].sku;
      }

      result[i].alt_group = ""
      result[i].size = ""

    }

    reply.ok({
      total: total_result,
      page: Math.ceil(total_result / limit),
      data: result
    })
  }

  instance.post(
    '/reports/sales/by_partitation-client/:min/:max/:limit/:page',
    supplierParams,
    (request, reply) => {
      instance.authorization(request, reply, (admin) => {
        if (!admin) {
          return reply.error('Access')
        }
        by_partiation_report_by_item(request, reply, admin)
      })
    })

  next()
}
