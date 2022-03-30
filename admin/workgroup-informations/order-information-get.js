
const orderInformationCreate = async function (request, reply, instance) {
    try {
        const { workgroup_id } = request.body;
        const workgroup = await instance.Workgroup.findById(workgroup_id);
        if(!workgroup) {
            return reply.fourorfour('workgroup')
        }
        const order_info = []
        for(const info of workgroup.order_info) {
            order_info.push(info.text)
        }
        reply.ok(order_info)
    } catch (error) {
        reply.error(error.message)
    }
}

module.exports = ((instance, _, next) => {

    const orderInformationGetSchema = {
        body: {
            type: 'object',
            required: [
                'workgroup_id'
            ],
            properties: {
                workgroup_id: {
                    type: 'string',
                    minLength: 24,
                    maxLength: 24
                }
            }
        }
    }

    instance.post(
        '/workgroup/order-information/get',
        {
            version: '1.0.0',
            preValidation: instance.authorize_admin,
            schema: orderInformationGetSchema,
            atachValidation: true
        },
        async (request, reply) => {
            orderInformationCreate(request, reply, instance)
            return reply;
        }
    )

    next()
})
