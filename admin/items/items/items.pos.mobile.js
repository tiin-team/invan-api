const fp = require('fastify-plugin');

module.exports = fp((instance, options, next) => {
  const version = { version: '2.0.0' };

  instance.get(
    '/items/pos/:min/:max',
    {
      ...version,
      schema: {
        params: {
          params: {
            type: 'object',
            required: ['min', 'max'],
            properties: {
              min: { type: 'number', minimum: 1514764800000 },
              max: { type: 'number', maximum: 2000000800000 },
            },
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
        const { min, max } = request.params;
        const { service, limit, page } = request.query;

        const user_available_services = request.user.services.map(serv => serv.service)

        if (service)
          if (!user_available_services.find(serv => serv + '' == service))
            return reply.code(403).send('Forbidden service')

        const from_time = new Date(parseInt(min));
        const to_time = new Date(parseInt(max));

        const query = {
          organization: admin.organization,
          $or: [
            { last_updated: { $gte: min, $lte: max } },
            { last_price_change: { $gte: min, $lte: max } },
            { last_stock_updated: { $gte: min, $lte: max } },
            // { updatedAt: { $gte: from_time, $lte: to_time } },
            { createdAt: { $gte: from_time, $lte: to_time } },
          ],
        };


        const items_count = await instance.goodsSales.countDocuments(query);

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
            cond: () => service
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
                      request.user.services.map(elem => elem.service),
                    ],
                  },
                  {
                    $in: [
                      '$$service.service',
                      request.user.services.map(elem => elem.service + ''),
                    ],
                  },
                ]
              })
          }
        }

        const $project = {
          $project: {
            organization: 1,
            queue: 1,
            services: $project_filter,
            stopped_item: 1,
            created_time: 1,
            last_updated: 1,
            last_stock_updated: 1,
            last_price_change: 1,
            name: 1,
            category: 1,
            category_id: 1,
            category_name: 1,
            sale_is_avialable: 1,
            sold_by: 1,
            count_by_type: 1,
            barcode_by_type: 1,
            expire_date: 1,
            reminder: 1,
            has_discount: 1,
            old_price: 1,
            price: 1,
            prices: 1,
            price_auto_fill: 1,
            price_currency: 1,
            cost: 1,
            cost_currency: 1,
            max_cost: 1,
            sku: 1,
            hot_key: 1,
            barcode: 1,
            composite_item: 1,
            is_composite_item: 1,
            composite_items: 1,
            use_production: 1,
            use_sub_production: 1,
            is_track_stock: 1,
            in_stock: 1,
            low_stock: 1,
            optimal_stock: 1,
            primary_supplier_id: 1,
            primary_supplier_name: 1,
            default_purchase_cost: 1,
            purchase_cost_currency: 1,
            representation_type: 1,
            shape: 1,
            representation: 1,
            taxes: 1,
            stock_status: 1,
            item_type: 1,
            parent_item: 1,
            parent_name: 1,
            has_variants: 1,
            variant_options: 1,
            variant_of: 1,
            variant_items: 1,
            modifiers: 1,
            show_on_bot: 1,
            dimentions: 1,
            weight: 1,
            brand: 1,
            description: 1,
            mxik: 1,
            nds_value: 1,
          },
        };


        const pipeline = [
          { $match: query },
          $project,
          { $skip: (_page - 1) * _limit },
          { $limit: _limit },
        ];

        try {
          const goods = await instance.goodsSales
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
      });
    }
  );

  next();
});
