const fp = require('fastify-plugin')

module.exports = fp((instance, _, next) => {
  /**
  * Postavchikdan kelgan tovarni refund qilish
  * @param receipt_id - check _id si
  * @param sold_list - sold_list vozvrat qilingan tovarlar
  * @param service_id - filial _id si
  */

  instance.decorate('update_queue_sold_item_refund', async (receipt_id, sold_list, service_id) => {
    try {
      const receipt = await instance.Receipts.findById(receipt_id).lean();
      instance.send_Error(`update_queue_sold_item_refund, chek topilmadi.
      \nreceipt_id: ${receipt_id}
      \service_id: ${service_id}
      \nchek: ${receipt}
      `)
      if (!receipt) return;
      const soldObj = {}
      const ids = []

      for (const s of sold_list) {
        if (s.sold_item_id != undefined && s.sold_item_id != '') {
          if (s.reset_count === '' || s.reset_count === undefined) {
            s.reset_count = 0
          }
          if (typeof s.returned_reminder != 'number') {
            s.returned_reminder = 0;
          }

          if (!soldObj[s.sold_item_id]) {
            ids.push(s.sold_item_id)
            soldObj[s.sold_item_id] = {
              reset_count: s.value,
              returned_reminder: 0
            }
            if (['box_item', 'pcs_item'].includes(s.sold_item_type)) {
              if (!soldObj[s.sold_item_id].returned_reminder) {
                soldObj[s.sold_item_id].returned_reminder = 0;
              }
              soldObj[s.sold_item_id].returned_reminder = s.reminder
              if (
                soldObj[s.sold_item_id].returned_reminder > s.count_by_type
              ) {
                soldObj[s.sold_item_id].returned_reminder -= s.count_by_type;
                soldObj[s.sold_item_id].reset_count += 1;
              }
            }
          }
          else {
            soldObj[s.sold_item_id].reset_count += s.value;

            if (['box_item', 'pcs_item'].includes(s.sold_item_type)) {
              soldObj[s.sold_item_id].returned_reminder += s.reminder;
              if (
                soldObj[s.sold_item_id].returned_reminder > s.count_by_type
              ) {
                soldObj[s.sold_item_id].returned_reminder -= s.count_by_type;
                soldObj[s.sold_item_id].reset_count += 1;
              }
            }
          }
        }
      }

      // const sold_item_list = []
      for (const sold_item of receipt.sold_item_list) {
        if (sold_item != null) {
          if (soldObj[sold_item._id] != null) {
            if (!sold_item.reset_count) {
              sold_item.reset_count = 0;
            }

            sold_item.reset_count += soldObj[sold_item._id].reset_count
            if (['box_item', 'pcs_item'].includes(sold_item.sold_item_type)) {
              if (!sold_item.returned_reminder) {
                sold_item.returned_reminder = 0;
              }
              sold_item.returned_reminder += soldObj[sold_item._id].returned_reminder;
              if (sold_item.returned_reminder > sold_item.count_by_type) {
                sold_item.returned_reminder -= sold_item.count_by_type;
              }
            }
          }
        }
        const queue = await instance.goodsSaleQueue
          .findOne({
            service_id: service_id,
            good_id: sold_item.product_id,
            quantity_left: { $ne: 0 },
          })
          .sort({ queue: 1 })
          .lean()

        if (queue)
          await instance.goodsSaleQueue.findByIdAndUpdate(
            queue._id,
            { quantity_left: queue.quantity_left + sold_item.value },
            { new: true, lean: true },
          )
        else {
          instance.send_Error(`update_queue_sold_item_refund, partiya topilmadi.
          \nreceipt_id: ${sold_item.receipt_id}
          \nproduct_id: ${sold_item.product_id}
          \nvalue: ${sold_item.value}
          `)
        }
      }
    } catch (error) {
      instance.send_Error('update_queue_sold_item_refund', error)
    }
  })

  next()
})