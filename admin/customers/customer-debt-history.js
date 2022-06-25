
const customerDebtHistoryHandler = async function (request, reply, instance) {

    try {
        const { customer_id, from_time, to_time } = request.body;
        const user = request.user

        const customer = await instance.clientsDatabase.findOne({ _id: customer_id }, { debt_pay_history: 0 });

        if (!customer) {
            return reply.fourorfour('customer')
        }

        // const matchCustomer = {
        //     $match: {
        //         _id: customer._id
        //     }
        // }
        // const unwindDebtHistory = {
        //     $unwind: {
        //         path: '$debt_pay_history'
        //     }
        // }
        // const filterDebtHistory = {
        //     $match: {
        //         'debt_pay_history.date': {
        //             $gte: from_time,
        //             $lte: to_time
        //         }
        //     }
        // }
        // const projectDebtHistory = {
        //     $project: {
        //         amount_type: '$debt_pay_history.amount_type',
        //         by_id: '$debt_pay_history.by_id',
        //         by_name: '$debt_pay_history.by_name',
        //         comment: '$debt_pay_history.comment',
        //         currency: '$debt_pay_history.currency',
        //         currency_value: '$debt_pay_history.currency_value',
        //         date: '$debt_pay_history.date',
        //         paid: '$debt_pay_history.paid',
        //     }
        // }
        // const debt_pay_history = await instance.clientsDatabase.aggregate([
        //     matchCustomer,
        //     unwindDebtHistory,
        //     filterDebtHistory,
        //     projectDebtHistory
        // ]).allowDiskUse(true).exec();

        customer.debt_pay_history = debt_pay_history;

        const matchReceipts = {
            $match: {
                organization: user.organization,
                receipt_type: 'debt',
                user_id: customer.user_id,
                date: {
                    $gte: from_time,
                    $lte: to_time
                }
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
                product_name: '$sold_item_list.product_name',
                price: '$sold_item_list.price',
                value: '$sold_item_list.value',
                reminder: '$sold_item_list.reminder',
                currency: '$currency',
                currency_value: '$currency_value',
                total_debt: '$sold_item_list.total_debt',
                is_refund: '$is_refund',
                receipt_id: "$_id",
                product_id: "$sold_item_list.product_id",
                sold_id: "$sold_item_list._id",
                comment: '$comment',
            }
        }
        const sortReceipts = {
            $sort: {
                date: 1
            }
        }

        const receiptsResult = await instance.Receipts.aggregate([
            matchReceipts,
            unwindItems,
            projectItems,
            sortReceipts,
        ])
            .allowDiskUse(true)
            .exec();

        for(const index in receiptsResult) {
            if(receiptsResult[index].is_refund) {
                receiptsResult[index].reminder *= (-1);
                receiptsResult[index].total_debt *= (-1);
                receiptsResult[index].value *= (-1);
            }
        }
        if (!(customer.debt_pay_history instanceof Array)) {
            customer.debt_pay_history = []
        }
        // const history = customer.debt_pay_history.concat(receiptsResult);
        const history = receiptsResult;
        history.sort((a, b) => (a.date > b.date) ? 1 : ((b.date > a.date) ? -1 : 0));
        return reply.ok(history);
    } catch (error) {
        reply.error(error.message)
    }
    return reply;
}

module.exports = ((instance, _, next) => {

    const customerDebtHistorySchema = {
        body: {
            type: 'object',
            required: [
                'customer_id',
                'from_time',
                'to_time'
            ],
            properties: {
                customer_id: {
                    type: 'string',
                    minLength: 24,
                    maxLength: 24
                },
                from_time: {
                    type: 'number'
                },
                to_time: {
                    type: 'number'
                }
            }
        }
    }

    instance.post(
        '/customer-debt-history',
        {
            schema: customerDebtHistorySchema,
            attachValidation: true,
            version: '1.0.0',
            preValidation: instance.authorize_admin,
        },
        (request, reply) => {
            if (request.validationError) {
                return reply.validation(request.validationError.message)
            }
            customerDebtHistoryHandler(request, reply, instance)
        }
    )

    next()
})
