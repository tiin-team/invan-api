
const fp = require('fastify-plugin');

const calculateReportSummary = async (request, reply, instance) => {
    try {
        const supplier = request.user
        const { min, max, limit, page } = request.params;
        const { custom, start, end, services, count_type, target } = request.body;

        const filterReceipts = {
            $and: [
                { organization: supplier.organization },
                { receipt_state: { $ne: 'draft' } },
                { debt_id: null },
                {
                    date: {
                        // $gte: min - (TIME_DIFF | 0),
                        // $lte: max - (TIME_DIFF | 0),
                        $gte: min,
                        $lte: max,
                    },
                },
            ],
        };

        if (services && services.length > 0) {
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
                total_discount: {
                    $sum: '$sold_item_list.total_discount'
                },
                total_price: {
                    $multiply: [
                        { $max: [0, '$sold_item_list.value'] },
                        { $max: [0, '$sold_item_list.price'] },
                    ],
                },
                cost_of_goods: {
                    // $reduce: {
                    //     input: '$sold_item_list',
                    //     initialValue: 0,
                    //     in: {
                    //         $add: [
                    //             '$$value',
                    //             {
                    // $multiply: [
                    //     { $max: [0, '$$this.value'] },
                    //     { $max: [0, '$$this.cost'] },
                    // ],
                    $multiply: [
                        { $max: [0, '$sold_item_list.value'] },
                        { $max: [0, '$sold_item_list.cost'] },
                    ],
                    //         },
                    //     ],
                    // },
                    // },
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
                        }
                    },
                },
            },
        };

        const unwindSoldItemList = { $unwind: '$sold_item_list' }
        const filterSupplierMatch = {
            $match: {
                $or: [
                    { "sold_item_list.supplier_id": supplier._id },
                    { "sold_item_list.supplier_id": supplier._id + '' },
                ],
            },
        }

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
                // sortByDate,
                unwindSoldItemList,
                filterSupplierMatch,
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
                unwindSoldItemList,
                filterSupplierMatch,
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
            const skipResult = { $skip: limit * (page - 1) };
            const limitResult = { $limit: limit };

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
                },
            };

            const result = await instance.Receipts.aggregate([
                { $match: filterReceipts },
                // sortByDate,
                unwindSoldItemList,
                filterSupplierMatch,
                projectReport,
                groupByDate,
                sortById,
                skipResult,
                limitResult,
                // netSalesAndProfit,
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
        return reply.error(error.message);
    }
};

module.exports = fp((instance, _, next) => {
    const supplierParams = {
        version: '1.0.0',
        schema: {
            params: {
                type: 'object',
                required: ['min', 'max'],
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
                    'services', 'start',
                    'count_type', 'target'
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
                    },
                    count_type: {
                        type: 'integer',
                        enum: [1, 2, 3, 4, 5, 6],
                    },
                    target: {
                        type: 'string',
                        enum: [
                            'gross_sales',
                            'refunds',
                            'discounts',
                            'net_sales',
                        ],
                    }
                }
            }
        }
    }
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
    next()
})
