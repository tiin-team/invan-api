
const fs = require("fs");
const json2xls = require("json2xls");

async function supplierTransactionsGet(request, reply, instance) {
    try {
        const { limit, page, supplier_name, service } = request.body;
        const { name } = request.params;
        const user = request.user;
        const $match = {
            $match: {
                organization: user.organization,
                supplier_name: {
                    $regex: supplier_name,
                    $options: 'i'
                },
                is_deleted: {
                    $ne: true
                }
            }
        }
        if (service)
            $match.$match.service = service
        const $sort = {
            $sort: {
                _id: 1
            }
        }
        const $skip = {
            $skip: (page - 1) * limit
        }
        const $limit = {
            $limit: limit
        }
        const $lookup = {
            $lookup: {
                from: 'suppliertransactions',
                localField: '_id',
                foreignField: 'supplier_id',
                as: 'transactions'
            }
        }
        const $unwind = {
            $unwind: {
                path: '$transactions',
                preserveNullAndEmptyArrays: true
            }
        }
        const $group = {
            $group: {
                _id: '$_id',
                supplier_name: {
                    $first: '$supplier_name'
                },
                balance: {
                    $first: '$balance'
                },
                phone_number: {
                    $first: '$phone_number'
                },
                total_spend: {
                    $sum: {
                        $cond: {
                            if: {
                                $gt: ['$transactions.balance', 0]
                            },
                            then: '$transactions.balance',
                            else: 0
                        }
                    }
                },
                total_receive: {
                    $sum: {
                        $cond: {
                            if: {
                                $lt: ['$transactions.balance', 0]
                            },
                            then: '$transactions.balance',
                            else: 0
                        }
                    }
                }
            }
        }
        const $fixProject = {
            $project: {
                balance: 1,
                supplier_name: 1,
                phone_number: 1,
                total_spend: {
                    $abs: '$total_spend'
                },
                total_receive: {
                    $abs: '$total_receive'
                },
                total_debt: {
                    $sum: ['$total_spend', '$total_receive'],
                    // $cond: {
                    //     if: {
                    //         $eq: [
                    //             {
                    //                 $abs: {
                    //                     $sum: ['$total_spend', '$total_receive']
                    //                 }
                    //             },
                    //             {
                    //                 $abs: '$balance'
                    //             }
                    //         ]
                    //     },
                    //     then: {
                    //         $sum: ['$total_spend', '$total_receive']
                    //     },
                    //     else: '$balance'
                    // }
                }
            }
        }
        const $project = {
            $project: {
                supplier_name: 1,
                balance: 1,
                phone_number: 1,
                total_spend: 1,
                total_receive: 1,
                total_debt: {
                    $cond: {
                        if: {
                            $gt: [
                                '$total_debt',
                                0
                            ]
                        },
                        then: '$total_debt',
                        else: undefined
                    }
                },
                total_favor: {
                    $cond: {
                        if: {
                            $lt: [
                                '$total_debt',
                                0
                            ]
                        },
                        then: {
                            $abs: '$total_debt'
                        },
                        else: undefined
                    }
                },
                /*
                total_debt: {
                    $cond: {
                        if: {
                            $gt: [
                                {
                                    $subtract: [
                                        '$total_spend',
                                        '$total_receive'
                                    ]
                                },
                                0
                            ]
                        },
                        then: {
                            $subtract: [
                                '$total_spend',
                                '$total_receive'
                            ]
                        },
                        else: undefined
                    }
                },
                total_favor: {
                    $cond: {
                        if: {
                            $gt: [
                                {
                                    $subtract: [
                                        '$total_receive',
                                        '$total_spend'
                                    ]
                                },
                                0
                            ]
                        },
                        then: {
                            $subtract: [
                                '$total_receive',
                                '$total_spend'
                            ]
                        },
                        else: undefined
                    }
                }
                */
            }
        }
        const pipeline = [
            $match,
            $sort
        ];
        if (!name) {
            pipeline.push($skip);
            pipeline.push($limit);
        }
        pipeline.push($lookup);
        pipeline.push($unwind);
        pipeline.push($group);
        pipeline.push($fixProject);
        pipeline.push($sort);
        pipeline.push($project);

        const suppliers = await instance.adjustmentSupplier.aggregate(pipeline).allowDiskUse(true).exec();
        for (const index in suppliers) {
            try {
                suppliers[index].total_receive = Math.round(suppliers[index].total_receive * 100) / 100;
                suppliers[index].total_spend = Math.round(suppliers[index].total_spend * 100) / 100;
                suppliers[index].total_debt = Math.round(suppliers[index].total_debt * 100) / 100;
                suppliers[index].total_favor = Math.round(suppliers[index].total_favor * 100) / 100;
            }
            catch (error) {
                console.log(error.message)
            }
        }

        if (!name) {
            const total = await instance.adjustmentSupplier.countDocuments($match.$match);
            return reply.ok({
                total,
                // total_balance,
                data: suppliers
            })
        }
        if (user.ui_language && user.ui_language.value != undefined) {
            instance.i18n.setLocale('uz')
        }
        const suppliers_excel = []
        let index = 1;
        for (const s of suppliers) {
            suppliers_excel.push({
                [`${instance.i18n.__('number')}`]: index++,
                [`${instance.i18n.__('supplier_name')}`]: s.supplier_name,
                [`${instance.i18n.__('total_receive')}`]: s.total_receive ? s.total_receive : '',
                [`${instance.i18n.__('total_spend')}`]: s.total_spend ? s.total_spend : '',
                [`${instance.i18n.__('total_debt')}`]: s.total_debt ? s.total_debt : '',
                [`${instance.i18n.__('total_favor')}`]: s.total_favor ? s.total_favor : '',
            })
        }
        const xls = json2xls(suppliers_excel);
        const timeStamp = new Date().getTime()
        fs.writeFileSync(`./static/suppliers_excel-${timeStamp}.xls`, xls, "binary");
        reply.sendFile(`./suppliers_excel-${timeStamp}.xls`);

        setTimeout(() => {
            fs.unlink(`./static/suppliers_excel-${timeStamp}.xls`, (err) => {
                console.log(`Deleted suppliers_excel-${timeStamp}.xls`)
                if (err) {
                    instance.send_Error(
                        "exported file",
                        JSON.stringify(err)
                    );
                }
            });
        }, 2000);

    } catch (error) {
        reply.error(error.message)
    }
    return reply;
}

async function supplierTransactionsGetExelNew(request, reply, instance) {
    try {
        const { limit, page, supplier_name, service } = request.body;
        const { name } = request.params;
        const user = request.user;
        // const user_available_services = user.services.map(serv => instance.ObjectId(serv.service));

        const $match = {
            $match: {
                organization: user.organization,
                is_deleted: { $ne: true },
            },
        };
        if (supplier_name)
            $match.$match.supplier_name = {
                $regex: supplier_name,
                $options: 'i'
            }


        const process = await instance.ProcessModel
            .findOne({
                user_id: user._id,
                organization: user.organization,
                name: 'supplier-transactions',
                // processing: true,
                // is_send: false,
            })
            .lean()

        if (process) {
            if (process.percentage == 100) {
                // reply.sendFile(process.path);
                reply.ok({
                    percentage: process.percentage,
                    path: process.path
                })
                await instance.ProcessModel
                    .findOneAndUpdate(
                        {
                            _id: process._id
                        },
                        {
                            processing: false,
                            is_send: true,
                        },
                        { lean: true },
                    )
                setTimeout(() => {
                    fs.unlink(`./static/${process.path}`, (err) => {
                        console.log(`Deleted ${process.path}`)
                        if (err) {
                            instance.send_Error(
                                "exported file",
                                JSON.stringify(err)
                            );
                        }
                    });
                }, 30000);
                await instance.ProcessModel.findByIdAndDelete(process._id)
                return
            }
            return reply.ok({ percentage: process.percentage })
        } else {
            await instance.ProcessModel.create({
                user_id: user._id,
                processing: true,
                organization: user.organization,
                name: 'supplier-transactions',
                percentage: 0,
                path: ''
            })
        }
        // $match.$match.service = service
        const $lookup_transactions = {
            $lookup: {
                from: 'suppliertransactions',
                let: { id: '$_id' },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ['$$id', '$supplier_id'] },
                                    { $ne: ['$status', 'pending'] },
                                    // { $in: ['$service', user_available_services] },
                                ]
                            },
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            allSum: {
                                $sum: '$balance',
                            },
                            document_ids: {
                                $push: '$document_id'
                            }
                        }
                    }
                ],
                as: 'transactions'
            }
        }

        const $project_after_transactions_lookup = {
            $project: {
                supplier_name: 1,
                document_ids: { $first: '$transactions.document_ids' },
                allSum: { $first: '$transactions.allSum' },
            }
        }

        const $lookup_purchases = {
            $lookup: {
                from: 'inventorypurchases',
                let: {
                    id: '$_id', document_ids: {
                        $cond: [
                            { $isArray: '$document_ids' },
                            '$document_ids',
                            [],
                        ]
                    }
                },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ['$$id', '$supplier_id'] },
                                    { $ne: ['$status', 'pending'] },
                                    // { $eq: ['$service', instance.ObjectId(service)] },
                                    // { $in: ['$service', user_available_services] },
                                    { $not: { $in: ['$p_order', '$$document_ids'] } },
                                ]
                            },
                            // p_order: { $nin: '$$document_ids' },
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            allSum: {
                                $sum: {
                                    $cond: [
                                        { $eq: ["$type", "coming"] },
                                        {
                                            $multiply: ['$balance', -1]
                                        },
                                        '$balance',
                                    ]
                                },
                            },
                        }
                    }
                ],
                as: 'purchases'
            }
        }
        const $project_after_purchase_lookup = {
            $project: {
                supplier_name: 1,
                balance: {
                    $add: [
                        {
                            $cond: [
                                {
                                    $isNumber: '$allSum',
                                },
                                '$allSum',
                                0,
                            ],
                        },
                        {
                            $cond: [
                                {
                                    $isNumber: {
                                        $first: '$purchases.allSum'
                                    },
                                },
                                {
                                    $first: '$purchases.allSum'
                                },
                                0,
                            ],
                        },
                        // {
                        //     $max: ['$allSum', 0]
                        // },
                        // {
                        //     $max: [
                        //         {
                        //             $first: '$purchases.allSum'
                        //         },
                        //         0,
                        //     ],
                        // },
                    ],
                },
            }
        }
        reply.ok({ percentage: 50 })
        await instance.ProcessModel
            .findOneAndUpdate(
                {
                    user_id: user._id,
                    organization: user.organization,
                    name: 'supplier-transactions',
                    processing: true
                },
                {
                    percentage: 50,
                },
                { lean: true },
            )
        if (service) {
            $lookup_transactions.$lookup.pipeline[0].$match.$expr.$and.push({
                $or: [
                    { $eq: ['$service', service + ''] },
                    { $eq: ['$service', instance.ObjectId(service)] },
                ]
            })
            $lookup_purchases.$lookup.pipeline[0].$match.$expr.$and.push({
                $or: [
                    { $eq: ['$service', service + ''] },
                    { $eq: ['$service', instance.ObjectId(service)] },
                ]
            })
        }
        // console.log('start...');
        const suppliers = await instance.adjustmentSupplier
            .aggregate([
                $match,
                $lookup_transactions,
                $project_after_transactions_lookup,
                $lookup_purchases,
                $project_after_purchase_lookup,
                // $project
            ])
            .allowDiskUse(true)
            .exec();
        // console.log('end...');
        await instance.ProcessModel
            .findOneAndUpdate(
                {
                    user_id: user._id,
                    organization: user.organization,
                    name: 'supplier-transactions',
                    processing: true
                },
                {
                    percentage: 90,
                },
                { lean: true },
            )
        if (user.ui_language && user.ui_language.value != undefined) {
            instance.i18n.setLocale('uz')
        }
        const suppliers_excel = []
        let index = 1;

        for (const s of suppliers) {
            // s.balance = await calculateSupplierBalance(instance, s)
            suppliers_excel.push({
                [`${instance.i18n.__('number')}`]: index++,
                [`${instance.i18n.__('supplier_name')}`]: s.supplier_name,
                // [`${instance.i18n.__('total_receive')}`]: s.total_receive ? s.total_receive : '',
                // [`${instance.i18n.__('total_spend')}`]: s.total_spend ? s.total_spend : '',
                // [`${instance.i18n.__('total_debt')}`]: s.total_debt ? s.total_debt : '',
                // [`${instance.i18n.__('total_favor')}`]: s.total_favor ? s.total_favor : '',
                [`${instance.i18n.__('total_balance')}`]: s.balance ? s.balance : 0,
            })
        }
        const xls = json2xls(suppliers_excel);
        const timeStamp = new Date().getTime()
        fs.writeFileSync(`./static/suppliers_excel-${timeStamp}.xls`, xls, "binary");
        await instance.ProcessModel
            .findOneAndUpdate(
                {
                    user_id: user._id,
                    organization: user.organization,
                    name: 'supplier-transactions',
                    processing: true
                },
                {
                    percentage: 100,
                    processing: false,
                    path: `suppliers_excel-${timeStamp}.xls`,
                },
                { lean: true },
            )
        // reply.sendFile(`./suppliers_excel-${timeStamp}.xls`);

        // setTimeout(() => {
        //     fs.unlink(`./static/suppliers_excel-${timeStamp}.xls`, (err) => {
        //         console.log(`Deleted suppliers_excel-${timeStamp}.xls`)
        //         if (err) {
        //             instance.send_Error(
        //                 "exported file",
        //                 JSON.stringify(err)
        //             );
        //         }
        //     });
        // }, 2000);
        return

        // const $sort = { $sort: { _id: 1 } };

        // const $skip = { $skip: (page - 1) * limit };
        // const $limit = { $limit: limit };

        // const $lookup = {
        //     $lookup: {
        //         from: 'suppliertransactions',
        //         localField: '_id',
        //         foreignField: 'supplier_id',
        //         as: 'transactions'
        //     }
        // }
        // const $unwind = {
        //     $unwind: {
        //         path: '$transactions',
        //         preserveNullAndEmptyArrays: true
        //     }
        // }
        // const $group = {
        //     $group: {
        //         _id: '$_id',
        //         supplier_name: { $first: '$supplier_name' },
        //         balance: { $first: '$balance' },
        //     }
        // }
        // const $project = {
        //     $project: {
        //         supplier_name: 1,
        //         balance: 1,
        //     }
        // }
        // const pipeline = [
        //     $match,
        //     $sort
        // ];
        // if (!name) {
        //     pipeline.push($skip);
        //     pipeline.push($limit);
        // }
        // // pipeline.push($lookup);
        // // pipeline.push($unwind);
        // // pipeline.push($group);
        // pipeline.push($sort);
        // pipeline.push($project);
        // const suppliers = await instance.adjustmentSupplier.aggregate(pipeline).allowDiskUse(true).exec();
        // // for (const index in suppliers) {
        // //     try {
        // //         suppliers[index].total_receive = Math.round(suppliers[index].total_receive * 100) / 100;
        // //         suppliers[index].total_spend = Math.round(suppliers[index].total_spend * 100) / 100;
        // //         suppliers[index].total_debt = Math.round(suppliers[index].total_debt * 100) / 100;
        // //         suppliers[index].total_favor = Math.round(suppliers[index].total_favor * 100) / 100;
        // //     }
        // //     catch (error) {
        // //         console.log(error.message)
        // //     }
        // // }

        // if (!name) {
        //     const total = await instance.adjustmentSupplier.countDocuments($match.$match);
        //     return reply.ok({
        //         total,
        //         data: suppliers
        //     })
        // }
        // if (user.ui_language && user.ui_language.value != undefined) {
        //     instance.i18n.setLocale('uz')
        // }
        // const suppliers_excel = []
        // let index = 1;

        // for (const s of suppliers) {
        //     // s.balance = await calculateSupplierBalance(instance, s)
        //     suppliers_excel.push({
        //         [`${instance.i18n.__('number')}`]: index++,
        //         [`${instance.i18n.__('supplier_name')}`]: s.supplier_name,
        //         // [`${instance.i18n.__('total_receive')}`]: s.total_receive ? s.total_receive : '',
        //         // [`${instance.i18n.__('total_spend')}`]: s.total_spend ? s.total_spend : '',
        //         // [`${instance.i18n.__('total_debt')}`]: s.total_debt ? s.total_debt : '',
        //         // [`${instance.i18n.__('total_favor')}`]: s.total_favor ? s.total_favor : '',
        //         [`${instance.i18n.__('total_balance')}`]: s.balance ? s.balance : 0,
        //     })
        // }
        // const xls = json2xls(suppliers_excel);
        // const timeStamp = new Date().getTime()
        // fs.writeFileSync(`./static/suppliers_excel-${timeStamp}.xls`, xls, "binary");
        // reply.sendFile(`./suppliers_excel-${timeStamp}.xls`);

        // setTimeout(() => {
        //     fs.unlink(`./static/suppliers_excel-${timeStamp}.xls`, (err) => {
        //         console.log(`Deleted suppliers_excel-${timeStamp}.xls`)
        //         if (err) {
        //             instance.send_Error(
        //                 "exported file",
        //                 JSON.stringify(err)
        //             );
        //         }
        //     });
        // }, 2000);

    } catch (error) {
        reply.error(error.message)
        await instance.ProcessModel
            .findOneAndDelete({
                user_id: user._id,
                organization: user.organization,
                name: 'supplier-transactions',
            })
    }
    return reply;
}

async function calculateSuppliersBalance(instance, supplier_ids, user_available_services) {
    const query = {
        supplier_id: { $in: supplier_ids },
        status: { $ne: 'pending' },
        service: { $in: user_available_services },
    };

    const transactions = await instance.supplierTransaction.find(query).lean();
    const transactionsObj = {}
    const suppliersObj = {}

    for (const transaction of transactions) {
        if (transactionsObj[transaction.supplier_id])
            transactionsObj[transaction.supplier_id].push(transaction)
        else
            transactionsObj[transaction.supplier_id] = [transaction]
    }
    const data = transactions

    allSum = 0
    const getFloat = num => isNaN(parseFloat(num)) ? 0 : parseFloat(num)

    const purChase = await instance.inventoryPurchase.find(query).lean();

    const purchasesObj = {}
    for (const purchase of purChase) {
        if (purchasesObj[purchase.supplier_id])
            purchasesObj[purchase.supplier_id].push(purchase)
        else
            purchasesObj[purchase.supplier_id] = [purchase]
    }

    for (const transaction of transactions) {
        if (suppliersObj[transaction.supplier_id + ''])
            suppliersObj[transaction.supplier_id + ''].total_balance +=
                transaction.status == 'pending'
                    ? 0
                    : getFloat(transaction.balance)
        else
            suppliersObj[transaction.supplier_id + ''] = {
                total_balance: transaction.status == 'pending'
                    ? 0
                    : getFloat(transaction.balance)
            }

        // allSum += transactions[i].status == 'pending'
        //     ? 0
        //     : getFloat(transactions[i].balance)
    }

    for (const [index, item] of purChase.entries()) {
        if (transactionsObj[item.supplier_id]) {
            if (!transactionsObj[item.supplier_id].find(x => x.document_id == item.p_order) && item.status != 'pending') {

                if (suppliersObj[item.supplier_id]) {
                    if (item.type == 'coming')
                        suppliersObj[item.supplier_id].total_balance -=
                            item.status == 'pending'
                                ? 0
                                : getFloat(item.total)
                    else
                        if (item.type == 'refund')
                            suppliersObj[item.supplier_id].total_balance +=
                                item.status == 'pending'
                                    ? 0
                                    : getFloat(item.total)
                }
                else
                    if (item.type == 'coming')
                        suppliersObj[item.supplier_id] = {
                            total_balance: -item.status == 'pending' ? 0 : getFloat(item.total)
                        }
                    else
                        if (item.type == 'refund')
                            suppliersObj[item.supplier_id] = {
                                total_balance: +item.status == 'pending' ? 0 : getFloat(item.total)
                            }
            }
        }
    }

    return suppliersObj
}

async function supplierTransactionsGetExelFromDB(request, reply, instance) {
    try {
        const { limit, page, supplier_name, service } = request.body;
        const { name } = request.params;
        const user = request.user;
        const user_available_services = user.services.map(serv => instance.ObjectId(serv.service));

        if (service && !user_available_services.find(s => s + '' === service + ''))
            return reply.code(403).send('Forbidden Service')

        const $match = {
            $match: {
                organization: user.organization,
                is_deleted: { $ne: true },
            },
        };
        if (supplier_name)
            $match.$match.supplier_name = {
                $regex: supplier_name,
                $options: 'i'
            }

        const $sort = { $sort: { _id: 1 } };

        const $skip = { $skip: (page - 1) * limit };
        const $limit = { $limit: limit };

        const $project = {
            $project: {
                supplier_name: 1,
                // balance: 1,
                services: 1,
                balance: service
                    ? ({
                        $reduce: {
                            input: "$services",
                            initialValue: 0,
                            in: {
                                $sum: [
                                    {
                                        $cond: [
                                            {
                                                $eq: [
                                                    { $toString: "$$this.service" },
                                                    service + '',
                                                ],
                                            },
                                            "$$this.balance",
                                            0,
                                        ],
                                    },
                                    "$$value",
                                ],
                            },
                        },
                    })
                    : ({
                        $reduce: {
                            input: "$services",
                            initialValue: 0,
                            in: {
                                $sum: [
                                    "$$this.balance",
                                    "$$value",
                                ],
                            },
                        },
                    }),
            }
        }

        const pipeline = [
            $match,
            $sort
        ];

        if (!name) {
            pipeline.push($skip);
            pipeline.push($limit);
        }

        pipeline.push($sort);
        pipeline.push($project);

        const suppliers = await instance.adjustmentSupplier
            .aggregate(pipeline)
            .allowDiskUse(true)
            .exec();
        // for (const index in suppliers) {
        //     try {
        //         suppliers[index].total_receive = Math.round(suppliers[index].total_receive * 100) / 100;
        //         suppliers[index].total_spend = Math.round(suppliers[index].total_spend * 100) / 100;
        //         suppliers[index].total_debt = Math.round(suppliers[index].total_debt * 100) / 100;
        //         suppliers[index].total_favor = Math.round(suppliers[index].total_favor * 100) / 100;
        //     }
        //     catch (error) {
        //         console.log(error.message)
        //     }
        // }

        if (!name) {
            const total = await instance.adjustmentSupplier.countDocuments($match.$match);
            return reply.ok({
                total,
                data: suppliers
            })
        }
        if (user.ui_language && user.ui_language.value != undefined) {
            instance.i18n.setLocale('uz')
        }
        const suppliers_excel = []
        let index = 1;

        const suppsObj = await calculateSuppliersBalance(instance, suppliers.map(s => s._id), user_available_services)

        for (const supp of suppliers) {
            supp.balance = suppsObj[supp._id] && !isNaN(suppsObj[supp._id].total_balance)
                ? suppsObj[supp._id].total_balance
                : supp.balance
        }

        for (const s of suppliers) {
            // s.balance = await calculateSupplierBalance(instance, s)
            const services_balance = {}
            if (service)
                for (const serv of s.services) {
                    if (serv.service + '' == service + '')
                        services_balance[`${instance.i18n.__('total_balance')} [${serv.service_name}]`] = serv.balance ? serv.balance : 0
                }
            else
                for (const serv of s.services) {
                    services_balance[`${instance.i18n.__('total_balance')} [${serv.service_name}]`] = serv.balance ? serv.balance : 0
                }

            suppliers_excel.push({
                [`${instance.i18n.__('number')}`]: index++,
                [`${instance.i18n.__('supplier_name')}`]: s.supplier_name,
                // [`${instance.i18n.__('total_receive')}`]: s.total_receive ? s.total_receive : '',
                // [`${instance.i18n.__('total_spend')}`]: s.total_spend ? s.total_spend : '',
                // [`${instance.i18n.__('total_debt')}`]: s.total_debt ? s.total_debt : '',
                // [`${instance.i18n.__('total_favor')}`]: s.total_favor ? s.total_favor : '',
                ...services_balance,
                [`${instance.i18n.__('total_balance')}`]: s.balance ? s.balance : 0,
            })
        }
        const xls = json2xls(suppliers_excel);
        const timeStamp = new Date().getTime()
        fs.writeFileSync(`./static/suppliers_excel-${timeStamp}.xls`, xls, "binary");
        reply.sendFile(`./suppliers_excel-${timeStamp}.xls`);

        setTimeout(() => {
            fs.unlink(`./static/suppliers_excel-${timeStamp}.xls`, (err) => {
                console.log(`Deleted suppliers_excel-${timeStamp}.xls`)
                if (err) {
                    instance.send_Error(
                        "exported file",
                        JSON.stringify(err)
                    );
                }
            });
        }, 2000);

    } catch (error) {
        reply.error(error.message)
    }
    return reply;
}

module.exports = ((instance, options, next) => {

    const schema = {
        schema: {
            body: {
                type: 'object',
                required: ['limit', 'page'],
                properties: {
                    limit: {
                        type: 'integer',
                        minimum: 1,
                        maximum: 20
                    },
                    page: {
                        type: 'integer',
                        minimum: 1
                    },
                    supplier_name: {
                        type: 'string',
                        default: ''
                    }
                }
            }
        },
        attachValidation: true
    }

    instance.post(
        '/supplier-transactions/get',
        {
            ...schema,
            preValidation: [instance.authorize_admin],
            version: '1.0.0'
        },
        (request, reply) => {
            if (request.validationError) {
                return reply.validation(request.validationError.message)
            }
            return supplierTransactionsGet(request, reply, instance)
        }
    );

    const paramsSchema = {
        schema: {
            params: {
                type: 'object',
                required: [
                    'name', 'token'
                ],
                properties: {
                    token: {
                        type: 'string',
                        minLength: 1
                    },
                    name: {
                        type: 'string',
                        minLength: 1
                    }
                }
            }
        },
        attachValidation: true
    }

    instance.post(
        '/supplier-transactions/get/:token/:name',
        {
            preValidation: [
                (request, reply, then) => {
                    try {
                        const { token } = request.params;
                        request.headers['authorization'] = token;
                        request.headers['accept-user'] = 'admin';
                    }
                    catch (error) {
                        console.log(error)
                    }
                    then()
                },
                instance.authorize_admin
            ],
            ...paramsSchema
        },
        (request, reply) => {
            if (request.validationError) {
                return reply.validation(request.validationError.message)
            }
            request.body.limit = isNaN(request.body.limit) ? 10 : parseInt(request.body.limit)
            request.body.page = isNaN(request.body.page) ? 1 : parseInt(request.body.page)
            // request.body = {
            //     limit: 1,
            //     page: 1,
            //     supplier_name: ''
            // }
            // return supplierTransactionsGetExelNew(request, reply, instance)
            return supplierTransactionsGetExelFromDB(request, reply, instance)
        }
    )

    next()
})
