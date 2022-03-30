const fp = require('fastify-plugin')

module.exports = fp((instance, _, next) => {

  instance.decorate('createWorkgroupReceipt', async function (id, workgroup_order) {
    try {
      const sold_item_list = []
      for(const item of workgroup_order.items) {
        let category = {}
        let supplier = {}
        let parent_name = ''
        let cost = 0;
        let barcode = '';

        try {
          const good = await instance.goodsSales.findById(item.product_id)
          parent_name = good.parent_name
          cost = good.cost
          barcode = good.barcode ? good.barcode[0] : ''
          try {
            const categ = await instance.goodsCategory.findById(good.category)
            category = {
              _id: categ._id,
              name: categ.name
            }
          } catch (error) {}

          try {
            const supp = await instance.adjustmentSupplier.findById(good.primary_supplier_id);
            supplier = {
              name: supp.supplier_name,
              _id: supp._id
            }
          } catch (error) {}
        } catch (error) {}

        sold_item_list.push({
          product_id: item.product_id,
          product_name: item.product_name,
          category_id: category._id,
          category_name: category.name,
          supplier_id: supplier._id,
          supplier_name: supplier.name,
          parent_name: parent_name,
          cost: cost,
          price: item.cost,
          value: item.quantity,
          barcode: barcode
        })
      }

      const receiptData = {
        organization: workgroup_order.organization,
        service: workgroup_order.service,
        workgroup_order_id: id,
        created_time: new Date().getTime(),
        receipt_no: 'W1',
        total_price: workgroup_order.total_cost,
        cashier_id: workgroup_order.createdBy,
        pos_id: 'workgroup_order',
        pos_name: 'workgroup_order',
        date: new Date().getTime(),
        payment: [
          {
            name: 'cash',
            value: workgroup_order.total_cost
          }
        ],
        user_id: workgroup_order.client_unique_id,
        point_balance: 0,
        sold_item_list: sold_item_list
      }
      await new instance.Receipts(receiptData).save()

      const shift = await instance.Shifts.findOne({workgroup_order_id: id});
      if(!shift) {
        instance.log.error('Shift not found')
        return
      }
      await instance.Shifts.updateOne(
        {
          _id: shift
        },
        {
          $inc: {
            'cash_drawer.cash_payment': receiptData.total_price > 0 ? receiptData.total_price : 0,
            'cash_drawer.cash_refund': receiptData.total_price < 0 ? receiptData.total_price : 0,
            'cash_drawer.exp_cash_amount': receiptData.total_price,
            'cash_drawer.act_cash_amount': receiptData.total_price,
            
          },
          $set: {
            closing_time: new Date().getTime()
          }
        }
      )
    } catch (error) {
      instance.log.error(error.message)
    }
  })

  next()
})
