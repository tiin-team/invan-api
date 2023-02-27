

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
    const user_available_services = request.user.services.map(serv => serv.service);

    const query = {
      service: { $in: user_available_services },
      organization: admin.organization,
      date: {
        // $gte: min - (process.env.TIME_DIFF | 0),
        // $lte: max - (process.env.TIME_DIFF | 0),
        $gte: min,
        $lte: max,
      }
    }

    for (const ind in services) {
      if (!user_available_services.find(serv => serv + '' == services[ind]))
        return reply.code(403).send('Forbidden service')
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
        // _id: -1,
        date: -1,
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
      {
        $project: {
          organization: 1,
          date: 1,
          unique: 1,
          category_id: 1,
          category_name: 1,
          product_id: 1,
          product_name: 1,
          cost: 1,
          service: 1,
          service_name: 1,
          employee_id: 1,
          employee_name: 1,
          reason: 1,
          type: 1,
          adjustment: 1,
          stock_after: 1,
          product: {
            name: { $first: '$product.name' },
            category: { $first: '$product.category' },
            barcode: { $first: '$product.barcode' },
            item_type: { $first: '$product.item_type' },
          },
        }
      },
      // lookupService,
      // lookupEmployees,
    ])
      .allowDiskUse(true)
      .exec();

    const parents = await instance.goodsSales
      .find(
        {
          variant_items: {
            $elemMatch: {
              $eq: histories.map(e => e.product_id)
            }
          }
        },
        { name: 1 }
      )
      .lean()
    const parentsObj = {}
    for (const parent_item of parents) {
      parentsObj[parent_item._id] = parent_item
    }

    const categories = await instance.goodsCategory
      .find(
        {
          $or: [
            {
              _id: {
                $in: histories.map(h => instance.ObjectId(h.product.category)).filter(c_id => c_id !== ''),
              },
            },
            { type: { $in: histories.map(h => h.product.category) } },
          ]
        },
        { type: 1, name: 1 },
      )
      .lean()

    const categoriesObj = {}
    for (const category of categories) {
      category.parent_id = category._id
      category.parent_name = category.name

      categoriesObj[category._id] = category
    }

    for (const category of categories) {
      if (category.type && categoriesObj[category.type]) {
        categoriesObj[category._id].parent_id = categoriesObj[category.type]._id
        categoriesObj[category._id].parent_name = categoriesObj[category.type].name
      }
    }

    for (const index in histories) {
      const current_item = histories[index].product[0]

      if (current_item && current_item.item_type == 'variant') {
        if (parentsObj[current_item._id] && current_item) {
          histories[index].product_name = `${parentsObj[current_item._id].name} ( ${current_item.name} )`
        }
      } else {
        histories[index].barcode = current_item.barcode
        histories[index].product_name = current_item.name
      }
      delete histories[index].product

      histories[index].adjustment = Math.round(histories[index].adjustment * 100) / 100
      histories[index].stock_after = Math.round(histories[index].stock_after * 100) / 100

      if (categoriesObj[histories[index].category_id]) {
        histories[index].category_name = categoriesObj[histories[index].category_id].name
        histories[index].category_parent_name = categoriesObj[histories[index].category_id].parent_name
      } else {
        histories[index].category_name = ''
        histories[index].category_parent_name = ''
      }
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
