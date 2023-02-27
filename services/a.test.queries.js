const fp = require('fastify-plugin');
const fs = require('fs');
const { insertInvHistory } = require('../clickhouse/insert_inv_history');

module.exports = fp((instance, options, next) => {


    /**
     * 
     * @param {[{
     * name: string
     * product_id: string
     * receipt_no: string
     * category_id: string
     * category_name: string
     * cost: number
     * employee_id: string
     * employee_name: string
     * value: number
     * stock_after: number
     * }]} items 
     * @param {number} date
     */
    const create_inventory_history = async (items, date) => {

        const histories = []
        for (const item of items) {

            histories.push({
                organization: '5f5641e8dce4e706c062837a',
                date: date,
                unique: item.receipt_no,
                category_id: item.category_id,
                category_name: item.category_name,
                product_id: item.product_id,
                product_name: item.name,
                cost: item.cost,
                service: instance.ObjectId('5f5641e8dce4e706c0628380'),
                service_name: 'Tiin Market (Sayram)',
                employee_id: item.employee_id,
                employee_name: item.employee_name,
                reason: 'reason',
                adjustment: item.value,
                stock_after: item.stock_after,
            })
        }

        // const history_model = new instance.inventoryHistory(new_history)
        // instance.log.info(`Saved history id -> ${id}`);

        await insertInvHistory(instance, histories)
    }

    const fekoReceipts = async () => {
        const receipts = await instance.Receipts
            .find(
                {
                    organization: '5f5641e8dce4e706c062837a',
                    service: '5f5641e8dce4e706c062837a',
                },
                {
                    receipt_no: 1,
                    pos_name: 1,
                    service: 1,
                    pos_id: 1,
                    sold_item_list: 1,
                },
            )
            .lean()

        const posDevices = await instance.posDevices
            .find(
                {
                    organization: '5f5641e8dce4e706c062837a',
                    service: '5f5641e8dce4e706c0628380',
                },
                {
                    check_id: 1,
                    name: 1,
                },
            )
            .lean()

        const posDevicesObj = {}

        for (const posDevice of posDevices) {
            posDevicesObj[posDevice.check_id] = posDevice
        }

        const update_receipts = []
        for (const receipt of receipts) {
            if (rr.is_refund) {
                await instance.update_queue_sold_item_refund(receipt._id, receipt.sold_item_list, '5f5641e8dce4e706c0628380')
            } else {
                await instance.goods_partiation_sale(receipt.sold_item_list, '5f5641e8dce4e706c0628380', false)
            }

            for (const s_i of receipt.sold_item_list) {
                await instance.update_in_stock_of_sold_items(
                    s_i.product_id,
                    '5f5641e8dce4e706c0628380',
                    s_i.value,
                    user,
                    receipt,
                    'other',
                    null,
                    sold_by_types[r],
                )
            }


            if (receipt.receipt_no[0] == 'E') {
                const pos = posDevices.filter(p => p.check_id == receipt.receipt_no[0])
                pos_id = pos[0]._id
                if (parseInt(receipt.receipt_no.slice(1)) > 444)
                    pos_id = '6390e675c70a07ff397e1469'
                else
                    pos_id = '6391ad4265dc92b8be3cee09'

                update_receipts.push({
                    updateOne: {
                        filter: { _id: receipt._id },
                        update: {
                            $set: {
                                service: '5f5641e8dce4e706c0628380',
                                pos_id: pos_id,
                            }
                        }
                    }
                })
            } else {
                update_receipts.push({
                    updateOne: {
                        filter: { _id: receipt._id },
                        update: {
                            $set: {
                                service: '5f5641e8dce4e706c0628380',
                                pos_id: posDevicesObj[receipt.receipt_no[0]],
                            }
                        }
                    }
                })
            }
        }
    }

    /**
     * 
     * @param {string} organization_id 
     */
    const insertCustomerDebpPayHistoryByOrganizationId = async (organization_id) => {
        const customers = await instance.clientsDatabase
            .find({ organization: organization_id })
            .lean();

        const insertClientDeptPayHistories = []
        for (const client of customers) {
            if (Array.isArray(client.debt_pay_history)) {
                const dept_pay_histories = client.debt_pay_history.filter(dph =>
                    dph.comment != 'receipt sold' &&
                    dph.comment != 'receipt refund' &&
                    (dph.amount_type == 'cash' || dph.amount_type == 'card')
                )

                for (const dept_pay_history of dept_pay_histories) {
                    insertClientDeptPayHistories.push({
                        organization: client.organization,
                        client_id: client._id,
                        client_name: client.first_name,
                        paid: dept_pay_history.paid,
                        date: dept_pay_history.date,
                        comment: dept_pay_history.comment,
                        created_by_name: dept_pay_history.by_name,
                        // created_by_id,
                    })
                }
            }
        }
        if (insertClientDeptPayHistories.length > 0) {
            await instance.clientsDebtPayHistory.insertMany(insertClientDeptPayHistories, (err, deptPayHistories) => {
                if (err || deptPayHistories == null) {
                    console.log(`err: ${err}. deptPayHistories.length: ${deptPayHistories.length}`);
                }
            });
        }
    }

    /**
     * 
     * @param {string} organization_id 
     */
    const updateCustomerReceipts = async (organization_id) => {
        console.log('starting...');
        const start_time = new Date().getTime()
        const customers = await instance.clientsDatabase
            .find({ organization: organization_id })
            .lean();
        console.log(`clientlarni olish uchun ketgan vaqt: ${new Date().getTime() - start_time}`);

        // return
        const customersObj = {}
        for (const client of customers) {
            customersObj[client.user_id] = client
        }

        console.log('getting receipts...');
        const customer_ids = customers.map(c => c.user_id).filter(user_id => user_id != undefined && user_id != '')
        // console.log(`customer_ids: ${customer_ids}`);
        console.log(`customer_ids.length: ${customer_ids.length}`);
        const receipts = await instance.Receipts.find(
            {
                organization: organization_id,
                user_id: { $in: customer_ids }
            },
            {
                organization: 1,
                user_id: 1,
            },
        )
            .lean()
        console.log(`receiptlarni olish uchun ketgan vaqt: ${new Date().getTime() - start_time}`);

        console.log(`receipts.length: ${receipts.length}`);
        const update_receipts = []
        const not_found_customers = []
        for (const receipt of receipts) {
            const customer = customersObj[receipt.user_id]
            if (!customer) {
                not_found_customers.push(receipt.user_id)
            } else
                update_receipts.push({
                    updateOne: {
                        filter: { _id: receipt._id },
                        update: { $set: { client_id: customer._id } }
                    }
                })
        }
        console.log('not_found_customers', not_found_customers, 'not_found_customers');
        await instance.Receipts.bulkWrite(update_receipts, (err) => {
            console.log('error on bulkWrite', err);
        })
    }

    const insertCustomerDebpPayHistory = async () => {
        const organizations = await instance.organizations
            .find(
                {
                    _id: '60714ce251f0215b15112f56'
                },
                { _id: 1 },
            )
            .lean()
        console.log(organizations.length, 'organizations.length');

        for (const org of organizations) {
            await updateCustomerReceipts(org._id)
            await insertCustomerDebpPayHistoryByOrganizationId(org._id)
        }
    }

    /**
     * 
     * @param {string} organization_id 
     */
    const updateGoodsOtchotCreatedTimeByOrganization = async (organization_id) => {
        const start_time = new Date().getTime()
        console.log('starting...');
        const otchots = await instance.goodsOtchot
            .find(
                {
                    organization: organization_id,
                    month_name: { $in: ['December', 'January'], },
                    // month_name: { $in: ['January'], },
                },
                { _id: 1, product_id: 1 },
            )
            .lean()
        console.log(`otchotlarni olish uchun ketgan vaqt: ${new Date().getTime() - start_time}`);
        const goods = []
        const step = 100000
        for (let i = 0; i < otchots.length; i = i + step) {

            const pgoods = await instance.goodsSales
                .find(
                    {
                        // organization: organization_id,
                        _id: { $in: otchots.slice(i, i + step).map(o => o.product_id) },
                    },
                    { organization: 1 },
                )
                .lean()

            goods.push(...pgoods)
        }
        console.log('goods.length', goods.length);
        const goodsObj = {}
        for (const good of goods) {
            goodsObj[good._id + ''] = good
        }
        let update_otchots = []
        for (const otchot of otchots) {

            if (goodsObj[otchot.product_id + ''])
                update_otchots.push({
                    updateOne: {
                        filter: { _id: otchot._id },
                        update: {
                            $set: {
                                organization: goodsObj[otchot.product_id + ''].organization,
                            }
                        }
                    }
                })

            if (update_otchots.length >= 50000) {
                console.log(`update_otchots.length: ${update_otchots.length}`);
                await new Promise(res => {
                    instance.goodsOtchot.bulkWrite(update_otchots, (err) => {
                        if (err)
                            console.log('error on bulkWrite', err);
                        res(true)
                    })
                })
                update_otchots = []
            }
        }
        console.log(`update_otchots.length: ${update_otchots.length}`);
        await new Promise(res => {
            instance.goodsOtchot.bulkWrite(update_otchots, (err) => {
                if (err)
                    console.log('error on bulkWrite', err);
                res(true)
            })
        })
        update_otchots = []
    }

    // insertCustomerDebpPayHistory()

    // update eski goodsOtchot larning oy boshidagi stocklarini
    /**
     * 
     * @param {string} organization_id 
     */
    const updateGoodsOtchotByOrganization = async (organization_id) => {
        const start_time = new Date().getTime()
        console.log('starting...');
        const otchots = await instance.goodsOtchot
            .find(
                {
                    organization: organization_id,
                    month_name: 'December',
                },
                {
                    services: 1,
                    product_id: 1,
                }
            )
            .lean()
        console.log(`otchotlarni olish uchun ketgan vaqt: ${new Date().getTime() - start_time}`);
        // const otchotsObj = {}
        // for (const otchot of otchots) {
        // otchotsObj[otchot.product_id + otchot.month_name] = otchot
        // }

        const goods = await instance.goodsSales
            .find(
                { _id: { $in: otchots.map(o => o.product_id) } },
                { cost: 1, services: 1 },
            )
            .lean();

        const goodsObj = {}
        for (const good of goods) {
            const services = {}
            for (const serv of good.services) {
                services[serv.service_id + ''] = serv
            }

            goodsObj[good._id + ''] = { cost: good.cost, services: services }
        }


        let update_otchots = []
        for (const otchot of otchots) {

            const services = otchot.services.map(s => {
                if (!s.cost)
                    s.cost = goodsObj[otchot.product_id + ''].services[s.service_id + ''].cost ?
                        goodsObj[otchot.product_id + ''].services[s.service_id + ''].cost :
                        goodsObj[otchot.product_id + ''].cost;
                if (!s.stock_monthly.cost)
                    s.stock_monthly.cost = goodsObj[otchot.product_id + ''].services[s.service_id + ''].cost ?
                        goodsObj[otchot.product_id + ''].services[s.service_id + ''].cost :
                        goodsObj[otchot.product_id + ''].cost;

                return s
            })

            update_otchots.push({
                updateOne: {
                    filter: { _id: otchot._id },
                    update: {
                        $set: {
                            services: services,
                        }
                    }
                }
            })

            if (update_otchots.length >= 10000) {
                console.log(`update_otchots.length: ${update_otchots.length}`);
                await new Promise(res => {
                    instance.goodsOtchot.bulkWrite(update_otchots, (err) => {
                        if (err)
                            console.log('error on bulkWrite', err);
                        res(true)
                    })
                })
                update_otchots = []
            }
        }
        console.log(`update_otchots.length: ${update_otchots.length}`);
        await new Promise(res => {
            instance.goodsOtchot.bulkWrite(update_otchots, (err) => {
                if (err)
                    console.log('error on bulkWrite', err);
                res(true)
            })
        })
        update_otchots = []
    }

    const updateGoodsOtchot = async () => {
        const organizations = await instance.organizations
            .find({}, { _id: 1 })
            .lean()
        console.log(organizations.length, 'organizations.length');
        let i = 1
        for (const org of organizations) {
            console.log(`org._id: ${org._id} starting... i = ${i}, ${(i / organizations.length) * 100}%`);
            // await updateGoodsOtchotByOrganization(org._id)
            await updateGoodsOtchotCreatedTimeByOrganization(org._id + '')
            console.log(`org._id: ${org._id} tugadi. i = ${i}, ${(i / organizations.length) * 100}%`);
            i++
        }
        console.log(`the end`);
    }

    // updateGoodsOtchot()

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

    const feko_method = async (request) => {
        const start_time = request.query && request.query.start ? request.query.start : new Date().getTime()
        const end_time = request.query && request.query.end ? request.query.end : new Date().getTime()
        console.log('start..');
        const startDate = new Date(start_time)//.toISOString()
        const endDate = new Date(end_time)//.toISOString()
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
        reply.ok(await feko_method(request))
    });

    const createHistoryAndUpdateProduct = async (purch, good, received) => {
        const service = good.services.find(serv => serv.service + '' == purch.service + '' || serv.service_id + '' == purch.service + '')

        const in_stock = service && !isNaN(service.in_stock) ? service.in_stock : 0

        good.services = good.services.map(serv => {
            if (serv.service + '' == purch.service + '' || serv.service_id + '' == purch.service + '') {
                serv.in_stock = +in_stock + received
            }

            return serv
        })

        await instance.create_inventory_history(
            {
                _id: purch.ordered_by_id,
                name: purch.ordered_by_name,
                organization: purch.organization,
            },
            'received.',
            purch.p_order,
            purch.service,
            good._id ? good._id : product_id,
            good.cost,
            received,
            +in_stock + received,
            purch._id.getTimestamp().getTime(),
        )

        return await instance.goodsSales.updateOne({ _id: good._id }, { $set: good }, { lean: true })

    };

    // insert inv_history and update product which is not inserted till create purchase
    const getPurchaseItems = (purchases, purchaseItems) => {
        const purchaseItemsRes = []

        for (const pItem of purchaseItems) {
            purchaseItemsRes.push(pItem)
        }

        for (const purchase of purchases) {
            for (const pItem of purchase.items) {
                if (purchaseItemsRes.find(pItem => pItem)) {
                    purchaseItemsRes.push({
                        organization: purchase.organization,
                        service: purchase.service,
                        purchase_id: purchase._id,
                        product_id: pItem.product_id,
                        received: pItem.quality,
                    })
                }
            }
        }

        return purchaseItemsRes
    }
    // insert inv_history and update product which is not inserted till create purchase
    (async () => {
        const startDate = new Date("09.09.2022")
        const endDate = new Date()

        console.log("Start...");
        console.log(startDate, endDate);

        const purchases = await instance.inventoryPurchase
            .find(
                {
                    createdAt: {
                        $gte: startDate,
                        $lte: endDate,
                    },
                },
                {
                    _id: 1,
                    p_order: 1,
                    service: 1,
                    organization: 1,
                    purchase_order_date: 1,
                    ordered_by_id: 1,
                    ordered_by_name: 1,
                    items: 1,
                },
            )
            .lean()
        console.log("purchases.length", purchases.length);

        const purchasesObj = {}
        for (const purchase of purchases) {
            purchasesObj[purchase._id] = purchase
        }

        const purchaseIds = purchases.map(p => p._id)

        const _purchaseItems = await instance.purchaseItem.find({
            purchase_id: { $in: purchaseIds },
            received: { $gt: 0 },

        })
            .limit(2)
            .lean()

        const purchaseItems = getPurchaseItems(purchases, _purchaseItems)

        console.log("purchaseItems.length", purchaseItems.length);

        const productIds = []
        for (const pItem of purchaseItems) {
            productIds.push(pItem.product_id)
        }
        for (const purchase of purchases) {
            for (const pItem of purchase.items) {
                productIds.push(instance.ObjectId(pItem.product_id))
            }
        }
        console.log("productIds.length", productIds.length);

        const goods = await instance.goodsSales.find(
            {
                _id: { $in: productIds }
            },
            {
                services: 1,
                cost: 1,
            }
        )
            .lean()
        const goodsObj = {}
        for (const good of goods) {
            goodsObj[good._id] = good
        }

        console.log("goods.length", goods.length);
        let i = 0;

        let exists_histories = 0
        let not_exists_histories = 0
        for (const purchaseItem of purchaseItems) {
            const history = await instance.inventoryHistory.findOne(
                {
                    $or: [
                        {
                            reason: 'received',
                        },
                        {
                            reason: 'receivedd',
                        },
                        {
                            reason: 'received.',
                        },
                    ],
                    unique: purchasesObj[purchaseItem.purchase_id].p_order,
                    organization: '' + purchasesObj[purchaseItem.purchase_id].organization,
                    service: '' + purchasesObj[purchaseItem.purchase_id].service,
                    product_id: '' + purchaseItem.product_id,
                }
            )
                .lean()

            if (purchasesObj[purchaseItem.purchase_id] && goodsObj[purchaseItem.product_id]) {
                if (!history) {
                    i++
                    not_exists_histories++
                    await createHistoryAndUpdateProduct(
                        purchasesObj[purchaseItem.purchase_id],
                        goodsObj[purchaseItem.product_id]
                            ? goodsObj[purchaseItem.product_id]
                            : {
                                _id: purchaseItem.product_id,
                                services: [
                                    {
                                        service: purchasesObj[purchaseItem.purchase_id].service,
                                        in_stock: 0,
                                    },
                                ]
                            },
                        purchaseItem.received,
                    )
                } else {
                    exists_histories++
                    if (
                        history && history.adjustment != purchaseItem.received
                    ) {
                        i++
                        await createHistoryAndUpdateProduct(
                            purchasesObj[purchaseItem.purchase_id],
                            goodsObj[purchaseItem.product_id],
                            purchaseItem.received - history.adjustment,
                        )
                    }
                }
            }
        }
        console.log(`exists_histories: ${exists_histories}`);
        console.log(`not_exists_histories: ${not_exists_histories}`);
        console.log(`End... total: ${i}`);
    });

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
    });

    // (async () => {
    //     const organizations = await instance.organizations
    //         .find(
    //             {},
    //             { _id: 1 },
    //         )
    //         .lean()
    //     console.log(organizations.length, 'organizations.length');

    //     /**
    //      * @type { Record<string, { org_id: String, user_id: String, user_name: String }> }
    //      */
    //     const orgsObj = {}
    //     for (const org of organizations) {
    //         const user = await instance.User
    //             .findOne(
    //                 {
    //                     organization: org._id,
    //                     role: 'boss',
    //                 },
    //                 { name: 1 },
    //             )
    //             .lean();

    //         orgsObj[org._id] = {
    //             org_id: org._id,
    //             user_id: user && user._id ? user._id : '',
    //             user_name: user && user.name ? user.name : '',
    //         }
    //     }

    //     const cats = []
    //     const accounts = []

    //     for (const org of organizations) {
    //         cats.push(
    //             {
    //                 organization: orgsObj[org._id].org_id,
    //                 name: 'fees',
    //                 is_active: true,
    //                 disbursement: true,
    //                 created_by: orgsObj[org._id].user_name,
    //                 created_by_id: orgsObj[org._id].org_id,
    //             },
    //             {
    //                 organization: orgsObj[org._id].org_id,
    //                 name: 'one_time_fees',
    //                 is_active: true,
    //                 disbursement: true,
    //                 created_by: orgsObj[org._id].user_name,
    //                 created_by_id: orgsObj[org._id].org_id,
    //             },
    //             {
    //                 organization: orgsObj[org._id].org_id,
    //                 name: 'salary',
    //                 is_active: true,
    //                 disbursement: true,
    //                 created_by: orgsObj[org._id].user_name,
    //                 created_by_id: orgsObj[org._id].org_id,
    //             },
    //             {
    //                 organization: orgsObj[org._id].org_id,
    //                 name: 'company_to_fees',
    //                 is_active: true,
    //                 disbursement: true,
    //                 created_by: orgsObj[org._id].user_name,
    //                 created_by_id: orgsObj[org._id].org_id,
    //             },
    //         )

    //         accounts.push({
    //             organization: orgsObj[org._id].org_id,
    //             name: 'cash',
    //             balance: 0,
    //             created_by: orgsObj[org._id].user_name,
    //             created_by_id: orgsObj[org._id].org_id,
    //         })
    //     }

    //     const catsRes = await instance.financeCategory.create(cats)
    //     console.log(catsRes.length);
    //     const accRes = await instance.financeAccount.create(accounts)
    //     console.log(accRes.length);
    // })()

    (async () => {
        await new Promise(res => setTimeout(() => res(), 2000))

        let goodsDailyStock = []

        const cursor = instance.goodsOtchot.find({
            createdAt: { $gte: new Date('02.01.2023') },
            organization: '5f5641e8dce4e706c062837a',
        }).cursor()

        cursor.on('end', () => {
            console.log(`The end`);
        })

        for (let chunk = await cursor.next(); !!chunk; chunk = await cursor.next()) {

            const services = chunk.services.map(serv => {
                return {
                    service_id: serv.service_id,
                    service_name: serv.service_name,
                    start_price: serv.stock_monthly.price,
                    start_cost: serv.stock_monthly.cost,
                    end_price: serv.stock_monthly.price,
                    end_cost: serv.stock_monthly.cost,
                    start_stock: serv.stock_monthly.start_stock,
                    end_stock: serv.stock_monthly.end_stock,
                    start_prices: serv.stock_monthly.prices,
                    end_prices: serv.stock_monthly.prices,
                }
            })

            const data = {
                organization: chunk.organization,
                month: chunk.month,
                month_name: chunk.month_name,
                sku: chunk.sku,
                product_id: chunk.product_id,
                product_name: chunk.product_name,
                category_id: chunk.category_id,
                category_name: chunk.category_name,
                sold_by: chunk.sold_by,
                count_by_type: chunk.count_by_type,
                barcode_by_type: chunk.barcode_by_type,
                barcode: chunk.barcode,
                mxik: chunk.mxik,
                services: services,
            }

            goodsDailyStock.push({
                updateOne: {
                    filter: {
                        organization: data.organization,
                        month: data.month,
                        product_id: data.product_id,
                    },
                    update: {
                        $set: data
                    },
                    upsert: true,
                }
            })

            if (goodsDailyStock.length >= 10000) {

                await insertManyGoodsDailyStock(goodsDailyStock)
                goodsDailyStock = []
            }
        }

        await insertManyGoodsDailyStock(goodsDailyStock)
        goodsDailyStock = []

    })

    async function insertManyGoodsDailyStock(data) {
        console.log(data.length, 'data.length');
        await instance.GoodsDailyStock.bulkWrite(data)
    }

    next()
})