
async function get_category_by_id(request, reply, instance) {
    try {
        const { id } = request.params;
        const user = request.user;
        const category = await instance.goodsCategory.findById(id);
        if (!category) {
            return reply.fourorfour('category')
        }

        let parent;
        if (category.type != 'top') {
            parent = await instance.goodsCategory.findById(category.type);
        }
        category.parent_categories = [
            {
                name: parent ? parent.name : 'Top'
            }
        ]

        let services = []
        const serviceObj = {};

        if (category.services instanceof Array) {
            for (const s of category.services) {
                serviceObj[s.service] = s
            }
        }
        else {
            category.services = []
        }
        const category_services = []

        services = await instance.services.find({ organization: user.organization })
        for (const s of services) {
            if (serviceObj[s._id]) {
                category_services.push(serviceObj[s._id])
            }
            else {
                category_services.push({
                    available: false,
                    service: s._id,
                    service_name: s.name
                })
            }
        }
        category.services = category_services;
        if (!category.present_type) {
            category.present_type = 'color'
        }
        reply.ok(category)
    } catch (error) {
        reply.error(error.message)
    }
    return reply;
}

module.exports = ((instance, _, next) => {

    instance.get(
        '/goods/category/get-by-id/:id',
        {
            version: '1.0.0',
        },
        (request, reply) => {
            instance.oauth_admin(request, reply, (user) => {
                if (!user) {
                    return reply.error('Access')
                }
                request.user = user
                get_category_by_id(request, reply, instance)
            })
        }
    )

    next()
})