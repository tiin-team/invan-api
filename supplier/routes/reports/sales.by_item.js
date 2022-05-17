const fp = require('fastify-plugin');

module.exports = fp((instance, _, next) => {
    const by_item_below = async (request, reply) => {
        try {
            const user = request.user
            const { min, max } = request.params;
            const {
                category,
                custom,
                start,
                end,
                services,
                search,
                sort_by,
                sort_type,
            } = request.query;
            const sort = {}

            switch (sort_by) {
                case 'name':
                    sort.product_name = parseInt(sort_type)
                    break;
                case 'items_sold':
                    sort.items_sold = parseInt(sort_type)
                    break;
                case 'gross_sales':
                    sort.gross_sales = parseInt(sort_type)
                    break;
                default:
                    sort.gross_sales = -1;
                    break;
            }
            const limit = !isNaN(parseInt(request.query.limit))
                ? parseInt(request.query.limit)
                : 10
            const page = !isNaN(parseInt(request.query.page))
                ? parseInt(request.query.page)
                : 1

            const filterReceipts = {
                organization: user.organization,
                receipt_state: { $ne: 'draft' },
                debt_id: null,
                date: {
                    // $gte: min - (process.env.TIME_DIFF | 0),
                    // $lte: max - (process.env.TIME_DIFF | 0)
                    $gte: min,
                    $lte: max
                },
            };

            if (services && services.length > 0) {
                filterReceipts.service = { $in: services };
            }

            if (custom) {
                const additional_query = []
                for (let i = min; i < max; i += 86400000) {
                    additional_query.push({
                        date: {
                            // $lte: i + end * 3600000 - (process.env.TIME_DIFF | 0),
                            // $gte: i + start * 3600000 - (process.env.TIME_DIFF | 0)
                            $lte: i + end * 3600000,
                            $gte: i + start * 3600000,
                        }
                    })
                }
                delete filterReceipts.date
                filterReceipts['$or'] = additional_query
            }

            const unwindSoldItemList = { $unwind: "$sold_item_list" };

            const calculateItemsReport = {
                $group: {
                    _id: "$sold_item_list.product_id",
                    sku: { $last: "$sold_item_list.sku" },
                    product_name: { $last: "$sold_item_list.product_name" },
                    supplier: { $last: "$sold_item_list.supplier_name" },
                    cost_of_goods: {
                        $sum: {
                            $multiply: [
                                { $max: ["$sold_item_list.cost", 0] },
                                { $max: ["$sold_item_list.value", 0] },
                                { $cond: ["$is_refund", -1, 1] }
                            ],
                        },
                    },
                    gross_sales: {
                        $sum: {
                            $multiply: [
                                { $max: ["$sold_item_list.price", 0] },
                                { $max: ["$sold_item_list.value", 0] },
                                { $cond: ["$is_refund", 0, 1] },
                            ]
                        }
                    },
                    refunds: {
                        $sum: {
                            $multiply: [
                                { $max: ["$sold_item_list.price", 0] },
                                { $max: ["$sold_item_list.value", 0] },
                                { $cond: ["$is_refund", 1, 0] },
                            ],
                        },
                    },
                    discounts: {
                        $sum: {
                            $multiply: [
                                { $max: ["$sold_item_list.total_discount", 0] },
                                { $cond: ["$is_refund", -1, 1] },
                            ],
                        },
                    },
                    items_sold: {
                        $sum: {
                            $cond: [
                                "$is_refund",
                                0,
                                {
                                    $cond: [
                                        { $eq: ['$sold_item_list.sold_item_type', 'box_item'] },
                                        {
                                            $divide: [
                                                { $max: ["$sold_item_list.value", 0] },
                                                { $max: ["$sold_item_list.count_by_type", 1] }
                                            ]
                                        },
                                        { $max: ["$sold_item_list.value", 0] },
                                    ],
                                },
                            ],
                        },
                    },
                    items_refunded: {
                        $sum: {
                            $cond: [
                                "$is_refund",
                                {
                                    $cond: [
                                        { $eq: ['$sold_item_list.sold_item_type', 'box_item'] },
                                        {
                                            $divide: [
                                                { $max: ["$sold_item_list.value", 0] },
                                                { $max: ["$sold_item_list.count_by_type", 1] }
                                            ],
                                        },
                                        { $max: ["$sold_item_list.value", 0] },
                                    ],
                                },
                                0,
                            ],
                        },
                    },
                    taxes: { $sum: 0 },
                },
            };

            // if (category) {
            //   filterReceipts["sold_item_list.category_id"] = category
            //   calculateItemsReport.$group.category = { $last: "$sold_item_list.category_name" }
            // }

            const searchByItemName = {
                $match: {
                    product_name: {
                        $regex: (search ? search : ''),
                        $options: 'i'
                    }
                }
            }

            const sortResult = { $sort: sort };

            const skipResult = { $skip: limit * (page - 1) };

            const limitResult = { $limit: limit };

            const projectResult = {
                $project: {
                    id: "$_id",
                    sku: 1,
                    name: "$product_name",
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
                            { $add: ["$refunds", "$discounts"] },
                        ],
                    },
                    gross_profit: {
                        $subtract: [
                            {
                                $subtract: [
                                    "$gross_sales",
                                    { $add: ["$refunds", "$discounts"] },
                                ],
                            },
                            "$cost_of_goods",
                        ],
                    },
                },
            };
            const projectCategoryFilter = {
                $project: {
                    sold_item_list: {
                        $filter: {
                            input: '$sold_item_list',
                            as: 'sold_item',
                            cond: {
                                $or: [
                                    { $eq: ["$$sold_item.supplier_id", user._id] },
                                    { $eq: ["$$sold_item.supplier_id", user._id + ""] },
                                ],
                            }
                        }
                    },
                    is_refund: 1,
                }
            }
            if (category)
                projectCategoryFilter.$project.sold_item_list = {
                    $filter: {
                        input: "$sold_item_list",
                        as: "item",
                        cond: { $eq: ["$$item.category_id", category] }
                    },
                }

            const result = await instance.Receipts.aggregate([
                { $match: filterReceipts },
                projectCategoryFilter,
                unwindSoldItemList,
                calculateItemsReport,
                searchByItemName,
                sortResult,
                skipResult,
                limitResult,
                projectResult
            ])
                .allowDiskUse(true)
                .exec();

            const groupSoldItems = {
                $group: {
                    _id: "$sold_item_list.product_id",
                    product_name: { $last: "$sold_item_list.product_name" },
                },
            }

            const countAllItems = {
                $group: {
                    _id: null,
                    count: { $sum: 1 },
                },
            };

            const totalCount = await instance.Receipts.aggregate([
                { $match: filterReceipts },
                projectCategoryFilter,
                unwindSoldItemList,
                groupSoldItems,
                searchByItemName,
                countAllItems
            ])
                .allowDiskUse(true)
                .exec();

            const total_result = totalCount && totalCount.length > 0 && totalCount[0].count ? totalCount[0].count : 0;

            const categoryMap = {}

            for (const index in result) {
                try {
                    const item = await instance.goodsSales.findById(result[index].id).lean();
                    const cat_id = item.category ? item.category : item.category_id;
                    if (item && cat_id) {
                        if (!categoryMap[cat_id]) {
                            try {
                                const category = await instance.goodsCategory.findById(item.category).lean();
                                if (category) {
                                    categoryMap[cat_id] = category.name
                                }
                            } catch (error) { }
                        }
                        result[index].category = categoryMap[cat_id] ? categoryMap[cat_id] : ''
                    }
                } catch (error) { }
            }

            return reply.ok({
                total: total_result,
                limit: limit,
                page: page,
                page_count: Math.ceil(total_result / limit),
                data: result,
            })
        }
        catch (error) {
            return reply.error(error.message)
        }
        return reply;
    }
    const itemsBelowParams = {
        version: '1.0.0',
        schema: {
            params: {
                type: 'object',
                required: ['min', 'max'],
                properties: {
                    min: { type: 'number', minimum: 1 },
                    max: { type: 'number', minimum: 1 },
                }
            },
            query: {
                type: 'object',
                required: [
                    // 'custom', 'end', 'services', 'start'
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
                    sort_by: {
                        type: 'string',
                        enum: ['name', 'items_sold', 'gross_sales'],
                        default: 'gross_sales'
                    },
                    sort_type: {
                        type: 'number',
                        enum: [1, -1],
                        default: -1
                    },
                }
            }
        }
    }
    instance.get(
        '/report/sales/by_item/below/:min/:max',
        {
            ...itemsBelowParams,
            attachValidation: true,
            preValidation: [instance.auth_supplier]
        },
        async (request, reply) => {
            if (request.validationError) {
                return reply.validation(request.validationError.message)
            }
            return await by_item_below(request, reply)
        }
    );
    next()
})