const fp = require('fastify-plugin');

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
        { lean: true },
      )
  }

  /**
    @param {[{
      _id: string
      supplier_id: string
      service_id: string
      quantity: number
      quantity_left: number
    }]} queues
    @param {number} index_queue
    @param {number} dec_count
    @param { 
        product_id: string 
        service_id: string
      }
    @returns {
      <{
        num_queue: number
        suppliers: [{
          supplier_id: string
          service_id: string
          dec_count: number
        }]
    }>}
    bitta tovarni partiya boyicha sotish
  */
  async function recursiveUpdateGoodSaleQueueDec(queues, index_queue, good, dec_count, { product_id, service_id }) {
    num_queue = queues[index_queue].queue

    const suppliers = []

    if (queues[index_queue].quantity_left < good.value - dec_count) {
      dec_count = dec_count + queues[index_queue].quantity_left

      if (queues[index_queue].quantity_left != 0)
        suppliers.push({
          supplier_id: queues[index_queue].supplier_id,
          service_id: queues[index_queue].service_id,
          dec_count: queues[index_queue].quantity_left,
        })
      queues[index_queue].quantity_left = 0
      // idlarni arrayga saqlab updateMany qilish krk
      await updateGoodsSaleQueueQunatityLeft(queues[index_queue]._id, queues[index_queue].quantity_left)
      if (queues[index_queue + 1]) {
        const res = await recursiveUpdateGoodSaleQueueDec(
          queues,
          index_queue + 1,
          good,
          dec_count,
          {
            service_id: service_id,
            product_id: product_id,
          }
        )
        suppliers.push(...res.suppliers)
        res.suppliers = suppliers

        return res
      } else {
        ++num_queue
      }
    } else
      if (queues[index_queue].quantity_left == good.value - dec_count) {
        ++num_queue
      }
    suppliers.push({
      supplier_id: queues[index_queue].supplier_id,
      service_id: queues[index_queue].service_id,
      dec_count: good.value - dec_count,
    })

    await updateGoodsSaleQueueQunatityLeft(
      queues[index_queue]._id,
      queues[index_queue].quantity_left - (good.value - dec_count)
    )

    return { num_queue: num_queue, suppliers: suppliers }
  }

  /**
 * update goodsSales
 * @param {Number} id tovar _id si
 * @param {Number} num_queue partiya tartibi
 * @param {[any]} suppliers
 * @returns goodsSales object
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

  /**
  * sotuv bo'lganda partiyadan sotish
  * @param goods - sotilgan tovarlar
  * @param service_id - filial _id si
  */

  instance.decorate('goods_partiation_queue_stock_update', async (goods = [], service_id) => {
    try {
      // console.log(goods.length, 'goods.length');
      const service = await instance.services
        .findById(service_id)
        .lean()

      const sale_goods_ids = goods.map(elem => elem.product_id)
      const db_goods = await instance.goodsSales
        .find({ _id: { $in: sale_goods_ids } })
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
      if (queues.length <= 0) {
        const msg = `goods_partiation_queue_stock_update, queues.length <= 0` +
          `\nService: ${service_id}`

        return instance.send_Error(
          `goods_partiation_queue_stock_update
          \nservice_id: ${service_id}`,
          msg,
        )
      }
      for (const good of goods) {
        goods_obj[good.product_id].queue = goods_obj[good.product_id].queue
          ? goods_obj[good.product_id].queue
          : 1

        let queu_index = queues.findIndex(el => el.queue === goods_obj[good.product_id].queue)
        if (queu_index === -1) {
          queu_index = 0
          goods_obj[good.product_id].queue = queues[queu_index].queue;
        }

        if (good && goods_obj[good.product_id]) {
          const suppliers = Array.isArray(goods_obj[good.product_id].suppliers)
            ? goods_obj[good.product_id].suppliers
            : [{
              supplier_id: queues[queu_index].supplier_id,
              supplier_name: queues[queu_index].supplier_name,
              service_id: service._id,
              service_name: service.name,
              stock: 0,
            }]

          let supp_cur_serv_index = suppliers
            .findIndex(elem =>
              elem.service_id + '' == service._id + ''
              && elem.supplier_id + '' == queues[queu_index].supplier_id + ''
            )
          if (supp_cur_serv_index == -1) {
            supp_cur_serv_index = suppliers.length
            suppliers.push({
              supplier_id: queues[queu_index].supplier_id,
              supplier_name: queues[queu_index].supplier_name,
              service_id: service._id,
              service_name: service.name,
              stock: 0,
            })
          }

          if (queues[queu_index].quantity_left <= good.value) {
            const res = await recursiveUpdateGoodSaleQueueDec(
              queues,
              queu_index,
              good,
              0,
              {
                service_id: service._id,
                product_id: good.product_id,
              }
            )

            res.suppliers = getGoodOfSuppliers(suppliers, res.suppliers)

            return await updateGoodsSalesQueueOfSuppliers(good.product_id, res.num_queue, res.suppliers)
          } else {
            suppliers[supp_cur_serv_index].stock -= good.value;

            await updateGoodsSalesQueueOfSuppliers(good.product_id, queues[queu_index].queue, suppliers)

            await updateGoodsSaleQueueQunatityLeft(
              queues[queu_index]._id,
              parseFloat(queues[queu_index].quantity_left) - parseFloat(good.value)
            )
          }
        }
      }
    } catch (err) {
      instance.send_Error(
        `goods_partiation_queue_stock_update
        \nservice_id: ${service_id}`,
        err,
      )
    }
  })

  next()
})
