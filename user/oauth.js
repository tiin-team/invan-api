const fp = require('fastify-plugin');
const routes = require('./routes.json');

const checkAcces = (link, accesses) => {
   const route = routes.find(route => new RegExp(`^${route.link}`).test(link))
   // console.log(route, route.role);
   // console.log(accesses, 'acc');
   return route && accesses ? accesses[route.role] : false
}

module.exports = fp((instance, _, next) => {

   // check all

   instance.decorate('authorization', async (request, reply, next) => {
      // request url ni check qil. request.raw.url

      try {
         const acceptUser = request.headers['accept-user']

         if (acceptUser === 'QRCode') return next(null)

         const token = request.body && request.body.token || request.headers['authorization']

         if (!token) return instance.unauthorized(reply)

         const query = { [`${acceptUser}_token`]: token }
         instance.User.findOne(query, async (_, user) => {
            if (user) {
               // const access = await instance.AccessRights
               //    .findOne({ name: user.role, organization: user.organization })
               //    .lean()
               // if (!checkAcces(request.raw.url, access))
               //    return instance.forbidden(reply)

               if (acceptUser === 'employee') {
                  user.service = request.headers['accept-service']
               }
               if (user.role === 'boss') {
                  // olib tashlash krk, registratsiyani togirlagandan kyn
                  const services = await instance.services
                     .find({ organization: user.organization })
                     .lean();

                  user.services = services.map(serv => {
                     return {
                        service: serv._id,
                        service_name: serv.name,
                        available: true,
                     }
                  })
                  // .map(serv => {
                  //    serv.available = true
                  //    return serv
                  // })
               }
               else
                  user.services = user.services.filter(serv => serv.available)
               request.user = user
               return next(user)
            }
            return instance.unauthorized(reply)
         })
            .lean()
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
