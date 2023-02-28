
const fp = require('fastify-plugin')


async function getRestaurantCategory(request, reply, instance) {

    try {
        const service_id = request.body.service

        const service = await instance.services.findOne({ _id: service_id })
        if (!service) {
            return reply.fourorfour('Service')
        }

        const categories = await instance.goodsCategory.find({
            type: 'top',
            organization: service.organization
        }, { name: 1 })


        const result = []

        for (const categ of categories) {
            result.push(await instance.calculate_category_count(categ, service_id))
        }
        const all_categories = result.filter(c => c.count > 0)

        reply.ok(all_categories)

    }
    catch (error) {
        return reply.fourorfour('Service')
    }
}

module.exports = fp((instance, _, next) => {

    const getRestaurantCategorySchema = {
        body: {
            type: 'object',
            required: ['service'],
            properties: {
                service: { type: 'string' }
            }
        },
        response: {
            200: {
                type: 'object',
                properties: {
                    statusCode: {
                        type: 'number'
                    },
                    message: { type: 'string' },
                    data: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                _id: { type: 'string' },
                                name: { type: 'string' },
                                count: { type: 'number' }
                            }
                        }
                    }
                }
            }
        }
    }

    const hanler = (request, reply) => {
        if (request.validationError) {
            return reply.validation(request.validationError.message)
        }
        instance.authorization(request, reply, (user) => {
            request.user = user
            getRestaurantCategory(request, reply, instance)
        })
    }

    instance.post('/service/categories/get', {
        schema: getRestaurantCategorySchema,
        version: '1.1.0',
        attachValidation: true
    }, hanler)

    instance.post('/service/categories/get', {
        schema: getRestaurantCategorySchema,
        version: '1.0.0',
        attachValidation: true
    }, hanler)


    next()
})
