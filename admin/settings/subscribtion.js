const fp = require('fastify-plugin');
module.exports = fp((instance, options, next) => {

  instance.decorate('update_subscription', (user, type_of_subs, type_of_payment) => {
    var query = {}
    var how_much = 0
    if(type_of_payment == 'month') {
      how_much = 30*86400000
    }
    else {
      how_much = 365*30*86400000
    }
    if(type_of_subs == 'employee') {
      query = {
        employee_end_date: how_much
      }
    }
    else {
      query = {
        inventory_end_date: how_much
      }
    }
    instance.subscribtion.updateOne({
      organization: user.organization
    }, {
      $inc: query
    }, (err) => {
      if(err) {
        instance.send_Error('PAYMENT', JSON.stringify(err))
      }
    })
  })

  // get status
  var get_status = (request, reply, admin) => {
    instance.subscribtion.findOne({
      organization: admin.organization
    }, (err, status) => {
      if(status){
        reply.ok(status)
      }
      else {
        reply.fourorfour('Subsciption')
      }
    })
  }

  instance.get('/settings/billing/get_status', options.version, (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      get_status(request, reply, admin)
    })
  })

  // update status

  instance.post('/settings/billing/update', options.version, (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      update_status(request, reply, admin)
    })
  })

  // start free trial

  var update_status_trial = (request, reply, admin) => {
    instance.subscribtion.findOne({
      organization: admin.organization
    }, (_, subs) => {
      if(subs) {
        if(request.body.employee_subscribed) {
          if(subs.employee_subscribed == false) {
            subs.employee_end_date = new Date().getTime()+30*86400000
            subs.employee_subscribed = true
          }
        }
        if(request.body.inventory_subscribed) {
          if(subs.inventory_subscribed == false) {
            subs.inventory_end_date = new Date().getTime()+30*86400000
            subs.inventory_subscribed = true
          }
        }
        instance.subscribtion.updateOne({
          _id: subs._id
        }, {
          $set: subs
        }, (err) => {
          if(err) {
            reply.error('On Subscribing')
            instance.send_Error('on subscribe', JSON.stringify(err))
          }
          else {
            reply.ok()
          }
        })
      }
      else {
        reply.fourorfour('Subscription')
      }
    })
  }

  instance.post('/settings/billing/update/trial', options.version, (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      update_status_trial(request, reply, admin)
    })
  })

  next()
})