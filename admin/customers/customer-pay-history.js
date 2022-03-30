
const payForCategoryHandler = async (request, reply, instance) => {
    try {
        const user = request.user;
        const { client_id, category_id, paid, comment, amount_type } = request.body;
        const client = await instance.clientsDatabase.findById(client_id);
        if (!client) {
            return reply.fourorfour('Client');
        }

        const matchReceipts = {
            $match: {
                organization: user.organization,
                user_id: client.user_id,
                receipt_type: 'debt'
            }
        }

        const sortReceipts = {
            $sort: {
                date: 1
            }
        }

        const unwindItems = {
            $unwind: {
                path: '$sold_item_list'
            }
        }

        const groupCategories = {
            $match: {
                'sold_item_list.category_id': category_id,
                $expr: {
                    $gt: [
                        '$sold_item_list.total_debt',
                        '$sold_item_list.total_paid_debt'
                    ]
                    // $or: [
                    //     {
                    //         $gt: [
                    //             '$sold_item_list.value',
                    //             {
                    //                 $max: [
                    //                     '$sold_item_list.paid_value',
                    //                     0
                    //                 ]
                    //             }
                    //         ]
                    //     },
                    //     {
                    //         $gt: [
                    //             {
                    //                 $max: [
                    //                     '$sold_item_list.reminder',
                    //                     0
                    //                 ]
                    //             },
                    //             {
                    //                 $max: [
                    //                     '$sold_item_list.paid_reminder',
                    //                     0
                    //                 ]
                    //             }
                    //         ]
                    //     },
                    // ]
                }
            }
        }

        const receiptCategories = await instance.Receipts.aggregate([
            matchReceipts,
            sortReceipts,
            unwindItems,
            groupCategories
        ])
            .allowDiskUse(true)
            .exec();

        let total_paid = 0;
        const paidItems = [];
        const itemsMap = {};
        
        for(const r of receiptCategories) {
            if(paid - total_paid > r.sold_item_list.total_debt - r.sold_item_list.total_paid_debt) {
                total_paid += r.sold_item_list.total_debt - r.sold_item_list.total_paid_debt;
                r.sold_item_list.total_paid_debt = r.sold_item_list.total_debt;
                itemsMap[r.sold_item_list._id] = r.sold_item_list;
                paidItems.push(r)
            }
            else {
                r.sold_item_list.total_paid_debt = r.sold_item_list.total_paid_debt + (paid - total_paid)
                itemsMap[r.sold_item_list._id] = r.sold_item_list;
                paidItems.push(r);
                break;
            }
        }

        for (const itm of paidItems) {
            const receipt = await instance.Receipts.findById(itm._id);
            if (!receipt) {
                continue;
            }
            const sold_item_list = []
            for (const s_itm of receipt.sold_item_list) {
                if (itemsMap[s_itm._id]) {
                    sold_item_list.push(itemsMap[s_itm._id])
                }
                else {
                    sold_item_list.push(s_itm)
                }
            }

            await instance.Receipts.updateOne(
                { _id: receipt._id },
                {
                    $set: {
                        sold_item_list: sold_item_list
                    }
                }
            );
        }

        await instance.clientsDatabase.updateOne(
            { _id: client_id },
            {
                $push: {
                    debt_pay_history: {
                        paid: paid,
                        date: new Date().getTime(),
                        comment: comment,
                        by_id: user._id,
                        by_name: user.name,
                        amount_type: amount_type,
                        category_id: category_id
                    }
                },
                $inc: {
                    debt: (-1) * paid
                }
            }
        );
        
        reply.ok(receiptCategories)
    } catch (error) {
        reply.error(error.message)
    }
}

module.exports = ((instance, _, next) => {

    const payForCategorySchema = {
        body: {
            type: 'object',
            additionalProperties: false,
            required: [
                'client_id', 'category_id', 'paid',
                'comment', 'amount_type'
            ],
            properties: {
                client_id: {
                    type: 'string',
                    minLength: 24,
                    maxLength: 24
                },
                category_id: {
                    type: 'string',
                    minLength: 24,
                    maxLength: 24
                },
                paid: {
                    type: 'number'
                },
                comment: {
                    type: 'string'
                },
                amount_type: {
                    type: 'string',
                    enum: [
                        'cash', 'card'
                    ]
                }
            }
        }
    }

    instance.post(
        '/customer/pay-for/category',
        {
            version: '1.0.0',
            preValidation: instance.authorize_admin,
            schema: payForCategorySchema,
            attachValidation: true
        },
        async (request, reply) => {
            if (request.validationError) {
                return reply.validation(request.validationError.message)
            }
            payForCategoryHandler(request, reply, instance)
            return reply;
        }
    )

    next()
})
