
module.exports = ((instance, _, next) => {

  instance.post(
    '/items/pricing/autofilll',
    {
      version: '1.0.0',
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          required: [
            'service',
            'date'
          ],
          properties: {
            service: {
              type: 'string',
              minLength: 24,
              maxLength: 24
            },
            date: {
              type: 'number'
            }
          }
        }
      },
      attachValidation: true
    },
    (request, reply) => {
      if (request.validationError) {
        return reply.validation(request.validationError.message)
      }
      instance.oauth_admin(request, reply, async (user) => {
        if (!user) {
          return reply.error('Access')
        }
        const { service, date } = request.body;
        let service_id = service;
        try {
          service_id = instance.ObjectId(service_id);
        } catch (error) {}
        const outdates = await instance.outdatedPrices.find({
          organization: user.organization,
          service,
          date: {
            $gte: date
          }
        })
        let indexes = []
        for (const itm of outdates) {
          indexes = indexes.concat(itm.indexes)
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
            items[ind].price = items[ind].services[0].price
          }
          delete items[ind].services
        }
        
        reply.ok(items)
      })
    }
  )

  next()
})
