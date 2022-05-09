
const fp = require('fastify-plugin');

const calculateReportSummary = async (request, reply, instance) => {
    try {
        const supplier = request.user
        const { min, max, limit, page } = request.params;
        const { custom, start, end, services, count_type, target } = request.body;

        const filterReceipts = {
            organization: supplier.organization,
            receipt_state: { $ne: 'draft' },
            "sold_item_list.supplier_id": supplier._id,
            debt_id: null,
            date: {
                // $gte: min - (TIME_DIFF | 0),
                // $lte: max - (TIME_DIFF | 0),
                $gte: min,
                $lte: max,
            },
        };

        if (services && services.length > 0) {
            for (const serv of services) {
                if (!supplier.find(elem => elem._id + '' == serv)) {
                    return reply.code(403).send('Forbidden service');
                }
            }
            filterReceipts.service = { $in: services };
        }

        if (custom) {
            const additional_query = [];
            for (let i = min; i < max; i += 86400000) {
                additional_query.push({
                    date: {
                        $lte: i + end * 3600000,
                        $gte: i + start * 3600000,
                    },
                });
            }
            delete filterReceipts.date;
            filterReceipts['$or'] = additional_query;
        }

        let dateDiffer = 24 * 60 * 60 * 1000;

        switch (count_type) {
            case 1: {
                dateDiffer = 60 * 60 * 1000;
                break;
            }
            case 2: {
                dateDiffer = 24 * 60 * 60 * 1000;
                break;
            }
            case 3: {
                dateDiffer = 7 * 24 * 60 * 60 * 1000;
                break;
            }
            case 4: {
                dateDiffer = 30 * 24 * 60 * 60 * 1000;
                break;
            }
            case 5: {
                dateDiffer = 4 * 30 * 24 * 60 * 60 * 1000;
                break;
            }
            case 6: {
                dateDiffer = 365 * 24 * 60 * 60 * 1000;
                break;
            }
        }

        const sortByDate = { $sort: { date: 1 } };

        const projectReport = {
            $project: {
                count_type: {
                    $floor: {
                        $divide: [
                            { $max: [0, { $add: ['$date', 18000000] }] },
                            dateDiffer
                        ],
                    }
                },
                date: {
                    $multiply: [
                        {
                            $floor: {
                                $divide: [
                                    { $max: [0, { $add: ['$date', 18000000] }] },
                                    dateDiffer
                                ],
                            },
                        },
                        dateDiffer,
                    ],
                },
                is_refund: 1,
                total_discount: 1,
                total_price: 1,
                cost_of_goods: {
                    $reduce: {
                        input: '$sold_item_list',
                        initialValue: 0,
                        in: {
                            $add: [
                                '$$value',
                                {
                                    $multiply: [
                                        { $max: [0, '$$this.value'] },
                                        { $max: [0, '$$this.cost'] },
                                    ],
                                },
                            ],
                        },
                    },
                },
                cash_back: 1,
            },
        };

        const groupByDate = {
            $group: {
                _id: '$count_type',
                cash_backs: { $sum: '$cash_back' },
                date: { $first: '$date' },
                cost_of_goods: {
                    $sum: {
                        $multiply: [
                            '$cost_of_goods',
                            {
                                $cond: ['$is_refund', -1, 1],
                            },
                        ],
                    },
                },
                discounts: {
                    $sum: {
                        $multiply: [
                            {
                                $cond: ['$is_refund', -1, 1],
                            },
                            {
                                $max: ['$total_discount', 0],
                            },
                        ],
                    },
                },
                gross_sales: {
                    $sum: {
                        $cond: [
                            '$is_refund',
                            0,
                            {
                                $add: [
                                    {
                                        $max: [0, '$total_price'],
                                    },
                                    {
                                        $max: [0, '$total_discount'],
                                    },
                                ],
                            },
                        ],
                    },
                },
                refunds: {
                    $sum: {
                        $cond: [
                            '$is_refund',
                            {
                                $add: [
                                    {
                                        $max: [0, '$total_price'],
                                    },
                                    {
                                        $max: [0, '$total_discount'],
                                    },
                                ],
                            },
                            0,
                        ],
                    },
                },
            },
        };

        const sortById = { $sort: { _id: 1 } };

        const groupTotalReport = {
            $group: {
                _id: null,
                cash_backs: { $sum: '$cash_back' },
                cost_of_goods: {
                    $sum: '$cost_of_goods',
                },
                discounts: {
                    $sum: '$discounts',
                },
                gross_sales: {
                    $sum: '$gross_sales',
                },
                refunds: {
                    $sum: '$refunds',
                },
                net_sales: {
                    $sum: {
                        $subtract: ['$gross_sales', { $add: ['$discounts', '$refunds'] }],
                    },
                },
                gross_profit: {
                    $sum: {
                        $subtract: [
                            {
                                $subtract: [
                                    '$gross_sales',
                                    { $add: ['$discounts', '$refunds'] },
                                ],
                            },
                            '$cost_of_goods',
                        ],
                    },
                },
                data: {
                    $push: {
                        date: {
                            $multiply: ['$_id', dateDiffer],
                        },
                        gross_sales: '$gross_sales',
                        discounts: '$discounts',
                        refunds: '$refunds',
                        net_sales: {
                            $subtract: [
                                '$gross_sales',
                                { $add: ['$discounts', '$refunds'] },
                            ],
                        },
                        gross_profit: {
                            $subtract: [
                                {
                                    $subtract: [
                                        '$gross_sales',
                                        { $add: ['$discounts', '$refunds'] },
                                    ],
                                },
                                '$cost_of_goods',
                            ],
                        },
                    },
                },
            },
        };

        if (!limit) {
            if (count_type != 2) {
                projectReport.$project.count_type = {
                    $floor: {
                        $divide: [{ $max: [0, '$date'] }, dateDiffer],
                    },
                }
                projectReport.$project.date = {
                    $multiply: [
                        {
                            $floor: {
                                $divide: [{ $max: [0, '$date'] }, dateDiffer],
                            },
                        },
                        dateDiffer,
                    ],
                }
            }
            const result = await instance.Receipts.aggregate([
                { $match: filterReceipts },
                sortByDate,
                projectReport,
                groupByDate,
                sortById,
                groupTotalReport,
            ])
                .allowDiskUse(true)
                .exec();

            if (!result || result.length == 0 || !(result instanceof Array)) {
                return reply.code(200).send({
                    statusCode: 200,
                    error: "Ok",
                    message: "Success",
                    cost_of_goods: 0,
                    discounts: 0,
                    gross_profit: 0,
                    gross_sales: 0,
                    net_sales: 0,
                    refunds: 0,
                    data: [[min, 0]],
                });
            }

            const data = [];
            let lastDate = Math.floor(min / dateDiffer) * dateDiffer;
            let lastDateTail = Math.floor(min / dateDiffer) * dateDiffer;
            let lastMax = Math.floor(min / dateDiffer) * dateDiffer;
            const existTime = {};
            for (const r of result[0].data) {
                for (let i = lastDate; i < r.date; i += dateDiffer) {
                    if (!existTime[i]) {
                        data.push([i, 0]);
                        lastDateTail = i;
                        existTime[i] = true;
                    }
                }
                lastDate = lastDateTail;
                lastMax = r.date;
                existTime[r.date] = true;
                data.push([r.date, r[target]]);
            }

            // for (let i = lastMax; i < max - TIME_DIFF; i += dateDiffer) {
            for (let i = lastMax; i <= max; i += dateDiffer) {
                if (!existTime[i]) {
                    data.push([i, 0]);
                    existTime[i] = true;
                }
            }

            result[0].data = data;
            return reply.code(200).send({
                statusCode: 200,
                error: "Ok",
                message: "Success",
                ...result[0],
            });
        } else {
            const countTotalReport = {
                $group: {
                    _id: null,
                    count: { $sum: 1 },
                },
            };

            const totalReport = await instance.Receipts.aggregate([
                { $match: filterReceipts },
                projectReport,
                groupByDate,
                countTotalReport,
            ])
                .allowDiskUse(true)
                .exec();

            const totalResult =
                totalReport && totalReport.length && totalReport[0].count
                    ? totalReport[0].count
                    : 1;
            const skipResult = {
                $skip: limit * (page - 1),
            };
            const limitResult = {
                $limit: limit,
            };

            const netSalesAndProfit = {
                $project: {
                    gross_sales: 1,
                    cost_of_goods: 1,
                    refunds: 1,
                    discounts: 1,
                    date: 1,
                    net_sales: {
                        $subtract: [
                            {
                                $max: [0, '$gross_sales'],
                            },
                            {
                                $add: [
                                    {
                                        $max: [0, '$refunds'],
                                    },
                                    {
                                        $max: [0, '$discounts'],
                                    },
                                ],
                            },
                        ],
                    },
                    gross_profit: {
                        $subtract: [
                            {
                                $subtract: [
                                    {
                                        $max: [0, '$gross_sales'],
                                    },
                                    {
                                        $add: [
                                            {
                                                $max: [0, '$refunds'],
                                            },
                                            {
                                                $max: [0, '$discounts'],
                                            },
                                        ],
                                    },
                                ],
                            },
                            {
                                $max: [0, '$cost_of_goods'],
                            },
                        ],
                    },
                },
            };

            const result = await instance.Receipts.aggregate([
                { $match: filterReceipts },
                sortByDate,
                projectReport,
                groupByDate,
                sortById,
                skipResult,
                limitResult,
                netSalesAndProfit,
            ])
                .allowDiskUse(true)
                .exec();

            return reply.code(200).send({
                statusCode: 200,
                error: "Ok",
                message: "Success",
                total: totalResult,
                page_count: Math.ceil(totalResult / limit),
                data: result,
            });
        }
    } catch (error) {
        reply.error(error.message);
    }
};
const by_supplier_report = async (request, reply, instance) => {
    const supplier = request.user
    const { min, max, limit, page } = request.params;
    const { custom, start, end, services, search } = request.body;

    const filterReceipts = {
        organization: supplier.organization,
        "sold_item_list.supplier_id": supplier._id,
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
    instance.post(
        '/dashboard/:min/:max',
        {
            ...supplierParams,
            attachValidation: true,
            preValidation: [instance.auth_supplier]
        },
        async (request, reply) => {
            if (request.validationError) {
                return reply.validation(request.validationError.message)
            }
            return await calculateReportSummary(request, reply, instance)
        }
    );
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
            return await calculateReportSummary(request, reply, instance)
        }
    );

    next()
})
