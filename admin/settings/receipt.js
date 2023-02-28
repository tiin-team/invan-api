module.exports = (instance, _, next) => {

  const getReceiptSchema = {
    schema: {
      body: {
        type: 'object',
        additionalProperties: false,
        properties: {
          service: { type: 'string', minLength: 24, maxLength: 24 },
        },
        required: ['service']
      }
    },
    attachValidation: true
  }

  const receiptGetHandler = async (request, reply) => {
    if (request.validationError) {
      return reply.validation(request.validationError.message)
    }
    try {
      const service_id = request.body.service
      const user = request.user
      const service = await instance.services.findById(service_id).exec();
      if (!service) {
        return reply.fourorfour('Service')
      }
      const settingsReceipt = await instance.settingReceipt.findOne({ service: service_id })
      if (!settingsReceipt) {
        return reply.fourorfour('Settings Receipt')
      }
      reply.ok(settingsReceipt)
    } catch (error) {
      reply.error(error.message)
    }
  }

  instance.post(
    '/settings/receipts/get',
    {
      version: '1.0.0',
      ...getReceiptSchema,
      preHandler: instance.authorize_admin
    },
    receiptGetHandler
  )

  const settingReceiptSchema = {
    schema: {
      body: {
        type: 'object',
        additionalProperties: false,
        properties: {
          service: { type: 'string', minLength: 24, maxLength: 24 },
          emailed_receipt: { type: 'string' },
          printed_receipt: { type: 'string' },
          header: { type: 'string', maxLength: 500 },
          footer: { type: 'string', maxLength: 500 },
          show_customer_info: { type: 'boolean' },
          show_comments: { type: 'boolean' }
        },
        required: [
          'emailed_receipt', 'printed_receipt', 'header',
          'footer', 'show_customer_info', 'show_comments'
        ]
      }
    },
    attachValidation: true
  }

  const settingReceiptUpdateHandler = async (request, reply) => {
    if (request.validationError) {
      return reply.validation(request.validationError.message)
    }
    try {
      const service_id = request.body.service
      const service = await instance.services.findById(service_id).exec();
      if (!service) {
        return reply.fourorfour('Service')
      }
      const settingReceipt = await instance.settingReceipt.findOne({service: service_id}).exec();
      if(settingReceipt) {
        await instance.settingReceipt.updateOne(
          {
            service: service_id
          },
          {
            $set: request.body
          }
        );
      }
      else {
        await new instance.settingReceipt(request.body).save();
      }
      return reply.ok();
    } catch (error) {
      return reply.error(error.message)
    }
  }

  instance.post(
    '/settings/receipts/update',
    {
      version: '1.0.0',
      ...settingReceiptSchema,
      preHandler: instance.authorize_admin
    },
    settingReceiptUpdateHandler
  )

  next()
}
