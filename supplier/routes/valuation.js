
const fp = require('fastify-plugin');

async function supplierValuation(request, reply, instance) {
    try {
        const { phone_number } = request.user;
        const { organization, limit, page } = request.body;
        const supplier = await instance.adjustmentSupplier.findOne({ organization, phone_number });
        if (!supplier) {
            throw { message: 'not found' }
        }
        const result = await instance.inventory_valuation_result({ limit, page, organization, service: '', supplier_id: supplier._id, }, instance);
        reply.ok(result)
    } catch (error) {
        reply.error(error.message)
    }
    return reply;
}

module.exports = fp((instance, _, next) => {

    console.log('valuations')

    const bodySchema = {
        body: {
            type: 'object',
            additionalProperties: false,
            required: [
                'organization',
                'limit',
                'page'
            ],
            properties: {
                organization: { type: 'string', minLength: 24, maxLength: 24 },
                limit: { type: 'number', min: 1, max: 20 },
                page: { type: 'number', min: 1 }
            }
        }
    }

    instance.post(
        '/supplier/valuation',
        {
            schema: bodySchema,
            attachValidation: true,
            preValidation: [instance.auth_supplier]
        },
        (request, reply) => {
            if (request.validationError) {
                return reply.validation(request.validationError.message)
            }
            return supplierValuation(request, reply, instance)
        }
    );

    next()
})
