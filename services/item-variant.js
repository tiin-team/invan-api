

const updateGoodVariants = async (request, reply, instance) => {
  try {
    const user = request.user
    const service = request.headers['accept-service']
    let all_skus = []
    const childs = []
    const variant_ids = []
    for (const item of request.body) {
      all_skus.push(item.sku)
      variant_ids.push(item._id)
      childs.push({
        ...item,
        variant_of: item.name
      })
    }

    const item_id = childs[0]._id
    const parent = await instance.goodsSales.findOne({
      $or: [
        {
          variant_items: {
            $elemMatch: {
              $eq: instance.ObjectId(item_id)
            }
          }
        }, {
          variant_items: {
            $elemMatch: {
              $eq: item_id
            }
          }
        }
      ]
    })

    if (!parent) {
      return reply.fourorfour('Parent item')
    }
    if ([...new Set(all_skus)].length != all_skus.length) {
      return reply.allready_exist('Item')
    }
    let exist = false

    for (const child of childs) {
      exist = exist || await instance.goodsSales.findOne({
        organization: user.organization,
        sku: child.sku,
        _id: {
          $nin: variant_ids
        }
      })
    }

    if (exist) {
      return reply.allready_exist('Item')
    }

    for (const item of childs) {
      const res = await instance.updateGoodsSales(item._id, item, user, service)
      console.log(res)
    }
    reply.ok()

  } catch (error) {
    instance.send_Error('goods/variants/update_group', JSON.stringify(error))
    return reply.error(error.message ? error.message : error)
  }
}

const checkVariants = async (request, reply, instance) => {
  try {
    const all_skus = []
    const all_ids = []
    const body = request.body
    const user = request.user
    const item_id = body[0]._id
    for (const b of body) {
      all_skus.push(b.sku)
      all_ids.push(b._id)
    }

    const parent = await instance.goodsSales.findOne({
      $or: [
        {
          variant_items: {
            $elemMatch: {
              $eq: instance.ObjectId(item_id)
            }
          }
        }, {
          variant_items: {
            $elemMatch: {
              $eq: item_id
            }
          }
        }
      ]
    })

    if ([...new Set(all_skus)].length != all_skus.length || !parent) {
      return reply.fourorfour('Item Parent')
    }
    const exist_skus = []
    for (const b of body) {
      const exist_sku = await instance.goodsSales.findOne({
        organization: user.organization,
        sku: b.sku,
        _id: {
          $nin: all_ids
        }
      })
      if (exist_sku) {
        exist_skus.push(b.sku)
      }
    }

    if (exist_skus.length > 0) {
      return reply.allready_exist('Sku', 411, exist_skus)
    }
    return reply.ok()
  } catch (error) {
    return reply.error(error.message)
  }
}

module.exports = ((instance, _, next) => {

  const goodVariantsSchema = {
    body: {
      type: 'array',
      items: {
        type: 'object',
        required: [
          '_id', 'name', 'sku', 'price',
          'in_stock', 'cost', 'item_type'
        ],
        properties: {
          _id: { type: 'string' },
          name: {
            type: 'string',
            minLength: 1
          },
          sku: { type: 'number' },
          price: { type: 'number' },
          in_stock: { type: 'number' },
          cost: { type: 'number' },
          item_type: {
            type: 'string',
            enum: ['variant', 'item']
          },
          category: { type: 'string' },
          sold_by: {
            type: 'string',
            enum: ['each', 'weight', 'box', 'litre', 'metre', 'pcs']
          },
          barcode: {
            type: 'array',
            items: {
              type: 'string',
              minLength: 1
            }
          },
          stopped_item: { type: 'boolean' },
          is_track_stock: { type: 'boolean' },
          representation_type: {
            type: 'string',
            enum: ['color', 'image']
          },
          shape: { type: 'string' },
          representation: { type: 'string' }
        }
      }
    }
  }

  instance.post(
    '/goods/variants/update_group',
    {
      version: '1.0.0',
      schema: goodVariantsSchema,
      attachValidation: true
    },
    (request, reply) => {
      if (request.validationError) {
        return reply.validation(request.validationError.message)
      }
      instance.authorization(request, reply, (user) => {
        if (!user) {
          return reply.unauth_user()
        }
        return updateGoodVariants(request, reply, instance)
      })
    }
  )

  const checkVariantSchema = {
    body: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['_id', 'sku'],
        properties: {
          _id: { type: 'string' },
          sku: { type: 'number' }
        }
      }
    }
  }

  instance.post(
    '/goods/variants/check',
    {
      version: '1.0.0',
      schema: checkVariantSchema,
      attachValidation: true
    },
    (request, reply) => {
      if (request.validationError) {
        return reply.validation(request.validationError.message)
      }
      instance.authorization(request, reply, (user) => {
        request.user = user
        return checkVariants(request, reply, instance)
      })
    }
  )

  next()
})

