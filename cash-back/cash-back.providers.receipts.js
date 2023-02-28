module.exports = ((instance, _, next) => {

    instance.get('/cash-back/receipts/:organization', { version: '1.0.0' }, async (request, reply) => {
        const organization = request.params.organization;
        const { phone_number } = request.query;
        const query = { cashback_phone: { $regex: phone_number, $options: 'i' }, }
        if (organization == '5f5641e8dce4e706c062837a' || organization == '61ae2917a914c3ba42fc626f')
            query.organization = { $in: ['5f5641e8dce4e706c062837a', '61ae2917a914c3ba42fc626f'] }
        else
            query.organization = organization
        const receipts = await instance.Receipts.find(
            query,
            {
                _id: 1,
                cash_back: 1,
                cashback_phone: 1,
                client: 1,
                client_name: 1,
                service: 1,
                is_self: 1,
                created_time: 1,
                receipt_no: 1,
                total_price: 1,
                additional: 1,
                difference: 1,
                cashier_id: 1,
                cashier_name: 1,
                waiter_id: 1,
                service_value: 1,
                pos_id: 1,
                pos_name: 1,
                is_refund: 1,
                debt_id: 1,
                ticket_id: 1,
                is_charged: 1,
                currency: 1,
                total_discount: 1,
                sold_item_list: 1,
                discount: 1,
                date: 1,
                payment: 1,
                taxes: 1,
                user_id: 1,
                order_id: 1,
                point_balance: 1,
                receipt_type: 1,
                receipt_state: 1,
                refund_not_stock: 1,
                created_from: 1,
                createdAt: 1,
                updatedAt: 1,
                __v: 1,
            }
        )
            .sort({ _id: -1 })
            .lean();
        reply.ok(receipts)
    })
    instance.get('/soliq', (request, reply) => {
        reply.redirect('https://ofd.soliq.uz/check?t=VG300750006376&r=4810&c=20220305003749&s=331413347764')
    })
    next()
})
