module.exports = (instance, options, next) => {

  // get features


  var get_features = (request, reply, user) => {
    instance.settingFeatures.findOne({
      organization: user.organization,
    }, {
      organization: 0,
      _id: 0,
      __v: 0
    }, (err, feature) => {
      
      if (feature) {
        reply.ok(feature)
      }
      else {
        // reply.error('NOT Found')
        reply.ok({
          opened_receipts: true,
          debts: true,
          shifts: true,
          orders: true,
          chat: true,
          open_tickets: true,
          time_clock: true,
          show_stock: false,
          karaoke: true,
          scale: true
        })
      }
    })
  }

  instance.get('/settings/general/features/get', {version: '1.0.0'}, (request, reply) => {
    instance.authorization(request, reply, (user) => {
      get_features(request, reply, user)
    })
  })

  instance.post('/settings/general/features/create', {version: '1.0.0'}, (request, reply) => {
    // instance.organizations.find({}, (err, organizations) => {
    //   if(organizations == null) {
    //     organizations = []
    //   }
    //   var features = []
    //   for(var o of organizations) {
    //     features.push({
    //       organization: o._id,
    //       opened_receipts: true,
    //       debts: true,
    //       shifts: true,
    //       orders: true,
    //       chat: true,
    //       open_tickets: true,
    //       time_clock: true
    //     })
    //   }
    //   instance.settingFeatures.insertMany(features, (err, _) => {
    //     reply.ok()
    //   })
    // })
  })

  var update_feature = (request, reply, user) => {
    instance.settingFeatures.updateOne({
      organization: user.organization
    }, {
      $set: request.body
    }, (err) => {
      if(err) {
        reply.error('Error on updating')
      }
      else {
        instance.settingFeatures.findOne({
          organization: user.organization
        }, {
          organization: 0,
          _id: 0,
          __v: 0 
        }, (err, feature) => {
          if(err){
            reply.error('error on finding')
          }
          else {
            reply.ok(feature)
          }
        })
      }
    })
  }

  instance.post('/settings/general/features/update', {version: '1.0.0'}, (request, reply) => {
    instance.authorization(request, reply, (user) => {
      update_feature(request, reply, user)
    })
  })

  next()
}