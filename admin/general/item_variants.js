const fp = require('fastify-plugin')

module.exports = fp((instance, _, next) => {

    instance.decorate('calculateInStockItemVariants', async (ids, service) => {
        let in_stock = 0
        try {
            const variants = await instance.goodsSales.find({ _id: { $in: ids } })
            for (let i = 0; i < variants.length; i++) {
                if (typeof variants[i].services == typeof []) {
                    for (const s of variants[i].services) {
                        if (service != '' && s.service + '' == service) {
                            in_stock += s.in_stock ? s.in_stock : 0
                        }
                        else if(service == '') {
                            in_stock += s.in_stock ? s.in_stock : 0
                        }
                    }
                }
            }
            return in_stock
        }
        catch (error) {
            console.log(error.message)
            return 0
        }
    })

    instance.decorate('calculateReminderItemVariants', async (ids, service) => {
        let reminder = 0;
        try {
            const variants = await instance.goodsSales.find({ _id: { $in: ids } })
            for (let i = 0; i < variants.length; i++) {
                if (typeof variants[i].services == typeof []) {
                    for (const s of variants[i].services) {
                        if (service != '' && s.service + '' == service) {
                            reminder += s.reminder ? s.reminder : 0
                        }
                        else if(service == '') {
                            reminder += s.reminder ? s.reminder : 0
                        }
                    }
                }
            }
            return reminder;
        }
        catch (err) {
            return 0
        }
    })

    next()
})