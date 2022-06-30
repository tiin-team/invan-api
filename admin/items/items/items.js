const fs = require('fs');

module.exports = (instance, options, next) => {
  const version = { version: '1.0.0' };

  const item_variant = async (data, admin, reply, item_id) => {
    data.last_updated = new Date().getTime();
    data.last_stock_updated = new Date().getTime();
    var services = [];
    var serObj = {};
    for (let i = 0; i < data.services.length; i++) {
      if (!serObj[data.services[i].service + data.services[i].sku]) {
        services.push({
          ...data.services[i],
          available: true,
        });
      }
      serObj[data.services[i].service + data.services[i].sku] = true;
    }

    if (data.primary_supplier_id == '' || data.primary_supplier_id == null) {
      delete data.primary_supplier_id;
    }
    var updating_item;
    if (item_id) {
      updating_item = await instance.goodsSales.findById(item_id).exec();
      if (!updating_item) {
        return reply.fourorfour('Item');
      }
    }

    var all_sku = [];
    for (let i = 0; i < data.variant_items.length; i++) {
      all_sku.push(data.variant_items[i].sku);
    }
    if (updating_item) {
      var has_skus = await instance.goodsSales.find({
        organization: admin.organization,
        sku: {
          $in: all_sku,
        },
        _id: {
          $nin: updating_item.variant_items,
        },
      });

      if (has_skus && has_skus.length > 0) {
        return reply.send({
          statusCode: 411,
          message: 'SKU Allready exist',
        });
      }
    }
    var serviceObj = {};

    for (let i = 0; i < data.variant_items.length; i++) {
      serviceObj[data.variant_items[i].sku] = [];
    }

    for (let i = 0; i < data.services.length; i++) {
      if (!serviceObj[data.services[i].sku]) {
        serviceObj[data.services[i].sku] = [];
      }
      serviceObj[data.services[i].sku].push(data.services[i]);
    }

    for (let i = 0; i < data.variant_items.length; i++) {
      data.variant_items[i].organization = admin.organization;

      if (serviceObj[data.variant_items[i].sku]) {
        data.variant_items[i].services = serviceObj[data.variant_items[i].sku];
      }

      data.variant_items[i].last_updated = data.last_updated;
      data.variant_items[i].last_stock_updated = new Date().getTime();
      data.variant_items[i].category_id = data.category_id;
      data.variant_items[i].created_time = data.created_time;
      data.variant_items[i].category = data.category;
      data.variant_items[i].category_name = 'Other';
      data.variant_items[i].shape = data.shape;
      data.variant_items[i].representation = data.representation;
      data.variant_items[i].sold_by = data.sold_by;
      data.variant_items[i].item_type = 'variant';
      data.variant_items[i].parent_name = data.name;
    }

    if (updating_item) {
      await instance.goodsSales.deleteMany({
        organization: admin.organization,
        _id: {
          $in: updating_item.variant_items,
        },
      });
    }

    let result = await instance.goodsSales.insertMany(data.variant_items);
    data.variant_items = [];
    for (let i = 0; i < result.length; i++) {
      data.variant_items.push(result[i]._id);
    }
    data.organization = admin.organization;
    data.services = services;
    try {
      if (item_id) {
        await instance.goodsSales.updateOne(
          { _id: item_id },
          { $set: data }
        );
      } else {
        let res = await new instance.goodsSales(data).save();
        if (res) { item_id = res._id }
      }
      if (item_id) {
        await instance.goodsSales.updateMany(
          {
            organization: admin.organization,
            _id: {
              $in: data.valid_items,
            },
          },
          {
            $set: {
              variant_of: item_id,
            },
          }
        );
      }
      reply.ok('Saved');
    } catch (err) {
      reply.send({
        statusCode: 422,
        message: 'Could not save',
      });
    }
  };

  const itemSchema = {
    body: {
      type: 'object',
      required: [
        'has_variants',
        'variant_options',
        'variant_items',
        'services',
      ],
      properties: {
        price: { type: 'number' },
        price_currency: {
          type: 'string',
          default: 'uzs',
        },
        cost: { type: 'number' },
        cost_currency: {
          type: 'string',
          default: 'uzs',
        },
        hot_key: {
          type: 'string',
          default: '',
        },
        has_variants: { type: 'boolean' },
        variant_options: {
          type: 'array',
          items: {
            type: 'object',
            option_name: { type: 'string' },
            option_values: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        },
        variant_items: {
          type: 'array',
          items: {
            type: 'object',
            required: [
              'name', 'price', 'price_currency',
              'cost', 'cost_currency', 'sku',
            ],
            properties: {
              name: { type: 'string' },
              price: { type: 'number' },
              price_currency: {
                type: 'string',
                default: 'uzs',
              },
              cost: { type: 'number' },
              cost_currency: {
                type: 'string',
                default: 'uzs',
              },
              sku: { type: 'number' },
              is_track_stock: {
                type: 'boolean',
                default: true,
              },
              count_by_type: {
                type: 'number',
              },
              barcode: {
                type: 'array',
                items: {
                  type: 'string',
                },
                default: [],
              },
            },
          },
        },
        services: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: [
              'service', 'price', 'price_currency',
              'available', 'sku',
            ],
            properties: {
              service: {
                type: 'string',
                minLength: 24,
                maxLength: 24,
              },
              service_name: { type: 'string' },
              price: { type: 'number' },
              price_currency: {
                type: 'string',
                default: 'uzs',
              },
              price_auto_fill: { type: 'boolean' },
              in_stock: { type: 'number' },
              reminder: { type: 'number' },
              variant_name: { type: 'string' },
              available: { type: 'boolean' },
              sku: { type: 'number' },
            },
          },
        },
        workgroups: {
          type: 'array',
          default: [],
          items: {
            type: 'string',
            minLength: 24,
            maxLength: 24,
          },
        },
      },
    },
  };

  instance.post(
    '/items/create/with-variant',
    {
      ...version,
      schema: itemSchema,
    },
    (request, reply) => {
      instance.oauth_admin(request, reply, (admin) => {
        if (admin) {
          instance.check_sku_and_category(
            request,
            admin.organization,
            (result) => {
              if (result.success) {
                item_variant(result.data, admin, reply);
              } else {
                if (result.sku) {
                  reply.send({
                    statusCode: 411,
                    message: 'SKU Allready exist',
                  });
                } else if (result.barcode) {
                  reply.send({
                    statusCode: 412,
                    message: 'Barcode Allready exist',
                  });
                } else {
                  reply.error('Error on creating item');
                }
              }
            }
          );
        }
      });
    }
  );

  instance.post(
    '/items/update/with-variant/:id',
    {
      ...version,
      schema: itemSchema,
    },
    (request, reply) => {
      instance.oauth_admin(request, reply, (admin) => {
        if (admin) {
          instance.check_sku_and_category(
            request,
            admin.organization,
            (result) => {
              if (result.success) {
                item_variant(result.data, admin, reply, request.params.id);
              } else {
                if (result.sku) {
                  reply.send({
                    statusCode: 411,
                    message: 'SKU Allready exist',
                  });
                } else if (result.barcode) {
                  reply.send({
                    statusCode: 412,
                    message: 'Barcode Allready exist',
                  });
                } else {
                  reply.error('Error on creating item');
                }
              }
            }
          );
        }
      });
    }
  );

  // get item variants

  const getItemVariants = async (request, reply, admin) => {
    try {
      const item_id = request.body.item_id;
      const services = request.body.services;
      const item = await instance.goodsSales.findOne({ _id: item_id });
      const variants = await instance.goodsSales.find({
        _id: { $in: item.variant_items },
      });
      for (let i = 0; i < variants.length; i++) {
        if (typeof variants[i].is_track_stock != typeof true) {
          variants[i].is_track_stock = item.is_track_stock;
        }
        variants[i].is_composite_item = item.is_composite_item;
        variants[i].use_production = item.use_production;
        if (
          services &&
          services.length > 0 &&
          typeof variants[i].services == typeof []
        ) {
          for (const s of variants[i].services) {
            if (s.service + '' == services[0] + '') {
              variants[i].price = s.price;
              variants[i].prices = s.prices;
              variants[i].price_currency = s.price_currency;
            }
          }
        }
        variants[i].in_stock = variants[i].services.reduce(function (a, b) {
          if (services && services.length) {
            if (services.includes(b.service + '')) {
              return a + b.in_stock;
            } else {
              return a;
            }
          } else {
            return a + b.in_stock;
          }
        }, 0);

        if (typeof variants[i].in_stock != 'number') {
          variants[i].in_stock = 0;
        }
        variants[i].in_stock = Math.round(variants[i].in_stock * 100) / 100;

        if (variants[i].sold_by == 'box' || variants[i].sold_by == 'pcs') {
          variants[i].reminder = variants[i].services.reduce(function (a, b) {
            if (services && services.length) {
              if (services.includes(b.service + '')) {
                return a + (typeof b.reminder == 'number' ? b.reminder : 0);
              } else {
                return a;
              }
            } else {
              return a + (typeof b.reminder == 'number' ? b.reminder : 0);
            }
          }, 0);
        }
      }
      reply.ok(variants);
    } catch (err) {
      reply.fourorfour(err.message);
    }
  };

  const getVariantsSchema = {
    body: {
      type: 'object',
      required: ['item_id'],
      properties: {
        item_id: { type: 'string' },
        services: {
          type: 'array',
          items: {
            type: 'string',
          },
        },
      },
    },
  };

  instance.post(
    '/items/list_of_variants',
    {
      version: '1.0.0',
      schema: getVariantsSchema,
    },
    (request, reply) => {
      instance.oauth_admin(request, reply, (admin) => {
        return getItemVariants(request, reply, admin);
      });
    }
  );

  // get items list

  const get_list_of_items = async (request, reply, admin) => {
    var category_id;
    const query = {
      organization: admin.organization,
      item_type: { $ne: 'variant' },
    };

    let elemmatch = {};
    let sort_by = { _id: 1 };
    if (request.body) {
      if (request.body.category != '' && request.body.category != null) {
        category_id = request.body.category;
      }
      if (request.body.composite_item) {
        query.composite_item = request.body.composite_item;
      } else if (request.body.composite_item == false) {
        query.composite_item = { $ne: !request.body.composite_item };
      }
      if (request.body.use_sub_production) {
        query.is_composite_item = true;
      }
      if (request.body.supplier_id) {
        let supplier_id = request.body.supplier_id;
        try {
          supplier_id = instance.ObjectId(supplier_id);
        } catch (error) { }

        query.primary_supplier_id = {
          $eq: supplier_id,
        };
      }
      if (request.body.sort_by) {
        switch (request.body.sort_by) {
          case 'name': {
            sort_by = { name: 1 };
            break;
          }
          case 'sku': {
            sort_by = { sku: 1 };
            break;
          }
          case 'stock': {
            sort_by = {
              in_stock: -1,
            };
            break;
          }
          default: {
            sort_by = {
              _id: -1,
            };
            break;
          }
        }
      }
      if (request.body.stock) {
        let service_id = request.body.service;
        if (typeof service_id == typeof 'invan' && service_id != '') {
          let s_id;
          try {
            s_id = instance.ObjectId(service_id);
          } catch (error) { }
          elemmatch = {
            $or: [
              {
                service: {
                  $eq: service_id,
                },
              },
              {
                service: {
                  $eq: s_id,
                },
              },
            ],
          };
        }
        switch (request.body.stock) {
          case 'positive': {
            elemmatch.in_stock = { $gt: 0 };
            query['services'] = { $elemMatch: elemmatch };
            break;
          }
          case 'low': {
            query['services'] = { $elemMatch: elemmatch };
            break;
          }
          case 'zero': {
            elemmatch.in_stock = { $eq: 0 };
            query['services'] = { $elemMatch: elemmatch };
            break;
          }
          case 'out': {
            elemmatch.in_stock = { $lte: 0 };
            query['services'] = { $elemMatch: elemmatch };
            break;
          }
        }
      }

      if (typeof request.body.composite_item === 'boolean') {
        query.composite_item = request.body.composite_item;
      }
    }

    var name = instance.make_regexable_text(request.body.name);

    if (name == undefined) {
      name = '';
    }
    if (request.body.search) {
      name = request.body.search;
    }
    var find_categ = {
      organization: admin.organization,
      position: {
        $ne: null,
      },
    };

    let ids = [];

    try {
      if (category_id) {
        ids = [category_id];
        const category_result = await instance.get_child_category(category_id);
        ids = ids.concat(category_result);
      }
    } catch (error) { }
    if (ids.length > 0) {
      query.category = { $in: ids };
    }
    var services = request.body.services;
    if (services != undefined) {
      // if(services.length > 0) {
      //   query.services = { $elemMatch: { service: { $in: request.body.services } } }
      // }
    }
    if (name == '') {
      query.name = undefined;
      delete query.name;
    } else {
      query['$or'] = [
        {
          name: { $regex: name, $options: 'i' },
        },
        {
          name: {
            $regex:
              instance.converter(name) != ''
                ? instance.converter(name)
                : 'salom_dunyo_ishla_qale',
            $options: 'i',
          },
        },
        {
          barcode: { $regex: name, $options: 'i' },
        },
        {
          barcode_by_type: {
            $regex: name,
            $options: 'i',
          },
        },
      ];
      if (+name) {
        query['$or'].push({ sku: +name });
      }
    }

    let items_count = 0;

    // try {
    //   items_count = await instance.goodsSales.countDocuments(query);
    // } catch (error) { }

    let page;
    try {
      if (parseInt(request.params.page)) {
        page = parseInt(request.params.page);
      } else {
        page = 1;
      }
    } catch (err) { }
    let limit;
    try {
      if (parseInt(request.params.limit)) {
        limit =
          parseInt(request.params.limit) != 0
            ? parseInt(request.params.limit)
            : 1;
      } else {
        limit = 200;
      }
    } catch (err) { }

    /*
    instance.goodsSales.aggregate([
      {
        $match: query
      },
      // {
      //   $lookup: {
      //     from: "goodscategories",
      //     localField: "category",
      //     foreignField: "_id",
      //     as: "categoryObj"
      //   }
      // },
      {
        $project: {
          // categoryObj: 0,
          service: 0,
          created_time: 0,
          section: 0,
          count: 0,
          category_id: 0,
          count_by_type: 0,
          fabricator: 0,
          reminder: 0,
          variants: 0,
          __v: 0,
          sale_is_avialable: 0,
          sold_by: 0,
          expire_date: 0,
          composite_items: 0,
          low_stock: 0,
          optimal_stock: 0,
          representation_type: 0,
          shape: 0,
          representation: 0,
          taxes: 0,
          stock_status: 0,
        }
      },
      {
        $skip: limit * (page - 1)
      },
      {
        $limit: limit
      },
      {
        $sort: { _id: 1 }
      }
    ],
    */

    const pipeline = [{ $match: query }];

    const projectionItems = {
      $project: {
        organization: 1,
        name: 1,
        category: 1,
        category_name: 1,
        sold_by: 1,
        price: 1,
        price_currency: 1,
        cost_currency: 1,
        cost: 1,
        sku: 1,
        barcode: 1,
        is_track_stock: 1,
        is_composite_item: 1,
        use_production: 1,
        primary_supplier_id: 1,
        purchase_cost_currency: 1,
        item_type: 1,
        has_variants: 1,
        parent_name: 1,
        in_stock: 1,
        mxik: 1,
        services: 1,
        count_by_type: 1,
        variant_items: 1,
      },
    };

    if (request.body && request.body.stock == 'low') {
      const cond = {
        $and: [
          {
            $or: [
              { $lt: ['$$service.in_stock', '$$service.low_stock'] },
              { $lte: ['$$service.in_stock', 0] },
            ],
          },
        ],
      };

      delete elemmatch.in_stock;
      let service_id = request.body.service;
      if (typeof service_id == typeof 'invan' && service_id != '') {
        let s_id;
        try {
          s_id = instance.ObjectId(service_id);
        } catch (error) { }

        cond['$and'].push({
          $or: [
            { $eq: ['$$service.service', service_id] },
            { $eq: ['$$service.service', s_id] },
          ],
        });
      }

      projectionItems['$project']['services'] = {
        $filter: {
          input: '$services',
          as: 'service',
          cond: cond,
        },
      };
    }

    pipeline.push(projectionItems);

    if (request.body && request.body.stock == 'low') {
      pipeline.push({
        $match: {
          services: { $ne: [] },
        },
      });
    }

    pipeline.push({ $sort: sort_by });

    pipeline.push({ $skip: limit * (page - 1) });
    pipeline.push({ $limit: limit });

    const old_project = { ...projectionItems.$project }
    delete old_project.services
    pipeline.push({
      $project: {
        ...old_project,
        services: {
          $filter: {
            input: '$services',
            as: 'serv',
            cond: {
              $or: [
                {
                  $in: [
                    '$$serv.service',
                    request.user.services.map(elem => elem.service),
                  ],
                },
                {
                  $in: [
                    '$$serv.service',
                    request.user.services.map(elem => elem.service + ''),
                  ],
                },
              ]
            },
          },
        }
      }
    })

    if (sort_by.in_stock == -1) {
      const calculateStockProject = {
        $project: {
          organization: 1,
          name: 1,
          category: 1,
          category_name: 1,
          sold_by: 1,
          price: 1,
          price_currency: 1,
          cost_currency: 1,
          cost: 1,
          sku: 1,
          barcode: 1,
          is_track_stock: 1,
          is_composite_item: 1,
          use_production: 1,
          primary_supplier_id: 1,
          purchase_cost_currency: 1,
          item_type: 1,
          has_variants: 1,
          parent_name: 1,
          services: 1,
          count_by_type: 1,
          variant_items: 1,
          in_stock: {
            $reduce: {
              input: '$services',
              initialValue: 0,
              in: {
                $add: [
                  '$$value',
                  {
                    $cond: {
                      if: {
                        $or: [
                          {
                            $eq: [{ $type: '$$this.in_stock' }, 'double'],
                          },
                          {
                            $eq: [{ $type: '$$this.in_stock' }, 'int'],
                          },
                        ],
                      },
                      then: '$$this.in_stock',
                      else: 0,
                    },
                  },
                ],
              },
            },
          },
        },
      };
      pipeline.push(calculateStockProject);
    }

    const org_services = await instance.services
      .find({ organization: admin.organization }, { _id: 1 })
      .lean();
    const servicesObj = {};
    for (const s of org_services) {
      servicesObj[s._id + ''] = true;
    }

    try {
      const goods = await instance.goodsSales
        .aggregate(pipeline)
        .allowDiskUse(true);
console.log(
  ...pipeline.map(e => {
    console.log(!e['$skip'] === undefined && !e['$limit'] === undefined);
    if (!e['$skip'] === undefined && !e['$limit'] === undefined) return e
  }),
  'pipeline'
);
      const total = (
        await instance.goodsSales
          .aggregate([
            ...pipeline.map(e => {
              if (!e['$skip'] === undefined && !e['$limit'] === undefined) return e
            }),
            {
              $count: "total",
            },
          ])
      )[0]
        .total;
      // var total = goods.length;
      var with_stocks = [];
      for (let i = 0; i < goods.length; i++) {
        goods[i].in_stock = 0;
        if (!goods[i].services || typeof goods[i].services != typeof []) {
          goods[i].services = [];
        }

        goods[i].in_stock = 0;
        let item_reminder = 0;
        const SERVICES =
          request.body && request.body.services ? request.body.services : [];
        const SERVICE = request.body ? request.body.service : '';

        for (const service of goods[i].services) {
          if (typeof service.in_stock != 'number') {
            service.in_stock = 0;
          }
          if (typeof service.reminder != 'number') {
            service.reminder = 0;
          }

          service.in_stock = Math.round(service.in_stock * 100) / 100;
          service.reminder = Math.round(service.reminder * 100) / 100;
          if (servicesObj[service.service + '']) {
            if ((SERVICES && SERVICES.length > 0) || SERVICE != '') {
              if (
                SERVICES.includes(service.service + '') ||
                SERVICE == service.service + ''
              ) {
                goods[i].price = service.price;
                if (!service.prices || typeof service.prices != typeof []) {
                  service.prices = [];
                }
                goods[i].prices = service.prices;
                goods[i].in_stock += service.in_stock;
                item_reminder += service.reminder ? service.reminder : 0;
              }
            } else {
              goods[i].in_stock += service.in_stock;
              item_reminder += service.reminder ? service.reminder : 0;
            }
          }
        }

        if (request.body) {
          if (request.body.services != '' || request.body.service != '') {
            goods[i].stock_status = {
              low_stock: 0,
              out_of_stock: 0,
              positive: 0,
              zero: 0,
            };
            for (var s of goods[i].services) {
              goods[i].stock_status.low_stock +=
                s.low_stock > s.in_stock && s.in_stock > 0 ? 1 : 0;
              goods[i].stock_status.zero += s.in_stock == 0 ? 1 : 0;
              goods[i].stock_status.position += s.in_stock > 0 ? 1 : 0;
              goods[i].stock_status.out_of_stock += s.in_stock < 0 ? 1 : 0;
            }
          } else {
            goods[i].stock_status = {
              low_stock: 0,
              out_of_stock: 0,
              positive: 0,
              zero: 0,
            };
            for (var s of goods[i].services) {
              if (s) {
                goods[i].stock_status.low_stock +=
                  s.low_stock > s.in_stock && s.in_stock > 0 ? 1 : 0;
                goods[i].stock_status.out_of_stock += s.in_stock < 0 ? 1 : 0;
                goods[i].stock_status.positive += s.in_stock > 0 ? 1 : 0;
                goods[i].stock_status.zero += s.in_stock == 0 ? 1 : 0;
              }
            }
          }
        }

        goods[i].services = undefined;
        if (
          !(
            goods[i].is_track_stock ||
            (goods[i].use_production && goods[i].is_composite_item)
          )
        ) {
          delete goods[i].in_stock;
        }
        if (
          (request.body.stock == 'low' &&
            goods[i].stock_status.low_stock > 0) ||
          (request.body.stock == 'out' &&
            goods[i].stock_status.out_of_stock > 0) ||
          (request.body.stock == 'positive' &&
            goods[i].stock_status.position > 0) ||
          (request.body.stock == 'zero' && goods[i].stock_status.zero > 0)
        ) {
          with_stocks.push(goods[i]);
        }
        if (goods[i].sold_by == 'box' || goods[i].sold_by == 'pcs') {
          goods[i].reminder = item_reminder;
        } else {
          delete goods[i].reminder;
        }
      }

      // in stock for variant items

      for (let i = 0; i < goods.length; i++) {
        if (goods[i].has_variants) {
          goods[i].in_stock = await instance.calculateInStockItemVariants(
            goods[i].variant_items,
            request.body && request.body.service ? request.body.service : ''
          );
          if (goods[i].sold_by == 'box' || goods[i].sold_by == 'pcs') {
            goods[i].reminder = await instance.calculateReminderItemVariants(
              goods[i].variant_items,
              request.body && request.body.service ? request.body.service : ''
            );
          }
        }
      }

      reply.ok({
        // total: Math.ceil(items_count / limit),
        // page: Math.ceil(items_count / limit),
        total: total,
        page: Math.ceil(total / limit),
        data: goods,
      });
    } catch (error) {
      reply.error(error.message);
    }
    return reply;
  };

  instance.post(
    '/items/list_of_items/:limit/:page',
    version,
    (request, reply) => {
      instance.oauth_admin(request, reply, (admin) => {
        if (admin) {
          get_list_of_items(request, reply, admin);
        }
      });
    }
  );

  const list_of_items = (request, reply, admin) => {
    const query = {
      name: 1,
      cost: 1,
      cost_currency: 1,
      sku: 1,
      barcode: 1,
      price: 1,
      prices: 1,
      services: 1,
      item_type: 1,
      category_name: 1,
      sold_by: 1,
      mxik: 1,
    };
    if (request.headers['accept-user'] == 'boss') {
      query.price = 1;
      query.services = 1;
    }
    var find = {
      organization: admin.organization,
      has_variants: {
        $ne: true,
      },
    };
    if (request.body) {
      if (request.body.categories) {
        if (request.body.categories.length > 0) {
          find.category = {
            $in: request.body.categories,
          };
        }
      }
      if (request.body.suppliers) {
        if (request.body.suppliers.length > 0) {
          find.primary_supplier_id = {
            $in: request.body.suppliers,
          };
        }
      }
      if (request.body.search != undefined) {
        find['$or'] = [
          {
            name: { $regex: request.body.search, $options: 'i' },
          },
          {
            name: {
              $regex:
                instance.converter(request.body.search) != ''
                  ? instance.converter(request.body.search)
                  : 'salom_dunyo_ishla_qale',
              $options: 'i',
            },
          },
        ];
      }
    }
    instance.goodsSales.find(find, query, async (err, goods) => {
      if (err || goods == null) {
        goods = [];
      }
      if (
        request.headers['accept-user'] == 'boss'
        || request.headers['accept-user'] == 'admin'
      ) {
        for (let i = 0; i < goods.length; i++) {
          // try {
          //   goods[i] = goods[i].toObject();
          // } catch (error) { }
          goods[i].in_stock = 0;
          if (!goods[i].services) {
            goods[i].services = [];
          }
          goods[i].in_stock = goods[i].services.reduce(function (a, b) {
            return a + b.in_stock;
          }, 0);
          if (request.body && request.body.service) {
            for (var s of goods[i].services) {
              if (s.service + '' == request.body.service + '') {
                goods[i].price = s.price;
                goods[i].prices = s.prices;
                goods[i].in_stock = s.in_stock;
              }
            }
          }
          if (typeof goods[i].prices != typeof []) {
            goods[i].prices = [];
          }

          goods[i].services = undefined;

          if (goods[i].item_type == 'variant') {
            try {
              const parent = await instance.goodsSales.findOne({
                variant_items: {
                  $elemMatch: {
                    $eq: goods[i]._id,
                  },
                },
              });
              if (parent) {
                goods[i].name = `${parent.name} ( ${goods[i].name} )`;
              }
            } catch (err) { }
          }
        }
      }

      reply.ok(goods);
    })
      .lean();
  };

  instance.get('/items/list_of_items', version, (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      if (admin) {
        list_of_items(request, reply, admin);
      }
    });
  });

  instance.post('/items/list_of_items', version, (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      if (admin) {
        list_of_items(request, reply, admin);
      }
    });
  });

  // get with incoming

  const list_of_items_incoming = (request, reply, admin) => {
    instance.goodsSales.aggregate(
      [
        {
          $match: {
            organization: admin.organization,
          },
        },
        {
          $lookup: {
            from: 'purchaseitems',
            localField: '_id',
            foreignField: 'product_id',
            as: 'item',
          },
        },
        {
          $project: {
            services: 1,
            name: 1,
            sku: 1,
            cost: 1,
            price: 1,
            in_stock: 1,
            item: 1,
            mxik: 1,
          },
        },
      ],
      (err, goods) => {
        if (err) {
          reply.error('Error on finding');
        } else {
          if (err) {
            reply.error('Error on finding purchase');
            if (err) {
              instance.send_Error('finding purchase', JSON.stringify(err));
            }
          } else {
            if (goods == null) {
              goods = [];
            }
            var Answer = [];
            for (var g of goods) {
              var incoming = 0;
              var in_stock = 0;
              if (g.item.length > 0) {
                for (var it of g.item) {
                  incoming += it.quality - (it.received + it.cancelled);
                }
              }
              g.item = undefined;
              for (var s of g.services) {
                if (
                  (s.in_stock &&
                    s.service + '' == request.params.service + '') ||
                  request.params.service == ''
                ) {
                  in_stock += s.in_stock;
                }
              }
              g.in_stock = in_stock;
              g.services = undefined;
              g.incoming = incoming;
              Answer.push(g);
            }
            reply.ok(Answer);
          }
        }
      }
    );
  };

  instance.get(
    '/items/list_of_items/:service',
    {
      ...version,
      schema: {
        params: {
          type: 'object',
          required: ['service'],
          properties: {
            service: { type: 'string' },
          },
        },
      },
    },
    (request, reply) => {
      instance.oauth_admin(request, reply, (admin) => {
        if (admin) {
          list_of_items_incoming(request, reply, admin);
        }
      });
    }
  );

  // get available sku

  const get_sku = (request, reply, admin) => {
    instance.goodsSales
      .find(
        {
          organization: admin.organization,
          sku: { $gt: 0 },
        },
        (err, goods) => {
          var default_sku = 10000;
          if (err) {
            reply.error('Error on finding sku');
          } else {
            if (goods == null) {
              goods = [];
            }
            goods.sort((a, b) => {
              if (a.sku != undefined && b.sku != undefined) {
                return a.sku < b.sku ? 1 : -1;
              } else {
                return -1;
              }
            });
            for (var g of goods) {
              if (default_sku == g.sku) {
                default_sku += 1;
              }
            }
            if (goods && goods.length > 0) {
              default_sku = goods[0].sku + 1;
            }
            reply.ok({ sku: default_sku });
          }
        }
      )
      .sort({ sku: -1 })
      .limit(1);
  };
  const get_sku_new = (request, reply, admin) => {
    const default_sku = 9999;
    try {
      instance.goodsSales
        .find(
          {
            organization: admin.organization,
            sku: { $gt: default_sku },
          },
          { _id: 0, sku: 1 },
          (err, goods) => {
            if (err) {
              reply.error('Error on finding sku');
            } else {
              // goods = goods ? goods : []
              if (goods.length >= 1) {
                if (goods[0].sku != default_sku + 1)
                  return reply.ok({ sku: default_sku + 1 });

                if (goods.length == 1)
                  return reply.ok({ sku: goods[0].sku + 1 });

                for (let i = 0; i < goods.length - 2; i++) {
                  if (goods[i + 1].sku - goods[i].sku > 1) {
                    return reply.ok({ sku: goods[i].sku + 1 });
                  }
                }
                return reply.ok({ sku: goods[goods.length - 1].sku + 1 });
              } else {
                return reply.ok({ sku: default_sku + 1 });
              }
            }
          }
        )
        .sort({ sku: 1 })
        .lean();
    } catch (error) {
      reply.error(error);
    }
  };
  instance.get('/items/get_available_sku', version, (request, reply) => {
    instance.authorization(request, reply, (admin) => {
      if (admin) {
        get_sku_new(request, reply, admin);
      }
      // if (admin) { get_sku(request, reply, admin) }
    });
  });

  // items create

  const create_item = (data, admin, reply) => {
    data.last_updated = new Date().getTime();
    data.last_stock_updated = new Date().getTime();
    if (data.primary_supplier_id == '' || data.primary_supplier_id == null) {
      delete data.primary_supplier_id;
    }
    const $model = new instance.goodsSales(
      Object.assign({ organization: admin.organization }, data)
    );
    instance.services.find(
      {
        organization: admin.organization,
      },
      (_, services) => {
        if (services == null) {
          services = [];
        }
        var serviceObj = {};
        var service_ids = [];
        if ($model.services) {
          if ($model.services.length > 0) {
            for (let i = 0; i < $model.services.length; i++) {
              if (
                $model.services[i].service != '' ||
                $model.services[i].service != null
              ) {
                serviceObj[$model.services[i].service + ''] =
                  $model.services[i];
                service_ids.push(instance.ObjectId($model.services[i].service));
              }
            }
          }
        }
        $model.services = [];
        if (service_ids.length != services.length) {
          for (var s of services) {
            if (serviceObj[s._id + ''] == undefined) {
              serviceObj[s._id + ''] = {};
              serviceObj[s._id + ''].available = true;
              serviceObj[s._id + ''].service = instance.ObjectId(s._id);
              serviceObj[s._id + ''].in_stock = 0;
              serviceObj[s._id + ''].low_stock = 0;
              serviceObj[s._id + ''].optimal_stock = 0;
            }
            $model.services.push(serviceObj[s._id + '']);
          }
        } else {
          for (var id of service_ids) {
            $model.services.push(serviceObj[id + '']);
          }
        }
        if ($model.is_composite_item) {
          if ($model.composite_items) {
            if ($model.composite_items.length > 0) {
              var valid_items = [];
              for (let i = 0; i < $model.composite_items.length; i++) {
                if (
                  $model.composite_items[i].product_id != '' ||
                  $model.composite_items[i].product_id != null
                ) {
                  var quality = 0;
                  if (parseFloat($model.composite_items[i].quality)) {
                    quality = parseFloat($model.composite_items[i].quality);
                  }
                  valid_items.push({
                    product_id: instance.ObjectId(
                      $model.composite_items[i].product_id
                    ),
                    product_name: $model.composite_items[i].product_name
                      ? $model.composite_items[i].product_name
                      : '',
                    quality: quality,
                  });
                }
              }
              $model.composite_items = valid_items;
              if ($model.composite_items.length == 0) {
                $model.is_composite_item = false;
              }
            } else {
              $model.is_composite_item = false;
              $model.composite_items = [];
            }
          }
        } else {
          $model.composite_items = [];
        }
        if (
          !(
            $model.is_track_stock ||
            ($model.is_composite_item && $model.use_production)
          )
        ) {
          for (let i = 0; i < $model.services.length; i++) {
            $model.services[i].in_stock = 0;
          }
        }
        $model.save((err, item) => {
          if (err) {
            instance.send_Error('item create', JSON.stringify(err));
            reply.error('Error on creating item');
          } else {
            reply.ok(item);
            if (
              item.is_track_stock ||
              (item.is_composite_item && item.use_production)
            ) {
              if (item.services.length > 0) {
                var time = new Date().getTime();
                for (var s of item.services) {
                  if (s.in_stock != 0 && s.in_stock != null) {
                    item.in_stock = s.in_stock;
                    instance.create_inventory_history(
                      admin,
                      'item edit',
                      '',
                      s.service,
                      item._id,
                      item.cost,
                      item.in_stock,
                      item.in_stock,
                      time
                    );
                  }
                  if (typeof s.reminder == typeof 5 && s.reminder > 0) {
                    instance.create_reminder_history(
                      admin,
                      'item edit',
                      '',
                      s.service,
                      item._id,
                      item.cost,
                      0,
                      s.reminder,
                      time
                    );
                  }
                }
              }
            }
          }
        });
      }
    )
      .lean();
  };

  instance.post('/items/create_item', version, (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      if (admin) {
        instance.check_sku_and_category(
          request,
          admin.organization,
          (result) => {
            // console.log(result);
            if (result.success) {
              create_item(result.data, admin, reply);
            } else {
              if (result.sku) {
                reply.send({
                  statusCode: 411,
                  message: 'SKU Allready exist',
                });
              } else if (result.barcode) {
                reply.send({
                  statusCode: 412,
                  message: 'Barcode Allready exist',
                });
              } else {
                reply.error('Error on creating item');
              }
            }
          }
        );
      }
    });
  });

  // update item

  const update_item = (data, id, admin, reply, fields = false) => {
    if (data.category) {
      data.category_id = instance.ObjectId(data.category);
    }
    data.last_updated = new Date().getTime();
    data.last_stock_updated = new Date().getTime();
    instance.goodsSales.findOne(
      { _id: id },
      (_, item1) => {
        if (!item1) {
          return reply.fourorfour('Item');
        }
        if (data.cost) {
          if (item1.max_cost < data.cost || item1.max_cost == 0) {
            data.max_cost = data.cost;
          }
        }
        if (item1) {
          // if (!fields && data.services && !(data.is_track_stock || (data.is_composite_item && data.use_production))) {
          //   for (let i = 0; i < data.services.length; i++) {
          //     data.services[i].in_stock = 0
          //   }
          // }
          if (data.is_composite_item && data.composite_items) {
            var composite_items = [];
            for (let i = 0; i < data.composite_items.length; i++) {
              if (
                data.composite_items[i].product_id != '' &&
                data.composite_items[i].product_id != null
              ) {
                var quality = 0;
                if (parseFloat(data.composite_items[i].quality)) {
                  quality = parseFloat(data.composite_items[i].quality);
                }
                data.composite_items[i].quality = quality;
                data.composite_items[i].product_id = instance.ObjectId(
                  data.composite_items[i].product_id
                );
                composite_items.push(data.composite_items[i]);
              }
            }
            if (composite_items.length == 0) {
              data.is_composite_item = false;
            }
            data.composite_items = composite_items;
          }

          if (typeof data.price == typeof 5 && data.price != item1.price) {
            data.last_price_change = new Date().getTime();
          }

          instance.goodsSales.updateOne(
            { _id: id },
            { $set: data },
            (err, result) => {
              if (result.ok) {
                reply.ok();

                // sending push
                if (data.services) {
                  for (var s of data.services) {
                    instance.push_changes({ headers: {} }, 101, s.service);
                    if (!s.available) {
                      instance.push_deleted_items(
                        { headers: {} },
                        [id],
                        admin.organization,
                        s.service
                      );
                    }
                  }
                }
                // create inv history

                instance.goodsSales.findOne(
                  { _id: id },
                  (_, item2) => {
                    if (item2) {
                      // if (item2.is_track_stock || (item2.is_composite_item && item2.use_production)) {
                      var time = new Date().getTime();
                      if (!(item1.services instanceof Array)) {
                        item1.services = [];
                      }
                      for (let i = 0; i < item2.services.length; i++) {
                        if (!item2.services[i].in_stock) {
                          item2.services[i].in_stock = 0;
                        }
                        if (!item1.services[i]) {
                          item1.services[i] = { in_stock: 0 };
                        }
                        if (!item1.services[i].in_stock) {
                          item1.services[i].in_stock = 0;
                        }
                        if (
                          item2.services[i].in_stock !=
                          item1.services[i].in_stock
                        ) {
                          instance.create_inventory_history(
                            admin,
                            'item edit',
                            '',
                            item2.services[i].service,
                            item2._id,
                            item2.cost,
                            item2.services[i].in_stock -
                            item1.services[i].in_stock,
                            item2.services[i].in_stock,
                            time
                          );
                        }
                        if (
                          item2.services[i].reminder !=
                          item1.services[i].reminder &&
                          (typeof item2.services[i].reminder == typeof 5 ||
                            typeof item1.services[i].reminder == typeof 5)
                        ) {
                          instance.create_reminder_history(
                            admin,
                            'item edit',
                            '',
                            item2.services[i].service,
                            item2._id,
                            item2.cost,
                            item1.services[i].reminder,
                            item2.services[i].reminder,
                            time
                          );
                        }
                        // price
                        if (!item2.services[i].price) {
                          item2.services[i].price = 0;
                        }
                        if (!item1.services[i].price) {
                          item1.services[i].price = 0;
                        }
                        if (
                          item1.services[i].price != item2.services[i].price
                        ) {
                          instance.create_price_change_history(
                            admin,
                            item2.services[i].service,
                            item2._id,
                            item1.services[i].price,
                            item2.services[i].price,
                            time
                          );
                        }

                        // prices
                        if (!(item2.services[i].prices instanceof Array)) {
                          item2.services[i].prices = [];
                        }
                        if (!(item1.services[i].prices instanceof Array)) {
                          item1.services[i].prices = [];
                        }
                        if (
                          item1.services[i].prices != item2.services[i].prices
                        ) {
                          instance.create_prices_change_history(
                            admin,
                            item2.services[i].service,
                            item2._id,
                            item1.services[i].prices,
                            item2.services[i].prices,
                            time
                          );
                        }
                      }
                      // }
                    }
                  }
                )
                  .lean();
              } else {
                instance.send_Error('updating item', JSON.stringify(err));
                reply.error('Error on updating item');
              }
            }
          );
        } else {
          reply.error('Error on finding item');
        }
      }
    )
      .lean();
  };

  instance.post('/items/update_item/:id', version, (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      if (admin) {
        instance.check_sku_and_category(
          request,
          admin.organization,
          (result) => {
            if (result.success) {
              update_item(result.data, request.params.id, admin, reply);
            } else {
              if (result.sku) {
                reply.send({
                  statusCode: 411,
                  message: 'SKU Allready exist',
                });
              } else if (result.barcode) {
                reply.send({
                  statusCode: 412,
                  message: 'Barcode Allready exist',
                });
              } else {
                reply.error('Error on creating item');
              }
            }
          }
        );
      }
    });
  });

  const compare = (a, b) => {
    if (a && b && a.from > b.from) {
      return 1;
    } else if (a && b && b.from > a.from) {
      return -1;
    }
    return 0;
  };

  const decompare = (a, b) => {
    if (a && b && a.from < b.from) {
      return 1;
    } else if (a && b && b.from < a.from) {
      return -1;
    }
    return 1;
  };

  instance.post(
    '/items/update_item_fields/:id',
    {
      ...version,
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          additionalProperties: false,
          properties: {
            cost: { type: 'number' },
            category: { type: 'string' },
            category_name: { type: 'string' },
            price: { type: 'number' },
            in_stock: { type: 'number' },
            reminder: { type: 'number' },
            service: { type: 'string' },
            prices: {
              type: 'array',
              items: {
                type: 'object',
                required: ['from', 'price'],
                properties: {
                  from: { type: 'number' },
                  price: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
    (request, reply) => {
      instance.oauth_admin(request, reply, async (admin) => {
        var updateItem = {};
        if (request.body.cost) {
          updateItem.cost = request.body.cost;
        }
        if (request.body.category) {
          updateItem.category = request.body.category;
          updateItem.category_name = request.body.category_name;
        }
        if (request.body.service) {
          try {
            const services = await instance.services
              .find({ organization: admin.organization })
              .lean();
            const item = await instance.goodsSales
              .findOne({ _id: request.params.id })
              .lean();
            const serviceMap = {};
            if (typeof item.services == typeof []) {
              for (const ser of item.services) {
                serviceMap[ser.service + ''] = ser;
              }
            }
            let prices = [];
            if (request.body.prices instanceof Array) {
              request.body.prices.sort(decompare);

              if (request.body.prices.length > 0) {
                prices.push(request.body.prices[0]);
              }
              if (request.body.prices.length > 1) {
                if (
                  request.body.prices[0].from == 0 &&
                  request.body.prices[1].from != 0
                ) {
                  prices.push(request.body.prices[1]);
                } else if (request.body.prices[0].from != 0) {
                  prices.push(request.body.prices[1]);
                }
              }
              if (request.body.prices.length > 2 && prices.length > 1) {
                if (
                  request.body.prices[1].from == 0 &&
                  request.body.prices[2].from != 0
                ) {
                  prices.push(request.body.prices[2]);
                } else if (request.body.prices[1].from != 0) {
                  prices.push(request.body.prices[2]);
                }
              }

              prices = prices.sort(compare);
            } else {
              request.body.prices = undefined;
            }

            const service_id = request.body.service;
            updateItem.services = [];
            for (const ser of services) {
              if (serviceMap[ser._id + '']) {
                // try {
                //   serviceMap[ser._id + ''] =
                //     serviceMap[ser._id + ''].toObject();
                // } catch (error) {
                //   instance.send_Error('to Object', error.message);
                // }
                if (service_id + '' == ser._id + '') {
                  if (
                    typeof request.body.price == typeof 5 &&
                    request.body.price != serviceMap[ser._id + ''].price
                  ) {
                    updateItem.last_price_change = new Date().getTime();
                    serviceMap[ser._id + ''].last_price_change = new Date().getTime();
                  }
                  if (
                    prices instanceof Array &&
                    serviceMap[ser._id + ''].prices instanceof Array &&
                    !instance.equalPrices(
                      prices,
                      serviceMap[ser._id + ''].prices
                    )
                  ) {
                    updateItem.last_price_change = new Date().getTime();
                    serviceMap[ser._id + ''].last_price_change = new Date().getTime();
                  }
                  updateItem.services.push({
                    ...serviceMap[ser._id + ''],
                    price:
                      request.body.price != undefined
                        ? request.body.price
                        : serviceMap[ser._id + ''].price,
                    prices:
                      request.body.prices != undefined
                        ? prices
                        : serviceMap[ser._id + ''].prices,
                    in_stock:
                      request.body && request.body.in_stock != undefined
                        ? request.body.in_stock
                        : serviceMap[ser._id + ''].in_stock,
                    reminder:
                      request.body && request.body.reminder != undefined
                        ? request.body.reminder
                        : serviceMap[ser._id + ''].reminder,
                  });
                } else {
                  updateItem.services.push(serviceMap[ser._id + '']);
                }
              } else {
                if (service_id + '' == ser._id + '') {
                  updateItem.services.push({
                    service: ser._id,
                    service_name: ser.name,
                    price:
                      request.body.price != undefined
                        ? request.body.price
                        : item.price,
                    prices: request.body.prices != undefined ? prices : [],
                    in_stock:
                      request.body && request.body.in_stock != undefined
                        ? request.body.in_stock
                        : 0,
                    reminder:
                      request.body && request.body.reminder != undefined
                        ? request.body.reminder
                        : 0,
                    last_price_change: new Date().getTime(),
                  });
                } else {
                  updateItem.services.push({
                    service: ser._id,
                    service_name: ser.name,
                    price: item.price,
                    prices: [],
                    in_stock: 0,
                    reminder: 0,
                  });
                }
              }
            }
          } catch (error) {
            return reply.error(error.message);
          }
        }
        console.log(updateItem.services);
        update_item(updateItem, request.params.id, admin, reply, true);
      });
    }
  );

  // get items by category id

  const get_items_by_category_ids = (request, reply, user) => {
    instance.goodsSales.find(
      {
        category: {
          $in: request.body.categories,
        },
        $or: [
          {
            is_track_stock: true,
          },
          {
            use_production: true,
          },
        ],
      },
      { price: 1, sku: 1, barcode: 1, name: 1, services: 1, mxik: 1 },
      (err, goods) => {
        if (err || goods == null) {
          goods = [];
        }
        for (let i = 0; i < goods.length; i++) {
          // try {
          //   goods[i] = goods[i].toObject();
          // } catch (error) {
          //   instance.send_Error('to Object', error.message);
          // }
          for (var s of goods[i].services) {
            if (s.in_stock) {
              if (request.body.service) {
                if (request.body.service == s.service + '') {
                  goods[i].in_stock = s.in_stock;
                }
              }
            }
          }
          if (!goods[i].in_stock) {
            goods[i].in_stock = 0;
          }
          goods[i].services = undefined;
        }
        reply.ok(goods);
      }
    )
      .lean();
  };

  instance.post(
    '/get_items_by_category_ids',
    { version: '1.0.0' },
    (request, reply) => {
      instance.authorization(request, reply, (user) => {
        get_items_by_category_ids(request, reply, user);
      });
    }
  );

  const getUpdatedHandler = (request, reply) => {
    instance.authorization(request, reply, async (user) => {
      try {
        const time = parseInt(request.params.time);
        const service_id = request.headers['accept-service'];
        const service = await instance.services
          .findById(service_id)
          .lean();
        if (!service) {
          return reply.fourorfour('Service');
        }
        const query = {
          organization: user.organization,
          services: {
            $elemMatch: {
              service: { $eq: service._id },
              available: { $eq: true },
            },
          },
          last_updated: {
            $gte: time,
          },
        };

        // const testNumbers = ['+998994056972', '+998933213326'];

        // if (testNumbers.includes(user.phone_number)) {
        //   //   console.log('TEST REQUEST')
        //   return instance.getGoodsSales(request, reply);
        // }
        if (request.params.type == 'without_stock') {
          delete query.last_updated;
          query.last_stock_updated = {
            $gte: time,
          };
        }

        /*
        const $match = {
          $match: query
        }
        const $unwind = {
          $unwind: {
            path: '$services'
          }
        }
        const $matchService = {
          $match: {
            $or: [
              { 'services.service': service._id },
              { 'services.service': service._id + '' }
            ]
          }
        }
        const $group = {
          $group: {
            _id: '$_id',
            organization: {
              $first: '$organization'
            },
            service: {
              $first: '$services.service'
            },
            price: {
              $first: '$services.price'
            },
            price_currency: {
              $first: '$services.price_currency'
            },
            prices: {
              $first: '$services.prices'
            },
            in_stock: {
              $first: '$services.in_stock'
            },
            reminder: {
              $first: '$services.reminder'
            },
            stopped_item: {
              $first: '$stopped_item'
            },
            name: {
              $first: '$name'
            },
            category: {
              $first: '$category'
            },
            sold_by: {
              $first: '$sold_by'
            },
            count_by_type: {
              $first: '$count_by_type'
            },
            barcode_by_type: {
              $first: '$barcode_by_type'
            },
            cost: {
              $first: '$cost'
            },
            sku: {
              $first: '$sku'
            },
            hot_key: {
              $first: '$hot_key'
            },
            barcode: {
              $first: '$barcode'
            },
            composite_item: {
              $first: '$composite_item'
            },
            is_composite_item: {
              $first: '$is_composite_item'
            },
            use_production: {
              $first: '$use_production'
            },
            representation_type: {
              $first: '$representation_type'
            },
            shape: {
              $first: '$shape'
            },
            representation: {
              $first: '$representation'
            },
            item_type: {
              $first: '$item_type'
            },
            has_variants: {
              $first: '$has_variants'
            },
            variant_items: {
              $first: '$variant_items'
            },
            modifiers: {
              $first: '$modifiers'
            },
            // taxes: {

            // }
          }
        }
        const $project = {
          $project: {
            _id: 1,
            organization: {
              
            },
            service: 1,
            price: 1,
            price_currency: 1,
            prices: 1,
            in_stock: 1,
            reminder: 1,
            stopped_item: 1,
            name: 1,
            category: 1,
            sold_by: 1,
            count_by_type: 1,
            barcode_by_type: 1,
            cost: 1,
            sku: 1,
            hot_key: 1,
            barcode: 1,
            composite_item: 1,
            is_composite_item: 1,
            use_production: 1,
            representation_type: 1,
            shape: 1,
            representation: 1,
            item_type: 1,
            has_variants: 1,
            variant_items: 1,
            modifiers: 1,
            __v: '0',
            taxes: [],
          }
        }
        const goods = await instance.goodsSales.aggregate([
          $match,
          $unwind,
          $matchService,
          $group,
          $project
        ]).allowDiskUse(true).exec();
        console.log('Items', goods.length)
        reply.ok(goods)
        */
        let goods = [];
        // if (time) {
        goods = await instance.goodsSales
          .find(query)
          .sort({ last_updated: -1 })
          .limit(100)
          .lean();
        // }
        // else {
        //   goods = await instance.goodsSales.find(query).sort({ last_updated: -1 })
        // }

        for (let i = 0; i < goods.length; i++) {
          for (var s of goods[i].services) {
            if (s.service + '' === request.headers['accept-service'] + '') {
              if (typeof s.in_stock == 'number') {
                s.in_stock = Math.round(s.in_stock * 100) / 100;
              }
              goods[i].in_stock = s.in_stock;
              goods[i].reminder = s.reminder;
              goods[i].price = s.price;
              // try {
              //   goods[i] = goods[i].toObject();
              // } catch (error) {
              //   instance.send_Error('to Object', error.message);
              // }
              goods[i].prices = s.prices;
              goods[i].stopped_item = s.stopped_item;
            }
          }
          var taxes = [];
          if (goods[i].taxes) {
            if (goods[i].taxes.length > 0) {
              for (var t of goods[i].taxes) {
                if (t && t.available) {
                  taxes.push(t.tax_id);
                }
              }
            }
          }
          goods[i].taxes = taxes;
          goods[i].services = undefined;
          if (goods[i].stopped_item == undefined) {
            goods[i].stopped_item = false;
          }
        }
        console.log('Items', goods.length);
        reply.ok(goods);
      } catch (error) {
        reply.error(error.message);
      }
      return reply;
    });
  };

  instance.get(
    '/goods/sales/get_updated/:time',
    {
      version: '1.0.0',
    },
    getUpdatedHandler
  );

  instance.get(
    '/goods/sales/get_updated_without_stock/:time',
    {
      version: '1.0.0',
      preValidation: (req, res, done) => {
        req.params = {
          time: req.params.time,
          type: 'without_stock',
        };
        done();
      },
    },
    getUpdatedHandler
  );

  instance.get(
    '/goods/sales/get_deleted/:time',
    { version: '1.1.0' },
    (request, reply) => {
      instance.authorization(request, reply, async (user) => {
        let time = parseInt(request.params.time);
        let deleted_items = [];
        try {
          deleted_items = await instance.deletedGoodsSales.find({
            organization: user.organization,
            date: { $gte: time },
          });
        } catch (error) { }
        const resp = [];
        for (const it of deleted_items) {
          resp.push(it.item_id);
        }
        reply.ok(resp);
      });
    }
  );

  // export items
  const randimMxik = (is_nds = true) => {
    const mxiks = [
      '01904001001000000',
      '01901001009000000',
      '02201002001000000',
      '01806001001000000',
      '02202002001000000',
      '01704001016000000',
      '01905012001000000',
      '01905002004000000',
      '02001001001000000',
      '03402002003000000',
      '03402002001000000',
    ];
    const mxiks_with_nds = ['02202002001010010'];
    const randomMxikCode = mxiks[Math.floor(Math.random() * mxiks.length)];
    const randomMxikCodeWithNds =
      mxiks_with_nds[Math.floor(Math.random() * mxiks_with_nds.length)];
    return is_nds
      ? randomMxikCodeWithNds
      : randomMxikCode
        ? randomMxikCode
        : '02202002001010010';
  };

  const get_file = async (request, reply, admin) => {
    const service = request.params.service;
    const category = request.params.category;
    const titles = [
      '_id',
      'category_id',
      'sku',
      'name',
      'category',
      'sold_by',
      'option_name1',
      'option_value1',
      'option_name2',
      'option_value2',
      'option_name3',
      'option_value3',
      'price',
      'cost',
      'barcode',
      'count_by_type',
      'barcode_by_type',
      'representation',
      'composite',
      'composite_sku',
      'composite_quality',
      'track_stock',
      'use_production',
      'supplier',
      'default_purchase_cost',
      'mxik',
    ];
    instance.organizations.findOne({ _id: admin.organization }, (err, org) => {
      instance.services.find(
        {
          organization: admin.organization,
        },
        (_, services) => {
          if (services == null) {
            services = [];
          }
          const p = Math.pow(10, 2);
          const serviceObj = {};
          for (var s of services) {
            serviceObj[s._id + ''] = s;
            titles.push('available_for_sale[' + s.name + ']');
            titles.push('price[' + s.name + ']');
            titles.push('prices[' + s.name + ']');
            titles.push('in_stock[' + s.name + ']');
            titles.push('low_stock[' + s.name + ']');
            titles.push('optimal_stock[' + s.name + ']');
          }
          instance.goodsSales.aggregate(
            [
              {
                $match: {
                  organization: admin.organization,
                  item_type: {
                    $ne: 'variant',
                  },
                },
              },
              {
                $lookup: {
                  from: 'goodscategory',
                  localField: 'category',
                  foreignField: '_id',
                  as: 'categObj',
                },
              },
            ],
            async (_, goods) => {
              if (goods == null) {
                goods = [];
              }
              var my_array = [titles];
              var skuObj = {};
              for (const g of goods) {
                skuObj[g._id] = g.sku;
              }
              for (const g of goods) {
                const good = [];
                good.push(g._id);
                good.push(g.category_id);
                good.push(g.sku);
                if (typeof g.name == typeof 'invan') {
                  g.name.replace(',', '.');
                }
                good.push(g.name);

                if (g.categObj && g.categObj.length > 0) {
                  if (typeof g.categObj[0].name == typeof 'invan') {
                    g.categObj[0].name.replace(',', '.');
                  }
                  good.push(g.categObj[0].name);
                } else {
                  if (typeof g.category_name == typeof 'invan') {
                    g.category_name.replace(',', '.');
                  }
                  good.push(g.category_name);
                }

                if (typeof g.sold_by == typeof 'invan') {
                  g.sold_by.replace(',', '.');
                }
                good.push(g.sold_by);

                for (let i = 0; i < 3; i++) {
                  if (
                    g.has_variants &&
                    g.variant_options &&
                    g.variant_options[i]
                  ) {
                    if (
                      typeof g.variant_options[i].option_name == typeof 'invan'
                    ) {
                      g.variant_options[i].option_name.replace(',', '.');
                    }
                    good.push(g.variant_options[i].option_name);
                  } else {
                    good.push('');
                  }
                  good.push('');
                }

                good.push(g.price);
                good.push(Math.round(g.cost * p) / p);
                if (typeof g.barcode == typeof []) {
                  let barcode = '';
                  for (const b of g.barcode) {
                    if (typeof b == typeof 'invan' && b.length > 0) {
                      barcode = barcode + b + ';';
                    }
                  }
                  good.push(barcode);
                } else if (
                  typeof g.barcode == typeof 'invan' &&
                  g.barcode.length > 0
                ) {
                  good.push(g.barcode);
                } else {
                  good.push('');
                }
                good.push(g.count_by_type);
                good.push(g.barcode_by_type);
                if (typeof g.representation == typeof 'invan') {
                  g.representation.replace(',', '.');
                }
                good.push(g.representation);
                if (g.is_composite_item) {
                  good.push('Y');
                } else {
                  good.push('N');
                }
                good.push('');
                good.push('');
                if (g.is_track_stock) {
                  good.push('Y');
                } else {
                  good.push('N');
                }
                if (g.use_production) {
                  good.push('Y');
                } else {
                  good.push('N');
                }

                if (
                  g.primary_supplier_id &&
                  (g.primary_supplier_id + '').length > 0
                ) {
                  try {
                    const supplier = await instance.adjustmentSupplier.findOne({
                      _id: g.primary_supplier_id + '',
                    });

                    if (supplier) {
                      g.primary_supplier_name = supplier.supplier_name.replace(
                        ',',
                        '.'
                      );
                    } else {
                      g.primary_supplier_name = '';
                    }
                  } catch (error) {
                    g.primary_supplier_name = '';
                  }
                }

                good.push(g.primary_supplier_name);
                good.push(g.default_purchase_cost);
                good.push(g.mxik);
                if (typeof g.services == typeof [] && !g.has_variants) {
                  for (var s of g.services) {
                    if (serviceObj[s.service + '']) {
                      if (s.available) good.push('Y');
                      else good.push('N');
                      good.push(s.price);
                      let ind = 0;
                      let prices = '';
                      if (typeof s.prices == typeof []) {
                        for (const pr of s.prices) {
                          if (
                            typeof pr.from == typeof 5 &&
                            typeof pr.price == typeof 5 &&
                            ind < 3
                          ) {
                            prices = prices + pr.from + ';' + pr.price + ';';
                            ind++;
                          }
                        }
                      }

                      good.push(prices);
                      good.push(s.in_stock);
                      good.push(s.low_stock);
                      good.push(s.optimal_stock);
                    }
                  }
                }
                my_array.push(good);
                if (g.is_composite_item) {
                  for (var c of g.composite_items) {
                    var a = new Array(15).fill('');
                    a.push(skuObj[c.product_id + '']);
                    a.push(c.quality);
                    for (
                      let line = 0;
                      line < 4 * (1 + g.services.length);
                      line++
                    ) {
                      a.push('');
                    }
                    my_array.push(a);
                  }
                } else if (g.has_variants) {
                  const items = await instance.goodsSales.find({
                    _id: {
                      $in: g.variant_items,
                    },
                  });
                  for (const it of items) {
                    const good = [];
                    good.push(it.sku);
                    good.push('');
                    good.push('');
                    good.push('');

                    const item_names = it.name.split(' / ');

                    for (let i = 0; i < 3; i++) {
                      good.push('');
                      if (item_names[i]) {
                        good.push(item_names[i]);
                      } else {
                        good.push('');
                      }
                    }

                    good.push(it.price);
                    good.push(it.cost);
                    good.push('');
                    good.push('');
                    good.push('');
                    good.push('');
                    good.push('');
                    good.push('');
                    good.push('');
                    good.push('');
                    good.push(it.default_purchase_cost);

                    if (typeof it.services == typeof []) {
                      for (var s of it.services) {
                        if (serviceObj[s.service + '']) {
                          if (s.available) good.push('Y');
                          else good.push('N');
                          good.push(s.price);
                          let ind = 0;
                          let prices = '';
                          if (typeof s.prices == typeof []) {
                            for (const pr of s.prices) {
                              if (
                                typeof pr.from == typeof 5 &&
                                typeof pr.price == typeof 5 &&
                                ind < 3
                              ) {
                                prices =
                                  prices + pr.from + ';' + pr.price + ';';
                                ind++;
                              }
                            }
                          }
                          good.push(prices);
                          good.push(s.in_stock);
                          good.push(s.low_stock);
                          good.push(s.optimal_stock);
                        }
                      }
                    }
                    my_array.push(good);
                  }
                }
              }
              const CSVString = my_array.join('\n');
              const file = new Date().getTime() + '_ITEMS.csv';
              fs.writeFile('./static/' + file, CSVString, (err) => {
                if (err) {
                  instance.send_Error('writing to file', JSON.stringify(err));
                }
                reply.sendFile(`./${file}`, (err) => {
                  instance.send_Error('on sending file', JSON.stringify(err));
                });
                setTimeout(() => {
                  fs.unlink('./static/' + file, (err) => {
                    if (err) {
                      instance.send_Error(
                        'exported items file',
                        JSON.stringify(err)
                      );
                    }
                  });
                }, 10000);
              });
            }
          );
        }
      );
    });
  };
  const get_file_new = async (request, reply, admin) => {
    var service = request.params.service;
    var category = request.params.category;
    const titles = [
      '_id',
      'category_id',
      'category',
      'sku',
      'name',
      'sold_by',
      'prices',
      'price',
      'cost',
      'barcode',
      'representation',
      // 'option_name1', 'option_value1',
      // 'option_name2', 'option_value2',
      // 'option_name3', 'option_value3', 'supplier',
      // 'count_by_type',
      // 'barcode_by_type',
      // 'composite',
      // 'composite_sku', 'composite_quality',
      // 'use_production', 'default_purchase_cost',
      // 'track_stock'
    ];
    instance.organizations.findOne({ _id: admin.organization }, (err, org) => {
      instance.services.find(
        {
          organization: admin.organization,
        },
        (_, services) => {
          // console.log(services, 'services');
          if (services == null) {
            services = [];
          }
          const serviceObj = {};
          for (var s of services) {
            serviceObj[s._id + ''] = s;
            // titles.push('available_for_sale[' + s.name + ']')
            // titles.push('price[' + s.name + ']')
            // titles.push('prices[' + s.name + ']')
            // titles.push('in_stock[' + s.name + ']')
            // titles.push('low_stock[' + s.name + ']')
            // titles.push('optimal_stock[' + s.name + ']')
          }
          // to_time = new Date().getTime()
          // from_time = to_time - 24 * 60 * 60 * 1000
          instance.goodsSales.aggregate(
            [
              {
                $match: {
                  organization: admin.organization,
                  item_type: { $ne: 'variant' },
                  // last_updated: {
                  //   $gte: from_time,
                  //   $lte: to_time
                  // }
                },
              },
              {
                $lookup: {
                  from: 'goodscategory',
                  localField: 'category',
                  foreignField: '_id',
                  as: 'categObj',
                },
              },
              {
                $project: {
                  _id: 1,
                  name: 1,
                  sold_by: 1,
                  count_by_type: 1,
                  prices: 1,
                  category_id: 1,
                  barcode: 1,
                  representation: 1,
                  sku: 1,
                  category: 1,
                  price: 1,
                  category_name: 1,
                  categObj: 1,
                  has_variants: 1,
                  variant_options: 1,
                  cost: 1,
                  mxik: 1,
                  services: 1,
                },
              },
            ],
            async (_, goods) => {
              // console.log(goods[0], goods.length, 'goods.length');
              if (goods == null) {
                goods = [];
              }
              var my_array = [titles];
              // var skuObj = {}
              // // kerak emasmi deyman)
              // for (const g of goods) {
              //   skuObj[g._id] = g.sku
              // }
              for (const g of goods) {
                const good = [];
                good.push(g._id);
                good.push(g.category_id);
                good.push(g.category_name);
                good.push(g.sku);
                if (typeof g.name == typeof 'invan') {
                  g.name.replace(',', '.');
                }
                good.push(g.name);
                good.push(g.sold_by);
                let prices = '';
                let servicePrice = g.price;
                if (typeof g.services == typeof [] && !g.has_variants) {
                  for (var s of g.services) {
                    if (serviceObj[s.service + '']) {
                      let ind = 0;
                      if (typeof s.prices == typeof []) {
                        servicePrice = s.price ? s.price : servicePrice;
                        for (const pr of s.prices) {
                          if (
                            typeof pr.from == typeof 5 &&
                            typeof pr.price == typeof 5 &&
                            ind < 3
                          ) {
                            prices = prices + pr.from + ';' + pr.price + ';';
                            ind++;
                          }
                        }
                      }
                    }
                  }
                }
                good.push(prices);
                good.push(servicePrice);
                good.push(g.cost);
                if (typeof g.barcode == typeof []) {
                  let barcode = '';
                  for (const b of g.barcode) {
                    if (typeof b == typeof 'invan' && b.length > 0) {
                      barcode = barcode + b + ';';
                    }
                  }
                  good.push(barcode);
                } else if (
                  typeof g.barcode == typeof 'invan' &&
                  g.barcode.length > 0
                ) {
                  good.push(g.barcode);
                } else {
                  good.push('');
                }
                // good.push(g.count_by_type);
                // good.push(g.barcode_by_type);
                if (typeof g.representation == typeof 'invan') {
                  g.representation.replace(',', '.');
                }
                good.push(g.representation);
                // good.push(g.mxik ? g.mxik : '')
                my_array.push(good);
                /*if (g.is_composite_item) {
              for (var c of g.composite_items) {
                var a = new Array(15).fill('')
                a.push(skuObj[c.product_id + ''])
                a.push(c.quality)
                for (let line = 0; line < 4 * (1 + g.services.length); line++) {
                  a.push('')
                }
                my_array.push(a)
              }
            }
            else if (g.has_variants) {
              const items = await instance.goodsSales.find({
                _id: {
                  $in: g.variant_items
                }
              })
              for (const it of items) {
                const good = []
                good.push(it.sku)
                good.push('')
                good.push('')
                good.push('')

                const item_names = it.name.split(' / ')

                for (let i = 0; i < 3; i++) {
                  good.push('')
                  if (item_names[i]) {
                    good.push(item_names[i])
                  }
                  else {
                    good.push('')
                  }
                }

                good.push(it.price)
                good.push(it.cost)
                good.push('')
                good.push('')
                good.push('')
                good.push('')
                good.push('')
                good.push('')
                good.push('')
                good.push('')
                good.push(it.default_purchase_cost)

                if (typeof it.services == typeof []) {
                  for (var s of it.services) {
                    if (serviceObj[s.service + '']) {
                      if (s.available)
                        good.push('Y')
                      else
                        good.push('N')
                      good.push(s.price)
                      let ind = 0
                      let prices = ''
                      if (typeof s.prices == typeof []) {
                        for (const pr of s.prices) {
                          if (typeof pr.from == typeof 5 && typeof pr.price == typeof 5 && ind < 3) {
                            prices = prices + pr.from + ';' + pr.price + ';'
                            ind++;
                          }
                        }
                      }
                      good.push(prices)
                      good.push(s.in_stock)
                      good.push(s.low_stock)
                      good.push(s.optimal_stock)
                    }
                  }
                }
                my_array.push(good)
              }
            }*/
              }
              const CSVString = my_array.join('\n');
              const file = new Date().getTime() + '_ITEMS.csv';
              // var file = org.name + '_ITEMS.csv'
              fs.writeFile('./static/' + file, CSVString, (err) => {
                if (err) {
                  instance.send_Error('writing to file', JSON.stringify(err));
                }
                reply.sendFile('./' + file, (err) => {
                  instance.send_Error('on sending file', JSON.stringify(err));
                });
                setTimeout(() => {
                  fs.unlink('./static/' + file, (err) => {
                    if (err) {
                      instance.send_Error(
                        'exported items file',
                        JSON.stringify(err)
                      );
                    }
                  });
                }, 3000);
              });
            }
          );
        }
      )
        .lean();
    })
      .lean();
  };
  const get_file_desktop = async (request, reply, admin) => {
    instance.organizations.findOne({ _id: admin.organization }, (err, org) => {
      instance.services.find(
        {
          organization: admin.organization,
        },
        (_, services) => {
          // console.log(services, 'services');
          if (services == null) {
            services = [];
          }
          const { from, to } = request.query;
          const date = new Date();
          const from_time = from ? new Date(parseInt(from)) : date;
          date.setDate(date.getDate() + 1);
          const to_time = to ? new Date(parseInt(to)) : date;
          const $match = {
            $match: {
              organization: admin.organization,
              item_type: { $ne: 'variant' },
              // services: { $in: [request.params.service] },
              $or: [
                { updatedAt: { $gte: from_time, $lte: to_time } },
                { last_price_change: { $gte: from_time.getTime(), $lte: to_time.getTime() } },
                { createdAt: { $gte: from_time, $lte: to_time } },
              ],
            },
          };

          instance.goodsSales.aggregate(
            [
              $match,
              {
                $project: {
                  _id: 1,
                  name: 1,
                  sold_by: 1,
                  count_by_type: 1,
                  prices: 1,
                  category_id: 1,
                  barcode: 1,
                  representation: 1,
                  sku: 1,
                  category: 1,
                  price: 1,
                  category_name: 1,
                  cost: { $round: ['$cost', 0] },
                  services: 1,
                  mxik: 1,
                  nds_value: 1,
                },
              },
            ],
            async (_, goods) => {
              // console.log(goods[0], goods.length, 'goods.length');
              if (goods == null) {
                goods = [];
              }

              for (const [index, good] of goods.entries()) {
                serv = good.services.find(
                  (serv) => serv.service + '' == request.params.service
                );
                goods[index].prices =
                  serv && serv.prices ? serv.prices : good.prices;
                goods[index].price =
                  serv && serv.price ? serv.price : good.price;
                goods[index].mxik = good.mxik ? good.mxik : randimMxik();
                goods[index].nds_value = isNaN(parseFloat(good.nds_value)) ? 15 : parseFloat(good.nds_value);

                delete goods[index].services;
              }

              reply.send(goods);
            }
          );
        }
      )
        .lean();
    })
      .lean();
  };

  const get_goods_with_correct_image = async (request, reply, admin) => {
    const service_id = request.params.service;
    const organization_id = request.params.organization;
    const limit = !isNaN(parseInt(request.query.limit))
      ? parseInt(request.query.limit)
      : 10;
    const page = !isNaN(parseInt(request.query.page))
      ? parseInt(request.query.page)
      : 1;

    const { from, to } = request.query;
    const date = new Date();
    const from_time = from ? new Date(parseInt(from)) : date;
    date.setDate(date.getDate() + 1);
    const to_time = to ? new Date(parseInt(to)) : date;

    const $match = {
      $match: {
        organization: organization_id,
        item_type: { $ne: 'variant' },
        $or: [
          { updatedAt: { $gte: from_time, $lte: to_time } },
          { createdAt: { $gte: from_time, $lte: to_time } },
        ],
      },
    };
    // await Subscribe.aggregate([
    //   {
    //     $lookup: {
    //       from: 'doctor_collectiom',
    //       let: { doc_id: '$doctor_id' },
    //       pipeline: [
    //         {
    //           $match: {
    //             $expr: {
    //               $eq: [{ $toString: '$_id' }, '$$doc_id']
    //             }
    //           }
    //         }
    //       ],
    //       as: 'doctors'
    //     }
    //   }])
    const $project = {
      $project: {
        _id: 1,
        sku: 1,
        mxik: 1,
        name: 1,
        price: 1,
        prices: 1,
        barcode: 1,
        sold_by: 1,
        category: 1,
        services: 1,
        nds_value: 1,
        category_id: 1,
        category_name: 1,
        count_by_type: 1,
        representation: 1,
        cost: { $round: ['$cost', 0] },
      },
    };

    const goods = await instance.goodsSales
      .aggregate([
        $match,
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
      goods[index].mxik = good.mxik ? good.mxik : randimMxik();
      goods[index].nds_value = good.nds_value ? good.nds_value : 15;
      delete goods[index].services;

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
      limit: limit,
      page: page,
      total: total,
      data: goods,
    });
  };
  const get_file_mxik = async (request, reply, admin) => {
    const organizationId = request.params.organization;
    const serviceId = request.params.service;
    const titles = [
      '_id',
      'category_id',
      'category',
      'sku',
      'name',
      'sold_by',
      'prices',
      'price',
      'cost',
      'barcode',
      'representation',
      'mxik',
      'nds_value',
    ];
    instance.organizations.findOne({ _id: organizationId }, (err, org) => {
      instance.services.findOne(
        { _id: serviceId, organization: organizationId },
        async (_, service) => {
          if (err | !org) {
            return reply.fourorfour('Organization');
          }
          if (_ | !service) {
            return reply.fourorfour('Service');
          }

          const settingFeatures = await instance.settingFeatures.findOne({
            organization: organizationId,
          });
          // to_time = new Date().getTime()
          // from_time = to_time - 24 * 60 * 60 * 1000
          instance.goodsSales.aggregate(
            [
              {
                $match: {
                  organization: organizationId,
                  item_type: {
                    $ne: 'variant',
                  },
                  // last_updated: {
                  //   $gte: from_time,
                  //   $lte: to_time
                  // }
                },
              },
              {
                $lookup: {
                  from: 'goodscategory',
                  localField: 'category',
                  foreignField: '_id',
                  as: 'categObj',
                },
              },
              {
                $project: {
                  _id: 1,
                  name: 1,
                  sold_by: 1,
                  count_by_type: 1,
                  prices: 1,
                  category_id: 1,
                  barcode: 1,
                  representation: 1,
                  sku: 1,
                  category: 1,
                  price: 1,
                  category_name: 1,
                  categObj: 1,
                  has_variants: 1,
                  variant_options: 1,
                  mxik: 1,
                  cost: 1,
                  services: 1,
                  nds_value: 1,
                },
              },
            ],
            async (_, goods) => {
              if (goods == null) {
                goods = [];
              }
              const my_array = [titles];

              for (const g of goods) {
                const good = [];
                good.push(g._id);
                good.push(g.category_id);
                good.push(g.category_name);
                good.push(g.sku);
                if (typeof g.name == typeof 'invan') {
                  g.name.replace(',', '.');
                }
                good.push(g.name);
                good.push(g.sold_by);
                let prices = '';
                const goodService = g.services.find(
                  (elem) => elem.service == serviceId
                );
                const servicePrice = goodService.price
                  ? goodService.price
                  : g.price;

                let ind = 0;
                let defPrice = servicePrice;
                let from = 0;
                if (settingFeatures.prices) {
                  if (goodService.prices && goodService.prices.length)
                    for (const pr of goodService.prices) {
                      if (
                        typeof pr.from == typeof 5 &&
                        typeof pr.price == typeof 5 &&
                        ind < 3
                      ) {
                        defPrice = pr.price ? pr.price : defPrice;
                        from = pr.from ? pr.from : from;
                        prices = prices + from + ';' + defPrice + ';';
                        ind++;
                      }
                    }
                  else
                    prices = `0;${servicePrice};2;${servicePrice};3;${servicePrice}`;
                } else {
                  prices =
                    0 +
                    ';' +
                    servicePrice +
                    ';' +
                    2 +
                    ';' +
                    servicePrice +
                    ';' +
                    3 +
                    ';' +
                    servicePrice +
                    ';';
                }

                good.push(prices);
                good.push(servicePrice);
                good.push(g.cost);
                if (typeof g.barcode == typeof []) {
                  let barcode = '';
                  for (const b of g.barcode) {
                    if (typeof b == typeof 'invan' && b.length > 0) {
                      barcode = barcode + b + ';';
                    }
                  }
                  good.push(barcode);
                } else if (
                  typeof g.barcode == typeof 'invan' &&
                  g.barcode.length > 0
                ) {
                  good.push(g.barcode);
                } else {
                  good.push('');
                }

                if (typeof g.representation == typeof 'invan') {
                  g.representation.replace(',', '.');
                }
                good.push(g.representation);
                good.push(g.mxik && g.mxik.length ? g.mxik : randimMxik());
                good.push(
                  g.nds_value ? g.nds_value : org.nds_value ? org.nds_value : 15
                );
                my_array.push(good);
              }
              const CSVString = my_array.join('\n');
              const file = new Date().getTime() + '_ITEMS.csv';
              fs.writeFile('./static/' + file, CSVString, (err) => {
                if (err) {
                  instance.send_Error(
                    'writing to file withmxik csv',
                    JSON.stringify(err)
                  );
                }
                reply.sendFile('./' + file, (err) => {
                  instance.send_Error(
                    'on sending file withmxik csv',
                    JSON.stringify(err)
                  );
                });
                setTimeout(() => {
                  fs.unlink('./static/' + file, (err) => {
                    if (err) {
                      instance.send_Error(
                        'exported items file unlink withmxik csv',
                        JSON.stringify(err)
                      );
                    }
                  });
                }, 10000);
              });
            }
          );
        }
      )
        .lean();
    });
  };
  instance.get('/goods/sales/export/:organization/:name', (request, reply) => {
    // instance.authorization(request, reply, (admin) => {
    get_file(request, reply, { organization: request.params.organization });
    // })
  });
  instance.get(
    '/goods/sales-new/export/:organization/:name',
    (request, reply) => {
      // instance.authorization(request, reply, (admin) => {
      //_id, sku, name, sold_by, barcode, representation, prices, category, cost
      get_file_new(request, reply, {
        organization: request.params.organization,
      });
      // })
    }
  );
  instance.get(
    '/goods/sales-mxik/export/:organization/:service',
    (request, reply) => {
      // instance.authorization(request, reply, (admin) => {
      //_id, sku, name, sold_by, barcode, representation, prices, category, cost
      get_file_mxik(request, reply, {
        organization: request.params.organization,
      });
      // })
    }
  );
  const get_deleted_goods = async (request, reply, admin) => {
    const organization = await instance.organizations
      .findOne({ _id: admin.organization })
      .lean();

    if (!organization) return reply.fourorfour('Organization');

    const { from, to } = request.query;

    const $match = {
      $match: {
        $or: {
          organization: admin.organization,
          organization_id: organization._id,
        },
      },
    };
    const date = {};
    if (from) {
      date.$gte = from;
      $match.$match.date = date;
    }
    if (to) {
      date.$lte = to;
      $match.$match.date = date;
    }

    const $project = { $project: { _id: 1 } };

    const goods = await instance.deletedGoodsSales
      .aggregate([$match, $project])
      .exec();

    reply.send(goods);
  };

  instance.get(
    '/goods/sales/deleted/:organization',
    { version: '2.0.0' },
    (request, reply) => {
      instance.authorization(request, reply, (admin) => {
        get_deleted_goods(request, reply, {
          organization: request.params.organization,
        });
      });
    }
  );

  instance.get(
    '/goods/sales/desktop/export/:organization/:service',
    (request, reply) => {
      instance.authorization(request, reply, (admin) => {
        //_id, sku, name, sold_by, barcode, representation, prices, category, cost
        get_file_desktop(request, reply, admin);
      })
    }
  );
  instance.get(
    '/goods/sales/desktop/export/:organization/:service',
    { version: '2.0.0' },
    (request, reply) => {
      instance.authorization(request, reply, (admin) => {
        if (admin.organization + '' !== request.params.organization + '') {
          return reply.error('Forbidden organization');
        }
        if (
          !admin.services.find(
            (serv) =>
              serv.available && serv.service + '' == request.params.service
          )
        ) {
          return reply.error('Forbidden service');
        }
        get_goods_with_correct_image(request, reply, admin);
      });
    }
  );
  const findItemByBarCode = async (request, reply) => {
    const { organization, barCode } = request.params;
    instance.goodsSales.aggregate(
      [
        {
          $match: {
            organization: organization,
            item_type: {
              $ne: 'variant',
            },
            barcode: { $elemMatch: { $eq: barCode } },
            // barcode: { $regex: barCode, $options: "i", }
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            image: 1,
            sale_is_avialable: 1,
            sold_by: 1,
            price: 1,
            prices: 1,
            price_currency: 1,
            barcode: 1,
            representation: 1,
            representation_type: 1,
            sku: 1,
            services: {
              _id: 1,
              price: 1,
              price_currency: 1,
              prices: 1,
              in_stock: 1,
              variant_name: 1,
              stopped_item: 1,
              service: 1,
              available: 1,
              service_name: 1,
            },
            category_name: 1,
            category: 1,
          },
        },
      ],
      async (_, goods) => {
        if (goods == null) {
          goods = [];
        }
        const item = goods[0];
        if (!item) return reply.code(404).send('not found')
        const item_detail = {
          _id: item._id,
          name: item.name,
          sold_by: item.sold_by,
          sku: item.sku,
          barcode: item.barcode,
          representation: item.representation,
          representation_type: item.representation_type,
          services: item.services,
          price: 0,
          prices: [],
          in_stock: 0,
        };
        // for (const [index, good] of goods.entries()) {
        //   goods[index].representation = `pos.inone.uz/api/static/${good.image}`
        // }
        return reply.ok(item_detail);
      }
    );
  };
  instance.get(
    '/item/get-by-barcode/:organization/:barCode',
    (request, reply) => {
      // instance.authorization(request, reply, (admin) => {
      findItemByBarCode(request, reply);
      // })
    }
  );
  const findItemByBarCodeTiin = async (request, reply) => {
    const { barCode } = request.params;
    const organizations = [
      '5f5641e8dce4e706c062837a',
      '61ae2917a914c3ba42fc626f',
    ];
    instance.goodsSales.aggregate(
      [
        {
          $match: {
            organization: { $in: organizations },
            item_type: {
              $ne: 'variant',
            },
            barcode: { $elemMatch: { $eq: barCode } },
            // barcode: { $regex: barCode, $options: "i", }
          },
        },
        {
          $project: {
            name: 1,
            image: 1,
            sale_is_avialable: 1,
            sold_by: 1,
            price: 1,
            prices: 1,
            price_currency: 1,
            barcode: 1,
            representation: 1,
            representation_type: 1,
            sku: 1,
            services: {
              _id: 1,
              price: 1,
              price_currency: 1,
              prices: 1,
              in_stock: 1,
              variant_name: 1,
              stopped_item: 1,
              service: 1,
              available: 1,
              service_name: 1,
            },
            category_name: 1,
            category: 1,
            mxik: 1,
          },
        },
      ],
      async (_, goods) => {
        if (goods == null) {
          goods = [];
        }
        // for (const s of item.services) {
        //   if (s.service + '' == service_id + '') {
        //     item_detail.price = s.price;
        //     item_detail.prices = s.prices;
        //     item_detail.in_stock = s.in_stock;
        //   }
        // }
        // return item_detail;
        // for (const [index, good] of goods.entries()) {
        //   goods[index].representation = `http://pos.inone.uz/api/static/${good.image}`
        // }
        return reply.ok(goods);
      }
    );
  };
  // instance.get('/tiin/item/get-by-barcode/:barCode', (request, reply) => {
  //   // instance.authorization(request, reply, (admin) => {
  //   findItemByBarCodeTiin(request, reply)
  //   // })
  // })

  instance.get('/goods/tiin', { version: '2.0.0' }, async (request, reply) => {
    const goods = await instance.goodsSales.aggregate([
      {
        $match: {
          organization: '5f5641e8dce4e706c062837a',
          show_on_bot: true,
          has_variants: false,
        },
      },
      {
        $project: {
          name: 1,
          services: {
            service_id: 1,
            service_name: 1,
            price_currency: 1,
            in_stock: {
              $max: [
                { $first: "$services.in_stock" },
                0,
              ]
            },
            sku: 1,
            price: 1,
            min_price: {
              $min: {
                $arrayElemAt: ['$services.prices.price', 0],
              },
            },
            max_price: {
              $max: {
                $arrayElemAt: ['$services.prices.price', 0],
              },
            },
          },
          barcode: 1,
          sku: 1,
          type: '$sold_by',
          // category_name: 1,
          // categories: 1,
        },
      },
    ]);

    return reply.ok(goods && goods.length ? goods : []);
  });
  const searchMxikSchema = {
    body: {
      type: 'array',
      items: {
        type: 'string',
        minLength: 1,
      },
    },
  };
  instance.post(
    '/goods/search/mxik',
    { version: '1.0.0', schema: searchMxikSchema },
    async (request, reply) => {
      const body = request.body;
      const goods = await instance.soliqgoods
        .findOne({
          barcode: { $in: body },
        })
        .lean();

      return reply.ok(goods);
    }
  );

  instance.delete(
    '/goods/sales/delete_group',
    { version: '2.0.0' },
    async (request, reply) => {
      instance.authorization(request, reply, async (user) => {
        const deleted_items = [];
        const items = request.body.indexes;
        try {
          for (const item of items) {
            deleted_items.push({
              organization: user.organization,
              organization_id: user.organization,
              item_id: item._id,
              date: new Date().getTime(),
            });
            const variant_items = await instance.goodsSales
              .find(
                {
                  organization: user.organization,
                  _id: { $in: item.variant_items },
                },
                { _id: 1 }
              )
              .lean();
            for (const v of variant_items) {
              deleted_items.push({
                organization: user.organization,
                organization_id: user.organization,
                item_id: v._id,
                date: new Date().getTime(),
              });
            }
            await instance.goodsSales.deleteMany({
              organization: user.organization,
              _id: { $in: item.variant_items },
            });
          }
          await instance.deletedGoodsSales.insertMany(deleted_items);

          return reply.ok(true);
        } catch (error) {
          reply.error(error.message);
        }
      });
    }
  );
  next();
};
