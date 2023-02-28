
const wOrderUpdateItem = async function (request, reply, instance) {
    try {
        const user = request.user;
        const {
            product_id,
            workgroup_order_id,
            quantity,
            production_item,
            comment,
            mix,
            cost
        } = request.body;
        const workgroup_order = await instance.WorkgroupOrder.findById(workgroup_order_id);
        if(!workgroup_order) {
            return reply.fourorfour('Workgroup order')
        }
        if(workgroup_order.current_employee+'' != user._id+'') {
            return reply.response(411, 'workgroup is not activated');
        }

        const item = await instance.goodsSales.findOne({
            _id: product_id,
            organization: user.organization
        });

        if(!item) {
            return reply.fourorfour('Item')
        }
        let exist = false;
        for(const itm of workgroup_order.items) {
            if(item._id+'' == itm.product_id+'') {
                exist = true
            }
        }
        if(!exist) {
            return reply.response(403, 'Item is not in workgroup order')
        }
        const result = await instance.WorkgroupOrder.updateOne(
            { _id: workgroup_order_id, "items.product_id": product_id },
            {
                $set: {
                    updatedAt: new Date().getTime(),
                    "items.$.quantity": quantity,
                    "items.$.production_item": production_item,
                    "items.$.comment": comment,
                    "items.$.mix": mix,
                    "items.$.cost": cost
                }
            }
        );

        if(result.nModified) {
            return reply.ok()
        }
        reply.error('Could not update')
    } catch (error) {
        reply.error(error.message)
    }
}

module.exports  = ((instance, _, next) => {

    const updateItemSchema = {
        body: {
            type: 'object',
            required: [
                'product_id',
                'workgroup_order_id',
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
                workgroup_order_id: {
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

    instance.post(
        '/workgroup/order/item-update',
        {
            version: '1.0.0',
            schema: updateItemSchema,
            attachValidation: true,
            preValidation: [instance.authorize_employee]
        },
        async (request, reply) => {
            if(request.validationError) {
                return reply.validation(request.validationError.message)
            }
            wOrderUpdateItem(request, reply, instance)
            return reply;
        }
    )

    next()
})
