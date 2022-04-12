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
                updatedAt: { $exists: true },
            }
        }

        const aggregate = [$match]

        const goods = await instance.goodsSales.aggregate(aggregate).exec()

        reply.ok(goods)
    })
    next()
})