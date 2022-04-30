
const workgroupOrderShiftClose = async function (request, reply, instance) {
    try {
        const user = request.user;
        const service_id = request.headers['accept-service']
        const service = await instance.services.findById(service_id);
        if (!service) {
            return reply.fourorfour('Service')
        }

        const pos_id = request.headers['accept-id']
        const pos = await instance.posDevices.findById(pos_id).lean();
        if (!pos) {
            return reply.fourorfour('Pos')
        }

        const workgroup_shift = await instance.WorkgroupShift.findOne({
            organization: user.organization,
            user_id: user._id,
            service: service_id,
            pos_id: pos_id,
            closing_time: 0
        })
            .lean()

        if (!workgroup_shift) {
            return reply.fourorfour('WorkgroupShift')
        }
        await instance.WorkgroupShift.updateOne(
            { _id: workgroup_shift._id },
            {
                $set: {
                    closing_time: new Date().getTime()
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

    instance.post(
        '/workgroup/order/shift/close',
        {
            version: '1.0.0',
            preValidation: [instance.authorize_employee]
        },
        (request, reply) => {
            workgroupOrderShiftClose(request, reply, instance)
        }
    )

    next()
})
