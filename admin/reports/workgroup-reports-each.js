
async function workgroupOrdersReport(request, reply, instance) {
    try {
        const user = request.user;
        const result = await instance.WorkgroupOrder.eachOrderReport(request.body, user)
        reply.ok(result)
    } catch (error) {
        reply.error(error.message)
    }
    return reply;
}

module.exports = ((instance, _, next) => {

    const schema = {
        schema: {
            body: {
                type: 'object',
                required: [
                    'start_time', 'end_time',
                    'limit', 'page', 'workgroup_id'
                ],
                properties: {
                    start_time: {
                        type: 'number',
                        minimum: 0
                    },
                    end_time: {
                        type: 'number',
                        minimum: 0
                    },
                    limit: {
                        type: 'integer',
                        minimum: 1,
                        maximum: 10
                    },
                    page: {
                        type: 'number',
                        minimum: 1
                    },
                    workgroup_id: {
                        type: 'string',
                        minLength: 24,
                        maxLength: 24
                    }
                }
            }
        }
    }

    instance.post(
        '/workgroup/orders-each/report',
        {
            ...schema,
            version: '1.0.0',
            preValidation: [instance.authorize_admin],
            attachValidation: true
        },
        (request, reply) => {
            if (request.validationError) {
                return reply.validation(request.validationError.message)
            }
            return workgroupOrdersReport(request, reply, instance)
        }
    )

    next()
})