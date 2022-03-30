
const deviceInformationUpdate = async function(request, reply, instance) {
    try {
        const { workgroup_order_id, info, date } = request.body;
        const workgroupOrder = await instance.WorkgroupOrder.findById(workgroup_order_id);
        if(!workgroupOrder) {
            return reply.fourorfour('workgroupOrder')
        }
        const user = request.user;
        if(workgroupOrder.current_employee+'' != user._id+'') {
            return reply.response(411, 'workgroup order is not activated');
        }

        info.workgroup_id = user.workgroup_id;
        info.date = date;
        const workgroupAdditionalInformation = await instance.WorkgroupAdditionalInformation.findOne({
            organization: user.organization,
            workgroup_order_id: workgroup_order_id
        })

        if(!workgroupAdditionalInformation) {
            return reply.fourorfour('WorkgroupAdditionalInformation')
        }
        
        await instance.WorkgroupAdditionalInformation.updateOne(
            {
                _id: workgroupAdditionalInformation._id,
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
        '/workgroup_order/additional-information/update',
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
