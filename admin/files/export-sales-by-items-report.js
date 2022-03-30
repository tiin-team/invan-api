const fp = require('fastify-plugin');
const fs = require("fs");
const json2xls = require("json2xls");

async function salesReportByItem(request, reply, instance) {
    try {
        let {min, max, organization, token} = request.params;
        const user = await instance.User.findOne({admin_token: token});
        if (!user) {
            return reply.error('Access!')
        }

        if (user.ui_language && user.ui_language.value) {
            instance.i18n.setLocale(user.ui_language.value)
        }

        min = parseFloat(min);
        max = parseFloat(max);
        if (max - min > 30 * 24 * 60 * 60 * 1000) {
            max = min + 30 * 24 * 60 * 60 * 1000;
        }

        const filterReceipts = {
            $match: {
                organization: organization,
                receipt_state: {
                    $ne: 'draft'
                },
                debt_id: null,
                date: {
                    $gte: min - (process.env.TIME_DIFF | 0),
                    $lte: max - (process.env.TIME_DIFF | 0)
                }
            }
        }

        const unwindSoldItemList = {
            $unwind: {path: "$sold_item_list"}
        }

        const calculateItemsReport = {
            $group: {
                _id: "$sold_item_list.product_id",
                product_name: {
                    $last: "$sold_item_list.product_name"
                },
                sku: {
                    $last: "$sold_item_list.sku"
                },
                cost_of_goods: {
                    $sum: {
                        $multiply: [
                            {$max: ["$sold_item_list.cost", 0]},
                            {$max: ["$sold_item_list.value", 0]},
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
                            {$max: ["$sold_item_list.price", 0]},
                            {$max: ["$sold_item_list.value", 0]},
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
                            {$max: ["$sold_item_list.price", 0]},
                            {$max: ["$sold_item_list.value", 0]},
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
                            {
                                $cond: [
                                    {$eq: ['$sold_item_list.sold_item_type', 'box_item']},
                                    {
                                        $divide: [
                                            {$max: ["$sold_item_list.value", 0]},
                                            {$max: ["$sold_item_list.count_by_type", 1]}
                                        ]
                                    },
                                    {$max: ["$sold_item_list.value", 0]}
                                ]
                            }
                        ]
                    }
                },
                items_refunded: {
                    $sum: {
                        $cond: [
                            "$is_refund",
                            {
                                $cond: [
                                    {$eq: ['$sold_item_list.sold_item_type', 'box_item']},
                                    {
                                        $divide: [
                                            {$max: ["$sold_item_list.value", 0]},
                                            {$max: ["$sold_item_list.count_by_type", 1]}
                                        ]
                                    },
                                    {$max: ["$sold_item_list.value", 0]}
                                ]
                            },
                            0
                        ]
                    }
                },
                taxes: {$sum: 0}
            }
        }

        const sortResult = {
            $sort: {
                gross_sales: -1
            }
        }

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

        const pipeline = [
            filterReceipts,
            unwindSoldItemList,
            calculateItemsReport,
            sortResult,
            projectResult
        ]

        const result = await instance.Receipts.aggregate(pipeline)
            .allowDiskUse(true)
            .exec();

        const items_excel_arr = [];

        for (const index in result) {
            const item = result[index];
            item.gross_sales = Math.round(item.gross_sales * 100) / 100;
            item.refunds = Math.round(item.refunds * 100) / 100;
            item.discounts = Math.round(item.discounts * 100) / 100;
            item.net_sales = Math.round(item.net_sales * 100) / 100;
            item.cost_of_goods = Math.round(item.cost_of_goods * 100) / 100;
            item.gross_profit = Math.round(item.gross_profit * 100) / 100;
            items_excel_arr.push({
                [`${instance.i18n.__('sku')}`]: item.sku,
                [`${instance.i18n.__('item')}`]: item.name,
                [`${instance.i18n.__('items_sold')}`]: item.items_sold,
                [`${instance.i18n.__('gross_sales')}`]: item.gross_sales,
                // [`${instance.i18n.__('items_refunded')}`]: item.items_refunded,
                // [`${instance.i18n.__('refunds')}`]: item.refunds,
                // [`${instance.i18n.__('discounts')}`]: item.discounts,
                [`${instance.i18n.__('net_sales')}`]: item.net_sales,
                [`${instance.i18n.__('cost_of_goods')}`]: item.cost_of_goods,
                [`${instance.i18n.__('gross_profit')}`]: item.gross_profit
            });
        }

        const xls = json2xls(items_excel_arr);
        const timeStamp = new Date().getTime();
        await fs.writeFileSync(`./static/items-report-${timeStamp}.xls`, xls, "binary");
        reply.sendFile(`./items-report-${timeStamp}.xls`);
        setTimeout(() => {
            fs.unlink(`./static/items-report-${timeStamp}.xls`, (error) => {
                if (error) {
                    console.log(error)
                }
            });
        }, 2000);
    }
    catch (error) {
        console.log(error)
        reply.error(error.name)
    }
    return reply;
}

module.exports = fp((instance, _, next) => {

    instance.get(
        '/sales-by-item/csv/:token/:organization/:min/:max/:name',
        (request, reply) => {
            return salesReportByItem(request, reply, instance)
        }
    );

    next()
})
