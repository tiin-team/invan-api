
const workgroupCommentsGet = async function (request, reply, instance) {
    try {
        const user = request.user;
        const org = await instance.organizations.findById(user.organization);
        if(!org) {
            return reply.fourorfour('Organization')
        }
        if(!(org.workgroup_comments instanceof Array)) {
            org.workgroup_comments = [];
        }
        if(org.workgroup_comments.length>0) {
            org.workgroup_comments = typeof org.workgroup_comments[0] == typeof 'invan' ? [] : org.workgroup_comments
        }
        reply.ok(org.workgroup_comments)
    } catch (error) {
        reply.error(error.message)
    }
}

module.exports = ((instance, _, next) => {

    instance.get(
        '/workgroup/comments/get-own',
        {
            version: '1.0.0',
            preValidation: instance.authorize_admin,
        },
        async (request, reply) => {
            workgroupCommentsGet(request, reply, instance);
            return reply;
        }
    );

    next()
})
