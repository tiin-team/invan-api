const mongoose = require("mongoose")

module.exports = ((instance, _, next) => {

  const itemsPricingSchema = {
    body: {
      type: 'object',
      additionalProperties: false,
      required: [
        'service', 'items'
      ],
      properties: {
        service: { type: 'string', minLength: 24, maxLength: 24 },
        type: {
          type: 'string'
        },
        inv_id: {
          type: 'string',
          minLength: 24,
          maxLength: 24
        },
        items: {
          type: 'array',
          items: {
            type: 'object',
            required: [
              '_id'
            ],
            properties: {
              prices: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['price', 'from'],
                  properties: {
                    price: { type: 'number' },
                    from: { type: 'number' }
                  }
                }
              },
              price: { type: 'number' },
              _id: {
                type: 'string',
                minLength: 24,
                maxLength: 24
              }
            }
          }
        },
        services: {
          type: 'array',
          items: {
            type: 'string',
            minLength: 24,
            maxLength: 24
          }
        }
      }
    }
  }

  const checkService = async (request, reply, done) => {
    try {
      const service_id = request.body.service
      const service = await instance.services.findById(service_id)
      if (!service) {
        return reply.fourorfour('Service')
      }
    } catch (error) {
      return reply.error(error.message)
    }
  }

  const compare = (a, b) => {
    if (a && b && a.from > b.from) {
      return 1
    }
    else if (a && b && b.from > a.from) {
      return -1
    }
    return 0
  }

  const sortPrices = (prices) => {
    prices = prices.sort(compare);
    let PRICES = []
    for (const ind in prices) {
      if (prices[ind].from != 0 && prices[ind].price != 0) {
        PRICES.push(prices[ind])
      }
      else if (prices[ind].from == 0 && prices[ind].price != 0 && ind == 0) {
        PRICES.push(prices[ind])
      }
    }
    return PRICES
  }

  const updateItemsPrices = async (request, reply) => {
    try {
      const service_id = request.body.service;
      const items = request.body.items;
      const services = request.body.services;
      const user = request.user;
      const itemsMap = {}
      const ids = []

      for (const it of items) {
        if (!itemsMap[it._id]) {
          ids.push(it._id)
        }
        itemsMap[it._id] = it
      }

      const type = request.body.type
      const inv_id = request.body.inv_id

      switch (type) {
        case 'purchase': {
          try {
            await instance.inventoryPurchase.updateOne(
              {
                _id: inv_id
              },
              {
                $set: {
                  pricing_status: true,
                  last_pricing_date: new Date().getTime()
                }
              }
            )
          } catch (error) {
            instance.log.error(error.message)
          }
          break;
        }
      }

      const goods = await instance.goodsSales
        .find(
          {
            _id: {
              $in: ids
            },
          },
          {
            name: 1,
            services: 1,
          }
        )
        .lean()

      const updated_items = [];

      const time = new Date().getTime()
      for (const item of goods) {

        if (item.services instanceof Array) {
          const setData = {}
          for (const ind in item.services) {
            if (
              item.services[ind].service + '' == service_id + '' ||
              services.includes(item.services[ind].service + '')
            ) {
              if (typeof itemsMap[item._id].price == typeof 5) {
                if (!item.services[ind].price) {
                  item.services[ind].price = 0
                }

                if (item.services[ind].price != itemsMap[item._id].price) {
                  instance.create_price_change_history(
                    user,
                    item.services[ind].service,
                    item._id,
                    item.services[ind].price,
                    itemsMap[item._id].price,
                    time
                  )
                  setData.last_price_change = new Date().getTime();

                  if (!instance.equalPrices(item.services[ind].prices, itemsMap[item._id].prices)) {
                    // await instance.goodsSales.updateOne(
                    //   {
                    //     _id: item._id,
                    //     services: {
                    //       $elemMatch: {
                    //         service: mongoose.Types.ObjectId(item.services[ind].service)
                    //       }
                    //     }
                    //   },
                    //   {
                    //     $set: {
                    //       'services.$.printed_price_change_time': time
                    //     }
                    //   }
                    // );

                    item.services[ind].printed_price_change_time = time;
                  }
                  item.services[ind].printed_price_change_time = time;
                }
                item.services[ind].price = itemsMap[item._id].price
              }
              if (itemsMap[item._id].prices instanceof Array) {
                if (!(item.services[ind].prices instanceof Array)) {
                  item.services[ind].prices = []
                }
                itemsMap[item._id].prices = sortPrices(itemsMap[item._id].prices)

                if (item.services[ind].prices != itemsMap[item._id].prices) {
                  instance.create_prices_change_history(
                    user,
                    item.services[ind].service,
                    item._id,
                    item.services[ind].prices,
                    itemsMap[item._id].prices,
                    time
                  )
                  setData.last_price_change = new Date().getTime();
                  if (!instance.equalPrices(item.services[ind].prices, itemsMap[item._id].prices)) {
                    await instance.goodsSales.updateOne(
                      {
                        _id: item._id,
                        services: {
                          $elemMatch: {
                            service: mongoose.Types.ObjectId(item.services[ind].service)
                          }
                        }
                      },
                      {
                        $set: {
                          'services.$.printed_price_change_time': time
                        }
                      }
                    );
                    item.services[ind].printed_price_change_time = time;
                  }

                }
                item.services[ind].prices = sortPrices(itemsMap[item._id].prices)
              }

            }
          }

          setData.services = item.services
          setData.last_updated = new Date().getTime()
          setData.last_stock_updated = new Date().getTime()

          const res = await instance.goodsSales.updateOne(
            { _id: item._id },
            { $set: setData },
            { lean: true },
          )

          if (res && res.nModified) {
            updated_items.push({
              id: item._id,
              name: item.name,
              price: itemsMap[item._id].price,
              prices: itemsMap[item._id].prices
            })
          }
        }
      }

      return reply.ok(updated_items)
    } catch (error) {
      return reply.error(error.message)
    }
  }

  instance.post(
    '/items/pricing/one-by-one',
    {
      schema: itemsPricingSchema,
      attachValidation: true,
      version: '1.0.0',
      preHandler: checkService
    },
    (request, reply) => {
      if (request.validationError) {
        return reply.validation(request.validationError.message)
      }
      instance.oauth_admin(request, reply, (user) => {
        request.user = user
        return updateItemsPrices(request, reply)
      })
    }
  )

  next()
})
