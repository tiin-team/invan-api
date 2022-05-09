
const fp = require('fastify-plugin');
const supplierParams = {
    version: '1.0.0',
    schema: {
        params: {
            type: 'object',
            required: [
                'min', 'max', 'limit', 'page'
            ],
            properties: {
                min: { type: 'number', minimum: 1546282800000 },
                max: { type: 'number', minimum: 1 },
                limit: { type: 'number', minimum: 1 },
                page: { type: 'number', minimum: 1 },
            }
        },
        body: {
            type: 'object',
            required: [
                'custom', 'end',
                'services', 'start'
            ],
            properties: {
                custom: { type: 'boolean' },
                start: { type: 'number' },
                end: { type: 'number' },
                services: {
                    type: 'array',
                    items: {
                        type: 'string',
                        minLength: 24,
                        maxLength: 24
                    }
                },
                search: {
                    type: 'string',
                    default: ''
                }
            }
        }
    }
}

const by_supplier_report = async (request, reply, instance) => {
    const supplier = request.user
    const { min, max, limit, page } = request.params;
    const { custom, start, end, services, search } = request.body;

    const filterReceipts = {
        organization: supplier.organization,
        receipt_state: { $ne: 'draft' },
        debt_id: null,
        date: {
            // $gte: min - (process.env.TIME_DIFF | 0),
            // $lte: max - (process.env.TIME_DIFF | 0),
            $gte: min,
            $lte: max,
        }
    }

    if (services && services.length > 0) {
        for (const service of services) {
            if (!supplier.services.find(elem => elem._id + '' == service)) {
                return reply.code(403).send('Forbidden service')
            }
        }

        filterReceipts.service = { $in: services }
    }

    if (custom) {
        const additional_query = []
        for (let i = min; i < max; i += 86400000) {
            additional_query.push({
                date: {
                    // $lte: i + end * 3600000 - (process.env.TIME_DIFF | 0),
                    // $gte: i + start * 3600000 - (process.env.TIME_DIFF | 0),
                    $lte: i + end * 3600000,
                    $gte: i + start * 3600000,
                }
            })
        }
        delete filterReceipts.date
        filterReceipts['$or'] = additional_query
    }

    const unwindSoldItemList = { $unwind: "$sold_item_list" }

    const calculateItemsReport = {
        $group: {
            _id: "$sold_item_list.supplier_id",
            supplier_name: {
                $last: "$sold_item_list.supplier_name"
            },
            cost_of_goods: {
                $sum: {
                    $multiply: [
                        { $max: ["$sold_item_list.cost", 0] },
                        { $max: ["$sold_item_list.value", 0] },
                        {
                            $cond: [
                                "$is_refund",
                                -1, 1
                            ]
                        }
                    ]
                }
            },
            gross_sales: {
                $sum: {
                    $multiply: [
                        { $max: ["$sold_item_list.price", 0] },
                        { $max: ["$sold_item_list.value", 0] },
                        {
                            $cond: [
                                "$is_refund",
                                0, 1
                            ]
                        }
                    ]
                }
            },
            refunds: {
                $sum: {
                    $multiply: [
                        { $max: ["$sold_item_list.price", 0] },
                        { $max: ["$sold_item_list.value", 0] },
                        {
                            $cond: [
                                "$is_refund",
                                1, 0
                            ]
                        }
                    ]
                }
            },
            discounts: {
                $sum: {
                    $multiply: [
                        {
                            $max: [
                                "$sold_item_list.total_discount",
                                0
                            ]
                        },
                        {
                            $cond: [
                                "$is_refund",
                                -1, 1
                            ]
                        }
                    ]
                }
            },
            items_sold: {
                $sum: {
                    $cond: [
                        "$is_refund",
                        0,
                        { $max: ["$sold_item_list.value", 0] }
                    ]
                }
            },
            items_refunded: {
                $sum: {
                    $cond: [
                        "$is_refund",
                        { $max: ["$sold_item_list.value", 0] },
                        0
                    ]
                }
            },
            taxes: { $sum: 0 }
        }
    }

    // const searchByItemName = {
    //     $match: {
    //         supplier_name: {
    //             $regex: (search ? search : ''),
    //             $options: 'i'
    //         }
    //     }
    // }

    const sortResult = { $sort: { gross_sales: -1 } }

    const skipResult = { $skip: limit * (page - 1) }

    const limitResult = { $limit: limit }

    const projectResult = {
        $project: {
            id: "$_id",
            supplier_name: "$supplier_name",
            cost_of_goods: 1,
            gross_sales: 1,
            refunds: 1,
            discounts: 1,
            items_sold: 1,
            items_refunded: 1,
            taxes: 1,
            net_sales: {
                $subtract: [
                    "$gross_sales",
                    {
                        $add: ["$refunds", "$discounts"]
                    }
                ]
            },
            gross_profit: {
                $subtract: [
                    {
                        $subtract: [
                            "$gross_sales",
                            {
                                $add: ["$refunds", "$discounts"]
                            }
                        ]
                    },
                    "$cost_of_goods"
                ]
            }
        }
    }

    const result = await instance.Receipts.aggregate([
        { $match: filterReceipts },
        unwindSoldItemList,
        calculateItemsReport,
        // searchByItemName,
        sortResult,
        skipResult,
        limitResult,
        projectResult
    ])
        .allowDiskUse(true)
        .exec();

    const groupSoldItems = {
        $group: {
            _id: "$sold_item_list.supplier_id",
            supplier_name: {
                $last: "$sold_item_list.supplier_name"
            }
        }
    }

    const countAllItems = {
        $group: {
            _id: null,
            count: {
                $sum: 1
            }
        }
    }

    const totalCount = await instance.Receipts.aggregate([
        { $match: filterReceipts },
        unwindSoldItemList,
        groupSoldItems,
        // searchByItemName,
        countAllItems
    ])
        .allowDiskUse(true)
        .exec();

    const total_result = totalCount && totalCount.length > 0 && totalCount[0].count
        ? totalCount[0].count
        : 0;

    return reply.ok({
        total: total_result,
        page: Math.ceil(total_result / limit),
        data: result
    })
}

module.exports = fp((instance, _, next) => {
    instance.post(
        '/dashboard/:min/:max/:limit/:page',
        {
            ...supplierParams,
            attachValidation: true,
            preValidation: [instance.auth_supplier]
        },
        async (request, reply) => {
            if (request.validationError) {
                return reply.validation(request.validationError.message)
            }
            return await by_supplier_report(request, reply, instance)
        }
    );

    next()
})
