
async function setUsedQuantity(request, reply, instance) {
    try {
        const { workgroup_order_id } = request.body;
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

        const items = []
        for (const item of workgroup_order.items) {
            let is_equal = false;
            try {
                for (const w of item.workgroups) {
                    is_equal = is_equal || (w + '' == user.workgroup_id + '');
                }
            } catch (error) { }

            if (is_equal) {
                item.used_quantity = item.quantity
            }
            item.product_id = instance.ObjectId(item.product_id)
            items.push(item)
        }
        await instance.WorkgroupOrder.updateOne(
            { _id: workgroup_order._id },
            {
                $set: {
                    items
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
                'workgroup_order_id'
            ],
            properties: {
                workgroup_order_id: {
                    type: 'string',
                    minLength: 24,
                    maxLength: 24
                }
            }
        }
    }

    instance.post(
        '/workgroup/order/set/used-quantity',
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
