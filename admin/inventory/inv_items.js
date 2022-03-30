
module.exports = ((instance, _, next) => {

  const listOfItemSchema = {
    schema: {
      body: {
        type: 'object',
        properties: {
          search: {
            type: 'string',
            default: ''
          },
          service: {
            type: 'string'
          }
        },
        required: ['search', 'service']
      },
      params: {
        type: 'object',
        properties: {
          limit: { type: 'integer', minimum: 1, maximum: 100 },
          page: { type: 'integer', minimum: 1 }
        },
        required: ['limit', 'page']
      }
    }
  }

  instance.post(
    '/items/list_of_inv_items/:limit/:page',
    {
      ...listOfItemSchema,
      version: '1.0.0'
    },
    (request, reply) => {

      instance.authorization(request, reply, async () => {
        try {
          const user = request.user
          const { limit, page } = request.params;
          let { service, search } = request.body;
          search = instance.make_regexable_text(search)

          const query = {
            organization: user.organization,
            has_variants: {
              $ne: true
            }
          }

          if (typeof search == typeof 'invan' && search != '') {
            query['$or'] = [
              {
                name: { $regex: search, $options: 'i' }
              },
              {
                parent_name: { $regex: search, $options: 'i' }
              },
              {
                name: { $regex: (instance.converter(search) != "" ? instance.converter(search) : "salom_dunyo_ishla_qale"), $options: 'i' }
              },
              {
                parent_name: { $regex: (instance.converter(search) != "" ? instance.converter(search) : "salom_dunyo_ishla_qale"), $options: 'i' }
              },
              {
                barcode: { $regex: search, $options: 'i' }
              },
              {
                barcode_by_type: { $regex: search, $options: 'i' }
              }
            ]
            if (+search) {
              query['$or'].push({
                sku: +search
              })
            }
          }

          const items = await instance.goodsSales.find(query)
            .skip(limit * (page - 1))
            .limit(limit)
            .sort({ _id: 1 })
            .exec()

          const goods = []
          for (const it of items) {
            if (it.item_type == 'variant') {
              it.name = it.parent_name ? `${it.parent_name} ( ${it.name} )` : it.name
            }
            if (it.services instanceof Array && typeof service == typeof 'invan' && service != '') {
              for (const s of it.services) {
                if (s.service + '' == service + '') {
                  it.in_stock = s.in_stock
                  if (s.prices instanceof Array) {
                    it.prices = s.prices
                  }
                  else {
                    it.prices = []
                  }
                  it.reminder = s.reminder
                  it.price_currency = s.price_currency
                  it.price = s.price
                }
              }
            }
            goods.push(it)
          }

          reply.ok(goods)
        }
        catch (error) {
          reply.error(error.message)
        }
        return reply;
      })
      return reply;
    }
  )

  const invItemsRefreshSchema = {
    schema: {
      body: {
        type: 'object',
        additionalProperties: false,
        properties: {
          service: {
            type: 'string',
            minLength: 24,
            maxLength: 24
          },
          inv_id: {
            type: 'string',
            minLength: 24,
            maxLength: 24
          },
          inv_type: {
            type: 'string',
            default: 'purchase'
          },
          indexes: {
            type: 'array',
            items: {
              type: 'string',
              minLength: 24,
              maxLength: 24
            }
          }
        },
        required: ['service', 'indexes']
      }
    }
  }

  instance.post(
    '/items/list_of_inv/refresh',
    {
      version: '1.0.0',
      ...invItemsRefreshSchema,
      attachValidation: true,
      preValidation: instance.authorize_admin
    },
    async (request, reply) => {
      if (request.validationError) {
        return reply.validation(request.validationError.message);
      }
      const user = request.user;
      const { service, indexes, inv_id, inv_type } = request.body;
      let service_id = service;
      try {
        service_id = instance.ObjectId(service_id)
      } catch (error) { }
      for (const ind in indexes) {
        try {
          indexes[ind] = instance.ObjectId(indexes[ind])
        } catch (error) { }
      }

      const itemsMatch = {
        $match: {
          _id: {
            $in: indexes
          }
        }
      }

      const calculateInStock = {
        $project: {
          name: 1,
          sku: 1,
          barcode: 1,
          cost: 1,
          category_name: 1,
          category: 1,
          in_stock: {
            $reduce: {
              input: "$services",
              initialValue: 0,
              in: {
                $sum: [
                  {
                    $cond: [
                      {
                        $or: [
                          {
                            $eq: ["$$this.service", service + '']
                          },
                          {
                            $eq: ["$$this.service", service_id]
                          },
                        ]
                      },
                      "$$this.in_stock",
                      0
                    ]
                  },
                  "$$value"
                ]
              }
            }
          },
          services: {
            $filter: {
              input: "$services",
              as: "service",
              cond: {
                $or: [
                  {
                    $eq: ["$$service.service", service + '']
                  },
                  {
                    $eq: ["$$service.service", service_id]
                  }
                ]
              }
            }
          }
        }
      }

      const sort = {
        $sort: {
          _id: 1
        }
      }

      const items = await instance.goodsSales.aggregate([
        itemsMatch,
        calculateInStock,
        sort
      ])
        .allowDiskUse(true)
        .exec();

      const itemPurchaseCostMap = {}
      try {
        const feature = await instance.settingFeatures.findOne({ organization: user.organization });

        if (inv_type == 'purchase' && inv_id && feature && feature.use_purchase_cost_on_pricing) {
          const p_items = await instance.purchaseItem.find({ purchase_id: inv_id });
          for (const itm of p_items) {
            itemPurchaseCostMap[itm.product_id] = itm.purchase_cost ? itm.purchase_cost : 0;
          }
        }
      } catch (error) { }

      for (const ind in items) {
        if (!(items[ind].services instanceof Array)) {
          items[ind].services = []
          items[ind].prices = []
        }
        if (items[ind].services.length > 0) {
          if (!(items[ind].services[0].prices instanceof Array)) {
            items[ind].services[0].prices = []
            items[ind].prices = []
          }
          items[ind].prices = items[ind].services[0].prices
        }
        delete items[ind].services

        if (itemPurchaseCostMap[items[ind]._id]) {
          items[ind].cost = itemPurchaseCostMap[items[ind]._id]
        }
      }
      reply.ok(items)
      return reply;
    }
  )

  next()
})
