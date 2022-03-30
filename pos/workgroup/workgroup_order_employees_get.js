
async function employeesGet(request, reply, instance) {
    try {
        const { workgroup_order_id } = request.body;
        const workgroup_order = await instance.WorkgroupOrder.findById(workgroup_order_id);
        if (!workgroup_order) {
            return reply.fourorfour('workgroup_order')
        }

        const user = request.user;
        const employees = await instance.User.find(
            {
                organization: user.organization,
                workgroup_id: user.workgroup_id
            },
            {
                name: 1
            }
        );
        const employees_list = [];
        for (const e of employees) {
            const exist = await instance.WorkgroupOrder.findOne({
                _id: workgroup_order._id,
                joined_employees: {
                    $elemMatch: {
                        workgroup_id: user.workgroup_id,
                        employee_id: e._id
                    }
                }
            });

            employees_list.push({
                employee_id: e._id,
                employee_name: e.name,
                quantity: 0
            })
            if (!exist) {
                await instance.WorkgroupOrder.updateOne(
                    { _id: workgroup_order._id },
                    {
                        $push: {
                            joined_employees: {
                                workgroup_id: user.workgroup_id,
                                employee_id: e._id,
                                employee_name: e.name,
                                quantity: 0,
                                date: new Date().getTime()
                            }
                        }
                    }
                )
            }
            else {
                let quantity = 0;
                if (exist.joined_employees instanceof Array) {
                    for (const q of exist.joined_employees) {
                        if (q.workgroup_id + '' == user.workgroup_id + '' && q.employee_id + '' == e._id + '') {
                            quantity = q.quantity
                        }
                    }
                }
                employees_list[employees_list.length - 1].quantity = quantity
            }
        }

        reply.ok(employees_list);
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
                'workgroup_order_id'
            ],
            properties: {
                workgroup_order_id: {
                    type: 'string',
                    minLength: 24,
                    maxLength: 24
                }
            }
        }
    }

    instance.post(
        '/workgroup/order/employees/get',
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
            employeesGet(request, reply, instance);
        }
    )

    next();
});
