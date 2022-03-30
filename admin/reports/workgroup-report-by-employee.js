
async function reportEmployee(request, reply, instance) {
    try {
        const user = request.user;
        const { start_time, end_time, limit, page } = request.body;

        const $match = {
            $match: {
                organization: user.organization,
                createdAt: {
                    $gte: start_time,
                    $lte: end_time
                }
            }
        }
        const $unwind = {
            $unwind: {
                path: '$joined_employees'
            }
        }
        const $group = {
            $group: {
                _id: '$joined_employees.employee_id',
                employee_id: {
                    $last: '$joined_employees.employee_id'
                },
                employee_name: {
                    $last: '$joined_employees.employee_name'
                },
                workgroup_id: {
                    $last: '$joined_employees.workgroup_id'
                },
                workgroup_name: {
                    $last: '$joined_employees.workgroup_name'
                },
                quantity: {
                    $sum: '$joined_employees.quantity'
                },
                count: {
                    $sum: 1
                },
                date: {
                    $last: '$joined_employees.date'
                }
            }
        }
        const $count = {
            $group: {
                _id: null,
                total: {
                    $sum: 1
                }
            }
        }
        const $sort = {
            $sort: {
                _id: 1
            }
        }
        const $skip = {
            $skip: limit * (page - 1)
        }
        const $limit = {
            $limit: limit
        }
        const $lookupUser = {
            $lookup: {
                from: 'users',
                localField: 'employee_id',
                foreignField: '_id',
                as: 'employees'
            }
        }
        const $lookupWorkgroup = {
            $lookup: {
                from: 'workgroups',
                localField: 'workgroup_id',
                foreignField: '_id',
                as: 'workgroups'
            }
        }
        const $project = {
            $project: {
                quantity: 1,
                count: 1,
                date: 1,
                employee_name: {
                    $cond: {
                        if: {
                            $gt: [
                                { $size: '$employees' },
                                0
                            ]
                        },
                        then: {
                            $arrayElemAt: [
                                '$employees.name', 0
                            ]
                        },
                        else: 1
                    }
                },
                workgroup_name: {
                    $cond: {
                        if: {
                            $gt: [
                                { $size: '$workgroups' },
                                0
                            ]
                        },
                        then: {
                            $arrayElemAt: [
                                '$workgroups.name', 0
                            ]
                        },
                        else: 1
                    }
                },
            }
        }

        let total = await instance.WorkgroupOrder.aggregate([
            $match,
            $unwind,
            $group,
            $count
        ]).allowDiskUse(true).exec();

        total = total.length > 0 ? total[0].total : 0;

        const workgroup_orders = await instance.WorkgroupOrder.aggregate([
            $match,
            $unwind,
            $group,
            $sort,
            $skip,
            $limit,
            $lookupUser,
            $lookupWorkgroup,
            $project
        ]).allowDiskUse(true).exec();

        reply.ok({
            total,
            data: workgroup_orders
        })
    } catch (error) {
        reply.error(error.message);
    }
    return reply;
}

module.exports = ((instance, _, next) => {

    const bodySchema = {
        body: {
            type: 'object',
            required: [
                'start_time',
                'end_time',
                'limit',
                'page'
            ],
            properties: {
                start_time: {
                    type: 'number'
                },
                end_time: {
                    type: 'number'
                },
                limit: {
                    type: 'number'
                },
                page: {
                    type: 'number'
                },
            }
        }
    }

    instance.post(
        '/workgroup/report/employee',
        {
            version: '1.0.0',
            schema: bodySchema,
            attachValidation: true,
            preValidation: [instance.authorize_admin],
        },
        (request, reply) => {
            if (request.validationError) {
                return reply.validation(request.validationError.message)
            }
            reportEmployee(request, reply, instance)
        }
    )

    next()
})
