const fp = require('fastify-plugin');

module.exports = fp((instance, options, next) => {
  const version = { version: '2.0.0' };

  /**
   * @param {
   * import('fastify').FastifyRequest<
   * IncomingMessage,
   * import('fastify').DefaultQuery,
   * import('fastify').DefaultParams
   * } request
   * @param {reply} reply
   * @param {} user
   * @returns {import('fastify').FastifyReply<ServerResponse>}
  */
  async function getSuppliers(request, reply, user) {
    const { service_id, search, sort_by, sort_type } = request.body;
    const limit = !isNaN(parseInt(request.body.limit))
      ? parseInt(request.body.limit)
      : 10
    const page = !isNaN(parseInt(request.body.page))
      ? parseInt(request.body.page)
      : 1

    const user_available_services = user.services.map(serv => serv.service + '')

    if (service_id && !user_available_services.find(serv => serv === service_id + '')) {
      return reply.error('Acces denied')
    }
    const $match = {
      $match: {
        organization: user.organization,
        // service: { $in: user_available_services },
      }
    };

    if (search)
      $match.$match.name = {
        $regex: search,
        $options: "i",
      }

    const queue_query = {
      $and: [
        { $eq: ['$supplier_id', '$$supplier_id'] },
        { $ne: ['$quantity_left', 0] },
      ],
    }
    if (service_id)
      queue_query.$and.push({ $eq: [{ $toString: '$service_id' }, service_id] })
    else
      queue_query.$and.push({ $in: [{ $toString: '$service_id' }, user_available_services] })

    const $lookup = {
      $lookup: {
        from: 'goodssalequeues',
        let: { supplier_id: '$_id' },
        pipeline: [
          {
            $match: { $expr: queue_query },
          },
          {
            $project: {
              cost: 1,
              quantity: 1,
              quantity_left: 1,
            },
          },
          {
            $group: {
              _id: null,
              // cost: {
              //   $sum: {
              //     $multipy: [
              //       { $max: ['$cost', 0] },
              //       { $max: ['$quantity', 0] },
              //     ],
              //   },
              // },
              quantity: { $sum: '$quantity' },
              quantity_left: { $sum: '$quantity_left' },
              total_cost: {
                $sum: {
                  $multiply: ['$quantity_left', '$cost']
                }
              },
            }
          }
        ],
        as: 'partiations',
      }
    }
    const $skip = {
      $skip: (page - 1) * limit
    }
    const $limit = { $limit: limit };

    const $project = {
      $project: {
        organization: 1,
        supplier_name: 1,
        contact: 1,
        email: 1,
        phone_number: 1,
        website: 1,
        quantity: {
          $max: [{ $first: '$partiations.quantity' }, 0]
        },
        quantity_left: {
          $max: [{ $first: '$partiations.quantity_left' }, 0],
        },
        total_cost: {
          $max: [{ $first: '$partiations.total_cost' }, 0],
        },
      }
    }

    const $sort = { $sort: {} }

    if (sort_by)
      $sort.$sort[sort_by] = sort_type ? sort_type : 1
    else
      $sort.$sort._id = 1

    const result = await instance.adjustmentSupplier.aggregate([
      $match, $lookup, $project,
      $sort, $skip, $limit,
    ]);

    const total = await instance.adjustmentSupplier.countDocuments($match.$match)

    return reply.ok({
      total: total,
      page: Math.ceil(total / limit),
      current_page: page,
      limit: limit,
      data: result,
    })
  }

  const partiationSupplierValuationBody = {
    schema: {
      body: {
        type: 'object',
        additionalProperties: false,
        required: [
          'limit', 'page',
        ],
        properties: {
          limit: { type: 'number', minimum: 5 },
          page: { type: 'number', minimum: 1 },
          service_id: {
            OneOf: [
              { type: 'string', maxLength: 24, minLength: 24 },
              { type: 'string', maxLength: 0, minLength: 0 },
            ]
          },
          search: { type: 'string', default: '' },
          sort_by: {
            type: 'string',
            enum: ['_id', 'name', 'quantity', 'quantity_left', 'total_cost', '']
          },
          sort_type: {
            type: 'number', enum: [1, -1]
          },

        },
      },
    }
  }

  instance.post("/inventory/partiation/valuation",
    { ...version, ...partiationSupplierValuationBody },
    (request, reply) => {
      instance.authorization(request, reply, async (user) => {
        try {
          return getSuppliers(request, reply, user)
        } catch (error) {
          return reply.error(error.message)
        }
      })
    })

  const bodySchema = {
    body: {
      type: "object",
      properties: {
        limit: { type: "integer", minimum: 1 },
        page: { type: "integer", minimum: 1 },
        search: { type: "string" },
        quantity_left: {
          type: 'string',
          enum: ['all', 'zero', 'not_zero']
        },
        sort_by: {
          type: 'string',
          enum: ['quantity_left', 'name', 'p_order', 'date', '_id'],
        },
        sort_type: {
          type: 'number',
          enum: [1, -1],
        },
      },
      required: ["limit", "page"],
      additionalProperties: false,
    },
  };

  instance.post(
    "/inventory/partiation/valuation/:supplier_id",
    {
      ...version,
      schema: bodySchema
    },
    (request, reply) => {
      instance.authorization(request, reply, async (user) => {
        try {
          const {
            limit,
            page,
            quantity_left,
            search,
            sort_by,
            service_id,
          } = request.body;
          const { supplier_id } = request.params;

          if (!Array.isArray(request.user.services))
            return reply.code(403).send('Forbidden service')

          const user_available_services = request.user.services.map(serv => serv.service);

          if (service_id && !user_available_services.find(serv => serv + '' == service_id))
            return reply.code(403).send('Forbidden service')

          const query = {
            organization_id: instance.ObjectId(user.organization),
            service_id: { $in: user_available_services },
            supplier_id: instance.ObjectId(supplier_id),
          }
          if (service_id)
            query.service_id = instance.ObjectId(service_id);

          if (quantity_left === 'zero') query.quantity_left = { $eq: 0 }
          if (quantity_left === 'not_zero') query.quantity_left = { $ne: 0 }
          if (search)
            query["$or"] = [
              {
                p_order: {
                  $regex: search,
                  $options: "i",
                },
              },
              {
                good_name: {
                  $regex: search,
                  $options: "i",
                },
              },
            ];

          const $match = { $match: query };

          const $group = {
            $group: {
              _id: 'supplier_id',
              good_name: { $first: '$good_name' },
              supplier_name: { $first: '$supplier_name' },
              quantity: { $sum: '$quantity' },
              quantity_left: { $sum: '$quantity_left' },
            }
          }

          const $limit = { $limit: limit };
          const $skip = { $skip: (page - 1) * limit };

          const sort = {}
          const sort_type = request.body.sort_type ? request.body.sort_type : -1
          if (sort_by)
            sort[sort_by] = sort_type;
          else
            sort._id = sort_type;

          const $sort = { $sort: sort };

          const result = await instance.goodsSaleQueue.aggregate([
            $match,
            // $group,
            // $project,
            $sort,
            $skip,
            $limit,
          ])
            .allowDiskUse(true)
            .exec();

          const total = await instance.goodsSaleQueue.countDocuments(query);

          const total_quantity = await instance.goodsSaleQueue.aggregate([
            [
              { $match: query },
              {
                $group: {
                  _id: null,
                  quantity: { $sum: '$quantity' },
                  quantity_left: { $sum: '$quantity_left' },
                }
              }
            ]
          ])

          reply.ok({
            limit: limit,
            total: total,
            page: Math.ceil(total / limit),
            current_page: page,
            data: result,
            total_quantity: total_quantity[0],
          });
        } catch (error) {
          return reply.error(error.message)
        }
        return reply;
      })
      return reply;
    }
  );

  instance.post("/inventory/partiation/item/suppliers/:service_id/:product_id", version, (request, reply) => {
    instance.authorization(request, reply, async (user) => {
      try {
        const { product_id, service_id } = request.params;

        const user_available_services = request.user.services.map(serv => serv.service);

        if (service_id && !user_available_services.find(serv => serv + '' == service_id))
          return reply.code(403).send('Forbidden service')

        const query = {
          organization_id: instance.ObjectId(user.organization),
          good_id: instance.ObjectId(product_id),
          service_id: { $in: user_available_services },
        }
        if (service_id)
          query.service_id = instance.ObjectId(service_id);

        const $match = { $match: query };

        const $group = {
          $group: {
            _id: 'supplier_id',
            supplier_name: { $first: '$supplier_name' },
            // quantity: { $sum: '$quantity' },
            // quantity_left: { $sum: '$quantity_left' },
          }
        }


        const result = await instance.goodsSaleQueue.aggregate([
          $match,
          $group,
        ])
          // .allowDiskUse(true)
          .exec();

        // const total = await instance.goodsSaleQueue.countDocuments(query);

        reply.ok({
          // limit: limit,
          total: result.length,
          // page: Math.ceil(total / limit),
          // current_page: page,
          data: result,
        });
      } catch (error) {
        return reply.error(error.message)
      }
      return reply;
    })
    return reply;
  })

  next();
});