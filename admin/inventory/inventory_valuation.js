const fp = require('fastify-plugin');

async function inventoryValuationResult({ limit, page, supplier_id, organization, service }, instance,) {

  const query = {
    $match: {
      organization,
    },
  };

  if (supplier_id) {
    try {
      query["$match"].primary_supplier_id = instance.ObjectId(supplier_id);
    } catch (error) { }
  }
  const unwindServices = {
    $unwind: {
      path: "$services",
    },
  };

  const projectPrimaryFields = {
    $project: {
      name: "$name",
      has_variants: "$has_variants",
      item_type: "$item_type",
      barcode: "$barcode",
      sku: "$sku",
      cost: "$cost",
      variant_items: "$variant_items",
      service: "$services.service",
      in_stock: {
        $max: [0, "$services.in_stock"],
        // $max: [0, { $round: ["$services.in_stock", 3] }],
      },
      inventory: {
        $multiply: [
          { $max: ["$cost", 0] },
          { $max: ["$services.in_stock", 0] },
        ],
      },
      retail: {
        $multiply: [
          { $max: ["$services.price", 0] },
          { $max: ["$services.in_stock", 0] },
        ],
      },
      potential: {
        $subtract: [
          {
            $multiply: [
              { $max: ["$services.price", 0] },
              { $max: ["$services.in_stock", 0] },
            ],
          },
          {
            $multiply: [
              { $max: ["$cost", 0] },
              { $max: ["$services.in_stock", 0] },
            ],
          },
        ],
      },
    },
  };

  const joinItems = {
    $group: {
      _id: "$_id",
      name: {
        $first: "$name",
      },
      has_variants: {
        $first: "$has_variants",
      },
      item_type: {
        $first: "$item_type",
      },
      barcode: {
        $first: "$barcode",
      },
      sku: {
        $first: "$sku",
      },
      variant_items: {
        $first: "$variant_items",
      },
      cost: {
        $first: "$cost",
      },
      inventory: {
        $sum: "$inventory",
      },
      in_stock: {
        $sum: "$in_stock",
      },
      retail: {
        $sum: "$retail",
      },
      potential: {
        $sum: "$potential",
      },
    },
  };
  try {
    service = instance.ObjectId(service);
  } catch (error) { }

  let is_service = {
    $and: [
      { $ne: ["$service", service] },
      { $ne: ["$service", service + ""] },
    ],
  };
  service = service + "";
  if (typeof service == typeof "invan" && service != "") {
    try {
      service = instance.ObjectId(service);
    } catch (error) { }
    joinItems["$group"] = {
      _id: "$_id",
      name: {
        $first: "$name",
      },
      cost: {
        $first: "$cost",
      },
      has_variants: {
        $first: "$has_variants",
      },
      item_type: {
        $first: "$item_type",
      },
      barcode: {
        $first: "$barcode",
      },
      sku: {
        $first: "$sku",
      },
      variant_items: {
        $first: "$variant_items",
      },
      in_stock: {
        $sum: {
          $cond: [is_service, 0, "$in_stock"],
        },
      },
      inventory: {
        $sum: {
          $cond: [is_service, 0, "$inventory"],
        },
      },
      retail: {
        $sum: {
          $cond: [is_service, 0, "$retail"],
        },
      },
      potential: {
        $sum: {
          $cond: [is_service, 0, "$potential"],
        },
      },
    };
  }
  const items = await instance.goodsSales
    .aggregate([
      query,
      {
        $skip: limit * (page - 1),
      },
      {
        $limit: limit,
      },
      unwindServices,
      projectPrimaryFields,
      joinItems,
      {
        $sort: {
          _id: 1,
        },
      },
    ])
    .allowDiskUse(true)
    .exec();

  const calculateTotal = {
    $group: {
      _id: null,
      inventory: {
        $sum: {
          $cond: ["$has_variants", 0, "$inventory"],
        },
      },
      retail: {
        $sum: {
          $cond: ["$has_variants", 0, "$retail"],
        },
      },
      potential: {
        $sum: {
          $cond: ["$has_variants", 0, "$potential"],
        },
      },
    },
  };

  service = service + "";
  if (typeof service == typeof "invan" && service != "") {
    try {
      service = instance.ObjectId(service);
    } catch (error) { }
    calculateTotal["$group"] = {
      _id: null,
      inventory: {
        $sum: {
          $cond: [{ $or: [is_service, "$has_variants"] }, 0, "$inventory"],
        },
      },
      retail: {
        $sum: {
          $cond: [{ $or: [is_service, "$has_variants"] }, 0, "$retail"],
        },
      },
      potential: {
        $sum: {
          $cond: [{ $or: [is_service, "$has_variants"] }, 0, "$potential"],
        },
      },
    };
  }

  let total = await instance.goodsSales
    .aggregate([
      query,
      unwindServices,
      projectPrimaryFields,
      calculateTotal,
    ])
    .allowDiskUse(true)
    .exec();
  if (!(total instanceof Array)) {
    total = [];
  }
  if (total.length == 0) {
    total = [
      {
        inventory: 0,
        margin: 0,
        page: 1,
        potential: 0,
        retail: 0,
      },
    ];
  }
  const total_items = await instance.goodsSales
    .countDocuments(query["$match"])
    .exec();

  return {
    ...total[0],
    total: total_items,
    margin:
      (total[0].inventory != 0 ? total[0].potential / total[0].inventory : 0) *
      100,
    page: Math.ceil(total_items / limit),
    data: items,
  }
}

async function inventoryValuationResultByPrimarySupplier({ limit, page, organization, search, service }, instance, services) {

  const query = {
    organization: organization,
    // primary_supplier_id: { $exists: true },
    // primary_supplier_id: { $ne: null },
    // primary_supplier_id: { $ne: '' },
  };

  if (search) {
    query.supplier_name = {
      $regex: search,
      $options: 'i'
    }
  }

  const unwindServices = { $unwind: { path: "$services" } };

  const projectPrimaryFields = {
    $project: {
      cost: "$cost",
      primary_supplier_id: "$primary_supplier_id",
      service: "$services.service",
      in_stock: {
        $max: [0, "$services.in_stock"],
        // $max: [0, { $round: ["$services.in_stock", 3] }],
      },
      inventory: {
        $multiply: [
          { $max: ["$cost", 0] },
          { $max: ["$services.in_stock", 0] },
        ],
      },
      retail: {
        $multiply: [
          { $max: ["$services.price", 0] },
          { $max: ["$services.in_stock", 0] },
        ],
      },
      potential: {
        $subtract: [
          {
            $multiply: [
              { $max: ["$services.price", 0] },
              { $max: ["$services.in_stock", 0] },
            ],
          },
          {
            $multiply: [
              { $max: ["$cost", 0] },
              { $max: ["$services.in_stock", 0] },
            ],
          },
        ],
      },
    },
  };

  const calculateTotal = {
    $group: {
      _id: null,
      inventory: {
        $sum: {
          $cond: ["$has_variants", 0, "$inventory"],
        },
      },
      retail: {
        $sum: {
          $cond: ["$has_variants", 0, "$retail"],
        },
      },
      potential: {
        $sum: {
          $cond: ["$has_variants", 0, "$potential"],
        },
      },
    },
  };

  const filter_goods = {
    $expr: {
      $and: [
        { $eq: ['$primary_supplier_id', '$$supplier_id'] },
        { $eq: ['$organization', '$$organization'] },
      ],
    },
  }

  const filter_goods_service = service
    ? ({
      $expr: {
        $or: [
          { $eq: ['$services.service', service] },
          {
            $eq: ['$services.service', instance.ObjectId(service)],
          },
        ],
      },
    })
    : ({
      $expr: {
        $or: [
          { $in: ['$services.service', services.map(s => s + '')] },
          { $in: ['$services.service', services] },
        ],
      },
    })

  const suppliers = await instance.adjustmentSupplier.aggregate([
    { $match: query },
    { $skip: (page - 1) * limit },
    { $limit: limit },
    {
      $lookup: {
        from: 'goodssales',
        let: { supplier_id: '$_id', organization: organization },
        pipeline: [
          {
            $match: filter_goods,
          },
          unwindServices,
          { $match: filter_goods_service },
          projectPrimaryFields,
          calculateTotal,
        ],
        as: 'goods'
      }
    },
    {
      $project: {
        _id: 1,
        organization: 1,
        supplier_name: 1,
        phone_number: 1,
        website: 1,
        email: 1,
        contact: 1,
        balance: 1,
        balance_usd: 1,
        balance_currency: 1,
        inventory: { $first: '$goods.inventory' },
        retail: { $first: '$goods.retail' },
        potential: { $first: '$goods.potential' },
      }
    }
  ])

  const supplier_ids = suppliers.map(s => s._id)
  const query_goods = {
    organization: organization,
    primary_supplier_id: { $in: supplier_ids },
  }
  if (service)
    query_goods.service = service

  let total = await instance.goodsSales
    .aggregate([
      // { $match: query },
      { $match: query_goods },
      unwindServices,
      projectPrimaryFields,
      calculateTotal,
    ])
    .allowDiskUse(true)
    .exec();

  if (!(total instanceof Array) || total.length == 0) {
    total = [{
      inventory: 0,
      margin: 0,
      page: 1,
      potential: 0,
      retail: 0,
    }];
  }

  // const total_suppliers = await instance.adjustmentSupplier
  //   .countDocuments({
  //     // organization: organization,
  //     ...query,
  //     is_deleted: { $ne: true },
  //   })

  // const total_suppliers = (await instance.goodsSales
  //   .aggregate([
  //     { $match: query_goods },
  //     unwindServices,
  //     projectPrimaryFields,
  //     calculateTotal,
  //     {
  //       $count: "total",
  //     },
  //   ]))[0]
  //   .total

  const total_last_xullass_qaytakorish_krk = await instance.adjustmentSupplier.countDocuments(query)
  return {
    ...total[0],
    total: total_last_xullass_qaytakorish_krk,
    // margin:
    //   (total[0].inventory != 0 ? total[0].potential / total[0].inventory : 0) *
    //   100,
    page: page,
    limit: limit,
    data: suppliers,
  }
}

module.exports = fp((instance, options, next) => {

  instance.decorate('inventory_valuation_result', inventoryValuationResult)

  const bodySchema = {
    body: {
      type: "object",
      properties: {
        limit: { type: "integer", minimum: 1 },
        page: { type: "integer", minimum: 1 },
        service: { type: "string" },
        supplier_id: { type: "string" },
      },
      required: ["limit", "page", "service", "supplier_id"],
      additionalProperties: false,
    },
  };

  instance.post(
    "/inventory/valuation",
    {
      ...options.version,
      schema: bodySchema
    },
    async (request, reply) => {
      instance.authorization(request, reply, async () => {
        try {
          const { limit, page, supplier_id } = request.body;
          let { service } = request.body;
          const user = request.user;

          const result = await inventoryValuationResult({
            limit, page,
            supplier_id,
            organization: user.organization,
            service
          }, instance)

          reply.ok(result);

          // const query = {
          //   $match: {
          //     organization: user.organization,
          //   },
          // };

          // if (typeof supplier_id == typeof "invan" && supplier_id != "") {
          //   try {
          //     query["$match"].primary_supplier_id = instance.ObjectId(supplier_id);
          //   } catch (error) { }
          // }

          // const unwindServices = {
          //   $unwind: {
          //     path: "$services",
          //   },
          // };

          // const projectPrimaryFields = {
          //   $project: {
          //     name: "$name",
          //     has_variants: "$has_variants",
          //     item_type: "$item_type",
          //     barcode: "$barcode",
          //     sku: "$sku",
          //     cost: "$cost",
          //     variant_items: "$variant_items",
          //     service: "$services.service",
          //     in_stock: {
          //       $max: [0, "$services.in_stock"],
          //     },
          //     inventory: {
          //       $multiply: [
          //         { $max: ["$cost", 0] },
          //         { $max: ["$services.in_stock", 0] },
          //       ],
          //     },
          //     retail: {
          //       $multiply: [
          //         { $max: ["$services.price", 0] },
          //         { $max: ["$services.in_stock", 0] },
          //       ],
          //     },
          //     potential: {
          //       $subtract: [
          //         {
          //           $multiply: [
          //             { $max: ["$services.price", 0] },
          //             { $max: ["$services.in_stock", 0] },
          //           ],
          //         },
          //         {
          //           $multiply: [
          //             { $max: ["$cost", 0] },
          //             { $max: ["$services.in_stock", 0] },
          //           ],
          //         },
          //       ],
          //     },
          //   },
          // };

          // const joinItems = {
          //   $group: {
          //     _id: "$_id",
          //     name: {
          //       $first: "$name",
          //     },
          //     has_variants: {
          //       $first: "$has_variants",
          //     },
          //     item_type: {
          //       $first: "$item_type",
          //     },
          //     barcode: {
          //       $first: "$barcode",
          //     },
          //     sku: {
          //       $first: "$sku",
          //     },
          //     variant_items: {
          //       $first: "$variant_items",
          //     },
          //     cost: {
          //       $first: "$cost",
          //     },
          //     inventory: {
          //       $sum: "$inventory",
          //     },
          //     in_stock: {
          //       $sum: "$in_stock",
          //     },
          //     retail: {
          //       $sum: "$retail",
          //     },
          //     potential: {
          //       $sum: "$potential",
          //     },
          //   },
          // };
          // try {
          //   service = instance.ObjectId(service);
          // } catch (error) { }

          // let is_service = {
          //   $and: [
          //     { $ne: ["$service", service] },
          //     { $ne: ["$service", service + ""] },
          //   ],
          // };
          // service = service + "";
          // if (typeof service == typeof "invan" && service != "") {
          //   try {
          //     service = instance.ObjectId(service);
          //   } catch (error) { }
          //   joinItems["$group"] = {
          //     _id: "$_id",
          //     name: {
          //       $first: "$name",
          //     },
          //     cost: {
          //       $first: "$cost",
          //     },
          //     has_variants: {
          //       $first: "$has_variants",
          //     },
          //     item_type: {
          //       $first: "$item_type",
          //     },
          //     barcode: {
          //       $first: "$barcode",
          //     },
          //     sku: {
          //       $first: "$sku",
          //     },
          //     variant_items: {
          //       $first: "$variant_items",
          //     },
          //     in_stock: {
          //       $sum: {
          //         $cond: [is_service, 0, "$in_stock"],
          //       },
          //     },
          //     inventory: {
          //       $sum: {
          //         $cond: [is_service, 0, "$inventory"],
          //       },
          //     },
          //     retail: {
          //       $sum: {
          //         $cond: [is_service, 0, "$retail"],
          //       },
          //     },
          //     potential: {
          //       $sum: {
          //         $cond: [is_service, 0, "$potential"],
          //       },
          //     },
          //   };
          // }

          // const items = await instance.goodsSales
          //   .aggregate([
          //     query,
          //     {
          //       $skip: limit * (page - 1),
          //     },
          //     {
          //       $limit: limit,
          //     },
          //     unwindServices,
          //     projectPrimaryFields,
          //     joinItems,
          //     {
          //       $sort: {
          //         _id: 1,
          //       },
          //     },
          //   ])
          //   .allowDiskUse(true)
          //   .exec();

          // const calculateTotal = {
          //   $group: {
          //     _id: null,
          //     inventory: {
          //       $sum: {
          //         $cond: ["$has_variants", 0, "$inventory"],
          //       },
          //     },
          //     retail: {
          //       $sum: {
          //         $cond: ["$has_variants", 0, "$retail"],
          //       },
          //     },
          //     potential: {
          //       $sum: {
          //         $cond: ["$has_variants", 0, "$potential"],
          //       },
          //     },
          //   },
          // };

          // service = service + "";
          // if (typeof service == typeof "invan" && service != "") {
          //   try {
          //     service = instance.ObjectId(service);
          //   } catch (error) { }
          //   calculateTotal["$group"] = {
          //     _id: null,
          //     inventory: {
          //       $sum: {
          //         $cond: [{ $or: [is_service, "$has_variants"] }, 0, "$inventory"],
          //       },
          //     },
          //     retail: {
          //       $sum: {
          //         $cond: [{ $or: [is_service, "$has_variants"] }, 0, "$retail"],
          //       },
          //     },
          //     potential: {
          //       $sum: {
          //         $cond: [{ $or: [is_service, "$has_variants"] }, 0, "$potential"],
          //       },
          //     },
          //   };
          // }

          // let total = await instance.goodsSales
          //   .aggregate([
          //     query,
          //     unwindServices,
          //     projectPrimaryFields,
          //     calculateTotal,
          //   ])
          //   .allowDiskUse(true)
          //   .exec();
          // if (!(total instanceof Array)) {
          //   total = [];
          // }
          // if (total.length == 0) {
          //   total = [
          //     {
          //       inventory: 0,
          //       margin: 0,
          //       page: 1,
          //       potential: 0,
          //       retail: 0,
          //     },
          //   ];
          // }
          // const total_items = await instance.goodsSales
          //   .countDocuments(query["$match"])
          //   .exec();

          try {
            reply.ok({
              ...total[0],
              total: total_items,
              margin:
                (total[0].inventory != 0 ? total[0].potential / total[0].inventory : 0) *
                100,
              page: Math.ceil(total_items / limit),
              data: items,
            });
          } catch (error) {
            reply.error(error.message);
          }
        } catch (error) {
          reply.error(error.message)
        }
        return reply;
      })

      return reply;
    }
  );
  instance.get(
    "/inventory/valuation/by_supplier",
    { version: '2.0.0' },
    async (request, reply) => {
      instance.authorization(request, reply, async () => {
        try {
          const { service, search } = request.query;
          const limit = !isNaN(parseInt(request.query.limit))
            ? parseInt(request.query.limit)
            : 10
          const page = !isNaN(parseInt(request.query.page))
            ? parseInt(request.query.page)
            : 1

          const user = request.user;

          const user_available_services = user.services.map(serv => serv.service)
          if (service && !user_available_services.find(serv => serv + '' === service)) {
            return reply.code(403).send('Acces denied')
          }
          const result = await inventoryValuationResultByPrimarySupplier({
            limit, page,
            organization: user.organization,
            search, service,
          },
            instance,
            service ? [service] : user_available_services,
          )

          return reply.ok(result);
        } catch (error) {
          reply.error(error.message)
        }
        return reply;
      })

      return reply;
    }
  );
  next();
});
