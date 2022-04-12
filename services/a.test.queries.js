const fp = require('fastify-plugin');

module.exports = fp((instance, options, next) => {
    instance.get('/items/inv_history', async (request, reply) => {

        const { from, to } = request.query

        const $match = {
            $match: {
                organization: '5f5641e8dce4e706c062837a',
                reason: 'sold',
            }
        }
        const date = {};
        if (from) {
            date.$gte = parseInt(from)
            $match.$match.date = date
        }
        if (to) {
            date.$lte = parseInt(to)
            $match.$match.date = date
        }

        const $group = {
            $group: {
                _id: '$product_id',
                type: { $first: '$type' },
                date: { $first: '$date' },
                category_id: { $first: '$category_id' },
                category_name: { $first: '$category_name' },
                product_name: { $first: '$product_name' },
                reason: { $first: '$reason' },
            }
        }

        const aggregate = [$match, $group]

        const goods = await instance.inventoryHistory.aggregate(aggregate).exec()

        reply.ok(goods)
    })
    instance.get('/items/unchange', async (request, reply) => {

        const $match = {
            $match: {
                organization: '5f5641e8dce4e706c062837a',
                updatedAt: { $exists: false },
            }
        }

        const $project = {
            stopped_item: request.query.stopped_item ? 1 : 0,
            services: request.query.services ? 1 : 0,
            created_time: request.query.created_time ? 1 : 0,
            last_updated: request.query.last_updated ? 1 : 0,
            last_stock_updated: request.query.last_stock_updated ? 1 : 0,
            last_price_change: request.query.last_price_change ? 1 : 0,
            name: request.query.name ? 1 : 0,
            sale_is_avialable: request.query.sale_is_avialable ? 1 : 0,
            expire_date: request.query.expire_date ? 1 : 0,
            sku: request.query.sku ? 1 : 0,
            in_stock: request.query.in_stock ? 1 : 0,
            low_stock: request.query.low_stock ? 1 : 0,
            optimal_stock: request.query.optimal_stock ? 1 : 0,
            primary_supplier_id: request.query.primary_supplier_id ? 1 : 0,
            primary_supplier_name: request.query.primary_supplier_name ? 1 : 0,
            show_on_bot: request.query.show_on_bot ? 1 : 0,
        }

        const aggregate = [$match, $project]

        const goods = await instance.goodsSales.aggregate(aggregate).exec()

        reply.ok(goods)
    })
    next()
})