
const deviceInformationCreate = async function (request, reply, instance) {
    try {
        const { info_list, workgroup_id } = request.body;
        const workgroup = await instance.Workgroup.findById(workgroup_id);
        if(!workgroup) {
            return reply.fourorfour('Workgroup');
        }
        const infolist = []
        const infolistMap = {}
        for(const i of info_list) {
            if(!infolistMap[i.text]) {
                infolist.push(i)
            }
            infolistMap[i.text] = true
        }
        await instance.Workgroup.updateOne(
            { _id: workgroup_id },
            {
                $set: {
                    additional_info: info_list
                }
            }
        )
        
        reply.ok({id: workgroup_id})
    } catch (error) {
        reply.error(error.message)
    }
}

module.exports = ((instance, _, next) => {

    const deviceInformationSchema = {
        body: {
            type: 'object',
            required: [
                'workgroup_id', 'info_list'
            ],
            properties: {
                workgroup_id: {
                    type: 'string',
                    minLength: 24,
                    maxLength: 24
                },
                info_list: {
                    type: 'array',
                    items: {
                        type: 'object',
                        required: [
                            'text',
                        ],
                        properties: {
                            text: {
                                type: 'string',
                                minLength: 1
                            }
                        }
                    }
                }
            }
        }
    }

    instance.post(
        '/workgroup/additional-information/create',
        {
            version: '1.0.0',
            schema: deviceInformationSchema,
            preValidation: instance.authorize_admin,
            attachValidation: true
        },
        async (request, reply) => {
            if(request.validationError) {
                return reply.validation(request.validationError.message)
            }
            deviceInformationCreate(request, reply, instance)
            return reply;
        }
    )

    next()
})
