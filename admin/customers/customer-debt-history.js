
// const customerDebtHistoryHandler = async function (request, reply, instance) {

//     try {
//         const { customer_id, from_time, to_time } = request.body;
//         const user = request.user

//         const customer = await instance.clientsDatabase.findOne({ _id: customer_id }, { debt_pay_history: 0 });

//         if (!customer) {
//             return reply.fourorfour('customer')
//         }

//         const matchCustomer = {
//             $match: {
//                 _id: customer._id
//             }
//         }
//         const unwindDebtHistory = {
//             $unwind: {
//                 path: '$debt_pay_history'
//             }
//         }
//         const filterDebtHistory = {
//             $match: {
//                 'debt_pay_history.date': {
//                     $gte: from_time,
//                     $lte: to_time
//                 }
//             }
//         }
//         const projectDebtHistory = {
//             $project: {
//                 receipt_no: '$debt_pay_history.receipt_no',
//                 amount_type: '$debt_pay_history.amount_type',
//                 by_id: '$debt_pay_history.by_id',
//                 by_name: '$debt_pay_history.by_name',
//                 comment: '$debt_pay_history.comment',
//                 currency: '$debt_pay_history.currency',
//                 currency_value: '$debt_pay_history.currency_value',
//                 date: '$debt_pay_history.date',
//                 paid: '$debt_pay_history.paid',
//             }
//         }
//         const debt_pay_history = await instance.clientsDatabase.aggregate([
//             matchCustomer,
//             unwindDebtHistory,
//             filterDebtHistory,
//             projectDebtHistory
//         ]).allowDiskUse(true).exec();

//         customer.debt_pay_history = debt_pay_history;

//         const matchReceipts = {
//             $match: {
//                 organization: user.organization,
//                 receipt_type: 'debt',
//                 user_id: customer.user_id,
//                 date: {
//                     $gte: from_time,
//                     $lte: to_time
//                 }
//             }
//         }
//         const unwindItems = {
//             $unwind: {
//                 path: '$sold_item_list'
//             }
//         }
//         const projectItems = {
//             $project: {
//                 date: '$date',
//                 receipt_no: '$receipt_no',
//                 product_name: '$sold_item_list.product_name',
//                 price: '$sold_item_list.price',
//                 value: '$sold_item_list.value',
//                 reminder: '$sold_item_list.reminder',
//                 currency: '$currency',
//                 currency_value: '$currency_value',
//                 total_debt: '$sold_item_list.total_debt',
//                 is_refund: '$is_refund',
//                 receipt_id: "$_id",
//                 product_id: "$sold_item_list.product_id",
//                 sold_id: "$sold_item_list._id",
//                 comment: '$comment',
//             }
//         }
//         const sortReceipts = {
//             $sort: {
//                 date: 1
//             }
//         }

//         const receiptsResult = await instance.Receipts.aggregate([
//             matchReceipts,
//             unwindItems,
//             projectItems,
//             sortReceipts,
//         ])
//             .allowDiskUse(true)
//             .exec();

//         for (const index in receiptsResult) {
//             if (receiptsResult[index].is_refund) {
//                 receiptsResult[index].reminder *= (-1);
//                 receiptsResult[index].total_debt *= (-1);
//                 receiptsResult[index].value *= (-1);
//             }
//         }
//         if (!(customer.debt_pay_history instanceof Array)) {
//             customer.debt_pay_history = []
//         }
//         const history = customer.debt_pay_history.concat(receiptsResult);
//         history.sort((a, b) => (a.date > b.date) ? 1 : ((b.date > a.date) ? -1 : 0));

//         return reply.ok(history);
//     } catch (error) {
//         reply.error(error.message)
//     }
//     return reply;
// }

/**
 * 
 * @param {import("fastify").FastifyRequest<IncomingMessage, import("fastify").DefaultQuery, import("fastify").DefaultParams, import("fastify").DefaultHeaders, any>} request 
 * @param {import("fastify").FastifyReply<ServerResponse>} reply 
 * @param {import("fastify").FastifyInstance<Server, IncomingMessage, ServerResponse>} instance 
 * @returns 
 */
// const customerDebtHistoryHandler = async function (request, reply, instance) {

//     try {
//         const
//             { customer_id, from_time, to_time } = request.body,
//             user = request.user,
//             limit = !isNaN(parseInt(request.body.limit))
//                 ? parseInt(request.body.limit)
//                 : 10,
//             page = !isNaN(parseInt(request.body.page)) && request.body.page > 1
//                 ? Math.round(request.body.page / 2)
//                 : 1,
//             customer = await instance.clientsDatabase
//                 .findOne({ _id: customer_id })
//                 .lean();
//         if (!customer) {
//             return reply.fourorfour("Customer");
//         }

//         const $matchPaidHistory = {
//             $match: {
//                 client_id: customer._id,
//                 date: {
//                     $gte: from_time,
//                     $lte: to_time,
//                 },
//             }
//         }

//         const
//             $limit = { $limit: limit },
//             $skip = { $skip: (page - 1) * limit },
//             $sort = { $sort: { date: -1 } }

//         const pay_history = await instance.clientsDebtPayHistory.aggregate([
//             $matchPaidHistory,
//             $sort,
//             $limit,
//             $skip,
//         ])
//             .allowDiskUse(true)
//             .exec()

//         const $matchReceipts = {
//             $match: {
//                 $or: [
//                     { client_id: customer._id },
//                     { user_id: customer.user_id },
//                 ],
//                 organization: customer.organization,
//                 date: {
//                     $gte: from_time,
//                     $lte: to_time,
//                 },
//             },
//         };

//         const $projectReceipts = {
//             $project: {
//                 receipt_no: 1,
//                 cashier_id: 1,
//                 cashier_name: 1,
//                 is_refund: 1,
//                 currency: 1,
//                 // user_id: 1,
//                 point_balance: 1,
//                 // receipt_type: 1,
//                 // receipt_state: 1,
//                 created_from: 1,
//                 payment: 1,
//                 total_price: 1,
//                 sold_item_list: {
//                     _id: 1,
//                     total_discount: 1,
//                     paid_value: 1,
//                     returned_reminder: 1,
//                     sold_item_type: 1,
//                     discount: 1,
//                     total_debt: 1,
//                     total_paid_debt: 1,
//                     product_id: 1,
//                     product_name: 1,
//                     price: 1,
//                     total: 1,
//                     currency: 1,
//                     value: 1,
//                     created_time: 1,
//                     comment: 1,
//                     barcode: 1,
//                 },
//                 organization: 1,
//                 service: 1,
//                 pos_id: 1,
//                 pos_name: 1,
//                 date: 1,
//                 created_time: 1,
//             }
//         }

//         const receipts = await instance.Receipts.aggregate([
//             $matchReceipts,
//             $projectReceipts,
//             $sort,
//             $limit,
//             $skip,
//         ])
//             .allowDiskUse(true)
//             .exec();

//         const history = pay_history
//             .concat(
//                 receipts.map(r => {
//                     const debt = r.payment.find(pay => pay.name == 'debt')

//                     return {
//                         _id: r._id,
//                         sold_item_list: r.sold_item_list,
//                         receipt_no: r.receipt_no,
//                         cashier_id: r.cashier_id,
//                         cashier_name: r.cashier_name,
//                         is_refund: r.is_refund,
//                         currency: r.currency,
//                         point_balance: r.point_balance,
//                         created_from: r.created_from,
//                         payment: r.payment,
//                         total_price: r.total_price,
//                         organization: r.organization,
//                         service: r.service,
//                         pos_id: r.pos_id,
//                         pos_name: r.pos_name,
//                         date: r.date,
//                         created_time: r.created_time,
//                         total_debt: debt && debt.value ? debt.value : 0,
//                     }
//                 })
//             )
//             .sort((a, b) => b.date - a.date)
//             .slice(0 + ((page + 1) % 2) * 10, 9 + ((page + 1) % 2) * 10)

//         const
//             pay_total = await instance.clientsDebtPayHistory.countDocuments($matchPaidHistory.$match),
//             receipts_total = await instance.Receipts.countDocuments($matchReceipts.$match)

//         return reply.code(200).send({
//             data: history,
//             total: pay_total + receipts_total,
//             limit: limit,
//             page: request.body.page,
//             error: "Ok",
//             message: "Success",
//             statusCode: 200,
//         });
//     } catch (error) {
//         reply.error(error.message)
//     }
//     return reply;
// }

// agar xato ishlmasa tepa krk emas!

const customerDebtHistoryHandler = async function (request, reply, instance) {

    try {
        const { customer_id, from_time, to_time } = request.body;
        const user = request.user

        const limit = !isNaN(parseInt(request.query.limit))
            ? parseInt(request.query.limit)
            : 10

        const page = !isNaN(parseInt(request.query.page)) && request.query.page > 1
            // ? Math.round(request.query.page / 2)
            ? parseInt(request.query.page)
            : 1

        const customer = await instance.clientsDatabase
            .findOne(
                { _id: customer_id },
                { user_id: 1, organization: 1, },
            )
            .lean();
        if (!customer) {
            return reply.fourorfour("Customer");
        }


        const $matchPaidHistory = {
            $match: {
                client_id: customer._id,
                date: {
                    $gte: from_time,
                    $lte: to_time,
                },
            }
        }

        const $limit = { $limit: limit }
        const $skip = { $skip: (page - 1) * limit }
        const $sort = { $sort: { date: -1 } }

        const pay_history = await instance.clientsDebtPayHistory.aggregate([
            $matchPaidHistory,
            $sort,
            // $limit,
            // $skip,
        ])
            .allowDiskUse(true)
            .exec()

        const $matchReceipts = {
            $match: {
                $or: [
                    { client_id: customer._id },
                    { user_id: customer.user_id },
                    { cashback_phone: customer.phone_number },
                ],
                organization: customer.organization,
                date: {
                    $gte: from_time,
                    $lte: to_time,
                },
            },
        };

        const $projectReceipts = {
            $project: {
                receipt_no: 1,
                cashier_id: 1,
                cashier_name: 1,
                is_refund: 1,
                currency: 1,
                // user_id: 1,
                point_balance: 1,
                // receipt_type: 1,
                // receipt_state: 1,
                created_from: 1,
                payment: 1,
                total_price: 1,
                sold_item_list: {
                    _id: 1,
                    total_discount: 1,
                    paid_value: 1,
                    returned_reminder: 1,
                    sold_item_type: 1,
                    discount: 1,
                    total_debt: 1,
                    total_paid_debt: 1,
                    product_id: 1,
                    product_name: 1,
                    price: 1,
                    total: 1,
                    currency: 1,
                    value: 1,
                    created_time: 1,
                    comment: 1,
                    barcode: 1,
                },
                organization: 1,
                service: 1,
                pos_id: 1,
                pos_name: 1,
                date: 1,
                created_time: 1,
            }
        }

        const receipts = await instance.Receipts.aggregate([
            $matchReceipts,
            $projectReceipts,
            $sort,
            // $limit,
            // $skip,
        ])
            .allowDiskUse(true)
            .exec();

        const history = pay_history
            .concat(
                receipts.map(r => {
                    const debt = r.payment.find(pay => pay.name == 'debt')

                    return {
                        _id: r._id,
                        sold_item_list: r.sold_item_list,
                        receipt_no: r.receipt_no,
                        cashier_id: r.cashier_id,
                        cashier_name: r.cashier_name,
                        is_refund: r.is_refund,
                        currency: r.currency,
                        point_balance: r.point_balance,
                        created_from: r.created_from,
                        payment: r.payment,
                        total_price: r.total_price,
                        organization: r.organization,
                        service: r.service,
                        pos_id: r.pos_id,
                        pos_name: r.pos_name,
                        date: r.date,
                        created_time: r.created_time,
                        total_debt: debt && debt.value ? debt.value : 0,
                    }
                })
            )
            .sort((a, b) => b.date - a.date)
            .slice((page - 1) * limit, page * limit)
        // .slice(0 + ((page + 1) % 2) * 10, 9 + ((page + 1) % 2) * 10)

        const pay_total = await instance.clientsDebtPayHistory.countDocuments($matchPaidHistory.$match)
        const receipts_total = await instance.Receipts.countDocuments($matchReceipts.$match)

        return reply.code(200).send({
            data: history,
            total: pay_total + receipts_total,
            limit: limit,
            page: request.body.page,
            error: "Ok",
            message: "Success",
            statusCode: 200,
        });
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
                },
                limit: {
                    type: 'number',
                    default: 10,
                },
                page: {
                    type: 'number',
                    default: 1,
                },
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
