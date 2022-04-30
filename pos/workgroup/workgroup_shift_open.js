
const workgroupOrderShiftOpen = async function (request, reply, instance) {
    try {
        const user = request.user;
        const service_id = request.headers['accept-service']
        const service = await instance.services.findById(service_id);
        if (!service) {
            return reply.fourorfour('Service')
        }
        request.body.service = service._id;
        const pos_id = request.headers['accept-id']
        const pos = await instance.posDevices.findById(pos_id).lean();
        if (!pos) {
            return reply.fourorfour('Pos')
        }
        request.body.pos_id = pos._id;

        const notClosed = await instance.WorkgroupShift.findOne({
            organization: user.organization,
            user_id: user._id,
            service: service_id,
            pos_id: pos_id,
            closing_time: 0
        })

        if (notClosed) {
            return reply.response(411, 'Shift not closed');
        }

        const id = await instance.WorkgroupShift.insertWorkgroupShift(request.body, user);
        reply.ok({ id })
    } catch (error) {
        reply.error(error.message)
    }
    return reply;
}

module.exports = ((instance, _, next) => {

    const workgroupOrderShiftSchema = {
        body: {
            type: 'object',
            required: [
                'comment'
            ],
            properties: {
                comment: {
                    type: 'string'
                }
            }
        }
    }

    instance.post(
        '/workgroup/order/shift/open',
        {
            version: '1.0.0',
            schema: workgroupOrderShiftSchema,
            attachValidation: true,
            preValidation: [instance.authorize_employee]
        },
        (request, reply) => {
            if (request.validationError) {
                return reply.validation(request.validationError.message)
            }
            workgroupOrderShiftOpen(request, reply, instance)
        }
    )

    next()
})
