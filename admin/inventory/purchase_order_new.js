const fp = require('fastify-plugin');
// purchaseni boshida qilamz
module.exports = fp((instance, options, next) => {
    // receive function

    const on_receive_purchase = async ({ body, params }, reply, admin) => {
        try {
            if (body == undefined) body = {}

            if (!(body.items instanceof Array)) body.items = []

            if (!(body.additional_cost instanceof Array)) body.additional_cost = []

            const purch = await instance.inventoryPurchase
                .findOne({ _id: params.id })
                .lean();
            if (!purch) return reply.fourorfour('purchase_order')
            const current_service = await instance.services.findById(purch.service).lean()
            // const items = body.items;
            const item_ids = [];
            const reqObj = {};
            for (let i = 0; i < body.items.length; i++) {
                item_ids.push(body.items[i]._id)
                reqObj[body.items[i]._id] = body.items[i]
                reqObj[body.items[i]._id].to_receive = parseFloat(reqObj[body.items[i]._id].to_receive)
            }
            const purchase_items = await instance.purchaseItem.find({ _id: { $in: item_ids } }).lean();

            const goodsObj = {}
            const pro_ids = []
            const itemObj = {}
            const received = 0
            let is_changed = false

            let check_closed = true
            let used_transaction = 0.0;
            let currency = await instance.Currency
                .findOne({ organization: admin.organization })
                .lean();
            if (!currency || !currency.value) {
                currency = { value: 1 }
            }

            for (let i = 0; i < purchase_items.length; i++) {
                if (
                    reqObj[purchase_items[i]._id].to_receive + purchase_items[i].received <= purchase_items[i].quality
                    && reqObj[purchase_items[i]._id].to_receive >= 0
                ) {
                    purchase_items[i].to_receive = +reqObj[purchase_items[i]._id].to_receive
                    purch.is_service_changable = false
                    if (purchase_items[i].to_receive != 0) {
                        var pro_id = instance.ObjectId(purchase_items[i].product_id)

                        if (goodsObj[pro_id] == undefined) {
                            pro_ids.push(purchase_items[i].product_id)
                            // try {
                            goodsObj[pro_id] = purchase_items[i]
                            // .toObject()
                            // }
                            // catch (error) {
                            //   console.log(error.message)
                            // }
                        }
                        else {
                            goodsObj[pro_id].purchase_cost =
                                (
                                    (+goodsObj[pro_id].purchase_cost) * (+goodsObj[pro_id].to_receive)
                                    + (+purchase_items[i].purchase_cost) * (+purchase_items[i].to_receive)
                                )
                                / ((+purchase_items[i].to_receive) + (+goodsObj[pro_id].to_receive))
                            goodsObj[pro_id].to_receive += (+purchase_items[i].to_receive);
                        }
                    }
                    is_changed = is_changed || purchase_items[i].to_receive > 0
                    received += reqObj[purchase_items[i]._id].to_receive
                    let used_purchase_cost = purchase_items[i].purchase_cost

                    if (purchase_items[i].purchase_cost_currency == 'usd') {
                        used_purchase_cost = used_purchase_cost * currency.value
                    }
                    used_transaction += (+reqObj[purchase_items[i]._id].to_receive) * (+used_purchase_cost)
                    purchase_items[i].to_receive = 0
                    purchase_items[i].received += (+reqObj[purchase_items[i]._id].to_receive)
                }
                check_closed = check_closed && (purchase_items[i].received == purchase_items[i].quality)
                itemObj[purchase_items[i]._id] = purchase_items[i]
            }
            let additional_costObj = {}
            for (const add of body.additional_cost) {
                additional_costObj[add._id] = add
            }

            for (let i = 0; i < purch.additional_cost.length; i++) {
                if (additional_costObj[purch.additional_cost[i]._id] !== undefined) {
                    if (is_changed) {
                        if (!purch.additional_cost[i].is_received && additional_costObj[purch.additional_cost[i]._id].is_received) {
                            let received_amount = +purch.additional_cost[i].amount

                            if (purch.additional_cost[i].amount_currency == 'usd') {
                                received_amount = received_amount * currency.value
                            }
                            used_transaction += received_amount
                        }
                        purch.additional_cost[i].is_received = additional_costObj[purch.additional_cost[i]._id].is_received
                        check_closed = check_closed && (additional_costObj[purch.additional_cost[i]._id].is_received)
                    }
                }
            }
            let status = (check_closed) ? "closed" : (is_changed || received > 0) ? 'partially' : 'pending'
            await instance.inventoryPurchase.updateOne(
                { _id: params.id },
                {
                    $inc: { received: received },
                    $set: {
                        status: status,
                        additional_cost: purch.additional_cost,
                        is_service_changable: purch.is_service_changable,
                    }
                });
            if (item_ids && item_ids.length == 0) {
                return reply.ok(purch)
            }
            for (const id of item_ids) {
                await instance.purchaseItem.updateOne({ _id: id }, { $set: itemObj[id] })
            };

            // supplier transaction
            const current_supplier = await instance.adjustmentSupplier
                .findOne({ _id: purch.supplier_id })
                .lean();
            if (current_supplier) {
                if (!current_supplier.balance) {
                    current_supplier.balance = 0
                }
                if (!current_supplier.balance_usd) {
                    current_supplier.balance_usd = 0
                }
                let supplier_used_transaction;
                let balance_uzs = 0;
                let balance_usd = 0;
                if (purch.total_currency == 'usd') {
                    // current_supplier.balance_usd -= used_transaction / currency.value;
                    // supplier_used_transaction = -1 * used_transaction / currency.value;
                    current_supplier.balance_usd -= used_transaction / currency.value;
                    supplier_used_transaction = -1 * used_transaction / currency.value;
                    balance_usd += supplier_used_transaction;
                }
                else {
                    // current_supplier.balance -= used_transaction;
                    // supplier_used_transaction = -1 * used_transaction;
                    current_supplier.balance -= used_transaction;
                    supplier_used_transaction = -1 * used_transaction;
                    balance_uzs += supplier_used_transaction;
                }
                const services = Array.isArray(current_supplier.services)
                    ? current_supplier.services
                    : [{
                        service: current_service._id,
                        service_name: current_service.name,
                        balance: 0,
                        balance_usd: 0,
                    }]
                if (
                    current_supplier.services &&
                    !current_supplier.services
                        .find(elem => elem.service + '' == purch.service + '')
                ) {
                    current_supplier.services.push({
                        service: current_service._id,
                        service_name: current_service.name,
                        balance: 0,
                        balance_usd: 0,
                    })
                }
                // update adjustmentSupplier service balance
                for (const [index, serv] of services.entries()) {
                    if (serv.service.toString() == current_service._id.toString()) {
                        services[index].balance += balance_uzs
                        services[index].balance_usd += balance_usd
                    }
                }

                await instance.adjustmentSupplier.updateOne(
                    { _id: purch.supplier_id },
                    {
                        $set: {
                            balance: current_supplier.balance,
                            balance_usd: current_supplier.balance_usd,
                            services: services,
                        },
                    }
                )

                await new instance.supplierTransaction({
                    service: purch.service,
                    supplier_id: current_supplier._id,
                    document_id: purch.p_order,
                    employee: admin._id,
                    employee_name: admin.name,
                    status: 'active',
                    balance: supplier_used_transaction,
                    currency: purch.total_currency,
                    date: new Date().getTime(),
                    purchase_id: purch._id
                })
                    .save();
            }

            // update item partiation queue
            for (const purch_item of purchase_items) {
                // console.log(purch_item, 'item');
                //update queue
                const queue = await instance.goodsSaleQueue
                    .findOne(
                        {
                            service_id: current_service._id,
                            good_id: purch_item.product_id,
                        },
                        { queue: 1 }
                    )
                    .sort('-queue')
                    .lean()

                num_queue = queue && queue.queue ? parseInt(queue.queue) + 1 : 1

                await new instance.goodsSaleQueue({
                    purchase_id: purch._id,
                    p_order: purch.p_order,
                    supplier_id: current_supplier._id,
                    supplier_name: current_supplier.supplier_name,
                    service_id: current_service._id,
                    service_name: current_service.name,
                    good_id: purch_item.product_id,
                    quantity: purch_item.received,
                    quantity_left: purch_item.received,
                    queue: num_queue,
                }).save()
                //update item suppliers
                const goood1 = await instance.goodsSales.findById(purch_item.product_id).lean();

                const good_of_suppliers =
                    Array.isArray(goood1.suppliers)
                        ? goood1.suppliers
                        : [{
                            supplier_id: current_supplier._id,
                            supplier_name: current_supplier.supplier_name,
                            service_id: current_service._id,
                            service_name: current_service.name,
                            stock: 0,
                        }]

                if (
                    goood1.suppliers &&
                    !goood1.suppliers
                        .find(elem =>
                            elem.supplier_id + '' == current_supplier._id + '' &&
                            elem.service_id + '' == purch.service + ''
                        )) {
                    goood1.suppliers.push({
                        supplier_id: current_supplier._id,
                        supplier_name: current_supplier.supplier_name,
                        service_id: current_service._id,
                        service_name: current_service.name,
                        stock: 0,
                    })
                }
                // update adjustmentSupplier service balance
                for (const [index, supp] of good_of_suppliers.entries()) {
                    if (
                        supp.service_id + '' == current_service._id + '' &&
                        supp.supplier_id + '' == current_supplier._id + ''
                    ) {
                        good_of_suppliers[index].stock += purch_item.received
                    }
                }

                await instance.goodsSales.updateOne(
                    { _id: purch_item.product_id },
                    { $set: { suppliers: good_of_suppliers } },
                    { lean: true },
                )
            }
            // update items cost
            const goods = await instance.goodsSales.find({ _id: { $in: pro_ids } }).lean();

            for (const g of goods) {
                var in_stock = null
                var index = -1
                var In_STOCK = 0;
                for (let i = 0; i < g.services.length; i++) {
                    if (g.services[i].in_stock != '' && g.services[i].in_stock != null) {
                        In_STOCK += +g.services[i].in_stock
                    }
                    if (g.services[i].service + "" == purch.service + "") {
                        in_stock = +g.services[i].in_stock
                        index = i
                    }
                }
                if (in_stock != null) {
                    if (in_stock > 0) {
                        if (g.cost_currency == 'usd') {
                            g.cost = g.cost * currency.value
                        }
                        if (goodsObj[g._id].purchase_cost_currency == 'usd') {
                            goodsObj[g._id].purchase_cost = (+goodsObj[g._id].purchase_cost) * currency.value
                        }
                        g.cost = (g.cost * In_STOCK + (+goodsObj[g._id].purchase_cost) * (+goodsObj[g._id].to_receive))
                            / (In_STOCK + (+goodsObj[g._id].to_receive))
                        if (g.max_cost < g.cost || g.max_cost == 0) {
                            g.max_cost = g.cost
                        }
                    }
                    else {
                        if (g.max_cost < goodsObj[g._id].purchase_cost || g.max_cost == 0) {
                            g.max_cost = +goodsObj[g._id].purchase_cost
                        }
                        if (goodsObj[g._id].purchase_cost_currency == 'usd') {
                            goodsObj[g._id].purchase_cost = (+goodsObj[g._id].purchase_cost) * currency.value
                        }
                        g.cost = (+goodsObj[g._id].purchase_cost)
                    }

                    if (g.cost_currency == 'usd') {
                        g.cost = g.cost / currency.value
                    }
                    g.services[index].in_stock += (+goodsObj[g._id].to_receive)

                    // create inv history

                    // ('create_inventory_history', (user, reason, unique, service_id, product_id, cost, adjustment, stock_after, date)

                    await instance.create_inventory_history(admin, 'received', purch.p_order, purch.service, g._id, g.cost, +goodsObj[g._id].to_receive, +in_stock + +goodsObj[g._id].to_receive, new Date().getTime())
                    g.last_updated = new Date().getTime()
                    g.last_stock_updated = new Date().getTime()
                    await instance.goodsSales.updateOne({ _id: g._id }, { $set: g })
                }
            }

            reply.ok(purch)
        } catch (error) {
            return reply.error(error.message)
        }
    };
    const createPurchaseOrder = async (request, reply, admin) => {
        if (!request.body) {
            request.body = {}
        }
        request.body.type = 'coming'
        const supplier_id = request.body.supplier_id
        const service = await instance.services
            .findById(request.body.service, { name: 1 })
            .lean()
        if (!service) return reply.error('Error on finding service')

        if (supplier_id != '' && supplier_id != undefined) {
            var valid = true
            if (request.body.purchase_order_date == "" || request.body.purchase_order_date == null) {
                request.body.purchase_order_date = new Date().getTime()
            }
            if (request.body.purchase_order_date != "" && request.body.expected_on) {
                if (request.body.purchase_order_date > request.body.expected_on) {
                    valid = false
                }
            }

            if (valid) {
                let currency = { value: 1 };
                try {
                    currency = await instance.Currency.findOne({ organization: admin.organization }).lean();

                    if (!currency || !currency.value) currency = { value: 1 }

                } catch (error) { }
                const supp = await instance.adjustmentSupplier.findOne({ _id: supplier_id }).lean();
                if (supp) {
                    instance.inventoryPurchase.countDocuments(
                        { organization: admin.organization },
                        async (err, orders) => {
                            if (err || !orders) orders = 0

                            const p_order = 'P' + ('00000000000' + (orders + 1001)).slice(-5);
                            request.body.p_order = p_order

                            try {
                                request.body.supplier_id = instance.ObjectId(request.body.supplier_id)
                                request.body.service = instance.ObjectId(request.body.service)
                                request.body.ordered_by_id = instance.ObjectId(admin._id)
                            } catch (error) {
                                return reply.error(error.message)
                            }

                            request.body.ordered_by_name = admin.name
                            request.body.organization = admin.organization
                            delete request.body._id
                            if (request.body.status != 'returned_order' && request.body.status != 'closed') {
                                request.body.status = 'pending'
                            }
                            const purchaseModel = new instance.inventoryPurchase(request.body)

                            if (purchaseModel.status == 'closed') purchaseModel.status = 'pending'

                            purchaseModel.supplier_name = supp.supplier_name
                            purchaseModel.service_name = service.name
                            const purchase_items = []
                            var total_count = 0
                            var total = 0

                            if (request.body.items != undefined) {
                                if (request.body.items.length > 0) {
                                    for (let i = 0; i < request.body.items.length; i++) {
                                        delete request.body.items[i]._id
                                        request.body.items[i].purchase_id = instance.ObjectId(purchaseModel._id)
                                        request.body.items[i].ordered = request.body.items[i].quality
                                        request.body.items[i].service = instance.ObjectId(request.body.service)
                                        if (request.body.items[i].quality != undefined && parseFloat(request.body.items[i].quality)) {
                                            total_count += parseFloat(request.body.items[i].quality)
                                            if (request.body.items[i].purchase_cost != undefined && parseFloat(request.body.items[i].quality) && parseFloat(request.body.items[i].purchase_cost)) {
                                                let amount_quality = parseFloat(request.body.items[i].quality) * parseFloat(request.body.items[i].purchase_cost)
                                                if (request.body.items[i].purchase_cost_currency == 'usd') {
                                                    amount_quality = amount_quality * currency.value
                                                }
                                                total += amount_quality
                                            }

                                        }
                                        if (parseFloat(request.body.items[i].purchase_cost) && parseFloat(request.body.items[i].quality)) {
                                            request.body.items[i].purchase_cost = parseFloat(request.body.items[i].purchase_cost)
                                            request.body.items[i].amount = request.body.items[i].purchase_cost * parseFloat(request.body.items[i].quality)
                                            await instance.goodsSales.updateOne({ _id: request.body.items[i].product_id }, { default_purchase_cost: request.body.items[i].purchase_cost })
                                        }
                                        purchase_items.push(request.body.items[i])

                                    }
                                    if (request.body.additional_cost == undefined) {
                                        request.body.additional_cost = []
                                    }
                                    for (const r in request.body.additional_cost) {
                                        delete request.body.additional_cost[r]._id
                                        if (parseFloat(request.body.additional_cost[r].amount)) {
                                            let additional_amount = parseFloat(request.body.additional_cost[r].amount)
                                            if (request.body.additional_cost[r].amount_currency == 'usd') {
                                                additional_amount = additional_amount * currency.value
                                            }
                                            total += additional_amount
                                        }
                                    }
                                }
                            }
                            purchaseModel.total_count = total_count
                            if (request.body.total_currency == 'usd') {
                                total = total / currency.value
                            }
                            purchaseModel.total = total
                            purchaseModel.items = purchase_items
                            if (purchaseModel.items.length > 0) {
                                purchaseModel.save((err, purch) => {
                                    if (err || purch == null) {
                                        reply.error('Error on saving purchase order')
                                        instance.send_Error('saving purchase', JSON.stringify(err))
                                    }
                                    else {
                                        instance.purchaseItem.insertMany(purchase_items, (err, purchaseitems) => {
                                            if (err || purchaseitems == null) {
                                                reply.error('Error on saving purchase items')
                                                instance.send_Error('saving purchase item', JSON.stringify(err))
                                            }
                                            else {
                                                if (request.body.status == 'returned_order') {
                                                    reply.ok(purch)
                                                    return_purchase_order(purch, purchase_items, admin)
                                                }
                                                else if (request.body.status == 'closed') {
                                                    for (let i = 0; i < purchaseitems.length; i++) {
                                                        purchaseitems[i].to_receive = purchaseitems[i].quality
                                                    }
                                                    for (let i = 0; i < purch.additional_cost.length; i++) {
                                                        purch.additional_cost[i].is_received = true
                                                    }
                                                    purch.items = purchaseitems
                                                    receive_purchase({ body: purch, params: { id: purch._id } }, reply, admin)
                                                }
                                                else {
                                                    reply.ok(purch)
                                                }
                                            }
                                        })
                                    }
                                })
                            }
                            else {
                                reply.error('items can\'t be empty')
                            }
                        })
                }
                else {
                    reply.error('Supplier not found')
                }

            }
            else {
                reply.error('Time error')
            }
        }
        else {
            reply.error('Error on finding supplier')
        }
    }

    instance.decorate('onReceivePurchase', on_receive_purchase)
    instance.decorate('create_purchase_order_new', createPurchaseOrder)

    next()
})
