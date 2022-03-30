
const deviceInformationGet = async function (request, reply, instance) {
    try {
        const user = request.user;
        if(!user.workgroup_id) {
            return reply.response(403, 'workgroup is not activated to user');
        }

        const workgroup = await instance.Workgroup.findById(user.workgroup_id);
        if(!workgroup) {
            return reply.fourorfour('workgroup');
        }
        const deviceinfo = [];
        for(const info of workgroup.device_info) {
            deviceinfo.push(info.text)
        }
        reply.ok(deviceinfo)
    } catch (error) {
        reply.error(error.message)
    }
}

module.exports = ((instance, _, next) => {

    instance.get(
        '/workgroup_order/device-information/get-params',
        {
            version: '1.0.0',
            preValidation: [instance.authorize_employee]
        },
        async (request, reply) => {
            deviceInformationGet(request, reply, instance)
            return reply;
        }
    )

    next()
})
