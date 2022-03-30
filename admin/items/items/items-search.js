
async function searchItemsHandler(request, reply, instance) {
    try {
        const {
            limit, page, service: service_id, category: category_id,
            supplier: supplier_id, stock, search, sort_by
        } = request.body;
        const user = request.user;
        const matchItems = {
            $match: {
                organization: user.organization
            }
        }
        const sortItems = {
            $sort: {
                sort_by: 1
            }
        }
        
    } catch (error) {
        reply.error(error.message)
    }
    return reply;
}

module.exports = ((instance, _, next) => {

    const schemaOptions = {
        version: '1.0.0',
        schema: {
            body: {
                type: 'object',
                required: [
                    'limit', 'page',
                    'service', 'category',
                    'supplier', 'stock'
                ],
                properties: {
                    limit: {
                        type: 'integer',
                        minimum: 1,
                    },
                    page: {
                        type: 'integer',
                        minimum: 1
                    },
                    service: {
                        type: 'string'
                    },
                    category: {
                        type: 'string'
                    },
                    supplier: {
                        type: 'string'
                    },
                    stock: {
                        type: 'string'
                    },
                    search: {
                        type: 'string',
                        default: ''
                    },
                    sort_by: {
                        type: 'string',
                        default: 'name',
                        enum: [
                            'name', 'sku', 'stock'
                        ]
                    }
                }
            }
        },
        attachValidation: true
    }
    instance.post(
        '/items/search/pagin',
        {
            ...schemaOptions,
            preValidation: [instance.authorize_admin],
        },
        (request, reply) => {
            if(request.validationError) {
                return reply.validation(request.validationError.message)
            }
            searchItemsHandler(request, reply, instance)
        }
    )

    next()
})
