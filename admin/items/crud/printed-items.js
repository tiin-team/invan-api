
const fp = require("fastify-plugin");
const mongoose = require('mongoose');

async function printedItemsSet(request, reply, instance) {
    try {
        let { service_id, items } = request.body;
        service_id = mongoose.Types.ObjectId(service_id);
        const printed_time = new Date().getTime();
        for (const id of items) {
            await instance.goodsSales.updateOne(
                {
                    _id: id,
                    services: {
                        $elemMatch: {
                            service: service_id
                        }
                    }
                },
                {
                    $set: {
                        'services.$.printed_time': printed_time
                    }
                }
            );
        }
        reply.ok('ok')
    } catch (error) {
        reply.error(error.message)
    }
    return reply;
}

async function printedItemsCount(request, reply, instance) {
    try {
        const user = request.user;
        const { service_id } = request.body;
        const $match = {
            $match: {
                $expr: {
                    $and: [
                        {
                            $eq: [
                                '$organization', user.organization,
                            ]
                        }
                    ]
                }
            }
        }
        const $unwindServices = {
            $unwind: {
                path: '$services'
            }
        }
        const $matchServices = {
            $match: {
                $expr: {
                    $and: [
                        {
                            $eq: [
                                '$services.service',
                                mongoose.Types.ObjectId(service_id)
                            ]
                        },
                        {
                            $gt: [
                                '$services.printed_price_change_time',
                                '$services.printed_time',
                            ]
                        }
                    ]
                }
            }
        }
        const $group = {
            $group: {
                _id: null,
                count: {
                    $sum: 1
                }
            }
        }
        const items_count = await instance.goodsSales.aggregate([
            $match,
            $unwindServices,
            $matchServices,
            $group
        ]).allowDiskUse(true).exec();

        reply.ok({
            count: items_count.length == 0 ? 0 : items_count[0].count
        });
    } catch (error) {
        reply.error(error.message)
    }
    return reply;
}

async function printedItemsGet(request, reply, instance) {
    try {
        const { service_id } = request.body;
        const user = request.user;
        const $match = {
            $match: {
                $expr: {
                    $and: [
                        {
                            $eq: [
                                '$organization', user.organization,
                            ]
                        }
                    ]
                }
            }
        }
        const $unwindServices = {
            $unwind: {
                path: '$services'
            }
        }
        const $matchServices = {
            $match: {
                $expr: {
                    $and: [
                        {
                            $eq: [
                                '$services.service',
                                mongoose.Types.ObjectId(service_id)
                            ]
                        },
                        {
                            $gt: [
                                '$services.printed_price_change_time',
                                '$services.printed_time',
                            ]
                        }
                    ]
                }
            }
        }
        const $sort = {
            $sort: {
                _id: 1
            }
        }
        const $limit = {
            $limit: 20
        }
        const $project = {
            $project: {
                name: 1,
                sku: 1,
                barcode: 1,
                price: '$services.price',
                prices: '$services.prices',
                category_name: 1,
                item_type: 1,
            }
        }

        const items = await instance.goodsSales.aggregate([
            $match,
            $unwindServices,
            $matchServices,
            $sort,
            $limit,
            $project
        ]).allowDiskUse(true).exec();

        const items_list = []
        for (const it of items) {
            if (it.item_type == 'variant') {
                const parent = await instance.goodsSales.findOne({
                    variant_items: {
                        $elemMatch: {
                            $eq: it._id,
                        }
                    }
                });
                if (parent) {
                    it.name = `${parent.name} ( ${it.name} )`;
                }
            }
            items_list.push(it)
        }

        reply.ok(items_list);
    } catch (error) {
        reply.error(error.message)
    }
    return reply;
}

module.exports = fp((instance, _, next) => {

    const schema = {
        schema: {
            body: {
                type: 'object',
                required: [
                    'service_id',
                    'items'
                ],
                properties: {
                    service_id: {
                        type: 'string',
                        minLength: 24,
                        maxLength: 24
                    },
                    items: {
                        type: 'array',
                        minItems: 1,
                        items: {
                            type: 'string',
                            minLength: 24,
                            maxLength: 24
                        }
                    }
                }
            }
        },
        version: '1.0.0'
    }

    instance.post(
        '/printed-items/set',
        schema,
        (request, reply) => {
            instance.oauth_admin(request, reply, (user) => {
                return printedItemsSet(request, reply, instance)
            });
        }
    );

    instance.post(
        '/printed-items/count',
        { version: '1.0.0' },
        (request, reply) => {
            instance.oauth_admin(request, reply, (user) => {
                return printedItemsCount(request, reply, instance);
            });
        }
    );

    instance.post(
        '/printed-items/get',
        { version: '1.0.0' },
        (request, reply) => {
            instance.oauth_admin(request, reply, (user) => {
                return printedItemsGet(request, reply, instance);
            });
        }
    );

    next()
});
