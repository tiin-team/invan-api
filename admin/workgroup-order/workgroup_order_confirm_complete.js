
const confirmWorkgroupOrder = async (request, reply, instance) => {
    try {
        const { id } = request.params;
        const user = request.user;
        const workgroup_order = await instance.WorkgroupOrder.findById(id);
        if (!workgroup_order) {
            return reply.fourorfour('WorkgroupOrder')
        }

        let total_item_cost = 0;
        for (const item of workgroup_order.items) {
            if (!item.quantity) {
                item.quantity = 0
            }
            if (!item.used_quantity) {
                item.used_quantity = 0
            }
            if (!item.cost) {
                item.cost = 0
            }
            if (!item.residue) {
                item.residue = 0
            }

            total_item_cost += (item.used_quantity - item.residue) * item.cost;
        }
        const { additional_cost, in_stock, add_to_stock } = request.body;

        await instance.WorkgroupOrder.updateOne(
            { _id: workgroup_order._id },
            {
                $set: {
                    state: 'complete_confirmed',
                    updatedAt: new Date().getTime(),
                    total_cost: total_item_cost,
                    additional_cost: additional_cost
                }
            }
        )

        const services = await instance.services.find({ organization: workgroup_order.organization });
        const itemServices = []
        for (const s of services) {
            itemServices.push({
                service: s._id,
                service_name: s.name,
                price: 0,
                price_currency: 'uzs',
                prices: [],
                in_stock: s._id + '' == workgroup_order.service + '' ? in_stock : 0,
                available: s._id + '' == workgroup_order.service + ''
            })
        }
        let otherCategory = await instance.goodsCategory.findOne({ organization: workgroup_order.organization, is_other: true });
        if (!otherCategory) {
            otherCategory = {}
        }
        const current_time = new Date().getTime();
        const lastItem = await instance.goodsSales.findOne({ organization: workgroup_order.organization }).sort({ sku: -1 });
        let validSku = 10000;
        if (lastItem && lastItem.sku) {
            validSku = lastItem.sku + 1;
        }

        const itemData = {
            organization: workgroup_order.organization,
            services: itemServices,
            created_time: current_time,
            last_updated: current_time,
            last_stock_updated: current_time,
            last_price_change: current_time,
            name: `${workgroup_order.title} ${workgroup_order.order_number}`,
            category: otherCategory._id,
            category_name: otherCategory.name,
            sold_by: 'weight',
            cost: total_item_cost,
            is_track_stock: true,
            sku: validSku
        }

        // try {

        const item = await instance.goodsSales.findById(workgroup_order.item_id);
        if (item) {
            let service_id = workgroup_order.service;
            try {
                service_id = instance.ObjectId(service_id);
            } catch (error) { }
            const updaetQuery = {
                $set: {
                    cost: total_item_cost
                }
            }
            if (add_to_stock) {
                updaetQuery['$inc'] = {
                    'services.$.in_stock': in_stock
                }
            }

            const updated_item = await instance.goodsSales.findOneAndUpdate(
                {
                    _id: item._id,
                    services: {
                        $elemMatch: {
                            service: service_id
                        }
                    }
                },
                updaetQuery,
                { new: true }
            );
            let next_stock;
            for (const s of updated_item.services) {
                if (s.service + '' == service_id + '') {
                    next_stock = s.in_stock
                }
            }
            if (in_stock != 0 && add_to_stock) {
                await instance.create_inventory_history(user, "item edit", "", workgroup_order.service, item._id, 0, in_stock, next_stock, current_time);
            }
        }

        instance.log.info(`Updated item id ${item._id}`);
        return reply.ok()

        // } catch (error) {
        //     console.log(error)
        // }
        // const { _id: item_id } = await new instance.goodsSales(itemData).save();
        // if (in_stock != 0) {
        //     await instance.create_inventory_history(user, "item edit", "", workgroup_order.service, item_id, 0, in_stock, in_stock, current_time);
        // }
        // instance.log.info(`Saved item id ${item_id}`);

    } catch (error) {
        reply.error(error.message)
    }
}

module.exports = ((instance, _, next) => {

    const confirmCompleteSchema = {
        body: {
            type: 'object',
            required: [
                // 'total_production_cost',
                'additional_cost',
                'in_stock'
            ],
            properties: {
                // total_production_cost: {
                //     type: 'number',
                //     minimum: 0
                // },
                additional_cost: {
                    type: 'number',
                    minimum: 0
                },
                in_stock: {
                    type: 'number'
                },
                add_to_stock: {
                    type: 'boolean'
                }
            }
        }
    }

    instance.post(
        '/workgroup/order/confirm/complete/:id',
        {
            version: '1.0.0',
            schema: confirmCompleteSchema,
            preValidation: instance.authorize_admin,
            attachValidation: true
        },
        async (request, reply) => {
            if (request.validationError) {
                return reply.validation(request.validationError.message)
            }
            confirmWorkgroupOrder(request, reply, instance)
            return reply;
        }
    )

    next()
})
