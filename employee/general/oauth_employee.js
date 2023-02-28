const fp = require('fastify-plugin')

module.exports = fp((instance, _, next) => {

  instance.decorate('oauth_employee', (request, reply, next) => {
    var token = request.headers['authorization']
    if(token) {
      instance.employees.findOne({token: token}, (err, employee) => {
        if(err || employee == null) {
          instance.unauthorized(request.headers['accept-user'], reply)
        }
        else {
          next(employee)
        }
      })
    }
    else {
      instance.unauthorized(request.headers['accept-user'], reply)
    }
  })

  next()
})