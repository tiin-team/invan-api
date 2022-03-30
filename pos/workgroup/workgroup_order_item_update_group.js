
const wOrderUpdateItemGroup = async function (request, reply, instance) {
    try {
        const user = request.user;
        const {
            items,
            workgroup_order_id
        } = request.body;

        const workgroup_order = await instance.WorkgroupOrder.findById(workgroup_order_id);

        if (!workgroup_order) {
            return reply.fourorfour('Workgroup order')
        }

        if (workgroup_order.current_employee + '' != user._id + '') {
            return reply.response(411, 'workgroup is not activated');
        }

        const itemsMap = {}
        for (const item of items) {
            try {
                item.product_id = instance.ObjectId(item.product_id)
            } catch (error) { }
            const exist_w_order_item = await instance.WorkgroupOrder.findOne({
                _id: workgroup_order_id,
                "items.product_id": item.product_id
            })
            console.log(exist_w_order_item)
            if (!exist_w_order_item) {
                return reply.response(403, `Item with id ${item.product_id} not in workgroup order`)
            }
            if (itemsMap[item.product_id]) {
                return reply.response(405, `Items should be Set`);
            }
            itemsMap[item.product_id] = item;
        }

        for (const item of items) {
            await instance.WorkgroupOrder.updateOne(
                {
                    _id: workgroup_order_id,
                    items: {
                        $elemMatch: {
                            $or: [
                                {
                                    product_id: instance.ObjectId(item.product_id)
                                },
                                {
                                    product_id: item.product_id + ''
                                }
                            ]

                        }
                    }
                    // "items.product_id": item.product_id
                },
                {
                    $set: {
                        updatedAt: new Date().getTime(),
                        "items.$.quantity": item.quantity,
                        "items.$.production_item": item.production_item,
                        "items.$.comment": item.comment,
                        "items.$.mix": item.mix,
                        "items.$.cost": item.cost
                    }
                }
            );
        }

        return reply.ok()
    } catch (error) {
        reply.error(error.message)
    }
}

module.exports = ((instance, _, next) => {

    const updateItemGroupSchema = {
        body: {
            type: 'object',
            required: [
                'workgroup_order_id', 'items'
            ],
            properties: {
                workgroup_order_id: {
                    type: 'string',
                    minLength: 24,
                    maxLength: 24
                },
                items: {
                    type: 'array',
                    minItems: 1,
                    items: {
                        type: 'object',
                        required: [
                            'product_id',
                            'quantity',
                            'production_item',
                            'mix',
                            'cost'
                        ],
                        properties: {
                            product_id: {
                                type: 'string',
                                minLength: 24,
                                maxLength: 24
                            },
                            quantity: {
                                type: 'number',
                                minimum: 0
                            },
                            production_item: {
                                type: 'number',
                                minimum: 0
                            },
                            comment: {
                                type: 'string',
                                default: ''
                            },
                            mix: {
                                type: 'number',
                                default: 0
                            },
                            cost: {
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
        '/workgroup/order/item-update-group',
        {
            version: '1.0.0',
            schema: updateItemGroupSchema,
            attachValidation: true,
            preValidation: [instance.authorize_employee]
        },
        async (request, reply) => {
            if (request.validationError) {
                return reply.validation(request.validationError.message)
            }
            wOrderUpdateItemGroup(request, reply, instance)
            return reply;
        }
    )

    next()
})
