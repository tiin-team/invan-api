const fp = require('fastify-plugin');
const fs = require('fs');

module.exports = fp((instance, options, next) => {
  const version = { version: '2.0.0' };

  // stream bilan fileni save qilish
  async function test() {
    const writer = fs.createWriteStream('out.json', { encoding: 'utf8' });
    const query = { organization: '5f5641e8dce4e706c062837a' }
    const mongoStream = await instance.goodsSales
      .find(query)
      .lean()
      .stream();

    let count = 0
    let comma = ''
    writer.write('[')
    await new Promise(resolve => {
      mongoStream
        .on('data', (doc) => {
          writer.write(comma + JSON.stringify(doc))
          comma = ','
          return count++
        })
        .on('end', () => {
          writer.write(']')
          console.log('stream end');
          resolve()
        })
        .on('error', function (error) {
          // throw error; // error
        });
    })

    console.log(count,);
  }

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
  async function getPosItems(request, reply, admin) {
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
        // queue: 1,
        services: $project_filter,
        stopped_item: 1,
        created_time: 1,
        last_updated: 1,
        last_stock_updated: 1,
        last_price_change: 1,
        name: 1,
        // category: 1,
        category_id: 1,
        category_name: 1,
        sale_is_avialable: 1,
        sold_by: 1,
        count_by_type: 1,
        barcode_by_type: 1,
        // expire_date: 1,
        // reminder: 1,
        // has_discount: 1,
        // old_price: 1,
        // price: 1,
        // prices: 1,
        // price_auto_fill: 1,
        price_currency: 1,
        cost: 1,
        cost_currency: 1,
        // max_cost: 1,
        sku: 1,
        hot_key: 1,
        barcode: 1,
        composite_item: 1,
        is_composite_item: 1,
        composite_items: {
          $filter: {
            input: "$composite_items",
            as: "composite_item",
            cond: {
              $eq: [{ $type: "$$composite_item" }, "object"]
            }
          }
        },
        // use_production: 1,
        // use_sub_production: 1,
        // is_track_stock: 1,
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
        // taxes: 1,
        stock_status: 1,
        // item_type: 1,
        parent_item: 1,
        parent_name: 1,
        has_variants: 1,
        // variant_options: 1,
        // variant_of: 1,
        // variant_items: 1,
        // modifiers: 1,
        show_on_bot: 1,
        // dimentions: 1,
        // weight: 1,
        // brand: 1,
        // description: 1,
        mxik: 1,
        nds_value: 1,
        // {
        //   $cond: [
        //     {
        //       $eq: [{ $size: '$nds_value' }, 0]
        //     },
        //     15,
        //     { $toDouble: '$nds_value' },
        //   ]
        // },
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

      for (const [index, good] of goods.entries()) {
        goods[index].nds_value = isNaN(parseFloat(good.nds_value))
          ? 15
          : parseFloat(good.nds_value);
      }

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
  async function getPosItemsOrganizationService(request, reply, admin) {
    const service_id = request.params.service;
    const organization_id = request.params.organization;
    const limit = !isNaN(parseInt(request.query.limit))
      ? parseInt(request.query.limit)
      : 10;
    const page = !isNaN(parseInt(request.query.page))
      ? parseInt(request.query.page)
      : 1;
    const { min, max } = request.params;

    const date = new Date();
    const from_time = min ? new Date(parseInt(min)) : date;
    date.setDate(date.getDate() + 1);
    const to_time = max ? new Date(parseInt(max)) : date;

    const $match = {
      $match: {
        organization: organization_id,
        $or: [
          { last_updated: { $gte: min, $lte: max } },
          { last_price_change: { $gte: min, $lte: max } },
          { last_stock_updated: { $gte: min, $lte: max } },
          // { updatedAt: { $gte: from_time, $lte: to_time } },
          { createdAt: { $gte: from_time, $lte: to_time } },
        ],
      },
    };


    const $project_filter = {
      $filter: {
        input: "$services",
        as: "service",
        cond: {
          $or: [
            {
              $eq: ["$$service.service", service_id + ''],
            },
            {
              $eq: ["$$service.service", instance.ObjectId(service_id)],
            }
          ]
        }
      }
    }
    const $project = {
      $project: {
        organization: 1,
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
        price_currency: 1,
        cost: 1,
        cost_currency: 1,
        sku: 1,
        hot_key: 1,
        barcode: 1,
        composite_item: 1,
        is_composite_item: 1,
        composite_items: {
          $filter: {
            input: "$composite_items",
            as: "composite_item",
            cond: {
              $eq: [{ $type: "$$composite_item" }, "object"]
            }
          }
        },
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
        stock_status: 1,
        parent_item: 1,
        parent_name: 1,
        has_variants: 1,
        show_on_bot: 1,
        mxik: 1,
        nds_value: 1,
      },
    };

    const goods = await instance.goodsSales
      .aggregate([
        $match,
        { $sort: { _id: -1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit },
        $project,
      ])
      .exec();

    const total = await instance.goodsSales.countDocuments($match.$match);

    for (const [index, good] of goods.entries()) {
      const serv = good.services.find(
        (serv) => serv.service + '' == service_id
      );
      goods[index].prices = serv && serv.prices ? serv.prices : good.prices;
      goods[index].price = serv && serv.price ? serv.price : good.price;
      // goods[index].mxik = good.mxik ? good.mxik : randimMxik();
      goods[index].nds_value = good.nds_value && !isNaN(parseInt(good.nds_value))
        ? parseFloat(parseFloat(good.nds_value).toFixed(2))
        : 15;
      delete goods[index].services;
      goods[index].in_stock = serv && serv.in_stock ? serv.in_stock : good.in_stock;

      goods[index].image = goods[index].representation
        .replace('http://api.invan.uz/static/', '')
        .replace('https://api.invan.uz/static/', '')
        .replace('http://pos.in1.uz/api/static/', '')
        .replace('https://pos.in1.uz/api/static/', '')
        .replace('http://pos.inone.uz/api/static/', '')
        .replace('https://pos.inone.uz/api/static/', '');
      goods[index].representation =
        'https://pos.in1.uz/api/static/' + goods[index].image;
    }

    reply.send({
      statusCode: 200,
      error: "Ok",
      message: "Success",
      limit: limit,
      page: page,
      total: total,
      data: goods,
    });
  };

  instance.get(
    '/items/pos/:min/:max',
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
        getPosItems(request, reply, admin)
      });
    }
  );
  instance.get(
    '/items/pos/:organization/:service/:min/:max',
    {
      ...version,
      schema: {
        params: {
          type: 'object',
          required: ['min', 'max'],
          properties: {
            organization: { type: 'string', maxLength: 24, minLength: 24 },
            service: { type: 'string', maxLength: 24, minLength: 24 },
            min: { type: 'number', minimum: 1514764800000 },
            max: { type: 'number', maximum: 2000000800000 },
          },
        },
        querystring: {
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
        getPosItemsOrganizationService(request, reply, admin)
      });
    }
  );

  next();
});
