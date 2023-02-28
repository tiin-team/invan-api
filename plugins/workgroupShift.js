const fp = require('fastify-plugin')

module.exports = fp((instance, _, next) => {

  instance.decorate('createWorkgroupShift', async function(id, workgroup_order) {
    try {
      const shiftData = {
        organization: workgroup_order.organization,
        service: workgroup_order.service,
        workgroup_order_id: id,
        by_whom_name: workgroup_order.createdByName,
        pos: 'workgroup_order',
        pos_id: 'workgroup_order',
        opening_time: new Date().getTime(),
        cash_drawer: {
          starting_cash: 0,
          cash_payment: 0,
          inkassa: 0,
          cash_refund: 0,
          paid_in: 0,
          paid_out: 0,
          exp_cash_amount: 0,
          act_cash_amount: 0,
          withdrawal: 0,
          difference: 0
        }
      }
      return await new instance.Shifts(shiftData).save();
    } catch (error) {
      instance.log.error(error.message)
      return null
    }
  })

  next()
})
