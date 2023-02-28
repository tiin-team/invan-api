
const fp = require('fastify-plugin')

async function taskAddHandler(request, reply, instance) {
    try {
        const user = request.user;
        const body = request.body;
        const data = []
        for (const index in body) {
            const employee_id = body[index].employee_id;
            const employee = await instance.User.findById(employee_id);
            if (!employee) {
                return reply.fourorfour(employee_id)
            }
            data.push({
                ...body[index],
                employee_id: employee._id,
                organization: user.organization
            })
        }
        const result = [];
        for (const d of data) {
            const saved = await instance.UserTask.saveTask(d);
            result.push(saved);
        }
        reply.ok(result);
    } catch (error) {
        reply.error(error.message)
    }
    return reply;
}

module.exports = fp((instance, _, next) => {

    const bodySchema = {
        body: {
            type: 'array',
            minItems: 1,
            items: {
                type: 'object',
                required: [
                    'employee_id',
                    'weight'
                ],
                properties: {
                    employee_id: {
                        type: 'string',
                        minLength: 24,
                        maxLength: 24
                    },
                    weight: {
                        type: 'number',
                        minimum: 0
                    }
                }
            }
        }
    }

    instance.post(
        '/tasks/add',
        {
            schema: bodySchema,
            attachValidation: true,
            preValidation: [instance.authorize_employee],
            version: '1.0.0',
        },
        (request, reply) => {
            if (request.validationError) {
                return reply.validation(request.validationError.message)
            }
            taskAddHandler(request, reply, instance)
        }
    )

    next()
})
