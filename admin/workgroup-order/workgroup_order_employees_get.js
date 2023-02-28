

async function employeesGet(request, reply, instance) {
    try {
        let { workgroup_order_id, workgroup_id } = request.body;
        const workgroup_order = await instance.WorkgroupOrder.findById(workgroup_order_id);
        if (!workgroup_order) {
            return reply.fourorfour('workgroup_order');
        }
        workgroup_id = instance.ObjectId(workgroup_id);

        const $match = {
            $match: {
                _id: workgroup_order._id
            }
        }

        const $unwind = {
            $unwind: {
                path: '$joined_employees'
            }
        }

        const $project = {
            $project: {
                workgroup_id: '$joined_employees.workgroup_id',
                employee_id: '$joined_employees.employee_id',
                quantity: '$joined_employees.quantity',
                employee_name: '$joined_employees.employee_name'
            }
        }

        const $lookup = {
            $lookup: {
                from: 'users',
                localField: 'employee_id',
                foreignField: '_id',
                as: 'employees'
            }
        }

        const $projectEmployee = {
            $project: {
                workgroup_id: 1,
                employee_id: 1,
                quantity: 1,
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
                }
            }
        }

        const employees = await instance.WorkgroupOrder.aggregate([
            $match,
            $unwind,
            $project,
            $lookup,
            $projectEmployee
        ]).allowDiskUse(true).exec();

        reply.ok(employees);
    } catch (error) {
        reply.error(error.message);
    }
    return reply;
}

module.exports = ((instance, _, next) => {

    const employeesGetSchema = {
        body: {
            type: 'object',
            required: [
                'workgroup_order_id',
                'workgroup_id'
            ],
            properties: {
                workgroup_order_id: {
                    type: 'string',
                    minlength: 24,
                    maxLength: 24
                },
                workgroup_id: {
                    type: 'string',
                    minlength: 24,
                    maxLength: 24
                }
            }
        }
    }

    instance.post(
        '/workgroup/order/employees-worked/get',
        {
            version: '1.0.0',
            schema: employeesGetSchema,
            attachValidation: true,
            preValidation: instance.authorize_admin,
        },
        (request, reply) => {
            if (request.validationError) {
                return reply.validation(request.validationError.message)
            }
            employeesGet(request, reply, instance)
        }
    )

    next()
})
