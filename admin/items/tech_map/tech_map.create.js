
async function techMapCreate(request, reply, instance) {
    try {
        const user = request.user;
        const data = request.body;
        const item = await instance.goodsSales.findById(data.product_id);
        if (!item) {
            return reply.fourorfour('Item')
        }
        data.product_id = item._id;
        data.product_name = item.name;
        data.organization = user.organization;
        const result = await instance.TechMap.saveTechMap(data);
        reply.ok(result._id)
    } catch (error) {
        if (error.name == 'MongoError' && error.code == 11000) {
            return reply.techMapExist()
        }
        reply.error(error.message)
    }
    return reply;
}

module.exports = ((instance, _, next) => {

    const schema = {
        schema: {
            body: {
                type: 'object',
                additionalProperties: false,
                required: [
                    'product_id', 'composite_items'
                ],
                properties: {
                    product_id: {
                        type: 'string',
                        minLength: 24,
                        maxLength: 24
                    },
                    composite_items: {
                        type: 'array',
                        minItems: 1,
                        items: {
                            type: 'object',
                            additionalProperties: false,
                            required: [
                                'product_id',
                                'quality',
                                'cost'
                            ],
                            properties: {
                                product_id: {
                                    type: 'string',
                                    minLength: 24,
                                    maxLength: 24
                                },
                                quality: {
                                    type: 'number',
                                    min: 0
                                },
                                cost: {
                                    type: 'number',
                                    min: 0
                                },
                                cost_currency: {
                                    type: 'string',
                                    default: 'uzs'
                                },
                                sku: {
                                    type: 'number'
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    instance.post(
        '/tech_map/create',
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
            return techMapCreate(request, reply, instance);
        }
    )

    next()
})
