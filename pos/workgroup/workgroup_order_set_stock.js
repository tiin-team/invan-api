
const workgroupOrderSetStock = async function (request, reply, instance) {
    try {
        const user = request.user;
        const { workgroup_order_id, stock } = request.body;
        const workgroup_order = await instance.WorkgroupOrder.findById(workgroup_order_id);
        if (!workgroup_order) {
            return reply.fourorfour('workgroupOrder')
        }

        if (workgroup_order.current_employee + '' != user._id + '') {
            return reply.response(411, 'workgroup is not activated');
        }

        const workgroup = await instance.Workgroup.findById(workgroup_order.current_workgroup);
        if (!workgroup || !workgroup.is_warehouse) {
            return reply.response(412, 'Warehause is not activated');
        }

        const result = await instance.WorkgroupOrder.setStockWorkgroupOrder(workgroup_order, stock);
        if (!result) {
            return reply.error('Could not update');
        }
        reply.ok(result)
    } catch (error) {
        reply.error(error.message)
    }
}

module.exports = ((instance, _, next) => {

    const workgroupOrderSetStockSchema = {
        body: {
            type: 'object',
            required: [
                'workgroup_order_id',
                'stock'
            ],
            properties: {
                workgroup_order_id: {
                    type: 'string',
                    minLength: 24,
                    maxLength: 24
                },
                stock: {
                    type: 'number'
                }
            }
        }
    }

    instance.post(
        '/workgroup/order/set/stock',
        {
            version: '1.0.0',
            schema: workgroupOrderSetStockSchema,
            attachValidation: true,
            preValidation: [instance.authorize_employee]
        },
        async (request, reply) => {
            if (request.validationError) {
                return reply.validation(request.validationError.message)
            }
            workgroupOrderSetStock(request, reply, instance)
            return reply;
        }
    )

    next()
})
