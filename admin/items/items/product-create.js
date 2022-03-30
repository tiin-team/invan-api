
module.exports = ((instance, _, next) => {

  const productCreateSchema = {
    body: {
      type: 'object',
      required: [
        'name', 'barcode', 'sold_by'
      ],
      properties: {
        name: {
          type: 'string',
          minLength: 1
        },
        barcode: {
          type: 'string',
          pattern: '^[0-9]{5,}$'
        },
        sold_by: {
          type: 'string',
          enum: [
            'each', 'weight', 'box', 'litre', 'metre', 'pcs'
          ]
        }
      }
    }
  }

  instance.post(
    '/product/create',
    {
      version: '1.0.0',
      schema: productCreateSchema,
      attachValidation: true
    },
    async (request, reply) => {
      if (request.validationError) {
        return reply.validation(request.validationError.message)
      }
      const body = request.body;
      const exist = await instance.Products.findOne({ barcode: body.barcode });
      if (exist) {
        return reply.allready_exist('item', 411, { barcode: body.barcode })
      }
      const { _id: id } = await new instance.Products(body).save();
      reply.ok({ id })
      return reply;
    }
  )

  next()
})
