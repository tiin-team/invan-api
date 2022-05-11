
const fp = require('fastify-plugin');

async function supplierValuation(request, reply, instance) {
    try {
        // const { phone_number } = request.user;
        // const { organization, limit, page } = request.body;
        const limit = !isNaN(parseInt(request.query.limit))
            ? parseInt(request.query.limit)
            : 10
        const page = !isNaN(parseInt(request.query.page))
            ? parseInt(request.query.page)
            : 1
        const result = await instance.inventory_valuation_result(
            {
                limit,
                page,
                organization: request.user.organization,
                service: '',
                supplier_id: request.user._id,
                sort: { _id: 1 },
            },
            instance
        );
        return reply.code(200).send({
            statusCode: 200,
            error: "Ok",
            message: "Success",
            limit: limit,
            page: page,
            inventory: result.inventory,
            retail: result.retail,
            potential: result.potential,
            total: result.total,
            margin: result.margin,
            page_count: result.page,
            data: result.data,
        })
        // reply.ok(result)
    } catch (error) {
        reply.error(error.message)
    }
    return reply;
}

module.exports = fp((instance, _, next) => {
    const querySchema = {
        query: {
            type: 'object',
            additionalProperties: false,
            // required: ['organization', 'limit', 'page'],
            properties: {
                // organization: { type: 'string', minLength: 24, maxLength: 24 },
                limit: { type: 'number', min: 1, max: 20 },
                page: { type: 'number', min: 1 }
            }
        }
    }

    instance.get(
        '/supplier/valuation',
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
            return supplierValuation(request, reply, instance)
        }
    );

    next()
})
