module.exports = (instance, options, next) => {
   var version = { version: '1.0.0' }
   // get taxes

   var get_taxes = (request, reply, admin) => {
      var query = {
         organization: admin.organization
      }
      if(request.body) {
         if(request.body.service != "" && request.body.service != null) {
            query.services = { $elemMatch: { service: { $eq: instance.ObjectId(request.body.service) }, available: {$eq: true}}}
         }
      }
      instance.settingsTaxes.find(query, (err, taxes) => {
         if (err || taxes == null) {
            taxes = []
         }
         reply.ok(taxes)
      })
   }

   instance.post('/settings/tax/get', version, (request, reply) => {
      instance.oauth_admin(request, reply, (admin) => {
         if (admin) {
            get_taxes(request, reply, admin)
         }
      })
   })

   instance.get('/settings/tax/get', version, (request, reply) => {
      instance.oauth_admin(request, reply, (admin) => {
         if (admin) {
            get_taxes(request, reply, admin)
         }
      })
   })

   const getTaxById = async (request, reply) => {
      try {
         const id = request.params.id
         const user = request.user
         const tax = await instance.settingsTaxes.findById(id)
         if(!tax) {
            return reply.fourorfour('Taxx')
         }
         const services = await instance.services.find({ organization: user.organization })
         const sObj = {}
         if(typeof tax.services == typeof []) {
            for(const s of tax.services) {
               try {
                  sObj[s.service] = s.toObject()
               }
               catch(error) {
               instance.send_Error('to Object', error.message)
               }
            }
         }
         const tax_services = []
         for(const s of services) {
            if(sObj[s._id]) {
               tax_services.push({
                  ...sObj[s._id],
                  service_name: s.name
               })
            }
            else {
               tax_services.push({
                  service: s._id,
                  service_name: s.name
               })
            }
         }
         tax.services = tax_services
         reply.ok(tax)
      } catch (error) {
         reply.error(error.message)
      }
   }

   instance.get('/settings/tax/get_by_id/:id', version, (request, reply) => {
      instance.oauth_admin(request, reply, (admin) => {
         return getTaxById(request, reply)
      })
   })

   next()
}