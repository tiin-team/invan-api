const fp = require('fastify-plugin');
const mongoose = require('mongoose');

module.exports = fp((instance, _, next) => {

    instance.get(
        'sync-product-price/:organizationId/:fromStoreId/:toStoreId',
        {
            schema: {
                params: {
                    type: 'object',
                    required: [
                        'organizationId',
                        'fromStoreId',
                        'toStoreId',
                    ],
                    properties: {
                        organizationId: {
                            type: 'string',
                            minLength: 24,
                            maxLength: 24
                        },
                        fromStoreId: {
                            type: 'string',
                            minLength: 24,
                            maxLength: 24
                        },
                        toStoreId: {
                            type: 'string',
                            minLength: 24,
                            maxLength: 24
                        },
                    }
                }
            }
        },
        async (request, reply) => {
            const goodsSales = await instance.goodsSales.find(
                {
                    organization: request.params.organizationId,
                },
                {
                    services: 1,
                }
            )
                .lean()

            const bulkWrites = []
            const res = []
            for (const goodsSale of goodsSales) {
                const fromService = goodsSale.find(g => g.service == request.params.fromStoreId)
                if (!fromService) {
                    continue
                }

                bulkWrites.push({
                    updateOne: {
                        filter: {
                            organization: request.params.organizationId,
                            'services.service': request.params.toStoreId
                        },
                        update: {
                            $set: {
                                'services.$.price': fromService.price
                            }
                        }
                    }
                })

                if (bulkWrites.length >= 10_000) {
                    const r = await instance.goodsSales.bulkWrite(bulkWrites)
                    res.push(...r)
                    bulkWrites = []
                }
            }


            const r = await instance.goodsSales.bulkWrite(bulkWrites)
            bulkWrites = []
            res.push(...r)

            return reply.ok(res)
        }
    )

    next();
})
