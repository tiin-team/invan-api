const mongoose = require('mongoose')
const FCM = require('fcm-node')
const serverKey = 'AAAACPKexKE:APA91bHcaxbRaXNjWGaxWglbs0U4OpbI1MLxb1IvF3UY1OZnkllgQ_nizhvVyr9fXv2EBVyZxjb3C9rmrXFDuMap4Z96bgZ_kcVM7YA0kWgvMbpUAisdycuxCdUd_x3ib4gMN0y5Mlml'
const fcm = new FCM(serverKey)

const wrong_token = {
  statusCode: 498,
  error: "Invalid token",
  message: "Invalid token"
}
module.exports = (instance, _, next) => {

  // function pushnotification(service_id) {
  //   var message = { //this may vary according to the message type (single recipient, multicast, topic, et cetera)
  //     to: '/topics/terashop',

  //     // notification: {
  //     //   title: "Qurashboy",
  //     //   body: 'Mabtga body yoziladide!'
  //     // },

  //     // data: request.body
  //   };

  //   // fcm.subscribeToTopic('/topics/global', (err, res) => {
  //   // assert.ifError(err);
  //   // assert.ok(res);
  //   // done();
  //   // console.log(err)
  //   // })
  //   fcm.send(message, function(err, response) {
  //     if (err) {
  //       // reply.error(response)
  //       console.log("Something has gone wrong!");
  //     } else {
  //       // reply.ok(response)
  //       console.log("Successfully sent with response: ", response);
  //     }
  //   });
  // }

  // instance.post('/pushnotification', {
  //   version: '1.0.0'
  // }, (request, reply) => {
  //   var token = request.headers['authorization']
  //   if (token) {
  //     instance.employees.findOne({
  //       token: token
  //     }, (err, employer) => {
  //       if (err) {
  //         reply.error('Error on finding token')
  //       } else {
  //         if (employer) {
  //           pushnotification(employer.service)
  //         } else {
  //           reply.send({
  //             statusCode: 498,
  //             error: 'Invalid token',
  //             message: 'Token not found'
  //           })
  //         }
  //       }
  //     })
  //   } else {
  //     reply.send({
  //       statusCode: 499,
  //       error: 'Token required',
  //       message: 'Token required'
  //     })
  //   }
  // })

  // instance.generate('/fcmnotification', instance.model('fcmNotification', {
  //   user_id: String,
  //   message: Object,
  //   receiver_id: String,
  //   date: Number
  // }))



  function messageTo(receiver, request, reply, sender, service_id, IS) {
    var Once = true
    var a = {}
    var time = new Date().getTime()
    if (IS == false) {
      a = {
        to: receiver.fire_token,
        data: {
          type_message: "MESSAGE",
          message: request.body.message,
          date: request.body.date,
          message_time: time,
          sender_id: sender._id,
          sender_name: sender.name,
          receiver_id: receiver._id
        }
      }
    }
    else {
      a = {
        to: `/topics/${service_id}`,
        data: {
          type_message: "MESSAGE",
          message: request.body.message,
          date: request.body.date,
          message_time: time,
          sender_id: sender._id,
          sender_name: sender.name,
          receiver_id: receiver._id
        }
      }
    }
    var message = {
      to: receiver.fire_token,
      // notification: {
      //   title: IS ? sender.full_name : sender.name,
      //   body: request.body.message
      // },
      data: {
        type_message: "MESSAGE",
        message: request.body.message,
        date: request.body.date,
        sender_id: sender._id,
        sender_name: sender.name
      }
    }
    fcm.send(a, function (err, response) {
      if (err) {
        console.log("Error " + err)
        reply.error(err)
      } else {
        if (Once) {
          Once = false
          var $model = new instance.fcmNotification(Object.assign({
            sender_id: sender._id,
            message: request.body.message,
            receiver_id: receiver._id,
            date: request.body.date,
            message_time: time,
            is_bos: IS
          }))
          $model.save((err, item) => {
            if (err) {
              instance.send_Error(request.raw.url, JSON.stringify(err))
              reply.error("Error to save chat")
            } else {
              reply.ok(item)
            }
          })
        }
      }
    })
  }

  instance.post('/fcmnotification/getchat', { version: '1.0.0' }, (request, reply) => {
    var token = request.headers['authorization']
    if (token) {
      instance.BOS.findOne({
        token: token
      }, (err, bos) => {
        if (err) {
          reply.error("Error on finding bos")
        } else {
          if (bos) {
            var limit = 30
            var page = request.body.page
            var id = request.body.employer_id
            instance.fcmNotification.find({
              $or: [
                { $and: [{ sender_id: bos._id }, { receiver_id: id }] },
                { $and: [{ sender_id: id }, { receiver_id: bos._id }] }
              ]
            }, (err, result) => {
              if (err) {
                reply.error('Error on finding message')
              } else {
                if (result == null) {
                  reply.ok([])
                } else
                  reply.ok(result.slice(page * limit, (page + 1) * limit))
              }
            })
          } else {
            instance.employees.findOne({ token: token }, (err, employer) => {
              if (err) {
                reply.error('Error on finding employee')
              }
              else {
                if (employer) {
                  var limit = 30
                  var page = request.body.page
                  instance.BOS.findOne({ organization: employer.organization }, (err, bos) => {
                    if (err) {
                      reply.error('Error on finding bos')
                    } else {
                      if (bos) {
                        var id = bos._id
                        instance.fcmNotification.find({
                          $or: [
                            { $and: [{ sender_id: employer._id }, { receiver_id: id }] },
                            { $and: [{ sender_id: id }, { receiver_id: employer._id }] }
                          ]
                        }, (err, result) => {
                          if (err) {
                            reply.error('Error on finding message')
                          } else {
                            if (result == null) reply.ok([])
                            else reply.ok(result.slice(page * limit, (page + 1) * limit))
                          }
                        })
                      } else {
                        reply.error('Error on finding bos')
                      }
                    }
                  })
                }
                else {
                  reply.send(wrong_token)
                }
              }
            })
          }
        }
      })
    }
  })

  instance.get('/fcmnotification/getchat/:min/:max', {
    version: '1.0.0'
  }, (request, reply) => {
    var token = request.headers['authorization']
    if (token) {
      instance.BOS.findOne({
        token: token
      }, (err, bos) => {
        if (err) {
          reply.error("Error on finding bos")
        } else {
          if (bos) {
            var db = mongoose.connection;
            var collection = db.collection('fcmnotification')
          } else {
            reply.send(wrong_token)
          }
        }
      })
    }
  })

  instance.post('/fcmnotification', {
    version: '1.0.0'
  }, (request, reply) => {
    reply.error('Error')
    // var token = request.headers['authorization']
    // if (token) {

    //   instance.Users.findOne({
        
    //   })
    //   instance.BOS.findOne({ token: token }, (err, bos) => {
    //     if (err) {
    //       reply.send({
    //         statusCode: 404,
    //         error: 'Not found',
    //         message: 'Bos not found'
    //       })
    //     } else {
    //       if (bos) {
    //         instance.employees.findOne({
    //           _id: request.body.employer_id
    //         }, (err, employer) => {
    //           if (err) {
    //             reply.error("Error on finding employer")
    //           } else {
    //             if (employer) {
    //               messageTo(employer, request, reply, bos, employer.service, true)
    //             } else {
    //               reply.error("Employee not found")
    //             }
    //           }
    //         })
    //       } else {
    //         instance.employees.findOne({
    //           token: token
    //         }, (err, employer) => {
    //           if (err) {
    //             reply.send({
    //               statusCode: 404,
    //               error: 'Not found',
    //               message: 'Employee not found'
    //             })
    //           } else {
    //             if (employer) {
    //               if (employer.is_active) {
    //                 instance.BOS.findOne({ organization: employer.organization }, (err, bos) => {
    //                   if (err) {
    //                     reply.error("Error on finding bos")
    //                   } else {
    //                     if (bos) {
    //                       // console.log(bos)
    //                       // console.log(employer._id)
    //                       messageTo(bos, request, reply, employer, employer.service, false)
    //                       // reply.ok(bos)
    //                     } else {
    //                       reply.error("Bos not found")
    //                     }
    //                   }
    //                 })
    //               } else {
    //                 reply.send({
    //                   statusCode: 497,
    //                   error: "Employee do not have an access",
    //                   message: "Not allowed"
    //                 })
    //               }
    //             } else {
    //               reply.send(wrong_token)
    //             }
    //           }
    //         })
    //       }
    //     }
    //   })
    // } else {
    //   reply.send({
    //     statusCode: 499,
    //     error: "Token required",
    //     message: "Token Required"
    //   })
    // }
  })


  instance.post('/check', { version: '1.0.0' }, (request, reply) => {
    var token = request.headers['authorization']
    instance.employees.findOne({ token: token }, (err, employer) => {
      if (err) {
        reply.error()
      } else {
        if (employer) {
          var message = { "to": "cWycRS-2OhU:APA91bEFLGeyerv6ZCXrr-eOv2qtwP0FJrTdi1WFZzfqYe_miC-ySe1buAY5DNFpJDMee-s5BHty4iXnm2__n2tYhdVEqX3nu-QksXkUv7HrpBCWidN0kdjTFtIrvp8M6o_CHLQt216G", "data": { "title": "Bu title", "body": "nima gap" } }
          fcm.send(message, function (err, response) {
            if (err) {
              reply.send("Error on fire base")
            }
            else {
              reply.ok(message)
            }
          })
        } else {
          reply.send(wrong_token)
        }
      }
    })
  })


  next()
} 