const fp = require('fastify-plugin');

module.exports = fp((instance, options, next) => {
    instance.get('/get/tiin/transaction/dublicat/:organization/:service', async (request, reply) => {
        const data = await instance.services.aggregate([
            {
                $match: { _id: instance.ObjectId(request.params.service) }
            },
            { $limit: 1 },
            {
                $lookup: {
                    from: 'adjustmentsuppliers',
                    let: { service: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                organization: request.params.organization,
                            },
                        },
                        {
                            $group: {
                                _id: null,
                                ids: { $push: '$_id' }
                            },
                        },
                    ],
                    as: 'supplier_ids'
                }
            },
            {
                $project: {
                    name: 1,
                    supplier_ids: { $first: '$supplier_ids.ids' },
                    // transactions: 1,
                    // employees_ids: 1,
                }
            },
            {
                $lookup: {
                    from: 'suppliertransactions',
                    let: { service: '$_id', supplier_ids: '$supplier_ids' },
                    pipeline: [
                        // {
                        //     $match: {
                        //         service: { $exists: true },
                        //     },
                        // },
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        {
                                            $in: [
                                                '$supplier_id', '$$supplier_ids'
                                                // '$$service',
                                                //     { $toString: '$service' },
                                            ]
                                        },
                                        { $ne: ['$status', 'pending'] },
                                    ]
                                },
                            },
                        },
                        {
                            $project: {
                                service: 1,
                                service_name: 1,
                                date: 1,
                                employee_name: 1,
                                status: 1,
                                document_id: 1,
                                balance: 1,
                                document_id: 1,
                                supplier_id: 1,
                                purchase_id: 1,
                            },
                        },
                    ],
                    as: 'transactions'
                },
            },
            {
                $project: {
                    name: 1,
                    employees_id: { $first: '$supplier_ids.ids' },
                    transactions: 1,
                    // employees_ids: 1,
                }
            }
        ])

        return reply.ok(data[0])
    })
    instance.get('/get/tiin/inv_puchase/dublicat/:organization/:service', async (request, reply) => {
        const transactions = await instance.inventoryPurchase
            .aggregate([
                {
                    $match: {
                        organization: request.params.organization,
                        $or: {
                            service: request.params.service,
                            service: instance.ObjectId(request.params.service),
                        },
                        status: { $ne: 'pending' },
                    }
                },
                // { service: instance.ObjectId(request.params.service) },
            ])
            .exec()
        return reply.ok(transactions)
    });
    (async () => {
        const start_time = new Date().getTime()
        const accesses = await instance.AccessRights.find({ name: 'boss' }).lean();
        for (const access of accesses) {
            access.item_mark = true
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