
const fp = require('fastify-plugin');

module.exports = fp((instance, _, next) => {

    instance.decorate('create_reminder_history', async (user, reason, number, service_id, id, cost, old_reminder, new_reminder, date) => {
        try {
            const historyModel = {
                organization: user.organization,
                date: date,
                unique: number,
                product_id: id,
                cost: cost,
                service: service_id,
                employee_id: user._id,
                employee_name: user.name,
                reason: reason,
                type: 'box_item',
                adjustment: old_reminder,
                stock_after: new_reminder
            }
            const service = instance.services.findById(service_id);
            if(service) {
                historyModel.service_name = service.name
            }
            const item = instance.goodsSales.findById(id);
            if(item) {
                historyModel.product_name = item.name
            }
            await new instance.inventoryHistory(historyModel).save()
        } catch (error) {
            instance.log.error(error.message)
        }
    })

    next()
})
