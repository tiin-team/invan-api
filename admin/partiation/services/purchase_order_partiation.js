const fp = require('fastify-plugin');

module.exports = fp((instance, options, next) => {
  /**
   * postavchikdan tovar kelganda partiya yaratish
  */
  instance.decorate('create_partiation_queue', async (items, current_service, current_supplier, purch, create_date, called_path = '') => {
    const queues = [];
    const sale_goods_ids = items.map(elem => elem.product_id)
    const db_goods = await instance.goodsSales
      .find({ _id: { $in: sale_goods_ids } })
      .lean()
    const goods_obj = {}
    for (const db_good of db_goods) {
      goods_obj[db_good._id] = db_good
    }

    for (const purch_item of items) {
      if (!goods_obj[purch_item.product_id])
        continue
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
        organization_id: current_service.organization,
        date: create_date,
        purchase_id: purch._id,
        p_order: purch.p_order,
        supplier_id: current_supplier._id,
        supplier_name: current_supplier.supplier_name,
        service_id: current_service._id,
        cost: purch_item.purchase_cost,
        barcode: goods_obj[purch_item.product_id].barcode,
        service_name: current_service.name,
        good_id: purch_item.product_id,
        good_name: goods_obj[purch_item.product_id].name,
        quantity: purch_item.received,
        quantity_left: purch_item.received,
        queue: num_queue,
      })

      //update item suppliers
      const good_of_suppliers =
        Array.isArray(goods_obj[purch_item.product_id].suppliers)
          ? goods_obj[purch_item.product_id].suppliers
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
        good_of_suppliers.push({
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
          `create_partiation_queue, saving queues. path: ${called_path}\n`, JSON.stringify(err))
      }
    })
  });

  next()
})
