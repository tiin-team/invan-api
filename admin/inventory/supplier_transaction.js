
const fs = require("fs");
const json2xls = require("json2xls");

async function supplierTransactionsGet(request, reply, instance) {
    try {
        const { limit, page, supplier_name, service } = request.body;
        const { name } = request.params;
        const user = request.user;

        // const user_available_services = user.services.map(serv => serv.service + '');

        const query_service_index = user.services
            .findIndex(
                serv => serv.service + '' == service
            )

        if (service && query_service_index == -1) return reply.code(403).send('Forbidden service')

        // const service_ids = service && query_service_index != -1
        //     ? [service]
        //     : user_available_services

        const $match = {
            $match: {
                organization: user.organization,
                supplier_name: { $regex: supplier_name, $options: 'i' },
                is_deleted: { $ne: true },
            },
        };
        // if (service) $match.$match.service = service;
        // else $match.$match.service = { $in: user.services };
        const $sort = { $sort: { _id: 1 } };
        const $skip = { $skip: (page - 1) * limit };
        const $limit = { $limit: limit };

        const $lookup = {
            $lookup: {
                from: 'suppliertransactions',
                localField: '_id',
                foreignField: 'supplier_id',
                as: 'transactions',
            },
        };

        // const $lookupInv = {
        //     $lookup: {
        //         from: 'inventorypurchases',
        //         let: { supp_id: '$_id', document_id: '$document_id' },
        //         pipeline: [
        //             {
        //                 $match: {
        //                     $expr: {
        //                         $and: [
        //                             { $eq: ['$organization', user.organization] },
        //                             { $in: [{ $toString: '$service' }, service_ids] },
        //                             {
        //                                 $eq: [
        //                                     { $toString: '$$supp_id' },
        //                                     { $toString: '$supplier_id' },
        //                                 ],
        //                             },
        //                             { $ne: ['pending', '$status'] },
        //                             { $ne: ['$$document_id', '$p_order'] },
        //                         ]
        //                     },
        //                 },
        //             },
        //             {
        //                 $project: {
        //                     type: 1,
        //                     balance_type: 'cash',
        //                     balance: {
        //                         $cond: [
        //                             { $eq: ['$type', 'coming'] },
        //                             '$total',
        //                             '$total',
        //                         ],
        //                     },
        //                     total_currency: 1,
        //                     purchase_order_date: 1,
        //                     p_order: 1,
        //                     _id: 1,
        //                     ordered_by_name: 1,
        //                     type: 1,
        //                     status: 1,
        //                     supplier_id: 1,
        //                 },
        //             },
        //         ],
        //         as: 'inv_purchases',
        //     }
        // }
        // const $unwindInv = {
        //     $unwind: { path: '$inv_purchases' },
        // };
        const $unwind = {
            $unwind: { path: '$transactions' },
        };
        const $group = {
            $group: {
                _id: '$_id',
                supplier_name: { $first: '$supplier_name' },
                balance: { $first: '$balance' },
                phone_number: { $first: '$phone_number' },
                total_spend: {
                    $sum: {
                        $cond: {
                            if: { $gt: ['$transactions.balance', 0] },
                            then: '$transactions.balance',
                            else: 0,
                        },
                    },
                },
                total_receive: {
                    $sum: {
                        $cond: {
                            if: { $lt: ['$transactions.balance', 0] },
                            then: '$transactions.balance',
                            else: 0,
                        },
                    },
                },
            },
        };
        const $fixProject = {
            $project: {
                balance: 1,
                supplier_name: 1,
                phone_number: 1,
                total_spend: { $abs: '$total_spend' },
                total_receive: { $abs: '$total_receive' },
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
                },
            },
        };
        const $project = {
            $project: {
                supplier_name: 1,
                balance: 1,
                phone_number: 1,
                total_spend: 1,
                total_receive: 1,
                total_debt: {
                    $cond: {
                        if: { $gt: ['$total_debt', 0] },
                        then: '$total_debt',
                        else: undefined
                    }
                },
                total_favor: {
                    $cond: {
                        if: { $lt: ['$total_debt', 0] },
                        then: { $abs: '$total_debt' },
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
        };

        const pipeline = [$match];

        if (!name) pipeline.push($skip, $limit);
        // pipeline.push($lookupInv);
        // pipeline.push($unwindInv);
        // pipeline.push($lookup);
        // pipeline.push($unwind);
        pipeline.push($group);
        pipeline.push($fixProject);
        pipeline.push($sort);
        pipeline.push($project);
        // pipeline.push($sort);

        const suppliers = await instance.adjustmentSupplier.aggregate(pipeline)
            .allowDiskUse(true)
            .exec()

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
                limit: limit,
                current_page: page,
                page: Math.ceil(total / limit),
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
        return reply.error(error.message)
    }
    return reply;
}
async function supplierTransactionsGetExelNew(request, reply, instance) {
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
                is_deleted: { $ne: true },
            },
        };
        if (service) {
            $match.$match.service = service
        }
        const $sort = { $sort: { _id: 1 } };

        const $skip = { $skip: (page - 1) * limit };
        const $limit = { $limit: limit };;

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
                supplier_name: { $first: '$supplier_name' },
                balance: { $first: '$balance' },
            }
        }
        const $project = {
            $project: {
                supplier_name: 1,
                balance: 1,
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
        // pipeline.push($lookup);
        // pipeline.push($unwind);
        // pipeline.push($group);
        pipeline.push($sort);
        pipeline.push($project);
        const suppliers = await instance.adjustmentSupplier.aggregate(pipeline).allowDiskUse(true).exec();
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
        for (const s of suppliers) {
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
            supplierTransactionsGet(request, reply, instance)
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

    instance.get(
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
            request.body = {
                limit: 1,
                page: 1,
                supplier_name: ''
            }
            return supplierTransactionsGetExelNew(request, reply, instance)
        }
    )

    next()
})
