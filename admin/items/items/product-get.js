
module.exports = ((instance, _, next) => {

  const productGetSchema = {
    schema: {
      params: {
        type: 'object',
        additionalProperties: false,
        required: ['barcode'],
        properties: {
          barcode: {
            type: 'string',

            minLength: 5
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            statusCode: {
              type: 'number'
            },
            error: {
              type: 'string'
            },
            message: {
              type: 'string'
            },
            data: {
              type: 'object',
              properties: {
                barcode: {
                  type: 'string'
                },
                name: {
                  type: 'string'
                }
              }
            }
          }
        }
      }
    }
  }

  instance.get(
    '/product/get-by-barcode/:barcode',
    {
      version: '1.0.0',
      ...productGetSchema,
      attachValidation: true
    },
    async (request, reply) => {
      if (request.validationError) {
        return reply.validation(request.validationError.message)
      }
      try {
        const { barcode } = request.params;
        const item = await instance.Products.findOne({ barcode: barcode });
        if (!item) {
          return reply.fourorfour('Item');
        }
        reply.ok(item);
      } catch (error) {
        reply.error(error.message);
      }
      return reply;
    }
  )

  next()
})
