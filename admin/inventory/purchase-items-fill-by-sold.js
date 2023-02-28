
module.exports = ((instance, _, next) => {

    const itemsSchema = {
        body: {
            type: 'object',
            required: [
                'service', 'indexes'
            ],
            properties: {
                service: {
                    type: 'string',
                    minLength: 24,
                    maxLength: 24
                },
                indexes: {
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

    instance.post(
        '/purchase/items/fill/sold',
        {
            version: '1.0.0',
            schema: itemsSchema,
            preValidation: instance.authorize_admin
        },
        async (request, reply) => {
            try {
                let { service, indexes } = request.body;
                const user = request.user;
                try {
                    service = instance.ObjectId(service)
                } catch (error) { }
                const replyResult = []
                for (const ind in indexes) {
                    try {
                        indexes[ind] = instance.ObjectId(indexes[ind])
                    } catch (error) { }

                    let lastHistory = await instance.inventoryHistory.find({
                        organization: user.organization,
                        product_id: indexes[ind],
                        service: service,
                        reason: 'received'
                    }).sort({ date: -1 }).limit(1)

                    if (lastHistory && lastHistory.length > 0) {
                        lastHistory = lastHistory[0]
                        const receiptsMatch = {
                            $match: {
                                organization: user.organization,
                                service: service + '',
                                date: {
                                    $gte: lastHistory.date
                                }
                            }
                        }
                        const unwindItems = {
                            $unwind: '$sold_item_list'
                        }
                        const itemsMatch = {
                            $match: {
                                'sold_item_list.product_id': indexes[ind] + ''
                            }
                        }
                        const calculateSoldItemCount = {
                            $group: {
                                _id: '$sold_item_list.product_id',
                                items_sold: {
                                    $sum: {
                                        $cond: [
                                            {
                                                $eq: ["$is_refund", false]
                                            },
                                            "$sold_item_list.value",
                                            {
                                                $multiply: ["$sold_item_list.value", -1]
                                            }
                                        ]
                                    }
                                }
                            }
                        }
                        const result = await instance.Receipts.aggregate([
                            receiptsMatch,
                            unwindItems,
                            itemsMatch,
                            calculateSoldItemCount
                        ])
                            .allowDiskUse(true)
                            .exec();
                        if (result && result.length > 0) {
                            replyResult.push({
                                product_id: indexes[ind],
                                items_sold: result[0].items_sold,
                                items_received: lastHistory.adjustment
                            })
                        }
                        else {
                            replyResult.push({
                                product_id: indexes[ind],
                                items_sold: 0,
                                items_received: lastHistory.adjustment
                            })
                        }
                    }
                }
                reply.ok(replyResult)
            } catch (error) {
                reply.error(error.message)
            }
            return reply;
        }
    )

    next()
})
