const fp = require('fastify-plugin');

module.exports = fp((instance, options, next) => {
    (async () => {
        const start_time = new Date().getTime()
        const accesses = await instance.AccessRights.find({}).lean();
        for (const access of accesses) {

            access.create = true
            access.create_purchase = true
            access.create_taxes = true
            access.create_store = true
            access.create_pos_device = true
            access.create_customer = true
            access.create_employee = true
            access.create_access = true
            access.create_time_card = true
            access.create_transfer = true
            access.create_stock_adjustmen = true
            access.create_inv_count = true
            access.create_production = true
            access.create_supplier = true
            access.create_supplier_create_doc = true
            access.create_fee = true
            access.create_good_sale = true
            access.create_good_category = true
            access.create_modifier = true
            access.create_discount = true
            access.create_reciept = true

            await instance.AccessRights.findByIdAndUpdate(
                access._id,
                access,
                { lean: true },
            )
        }
        console.log('time:', new Date().getTime() - start_time);
        console.log('ok');
    })()
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
            $project: {
                _id: 1,
                stopped_item: 1,
                created_time: 1,
                last_updated: 1,
                last_stock_updated: 1,
                last_price_change: 1,
                name: 1,
                sku: 1,
                in_stock: 1,
                low_stock: 1,
                primary_supplier_name: 1,
                updatedAt: 1
            }
        }
        if (request.query.services) $project.$project.services = 1
        if (request.query.sale_is_avialable) $project.$project.sale_is_avialable = 1
        if (request.query.expire_date) $project.$project.expire_date = 1
        if (request.query.optimal_stock) $project.$project.optimal_stock = 1
        if (request.query.primary_supplier_id) $project.$project.primary_supplier_id = 1
        if (request.query.show_on_bot) $project.$project.show_on_bot = 1
        console.log($project);
        const aggregate = [$match, $project]

        const goods = await instance.goodsSales.aggregate(aggregate).exec()

        reply.ok(goods)
    })
    next()
})