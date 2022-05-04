const fp = require('fastify-plugin');

module.exports = fp((instance, _, next) => {
  /**
   * partiali tovar
   * postavchiklarni partiya bo'yicha alhida stockni hisoblash
   */

  async function updateManyQueesQunatityLeftZero(query) {
    return await instance.goodsSaleQueue
      .updateMany(
        query,
        { quantity_left: 0 },
        { lean: true },
      )
  }
  const updateSupplierPartiationQueueRefund = async (good_id, service_id, supplier_id, refund_count) => {
    const all_queue = await instance.goodsSaleQueue
      .find({
        good_id: good_id,
        service_id: service_id,
        supplier_id: supplier_id,
        queue: { $ne: 0 },
      })
      .sort({ queue: -1 })
      .lean()
    let dec_sum = 0
    const nullable_qunatity_left_queue_ids = []
    for (const queue of all_queue) {
      if (queue.quantity_left <= refund_count - dec_sum) {
        dec_sum += queue.quantity_left
        queue.quantity_left = 0
        nullable_qunatity_left_queue_ids.push(queue._id)
        // await updateGoodsSaleQueueQunatityLeft(queue._id, queue.quantity_left)
      } else {
        dec_sum += refund_count - dec_sum
        queue.quantity_left = refund_count - dec_sum
        await updateGoodsSaleQueueQunatityLeft(queue._id, queue.quantity_left)

        await updateManyQueesQunatityLeftZero({ _id: { $in: nullable_qunatity_left_queue_ids } })
        return
      }
    }

  }
  async function updateGoodsSaleQueueQunatityLeft(id, quantity_left = 0) {
    return await instance.goodsSaleQueue
      .findOneAndUpdate(
        { _id: id },
        { $set: { quantity_left: quantity_left } },
        { lean: true },
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
  async function updateGoodsSalesQueueOfSuppliers(id, num_queue, suppliers) {
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
      const index = Array.isArray(product_suppliers)
        ? product_suppliers.findIndex(elem =>
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

      const sale_goods_ids = goods.map(elem => elem.product_id)
      const db_goods = await instance.goodsSales
        .find({ _id: { $in: refund_good_ids } })
        .lean()
      const goods_obj = {}
      for (const db_good of db_goods) {
        goods_obj[db_good._id] = db_good
      }
      const queues = await instance.goodsSaleQueue
        .find({
          service_id: service._id,
          good_id: { $in: sale_goods_ids },
          quantity_left: { $ne: 0 }
        })
        .sort({ queue: 1 })
        .lean()
      const queues_obj = {}
      for (const que of queues) {
        queues_obj[que.good_id] = que
      }
      for (const good of goods) {
        good.queue = good.queue ? good.queue : 1
        // const queue = await getGoodSalesQueue({
        //   service_id: service._id,
        //   good_id: good.product_id,
        //   queue: good.queue,
        // })

        let num_queue = queues_obj[good.product_id] && queues_obj[good.product_id].queue
          ? queues_obj[good.product_id].queue
          : 1

        if (queues_obj[good.product_id]) {
          //inc queue
          goods_obj[good.product_id]
          // const current_good = await instance.goodsSales
          //   .findById(good.product_id)
          //   .lean()
          if (queues_obj[good.product_id].quantity_left <= good.value) {
            const res = await recursiveUpdateGoodSaleQueueDec(
              queues_obj[good.product_id],
              good,
              0,
              {
                service_id: service._id,
                product_id: good.product_id,
                // queue: queue.queue,
                // supplier_id: good.supplier_id,
              }
            )

            res.suppliers = getGoodOfSuppliers(goods_obj[good.product_id].suppliers, res.suppliers)

            return await updateGoodsSalesQueueOfSuppliers(good.product_id, res.num_queue, res.suppliers)
          } else {
            // update suppliers
            // const current_supplier = await instance.adjustmentSupplier
            //   .findById(queues_obj[good.product_id].supplier_id)
            //   .lean()

            const suppliers = Array.isArray(goods_obj[good.product_id].suppliers)
              ? goods_obj[good.product_id].suppliers
              : [{
                supplier_id: queues_obj[good.product_id].supplier_id,
                supplier_name: queues_obj[good.product_id].supplier_name,
                service_id: service._id,
                service_name: service.name,
                stock: 0,
              }]
            if (
              !suppliers
                .find(elem =>
                  elem.service_id + '' == service._id + ''
                  && elem.supplier_id + '' == queues_obj[good.product_id].supplier_id + ''
                )
            ) {
              suppliers.push({
                supplier_id: goods_obj[good.product_id].supplier_id,
                supplier_name: goods_obj[good.product_id].supplier_name,
                service_id: service._id,
                service_name: service.name,
                stock: 0,
              })
            }
            for (const [index, supp] of suppliers.entries()) {
              if (
                supp.service_id + '' == service._id + '' &&
                supp.supplier_id + '' == queues_obj[good.product_id].supplier_id + ''
              ) {
                suppliers[index].stock -= good.value
              }
            }
            await updateGoodsSalesQueueOfSuppliers(good.product_id, num_queue, suppliers)

            await updateGoodsSaleQueueQunatityLeft(
              queues_obj[good.product_id]._id,
              parseInt(queues_obj[good.product_id].quantity_left) - parseInt(good.value)
            )
          }
        }
      }
    } catch (err) {
      instance.send_Error('goods_partiation_queue_stock_update', err)
    }
  })

  // goods_partiation_queue_stock_update_refund
  instance.decorate('goods_partiation_queue_stock_update_refund', async (goods = [], service_id, supplier_id) => {
    console.log('goods_partiation_queue_stock_update_refund');
    try {
      const service = await instance.services
        .findById(service_id)
        .lean()
      const supplier = await instance.adjustmentSupplier
        .findOne({ _id: supplier_id })
        .lean();

      if (goods.length <= 0 | !service | !supplier) return

      // const query_queue = {
      //   service_id: service._id,
      //   supplier_id: supplier._id,
      // }
      const refund_good_ids = goods.map(elem => elem.product_id)
      const db_goods = await instance.goodsSales
        .find({ _id: { $in: refund_good_ids } })
        .lean()

      const goods_obj = {}
      for (const db_good of db_goods) {
        goods_obj[db_good._id] = db_good
      }
      const queues = await instance.goodsSaleQueue
        .find({
          service_id: service._id,
          supplier_id: supplier._id,
          good_id: { $in: refund_good_ids },
          quantity_left: { $ne: 0 }
        })
        .sort({ queue: 1 })
        .lean()
      const queues_obj = {}
      for (const que of queues) {
        queues_obj[que.good_id] = que
      }
      // console.log(queues);
      console.log(queues_obj);
      for (const good of goods) {
        // good.queue = good.queue ? good.queue : 1
        // const current_good = await instance.goodsSales
        //   .findById(good.product_id)
        //   .lean()
        // query_queue.good_id = good.product_id
        // const queue = await getGoodSalesQueue(query_queue)

        if (queues_obj[good.product_id].quantity_left <= good.quality) {
          await updateSupplierPartiationQueueRefund(good.product_id, service._id, supplier._id, good.quality)
        } else {
          queues_obj[good.product_id].quantity_left -= good.quality
          await updateGoodsSaleQueueQunatityLeft(
            queues_obj[good.product_id]._id,
            queues_obj[good.product_id].quantity_left
          )
        }
        // update suppliers
        const suppliers = Array.isArray(goods_obj[good.product_id])
          ? goods_obj[good.product_id].suppliers
          : [{
            supplier_id: supplier._id,
            supplier_name: supplier.supplier_name,
            service_id: service._id,
            service_name: service.name,
            stock: 0,
          }]
        let supp_index = goods_obj[good.product_id].suppliers
          .findIndex(elem =>
            elem.service_id + '' == service._id + ''
            && elem.supplier_id + '' == supplier._id + ''
          )
        if (supp_index == -1) {
          goods_obj[good.product_id].suppliers.push({
            supplier_id: supplier._id,
            supplier_name: supplier.supplier_name,
            service_id: service._id,
            service_name: service.name,
            stock: 0,
          })
          supp_index = goods_obj[good.product_id].suppliers.length - 1
        }

        goods_obj[good.product_id].suppliers[supp_index].stock -= good.quality

        await updateGoodsSalesQueueOfSuppliers(good.product_id, goods_obj[good.product_id].queue, suppliers)
      }
    } catch (err) {
      console.log(err);
      instance.send_Error('goods_partiation_queue_stock_update_refund', err)
    }
  })

  next()
})
