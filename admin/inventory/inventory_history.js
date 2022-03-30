

module.exports = (instance, options, next) => {

  // get inventory history by query

  const historySchema = {
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
        'services', 'employees',
        'reasons', 'search'
      ],
      properties: {
        search: { type: 'string' },
        reasons: { type: 'array', items: { type: 'string' } },
        services: { type: 'array', items: { type: 'string', minLength: 24, maxLength: 24 } },
        employees: { type: 'array', items: { type: 'string', minLength: 24, maxLength: 24 } },
      }
    }
  }

  const history_of_inventory = async (request, reply, admin) => {

    const { min, max, limit, page } = request.params;
    const { services, employees, reasons, search, category } = request.body;

    const query = {
      organization: admin.organization,
      date: {
        $gte: min - (process.env.TIME_DIFF | 0),
        $lte: max - (process.env.TIME_DIFF | 0)
      }
    }

    for (const ind in services) {
      try { services[ind] = instance.ObjectId(services[ind]) }
      catch (error) { }
    }

    if (services.length > 0) {
      query.service = {
        $in: services
      }
    }

    for (const ind in employees) {
      try { employees[ind] = instance.ObjectId(employees[ind]) }
      catch (error) { }
    }

    if (employees.length > 0) {
      query.employee_id = {
        $in: employees
      }
    }

    if (reasons.length > 0) {
      query.reason = {
        $in: reasons
      }
    }

    if (search) {
      query['$or'] = [
        {
          $or: [
            {
              product_name: {
                $regex: search,
                $options: 'i'
              },
            },
            {
              product_name: {
                $regex: instance.converter(search),
                $options: 'i'
              }
            }
          ]
        },
        {
          product_sku: {
            $regex: search,
            $options: 'i'
          }
        }
      ]
    }
    if (category) {
      query.category_id = category;
    }

    const all_history = await instance.inventoryHistory.countDocuments(query).exec();

    const historyMatch = {
      $match: query
    }

    const sortAll = {
      $sort: {
        _id: -1
      }
    }

    const skipAll = {
      $skip: (page - 1) * limit
    }

    const limitAll = {
      $limit: limit
    }

    const lookupItems = {
      $lookup: {
        from: 'goodssales',
        localField: 'product_id',
        foreignField: '_id',
        as: 'product'
      }
    }

    const lookupService = {
      $lookup: {
        from: 'inoneservices',
        localField: 'service',
        foreignField: '_id',
        as: 'service'
      }
    }

    const lookupEmployees = {
      $lookup: {
        from: 'employeeslists',
        localField: 'employee_id',
        foreignField: '_id',
        as: 'employee'
      }
    }

    const histories = await instance.inventoryHistory.aggregate([
      historyMatch,
      sortAll,
      skipAll,
      limitAll,
      lookupItems,
      lookupService,
      lookupEmployees,
    ])
      .allowDiskUse(true)
      .exec();

    for (const index in histories) {
      if (histories[index].product.length > 0) {
        if (histories[index].product[0].item_type == 'variant') {
          let current_item = histories[index].product[0]
          try {
            const parent = await instance.goodsSales.findOne({
              variant_items: {
                $elemMatch: {
                  $eq: current_item._id
                }
              }
            })

            if (parent) {
              histories[index].product_name = `${parent.name} ( ${current_item.name} )`
            }
          }
          catch (err) { }
        }
        else {
          histories[index].barcode = histories[index].product[0].barcode
          histories[index].product_name = histories[index].product[0].name
        }
      }
      delete histories[index].product

      if (histories[index].service.length > 0) {
        histories[index].service_name = histories[index].service[0].name
      }
      delete histories[index].service
      if (histories[index].employee.length > 0) {
        histories[index].employee_name = histories[index].employee[0].name
      }
      delete histories[index].employee;
      histories[index].adjustment = Math.round(histories[index].adjustment * 100) / 100
      histories[index].stock_after = Math.round(histories[index].stock_after * 100) / 100
    }

    reply.ok({
      total: all_history,
      page: Math.ceil(all_history / limit),
      data: histories
    })
  }

  instance.post(
    '/inventory/history/:min/:max/:limit/:page',
    {
      ...options.version,
      schema: historySchema
    },
    (request, reply) => {
      instance.oauth_admin(request, reply, (admin) => {
        if (!admin) {
          return reply.error('Access')
        }
        history_of_inventory(request, reply, admin)
      })
    }
  )

  next()
}
