
const fp = require('fastify-plugin')

function equalPrices(list1, list2) {
    
    if (list1.length != list2.length) {
        return false
    }
    if (list1.length > 0) {
        if (list1[0].from != list2[0].from || list1[0].price != list2[0].price) {
            return false
        }
    }

    if (list1.length > 1) {
        if (list1[1].from != list2[1].from || list1[1].price != list2[1].price) {
            return false
        }
    }

    if (list1.length > 2) {
        if (list1[2].from != list2[2].from || list1[2].price != list2[2].price) {
            return false
        }
    }
    return true
}

module.exports = fp((instance, _, next) => {

    instance.decorate('equalPrices', equalPrices)

    instance.decorate(
        'create_price_change_history',
        async function (user, service_id, product_id, old_price, new_price, date) {
            try {
                if (old_price == new_price) {
                    return
                }
                const service = await instance.services.findById(service_id);
                if (!service) {
                    return
                }
                const item = await instance.goodsSales.findById(product_id);
                if (!item) {
                    return
                }
                await new instance.itemPriceChangeHistory({
                    organization: user.organization,
                    service: service._id,
                    service_name: service.name,
                    date: date,
                    product_id: item._id,
                    product_name: item.name,
                    old_price: old_price,
                    new_price: new_price,
                    employee_id: user._id,
                    employee_name: user.name,
                    type: 'price'
                }).save();
            } catch (error) {
                instance.log.error(error.message)
            }
        }
    )

    instance.decorate(
        'create_prices_change_history',
        async function (user, service_id, product_id, old_prices, new_prices, date) {
            try {
                if (equalPrices(old_prices, new_prices)) {
                    return
                }
                
                const service = await instance.services.findById(service_id);
                if (!service) {
                    return
                }
                const item = await instance.goodsSales.findById(product_id);
                if (!item) {
                    return
                }
                await new instance.itemPriceChangeHistory({
                    organization: user.organization,
                    service: service._id,
                    service_name: service.name,
                    date: date,
                    product_id: item._id,
                    product_name: item.name,
                    old_prices: old_prices,
                    new_prices: new_prices,
                    employee_id: user._id,
                    employee_name: user.name,
                    type: 'prices'
                }).save();
            } catch (error) {
                instance.log.error(error.message)
            }
        }
    )

    next()
})
