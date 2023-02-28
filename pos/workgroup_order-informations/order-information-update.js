
const orderInformationUpdate = async function(request, reply, instance) {
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
        const workgroupOrderInformation = await instance.WorkgroupOrderInformation.findOne({
            organization: user.organization,
            workgroup_order_id: workgroup_order_id
        })

        if(!workgroupOrderInformation) {
            return reply.fourorfour('workgroupOrderInformation')
        }

        await instance.WorkgroupOrderInformation.updateOne(
            {
                _id: workgroupOrderInformation._id,
                info_list: {
                    $elemMatch: {
                        date: date,
                        workgroup_id: user.workgroup_id
                    }
                }
            },
            {
                $set: {
                    'info_list.$': info
                }
            }
        )

        try {
            const workgroup = await instance.Workgroup.findById(info.workgroup_id);
            const usedInfo = {};
            info.date = new Date().getTime()
            info.IsComplete = 'false'
            for(const w_info of workgroup.order_info) {
                if(info[w_info.text]) {
                    for(const w_id of w_info.workgroup) {
                        let workgroup_id = w_id;
                        if(!usedInfo[workgroup_id]) {
                            usedInfo[workgroup_id] = true;
                            try {
                                workgroup_id = instance.ObjectId(workgroup_id);
                            } catch (error) {}
                            info.workgroup_id = workgroup_id;
                            const existInfo = await instance.WorkgroupOrderInformation.findOne({
                                workgroup_order_id: workgroup_order_id,
                                info_list: {
                                    $elemMatch: {
                                        date: date,
                                        workgroup_id: info.workgroup_id
                                    }
                                }
                                // "info_list.date": date,
                                // "info_list.workgroup_id": info.workgroup_id
                            })
                            if(!existInfo) {
                                await instance.WorkgroupOrderInformation.updateOne(
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

    const orderInformationSchema = {
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
                info: {
                    type: 'object'
                },
                date: {
                    type: 'number'
                }
            }
        }
    }

    instance.post(
        '/workgroup_order/order-information/update',
        {
            version: '1.0.0',
            preValidation: [instance.authorize_employee],
            schema: orderInformationSchema,
            attachValidation: true
        },
        async (request, reply) => {
            if(request.validationError) {
                return reply.validation(request.validationError.message)
            }
            orderInformationUpdate(request, reply, instance)
            return reply;
        }
    )

    next()
})
