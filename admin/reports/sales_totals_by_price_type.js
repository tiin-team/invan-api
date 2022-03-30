module.exports = (instance, options, next) => {

    instance.decorate('admin', null);

    const authorizeAdmin = (request, reply, done) => {
        instance.oauth_admin(request, reply, (admin) => {
            if (!admin) {
                return reply.error('Access denied');
            }

            // populate admin decorator
            instance.admin = admin;

            done();
        });
    };

    const schemaSalesByPriceTypes = {
        body: {
            type: 'object',
            properties: {
                startDate: { type: 'number' },
                endDate: { type: 'number' },
            },
            required: [
                'startDate',
                'endDate',
            ],
            additionalProperties: false,
        }
    };

    instance.post(
        '/reports/sales/by_price_type',
        {
            ...options.version,
            schema: schemaSalesByPriceTypes,
            preHandler: authorizeAdmin,
        },
        async (request, reply) => {

            const { startDate, endDate } = request.body;

            // todo: Add filters by additional fields, for example, by organization.

            const filterByDate = {
                $match: {
                    date: {
                        $gte: startDate,
                        $lt: endDate
                    },
                    is_refund: false
                },
            };

            const calculateTotalRecords = {
                $group: {
                    _id: null,
                    total_records: {
                        $sum: 1.0
                    },
                    records: {
                        $push: {
                            date: "$date",
                            sold_item_list: "$sold_item_list"
                        }
                    },
                },
            };

            const unwindRecords = {
                $unwind: {
                    path: "$records"
                }
            };

            const unindentFields = {
                $project: {
                    total_records: "$total_records",
                    sold_item_list: "$records.sold_item_list",
                    date: "$records.date"
                }
            };

            const unwindSoldItemList = {
                $unwind: {
                    path: "$sold_item_list"
                }
            };

            const projectPrimaryFields = {
                $project: {
                    total_records: "$total_records",
                    // price = price * (value - reset_count)
                    price: {
                        $multiply: [
                            "$sold_item_list.price",
                            {
                                $subtract: [
                                    "$sold_item_list.value",
                                    "$sold_item_list.reset_count"
                                ]
                            }
                        ]
                    },
                    // profit = (price * (value - reset_count)) - (cost * (value - reset_count))
                    profit: {
                        $subtract: [
                            {
                                $multiply: [
                                    "$sold_item_list.price",
                                    {
                                        $subtract: [
                                            "$sold_item_list.value",
                                            "$sold_item_list.reset_count"
                                        ]
                                    }
                                ]
                            },
                            {
                                $multiply: [
                                    "$sold_item_list.cost",
                                    {
                                        $subtract: [
                                            "$sold_item_list.value",
                                            "$sold_item_list.reset_count"
                                        ]
                                    }
                                ]
                            }
                        ]
                    },
                    date: {
                        // timestamp to DD.MM.YYYY HH:mm:ss string
                        $dateToString: {
                            format: "%d.%m.%Y %H:%M:%S",
                            date: {
                                $add: [
                                    new Date("1970-01-01T10:00:00.000+0500"),
                                    "$date"
                                ]
                            }
                        }
                    },
                    price_type: {
                        // if price_type = P, then get P1, else get the specified price_type
                        // if no price_type is specified, then get P1
                        $ifNull: [
                            {
                                $cond: [
                                    {
                                        $eq: [
                                            "$sold_item_list.price_type",
                                            "P"
                                        ]
                                    },
                                    "P1",
                                    "$sold_item_list.price_type"
                                ]
                            },
                            "P1"
                        ]
                    }
                }
            };

            const calculateTotals = {
                $group: {
                    _id: null,
                    total_records: {
                        $min: "$total_records"
                    },
                    total_sale: {
                        $sum: "$price"
                    },
                    total_profit: {
                        // sum only profit
                        $sum: {
                            $cond: [
                                {
                                    $gt: [
                                        "$profit",
                                        0.0
                                    ]
                                },
                                "$profit",
                                0.0
                            ]
                        }
                    },
                    total_loss: {
                        // sum only loss
                        $sum: {
                            $cond: [
                                {
                                    $lte: [
                                        "$profit",
                                        0.0
                                    ]
                                },
                                "$profit",
                                0.0
                            ]
                        }
                    },
                    price_types: {
                        // gather other data as array
                        $push: {
                            price_type: "$price_type",
                            price: "$price",
                            profit: {
                                $cond: [
                                    {
                                        $gt: [
                                            "$profit",
                                            0.0
                                        ]
                                    },
                                    "$profit",
                                    0.0
                                ]
                            },
                            loss: {
                                $cond: [
                                    {
                                        $lte: [
                                            "$profit",
                                            0.0
                                        ]
                                    },
                                    "$profit",
                                    0.0
                                ]
                            }
                        }
                    }
                }
            };

            const unwindByPriceTypes = {
                $unwind: {
                    path: "$price_types"
                }
            };

            const calculatePercentages = {
                $project: {
                    price_type: "$price_types.price_type",
                    price: "$price_types.price",
                    percent_sale: {
                        // percent_sale = (price / total_sale) * 100
                        $multiply: [
                            {
                                $divide: [
                                    "$price_types.price",
                                    "$total_sale"
                                ]
                            },
                            100.0
                        ]
                    },
                    percent_loss: {
                        // percent_loss = (abs(loss) / total_sale) * 100
                        $multiply: [
                            {
                                $divide: [
                                    {
                                        $abs: "$price_types.loss"
                                    },
                                    "$total_sale"
                                ]
                            },
                            100.0
                        ]
                    },
                    total_records: "$total_records",
                    total_sale: "$total_sale",
                    avg_sale: {
                        // avg_sale = total_sale / total_records
                        $divide: [
                            "$total_sale",
                            "$total_records"
                        ]
                    },
                    total_profit: "$total_profit",
                    total_loss: {
                        $abs: "$total_loss"
                    }
                }
            };

            const calculateTotalPercentages = {
                $group: {
                    _id: "$price_type",
                    price: {
                        $sum: "$price"
                    },
                    percent_sale: {
                        $sum: "$percent_sale"
                    },
                    percent_loss: {
                        $sum: "$percent_loss"
                    },
                    total_sale: {
                        $min: "$total_sale"
                    },
                    total_profit: {
                        $min: "$total_profit"
                    },
                    total_loss: {
                        $min: "$total_loss"
                    },
                    total_records: {
                        $min: "$total_records"
                    },
                    avg_sale: {
                        $min: "$avg_sale"
                    }
                }
            };

            const roundValues = {
                $project: {
                    _id: '$_id',
                    price: { $round: ['$price', 2] },
                    percent_sale: { $round: ['$percent_sale', 2] },
                    percent_loss: { $round: ['$percent_loss', 2] },
                    total_sale: { $round: ['$total_sale', 2] },
                    total_profit: { $round: ['$total_profit', 2] },
                    total_loss: { $round: ['$total_loss', 2] },
                    total_records: '$total_records',
                    avg_sale: { $round: ['$avg_sale', 2] },
                }
            };

            const sortByPriceType = {
                $sort: {
                    _id: 1.0
                }
            };

            const items = await instance.Receipts.aggregate([
                    filterByDate,
                    calculateTotalRecords,
                    unwindRecords,
                    unindentFields,
                    unwindSoldItemList,
                    projectPrimaryFields,
                    calculateTotals,
                    unwindByPriceTypes,
                    calculatePercentages,
                    calculateTotalPercentages,
                    roundValues,
                    sortByPriceType,
                ])
                .allowDiskUse(true)
                .exec();

            reply.ok(items);

            return reply;
        }
    );

    next();

};