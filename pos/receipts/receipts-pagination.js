
module.exports = ((instance, _, next) => {

    const receiptSchema = {
        version: '1.0.0',
        schema: {
            params: {
                type: 'object',
                required: [
                    'limit', 'page'
                ],
                properties: {
                    limit: {
                        type: 'integer',
                        minimum: 1
                    },
                    page: {
                        type: 'integer',
                        minimum: 1
                    }
                }
            }
        },
        preValidation: [instance.authorize_employee]
    }

    instance.get(
        '/receipts/find/:limit/:page',
        receiptSchema,
        async (request, reply) => {
            try {
                const { limit, page } = request.params;
                const service = request.headers['accept-service'];
                const user = request.user;
                const organization = user.organization;
                const receipts = await instance.Receipts.aggregate([
                    {
                        $match: {
                            organization: organization,
                            service: service
                        }
                    },
                    {
                        $sort: {
                            date: -1
                        }
                    },
                    {
                        $skip: limit * (page - 1)
                    },
                    {
                        $limit: limit
                    }
                ])
                    .allowDiskUse(true)
                    .exec();

                reply.ok(receipts)
            } catch (error) {
                reply.error(error.message)
            }
            return reply;
        }
    )

    next()
})
