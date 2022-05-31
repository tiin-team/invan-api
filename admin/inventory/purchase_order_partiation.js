const fp = require('fastify-plugin');

module.exports = fp((instance, options, next) => {

    instance.decorate('create_partiation_queue', async (items, current_service, current_supplier, purch, goods) => {
        const queues = [];
        for (const purch_item of items) {
            const curr_good = await instance.goodsSales.findById(purch_item.product_id).lean();

            const queue = await instance.goodsSaleQueue
                .findOne(
                    {
                        service_id: current_service._id,
                        good_id: purch_item.product_id,
                    },
                    { queue: 1 },
                )
                .sort('-queue')
                .lean()

            num_queue = queue && !isNaN(parseInt(queue.queue)) ? parseInt(queue.queue) + 1 : 1

            queues.push({
                purchase_id: purch._id,
                p_order: purch.p_order,
                supplier_id: current_supplier._id,
                supplier_name: current_supplier.supplier_name,
                service_id: current_service._id,
                service_name: current_service.name,
                good_id: purch_item.product_id,
                quantity: purch_item.received,
                quantity_left: purch_item.received,
                queue: num_queue,
            })

            //update item suppliers
            const good_of_suppliers =
                Array.isArray(curr_good.suppliers)
                    ? curr_good.suppliers
                    : [{
                        supplier_id: current_supplier._id,
                        supplier_name: current_supplier.supplier_name,
                        service_id: current_service._id,
                        service_name: current_service.name,
                        stock: 0,
                    }]
            let good_of_supp_serv_index = good_of_suppliers
                .findIndex(elem =>
                    elem.supplier_id + '' == current_supplier._id + '' &&
                    elem.service_id + '' == purch.service + ''
                )
            if (good_of_supp_serv_index === -1) {
                good_of_supp_serv_index = good_of_suppliers.length
                services.push({
                    supplier_id: current_supplier._id,
                    supplier_name: current_supplier.supplier_name,
                    service_id: current_service._id,
                    service_name: current_service.name,
                    stock: 0,
                })
            }
            good_of_suppliers[good_of_supp_serv_index].stock += purch_item.received

            await instance.goodsSales.updateOne(
                { _id: purch_item.product_id },
                { $set: { suppliers: good_of_suppliers } },
                { lean: true },
            )
        }

        instance.goodsSaleQueue.insertMany(queues, (err, goods_of_queues) => {
            if (err || goods_of_queues == null) {
                instance.send_Error(
                    'create_partiation_queue, saving queues\n', JSON.stringify(err))
            }
        })
    });

    next()
})
