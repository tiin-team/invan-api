
const wOrderAddItemGroup = async function (request, reply, instance) {
    try {
        const user = request.user;
        const {
            workgroup_order_id,
            items
        } = request.body;
        
        const workgroup_order = await instance.WorkgroupOrder.findById(workgroup_order_id);
        
        if (!workgroup_order) {
            return reply.fourorfour('Workgroup order')
        }

        if (workgroup_order.current_employee + '' != user._id + '') {
            return reply.response(411, 'workgroup is not activated');
        }

        const itemsMap = {}
        for(const item of items) {
            const good = await instance.goodsSales.findOne({
                _id: item.product_id,
                organization: user.organization
            });
            if(!good) {
                return reply.fourorfour(`Item with id ${item.product_id}`)
            }
            
            const exist_workgroup_order = await instance.WorkgroupOrder.findOne({
                _id: workgroup_order_id,
                items: {
                    $elemMatch: {
                        $or: [
                            {
                                product_id: good._id
                            },
                            {
                                product_id: good._id+''
                            }
                        ]                        
                    }
                }
                // "items.product_id": item.product_id
            })
            
            if(exist_workgroup_order) {
                return reply.response(403, `Item with id ${item.product_id} already exist`);
            }
            if(itemsMap[item.product_id]) {
                return reply.response(405, `Items should be Set`);
            }

            if (good.item_type == 'variant') {
                good.name = `${good.parent_name}(${good.name})`
            }

            itemsMap[item.product_id] = {
                product_id: good._id,
                product_name: good.name,
                quantity: item.quantity,
                cost: item.cost,
                production_item: item.production_item,
                comment: item.comment,
                mix: item.mix,
                used_quantities: [],
                created_from: 'user',
                created_by: user._id,
            };
        }

        for(const item of items) {
            await instance.WorkgroupOrder.updateOne(
                { _id: workgroup_order_id },
                {
                    $set: {
                        updatedAt: new Date().getTime()
                    },
                    $push: {
                        items: itemsMap[item.product_id]
                    }
                }
            );
        }

        reply.ok()
    } catch (error) {
        reply.error(error.message)
    }
}

module.exports = ((instance, _, next) => {

    const addItemGroupSchema = {
        body: {
            type: 'object',
            required: [
                'items', 'workgroup_order_id'
            ],
            properties: {
                workgroup_order_id: {
                    type: 'string',
                    minLength: 24,
                    maxLength: 24
                },
                items: {
                    type: 'array',
                    minItems: 1,
                    items: {
                        type: 'object',
                        required: [
                            'product_id',
                            'quantity',
                            'production_item',
                            'mix',
                            'cost'
                        ],
                        properties: {
                            product_id: {
                                type: 'string',
                                minLength: 24,
                                maxLength: 24
                            },
                            quantity: {
                                type: 'number',
                                minimum: 0
                            },
                            production_item: {
                                type: 'number',
                                minimum: 0
                            },
                            comment: {
                                type: 'string',
                                default: ''
                            },
                            mix: {
                                type: 'number',
                                default: 0
                            },
                            cost: {
                                type: 'number',
                                minimum: 0
                            }
                        }
                    }
                }
            }
        }
    }

    instance.post(
        '/workgroup/order/item-add-group',
        {
            version: '1.0.0',
            schema: addItemGroupSchema,
            attachValidation: true,
            preValidation: [instance.authorize_employee]
        },
        async (request, reply) => {
            if (request.validationError) {
                return reply.validation(request.validationError.message)
            }
            wOrderAddItemGroup(request, reply, instance)
            return reply;
        }
    )

    next()
})
