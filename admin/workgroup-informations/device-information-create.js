
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
                    device_info: info_list
                }
            }
        )
        for(const i of infolist) {
            for(const w_id of i.workgroup) {
                try {
                    const w = await instance.Workgroup.findById(w_id);
                    if(w) {
                        const existText = {}
                        for(const info of w.device_info) {
                            existText[info.text] = true;
                        }
                        if(!existText[i.text]) {
                            await instance.Workgroup.updateOne(
                                { _id: w_id },
                                {
                                    $push: {
                                        device_info: {
                                            text: i.text,
                                            workgroup: []
                                        }
                                    }
                                }
                            )
                        }
                    }
                } catch (error) {
                    instance.log.error(error.message)
                }
            }
        }
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
                            'text', 'workgroup'
                        ],
                        properties: {
                            text: {
                                type: 'string',
                                minLength: 1
                            },
                            workgroup: {
                                type: 'array',
                                items:  {
                                    type: 'string',
                                    minLength: 24,
                                    maxLength: 24
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    instance.post(
        '/workgroup/device-information/create',
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
