

const fp = require('fastify-plugin')
const { getPurchasePdf } = require('../services/purchase')

module.exports = fp((instance, _, next) => {
    console.log('purchase')

    const querySchema = {
        query: {
            type: 'object',
            additionalProperties: false,
            required: [],
            properties: {
                type: { type: 'string', enum: ['exel', 'pdf'] },
            }
        }
    }

    instance.get(
        '/inventory/purchase/pdf/:id/:name',
        {
            version: '1.0.0',
            schema: querySchema,
            attachValidation: true,
            preValidation: [instance.auth_supplier]
        },
        (request, reply) => {
            if (request.validationError) {
                return reply.validation(request.validationError.message)
            }
            return getPurchasePdf(request, reply, instance)
        }
    );

    next()
})