
async function draftDeleteHandler(request, reply, instance) {
    try {
        const { indexes } = request.body;
        const result = await instance.Receipts.deleteMany({
            _id: {
                $in: indexes
            },
            receipt_state: 'draft'
        })
        reply.ok(result)
    } catch (error) {
        reply.error(error.message)
    }
    return reply;
}

module.exports = ((instance, _, next) => {

    const bodySchema = {
        body: {
            type: 'object',
            required: [
                'indexes'
            ],
            properties: {
                indexes: {
                    type: 'array',
                    items: {
                        type: 'string',
                        minLength: 24,
                        maxLength: 24
                    }
                }
            }
        }
    }
    
    instance.post(
        '/receipt/draft-delete',
        {
            version: '1.0.0',
            attachValidation: true,
            preValidation: [ instance.authorize_employee ],
            schema: bodySchema
        },
        (request, reply) => {
            if(request.validationError) {
                return reply.validation(request.validationError.message)
            }
            draftDeleteHandler(request, reply, instance)
        }
    )

    next()
})
