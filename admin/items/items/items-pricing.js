
module.exports = ((instance, _, next) => {

    const itemsPricingSchema = {
        body: {
            type: 'object',
            additionalProperties: false,
            required: [
                'percent', 'service', 'indexes', 'percents'
            ],
            properties: {
                percent: { type: 'number' },
                is_round: { type: 'boolean', default: false },
                pricing_type: {
                    type: 'string',
                    enum: ['single', 'multi'],
                    default: 'single'
                },
                service: { type: 'string', minLength: 24, maxLength: 24 },
                indexes: {
                    type: 'array',
                    minItems: 1,
                    items: {
                        type: 'string',
                        minLength: 24,
                        maxLength: 24
                    }
                },
                percents: {
                    type: 'array',
                    items: {
                        type: 'number',
                        minimum: 0
                    },
                    minItems: 3,
                    maxItems: 3
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

    const updateItemsPrices = async (request, reply) => {
        try {
            const service_id = request.body.service;
            const percent = request.body.percent;
            const percents = request.body.percents;
            const ids = request.body.indexes;
            const user = request.user;
            const round_value = request.body.is_round ? 100 : 1;
            const items = await instance.goodsSales.find({
                _id: {
                    $in: ids
                }
            })
            
            const updated_items = [];
            const time = new Date().getTime();
            for (const item of items) {
                if (typeof item.services == typeof []) {
                    const setData = {}
                    for (const ind in item.services) {
                        if (
                            item.services[ind].service + '' == service_id + ''
                            && typeof item.cost == typeof 5
                        ) {
                            let item_cost = item.cost
                            const new_price = Math.round(item.cost * (1 + percent / 100) / round_value) * round_value;
                            if(!item.services[ind].price) {
                                item.services[ind].price = 0;
                            }
                            if(item.services[ind].price != new_price) {
                                instance.create_price_change_history(
                                    user,
                                    service_id,
                                    item._id,
                                    item.services[ind].price,
                                    new_price,
                                    time
                                )
                                setData.last_price_change = new Date().getTime()
                            }

                            item.services[ind].price = new_price
                            if (!(item.services[ind].prices instanceof Array)) {
                                item.services[ind].prices = []
                            }
                            const old_prices = item.services[ind].prices
                            if (item.services[ind].prices.length > 0) {
                                item.services[ind].prices[0].price = Math.round(item_cost * (1 + percents[0] / 100)/round_value)*round_value
                            }

                            if (item.services[ind].prices.length > 1) {
                                item.services[ind].prices[1].price = Math.round(item_cost * (1 + percents[1] / 100)/round_value)*round_value
                            }

                            if (item.services[ind].prices.length > 2) {
                                item.services[ind].prices[2].price = Math.round(item_cost * (1 + percents[2] / 100)/round_value)*round_value
                            }
                            if(old_prices != item.services[ind].prices) {
                                instance.create_prices_change_history(
                                    user,
                                    service_id,
                                    item._id,
                                    old_prices,
                                    item.services[ind].prices,
                                    time
                                )
                                setData.last_price_change = new Date().getTime()
                            }
                        }
                    }
                    
                    setData.services = item.services
                    setData.last_updated = new Date().getTime()
                    setData.last_stock_updated = new Date().getTime()

                    const res = await instance.goodsSales.updateOne(
                        {
                            _id: item._id
                        },
                        {
                            $set: setData
                        }
                    )

                    if (res && res.nModified) {
                        updated_items.push({
                            id: item._id,
                            name: item.name
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
        '/items/pricing',
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
                request.user = user;
                return updateItemsPrices(request, reply)
            })
        }
    )

    next()
})
