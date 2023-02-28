
const getDeviceHandler = async function (request, reply, instance) {
    try {
        const user = request.user;
        const { workgroup_order_id } = request.body;
        const workgroupOrder = await instance.WorkgroupOrder.findById(workgroup_order_id);
        if(!workgroupOrder) {
            return reply.fourorfour('workgroupOrder')
        }
        
        let device_name;
        for(const e of workgroupOrder.employees) {
            if(e.employee_id+'' == user._id+'') {
                device_name = e.device_name
            }
        }
        
        if(!device_name) {
            return reply.fourorfour('Device')
        }
        reply.ok({device_name: device_name})
    } catch (error) {
        reply.error(error.message)
    }
    return reply;
}

module.exports = ((instance, _, next) => {

    const getDeviceSchema = {
        body: {
            type: 'object',
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
        '/workgroup/order/device-get',
        {
            version: '1.0.0',
            schema: getDeviceSchema,
            attachValidation: true,
            preValidation: [instance.authorize_employee]
        },
        (request, reply) => {
            if(request.validationError) {
                return reply.validation(request.validationError.message)
            }
            getDeviceHandler(request, reply, instance)
        }
    )

    next()
})
