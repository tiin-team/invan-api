
const orderItemsFindHandler = async (request, reply, instance) => {
    try {
        const user = request.user;
        const service = request.headers['accept-service'];
        
        const matchOrders = {
            $match: {
                // organization: user.organization,
                // service: service
            }
        }
        const unwindItems = {
            $unwind: {
                path: '$items'
            }
        }
        const projectItems = {
            $project: {
                product_id: '$items.product_id',
                product_name: '$items.product_name',
                price: '$items.price',
                count: '$items.amount',
                order_id: '$_id'
            }
        }
        const orderItems = await instance.orders.aggregate([
            matchOrders,
            unwindItems,
            projectItems
        ]).allowDiskUse(true);

        reply.ok(orderItems)
    } catch (error) {
        reply.error(error.message)
    }
    return reply;
}

module.exports = ((instance, options, next) => {

    instance.get(
        '/order_items/find',
        {
            version: '1.0.0',
            preValidation: [instance.authorize_employee]
        },
        (request, reply) => {
            orderItemsFindHandler(request, reply, instance)
        }
    )

    next()
})