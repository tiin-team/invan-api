
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
        const workgroup_comments = [];
        for(const w of org.workgroup_comments) {
            if(w.text) {
                workgroup_comments.push(w.text)
            }
        }
        reply.ok(workgroup_comments)
    } catch (error) {
        reply.error(error.message)
    }
}

module.exports = ((instance, _, next) => {

    instance.get(
        '/workgroup/comments/get',
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
