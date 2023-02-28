
module.exports = ((instance, _, next) => {

    instance.post(
        '/settings/nds/update',
        {
            version: '1.0.0',
            schema: {
                body: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['value'],
                    properties: {
                        value: { type: 'number' }
                    }
                }
            }
        },
        (request, reply) => {
            instance.oauth_admin(request, reply, async (user) => {
                if (!user) {
                    return reply.error('Access')
                }
                const { value } = request.body;
                await instance.organizations.updateOne(
                    {
                        _id: user.organization
                    },
                    {
                        $set: {
                            nds_value: value
                        }
                    }
                )
                reply.ok({ value })
            })
        }
    )

    instance.get(
        '/settings/nds/get',
        { version: '1.0.0' },
        (request, reply) => {
            instance.authorization(request, reply, async (user) => {
                if (!user) {
                    return reply.error('Access')
                }
                const { nds_value } = await instance.organizations.findById(user.organization)
                return reply.ok({ nds: { value: nds_value } })
            })
        }
    )
    
    next()
})
