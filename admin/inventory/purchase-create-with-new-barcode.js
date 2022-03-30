
module.exports = ((instance, _, next) => {

  const purchaseOrderSchema = {
    schema: {
      body: {
        type: 'object',
        additionalProperties: false,
        required: [
          'purchase_order_date', 'service', 'supplier_id',
          'type', 'status', 'expected_on', 'notes',
          'additional_cost', 'items'
        ],
        properties: {
          purchase_order_date: {
            type: 'number'
          },
          service: {
            type: 'string',
            minLength: 24,
            maxLength: 24
          },
          supplier_id: {
            type: 'string',
            minLength: 24,
            maxLength: 24
          },
          type: {
            type: 'string',
            enum: ['coming', 'refund'],
            default: 'coming'
          },
          status: {
            type: 'string',
            enum: ['partially', 'pending', 'closed'],
            default: 'pending'
          },
          expected_on: {
            type: 'number'
          },
          notes: {
            type: 'string'
          },
          additional_cost: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: [
                'name', 'amount', 'amount_currency'
              ],
              properties: {
                name: {
                  type: 'string'
                },
                amount: {
                  type: 'number'
                },
                amount_currency: {
                  type: 'string',
                  default: 'uzs'
                }
              }
            }
          },
          items: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: [
                'barcode', 'quality', 'purchase_cost'
              ],
              properties: {
                barcode: {
                  type: 'string',
                  minLength: 5
                },
                quality: {
                  type: 'number'
                },
                purchase_cost: {
                  type: 'number'
                },
                purchase_cost_currency: {
                  type: 'string',
                  default: 'uzs'
                }
              }
            }
          }
        }
      }
    }
  }

  const purchaseOrderCreate = async (request, reply) => {
    try {
      const { items } = request.body;

    } catch (error) {
      return reply.error(error.message)
    }
  }

  instance.post(
    '/purchase/order/create/with/new-item-barcodes',
    {
      version: '1.0.0',
      attachValidation: true,
      ...purchaseOrderSchema,
      preValidation: instance.authorize_admin
    },
    (request, reply) => {
      if (request.validationError) {
        return reply.validation(request.validationError.message);
      }
      purchaseOrderCreate(request, reply)
      return reply;
    }
  )

  next()
})
