
async function employeesSet(request, reply, instance) {
    try {
        const { workgroup_order_id, employees } = request.body;
        const workgroup_order = await instance.WorkgroupOrder.findById(workgroup_order_id);
        if (!workgroup_order) {
            return reply.fourorfour('workgroup_order')
        }

        const user = request.user;

        for (const e of employees) {
            const employee = await instance.User.findById(e.employee_id);
            if (!employee) {
                return reply.fourorfour('Employee')
            }

            const exist = await instance.WorkgroupOrder.findOne({
                _id: workgroup_order._id,
                joined_employees: {
                    $elemMatch: {
                        workgroup_id: user.workgroup_id,
                        employee_id: employee._id
                    }
                }
            });
            if (!exist) {
                await instance.WorkgroupOrder.updateOne(
                    { _id: workgroup_order._id },
                    {
                        $push: {
                            joined_employees: {
                                workgroup_id: user.workgroup_id,
                                employee_id: employee._id,
                                employee_name: employee.name,
                                quantity: e.quantity,
                                date: new Date().getTime()
                            }
                        }
                    }
                )
            }
            else {
                await instance.WorkgroupOrder.updateOne(
                    {
                        _id: workgroup_order._id,
                        joined_employees: {
                            $elemMatch: {
                                workgroup_id: user.workgroup_id,
                                employee_id: employee._id,
                            }
                        }
                    },
                    {
                        $set: {
                            'joined_employees.$.quantity': e.quantity,
                            'joined_employees.$.date': new Date().getTime()
                        }
                    }
                )
            }
        }

        reply.ok(employees);
    } catch (error) {
        reply.error(error.message)
    }
    return reply;
};

module.exports = ((instance, _, next) => {

    const employeesGetSchema = {
        body: {
            type: 'object',
            required: [
                'workgroup_order_id',
                'employees'
            ],
            properties: {
                workgroup_order_id: {
                    type: 'string',
                    minLength: 24,
                    maxLength: 24
                },
                employees: {
                    type: 'array',
                    items: {
                        type: 'object',
                        required: [
                            'employee_id', 'quantity'
                        ],
                        properties: {
                            employee_id: {
                                type: 'string',
                                minLength: 24,
                                maxLength: 24
                            },
                            quantity: {
                                type: 'number',
                                minimum: 0
                            }
                        }
                    }
                }
            }
        }
    }

    instance.post(
        '/workgroup/order/employees/set',
        {
            version: '1.0.0',
            schema: employeesGetSchema,
            attachValidation: true,
            preValidation: [instance.authorize_employee]
        },
        (request, reply) => {
            if (request.validationError) {
                return reply.validation(request.validationError.message)
            }
            employeesSet(request, reply, instance);
        }
    )

    next();
});
