
const wOrderAddItem = async function (request, reply, instance) {
    try {
        const user = request.user;
        let {
            product_id,
            workgroup_order_id,
            quantity,
            production_item,
            comment,
            mix,
            cost
        } = request.body;
        const workgroup_order = await instance.WorkgroupOrder.findById(workgroup_order_id);
        if (!workgroup_order) {
            return reply.fourorfour('Workgroup order')
        }
        // if (workgroup_order.current_employee + '' != user._id + '') {
        //     return reply.response(411, 'workgroup is not activated');
        // }

        const item = await instance.goodsSales.findOne({
            _id: product_id,
            organization: user.organization
        });

        if (!item) {
            return reply.fourorfour('Item')
        }

        // const testNumbers = [
        //     '+998994056972',
        //     '+998933213326'
        // ]
        // if (testNumbers.includes(user.phone_number)) {
        try {
            const service_id = request.headers['accept-service'];
            const service = await instance.services.findById(service_id);
            if (!service) {
                return reply.fourorfour('Service not found')
            }
            for (const s of item.services) {
                if (s.service + '' == service._id) {
                    cost = s.price
                }
            }
        } catch (error) {
            console.log(error)
            return reply.error(error.message)
        }
        // }
        for (const itm of workgroup_order.items) {
            if (item._id + '' == itm.product_id + '') {
                return reply.response(403, 'Item already exist');
            }
        }
        if (item.item_type == 'variant') {
            item.name = `${item.parent_name}(${item.name})`
        }
        const newItem = {
            product_id: product_id,
            product_name: item.name,
            quantity: quantity,
            cost: cost,
            production_item: production_item,
            comment: comment,
            mix: mix,
            used_quantities: [],
            created_from: 'user',
            created_by: user._id,
        }

        await instance.WorkgroupOrder.updateOne(
            { _id: workgroup_order_id },
            {
                $set: {
                    updatedAt: new Date().getTime()
                },
                $push: {
                    items: newItem
                }
            }
        );

        reply.ok()
    } catch (error) {
        reply.error(error.message)
    }
    return reply;
}

module.exports = ((instance, _, next) => {

    const addItemSchema = {
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
        '/workgroup/order/item-add',
        {
            version: '1.0.0',
            schema: addItemSchema,
            attachValidation: true,
            preValidation: [instance.authorize_employee]
        },
        async (request, reply) => {
            if (request.validationError) {
                return reply.validation(request.validationError.message)
            }
            wOrderAddItem(request, reply, instance)
            return reply;
        }
    )

    next()
})
