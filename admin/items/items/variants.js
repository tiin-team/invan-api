
const createVariantItem = async (request, reply, instance) => {
  console.log(request.body)
}

const updateVariantItem = async (request, reply, instance) => {
  const id = request.params.id
  const body = request.body

  try {
    const parent_item = await instance.goodsSales.findOne({
      variant_items: {
        $elemMatch: {
          $eq: instance.ObjectId(id)
        }
      }
    })
    if (!parent_item) {
      return reply.error('Parent not found')
    }
    const exist = await instance.goodsSales.findOne({
      name: body.name,
      _id: {
        $in: parent_item.variant_items,
        $nin: [id]
      }
    })
    if (exist) {
      return reply.allready_exist(body.name, 413)
    }

    const item = await instance.goodsSales.findOne({ _id: id })
    if (!item) {
      return reply.fourorfour('Item')
    }
    await instance.goodsSales.updateOne({
      _id: id
    }, {
      $set: body
    })

    reply.ok({ id: id })
  } catch (error) {
    reply.error('Could not update')
  }
}

module.exports = ((instance, _, next) => {

  const itemsVariantSchema = {
    body: {
      type: 'object',
      additionalProperties: false,
      required: [
        'name', 'price',
        'cost', 'default_purchase_cost',
        'sku', 'barcode', 'services'
      ],
      properties: {
        name: { type: 'string' },
        price: { type: 'number' },
        price_currency: {
          type: 'string',
          default: 'uzs'
        },
        cost: { type: 'number' },
        cost_currency: {
          type: 'string',
          default: 'uzs'
        },
        default_purchase_cost: { type: 'number' },
        purchase_cost_currency: {
          type: 'string',
          default: 'uzs'
        },
        sku: { type: 'number' },
        barcode: {
          type: 'array',
          items: { type: 'string' }
        },
        services: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: [
              'available', 'service', 'service_name',
              'price', 'in_stock'
            ],
            properties: {
              available: { type: 'boolean' },
              service: { type: 'string' },
              service_name: { type: 'string' },
              price: { type: 'number' },
              price_currency: {
                type: 'string',
                default: 'uzs'
              },
              price_auto_fill: { type: 'boolean' },
              prices: {
                type: 'array',
                default: [],
                items: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    from: { type: 'number' },
                    price: { type: 'number' },
                  }
                }
              },
              in_stock: {
                type: 'number'
              },
              low_stock: {
                oneOf: [
                  {
                    type: 'string',
                    enum: ['']
                  },
                  {
                    type: 'number'
                  }
                ]
              },
              optimal_stock: {
                oneOf: [
                  {
                    type: 'string',
                    enum: ['']
                  },
                  {
                    type: 'number'
                  }
                ]
              },
              reminder: {
                type: 'number',
                default: 0
              },
              variant_name: {
                type: 'string',
                default: ''
              },
              stopped_item: {
                type: 'boolean'
              }
            }
          }
        }
      }
    }
  }

  instance.post(
    '/items/variant/create',
    {
      version: '1.0.0',
      schema: itemsVariantSchema,
      attachValidation: true
    },
    (request, reply) => {
      if (request.validationError) {
        return reply.error(request.validationError)
      }
      instance.oauth_admin(request, reply, (user) => {
        request.user = user
        instance.check_sku_and_category(request, request.user.organization, (result) => {

          if (result.success) {
            return createVariantItem(request, reply, instance)
          }
          else {
            if (result.sku) {
              reply.send({
                statusCode: 411,
                message: 'SKU Allready exist'
              })
            }
            else if (result.barcode) {
              reply.send({
                statusCode: 412,
                message: 'Barcode Allready exist'
              })
            }
            else {
              reply.error('Error on creating item')
            }
          }
        })
      })
    }
  )

  instance.post(
    '/items/variant/update/:id',
    {
      version: '1.0.0',
      schema: itemsVariantSchema,
      attachValidation: true
    },
    (request, reply) => {
      if (request.validationError) {
        return reply.error(request.validationError.message)
      }

      instance.oauth_admin(request, reply, (user) => {
        request.user = user
        request.body.barcode = []
        instance.check_sku_and_category(request, request.user.organization, (result) => {
          if (result.success) {
            return updateVariantItem(request, reply, instance)
          }
          else {
            if (result.sku) {
              reply.send({
                statusCode: 411,
                message: 'SKU Allready exist'
              })
            }
            else if (result.barcode) {
              reply.send({
                statusCode: 412,
                message: 'Barcode Allready exist'
              })
            }
            else {
              reply.error('Error on creating item')
            }
          }
        })
      })
    }
  )

  next()
})
