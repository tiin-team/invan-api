
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
        // limit: { type: 'number', minimum: 1, default: 10 },
        limit: {
          oneOf: [
            { type: 'number', minimum: 5 },
            {
              type: 'string',
              enum: ['all'],
            }
          ],
        },
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
    const { min, max, page } = request.params;
    let { limit } = request.params
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

    const c_total = await instance.clickhouse.query(`
    SELECT
    product_id
    FROM inventory_history
    WHERE (organization = '${admin.organization}') AND
    (date BETWEEN ${min} AND ${max})
    GROUP BY product_id
  `).toPromise()
    limit = limit == 'all' ? c_total.length : limit

    const c_data = await instance.clickhouse.query(`
    SELECT
      product_id,
      reason,
      SUM(adjustment) AS adjustment
    FROM inventory_history
    WHERE (organization = '${admin.organization}') AND
    (date BETWEEN ${min} AND ${max})
    GROUP BY product_id,reason
    `).toPromise()
    // LIMIT ${(page - 1) * limit}, ${limit}
    // service IN ${user_available_services}

    const result = {}
    for (const item of c_data) {
      if (!result[item.product_id]) {
        result[item.product_id] = {
          product_id: item.product_id,
          product_name: item.product_name,
          sold: 0,
          returned: 0,
          received: 0,
          returned_order: 0,
          transferred: 0,
          recounted: 0,
          damaged: 0,
          lost: 0,
          production: 0,
          workgroup_order: 0,
          fee: 0,
          loss: 0,
          item_edit: 0,
        }
      }
      switch (item.reason) {
        case 'sold':
          result[item.product_id].sold += item.adjustment
          break;
        case 'returned':
          result[item.product_id].returned += item.adjustment
          break;
        case 'received':
          result[item.product_id].received += item.adjustment
          break;
        case 'returned_order':
          result[item.product_id].returned_order += item.adjustment
          break;

        case 'transferred':
          result[item.product_id].transferred += item.adjustment
          break;
        case 'recounted':
          result[item.product_id].recounted += item.adjustment
          break;
        case 'damaged':
          result[item.product_id].damaged += item.adjustment
          break;
        case 'lost':
          result[item.product_id].lost += item.adjustment
          break;
        case 'production':
          result[item.product_id].production += item.adjustment
          break;
        case 'workgroup_order':
          result[item.product_id].workgroup_order += item.adjustment
          break;
        case 'fee':
          result[item.product_id].fee += item.adjustment
          break;
        case 'loss':
          result[item.product_id].loss += item.adjustment
          break;
        case 'item edit':
          result[item.product_id].item_edit += item.adjustment
          break;
        default:
          break;
      }
    }

    return reply.code(200).send({
      error: "Ok",
      message: "Success",
      statusCode: 200,
      limit: limit,
      current_page: page,
      page: Math.ceil(c_total.length / limit),
      total: c_total.length,
      data: Object.values(result).slice((page - 1) * limit, page * limit),
    })
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

    const $group = {
      $group: {
        _id: { product_id: '$product_id', reason: '$reason' },
        total: { $sum: '$adjustment' }
        // product_name: { $first: '$product_name' },
        // sold: getCond('sold'),
        // returned: getCond('returned'),
        // received: getCond('received'),
        // returned_order: getCond('returned_order'),
        // transferred: getCond('transferred'),
        // recounted: getCond('recounted'),
        // damaged: getCond('damaged'),
        // lost: getCond('lost'),
        // production: getCond('production'),
        // workgroup_order: getCond('workgroup_order'),
        // fee: getCond('fee'),
        // loss: getCond('loss'),
        // item_edit: getCond('item edit'),
      }
    }

    const $skip = {
      $skip: (page - 1) * limit,
    }
    const $limit = { $limit: limit }

    const $facet = {
      $facet: {
        data: [$match, $group, $skip, $limit],
        total: [
          $match, { $group: { _id: '$product_id' } },
          { $count: "total" },
        ]
      }
    }

    const data = await instance.inventoryHistory.aggregate([$facet]).allowDiskUse(true).exec()

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