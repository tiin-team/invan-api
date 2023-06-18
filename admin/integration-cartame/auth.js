const fp = require('fastify-plugin')

module.exports = fp((instance, _, next) => {
  // check all

  instance.decorate('authorizationCartaMe', async (request, reply, next) => {
    try {
      const token = request.headers['authorization']
      const username = 'cartaMe';
      const password = 'CMJrpeAB';

      // Buffer.from(`${username}:${password}`, 'utf8').toString('base64')
      if (!token || token !== Buffer.from(`${username}:${password}`, 'utf8').toString('base64')) {
        return instance.unauthorized(reply)
      }

      next()
    }
    catch (error) {
      return instance.unauthorized(reply)
    }
  })
  next()
})
