module.exports = (instance, options, next) => {

  // get discount list

  const list_of_discounts = async (request, reply, admin) => {
    const query = { organization: admin.organization }
    if (request.body) {
      if (request.body.services) {
        if (request.body.services.length > 0) {
          query.services = { $elemMatch: { service: { $in: request.body.services }, available: { $eq: true } } }
        }
      }
      if (typeof request.body.service == typeof 'invan' && request.body.service != '') {
        query.services = { $elemMatch: { service: { $in: [request.body.service] }, available: { $eq: true } } }
      }
    }
    const page = parseInt(request.params.page)
    const limit = parseInt(request.params.limit)

    const total = await instance.goodsDiscount.countDocuments(query)
    const discs = await instance.goodsDiscount
      .find(query)
      .lean()

    reply.ok({
      total: total,
      page: Math.ceil(total / limit),
      current_page: page,
      limit: limit,
      data: discs,
    })
  }

  instance.post('/items/list_of_discounts/:limit/:page', options.version, (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      if (admin) { list_of_discounts(request, reply, admin) }
    })
  })

  // create discount

  const create_discount = async (request, reply, admin) => {
    const body = request.body
    const disc = await instance.goodsDiscount
      .findOne({
        organization: admin.organization,
        name: body.name,
        type: body.type,
        value: body.value
      })
      .lean()

    if (disc)
      return reply.send({
        statusCode: 411,
        message: 'discount Allready exist'
      })
    if (body.name && body.value) {
      const discountModel = instance.goodsDiscount(Object.assign({
        organization: admin.organization
      }, body))
      const result = await discountModel.save()
      reply.ok(result)
      instance.push_to_organization(104, admin.organization)
    }
    else {
      reply.error('Error on creating')
    }
  }

  const createDiscountBody = {
    schema: {
      body: {
        type: 'object',
        properties: {
          created_time: { type: 'number' },
          name: { type: 'string' },
          value: { type: 'number' },
          type: {
            type: 'string',
            enum: ['percentage', 'sum']
          },
          start_time: { type: 'number', minimum: new Date().getTime() - 216000000 },
          end_time: { type: 'number', minimum: new Date().getTime() - 216000000 },
          services: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                service: {
                  type: 'string',
                  minLength: 24,
                  maxLength: 24,
                },
                service_name: { type: 'string' },
                available: {
                  type: 'boolean',
                  default: false
                },
              },
            },
          },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                product_name: { type: 'string' },
                product_id: {
                  type: 'string',
                  minLength: 24,
                  maxLength: 24,
                },
                sku: { type: 'number' },
                barcode: {
                  type: 'array',
                  items: { type: 'string' }
                },
              },
            },
          },
        }
      }
    }
  }

  instance.post('/items/list_of_discounts/create', { ...options.version, ...createDiscountBody }, (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      if (admin) { create_discount(request, reply, admin) }
    })
  })

  // update 

  const list_of_discounts_update = (request, reply, admin) => {
    instance.goodsDiscount.findOne({
      organization: admin.organization,
      _id: {
        $ne: instance.ObjectId(request.params.id)
      },
      name: request.body.name,
      type: request.body.type,
      value: request.body.value
    }, (err, disc) => {
      if (disc) {
        instance.allready_exist(reply)
      }
      else {
        instance.goodsDiscount.updateOne({
          _id: request.params.id
        }, {
          $set: request.body
        }, (err, _) => {
          if (err) {
            reply.error('Error on updating')
            instance.send_Error('update discount', JSON.stringify(err))
          }
          else {
            reply.ok()
            instance.push_to_organization(104, admin.organization)
          }
        })
      }
    })
  }

  instance.post('/items/list_of_discounts/update/:id', options.version, (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      list_of_discounts_update(request, reply, admin)
    })
  })

  const getDiscountById = async (request, reply) => {
    const id = request.params.id
    try {
      const user = request.user
      const discount = await instance.goodsDiscount
        .findOne({ _id: id, organization: user.organization })
        .lean()
      if (!discount) {
        return reply.fourorfour('Discount')
      }
      if (typeof discount.services != typeof []) {
        discount.services = []
      }
      const services = await instance.services
        .find({
          _id: { $in: user.services.map(serv => serv.service) },
          organization: user.organization,
        }, { name: 1 })
        .lean()
      const sObj = {}
      for (const s of discount.services) {
        sObj[s.service] = s
      }
      const dis_services = []
      for (const s of services) {
        if (sObj[s._id]) {
          dis_services.push({
            ...sObj[s._id],
            service_name: s.name
          })
        }
        else {
          dis_services.push({
            available: false,
            service_name: s.name,
            service: s._id
          })
        }
      }
      discount.services = dis_services

      return reply.ok(discount)
    } catch (error) {
      return reply.error(error.message)
    }
  }

  instance.get('/items/list_of_discounts/get/:id', options.version, (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      return getDiscountById(request, reply)
    })
  })

  next()
}