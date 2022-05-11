
const fp = require('fastify-plugin');

async function supplierValuation(request, reply, instance) {
    try {
        const limit = !isNaN(parseInt(request.query.limit))
            ? parseInt(request.query.limit)
            : 10
        const page = !isNaN(parseInt(request.query.page))
            ? parseInt(request.query.page)
            : 1
        const sort = {}

        switch (request.query.sort_by) {
            case 'name':
                sort.name = parseInt(request.query.sort_type)
                break;
            case 'in_stock':
                sort.in_stock = parseInt(request.query.sort_type)
                break;
            default:
                sort._id = 1
                break;
        }

        const result = await instance.inventory_valuation_result(
            {
                limit,
                page,
                organization: request.user.organization,
                service: '',
                supplier_id: request.user._id,
                sort: sort,
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
        return reply.error(error.message)
    }
    return reply;
}

module.exports = fp((instance, _, next) => {
    const querySchema = {
        query: {
            type: 'object',
            additionalProperties: false,
            // required: ['organization', 'limit', 'page'],
            required: ['sort_by', 'sort_type'],
            properties: {
                // organization: { type: 'string', minLength: 24, maxLength: 24 },
                limit: { type: 'number', min: 1, max: 20 },
                page: { type: 'number', min: 1 },
                sort_by: { type: 'string', enum: ['name', 'in_stock'] },
                sort_type: {
                    type: 'number',
                    enum: [1, -1],
                },
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
                return reply.code(400).send(request.validationError)
            }

            return supplierValuation(request, reply, instance)
        }
    );

    next()
})
