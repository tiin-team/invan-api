
async function update_category_by_id(request, reply, instance) {
    try {
        const data = request.body;
        const { target } = request.params;
        if (target != 'create') {
            const category = await instance.goodsCategory.findById(target);
            if (!category) {
                return reply.fourorfour('category')
            }
            if (category.is_other) {
                data.name = 'Other';
                data.type = 'top'
            }
            await instance.goodsCategory.updateOne({ _id: category._id }, { $set: data });
            return reply.ok(category._id)
        }
        const organization = request.user.organization;
        const params = {
            ...data,
            organization
        }
        
        const { _id: id } = await new instance.goodsCategory(params).save();
        await instance.goodsCategory.updateOne({ _id: data.type }, { $set: { item_tree: true } })
        reply.ok(id);
    } catch (error) {
        reply.error(error.message)
    }
    return reply;
}

module.exports = ((instance, _, next) => {

    const schema = {
        schema: {
            body: {
                type: 'object',
                required: [
                    'name',
                    'type',
                    'color'
                ],
                additionalProperties: false,
                properties: {
                    name: { type: 'string' },
                    draggable_position: { type: 'number' },
                    type: { type: 'string', default: 'top' },
                    image: { type: 'string', default: null },
                    present_type: { type: 'string', default: 'color' },
                    color: { type: 'string' },
                    show_on_bot: { type: 'boolean', default: false },
                    show_on_bot_services: { type: 'array', default: [], items: { type: 'string' } },
                    services: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                service: { type: 'string' },
                                available: { type: 'boolean' }
                            }
                        }
                    }
                }
            }
        },
        attachValidation: true
    }

    instance.post(
        '/goods/category/create-update/:target',
        {
            version: '1.0.0',
            ...schema
        },
        (request, reply) => {
            if (request.validationError) {
                return reply.validation(request.validationError.message)
            }
            instance.oauth_admin(request, reply, (user) => {
                if (!user) {
                    return reply.error('Access')
                }
                request.user = user
                update_category_by_id(request, reply, instance)
            })
        }
    );

    next()
})
