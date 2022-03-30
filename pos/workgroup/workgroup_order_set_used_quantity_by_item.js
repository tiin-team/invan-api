
async function setUsedQuantity(request, reply, instance) {
    try {
        let { workgroup_order_id, product_id, used_quantity } = request.body;

        const workgroup_order = await instance.WorkgroupOrder.findById(workgroup_order_id);
        if (!workgroup_order) {
            return reply.fourorfour('workgroupOrder')
        }
        const user = request.user;
        const is_doing = await instance.WorkgroupOrder.findOne({
            _id: workgroup_order._id,
            employees: {
                $elemMatch: {
                    employee_id: user._id,
                    state: 'doing'
                }
            }
        })

        if (!is_doing) {
            return reply.response(411, 'workgroup is not activated');
        }

        const product = await instance.goodsSales.findById(product_id);
        if (!product) {
            return reply.fourorfour('Item')
        }

        const is_item_exist = await instance.WorkgroupOrder.findOne({
            _id: workgroup_order._id,
            items: {
                $elemMatch: {
                    $or: [
                        {
                            product_id: product._id
                        },
                        {
                            product_id: product._id + ''
                        }
                    ]
                }
            }
        });
        if (!is_item_exist) {
            return reply.fourorfour('Item')
        }

        const items = []
        for (const item of workgroup_order.items) {
            item.used_quantity = item.quantity
            items.push(item)
        }
        await instance.WorkgroupOrder.updateOne(
            {
                _id: workgroup_order._id,
                items: {
                    $elemMatch: {
                        $or: [
                            {
                                product_id: product._id
                            },
                            {
                                product_id: product._id + ''
                            }
                        ]
                    }
                }
            },
            {
                $set: {
                    'items.$.used_quantity': used_quantity
                }
            }
        );

        reply.ok(workgroup_order._id)
    } catch (error) {
        reply.error(error)
    }
    return reply;
}

module.exports = ((instance, _, next) => {

    const workgroupOrderSetUsedQuantity = {
        body: {
            type: 'object',
            additionalProperties: false,
            required: [
                'workgroup_order_id',
                'product_id',
                'used_quantity'
            ],
            properties: {
                workgroup_order_id: {
                    type: 'string',
                    minLength: 24,
                    maxLength: 24
                },
                product_id: {
                    type: 'string',
                    minLength: 24,
                    maxLength: 24
                },
                used_quantity: {
                    type: 'number',
                    minimum: 0
                }
            }
        }
    }

    instance.post(
        '/workgroup/order/set/used-quantity/by-item',
        {
            version: '1.0.0',
            schema: workgroupOrderSetUsedQuantity,
            attachValidation: true,
            preValidation: [instance.authorize_employee]
        },
        (request, reply) => {
            if (request.validationError) {
                return reply.validation(request.validationError.message)
            }
            return setUsedQuantity(request, reply, instance)
        }
    )

    next()
})
