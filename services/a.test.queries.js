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
            access.item_edit = true
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
            access.reports = true
            access.report_sale = true
            access.report_accaunt = true
            access.report_abs = true
            access.report_sale_by_item = true
            access.report_sale_by_category = true
            access.report_sale_by_supplier = true
            access.report_employee = true
            access.report_sale_by_payment = true
            access.report_receipt = true
            access.report_debt = true
            access.report_discount = true
            access.report_taxes = true
            access.report_shift = true
            access.items = true
            access.item_edit = true
            access.item_list = true
            access.item_mxik_search = true
            access.item_composite_item = true
            access.item_add_from_warehause = true
            access.item_print_label = true
            access.item_price_change_history = true
            access.item_categories = true
            access.item_modifiers = true
            access.item_discount = true
            access.employees = true
            access.employee_list = true
            access.employee_list_add = true
            access.employee_list_del = true
            access.employee_access_rights = true
            access.employee_access_rights_add = true
            access.employee_access_rights_del = true
            access.employee_time_cards = true
            access.employee_total_worked = true
            access.customers = true
            access.settings = true
            access.setting_general = true
            access.setting_organization = true
            access.setting_nds = true
            access.setting_payment_types = true
            access.setting_currency = true
            access.setting_loyalty = true
            access.setting_taxes = true
            access.setting_receipt = true
            access.setting_open_tickets = true
            access.setting_buttons = true
            access.setting_options = true
            access.setting_stores = true
            access.setting_pos_devices = true
            access.edit_profile = true
            access.set_the_taxes = true
            access.manage_pos_devices = true
            access.can_delete_item = true
            access.inventory = true
            access.inv_supplier_valuation = true
            access.inv_purchase_orders = true
            access.inv_purchase_mark = true
            access.inv_purchase_orders_cost = true
            access.inv_transfer_orders = true
            access.inv_stock_adjusment = true
            access.inv_stock_adjusment_cost = true
            access.inv_inventory_counts = true
            access.inv_productions = true
            access.inv_productions_cost = true
            access.inv_suppliers = true
            access.inv_supplier_transaction = true
            access.inv_supplier_transaction_corrector = true
            access.inv_fees = true
            access.inv_inventory_history = true
            access.inv_inventory_valuation = true
            await instance.AccessRights.findByIdAndUpdate(
                access._id,
                access,
                { lean: true },
            )
        }
        console.log('time:', new Date().getTime() - start_time);
        console.log('ok');
    })
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