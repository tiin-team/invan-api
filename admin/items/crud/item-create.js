
module.exports = ((instance, _, next) => {

    const soldByEnum = [
        'each',
        'weight',
        'pcs',
        'box',
        'litre',
        'metre'
    ]

    const itemSchema = {
        body: {
            type: 'object',
            additionalProperties: false,
            required: [
                'name', 'sku', 'sold_by'
            ],
            properties: {
                name: { type: 'string' },
                sold_by: {
                    type: 'string',
                    enum: soldByEnum
                },
                price: {
                    type: 'number',
                },
                price_currency: {
                    type: 'string',
                    default: 'uzs'
                },
                cost: {
                    type: 'number'
                },
                cost_currency: {
                    type: 'string',
                    default: 'uzs'
                },
                sku: {
                    type: 'number'
                },
                hot_key: {
                    type: 'string',
                    pattern: '[A-Z]',
                    maxLength: 1
                },
                barcode: {
                    type: 'array',
                    items: {
                        type: 'string'
                    }
                },
                count_by_type: {
                    type: 'number',
                    default: 0
                },
                barcode_by_type: {
                    type: 'string'
                },
                workgroups: {
                    type: 'array',
                    items: {
                        type: 'string',
                        minLength: 24,
                        maxLength: 24
                    }
                },
                composite_item: {
                    type: 'boolean',
                    default: false
                },
                is_track_stock: {
                    type: 'boolean',
                    default: false
                },
                is_composite_item: {
                    type: 'boolean',
                    default: false
                },
                use_production: {
                    type: 'boolean',
                    default: false
                },
                use_sub_production: {
                    type: 'boolean',
                    default: false
                },
                composite_items: {
                    type: 'array',
                    default: [],
                    items: {
                        type: 'object',
                        additionalProperties: false,
                        properties: {
                            product_id: {
                                type: 'string',
                                minLength: 24,
                                maxLength: 24
                            },
                            quality: {
                                type: 'number',
                                default: 0,
                                minimum: 0
                            }
                        }
                    }
                },
                primary_supplier_id: {
                    type: 'string',
                    minLength: 24,
                    maxLength: 24
                },
                default_purchase_cost: {
                    type: 'number',
                    default: 0
                },
                purchase_cost_currency: {
                    type: 'string',
                    default: 'uzs'
                },
                services: {
                    type: 'array',
                    minItems: 1,
                    items: {
                        type: 'object',
                        required: [
                            'service', 'price'
                        ],
                        properties: {
                            service: {
                                type: 'string',
                                minLength: 24,
                                maxLength: 24
                            },
                            price: {
                                type: 'number'
                            },
                            price_currency: {
                                type: 'string',
                                default: 'uzs'
                            },
                            price_auto_fill: {
                                type: 'boolean',
                                default: false
                            },
                            prices: {
                                type: 'array',
                                default: [],
                                items: {
                                    type: 'object',
                                    additionalProperties: false,
                                    properties: {
                                        from: {
                                            type: 'number'
                                        },
                                        price: {
                                            type: 'number'
                                        }
                                    }
                                }
                            },
                            in_stock: {
                                type: 'number',
                                default: 0
                            },
                            low_stock: {
                                type: 'number'
                            },
                            optimal_stock: {
                                type: 'number'
                            },
                            reminder: {
                                type: 'number',
                                default: 0
                            },
                            available: {
                                type: 'boolean',
                                default: false
                            },
                            representation_type: {
                                type: 'string',
                                enum: [
                                    'color', 'image'
                                ],
                                default: 'colot'
                            },
                            shape: {
                                type: 'string',
                                default: 'circle'
                            },
                            representation: {
                                type: 'string',
                                default: '#4CAF50'
                            },
                            has_variants: {
                                type: 'boolean',
                                default: false
                            },
                            modifiers: {
                                type: 'array',
                                items: {
                                    type: 'string',
                                    minLength: 24,
                                    maxLength: 24
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // instance.post(
    //     '/item/create-item',

    // )

    next()
})
