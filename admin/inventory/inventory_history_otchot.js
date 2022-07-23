
const fp = require('fastify-plugin');

module.exports = fp((instance, options, next) => {

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
        limit: { type: 'number', minimum: 1, default: 10 },
        page: { type: 'number', minimum: 1, default: 1 },
      },
    },
    body: {
      type: 'object',
      required: ['reasons'],
      properties: {
        search: { type: 'string' },
        reasons: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['sold', 'returned', 'received',
              'returned_order', 'transferred',
              'recounted', 'damaged', 'lost',
              'item edit', 'production',
              'workgroup_order', 'fee', 'loss',
            ],
          },
        },
        services: {
          type: 'array',
          items: { type: 'string', minLength: 24, maxLength: 24 },
          default: []
        },
        employees: {
          type: 'array',
          items: { type: 'string', minLength: 24, maxLength: 24 },
          default: []
        },
        categories: {
          type: 'array',
          items: { type: 'string', minLength: 24, maxLength: 24 },
          default: []
        },
      }
    }
  }

  const history_of_inventory_group = async (request, reply, admin) => {
    const { min, max, limit, page } = request.params;
    const { services, employees, categories, reasons, search } = request.body;
    const user_available_services = admin.services.map(serv => serv.service);

    const $match = {
      $match: {
        organization: admin.organization,
        date: {
          $gte: min,
          $lte: max,
        },
        service: {
          $in: user_available_services,
        }
      }
    }

    if (search) {
      $match.$match.product_name = { $regex: search, $options: 'i' }
      $match.$match.unique = { $regex: search, $options: 'i' }
    }

    if (services.length) {
      $match.$match.service = { $in: services.map(s => instance.ObjectId(s)) }
    }

    if (employees.length) {
      $match.$match.employee_id = { $in: employees.map(e => instance.ObjectId(e)) }
    }

    if (categories.length) {
      $match.$match.category_id = { $in: categories.map(e => instance.ObjectId(e)) }
    }

    if (reasons.length) {
      $match.$match.reason = { $in: reasons }
    }

    const $group = {
      $group: {
        _id: { _id: '$product_id', reason: '$reason' },
        product_name: { $first: '$product_name' },
        adjustment: {
          $sum: '$adjustment',
        }
      }
    }

    const $project = {
      $project: {
        _id: '$_id._id',
        reason: '$_id.reason',
        product_name: 1,
        adjustment: 1,
      }
    }
    const getCond = (name) => {
      return {
        $sum: {
          $cond: [
            { $eq: ['$reason', name] },
            '$adjustment',
            0
          ]
        }
      }
    }

    const $group2 = {
      $group: {
        _id: '$_id',
        product_name: { $first: '$product_name' },
        sold: getCond('sold'),
        returned: getCond('returned'),
        received: getCond('received'),
        returned_order: getCond('returned_order'),
        transferred: getCond('transferred'),
        recounted: getCond('recounted'),
        damaged: getCond('damaged'),
        lost: getCond('lost'),
        production: getCond('production'),
        workgroup_order: getCond('workgroup_order'),
        fee: getCond('fee'),
        loss: getCond('loss'),
        item_edit: getCond('item edit'),
      }
    }

    const $skip = {
      $skip: (page - 1) * limit,
    }
    const $limit = { $limit: limit }

    const aggregate = [$match, $group, $project, $group2, $skip, $limit]

    const $facet = {
      $facet: {
        data: aggregate,
        total: aggregate.concat({ $count: "total" })
      }
    }

    const data = await instance.inventoryHistory.aggregate([$facet]).exec()

    // let total = (await instance.goodsSales
    //   .aggregate([
    //     ...aggregate.filter(e => e['$skip'] === undefined && e['$limit'] === undefined),
    //     {
    //       $count: "total",
    //     },
    //   ]))[0]

    const total = data[0].total[0] && data[0].total[0].total ? data[0].total[0].total : 0

    reply.code(200).send({
      error: "Ok",
      message: "Success",
      statusCode: 200,
      limit: limit,
      current_page: page,
      page: Math.ceil(total / limit),
      total: total,
      data: data[0].data,
    })
  }

  instance.post(
    '/inventory/history/group/:min/:max/:limit/:page',
    {
      version: '2.0.0',
      schema: historySchema
    },
    (request, reply) => {
      instance.oauth_admin(request, reply, (admin) => {
        if (!admin) {
          return reply.error('Access')
        }
        history_of_inventory_group(request, reply, admin)
        // history_of_inventory_group(request, reply, { services: [] })
      })
    }
  )

  next()
})