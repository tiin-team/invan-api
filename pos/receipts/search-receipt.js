
module.exports = ((instance, _, next) => {

  const receiptSchema = {
    version: '1.0.0',
    schema: {
      body: {
        type: 'object',
        required: [
          'search'
        ],
        properties: {
          search: {
            type: 'string',
            minLength: 2
          }
        }
      }
    },
    preValidation: instance.authorize_employee
  }

  instance.post(
    '/receipt/search',
    receiptSchema,
    async (request, reply) => {
      try {
        const user = request.user;
        const { search } = request.body;
        const service = request.headers['accept-service'];
        const receipts = await instance.Receipts.find({
          organization: user.organization,
          service: service,
          receipt_no: {
            $regex: search,
            $options: 'i'
          }
        });
        reply.ok(receipts)
      } catch (error) {
        reply.error(error.message)
      }
      return reply;
    }
  )

  next()
})
