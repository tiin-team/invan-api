const fp = require('fastify-plugin');
const fs = require('fs');

module.exports = fp((instance, options, next) => {
  const version = { version: '2.0.0' };

  /**
   * 
    @param {
    import('fastify').FastifyRequest<
     IncomingMessage, 
     import('fastify').DefaultQuery,
     import('fastify').DefaultParams,
     DefaultHeaders,
     any>
    } request 
    @param {import('fastify').FastifyReply<ServerResponse>} reply 
    @param {{
      organization: strign,
      services: [{
        service: mongoose.Types.ObjectId,
        service_name: string,
        available: boolean,
      }]
    }} admin 
   @return {import('fastify').FastifyInstance<Server, IncomingMessage, ServerResponse>}
  */
  async function getPosCats(request, reply, admin) {
    const { min, max } = request.params;
    const { service, limit, page } = request.query;

    const user_available_services = admin.services.map(serv => serv.service)

    if (service)
      if (!user_available_services.find(serv => serv + '' == service))
        return reply.code(403).send('Forbidden service')

    const from_time = new Date(parseInt(min));
    const to_time = new Date(parseInt(max));

    const query = {
      organization: admin.organization,
      $or: [
        { created_time: { $gte: min, $lte: max } },
        { updatedAt: { $gte: from_time, $lte: to_time } },
        { createdAt: { $gte: from_time, $lte: to_time } },
      ],
    };


    const items_count = await instance.goodsCategory.countDocuments(query);

    const _page = isNaN(parseInt(page))
      ? 1
      : parseInt(page);
    const _limit = limit === 'all'
      ? items_count
      : isNaN(parseInt(limit))
        ? 10
        : parseInt(limit)

    const $project_filter = {
      $filter: {
        input: "$services",
        as: "service",
        cond: (() => service
          ? ({
            $or: [
              {
                $eq: ["$$service.service", service + ''],
              },
              {
                $eq: ["$$service.service", instance.ObjectId(service)],
              }
            ]
          })
          : ({
            $or: [
              {
                $in: [
                  '$$service.service',
                  user_available_services,
                ],
              },
              {
                $in: [
                  '$$service.service',
                  admin.services.map(elem => elem.service + ''),
                ],
              },
            ]
          }))()
      }
    }

    const $project = {
      $project: {
        organization: 1,
        services: $project_filter,
        type: 1,
        name: 1,
        color: 1,
        count: 1,
        image: 1,
        service: 1,
        section: 1,
        position: 1,
        is_other: 1,
        services: 1,
        item_tree: 1,
        section_id: 1,
        show_on_bot: 1,
        present_type: 1,
        created_time: 1,
        parent_categories: 1,
        draggable_position: 1,
      },
    };


    const pipeline = [
      { $match: query },
      $project,
      { $skip: (_page - 1) * _limit },
      { $limit: _limit },
    ];

    try {
      const goods = await instance.goodsCategory
        .aggregate(pipeline)
        .allowDiskUse(true)
        .exec();

      // for (let i = 0; i < goods.length; i++) {
      //   if (goods[i].has_variants) {
      //     goods[i].in_stock = await instance.calculateInStockItemVariants(
      //       goods[i].variant_items,
      //       request.body && request.body.service ? request.body.service : ''
      //     );
      //     if (goods[i].sold_by == 'box' || goods[i].sold_by == 'pcs') {
      //       goods[i].reminder = await instance.calculateReminderItemVariants(
      //         goods[i].variant_items,
      //         request.body && request.body.service ? request.body.service : ''
      //       );
      //     }
      //   }
      // }

      reply.ok({
        total: items_count,
        page: Math.ceil(items_count / limit),
        current_paage: page,
        limit: limit,
        data: goods,
      });
    } catch (error) {
      reply.error(error.message);
    }
    return reply;
  }

  instance.get(
    '/categories/pos/:min/:max',
    {
      ...version,
      schema: {
        params: {
          type: 'object',
          required: ['min', 'max'],
          properties: {
            min: { type: 'number', minimum: 1514764800000 },
            max: { type: 'number', maximum: 2000000800000 },
          },

        },
        querystring: {
          service: { type: 'string', maxLength: 24, minLength: 24 },
          limit: {
            oneOf: [
              { type: 'number', minimum: 5 },
              {
                type: 'string',
                enum: ['all'],
              }
            ]
          },
          page: { type: 'number', minimum: 1 },
        }
      },
    },
    (request, reply) => {
      instance.authorization(request, reply, async (admin) => {
        getPosCats(request, reply, admin)
      });
    }
  );

  next();
});
