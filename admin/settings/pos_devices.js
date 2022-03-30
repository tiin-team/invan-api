module.exports = (instance, options, next) => {

  // get pos

  var get_pos = (request, reply, admin) => {
    var query = {
      organization: admin.organization
    }
    if (request.body) {
      if (request.body.service != '' && request.body.service != null) {
        query.service = request.body.service
      }
    }
    instance.posDevices.find(query, (err, devices) => {
      if (devices == null) {
        devices = []
      }
      reply.ok(devices)
    })
  }

  instance.post('/posdevices/get', options.version, (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      get_pos(request, reply, admin)
    })
  })

  // update pos for service

  const update_pos = async (request, reply) => {
    try {
      const pos_id = request.headers['accept-id']
      await instance.posDevices.updateOne({
        _id: pos_id
      }, {
        $set: {
          is_active: false
        }
      })
      reply.ok()
    } catch (error) {
      reply.ok(error.message)
    }
  }

  instance.get('/logging/out', options.version, (request, reply) => {
    update_pos(request, reply)
  })
  
  next()
}