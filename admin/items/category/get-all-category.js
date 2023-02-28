
async function get_categories(request, reply, instance) {
    try {
        const user = request.user;
        const categories = await instance.goodsCategory.find({ organization: user.organization });
        reply.ok(categories)
    } catch (error) {
        reply.error(error.message)
    }
    return reply;
}

module.exports = ((instance, _, next) => {

    instance.get(
        '/item/categories/all/get',
        {
            version: '1.0.0',
        },
        (request, reply) => {
            instance.oauth_admin(request, reply, (user) => {
                if (!user) {
                    return reply.error('Access')
                }
                request.user = user
                get_categories(request, reply, instance)
            })
        }
    );

    next()
})
