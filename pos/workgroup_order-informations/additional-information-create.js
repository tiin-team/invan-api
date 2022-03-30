
const deviceInformationCreate = async function(request, reply, instance) {
    try {
        const { workgroup_order_id, info } = request.body;
        const workgroupOrder = await instance.WorkgroupOrder.findById(workgroup_order_id);
        if(!workgroupOrder) {
            return reply.fourorfour('workgroupOrder')
        }
        const user = request.user;
        // if(workgroupOrder.current_employee+'' != user._id+'') {
        //     return reply.response(411, 'workgroup order is not activated');
        // }
        // info.workgroup_id = workgroupOrder.current_workgroup;
        info.workgroup_id = user.workgroup_id;
        info.date = new Date().getTime()
        const exist = await instance.WorkgroupAdditionalInformation.findOne({
            organization: user.organization,
            workgroup_order_id: workgroup_order_id
        })
        if(exist) {
            await instance.WorkgroupAdditionalInformation.updateOne(
                { workgroup_order_id: workgroup_order_id },
                {
                    $push: {
                        info_list: info
                    }
                }
            );
        }
        else {
            await new instance.WorkgroupAdditionalInformation({
                organization: user.organization,
                workgroup_order_id: workgroup_order_id,
                info_list: [info]
            }).save()
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
                'workgroup_order_id', 'info'
            ],
            properties: {
                workgroup_order_id: {
                    type: 'string',
                    minLength: 24,
                    maxLength: 24
                },
                info: {
                    type: 'object'
                }
            }
        }
    }

    instance.post(
        '/workgroup_order/additional-information/create',
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
            deviceInformationCreate(request, reply, instance)
            return reply;
        }
    )

    next()
})
