const fp = require('fastify-plugin');

module.exports = fp((instance, options, next) => {
  const version = { version: '2.0.0' };

  instance.post('/iventory/items/:organization/:service', version, (request, reply) => {
    instance.authorization(request, reply, async (user) => {
      const organization = request.params.organization
      const service_id = request.params.service
      if (
        user.organization != organization ||
        !user.services ||
        !user.services.find(serv => serv.service + '' === service_id)
      )
        return reply.code(403).send('Forbidden')
      const service = await instance.services
        .findOne(
          { _id: service_id },
          { name: 1 },
        )
        .lean()
      const count = await instance.goodsSales.countDocuments({ organization: user.organization })

      const limit = request.body.limit === 'all'
        ? count
        : !isNaN(parseInt(request.body.limit))
          ? parseInt(request.body.limit)
          : 10
      const page = !isNaN(parseInt(request.body.page))
        ? parseInt(request.body.page)
        : 1

      const $match = {
        $match: {
          organization: user.organization,
        }
      }
      const $project = {
        $project: {
          name: 1,
          sku: 1,
          barcode: 1,
          cost: 1,
          default_purchase_cost: 1,
          service: {
            $filter: {
              input: "$services",
              as: "service",
              cond: {
                $or: [
                  {
                    $eq: ["$$service.service", service._id + '']
                  },
                  {
                    $eq: ["$$service.service", service._id]
                  }
                ]
              }
            }
          }
        },
      }

      const $resProject = {
        $project: {
          name: 1,
          sku: 1,
          barcode: 1,
          in_stock: { $first: '$service.in_stock' },
          cost: 1,
          default_purchase_cost: 1,
        }
      }

      const $limit = { $limit: limit }
      const $skip = { $skip: (page - 1) * limit }

      const items = await instance.goodsSales
        .aggregate([$match, $skip, $limit, $project, $resProject])
        .exec()

      reply.ok(items)
    });
  })
  next();
});
