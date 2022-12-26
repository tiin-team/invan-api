const fs = require("fs");
const json2xls = require("json2xls");

const customerDebtHistoryHandler = async function (request, reply, instance) {

    try {
        const
            { token, customer_id } = request.params,
            user = await instance.User
                .findOne({ admin_token: token })
                .lean();
        if (!user) {
            return reply.unauthorized()
        }

        const customer = await instance.clientsDatabase
            .findOne({ _id: customer_id })
            .lean();
        if (!customer) {
            return reply.fourorfour('customer')
        }
        const matchReceipts = {
            $match: {
                organization: user.organization,
                // receipt_type: 'debt',
                user_id: customer.user_id,
                client_id: customer._id,
            }
        }
        const unwindItems = {
            $unwind: {
                path: '$sold_item_list'
            }
        }
        const projectItems = {
            $project: {
                date: '$date',
                sold_item_list: {
                    product_name: 1,
                    price: 1,
                    value: 1,
                    reminder: 1,
                    total_debt: 1,
                },
                // product_name: '$sold_item_list.product_name',
                // price: '$sold_item_list.price',
                // value: '$sold_item_list.value',
                // reminder: '$sold_item_list.reminder',
                currency: '$currency',
                currency_value: '$currency_value',
                // total_debt: '$sold_item_list.total_debt',
                is_refund: '$is_refund',
                payment: '$payment',
                receipt_no: '$receipt_no',
            }
        }
        const sortReceipts = {
            $sort: {
                date: 1
            }
        }

        const receiptsResult = await instance.Receipts.aggregate([
            matchReceipts,
            // unwindItems,
            projectItems,
            sortReceipts,
        ])
            .allowDiskUse(true)
            .exec();

        const rPaymentsObj = {}
        for (const r of receiptsResult) {
            rPaymentsObj[r._id] = r.payment
        }

        for (const index in receiptsResult) {
            if (receiptsResult[index].is_refund) {
                receiptsResult[index].reminder *= (-1);
                receiptsResult[index].total_debt *= (-1);
                receiptsResult[index].value *= (-1);
            }
        }
        if (!(customer.debt_pay_history instanceof Array)) {
            customer.debt_pay_history = []
        }

        const debt_pay_history = await instance.clientsDebtPayHistory
            .find({ client_id: customer._id })
            .lean()

        const history = debt_pay_history.concat(receiptsResult);
        history.sort((a, b) => (a.date > b.date) ? 1 : ((b.date > a.date) ? -1 : 0));

        const histories = []

        if (user.ui_language && user.ui_language.value != undefined) {
            instance.i18n.setLocale(user.ui_language.value)
        }
        for (const h of history) {
            if (Array.isArray(h.sold_item_list)) {
                for (const s_i of h.sold_item_list) {
                    histories.push({
                        [`${instance.i18n.__('date')}`]: instance.date_ddmmyy_hhmm(h.date),
                        [`${instance.i18n.__('product_name')}`]: s_i.product_name,
                        [`${instance.i18n.__('each')}`]: s_i.value,
                        // [`${instance.i18n.__('reminder')}`]: h.reminder,
                        [`${instance.i18n.__('price')}`]: s_i.price,
                        [`${instance.i18n.__('paid')}`]: s_i.price * s_i.value,
                        [`${instance.i18n.__('total_debt')}`]: 0,
                    })
                }
            } else
                histories.push({
                    [`${instance.i18n.__('date')}`]: instance.date_ddmmyy_hhmm(h.date),
                    [`${instance.i18n.__('product_name')}`]: h.comment,
                    [`${instance.i18n.__('each')}`]: h.value,
                    // [`${instance.i18n.__('reminder')}`]: h.reminder,
                    [`${instance.i18n.__('price')}`]: h.price,
                    [`${instance.i18n.__('paid')}`]: h.paid,
                    [`${instance.i18n.__('total_debt')}`]: h.total_debt,
                })
            if (Array.isArray(h.payment)) {
                const paid = h.payment.reduce((sum, payment) => sum + (payment.name != 'debt' ? payment.value : 0), 0)
                const debp = h.payment.reduce((sum, payment) => sum + (payment.name == 'debt' ? payment.value : 0), 0)
                histories.push({
                    [`${instance.i18n.__('date')}`]: instance.date_ddmmyy_hhmm(h.date),
                    [`${instance.i18n.__('product_name')}`]: h.receipt_no,
                    [`${instance.i18n.__('each')}`]: '',
                    // [`${instance.i18n.__('reminder')}`]: h.reminder,
                    [`${instance.i18n.__('price')}`]: 0,
                    [`${instance.i18n.__('paid')}`]: paid,
                    [`${instance.i18n.__('total_debt')}`]: debp,
                })
            }
        }

        const
            xls = json2xls(histories),
            timeStamp = new Date().getTime()

        fs.writeFileSync(`./static/history-${timeStamp}.xls`, xls, "binary");
        reply.sendFile(`./history-${timeStamp}.xls`);

        setTimeout(() => {
            fs.unlink(`./static/history-${timeStamp}.xls`, (err) => {
                if (err) {
                    instance.send_Error(
                        "exported file",
                        JSON.stringify(err)
                    );
                }
            });
        }, 2000);

    } catch (error) {
        reply.error(error.message)
    }
    return reply;
}

module.exports = ((instance, _, next) => {

    const customerDebtHistorySchema = {
        params: {
            type: 'object',
            required: [
                'token', 'customer_id'
            ],
            properties: {
                token: { type: 'string' },
                customer_id: {
                    type: 'string',
                    minLength: 24,
                    maxLength: 24
                },
            }
        }
    }

    instance.get(
        '/customer-debt-history/:token/:customer_id/:name',
        {
            schema: customerDebtHistorySchema
        },
        (request, reply) => {
            customerDebtHistoryHandler(request, reply, instance)
        }
    )

    next()
})
