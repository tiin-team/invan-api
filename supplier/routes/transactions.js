

const fp = require('fastify-plugin')

async function supplierTransations(request, reply, instance) {
    try {
        const limit = !isNaN(parseInt(request.query.limit))
            ? parseInt(request.query.limit)
            : 10
        const page = !isNaN(parseInt(request.query.page))
            ? parseInt(request.query.page)
            : 1

        const { _id } = request.user;
        const supplier = await instance.adjustmentSupplier
            .findById(_id)
            .lean();

        if (!supplier) {
            return reply.code(404).send('Supplier not found')
        }

        const transactions = await instance.supplierTransaction
            .find({ supplier_id: supplier._id })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean()

        return reply.code(200).send({
            statusCode: 200,
            error: "Ok",
            message: "Success",
            limit: limit,
            page: page,
            data: transactions,
        })
    } catch (error) {
        reply.error(error.message)
    }
    return reply;
}

module.exports = fp((instance, _, next) => {
    console.log('transactions')

    const querySchema = {
        query: {
            type: 'object',
            additionalProperties: false,
            required: [
                // 'limit',
                // 'page'
            ],
            properties: {
                limit: { type: 'number', min: 1, max: 20 },
                page: { type: 'number', min: 1 }
            }
        }
    }

    instance.get(
        '/supplier/transactions',
        {
            schema: querySchema,
            attachValidation: true,
            preValidation: [instance.auth_supplier]
        },
        (request, reply) => {
            if (request.validationError) {
                return reply.validation(request.validationError.message)
            }
            return supplierTransations(request, reply, instance)
        }
    );

    next()
})