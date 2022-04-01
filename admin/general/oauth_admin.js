const fp = require('fastify-plugin')

module.exports = fp((instance, _, next) => {

  instance.decorate('oauth_admin', (request, reply, next) => {
    const token = request.headers['authorization']
    instance.authorization(request, reply, (user) => {
      if(token == undefined) {
        request.headers = {
          'authorization': request.params.token,
          'accept-user': 'admin'
        }
      }
      if(!user) {
        return reply.error('Failed')
      }
      next(user)
    })
    // if(token) {
    //   instance.Admin.findOne({token: token}, (err, admin) => {
    //     if(err || admin == null) {
    //       instance.unauthorized(reply)
    //     }
    //     else {
    //       next(admin)
    //     }
    //   })
    // }
    // else {
    //   instance.unauthorized(reply)
    // }
  })

  next()
})