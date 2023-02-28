
async function techMapUpdate(request, reply, instance) {
    try {
        const user = request.user;
        const data = request.body;
        data.organization = user.organization;
        const item = await instance.goodsSales.findById(data.product_id);
        if (!item) {
            return reply.fourorfour('Item')
        }
        data.product_id = item._id;
        data.product_name = item.name;
        const result = await instance.TechMap.updateTechMap(data._id, data);
        if (!result) {
            return reply.fourorfour('TechMap')
        }
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
                required: [
                    '_id', 'product_id', 'composite_items'
                ],
                additionalProperties: false,
                properties: {
                    _id: {
                        type: 'string',
                        minLength: 24,
                        maxLength: 24
                    },
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
        '/tech_map/update',
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
            return techMapUpdate(request, reply, instance);
        }
    )

    next()
})
