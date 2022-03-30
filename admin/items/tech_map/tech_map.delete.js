
async function techMapDelete(request, reply, instance) {
    try {
        const user = request.user;
        const data = request.body;
        data.organization = user.organization;
        const result = await instance.TechMap.deleteMany({
            organization: user.organization,
            _id: {
                $in: data.indexes
            }
        });

        reply.ok(result)
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
                    'indexes'
                ],
                properties: {
                    indexes: {
                        type: 'array',
                        items: {
                            type: 'string',
                            minItems: 24,
                            maxItems: 24
                        }
                    }
                }
            }
        }
    }

    instance.post(
        '/tech_map/delete_group',
        {
            ...schema,
            version: '1.0.0',
            preValidation: [instance.authorize_admin],
            attachValidation: true
        },
        (request, reply) => {
            if (request.validationError) {
                return reply.validation(request.validationError.message)
            }
            return techMapDelete(request, reply, instance);
        }
    )

    next()
})
