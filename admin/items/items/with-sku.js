
module.exports = ((instance, _, next) => {

    instance.post(
        '/items/get_weight_sku',
        {
            version: '1.0.0',
            schema: {
                body: {
                    type: 'object',
                    required: [
                        'used_skus'
                    ],
                    properties: {
                        used_skus: {
                            type: 'array',
                            items: {
                                type: 'number'
                            }
                        }
                    }
                }
            },
            preValidation: instance.authorize_admin
        },
        async (request, reply) => {
            try {
                const user = request.user;
                const { used_skus } = request.body;
                // const available_sku = 9999; // asli
                const available_sku = 1;
                const items = await instance.goodsSales.find(
                    { organization: user.organization, sku: { $lt: 10000, $nin: used_skus } },
                    { _id: 0, sku: 1 }
                )
                    .sort({ sku: 1 })
                    .lean();

                // if (!items || items[0].sku != available_sku) {
                //     return reply.ok({ sku: available_sku })
                // }
                if (items.length >= 1) {
                    if (items[0].sku != available_sku)
                        return reply.ok({ sku: available_sku })

                    if (items.length == 1)
                        return reply.ok({ sku: items[0].sku + 1 })
                    for (let i = 0; i < items.length - 2; i++) {
                        // if (items[i].sku - items[i + 1].sku > 1) { //asli
                        if (items[i + 1].sku - items[i].sku > 1) {
                            // return reply.ok({ sku: items[i].sku - 1 }) //asli
                            return reply.ok({ sku: items[i].sku + 1 })
                        }
                    }
                    // return reply.ok({ sku: items[items.length - 1].sku - 1 })
                    return reply.ok({ sku: items[items.length - 1].sku + 1 })
                } else
                    return reply.ok({ sku: available_sku })

            } catch (error) {
                reply.error(error.message)
            }
            return reply;
        }
    )
    next()
})
async (request, reply) => {
    try {
        const user = request.user;
        const { used_skus } = request.body;
        let available_sku = 999;
        const items = await instance.goodsSales.find({ organization: user.organization, sku: { $lt: 1000, $nin: used_skus } }).sort({ sku: -1 });
        for (const itm of items) {
            if (itm.sku == available_sku) {
                available_sku--;
            }
        }
        if (!available_sku) {
            const lastItem = await instance.goodsSales.findOne({ organization: user.organization }).sort({ sku: -1 });
            if (lastItem && lastItem.sku) {
                available_sku = lastItem.sku + 1
            }
        }

        reply.ok({ sku: available_sku })
    } catch (error) {
        reply.error(error.message)
    }
    return reply;
}