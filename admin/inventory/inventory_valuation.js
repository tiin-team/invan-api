const fp = require('fastify-plugin');

async function inventoryValuationResult({ limit, page, supplier_id, organization, service }, instance,) {

  const query = { $match: { organization } };

  if (supplier_id) {
    try {
      query["$match"].primary_supplier_id = instance.ObjectId(supplier_id);
    } catch (error) { }
  }
  const unwindServices = { $unwind: { path: "$services" } };

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

  service = instance.ObjectId(service);

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
      { $skip: limit * (page - 1) },
      { $limit: limit },
      unwindServices,
      projectPrimaryFields,
      joinItems,
      { $sort: { _id: 1 } },
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
  if (!(total instanceof Array) || total.length == 0) {
    total = [{
      inventory: 0,
      margin: 0,
      page: 1,
      potential: 0,
      retail: 0,
    }];
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
async function inventoryValuationResultPartiation({ limit, page, supplier_id, organization, service }, instance, group_by,) {
  const query = {
    $match: {
      organization: organization,
      suppliers: { $exists: true },
    }
  };

  const unwindSuppliers = { $unwind: { path: "$suppliers" } };

  const $project1 = {
    $project: {
      name: "$name",
      has_variants: "$has_variants",
      item_type: "$item_type",
      barcode: "$barcode",
      sku: "$sku",
      cost: "$cost",
      // variant_items: "$variant_items",
      service: "$suppliers.service",
      in_stock: { $max: [0, "$suppliers.in_stock"] },
      suppliers: "$suppliers",
    }
  }
  const projectPrimaryFields = {
    $project: {
      name: "$name",
      has_variants: "$has_variants",
      item_type: "$item_type",
      barcode: "$barcode",
      sku: "$sku",
      cost: "$cost",
      // variant_items: "$variant_items",
      service: "$suppliers.service",
      in_stock: { $max: [0, "$suppliers.stock"] },
      suppliers: "$suppliers",
      inventory: {
        $multiply: [
          { $max: ["$cost", 0] },
          { $max: ["$suppliers.stock", 0] },
        ],
      },
      // retail: {
      //   $multiply: [
      //     { $max: ["$services.price", 0] },
      //     { $max: ["$suppliers.in_stock", 0] },
      //   ],
      // },
      // potential: {
      //   $subtract: [
      //     {
      //       $multiply: [
      //         { $max: ["$services.price", 0] },
      //         { $max: ["$services.in_stock", 0] },
      //       ],
      //     },
      //     {
      //       $multiply: [
      //         { $max: ["$cost", 0] },
      //         { $max: ["$services.in_stock", 0] },
      //       ],
      //     },
      //   ],
      // },
    }
  };

  if (supplier_id && supplier_id.length == 24 && service && service.length == 24) {
    $project1.$project.suppliers = {
      $filter: {
        input: '$suppliers',
        as: 'supplier',
        cond: {
          $and: {
            $eq: [{ $toString: '$$supplier.supplier_id' }, supplier_id],
            $eq: [{ $toString: '$$supplier.service_id' }, service],
          }
        }
      }
    }
  } else if (service && service && service.length == 24) {
    $project1.$project.suppliers = {
      $filter: {
        input: '$suppliers',
        as: 'supplier',
        cond: { $eq: [{ $toString: '$$supplier.service_id' }, service] }
      }
    }
  } else if (supplier_id && supplier_id.length == 24) {
    $project1.$project.suppliers = {
      $filter: {
        input: '$suppliers',
        as: 'supplier',
        cond: { $eq: [{ $toString: '$$supplier.supplier_id' }, supplier_id] }
      }
    }
  }

  const $group = {
    $group: {
      _id: group_by == 'supplier' ? '$suppliers.supplier_id' : '_id',
      supplier_id: { $first: '$suppliers.supplier_id' },
      supplier_name: { $first: '$suppliers.supplier_name' },
      service_name: { $first: '$suppliers.service_name' },
      service_id: { $first: '$suppliers.service_id' },
      product_id: { $first: '$_id' },
      product_name: { $first: "$name" },
      // has_variants: { $first: "$has_variants" },
      // item_type: { $first: "$item_type" },
      // barcode: { $first: "$barcode" },
      sku: { $first: "$sku" },
      cost: { $first: "$cost" },
      // variant_items: { $first: "$variant_items" },
      in_stock: { $sum: { $max: ["$suppliers.stock", 0] } },
      inventory: { $first: "$inventory" },
    }
  }

  const items = await instance.goodsSales
    .aggregate([
      query,
      { $skip: limit * (page - 1) },
      { $limit: limit },
      $project1,
      unwindSuppliers,
      projectPrimaryFields,
      $group,
      // joinItems,
      { $sort: { _id: 1 } },
    ])
    .allowDiskUse(true)
    .exec();

  const total_items = await instance.goodsSales
    .countDocuments(query["$match"])
    .exec();

  return {
    total: total_items,
    page: Math.ceil(total_items / limit),
    data: items,
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
    "/inventory/valuation",
    {
      version: '2.0.0',
      schema: {
        query: {
          type: "object",
          properties: {
            limit: { type: "integer", minimum: 1 },
            page: { type: "integer", minimum: 1 },
            service: { type: "string" },
            supplier_id: { type: "string" },
          },
          required: [],
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      instance.authorization(request, reply, async () => {
        try {
          const { supplier_id, service } = request.query;
          const limit = isNaN(parseInt(request.query.limit))
            ? 10
            : parseInt(request.query.limit)
          const page = isNaN(parseInt(request.query.page))
            ? 1
            : parseInt(request.query.page)

          const user = request.user;

          const result = await inventoryValuationResultPartiation({
            limit, page,
            supplier_id,
            organization: user.organization,
            service
          }, instance, 'supplier')

          reply.ok(result);
        } catch (error) {
          reply.error(error.message)
        }
        return reply;
      })

      return reply;
    }
  );

  instance.get(
    "/inventory/valuation/:supplier_id",
    {
      version: '2.0.0',
      schema: {
        query: {
          type: "object",
          properties: {
            limit: { type: "integer", minimum: 1 },
            page: { type: "integer", minimum: 1 },
            service: { type: "string" },
            supplier_id: { type: "string" },
          },
          required: [],
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      instance.authorization(request, reply, async () => {
        try {
          const supplier_id = request.params.supplier_id
          const { service } = request.query;
          const limit = isNaN(parseInt(request.query.limit))
            ? 10
            : parseInt(request.query.limit)
          const page = isNaN(parseInt(request.query.page))
            ? 1
            : parseInt(request.query.page)

          const user = request.user;

          const result = await inventoryValuationResultPartiation({
            limit, page,
            supplier_id,
            organization: user.organization,
            service
          }, instance, 'product')

          reply.ok(result);
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
