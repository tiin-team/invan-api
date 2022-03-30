const getItems = async function (request, reply, instance) {
    try {
        const user = request.user;
        const { limit, page, search, category } = request.body;
        
        const namesMatch = [
            {
              name: { $regex: search, $options: 'i' }
            },
            {
              parent_name: { $regex: search, $options: 'i' }
            },
            {
              name: { $regex: (instance.converter(search) != "" ? instance.converter(search) : "salom_dunyo_ishla_qale"), $options: 'i' }
            },
            {
              parent_name: { $regex: (instance.converter(search) != "" ? instance.converter(search) : "salom_dunyo_ishla_qale"), $options: 'i' }
            }
        ]
        if(+search) {
            namesMatch.push({
                sku: +search
            })
        }

        const matchItems = {
            $match: {
                organizaztion: user.organizaztion,
                has_variants: {
                    $ne: true
                },
                $or: namesMatch
            }
        }

        if(category) {
            matchItems['$match'].category = category
        }

        const unwindItems = {
            $unwind: {
                path: '$services'
            }
        }
        
        let service_id = request.headers['accept-service'];
        try {
            service_id = instance.ObjectId(service_id)
        } catch (error) {}
        const matchService = {
            $match: {
                $or: [
                    {
                        'services.service': service_id
                    },
                    {
                        'services.service': service_id + ''
                    }
                ]
            }
        }
        const skipItems = {
            $skip: limit*(page-1)
        }
        const limitItems = {
            $limit: limit
        }
        const projectItems = {
            $project: {
                name: 1,
                price: '$services.price',
                item_type: 1,
                parent_name: 1,
                workgroups: 1,
                parent_item: 1,
                is_track_stock: 1
            }
        }
        const items = await instance.goodsSales.aggregate([
            matchItems,
            unwindItems,
            matchService,
            skipItems,
            limitItems,
            projectItems
        ]).allowDiskUse(true);
        
        for(const index in items) {
            if(!items[index].workgroups) {
                items[index].workgroups = []
            }
            if(items[index].item_type == 'variant') {
                items[index].name = `${items[index].parent_name}(${items[index].name})`;
                try {
                    const parent = await instance.goodsSales.findOne({
                        variant_items: {
                            $elemMatch: {
                                $eq: items[index]._id
                            }
                        }
                    });
                    if(parent) {
                        items[index].workgroups = parent.workgroups;
                        if(!items[index].workgroups) {
                            items[index].workgroups = []
                        }
                    }
                } catch (error) {}
            }
        }

        reply.ok(items)
    } catch (error) {
        instance.log.error(error.message);
        reply.error(error.message)
    }
    return reply;
}

module.exports = ((instance, _, next) => {
    
    const itemsSearch = {
        body: {
            type: 'object',
            required: [
                'limit', 'page', 'search'
            ],
            properties: {
                limit: {
                    type: 'number',
                    minimum: 1,
                    maximum: 200
                },
                page: {
                    type: 'number',
                    minimum: 1
                },
                search: {
                    type: 'string'
                },
                category: {
                    type: 'string',
                    minLength: 24,
                    maxLength: 24
                }
            }
        }
    }

    instance.post(
        '/items/search',
        {
            version: '1.0.0',
            schema: itemsSearch,
            attachValidation: true,
            preValidation: [instance.authorize_employee]
        },
        (request, reply) => {
            if(request.validationError) {
                return reply.validation(request.validationError.message)
            }
            getItems(request, reply, instance)
        }
    )

    next()
})
