const fp = require('fastify-plugin')

var FCM = require('fcm-node')
var serverKey = 'AAAACPKexKE:APA91bHcaxbRaXNjWGaxWglbs0U4OpbI1MLxb1IvF3UY1OZnkllgQ_nizhvVyr9fXv2EBVyZxjb3C9rmrXFDuMap4Z96bgZ_kcVM7YA0kWgvMbpUAisdycuxCdUd_x3ib4gMN0y5Mlml'
var fcm = new FCM(serverKey)

module.exports = fp((instance, _, next) => {

  instance.decorate('push_to_organization', (code, organization) => {
    instance.services.find({
      organization: organization
    }, (err, services) => {
      if(services == null) {
        services = []
      }
      for(var s of services) {
        instance.push_changes(null, code, s._id)
      }
    })
  })

  instance.decorate('push_changes', (request, code, service_id = "") => {
    var now = new Date().getTime()
    if(request == null) {
      request = {headers:{}}
    }
    else if(request.headers == null){
      request.headers = {}
    }
    if (request.headers['accept-service'] != null) {
      service_id = request.headers['accept-service']
    }
    else {
      request.headers['accept-service'] = service_id
    }
    var whom = 'fromAdminka'
    if(request.headers['accept-id']) {
      whom = request.headers['accept-id']
    }
    if(service_id != '' && code != 0) {
      instance.pushObj.findOne({
        service: service_id,
        code: code,
        last_time: {
          $gte: now - 5000
        }
      }, (err, push) => {
        if(err || push == null) {
          var pushObj = instance.pushObj({
            unique: service_id + code,
            service: service_id,
            code: code,
            last_time: now
          })
          instance.pushObj.deleteMany({
            service: service_id,
            code: code
          }, (err) => {
            if(err){
              instance.send_Error('Error on deleting push', JSON.stringify(err))
            }
            pushObj.save((err) => {
              if(err) {
                // instance.send_Error('save push', JSON.stringify(err))
              }
              else {
                
                var message = {
                  to: '/topics/' + service_id,
                  data: Object.assign({
                    type: code,
                    type_message: "DATA_CHANGES",
                    method: code,
                    cashier_id: whom
                  })
                };
                // if(code != 101)
                fcm.send(message, function (err) {
                  if (err) {
                    // instance.send_Error('push_changes', JSON.stringify(err))
                  }
                })
              }
            })
          })
        }
      })
    }
  })

  instance.decorate('push_deleted_items', (request, ids, organization, servicee = '123') => {
    instance.services.find({
      organization: organization
    }, (err, services) => {
      if(services == null) {
        services = []
      }
      for(var s of services) {
        if(s._id != '' && (servicee = '123' || servicee+'' == s._id+'')){
          for(let i=0; i<ids.length; i+=10) {
            var idss = []
            var a = i+10
            for(var j=i; j<a; j++) {
              if(j<ids.length){
                idss.push(ids[j])
              }
            }
            var message = {
              to: '/topics/' + s._id,
              data: Object.assign({
                type: 101,
                type_message: "DATA_CHANGES",
                method: 101,
                cashier_id: request.headers['accept-id'],
                body: idss
              })
            };
            fcm.send(message, function (err) {
              if (err) {
                // instance.send_Error('push_changes', JSON.stringify(err))
              }
            })
          }
        }
      }
    })
  })

  next()
})