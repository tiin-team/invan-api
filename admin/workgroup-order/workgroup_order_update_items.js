
const updateItemPrice = async function (instance, product_id, price, service_id) {
    try {
        const item = await instance.goodsSales.findById(product_id);
        if (!item) {
            return
        }
        try {
            service_id = instance.ObjectId(service_id)
        } catch (error) { }
        await instance.goodsSales.updateOne(
            {
                _id: product_id,
                services: {
                    $elemMatch: {
                        service: service_id
                    }
                }
            },
            {
                $set: {
                    'services.$.price': price
                }
            }
        )
        return
    } catch (error) {
        throw error
    }
}

const udpateWorkgroupOrderItems = async function (request, reply, instance) {
    try {
        const { workgroup_order_id, items } = request.body;
        const workgroupOrder = await instance.WorkgroupOrder.findById(workgroup_order_id);

        if (!workgroupOrder) {
            return reply.fourorfour('workgroupOrder')
        }

        if (!['pending', 'in_progress', 'completed'].includes(workgroupOrder.state)) {
            return reply.response(403, 'workgroupOrder is not in process')
        }

        const itemsMap = {}
        for (const item of items) {

            if (itemsMap[item.product_id]) {
                return reply.response(405, `Items should be Set`);
            }

            const exist_workgroup_order = await instance.WorkgroupOrder.findOne({
                _id: workgroup_order_id,
                items: {
                    $elemMatch: {
                        product_id: item.product_id
                    }
                }
            })

            if (!exist_workgroup_order) {
                return reply.response(403, `Item with id ${item.product_id} not in workgroup order`)
            }
            itemsMap[item.product_id] = item;
        }

        for (const item of items) {
            await instance.WorkgroupOrder.updateOne(
                {
                    _id: workgroup_order_id,
                    items: {
                        $elemMatch: {
                            product_id: item.product_id
                        }
                    }
                },
                {
                    $set: {
                        'items.$.cost': item.cost,
                        'items.$.quantity': item.quantity,
                        // 'items.$.used_quantity': 0
                    }
                }
            );
            // await updateItemPrice(instance, item.product_id, item.cost, workgroupOrder.service)
        }

        reply.ok({ _id: workgroupOrder._id })
    } catch (error) {
        reply.error(error.message)
    }
}

module.exports = ((instance, _, next) => {

    const workgroupOrderUpdateSchema = {
        body: {
            type: 'object',
            required: [
                'workgroup_order_id',
                'items'
            ],
            properties: {
                workgroup_order_id: {
                    type: 'string',
                    minLength: 24,
                    maxLength: 24
                },
                items: {
                    type: 'array',
                    items: {
                        type: 'object',
                        required: [
                            'product_id',
                            'cost',
                            'quantity'
                        ],
                        properties: {
                            product_id: {
                                type: 'string',
                                minLength: 24,
                                maxLength: 24
                            },
                            cost: {
                                type: 'number',
                                minimum: 0
                            },
                            quantity: {
                                type: 'number',
                                minimum: 0
                            }
                        }
                    }
                }
            }
        }
    }

    instance.post(
        '/workgroup/order/update/items',
        {
            version: '1.0.0',
            schema: workgroupOrderUpdateSchema,
            attachValidation: true
        },
        (request, reply) => {
            if (request.validationError) {
                return reply.validation(request.validationError.message)
            }
            udpateWorkgroupOrderItems(request, reply, instance)
        }
    )

    next()
})
