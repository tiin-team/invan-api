
const deviceInformationUpdate = async function(request, reply, instance) {
    try {
        const { workgroup_order_id, info, date } = request.body;
        const workgroupOrder = await instance.WorkgroupOrder.findById(workgroup_order_id);
        if(!workgroupOrder) {
            return reply.fourorfour('workgroupOrder')
        }
        const user = request.user;
        // if(workgroupOrder.current_employee+'' != user._id+'') {
        //     return reply.response(411, 'workgroup order is not activated');
        // }

        info.workgroup_id = user.workgroup_id;
        info.date = date;
        const workgroupDeviceInformation = await instance.WorkgroupDeviceInformation.findOne({
            organization: user.organization,
            workgroup_order_id: workgroup_order_id
        })

        if(!workgroupDeviceInformation) {
            return reply.fourorfour('WorkgroupDeviceInformation')
        }
        
        await instance.WorkgroupDeviceInformation.updateOne(
            {
                _id: workgroupDeviceInformation._id,
                info_list: {
                    $elemMatch: {
                        date: date,
                        workgroup_id: user.workgroup_id
                    }
                }
                // "info_list.date": date, "info_list.workgroup_id": user.workgroup_id
            },
            {
                $set: {
                    'info_list.$': info
                }
            }
        )
        try {
            const usedInfo = {}
            info.date = new Date().getTime()
            info.IsComplete = 'false'
            const workgroup = await instance.Workgroup.findById(info.workgroup_id);
            for(const w_info of workgroup.device_info) {
                if(info[w_info.text]) {
                    for(const w_id of w_info.workgroup) {
                        let workgroup_id = w_id;
                        if(!usedInfo[workgroup_id]) {
                            usedInfo[workgroup_id] = true;
                            try {
                                workgroup_id = instance.ObjectId(workgroup_id);
                            } catch (error) {}
                            info.workgroup_id = workgroup_id;
                            const existInfo = await instance.WorkgroupDeviceInformation.findOne({
                                workgroup_order_id: workgroup_order_id,
                                $elemMatch: {
                                    date: date,
                                    workgroup_id: info.workgroup_id
                                }
                                // "info_list.date": date,
                                // "info_list.workgroup_id": info.workgroup_id
                            })
                            console.log(existInfo)
                            if(!existInfo) {
                                await instance.WorkgroupDeviceInformation.updateOne(
                                    { workgroup_order_id: workgroup_order_id },
                                    {
                                        $push: {
                                            info_list: info
                                        }
                                    }
                                );
                            }
                        }
                    }
                }
            }
        } catch (error) {
            instance.log.error(error.message)
        }
        reply.ok()
    } catch (error) {
        reply.error(error.message)
    }
    return reply;
}

module.exports = ((instance, _, next) => {

    const deviceInformationSchema = {
        body: {
            type: 'object',
            required: [
                'workgroup_order_id', 'info', 'date'
            ],
            properties: {
                workgroup_order_id: {
                    type: 'string',
                    minLength: 24,
                    maxLength: 24
                },
                date: {
                    type: 'number'
                },
                info: {
                    type: 'object'
                }
            }
        }
    }

    instance.post(
        '/workgroup_order/device-information/update',
        {
            version: '1.0.0',
            preValidation: [instance.authorize_employee],
            schema: deviceInformationSchema,
            attachValidation: true
        },
        async (request, reply) => {
            if(request.validationError) {
                return reply.validation(request.validationError.message)
            }
            deviceInformationUpdate(request, reply, instance)
            return reply;
        }
    )

    next()
})
