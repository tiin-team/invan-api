
const setDeviceHandler = async function (request, reply, instance) {
    try {
        const user = request.user;
        const { workgroup_order_id, device_name } = request.body;
        const workgroupOrder = await instance.WorkgroupOrder.findById(workgroup_order_id);
        if(!workgroupOrder) {
            return reply.fourorfour('workgroupOrder')
        }
        // if (workgroupOrder.current_employee + '' != user._id + '') {
        //     return reply.response(411, 'workgroup is not activated');
        // }
        await instance.WorkgroupOrder.updateOne(
            {
                _id: workgroup_order_id,
                employees: {
                    $elemMatch: {
                        employee_id: user._id
                    }
                }
            },
            {
                $set: {
                    "employees.$.device_name": device_name
                }
            }
        )
        reply.ok()
    } catch (error) {
        reply.error(error.message)
    }
    return reply;
}

module.exports = ((instance, _, next) => {

    const setDeviceSchema = {
        body: {
            type: 'object',
            required: [
                'workgroup_order_id',
                'device_name'
            ],
            properties: {
                workgroup_order_id: {
                    type: 'string',
                    minLength: 24,
                    maxLength: 24
                },
                device_name: {
                    type: 'string'
                }
            }
        }
    }

    instance.post(
        '/workgroup/order/device-set',
        {
            version: '1.0.0',
            schema: setDeviceSchema,
            attachValidation: true,
            preValidation: [instance.authorize_employee]
        },
        (request, reply) => {
            if(request.validationError) {
                return reply.validation(request.validationError.message)
            }
            setDeviceHandler(request, reply, instance)
        }
    )

    next()
})
