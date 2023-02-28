
const deviceInformationCreate = async function (request, reply, instance) {
    try {
        const { workgroup_id } = request.body;
        const workgroup = await instance.Workgroup.findById(workgroup_id);
        if(!workgroup) {
            return reply.fourorfour('workgroup')
        }
        const device_info = [];
        for(const info of workgroup.device_info) {
            device_info.push(info.text)
        }
        reply.ok(device_info)
    } catch (error) {
        reply.error(error.message)
    }
}

module.exports = ((instance, _, next) => {

    const deviceInformationGetSchema = {
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
        '/workgroup/device-information/get',
        {
            version: '1.0.0',
            preValidation: instance.authorize_admin,
            schema: deviceInformationGetSchema,
            atachValidation: true
        },
        async (request, reply) => {
            deviceInformationCreate(request, reply, instance)
            return reply;
        }
    )

    next()
})
