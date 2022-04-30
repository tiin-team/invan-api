const fp = require('fastify-plugin');
// const begin = 1650999600000
// const end = 1651086000000 - 1
// const check_start = 1650999697297
// const dateDiffer = 86400000;
// console.log('start:', new Date(begin), 'end:', new Date(end));
// console.log((begin + 18000000) / dateDiffer);
// console.log((end + 18000000) / dateDiffer);

// // console.log(Math.ceil(begin / dateDiffer));
// // console.log(Math.ceil(end / dateDiffer));

// const date1 = new Date(dateDiffer * 19109)
// console.log(date1);
// console.log(begin - date1.getTime());
// console.log(end - date1.getTime());
module.exports = fp((instance, _, next) => {
  /**
   * partiali tovar
   * postavchiklarni partiya bo'yicha alhida stockni hisoblash
   */
  async function updateGoodsSaleQueueQunatityLeft(id, quantity_left = 0) {
    return await instance.goodsSaleQueue
      .findOneAndUpdate(
        { _id: id },
        { $set: { quantity_left: quantity_left } },
        { lean: true, new: true },
      )
  }
  async function getGoodSalesQueue(query, sort = -1) {
    return await instance.goodsSaleQueue
      .findOne(query)
      .sort({ queue: sort })
      .lean()
  }

  async function recursiveUpdateGoodSaleQueueDec(queue, good, dec_count, { product_id, service_id }) {
    num_queue = queue.queue
    const suppliers = []
    if (queue.quantity_left < good.value - dec_count) {
      dec_count = dec_count + queue.quantity_left
      const queue_next = await getGoodSalesQueue({
        queue: num_queue + 1,
        good_id: product_id,
        service_id: service_id,
      })
      if (queue.quantity_left != 0)
        suppliers.push({
          supplier_id: queue.supplier_id,
          service_id: queue.service_id,
          dec_count: queue.quantity_left,
        })
      queue.queue = 0
      await updateGoodsSaleQueueQunatityLeft(queue._id, queue.queue)
      if (queue_next) {
        const res = await recursiveUpdateGoodSaleQueueDec(
          queue_next,
          good,
          dec_count,
          {
            service_id: service_id,
            product_id: product_id,
            // supplier_id: supplier_id,
            // queue: queue_next.queue,
          }
        )
        suppliers.push(...res.suppliers)
        res.suppliers = suppliers

        return res
      } else {
        ++num_queue
      }
    } else
      if (queue.quantity_left == good.value - dec_count) {
        suppliers.push({
          supplier_id: queue.supplier_id,
          service_id: queue.service_id,
          dec_count: queue.quantity_left,
        })

        ++num_queue
      } else {
        suppliers.push({
          supplier_id: queue.supplier_id,
          service_id: queue.service_id,
          dec_count: good.value - dec_count,
        })
      }
    await updateGoodsSaleQueueQunatityLeft(queue._id, queue.quantity_left - (good.value - dec_count))

    return { num_queue: num_queue, suppliers: suppliers }
  }
  async function updateGoodsSalesQueueAndSuppliers(id, num_queue, suppliers) {
    return await instance.goodsSales
      .findOneAndUpdate(
        { _id: id },
        {
          $set: {
            queue: num_queue,
            suppliers: suppliers,
          },
        },
        { lean: true, new: true },
      )
  }
  function getGoodOfSuppliers(product_suppliers, updated_suppliers = []) {
    for (const u_supp of updated_suppliers) {
      const index = Array.isArray(product_suppliers) ?
        product_suppliers.findIndex(elem =>
          elem.supplier_id + '' == u_supp.supplier_id + ''
          && elem.service_id + '' == u_supp.service_id + ''
        )
        : -1

      if (index == -1) {
        product_suppliers.push({
          supplier_id: u_supp.supplier_id,
          supplier_name: '',
          service_id: u_supp.service_id,
          service_name: '',
          stock: -u_supp.dec_count,
        })
      } else
        product_suppliers[index].stock -= u_supp.dec_count
    }

    return product_suppliers
  }

  instance.decorate('goods_partiation_queue_stock_update', async (goods = [], service_id) => {
    try {
      // console.log(goods.length, 'goods.length');
      const service = await instance.services
        .findById(service_id)
        .lean()
      for (const good of goods) {
        good.queue = good.queue ? good.queue : 1
        const queue = await getGoodSalesQueue({
          service_id: service._id,
          good_id: good.product_id,
          queue: good.queue,
        })

        let num_queue = queue && queue.queue ? queue.queue : 1

        if (queue) {
          //inc queue
          const current_good = await instance.goodsSales
            .findById(good.product_id)
            .lean()
          if (queue.quantity_left <= good.value) {
            const res = await recursiveUpdateGoodSaleQueueDec(
              queue,
              good,
              0,
              {
                service_id: service._id,
                product_id: current_good._id,
                // queue: queue.queue,
                // supplier_id: good.supplier_id,
              }
            )

            res.suppliers = getGoodOfSuppliers(current_good.suppliers, res.suppliers)

            return await updateGoodsSalesQueueAndSuppliers(
              good.product_id,
              res.num_queue,
              // supplier_id ? good.queue : res.num_queue,
              res.suppliers,
              queue,
            )
          } else {
            // update suppliers
            const current_supplier = await instance.adjustmentSupplier
              .findById(queue.supplier_id)
              .lean()

            const suppliers = Array.isArray(current_good.suppliers)
              ? current_good.suppliers
              : [{
                supplier_id: current_supplier._id,
                supplier_name: current_supplier.supplier_name,
                service_id: service._id,
                service_name: service.name,
                stock: 0,
              }]
            if (
              !current_good.suppliers
                .find(elem =>
                  elem.service_id + '' == service._id + '' &&
                  elem.supplier_id + '' == current_supplier._id + ''
                )
            ) {
              current_supplier.services.push({
                supplier_id: current_supplier._id,
                supplier_name: current_supplier.supplier_name,
                service_id: service._id,
                service_name: service.name,
                stock: 0,
              })
            }
            for (const [index, supp] of suppliers.entries()) {
              if (
                supp.service_id + '' == service._id + '' &&
                supp.supplier_id + '' == current_supplier._id + ''
              ) {
                suppliers[index].stock -= good.value
              }
            }
            await updateGoodsSalesQueueAndSuppliers(
              good.product_id,
              num_queue,
              // supplier_id ? good.queue : num_queue,
              suppliers, queue
            )

            await updateGoodsSaleQueueQunatityLeft(
              queue._id,
              parseInt(queue.quantity_left) - parseInt(good.value)
            )
          }
        }
      }
    } catch (err) {
      instance.send_Error('goods_partiation_queue_stock_update', err)
    }
  })
  const updateSupplierPartiationQueue = async (good_id, service_id, supplier_id, refund_count) => {
    const all_queue = await instance.goodsSaleQueue
      .find({
        good_id: good_id,
        service_id: service_id,
        supplier_id: supplier_id,
      })
      .sort({ queue: -1 })
      .lean()
    let dec_sum = 0
    for (const queue of all_queue) {
      if (queue.quantity_left <= refund_count - dec_sum) {
        dec_sum += queue.quantity_left
        queue.quantity_left = 0
        await updateGoodsSaleQueueQunatityLeft(queue._id, queue.quantity_left)
      } else {
        queue.quantity_left = refund_count - dec_sum
        await updateGoodsSaleQueueQunatityLeft(queue._id, queue.quantity_left)
        dec_sum += queue.quantity_left - queue.queue
        return
      }
    }

  }
  // goods_partiation_queue_stock_update_refund
  instance.decorate('goods_partiation_queue_stock_update_refund', async (goods = [], service_id, supplier_id) => {
    // console.log('goods_partiation_queue_stock_update_refund');
    try {
      const service = await instance.services
        .findById(service_id)
        .lean()
      const supplier = await instance.adjustmentSupplier
        .findOne({ _id: supplier_id })
        .lean();

      const query_queue = {
        service_id: service._id,
        supplier_id: supplier._id,
      }
      for (const good of goods) {
        // good.queue = good.queue ? good.queue : 1
        const current_good = await instance.goodsSales
          .findById(good.product_id)
          .lean()
        query_queue.good_id = current_good._id
        const queue = await getGoodSalesQueue(query_queue)

        if (queue.quantity_left <= good.quality) {
          await updateSupplierPartiationQueue(current_good._id, service._id, supplier._id, good.quality)
        } else {
          queue.quantity_left = 0
          await updateGoodsSaleQueueQunatityLeft(queue._id, queue.quantity_left)
        }
        // update suppliers
        const suppliers = Array.isArray(current_good.suppliers)
          ? current_good.suppliers
          : [{
            supplier_id: supplier._id,
            supplier_name: supplier.supplier_name,
            service_id: service._id,
            service_name: service.name,
            stock: 0,
          }]
        let supp_index = current_good.suppliers.findIndex(elem =>
          elem.service_id + '' == service._id + '' &&
          elem.supplier_id + '' == supplier._id + ''
        )
        if (supp_index == -1)
          current_good.suppliers.push({
            supplier_id: supplier._id,
            supplier_name: supplier.supplier_name,
            service_id: service._id,
            service_name: service.name,
            stock: 0,
          })
        supp_index = current_good.suppliers.findIndex(elem =>
          elem.service_id + '' == service._id + '' &&
          elem.supplier_id + '' == supplier._id + ''
        )

        current_good.suppliers[supp_index].stock -= good.quality

        await updateGoodsSalesQueueAndSuppliers(current_good._id, current_good.queue, suppliers)
      }
    } catch (err) {
      instance.send_Error('goods_partiation_queue_stock_update_refund', err)
    }
  })

  next()
})
