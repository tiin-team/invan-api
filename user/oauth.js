const fp = require('fastify-plugin')

module.exports = fp((instance, _, next) => {

   // check all

   instance.decorate('authorization', async (request, reply, next) => {

      try {
         const acceptUser = request.headers['accept-user']

         if (acceptUser === 'QRCode') return next(null)

         const token = request.body && request.body.token || request.headers['authorization']

         if (!token) return instance.unauthorized(reply)

         const query = { [`${acceptUser}_token`]: token }
         instance.User.findOne(query, (_, user) => {
            if (user) {
               if (acceptUser === 'employee') {
                  user.service = request.headers['accept-service']
               }
               user.services = user.services.filter(serv => serv.available)
               request.user = user
               return next(user)
            }
            return instance.unauthorized(reply)
         })
         /*
         const user = await instance.User.findOne(query)
         if (!user) {
            if (acceptUser === 'employee') {
               return instance.unauthorized(reply)
               // return reply.send({
               //    statusCode: 499,
               //    message: 'Invalid Token'
               // })
            }

            return instance.unauthorized(reply)
         }

         if (acceptUser === 'employee') {
            user.service = request.headers['accept-service']
         }
         request.user = user
         return next(user)
         */
      }
      catch (error) {
         return instance.unauthorized(reply)
      }
   })

   // check admin

   instance.decorate('authorize_admin', (request, reply, next) => {

      const token = request.headers['authorization']
      if (!token) {
         return instance.unauthorized(reply)
      }
      const query = {}
      query['admin_token'] = token;

      instance.User.findOne(query, (_, user) => {
         if (!user) {
            return instance.unauthorized(reply)
         }
         user.services = user.services.filter(serv => serv.available)
         request.user = user
         next()
      });
   })

   // check boss

   instance.decorate('authorize_boss', (request, reply, next) => {

      if (request.headers['accept-user'] == 'QRCode') {
         next(null)
      }
      var token = request.headers['authorization']
      if (token) {
         var query = {}
         query['boss_token'] = token
         instance.User.findOne(query, (err, user) => {
            if (err || user == null) {
               return instance.unauthorized(reply)
            }
            else {
               next(user)
            }
         })
      }
      else {
         instance.unauthorized(reply)
      }
   })

   // check admin and boss

   instance.decorate('authorize_boss_admin', (request, reply, next) => {

      if (request.headers['accept-user'] === 'QRCode') return next(null)

      const token = request.headers['authorization']
      if (!token) return instance.unauthorized(reply)

      const query = { $or: [{ boss_token: token }, { admin_token: token }] }

      instance.User.findOne(query, (err, user) => {
         if (err || user == null) {
            // if not a boss or admin, redirect to the ordinary authorization
            return instance.on(request, reply, next)
         }
         if (user.role != 'boss') user.services = user.services.filter(serv => serv.available)

         return next(user)
      })

   })

   // check employee

   instance.decorate('authorize_employee', async (request, reply, then) => {
      // console.log(request.raw.originalUrl)
      const token = request.headers['authorization']
      if (!token) return instance.unauthorized(reply);

      const query = { employee_token: token }
      try {
         const user = await instance.User.findOne(query);
         if (!user) {
            return instance.unauthorized(reply);
         }
         user.services = user.services.filter(serv => serv.available)
         request.user = user
         // console.log('on next')
         // then();
      }
      catch (error) {
         return reply.error(error.message)
      }
   })

   next()
})
