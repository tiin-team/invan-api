const fp = require('fastify-plugin');

module.exports = fp((instance, options, next) => {
  const version = { version: '2.0.0' };

  instance.post('/items/partiation/:id',
    {
      ...version,
      schema: {
        body: {
          type: 'object',
          required: [],
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
          }
        }
      },
    },
    (request, reply) => {
      instance.oauth_admin(request, reply, async (admin) => {
        try {
          const id = request.params.id;
          const { supplier_id, service_id } = request.body

          const user_available_services = request.user.services.map(serv => serv.service)
          if (service_id)
            if (!user_available_services.find(serv => serv + '' === service_id))
              return reply.code(403).send('Forbidden service')

          const query = {
            good_id: instance.ObjectId(id),
            quantity_left: { $ne: 0 },
          };

          if (service_id) query.service_id = instance.ObjectId(service_id);
          if (supplier_id) query.service_id = instance.ObjectId(supplier_id);

          const $match = { $match: query };

          const partiations = await instance.goodsSaleQueue.aggregate([$match])
            .allowDiskUse(true)
            .exec();

          const item = await instance.goodsSales
            .findById(instance.ObjectId(id), { queue: 1 })
            .lean()
          const total = await instance.goodsSaleQueue.countDocuments(query);
          const total_stock = partiations.reduce((total_stock_sum, num) => total_stock_sum + num, 0)

          return reply.code(200).send({
            error: "Ok",
            message: "Success",
            statusCode: 200,
            current_queue: item.queue,
            total: total,
            total_stock: total_stock,
            data: partiations,
          });
        } catch (error) {
          instance.log.error(error.message)
          return reply.error(error.message);
        }

      });
    }
  );

  instance.post('/items/partiations/:min/:max',
    {
      ...version,
      schema: {
        body: {
          type: 'object',
          required: ['limit', 'page'],
          properties: {
            quantity_left: {
              type: 'string',
              enum: ['all', 'zero', 'not_zero']
            },
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
            },
            sort_by: {
              type: 'string',
              enum: ['quantity_left', 'date', '_id']
            },
            sort_type: {
              type: 'number',
              enum: [1, -1]
            },
            search: {
              type: 'string',
            },
          }
        }
      }
    },
    (request, reply) => {
      instance.oauth_admin(request, reply, async (admin) => {
        try {
          const {
            supplier_id,
            service_id,
            limit,
            page,
            sort_by,
            search,
          } = request.body
          const sort_type = request.body.sort_type ? request.body.sort_type : -1
          const quantity_left = request.body.quantity_left
          const { min, max } = request.params;

          const user_available_services = request.user.services.map(serv => serv.service)
          const query = {
            organization_id: instance.ObjectId(admin.organization),
            service_id: { $in: user_available_services },
            // quantity_left: { $ne: 0 },
            date: {
              $gte: parseInt(min),
              $lte: parseInt(max),
            },
          }
          if (quantity_left === 'zero') query.quantity_left = { $eq: 0 }
          if (quantity_left === 'not_zero') query.quantity_left = { $ne: 0 }
          if (search)
            query["$or"] = [
              {
                supplier_name: {
                  $regex: search,
                  $options: "i",
                },
              },
              {
                service_name: {
                  $regex: search,
                  $options: "i",
                },
              },
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
              date: 1,
              organization_id: 1,
              barcode: 1,
            }
          }

          const $limit = { $limit: limit }
          const $skip = { $skip: (page - 1) * limit };
          const sort = {}
          if (sort_by) sort[sort_by] = sort_type;
          else sort._id = sort_type;

          const $sort = { $sort: sort };

          const items = await instance.goodsSaleQueue.aggregate([
            $match,
            $project,
            $sort,
            $skip,
            $limit,
          ])
            .allowDiskUse(true)
            .exec();
          const total = await instance.goodsSaleQueue.countDocuments(query);

          return reply.ok({
            limit: limit,
            page: Math.ceil(total / limit),
            current_page: page,
            data: items,
          });
        } catch (error) {
          instance.log.error(error.message)
          return reply.error(error.message);
        }

      });
    }
  );

  next();
});
