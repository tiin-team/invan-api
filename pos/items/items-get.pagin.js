
function compare(a, b) {

    if (a.category > b.category) {
        return 1
    }
    else if (b.category > a.category) {
        return -1
    }
    return 0
}

async function itemsGetPagin(request, reply, instance) {
    try {
        const { limit, page, time, type } = request.body;
        const user = request.user;
        const service_id = request.headers['accept-service'];
        const service = await instance.services.findById(service_id);
        if (!service) {
            return reply.fourorfour('Service')
        }
        const query = {
            organization: user.organization,
            services: { $elemMatch: { service: { $eq: service._id }, available: { $eq: true } } },
        }
        if (time) {
            switch (type) {
                case 'without': {
                    query.last_stock_updated = {
                        $gte: time
                    }
                    break;
                }
                case 'with': {
                    query.last_updated = {
                        $gte: time
                    }
                }
            }
        }
        const $match = {
            $match: query
        }
        const $sort = {
            $sort: {
                _id: 1
            }
        }
        const $unwind = {
            $unwind: {
                path: '$services'
            }
        }
        const $matchService = {
            $match: {
                $or: [
                    { 'services.service': service._id },
                    { 'services.service': service._id + '' }
                ]
            }
        }
        const $group = {
            $group: {
                _id: '$_id',
                name: {
                    $first: '$name'
                },
                price: {
                    $first: '$services.price'
                },
                price_currency: {
                    $first: '$services.price_currency'
                },
                default_purchase_cost: {
                    $first: '$default_purchase_cost'
                },
                purchase_cost_currency: {
                    $first: '$purchase_cost_currency'
                },
                cost: {
                    $first: '$cost'
                },
                cost_currency: {
                    $first: '$cost_currency'
                },
                max_cost: {
                    $first: '$max_cost'
                },
                sale_is_avialable: {
                    $first: '$sale_is_avialable'
                },
                composite_item: {
                    $first: '$composite_item'
                },
                is_composite_item: {
                    $first: '$is_composite_item'
                },
                use_production: {
                    $first: '$use_production'
                },
                is_track_stock: {
                    $first: '$is_track_stock'
                },
                in_stock: {
                    $first: '$services.in_stock'
                },
                low_stock: {
                    $first: '$services.low_stock'
                },
                optimal_stock: {
                    $first: '$services.optimal_stock'
                },
                sku: {
                    $first: '$sku'
                },
                created_time: {
                    $first: '$created_time'
                },
                last_updated: {
                    $first: '$last_updated'
                },
                representation_type: {
                    $first: '$representation_type'
                },
                shape: {
                    $first: '$shape'
                },
                representation: {
                    $first: '$representation'
                },
                category: {
                    $first: '$category'
                },
                category_id: {
                    $first: '$category'
                },
                category_name: {
                    $first: '$category_name'
                },
                sold_by: {
                    $first: '$sold_by'
                },
                primary_supplier_id: {
                    $first: '$primary_supplier_id'
                },
                primary_supplier_name: {
                    $first: '$primary_supplier_name'
                },
                organization: {
                    $first: '$organization'
                },
                fabricator: {
                    $first: '$fabricator'
                },
                modifiers: {
                    $first: '$modifiers'
                },
                prices: {
                    $first: '$services.prices'
                },
                reminder: {
                    $first: '$services.reminder'
                },
                stopped_item: {
                    $first: '$stopped_item'
                },
                count_by_type: {
                    $first: '$count_by_type'
                },
                barcode_by_type: {
                    $first: '$barcode_by_type'
                },
                hot_key: {
                    $first: '$hot_key'
                },
                barcode: {
                    $first: '$barcode'
                },
                item_type: {
                    $first: '$item_type'
                },
                has_variants: {
                    $first: '$has_variants'
                },
                variant_items: {
                    $first: '$variant_items'
                },
                taxes: {
                    $first: '$taxes'
                }
            }
        }
        const $skip = {
            $skip: limit * (page - 1)
        }
        const $limit = {
            $limit: limit
        }
        const $project = {
            $project: {
                price: {
                    $cond: {
                        if: {
                            $or: [
                                {
                                    $eq: [{ $type: '$price' }, 'double']
                                },
                                {
                                    $eq: [{ $type: '$price' }, 'int']
                                },
                            ]
                        },
                        then: '$price',
                        else: -1
                    }
                },
                price_currency: {
                    $cond: {
                        if: {
                            $eq: [{ $type: '$price_currency' }, 'string'],
                        },
                        then: '$price_currency',
                        else: 'uz'
                    }
                },
                prices: {
                    $cond: {
                        if: {
                            $eq: [{ $type: '$prices' }, 'array'],
                        },
                        then: '$prices',
                        else: []
                    }
                },
                in_stock: {
                    $cond: {
                        if: {
                            $or: [
                                {
                                    $eq: [{ $type: '$in_stock' }, 'double']
                                },
                                {
                                    $eq: [{ $type: '$in_stock' }, 'int']
                                }
                            ]
                        },
                        then: '$in_stock',
                        else: 0
                    }
                },
                reminder: {
                    $cond: {
                        if: {
                            $or: [
                                {
                                    $eq: [{ $type: '$reminder' }, 'double']
                                },
                                {
                                    $eq: [{ $type: '$reminder' }, 'int']
                                }
                            ]
                        },
                        then: '$reminder',
                        else: 0
                    }
                },
                stopped_item: {
                    $cond: {
                        if: {
                            $eq: [{ $type: '$stopped_item' }, 'boolean']
                        },
                        then: '$stopped_item',
                        else: false
                    }
                },
                name: {
                    $cond: {
                        if: {
                            $eq: [{ $type: '$name' }, 'string']
                        },
                        then: '$name',
                        else: ''
                    }
                },
                sold_by: {
                    $cond: {
                        if: {
                            $eq: [{ $type: '$sold_by' }, 'string']
                        },
                        then: '$sold_by',
                        else: 'each'
                    }
                },
                count_by_type: {
                    $cond: {
                        if: {
                            $or: [
                                {
                                    $eq: [{ $type: '$count_by_type' }, 'double']
                                },
                                {
                                    $eq: [{ $type: '$count_by_type' }, 'int']
                                }
                            ]
                        },
                        then: '$count_by_type',
                        else: 1
                    }
                },
                barcode_by_type: {
                    $cond: {
                        if: {
                            $eq: [{ $type: '$barcode_by_type' }, 'string']
                        },
                        then: '$barcode_by_type',
                        else: ''
                    }
                },
                cost: {
                    $cond: {
                        if: {
                            $or: [
                                {
                                    $eq: [{ $type: '$cost' }, 'double']
                                },
                                {
                                    $eq: [{ $type: '$cost' }, 'int']
                                }
                            ]
                        },
                        then: '$cost',
                        else: 0
                    }
                },
                cost_currency: {
                    $cond: {
                        if: {
                            $eq: [{ $type: '$cost_currency' }, 'string'],
                        },
                        then: '$cost_currency',
                        else: 'uz'
                    }
                },
                sku: 1,
                hot_key: 1,
                barcode: {
                    $cond: {
                        if: {
                            $eq: [{ $type: '$barcode' }, 'array'],
                        },
                        then: '$barcode',
                        else: []
                    }
                },
                is_composite_item: {
                    $cond: {
                        if: {
                            $eq: [{ $type: '$is_composite_item' }, 'boolean'],
                        },
                        then: '$is_composite_item',
                        else: false
                    }
                },
                use_production: {
                    $cond: {
                        if: {
                            $eq: [{ $type: '$use_production' }, 'boolean'],
                        },
                        then: '$use_production',
                        else: false
                    }
                },
                representation_type: {
                    $cond: {
                        if: {
                            $eq: [{ $type: '$representation_type' }, 'string'],
                        },
                        then: '$representation_type',
                        else: 'color'
                    }
                },
                shape: {
                    $cond: {
                        if: {
                            $eq: [{ $type: '$shape' }, 'string'],
                        },
                        then: '$shape',
                        else: 'square'
                    }
                },
                representation: {
                    $cond: {
                        if: {
                            $eq: [{ $type: '$representation' }, 'string'],
                        },
                        then: '$representation',
                        else: '#E0E0E0'
                    }
                },
                has_variants: {
                    $cond: {
                        if: {
                            // $eq: [{ $type: '$has_variants' }, 'boolean'],
                            $and: [
                                {
                                    $eq: [{ $type: '$variant_items' }, 'array']
                                },
                                {
                                    $gt: [
                                        {
                                            $size: '$variant_items'
                                        },
                                        0
                                    ]
                                }
                            ]
                        },
                        then: true,
                        else: false
                    }
                },
                variant_items: {
                    $cond: {
                        if: {
                            $eq: [{ $type: '$variant_items' }, 'array'],
                        },
                        then: '$variant_items',
                        else: []
                    }
                },
                modifiers: {
                    $cond: {
                        if: {
                            $eq: [{ $type: '$modifiers' }, 'array'],
                        },
                        then: '$modifiers',
                        else: []
                    }
                },
                taxes: {
                    $reduce: {
                        input: "$taxes",
                        initialValue: [],
                        in: {
                            $concatArrays: [
                                "$$value", {
                                    $cond: [
                                        {
                                            $eq: ["$$this.available", false]
                                        },
                                        ["$$this.tax_id"],
                                        []
                                    ]
                                }
                            ],
                        }
                    }
                },
                sale_is_avialable: true,
                category: {
                    $cond: {
                        if: {
                            $eq: [{ $type: '$category' }, 'string']
                        },
                        then: '$category',
                        else: ''
                    }
                },
                category_id: {
                    $cond: {
                        if: {
                            $eq: [{ $type: '$category' }, 'string']
                        },
                        then: '$category',
                        else: ''
                    }
                },
                category_name: {
                    $cond: {
                        if: {
                            $eq: [{ $type: '$category_name' }, 'string']
                        },
                        then: '$category_name',
                        else: ''
                    }
                },
                item_type: 1
            }
        }
        const total = await instance.goodsSales.countDocuments(query);
        const items = await instance.goodsSales.aggregate([
            $match,
            $sort,
            $unwind,
            $matchService,
            $group,
            $skip,
            $limit,
            $project
        ]).allowDiskUse(true).exec();

        // optimize soon

        try {
            const sortPrices = (prices) => {
                prices = prices.sort(compare);
                let PRICES = []
                for (const ind in prices) {
                    if (prices[ind].from != 0 && prices[ind].price != 0) {
                        PRICES.push(prices[ind])
                    }
                    else if (prices[ind].from == 0 && prices[ind].price != 0 && ind == 0) {
                        PRICES.push(prices[ind])
                    }
                }
                return PRICES
            }

            for (const index in items) {
                if (items[index].prices instanceof Array) {
                    items[index].prices = sortPrices(items[index].prices);
                    const new_prices = [];
                    for (const p of items[index].prices) {
                        if (p.price != 0 && p.from != 0) {
                            new_prices.push(p)
                        }
                        else if (p.price != 0) {
                            new_prices.push(p)
                        }
                    }
                }
                else {
                    items[index].prices = [];
                }
            }
        }
        catch (error) {
            console.log('PRICES ERROR ')
            console.log(error.message)
        }

        return reply.ok({
            total: total,
            items: items
        })
    } catch (error) {
        console.log(error.message)
        return reply.error(error.message)
    }
    return reply;
}

module.exports = ((instance, options, next) => {

    const schema = {
        schema: {
            body: {
                type: 'object',
                required: [
                    'page', 'limit'
                ],
                properties: {
                    limit: {
                        type: 'integer',
                        minimum: 1,
                        maximum: 100
                    },
                    page: {
                        type: 'integer',
                        minimum: 1
                    },
                    time: {
                        type: 'number'
                    },
                    type: {
                        type: 'string'
                    }
                }
            }
        }
    }

    instance.post(
        '/items/get-pagin',
        {
            version: '1.0.0',
            ...schema,
            preValidation: [instance.authorize_employee],
            attachValidation: true,
        },
        (request, reply) => {
            if (request.validationError) {
                return reply.validation(request.validationError.message)
            }
            return itemsGetPagin(request, reply, instance)
        }
    )

    next()
})
