
const fp = require('fastify-plugin')

async function getOrganizations(request, reply, instance) {
    try {
        const supplier = request.user

        const result = await instance.adjustmentSupplier.aggregate([
            {
                $match: { phone_number: supplier.phone_number },
            },
            {
                $group: {
                    _id: null,
                    ids: { $push: '$organization' }
                }
            }
        ]);
        const ids = result.length == 0 ? [] : result[0].ids;

        const organizations = await instance.organizations
            .find({ _id: { $in: ids } }, { name: 1 })
            .lean();

        return reply.ok(organizations);
    } catch (error) {
        return reply.error(error)
    }
    return reply;
}

module.exports = fp((instance, _, next) => {
    instance.get(
        '/organizations',
        {
            version: '1.0.0',
            preValidation: [instance.auth_supplier]
        },
        async (request, reply) => {
            return await getOrganizations(request, reply, instance)
        }
    );

    next()
})
