
const fp = require('fastify-plugin')

function compare(a, b) {

    if (a.category > b.category) {
        return 1
    }
    else if (b.category > a.category) {
        return -1
    }
    return 0
}

async function getItems(request, reply, fastify) {
    try {
        const service_id = request.body.service

        const service = await fastify.services.findOne({ _id: service_id })
        if (!service) {
            return reply.fourorfour('Service')
        }

        var query = {
            organization: service.organization,
            item_type: 'item'
        }

        query.services = {
            $elemMatch: {
                service: {
                    $eq: service._id
                },
                available: {
                    $eq: true
                }
            }
        }

        var total_items = 0
        var items = []
        var goods = []
        var limit = 1
        const page = request.params.page

        try {

            total_items = await fastify.goodsSales.find(query).countDocuments()
            limit = (typeof request.params.limit == typeof 'all') ? (total_items > 0 ? total_items : 1) : request.params.limit;

            const skip = limit * (page - 1);
            const sort = { _id: 1 };

            goods = await fastify.goodsSales.find(query)
                .skip(skip).limit(limit).sort(sort)

        } catch (error) {
            goods = []
        }

        for (let i = 0; i < goods.length; i++) {

            for (let j = 0; j < goods[i].services.length; j++) {
                if (goods[i].services[j].service + '' == service._id + '') {
                    goods[i].in_stock = goods[i].services[j].in_stock
                    goods[i].price = goods[i].services[j].price
                    goods[i].stopped_item = goods[i].services[j].stopped_item
                }
            }
            goods[i].category = await fastify.get_root(goods[i].category, goods[i].organization)

            items.push(goods[i])
        }

        items.sort(compare)

        items = items.slice((page - 1) * limit, limit * page)

        reply.ok({
            total: total_items,
            goods: items
        })

    } catch (error) {
        return reply.fourorfour('Service')
    }
}

async function getItem(request, reply, fastify) {
    try {
        const service_id = request.params.service_id
        const service = await fastify.services.findOne({ _id: service_id })
        if (!service) {
            return reply.fourorfour('Service')
        }

        try {
            const id = request.params.id
            var item = await fastify.goodsSales.findOne({ _id: id })
            for (const service of item.services) {
                if (service.service + '' == service._id + '') {
                    item.price = service.price
                    item.in_stock = service.in_stock
                    item.stopped_item = service.stopped_item
                }
            }

            // get modifiers
            try {
                const modifiers = await fastify.Modifiers.find({
                    _id: {
                        $in: item.modifiers
                    }
                })
                item.modifiers = modifiers
            } catch (error) {
                item.modifiers = []
            }

            // get variants
            if (item.variant_items && item.variant_items.length > 0) {
                try {
                    const variants = await fastify.goodsSales.find({
                        _id: {
                            $in: item.variant_items
                        },
                        services: {
                            $elemMatch: {
                                service: {
                                    $eq: service._id
                                },
                                available: {
                                    $eq: true
                                }
                            }
                        }
                    })

                    item.variant_items = variants
                } catch (error) {
                    item.variants = []
                }
            }

            reply.ok(item)
        } catch (error) {
            return reply.fourorfour('Item')
        }
    } catch (error) {
        return reply.fourorfour('Service')
    }
}

module.exports = fp((instance, _, next) => {

    const getItemsSchema = {
        params: {
            type: 'object',
            required: ['limit', 'page'],
            properties: {
                limit: {
                    oneOf: [
                        { type: 'string', enum: ['all'] },
                        { type: 'number', maximum: 8999999999999999999, minimum: 1 }
                    ]
                },
                page: {
                    type: 'number', maximum: 8999999999999999999, minimum: 1
                }
            }
        },
        body: {
            type: 'object',
            required: ['service'],
            properties: {
                service: {
                    type: 'string',
                    minLength: 1
                }
            }
        },
        response: {
            200: {
                type: 'object',
                properties: {
                    statusCode: {
                        type: 'number'
                    },
                    message: { type: 'string' },
                    data: {
                        type: 'object',
                        properties: {
                            total: { type: 'number' },
                            goods: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        _id: { type: 'string' },
                                        name: { type: 'string' },
                                        category: { type: 'string' },
                                        price: { type: 'number' },
                                        in_stock: { type: 'number' },
                                        stopped_item: { type: 'boolean' },
                                        representation_type: { type: 'string' },
                                        shape: { type: 'string' },
                                        representation: { type: 'string' }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    const itemsHandler = (request, reply) => {
        if (request.validationError) {
            return reply.validation(request.validationError.message)
        }
        instance.authorization(request, reply, (user) => {
            request.user = user
            getItems(request, reply, instance)
        })
    }

    instance.post(
        '/service/items/search/:limit/:page',
        {
            schema: getItemsSchema,
            version: '1.1.0',
            attachValidation: true
        }, itemsHandler)

    instance.post(
        '/service/items/search/:limit/:page',
        {
            schema: getItemsSchema,
            version: '1.0.0',
            attachValidation: true
        }, itemsHandler)

    const getItemSchema = {
        params: {
            type: 'object',
            required: ['service_id', 'id'],
            properties: {
                restaurant_id: { type: 'string', minLength: 1 },
                id: { type: 'string', minLength: 1 }
            }
        },
        response: {
            200: {
                type: 'object',
                properties: {
                    statusCode: { type: 'number' },
                    message: { type: 'string' },
                    data: {
                        type: 'object',
                        properties: {
                            _id: { type: 'string' },
                            name: { type: 'string' },
                            price: { type: 'number' },
                            representation: { type: 'string' },
                            representation_type: { type: 'string' },
                            shape: { type: 'string' },
                            stopped_item: { type: 'string' },
                            in_stock: { type: 'number' },
                            modifiers: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        _id: { type: 'string' },
                                        name: { type: 'string' },
                                        options: {
                                            type: 'array',
                                            items: {
                                                type: 'object',
                                                properties: {
                                                    option_name: { type: 'string' },
                                                    price: { type: 'number' }
                                                }
                                            }
                                        }
                                    }
                                }
                            },
                            variant_items: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        _id: { type: 'string' },
                                        name: { type: 'string' },
                                        price: { type: 'string' }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    const getItemHandler = (request, reply) => {
        if (request.validationError) {
            return reply.validation(request.validationError.message)
        }
        instance.authorization(request, reply, (user) => {
            request.user = user
            getItem(request, reply, instance)
        })
    }

    instance.get(
        '/service/item/get/:service_id/:id',
        {
            schema: getItemSchema,
            version: '1.1.0',
            attachValidation: true
        }, getItemHandler)

    instance.get(
        '/service/item/get/:service_id/:id',
        {
            schema: getItemSchema,
            version: '1.0.0',
            attachValidation: true
        }, getItemHandler)

    next()
})
