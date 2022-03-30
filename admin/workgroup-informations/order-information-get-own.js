
const orderInformationCreate = async function (request, reply, instance) {
    try {
        const { workgroup_id } = request.body;
        const workgroup = await instance.Workgroup.findById(workgroup_id);
        if(!workgroup) {
            return reply.fourorfour('workgroup')
        }
        reply.ok(workgroup.order_info)
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
        '/workgroup/order-information/get-own',
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
