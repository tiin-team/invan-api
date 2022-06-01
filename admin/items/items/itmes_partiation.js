const fp = require('fastify-plugin');

module.exports = fp((instance, options, next) => {
  const version = { version: '2.0.0' };

  instance.post(
    '/items/partiation/:id',
    version,
    (request, reply) => {
      instance.oauth_admin(request, reply, async (admin) => {
        try {
          const id = request.params.id;
          const { supplier_id, service_id } = request.body

          const user_available_services = request.user.services.map(serv => serv.service)
          if (service_id)
            if (!user_available_services.find(serv => serv + '' === service_id))
              return reply.code(403).send('Forbidden service')

          const organization = await instance.organizations
            .findById(admin.organization, { nds_value: 1, name: 1 })
            .lean();

          const $match = {
            $match: { _id: instance.ObjectId(id) }
          };

          const lookup_filter = service_id
            ? ({ $eq: ['$service_id', instance.ObjectId(service_id)] })
            : ({ $in: ['$service_id', user_available_services] })

          const $lookup = {
            $lookup: {
              let: { prod_id: '$_id' },
              from: 'goodssalequeues',
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        lookup_filter,
                        {
                          $or: [
                            {
                              $eq: [
                                { $toString: '$good_id' },
                                '$$prod_id',
                              ]
                            },
                            {
                              $eq: ['$good_id', '$$prod_id']
                            },
                          ],
                        },
                      ]
                    }
                  },
                },
                { $sort: { queue: -1 } },
              ],
              as: 'partiations',
            },
          };
          const filter = service_id
            ? ({ $eq: ["$$supplier.service_id", instance.ObjectId(service_id)] })
            : ({ $in: ["$$supplier.service_id", user_available_services] })

          const $project = {
            $project: {
              stopped_item: 1,
              name: 1,
              sale_is_avialable: 1,
              nds_value: 1,
              sku: 1,
              category_name: 1,
              category_id: 1,
              primary_supplier_id: 1,
              primary_supplier_name: 1,
              partiations: 1,
              suppliers: {
                $filter: {
                  input: "$suppliers",
                  as: "supplier",
                  cond: filter,
                }
              }
            },
          }

          const item = (await instance.goodsSales.aggregate([
            $match,
            $lookup,
            $project,
          ])
            .allowDiskUse(true)
            .exec()
          )[0];

          if (!item) {
            return reply.fourorfour('Item')
          }
          item.nds_value = item.nds_value >= 0 ? item.nds_value : organization.nds_value;

          return reply.ok(item);
        } catch (error) {
          instance.log.error(error.message)
          return reply.error(error.message);
        }

      });
    }
  );

  instance.post('/items/partiations',
    {
      ...version,
      schema: {
        body: {
          type: 'object',
          required: ['limit', 'page'],
          properties: {
            supplier_id: {
              type: 'string',
              minLength: 24,
              maxLength: 24
            },
            service_id: {
              type: 'string',
              minLength: 24,
              maxLength: 24
            },
            limit: {
              type: 'number',
              minLength: 5,
            },
            page: {
              type: 'number',
              minLength: 1
            }
          }
        }
      }
    },
    (request, reply) => {
      instance.oauth_admin(request, reply, async (admin) => {
        try {
          const { supplier_id, service_id, limit, page } = request.body

          const user_available_services = request.user.services.map(serv => serv.service)
          const query = { quantity_left: { $ne: 0 } }

          if (service_id) {
            if (!user_available_services.find(serv => serv + '' === service_id))
              return reply.code(403).send('Forbidden service');
            query.service_id = instance.ObjectId(service_id);
          }
          if (supplier_id)
            query.supplier_id = instance.ObjectId(supplier_id);

          const $match = { $match: query };

          const $project = {
            $project: {
              supplier_id: 1,
              supplier_name: 1,
              purchase_id: 1,
              p_order: 1,
              service_id: 1,
              service_name: 1,
              good_id: 1,
              good_name: 1,
              cost: 1,
              quantity: 1,
              quantity_left: 1,
              queue: 1,
            }
          }

          const $limit = { $limit: limit }
          const $skip = { $skip: (page - 1) * limit };
          const $sort = { $sort: { _id: -1 } };

          const items = await instance.goodsSaleQueue.aggregate([
            $match,
            $project,
            $sort,
            $skip,
            $limit,
          ])
            .allowDiskUse(true)
            .exec();
          const total = await instance.clientsDatabase.countDocuments($match.$match);

          return reply.ok({
            limit: limit,
            page: Math.ceil(total / limit),
            current_page: page,
            data: items,
          }
          );
        } catch (error) {
          instance.log.error(error.message)
          return reply.error(error.message);
        }

      });
    })
  next();
});
