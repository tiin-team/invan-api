const fp = require('fastify-plugin');

module.exports = fp((instance, _, next) => {
  /**
   * partiali tovar
   * postavchiklarni partiya bo'yicha vozvrat qilish
   */

  /**
    @param {any} query goodsSaleQueue filter
    @returns {Promise<any>}
    query bo'yicha barcha goodsSaleQueue larni quantity_left ni 0 qiladi
  */
  async function updateManyQueesQunatityLeftZero(query) {
    return await instance.goodsSaleQueue
      .updateMany(
        query,
        { quantity_left: 0 },
        { lean: true },
      )
  }

  /**
    @param {mongoose.Types.ObjectId | String} id goodsSaleQueue ning _id si
    @param {Number} quantity_left default 0
    @returns {Promise<any>} goodsSaleQueue modeldan mos obyektni id bo'yicha quantity_left ni yangilaydi
  */
  async function updateGoodsSaleQueueQunatityLeft(id, quantity_left = 0) {
    return await instance.goodsSaleQueue
      .findOneAndUpdate(
        { _id: id },
        { $set: { quantity_left: quantity_left } },
        { lean: true },
      )
  }

  /**
    @param {mongoose.Types.ObjectId | String} id 
    @param {Number} num_queue 
    @param {[{
     supplier_id: mongoose.Types.ObjectId | String,
     supplier_name: String,
     service_id: mongoose.Types.ObjectId | String,
     service_name: String,
     stock: Number = 0,
     }]} suppliers 
    @returns {Promise<any>} goodsSales modeldan mos id bo'yicha 
    obyektning queue sini va suppliers (partiyali stocklarini) yangilaydi
  */
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

  /**
    @param {[{ 
      organization_id: mongoose.Types.ObjectId,
      supplier_id: mongoose.Types.ObjectId,
      supplier_name: String,
      purchase_id: mongoose.Types.ObjectId,
      p_order: String,
      service_id: mongoose.Types.ObjectId,
      service_name: String,
      good_id: mongoose.Types.ObjectId,
      good_name: String,
      cost: Number,
      quantity: Number,
      quantity_left: Number,
      queue: Number,
      date: Number,}
    ]} all_queue 
    @param {Number} refund_count 
    @returns {Promise<Number>} bitta productning bitta filialda bitta postavchikdan kelgan partiyalarini oladi
    va partiyadan vozvrat qilib, queue ni qaytaradi
   */
  async function updateSupplierPartiationQueueRefund(all_queue, refund_count) {
    let dec_sum = 0
    const nullable_qunatity_left_queue_ids = []

    for (const queue of all_queue) {
      if (queue.quantity_left <= refund_count - dec_sum) {
        dec_sum += queue.quantity_left
        queue.quantity_left = 0
        nullable_qunatity_left_queue_ids.push(queue._id)
      } else {
        queue.quantity_left -= refund_count - dec_sum
        // dec_sum += refund_count - dec_sum
        // n - m oraliqdagi queuelarning partiyasini update qilish
        await updateGoodsSaleQueueQunatityLeft(queue._id, queue.quantity_left)

        // n - m -- oraliqdagi barcha partiyalarni qunatity_left ni 0 qilish
        await updateManyQueesQunatityLeftZero({ _id: { $in: nullable_qunatity_left_queue_ids } })
        return queue.queue
      }
    }
    // agar partiyalari tugab qolsa...
    return all_queue[all_queue.length - 1].queue
  }

  /**
   * Postavchikdan kelgan tovarni refund qilish
   * @param {[any]} goods - refund qilinayotgan tovarlar
   * @param {mongoose.Types.ObjectId} service_id - filial _id si
   * @param {mongoose.Types.ObjectId} supplier_id - postavchik _id si
   * @returns {void}
   */
  instance.decorate('goods_partiation_queue_stock_update_refund', async (goods = [], service_id, supplier_id) => {
    try {
      const service = await instance.services
        .findById(service_id)
        .lean()
      const supplier = await instance.adjustmentSupplier
        .findOne({ _id: supplier_id })
        .lean();

      if (goods.length <= 0 | !service | !supplier) return

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
        .lean();
      [].filter(elem => { })
      for (const good of goods) {
        const queue_index = queues.findIndex(elem => elem.good_id + '' === good.product_id + '')
        num_queue = queues[queue_index].queue
        if (queues[queue_index].quantity_left <= good.quality) {
          num_queue = await updateSupplierPartiationQueueRefund(
            queues.filter(elem => elem.good_id + '' === good.product_id + ''),
            good.quality,
            // good.product_id,
            // service._id,
            // supplier._id,
          )
        } else {
          queues[queue_index].quantity_left -= good.quality
          await updateGoodsSaleQueueQunatityLeft(
            queues[queue_index]._id,
            queues[queue_index].quantity_left
            // queues_obj[good.product_id].quantity_left
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
        let supp_index = suppliers
          .findIndex(elem =>
            elem.service_id + '' == service._id + ''
            && elem.supplier_id + '' == supplier._id + ''
          )
        if (supp_index == -1) {
          supp_index = suppliers.length

          suppliers.push({
            supplier_id: supplier._id,
            supplier_name: supplier.supplier_name,
            service_id: service._id,
            service_name: service.name,
            stock: 0,
          })
        }

        suppliers[supp_index].stock -= good.quality

        await updateGoodsSalesQueueOfSuppliers(good.product_id, num_queue, suppliers)
      }
    } catch (err) {
      instance.send_Error('goods_partiation_queue_stock_update_refund', err)
    }
  })

  next()
})
