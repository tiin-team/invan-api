
async function reports_safe(request, reply, instance) {
    try {
        const { page, type } = request.body;
        const user = request.user;
        const result = await instance.Safe.getReports(type, page, user.organization);
        reply.ok(result)
    } catch (error) {
        reply.error(error.message)
    }
    return reply;
}

module.exports = ((instance, options, next) => {


    instance.post(
        '/reports/safe',
        {
            version: '1.0.0',
            preValidation: [instance.authorize_admin]
        },
        (request, reply) => {
            return reports_safe(request, reply, instance)
        }
    )

    next()

})