
async function techMapGet(request, reply, instance) {
    try {
        const user = request.user;
        const { limit, page, search } = request.body;
        const $match = {
            $match: {
                organization: user.organization,
                product_name: {
                    $regex: search,
                    $options: 'i'
                }
            }
        }
        const $skip = {
            $skip: limit * (page - 1)
        }
        const $limit = {
            $limit: limit
        }
        const tech_maps = await instance.TechMap.aggregate([
            $match,
            $skip,
            $limit
        ]).allowDiskUse(true);
        const total = await instance.TechMap.countDocuments($match.$match);

        reply.ok({
            total,
            data: tech_maps
        })
    } catch (error) {
        reply.error(error.message)
    }
    return reply;
}

async function techMapGetId(request, reply, instance) {
    try {
        const { _id, service } = request.body;
        const tech_map = await instance.TechMap.findById(_id);
        if (!tech_map) {
            return reply.fourorfour('tech_map')
        }
        const item_ids = [];

        for (const it of tech_map.composite_items) {
            item_ids.push(it.product_id)
        }
        const items = await instance.goodsSales.find({ _id: { $in: item_ids } });
        const itemsMap = {}
        for (const it of items) {
            it.in_stock = 0;
            try {
                for (const s of it.services) {
                    if (s.service + '' == service + '') {
                        it.in_stock = s.in_stock
                    }
                }
            } catch (error) { }
            itemsMap[it._id + ''] = it
        }

        const composite_items = [];
        for (const it of tech_map.composite_items) {
            if (!itemsMap[it.product_id + '']) {
                continue;
            }
            composite_items.push({
                quality: it.quality,
                product_id: it.product_id,
                product_name: itemsMap[it.product_id + ''].name,
                cost: it.cost ? it.cost : itemsMap[it.product_id + ''].cost,
                cost_currency: it.cost_currency ? it.cost_currency : itemsMap[it.product_id + ''].cost_currency,
                sku: itemsMap[it.product_id + ''].sku,
                in_stock: itemsMap[it.product_id + ''].in_stock,
            })
        }

        const item = await instance.goodsSales.findById(tech_map.product_id);
        const result = {
            _id: tech_map._id,
            composite_items: composite_items
        }
        if (item) {
            result.product_id = item._id;
            result.product_name = item.name;
        }
        reply.ok(result)
    } catch (error) {
        reply.error(error.message)
    }
    return reply;
}

async function techMapByItem(request, reply, instance) {
    try {
        const { item_id } = request.body;
        const item = await instance.goodsSales.findById(item_id);
        if (!item) {
            return reply.fourorfour('Item')
        }
        const tech_map = await instance.TechMap.findOne({ product_id: item._id });
        if (!tech_map) {
            return reply.fourorfour('TechMap')
        }
        request.body = {
            _id: tech_map._id,
            service: ''
        }

        return techMapGetId(request, reply, instance);
    } catch (error) {
        reply.error(error.message)
    }
    return reply;
}

module.exports = ((instance, _, next) => {

    const schema = {
        schema: {
            body: {
                type: 'object',
                required: [
                    'limit', 'page'
                ],
                properties: {
                    limit: {
                        type: 'number',
                        min: 1,
                        max: 20
                    },
                    page: {
                        type: 'number',
                        min: 1
                    },
                    search: {
                        type: 'string',
                        default: ''
                    }
                }
            }
        }
    }

    const idSchema = {
        schema: {
            body: {
                type: 'object',
                required: [
                    '_id'
                ],
                properties: {
                    _id: {
                        type: 'string',
                        minLength: 24,
                        maxLength: 24
                    },
                    service: {
                        type: 'string'
                    }
                }
            }
        }
    }

    instance.post(
        '/tech_map/get',
        {
            ...schema,
            version: '1.0.0',
            preValidation: [instance.authorize_admin],
            attachValidation: true
        },
        (request, reply) => {
            if (request.validationError) {
                return reply.validation(request.validationError.message)
            }
            return techMapGet(request, reply, instance);
        }
    )

    instance.post(
        '/tech_map/get-id',
        {
            schema: idSchema,
            version: '1.0.0',
            preValidation: [instance.authorize_admin],
            attachValidation: true
        },
        (request, reply) => {
            if (request.validationError) {
                return reply.validation(request.validationError.message)
            }
            return techMapGetId(request, reply, instance);
        }
    )

    const byItemSchema = {
        body: {
            type: 'object',
            required: [
                'item_id'
            ],
            properties: {
                item_id: {
                    type: 'string',
                    minLength: 24,
                    maxLength: 24
                }
            }
        }
    }

    instance.post(
        '/tech_map/get-item-id',
        {
            schema: byItemSchema,
            version: '1.0.0',
            preValidation: [instance.authorize_admin],
            attachValidation: true
        },
        (request, reply) => {
            if (request.validationError) {
                return reply.validation(request.validationError.message)
            }
            return techMapByItem(request, reply, instance);
        }
    )

    next()
})
