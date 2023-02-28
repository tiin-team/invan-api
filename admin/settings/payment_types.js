module.exports = ((instance, options, next) => {

  // get_payment_types

  var get_payment = (request, reply, admin) => {
    instance.organizations.findOne({
      _id: admin.organization
    }, (_, org) => {
      if(org) {
        reply.ok(org.payments)
      }
      else {
        reply.fourorfour("Organization")
      }
    })
  }

  instance.get('/payment/types/get', options.version, (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      get_payment(request, reply, admin)
    })
  })

  // update payment

  var update_payment = (request, reply, admin) => {
    if(request.body) {
      if(request.body.length == 6) {
        instance.organizations.updateOne({
          _id: admin.organization
        }, {
          $set: {
            payments: request.body
          }
        }, (err) => {
          if(err) {
            reply.error('Error on updating')
            instance.send_Error('update payments', JSON.stringify)(err)
          }
          else {
            reply.ok()
          }
        })
      }
      else {
        reply.error('Error')
      }
    }
  }

  instance.post('/payment/types/update', options.version, (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      update_payment(request, reply, admin)
    })
  })

  next()
})