const fp = require('fastify-plugin');
const fs = require('fs');

module.exports = fp((instance, options, next) => {
    async function calculateSupplierBalance(supp, service) {
        console.log('calculateSupplierBalance, starting...');
        const query = {
            supplier_id: supp._id,
            status: { $ne: 'pending' },
            service: instance.ObjectId(service),
        };

        const transactions = await instance.supplierTransaction.find(query).lean()

        allSum = 0
        const getFloat = num => isNaN(parseFloat(num)) ? 0 : parseFloat(num)

        const purChase = await instance.inventoryPurchase.find(query).lean();

        for (let i = 0; i < transactions.length; i++) {
            allSum += transactions[i].status == 'pending'
                ? 0
                : getFloat(transactions[i].balance)
        }

        for (const [index, item] of purChase.entries()) {
            // if (!data.find(x => x.document_id == item.p_order)) {
            if (!transactions.find(x => x.document_id == item.p_order) && item.status != 'pending') {
                if (item.type == 'coming')
                    allSum -= getFloat(item.total)
                else if (item.type == 'refund')
                    allSum += getFloat(item.total)
                // else
                //   allSum += getFloat(data[i].balance)
            }
        }

        return allSum;
    }
    const updateGoodsWithPurchase = async (admin, purch) => {
        const pro_ids = purch.items.map(item => item.product_id)

        const goods = await instance.goodsSales
            .find({ _id: { $in: pro_ids } })
            .lean();
        const goodsObj = {}
        for (const p_item of purch.items) {
            goodsObj[p_item.product_id] = p_item
        }

        for (const g of goods) {
            let in_stock = null
            let index = -1
            for (let i = 0; i < g.services.length; i++) {
                if (g.services[i].service + "" == purch.service + "") {
                    in_stock = +g.services[i].in_stock
                    index = i
                }
            }
            if (in_stock != null) {
                // g.services[index].in_stock += (+goodsObj[g._id].to_receive)
                const received = +Math.min(goodsObj[g._id].quality, goodsObj[g._id].ordered)
                g.services[index].in_stock += received
                console.log(received,
                    +in_stock + received);
                await instance.create_inventory_history(
                    admin,
                    'receivedd',
                    purch.p_order,
                    purch.service,
                    g._id,
                    g.cost,
                    received,
                    +in_stock + received,
                    purch.purchase_order_date,
                )
                // await instance.create_inventory_history(admin, 'received', purch.p_order, purch.service, g._id, g.cost, +goodsObj[g._id].to_receive, +in_stock + +goodsObj[g._id].to_receive, new Date().getTime())

                await instance.goodsSales.updateOne({ _id: g._id }, { $set: g })
            }
        }
    }

    const feko_method = async () => {
        console.log('start..');
        const startDate = new Date('07.09.2022')//.toISOString()
        const endDate = new Date('10.09.2022')//.toISOString()
        console.log(startDate, endDate);
        const inv_histories = await instance.inventoryHistory
            .aggregate([
                {
                    $match: {
                        createdAt: {
                            $gte: startDate,
                            $lte: endDate,
                        },
                        $or: [
                            { reason: 'received' },
                            { reason: 'receivedd' },
                        ],
                    },
                },
                // { $limit: 2 },
                {
                    $group: {
                        _id: '$organization',
                        uniques: { $push: '$unique' },
                    }
                },
            ])
            .allowDiskUse(true)
            .exec()
        // .lean()
        console.log(inv_histories.length, 'inv_histories.length');
        // console.log(inv_histories);
        // return inv_histories

        // console.log(inv_histories.map(inv_history => inv_history.unique).length);
        const purchases = []
        for (const inv_history of inv_histories) {
            const purchases2 = await instance.inventoryPurchase
                .find({
                    organization: inv_history._id,
                    createdAt: {
                        $gte: startDate,
                        $lte: endDate,
                    },
                    p_order: { $nin: inv_history.uniques },
                    items: { $gte: { $size: 1 } },
                    $or: [
                        { 'items.quality': { $gt: 0 } },
                        { 'items.ordered': { $gt: 0 } },
                    ]
                    // p_order: { $nin: inv_histories.map(inv_history => inv_history.unique) }
                })
                .lean()

            for (const iterator of purchases2) {
                await updateGoodsWithPurchase(
                    {
                        _id: iterator.ordered_by_id,
                        name: iterator.ordered_by_name,
                        organization: inv_history._id,
                    },
                    iterator,
                )
            }
            purchases.push(...purchases2)
        }
        console.log(purchases.length, 'purchases.length');
        console.log('end..');

        return purchases
    };
    instance.get('/feko/feko', async (request, reply) => {
        reply.ok(await feko_method())
    });
    (async () => {
        console.log('starting...');
        const startDate = new Date('07.09.2022')//.toISOString()
        const endDate = new Date()//.toISOString()
        const inv_histories = await instance.inventoryHistory
            .find(
                {
                    reason: 'receivedd',
                },
            )
            .lean()

        for (const history of inv_histories) {
            const purchase = await instance.inventoryPurchase
                .findOne(
                    {
                        organization: history.organization,
                        p_order: history.unique,
                    },
                    {
                        _id: 1,
                    }
                )
                .lean()
            history.date = purchase._id.getTimestamp().getTime()

            await instance.inventoryHistory.findByIdAndUpdate(
                history._id,
                { date: history.date },
                { lean: true },
            )
        }
        console.log('end...', inv_histories.length);

        return
        const org_inv_histories = await instance.inventoryHistory
            .aggregate([
                {
                    $match: {
                        reason: 'receivedd',
                        // reason: { $in: ['received', 'receivedd'] },
                        // createdAt: {
                        //     $gte: startDate,
                        //     $lte: endDate,
                        // },
                    },
                },
                // {
                //     $sort: '$unique'
                // },
                // { $limit: 10 },
                {
                    $group: {
                        _id: '$organization',
                        histories: {
                            $push: {
                                _id: '$_id',
                                unique: '$unique',
                                date: '$date',
                            }
                        },
                    }
                },
                // {
                //     $project: {
                //         _id: '$_id',
                //         histories: {
                //             $sortArray: {
                //                 input: "$histories",
                //                 sortBy: { "histories.unique": -1 }
                //             },
                //         },
                //     },
                // },
            ])
            .allowDiskUse(true)
            .exec()
        console.log(org_inv_histories.length, 'org_inv_histories.length');
        let changed = 0
        for (const org_inv_history of org_inv_histories) {
            let hours_inc = 0
            let minut = 0
            org_inv_history.histories.sort((a, b) => a.unique > b.unique ? 1 : -1)
            // let i = 1
            for (const inv_history of org_inv_history.histories) {
                // const inv_date = new Date(inv_history._id.getTimestamp())
                // const inv_date = new Date(inv_history.date)
                // if (inv_date.getHours() === 0 || inv_date.getHours() === 5) {
                // inv_date.setHours(9 + hours_inc)
                // inv_date.setMinutes(minut)
                // inv_history.date = inv_date.getTime();
                // inv_history.date = inv_history._id.getTimestamp().getTime()

                // hours_inc += parseInt(11 * (i / org_inv_history.histories.length))
                // minut += parseInt(50 * (i / org_inv_history.histories.length))
                changed++
                // i++
                await instance.inventoryHistory.findByIdAndUpdate(
                    inv_history._id,
                    { date: inv_history.date },
                    { lean: true },
                )
                // }
            }
        }
        console.log('end...', changed);
    })();
    //update goods negative cost
    (async () => {
        console.log('start update goods...');
        const goods = await instance.goodsSales.find(
            {
                cost: {
                    $lt: 0
                }
            },
            { cost: 1 },
        )
            .lean()
        console.log('goods.length', goods.length);

        for (const good of goods) {
            good.cost = Math.abs(good.cost == Infinity ? 0 : good.cost)
            await instance.goodsSales.findByIdAndUpdate(good._id, good)
        }
        console.log('update goods end...');
    });

    (async () => {
        console.log('starting...');
        const organizations = await instance.organizations
            .find({})
            .lean()

        for (const organization of organizations) {
            const services = await instance.services
                .find({
                    organization: organization._id + ''
                })
                .lean()

            const suppliers = await instance.adjustmentSupplier
                .find({ organization: organization._id + '' })
                .lean()
            for (const service of services) {
                for (const supp of suppliers) {
                    const balance = await calculateSupplierBalance(supp, service).catch(err => {
                        console.log(err, 'err');
                    })
                    console.log(supp._id, service._id, balance);
                    if (!isNaN(balance)) {
                        if (!(supp.services && supp.services.length)) {
                            supp.services = [{
                                service: service._id,
                                service_name: service.name,
                                balance: balance,
                                balance_usd: 0,
                                balance_currency: 'uzs',
                                available: true,
                                telegram_acces: false,
                            }]
                        }
                        const service_index = supp.services
                            .findIndex(serv => serv.service + '' == service._id + '')

                        if (service_index == -1)
                            supp.services.push({
                                service: service._id,
                                service_name: service.name,
                                balance: balance,
                                balance_usd: 0,
                                balance_currency: 'uzs',
                                available: true,
                                telegram_acces: false,
                            })
                        else {
                            supp.services[service_index].balance = balance;
                        }

                        await instance.adjustmentSupplier.findByIdAndUpdate(supp._id, supp, { lean: true })
                    }
                }
            }
        }
        console.log('end...');
    });

    // (async () => {
    //     const transactions = await instance.supplierTransaction.find(
    //         {
    //             $and: [
    //                 { purchase_id: { $exists: true } },
    //                 {
    //                     $or: [
    //                         { service: { $exists: false } },
    //                         { service_name: { $exists: false } },
    //                     ]
    //                 },
    //             ]
    //         },
    //         { _id: 1, service: 1, service_name: 1, supplier_id: 1, purchase_id: 1 },
    //     ).lean()
    //     console.log(transactions.length);
    //     const start_time = new Date().getTime()

    //     for (const tran of transactions) {
    //         // if (tran.purchase_id) {
    //         // console.log(tran.purchase_id, tran.service, tran.service_name, 'service service_name');
    //         const purchase = await instance
    //             .inventoryPurchase
    //             .findById(tran.purchase_id)
    //             .lean()

    //         // const supplier = await instance.adjustmentSupplier
    //         //     .findById(tran.supplier_id, { organization: 1 })
    //         //     .lean()

    //         if (purchase && purchase.service && !purchase.service_name) {
    //             const service = await instance.services.findById(purchase.service, { _id: 1, name: 1 }).lean()
    //             if (service) {
    //                 tran.service = tran.service ? tran.service : service._id;
    //                 tran.service_name = tran.service_name ? tran.service_name : service.service_name;

    //                 await instance.supplierTransaction.findByIdAndUpdate(
    //                     tran._id,
    //                     { $set: { service_name: tran.service_name } }
    //                 )
    //             }
    //         }
    //         if (purchase && purchase.organization && purchase.service && purchase.service_name) {
    //             tran.service = tran.service ? tran.service : purchase.service;
    //             tran.service_name = tran.service_name ? tran.service_name : purchase.service_name;

    //             await instance.supplierTransaction.findByIdAndUpdate(
    //                 tran._id,
    //                 { $set: { service_name: tran.service_name } }
    //             )
    //         }
    //         // }
    //     }
    //     const end_time = new Date().getTime()
    //     console.log('ketgan vaqt', end_time - start_time);
    // })
    // trim feko barcodes    
    // (async () => {
    //     const items = await instance.goodsSales.find(
    //         {
    //             $or: [
    //                 { barcode: { $elemMatch: { $regex: / $/, $options: 'i' } } },
    //                 { barcode: { $elemMatch: { $regex: /^ /, $options: 'i' } } },
    //             ]
    //         },
    //         { barcode: 1 },
    //     )
    //         .lean()
    //     for (const item of items) {
    //         item.barcode = item.barcode.map(b => b.trim())
    //         await instance.goodsSales.findByIdAndUpdate(item._id, { $set: item })
    //     }
    //     console.log('end');
    // })
    instance.get('/get/tiin/check-prices', async (request, reply) => {
        const update = request.query.update
        const size = !isNaN(request.query.size) ? parseInt(request.query.size) : 1

        const match = {
            $match: {
                organization: "5f5641e8dce4e706c062837a",
                // show_on_bot: true
            }
        }
        const unwindServices = {
            $unwind: '$services'
        }

        const project = {
            $project: {
                name: 1,
                barcode: 1,
                sku: 1,
                services: 1,
                service_prices_size: {
                    $cond: {
                        if: {
                            $isArray: "$services.prices"
                        },
                        then: { $size: "$services.prices" },
                        else: 0
                    }
                }
            }
        }

        const match_prices_size = {
            $match: {
                service_prices_size: { $eq: size }
            }
        }

        const aggregate = [match, unwindServices, project, match_prices_size,]

        const goods = await instance.goodsSales.aggregate(aggregate)
        // if (update === 'yes') {
        //     // const err_goods = goods.map(g => g._id)
        //     for (const good of goods) {

        //         await instance.goodsSales.findOneAndUpdate(
        //             {
        //                 _id: good._id,
        //                 services: {
        //                     $elemMatch: {
        //                         service: good.services.service,
        //                     },
        //                 },
        //             },
        //             { $set: { 'services.$.prices': [] } },
        //             { lean: true },
        //         )
        //     }
        //     return reply.ok(goods)
        // }
        reply.ok(goods)
    })
    instance.get('/get/tiin/check-services', async (request, reply) => {
        const update = request.query.update

        const match = {
            $match: {
                organization: "5f5641e8dce4e706c062837a",
                // show_on_bot: true
            }
        }
        const unwindServices = {
            $unwind: '$services'
        }

        const project = {
            $project: {
                name: 1,
                barcode: 1,
                sku: 1,
                services: 1,
                services_size: {
                    $cond: {
                        if: {
                            $isArray: "$services"
                        },
                        then: { $size: "$services" },
                        else: 0
                    }
                }
            }
        }

        const match_prices_size = {
            $match: {
                services_size: { $lte: 1 }
            }
        }

        const aggregate = [match, project, match_prices_size,]
        const goods = await instance.goodsSales.aggregate(aggregate)
        if (update === 'yes') {
            const err_goods = goods.map(g => g._id)
            for (const good of goods) {
                const services = Array.isArray(good.services)
                    ? [{ ...good.services[0] }]
                    : []
                if (
                    good.services.length === 1 &&
                    good.services[0].service + '' === '5f5641e8dce4e706c0628380' ||
                    good.services[0].service + '' === '62e2c8a4612608fcff4cac39'
                ) {
                    services.push({
                        service: good.services[0].service + '' === '62e2c8a4612608fcff4cac39'
                            ? instance.ObjectId('5f5641e8dce4e706c0628380')
                            : instance.ObjectId('62e2c8a4612608fcff4cac39'),
                        service_id: good.services[0].service + '' === '62e2c8a4612608fcff4cac39'
                            ? instance.ObjectId('5f5641e8dce4e706c0628380')
                            : instance.ObjectId('62e2c8a4612608fcff4cac39'),
                        service_name: good.services[0].service + '' === '62e2c8a4612608fcff4cac39'
                            ? 'Tiin Market (Sayram)'
                            : 'Tiin Market (Anjir)',
                        price: good.services[0].price,
                        is_price_change: good.services[0].is_price_change,
                        price_currency: good.services[0].price_currency,
                        price_auto_fill: good.services[0].price_auto_fill,
                        prices: good.services[0].prices,
                        in_stock: good.services[0].in_stock,
                        low_stock: good.services[0].low_stock,
                        optimal_stock: good.services[0].optimal_stock,
                        reminder: good.services[0].reminder,
                        variant_name: good.services[0].variant_name,
                        available: good.services[0].available,
                        stopped_item: good.services[0].stopped_item,
                        sku: good.sku,
                        printed_time: good.services[0].printed_time,
                        printed_price_change_time: good.services[0].printed_price_change_time,
                        top_sale: 0,
                    })
                    good.services = services
                }
                await instance.goodsSales.findByIdAndUpdate(
                    good._id,
                    { $set: { services: services } },
                    { lean: true },
                )
            }
            return reply.ok(goods)
        }
        reply.ok(goods)
    })
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

    instance.get('/items/inv_history', async (request, reply) => {
        const { from, to, organization } = request.query

        const $match = {
            $match: {
                organization: organization,
                // reason: 'sold',
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
                _id: { _id: '$product_id', reason: '$reason' },
                // type: { $first: '$type' },
                // date: { $first: '$date' },
                // category_id: { $first: '$category_id' },
                // category_name: { $first: '$category_name' },
                product_name: { $first: '$product_name' },
                // reason: { $first: '$reason' },
                adjustment: {
                    $sum: '$adjustment',
                }
            }
        }

        const $project = {
            $project: {
                _id: '$_id._id',
                reason: '$_id.reason',
                product_name: 1,
                adjustment: 1,
            }
        }
        const getCond = (name) => {
            return {
                $sum: {
                    $cond: [
                        { $eq: ['$reason', name] },
                        '$adjustment',
                        0
                    ]
                }
            }
        }

        const $group2 = {
            $group: {
                _id: '$_id',
                product_name: { $first: '$product_name' },
                sold: getCond('sold'),
                returned: getCond('returned'),
                received: getCond('received'),
                returned_order: getCond('returned_order'),
                transferred: getCond('transferred'),
                recounted: getCond('recounted'),
                damaged: getCond('damaged'),
                lost: getCond('lost'),
                production: getCond('production'),
                workgroup_order: getCond('workgroup_order'),
                fee: getCond('fee'),
                loss: getCond('loss'),
                item_edit: getCond('item edit'),
            }
        }
        const aggregate = [$match, $group, $project, $group2]

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

        const aggregate = [$match, $project]

        const goods = await instance.goodsSales.aggregate(aggregate).exec()

        reply.ok(goods)
    })

    instance.post('/feko/test/method', async (request, reply) => {

        const aggregate =
            [
                {
                    '$match': {
                        'organization': '5f5641e8dce4e706c062837a'
                    }
                }, {
                    '$unwind': '$services'
                }, {
                    '$group': {
                        '_id': '$_id',
                        'prices': {
                            '$push': '$services.prices'
                        },
                        'name': {
                            '$first': '$name'
                        },
                        'sku': {
                            '$first': '$sku'
                        },
                        'barcode': {
                            '$first': '$barcode'
                        }
                    }
                }, {
                    '$project': {
                        'prices': 1,
                        'prices_filter': {
                            '$function': {
                                'body': 'function(prices) {\n            let i = 0\n            for(const price of prices[0]) {\n             const fin_d = prices[1].find(p => p.from === price.from && p.price === price.price)\n              i = fin_d ? i + 1 : i\n            }\n            return prices[0].length === i ? [] : prices\n            return prices.filter((v, i, a) => a.indexOf(v) === i) \n\n                      }',
                                'args': [
                                    '$prices'
                                ],
                                'lang': 'js'
                            }
                        },
                        'prices_count': {
                            '$size': {
                                '$function': {
                                    'body': 'function(prices) {\n            let i = 0\n            for(const price of prices[0]) {\n             const fin_d = prices[1].find(p => p.from === price.from && p.price === price.price)\n              i = fin_d ? i + 1 : i\n            }\n            return prices[0].length === i ? [] : prices\n            return prices.filter((v, i, a) => a.indexOf(v) === i) \n\n                      }',
                                    'args': [
                                        '$prices'
                                    ],
                                    'lang': 'js'
                                }
                            }
                        },
                        'name': 1,
                        'sku': 1,
                        'barcode': 1
                    }
                }, {
                    '$match': {
                        'prices_count': {
                            '$gte': 1
                        }
                    }
                }, {
                    '$group': {
                        '_id': null,
                        'count': {
                            '$sum': 1
                        },
                        'items': {
                            '$push': {
                                'prices': '$prices',
                                'name': '$name',
                                'sku': '$sku',
                                'barcode': '$barcode',
                                'prices_count': '$prices_count'
                            }
                        }
                    }
                }
            ]
        const data = await instance.goodsSales.aggregate(aggregate).exec()

        reply.ok(data)
    })

    next()
})