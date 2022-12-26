
const payForCategoryHandler = async (request, reply, instance) => {
    try {
        const user = request.user;
        const { client_id, category_id, paid, comment, amount_type } = request.body;
        const client = await instance.clientsDatabase.findById(client_id).lean();
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

        for (const r of receiptCategories) {
            if (paid - total_paid > r.sold_item_list.total_debt - r.sold_item_list.total_paid_debt) {
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

        await instance.clientsDebtPayHistory({
            organization: client.organization,
            client_id: client._id,
            client_name: client.first_name,
            paid: paid,
            date: new Date().getTime(),
            comment: comment,
            created_by_id: user._id,
            created_by_name: user.name,
        })
            .save();

        reply.ok(receiptCategories)
    } catch (error) {
        reply.error(error.message)
    }
}

module.exports = ((instance, _, next) => {

    /**
     * 
     * @param {import("fastify").FastifyRequest<IncomingMessage, import("fastify").DefaultQuery, import("fastify").DefaultParams, import("fastify").DefaultHeaders, any>} request 
     * @param {import("fastify").FastifyReply<ServerResponse>} reply 
     * @param {*} instance 
     * @returns 
     */
    const getCustomerPayHistory = async (request, reply, instance) => {
        try {
            const user = request.user, { customer_id } = request.params

            const client = await instance.clientsDatabase.findById(customer_id).lean();
            if (!client) {
                return reply.fourorfour('Client');
            }

            const
                limit = !isNaN(parseInt(request.query.limit))
                    ? parseInt(request.query.limit)
                    : 10,
                page = !isNaN(parseInt(request.query.page))
                    ? parseInt(request.query.page)
                    : 1

            const filter_query = {
                client_id: client._id,
                organization: user.organization,
            }

            const pays = await instance.clientsDebtPayHistory
                .find(filter_query)
                .limit(limit)
                .page((page - 1) * limit)
                .lean()

            let total_paid = 0

            for (const pay of pays) {
                total_paid += pay.paid
            }

            const total = await instance.clientsDebtPayHistory.countDocuments(filter_query)

            reply.ok({
                client: client,
                pays: pays,
                total: total,
                limit: limit,
                page: page,
            })

        } catch (error) {
            reply.error(error.message)
        }
    }

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

    instance.get(
        '/customer/pay/history/:customer_id',
        {
            version: '2.0.0',
        },
        async (request, reply) => {
            instance.authorization(request, reply, (user) => {
                return getCustomerPayHistory(request, reply, user);
            });

            return reply;
        }
    )

    next()
})
