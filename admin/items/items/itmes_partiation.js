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
            if (!user_available_services.find(serv => serv + '' === supplier_id))
              return reply.code(403).send('Forbidden service')

          const organization = await instance.organizations
            .findById(admin.organization, { nds_value: 1, name: 1 })
            .lean();

          const $match = {
            $match: { _id: id }
          };
          const lookup_filter = service_id
            ? ({ service_id: service_id })
            : ({ service_id: { $in: user_available_services } })
          const $lookup = {
            $lookup: {
              let: { prod_id: '$_id' },
              from: 'goodssalequeues',
              pipeline: [
                {
                  $match: {
                    good_id: '$$prod_id',
                    ...lookup_filter,
                  },
                  $sort: { queue: -1 },
                }
              ],
              as: 'partiations',
            },
          };
          const filter = service_id
            ? ({ $eq: ["$$supplier.service_id", service_id] })
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

          item.nds_value = item.nds_value >= 0 ? item.nds_value : organization.nds_value;
          if (!item) {
            return reply.fourorfour('Item')
          }

          return reply.ok(item);
        } catch (error) {
          instance.log.error(error.message)
          return reply.error(error.message);
        }

      });
    }
  );

  next();
});
