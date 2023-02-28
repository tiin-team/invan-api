
const workgroupOrderShiftGetLast = async function(request, reply, instance) {
    try {
        const user = request.user;
        const service_id = request.headers['accept-service']
        const service = await instance.services.findById(service_id);
        if(!service) {
            return reply.fourorfour('Service')
        }
        const pos_id = request.headers['accept-id']
        const pos = await instance.posDevices.findById(pos_id);
        if(!pos) {
            return reply.fourorfour('Pos')
        }

        const lastShift = await instance.WorkgroupShift.findOne({
            organization: user.organization,
            user_id: user._id,
            service: service_id,
            pos_id: pos_id,
            closing_time: 0
        })

        if(!lastShift) {
            return reply.fourorfour('lastShift')
        }

        reply.ok(lastShift)
    } catch (error) {
        reply.error(error.message)
    }
    return reply;
}

module.exports = ((instance, _, next) => {

    instance.get(
        '/workgroup/order/shift/get-last',
        {
            version: '1.0.0',
            preValidation: [instance.authorize_employee]
        },
        (request, reply) => {
            workgroupOrderShiftGetLast(request, reply, instance)
        }
    )

    next()
})
