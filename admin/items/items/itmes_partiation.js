const fp = require('fastify-plugin');

module.exports = fp((instance, options, next) => {
  const version = { version: '1.0.0' };

  instance.get(
    '/items/partiation/:id',
    version,
    (request, reply) => {
      instance.oauth_admin(request, reply, async (admin) => {
        try {
          const organization = await instance.organizations
            .findById(admin.organization, { nds_value: 1, name: 1 })
            .lean();

          const item = await instance.goodsSales.findById(id).lean();
          item.nds_value = item.nds_value >= 0 ? item.nds_value : organization.nds_value;
          if (!item) {
            return reply.fourorfour('Item')
          }

          // get Category
          try {
            const category = await instance.goodsCategory
              .findById(item.category, { name: 1 })
              .lean();
            if (!category) {
              const other_category = await instance.goodsCategory
                .findOne(
                  { organization: admin.organization, is_other: true },
                  { name: 1 }
                )
                .lean();
              if (other_category) {
                item.category = other_category._id;
                item.category_name = other_category.name;
              }
              else {
                delete item.category;
                delete item.category_name;
              }
            }
            else {
              item.category = category._id
              item.category_name = category.name
            }
          } catch (error) {
            delete item.category;
            delete item.category_name;
            instance.log.error(error.message)
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
