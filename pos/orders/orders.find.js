
const ordersFindHandler = async (request, reply, instance) => {
    try {
        const user = request.user;
        const service_id = request.headers['accept-service'];
        const service = await instance.services.findById(service_id);
        if (!service) {
            return reply.fourorfour('Order')
        }

        const matchOrders = {
            $match: {
                organization: user.organization,
                service: service._id
            }
        }
        const projectOrders = {
            $project: {
                organization: 1,
                service: 1,
                language: 'ru',
                table_id: 'Default table',
                table_name: 'Order from bot',
                user_id: '$phone_number',
                id: '$id'
            }
        }
        const orders = await instance.orders.aggregate([
            matchOrders,
            projectOrders
        ]).allowDiskUse(true);
        reply.ok(orders)
    } catch (error) {
        reply.error(error.message)
    }
    return reply;
}

module.exports = ((instance, options, next) => {

    instance.get(
        '/orders/find',
        {
            version: '1.0.0',
            preValidation: [instance.authorize_employee]
        },
        (request, reply) => {
            ordersFindHandler(request, reply, instance)
        }
    )

    next()
})
