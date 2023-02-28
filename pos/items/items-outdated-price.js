
module.exports = ((instance, _, next) => {

    instance.post(
        '/items/price-outdated',
        {
            version: '1.0.0',
            schema: {
                body: {
                    type: 'object',
                    additionalProperties: false,
                    required: [
                        'indexes'
                    ],
                    properties: {
                        indexes: {
                            type: 'array',
                            minItems: 1,
                            items: {
                                type: 'string',
                                minLength: 24,
                                maxLength: 24
                            }
                        }
                    }
                }
            },
            attachValidation: true
        },
        (request, reply) => {
            if(request.validationError) {
                return reply.validation(request.validationError.message)
            }
            instance.authorization(request, reply, async (user) => {
                if(!user) {
                    return reply.error('Access')
                }
                const indexes = request.body.indexes;
                await new instance.outdatedPrices({
                    organization: user.organization,
                    service: request.headers['accept-service'],
                    date: new Date().getTime(),
                    indexes: indexes
                }).save()
                return reply.ok({indexes})
            })
        }
    )

    next()
})
