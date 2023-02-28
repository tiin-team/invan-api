
const fp = require('fastify-plugin')

async function getOrganizations(request, reply, instance) {
    try {
        const { phone_number } = request.user;
        const result = await instance.adjustmentSupplier.aggregate([
            {
                $match: { phone_number }
            },
            {
                $group: {
                    _id: null,
                    ids: {
                        $push: '$organization'
                    }
                }
            }
        ]);
        const ids = result.length == 0 ? [] : result[0].ids;
        const organizations = await instance.organizations.find({ _id: { $in: ids } }, { name: 1 });
        reply.ok(organizations);
    } catch (error) {
        reply.error(error)
    }
    return reply;
}

module.exports = fp((instance, _, next) => {

    instance.get(
        '/organizations',
        {
            version: '2.0.0',
            preValidation: [instance.auth_supplier],
        },
        (request, reply) => {
            return getOrganizations(request, reply, instance)
        }
    );

    next()
})
