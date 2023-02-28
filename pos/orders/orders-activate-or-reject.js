
const acceptOrRejectOrder = async (request, reply, instance) => {
    try {
        const user = request.user;
        const { order_id, is_reject } = request.body;
        let order = await instance.orders.findById(order_id);
        if (!order) {
            return reply.fourorfour('Order')
        }

        try {
            order = order.toObject()
        } catch (error) { }

        if (is_reject) {
            await instance.orders.deleteOne({ _id: order._id });
            return reply.ok()
        }

        const current_time = new Date().getTime();
        const ticketData = {
            created_time: current_time,
            opening_time: current_time,
            waiter_id: user._id,
            waiter_name: user.name,
            table_id: 'bot_table',
            table_name: 'bot_table',
            is_closed: false,
            user_id: order.user_id,
            ...order
        }
        const ticket = await new instance.Tickets(ticketData).save();

        for (const it of order.items) {
            const itemData = {
                organization: ticket.organization,
                service: ticket.service,
                name: it.product_name,
                product_id: it.product_id,
                price: it.price,
                count: it.amount,
                cost: 0,
                category_id: '',
                created_time: current_time,
                ticket_id: ticket._id
            }
            await new instance.Item_Data(itemData).save()
        }

        await instance.orders.deleteOne({ _id: order._id });
        reply.ok();

    } catch (error) {
        reply.error(error.message)
    }
    return reply;
}

module.exports = ((instance, _, next) => {

    const bodySchema = {
        body: {
            type: 'object',
            required: [
                'order_id'
            ],
            properties: {
                order_id: {
                    type: 'string',
                    minLength: 24,
                    maxLength: 24
                },
                is_reject: {
                    type: 'boolean'
                }
            }
        }
    }

    instance.post(
        '/orders/activate_or_reject',
        {
            version: '1.0.0',
            schema: bodySchema,
            attachValidation: true,
            preValidation: [instance.authorize_employee]
        },
        (request, reply) => {
            if (request.validationError) {
                return reply.validation(request.validationError.message)
            }
            return acceptOrRejectOrder(request, reply, instance)
        }
    )

    next()
})
