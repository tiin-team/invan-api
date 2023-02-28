
module.exports = ((instance, _, next) => {

  const createSimplePurchaseOrderSchema = {
    body: {
      type: 'object',
      additionalProperties: false,
      required: [
        'service', 'purchase_order_date',
        'supplier_id', 'expected_on', 'items'
      ],
      properties: {
        service: {
          type: 'string',
          minLength: 24,
          maxLength: 24
        },
        purchase_order_date: {
          type: 'number'
        },
        supplier_id: {
          type: 'string',
          minLength: 24,
          maxLength: 24
        },
        type: {
          type: 'string',
          enum: ['coming'],
          default: 'coming'
        },
        status: {
          type: 'string',
          enum: ['closed'],
          default: 'closed'
        },
        expected_on: {
          type: 'number'
        },
        received: {
          type: 'number',
          enum: [1],
          default: 1
        },
        total_count: {
          type: 'number',
          enum: [1],
          default: 1
        },
        total: {
          type: 'number',
          enum: [0],
          default: 0
        },
        total_currency: {
          type: 'string',
          enum: ['uzs'],
          default: 'uzs'
        },
        notes: {
          type: 'string'
        },
        additional_cost: {
          type: 'array',
          minItems: 0,
          maxItems: 0
        },
        items: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            additionalProperties: false,
            required: [
              'product_id'
            ],
            properties: {
              product_id: {
                type: 'string',
                minLength: 24,
                maxLength: 24
              },
              quality: {
                type: 'number',
                enumn: [0],
                default: 0
              },
              purchase_cost: {
                type: 'number',
                enumn: [0],
                default: 0
              },
              purchase_cost_currency: {
                type: 'string',
                enum: ['uzs'],
                default: 'uzs'
              },
              amount: {
                type: 'number',
                enumn: [0],
                default: 0
              }
            }
          }
        }
      }
    }
  }

  const checkServiceAndSupplier = async (req, reply) => {
    try {
      const service = await instance.services.findById(req.body.service);
      if (!service) {
        return reply.fourorfour('Service')
      }
      req.body.service_name = service.name

      const supplier = await instance.adjustmentSupplier.findById(req.body.supplier_id);
      if (!supplier) {
        return reply.fourorfour('Supplier')
      }
      req.body.supplier_name = supplier.supplier_name

    } catch (error) {
      return reply.error(error.message)
    }
  }

  instance.post(
    '/inventory/create_simple_purchase_order',
    {
      version: '1.0.0',
      schema: createSimplePurchaseOrderSchema,
      attachValidation: true,
      preValidation: instance.authorize_admin
    },
    async (request, reply) => {

      if (request.validationError) {
        return reply.validation(request.validationError.message)
      }
      checkServiceAndSupplier(request, reply)
      const user = request.user;
      try {
        const ordersCount = await instance.inventoryPurchase.countDocuments(
          {
            organization: user.organization
          }
        ).exec();

        const p_order = 'P' + ('00000000000' + (ordersCount + 1001)).slice(-5);
        const pData = {
          ...request.body,
          p_order: p_order,
          organization: user.organization,
          items: []
        }
        const purch = await new instance.inventoryPurchase(pData).save();
        const items = []
        for (const itm of request.body.items) {
          const item = await instance.goodsSales.findById(itm.product_id);
          if (item) {
            const saved = await new instance.purchaseItem({
              organization: user.organization,
              service: purch.service,
              purchase_id: purch._id,
              product_id: itm.product_id,
              sku: item.sku,
              price: item.price,
              cost: item.cost,
              barcode: item.barcode,
              ordered: 0,
              amount: 0
            }).save()
            items.push(saved)
          }
        }
        if (items.length == 0) {
          await instance.inventoryPurchase.deleteOne({ _id: purch._id });
          reply.error('Items not found')
        }
        else {
          reply.ok(purch)
        }
      } catch (error) {
        reply.error(error.message)
      }
      return reply;
    }
  )

  next()
})
