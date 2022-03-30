module.exports = (instance, options, next) => {

  // get discount list

  var list_of_discounts = (request, reply, admin) => {
    var query = { organization: admin.organization }
    if (request.body) {
      if (request.body.services) {
        if (request.body.services.length > 0) {
          query.services = { $elemMatch: { service: { $in: request.body.services }, available: { $eq: true } } }
        }
      }
      if(typeof request.body.service == typeof 'invan' && request.body.service != '') {
        query.services = { $elemMatch: { service: { $in: [request.body.service] }, available: { $eq: true } } }
      }
    }
    instance.goodsDiscount.find(query, (err, discs) => {
      if (err || discs == null) {
        discs = []
      }
      var page = parseInt(request.params.page)
      var limit = parseInt(request.params.limit)
      var total = discs.length
      reply.ok({
        total: total,
        page: Math.ceil(total / limit),
        data: discs.splice(limit * (page - 1), limit)
      })
    })
  }

  instance.post('/items/list_of_discounts/:limit/:page', options.version, (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      if (admin) { list_of_discounts(request, reply, admin) }
    })
  })

  // create discount

  var create_discount = (request, reply, admin) => {
    instance.goodsDiscount.findOne({
      organization: admin.organization,
      name: request.body.name,
      type: request.body.type,
      value: request.body.value
    }, (err, discs) => {
      if (err || discs == null) {
        if (request.body.name && request.body.value) {
          var discountModel = instance.goodsDiscount(Object.assign({
            organization: admin.organization
          }, request.body))
          discountModel.save((err) => {
            if (err) {
              reply.error('Error on saving')
            }
            else {
              reply.ok()
              instance.push_to_organization(104, admin.organization)
            }
          })
        }
        else {
          reply.error('Error on creating')
        }
      }
      else {
        reply.send({
          statusCode: 411,
          message: 'discount Allready exist'
        })
      }
    })
  }

  instance.post('/items/list_of_discounts/create', options.version, (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      if (admin) { create_discount(request, reply, admin) }
    })
  })

  // update 

  var list_of_discounts_update = (request, reply, admin) => {
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
      const discount = await instance.goodsDiscount.findById(id)
      if(!discount) {
        return reply.fourorfour('Discount')
      }
      if(typeof discount.services != typeof []) {
        discount.services=[]
      }
      const services = await instance.services.find({organization: user.organization})
      const sObj = {}
      for(const s of discount.services) {
        try {
          sObj[s.service] = s.toObject()
        }
        catch(error) {
          instance.send_Error('to Object', error.message)
        }
      }
      let dis_services = []
      for(let s of services) {
        try {
          s = s.toObject()
        }
        catch(error) {
          instance.send_Error('to Object', error.message)
        }
        if(sObj[s._id]) {
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