
var FCM = require('fcm-node')
var serverKey = 'AAAACPKexKE:APA91bHcaxbRaXNjWGaxWglbs0U4OpbI1MLxb1IvF3UY1OZnkllgQ_nizhvVyr9fXv2EBVyZxjb3C9rmrXFDuMap4Z96bgZ_kcVM7YA0kWgvMbpUAisdycuxCdUd_x3ib4gMN0y5Mlml'
var fcm = new FCM(serverKey)

module.exports = (instance, _, next) => {

  // var on = (request, reply, next) => {
  //   if (request.headers.authorization) {
  //     var token = request.headers['authorization']
  //     instance.employees.findOne({
  //       token: token
  //     }, (err, employee) => {
  //       if (err) {
  //         reply.error('Error on finding employee')
  //       } else {
  //         if (employee) {
  //           next(employee)
  //         } else {
  //           instance.Admin.findOne({
  //             token: token
  //           }, (err, admin) => {
  //             if (err) {
  //               reply.error('Error on finding admin')
  //             } else {
  //               if (admin) {
  //                 next(admin)
  //               } else {
  //                 instance.BOS.findOne({
  //                   token: token
  //                 }, (err, bos) => {
  //                   if (err) {
  //                     reply.error('Error on finding bos')
  //                   } else {
  //                     if (bos) {
  //                       next(bos)
  //                     } else {
  //                       if (request.headers['accept-user'] == 'admin') {
  //                         reply.status(401).send({
  //                           message: 'Unauthorized'
  //                         })
  //                       }
  //                       else {
  //                         reply.send({
  //                           statusCode: 498,
  //                           error: 'Invalid token',
  //                           message: "Invalid token"
  //                         })
  //                       }
  //                     }
  //                   }
  //                 })
  //               }
  //             }
  //           })
  //         }
  //       }
  //     })
  //   } else {
  //     if (request.headers['accept-user'] == 'admin') {
  //       reply.status(401).send({
  //         message: 'Unauthorized'
  //       })
  //     }
  //     else {
  //       reply.send({
  //         statusCode: 499,
  //         error: "Token required",
  //         message: "Token required"
  //       })
  //     }
  //   }
  // }

  var on = function(request, reply, next) {
    instance.authorization(request, reply, (user) => {
      if(user) {
        next(user)
      }
    })
  }

  instance.generate('/shifts', instance.Shifts, { on: on })

  function pushnotification(code, user) {
    if (user.service != undefined) {
      var message = {
        to: '/topics/' + user.service,
        data: Object.assign({
          type: code,
          type_message: "DATA_CHANGES",
          method: code,
          cashier_id: user._id
        })
      };
      fcm.send(message, function (err, response) {
        if (err) {
          console.log('Error on sending ' + code)
        }
        else {
          console.log('Successfully sent to ' + user.service)
        }
      })
    }
  }

  instance.decorate('update_withdrawal', (id, withdrawal) => {
    instance.Shifts.updateOne({ _id: id }, { $inc: { 'cash_drawer.withdrawal': withdrawal } }, (err, _) => {
      instance.send_Error('updating withdrawal', JSON.stringify(err))
    })
  })

  instance.post('/shifts/pays', { version: '1.0.0' }, (request, reply) => {
    if (request.headers.authorization) {
      var token = request.headers['authorization']
      instance.User.findOne({ employee_token: token }, (err, employee) => {
        if (err) {
          instance.send_Error('finding employee on shifts', JSON.stringify(err))
          reply.error('Error on finding employee')
        }
        else {
          if (employee) {
            if (!request.body) {
              reply.error('Nothing to save')
            }
            else if (request.body.length == 0 || request.body.length == undefined) {
              reply.error('Nothing to save')
            }
            else {
              var created_shift_id = request.body[0].created_shift_id
              instance.Shifts.findOne({ _id: created_shift_id }, (err, shift) => {
                if (err) {
                  instance.send_Error('finding shift on pays ', JSON.stringify(err))
                  reply.error('Error to find shift')
                }
                else {
                  if (shift) {
                    var shiftpayids = []
                    for (var s of shift.Pays) {
                      shiftpayids.push(s._id)
                    }
                    var paid_in = 0
                    var paid_out = 0
                    var from_safe = []
                    for (var pay of request.body) {
                      if (shiftpayids.includes(pay._id) == false) {
                        if (pay.type == 'pay_in' || pay.type == 'pay_out' || pay.type == 'inkassa') {
                          if (pay.type == 'pay_out' || pay.type == 'inkassa') {
                            paid_out += pay.value
                          }
                          else {
                            paid_in += pay.value
                          }
                        }
                        else if (pay.type == 'from_safe') {
                          from_safe.push({
                            shift_id: pay.shift_id,
                            value: pay.value
                          })
                        }
                        shift.Pays.push({
                          _id: pay._id,
                          created_shift_id: created_shift_id,
                          shift_id: pay.shift_id,
                          time: pay.time,
                          is_show: pay.is_show,
                          who: employee.name,
                          comment: pay.comment,
                          type: pay.type,
                          value: pay.value
                        })
                      }
                    }
                    for (var frse of from_safe) {
                      instance.update_withdrawal(frse.shift_id, frse.value)
                    }
                    shift.cash_drawer.paid_in += paid_in
                    shift.cash_drawer.paid_out += paid_out
                    shift.cash_drawer.exp_cash_amount = shift.cash_drawer.starting_cash + shift.cash_drawer.paid_in - shift.cash_drawer.paid_out + shift.cash_drawer.cash_payment - shift.cash_drawer.cash_refund
                    shift.cash_drawer.act_cash_amount = shift.cash_drawer.exp_cash_amount
                    shift.cash_drawer.difference = 0
                    instance.Shifts.updateOne({ _id: shift._id }, { $set: shift }, (err, doc) => {
                      if (err) {
                        reply.error('Error on updating shifts')
                      }
                      else {
                        reply.ok(shift)
                      }
                    })
                  }
                  else {
                    reply.error('shift closed or does not exist')
                  }
                }
              })
            }
          }
          else {
            if (request.headers['accept-user'] == 'admin') {
              reply.status(401).send({
                message: 'Unauthorized'
              })
            }
            else {
              reply.send({
                statusCode: 498,
                message: "Invalid token",
                error: 'Invalid token'
              })
            }
          }
        }
      })
    }
    else {
      if (request.headers['accept-user'] == 'admin') {
        reply.status(401).send({
          message: 'Unauthorized'
        })
      }
      else {
        reply.send({
          statusCode: 499,
          error: "Token required",
          message: "Token required"
        })
      }
    }
  })

  var shift_pays_button = (request, reply, user) => {
    if (user) {
      if (request.body instanceof Array) {
        if (request.body.length > 0) {
          var button_ids = []
          var Pays = request.body
          var PAYS = []
          for (var pay of Pays) {
            if (pay.button_id != undefined && pay.button_id != "") {
              button_ids.push(pay.button_id)
              PAYS.push(pay)
            }
          }
          Pays = PAYS
          instance.paysButtons.find({ _id: { $in: button_ids } }, (err, buttons) => {
            if (err) {
              reply.error('error to find buttons')
            }
            else {
              if (buttons == null) {
                buttons = []
              }
              var buttonObj = {}
              for (var b of buttons) {
                buttonObj[b._id] = b.type
              }
              var created_shift_id = Pays[0].created_shift_id
              instance.Shifts.findOne({ _id: created_shift_id }, (err, shift) => {
                if (err) {
                  instance.send_Error('finding shift on pays ', JSON.stringify(err))
                  reply.error('Error to find shift')
                }
                else {
                  if (shift) {
                    var shiftpayids = []
                    for (var s of shift.Pays) {
                      shiftpayids.push(s._id)
                    }
                    for (var pay of Pays) {
                      if (shiftpayids.includes(pay._id) == false) {
                        shift.Pays.push({
                          _id: pay._id,
                          button_id: pay.button_id,
                          created_shift_id: created_shift_id,
                          shift_id: pay.shift_id,
                          time: pay.time,
                          is_show: pay.is_show,
                          who: pay.who,
                          comment: pay.comment,
                          type: pay.type,
                          value: pay.value
                        })
                      }
                    }
                    instance.Shifts.updateOne({ _id: shift._id }, { $set: shift }, (err, doc) => {
                      if (err) {
                        reply.error('Error on updating shifts')
                      }
                      else {
                        reply.ok(shift)
                      }
                    })
                  }
                  else {
                    reply.error('shift closed or does not exist')
                  }
                }
              })
            }
          })
        }
        else {
          reply.error('Nothing to work')
        }
      }
      else {
        reply.error('Body can\'t be ' + typeof request.body)
      }
    }
  }

  instance.post('/shifts/pays/button', { version: '1.0.0' }, (request, reply) => {
    on(request, reply, (user) => {
      shift_pays_button(request, reply, user)
    })
  })

  var shift_update_debt = (request, reply, user) => {
    var body = request.body
    instance.Shifts.findOne({ _id: body.from_shift_id }, (err, shift) => {
      if (err) {
        instance.send_Error('shift update debt', JSON.stringify(err))
        reply.error('Error on finding shift')
      }
      else {
        if (shift) {
          var new_pays = []
          var debt_to_payout = {}
          if (shift.Pays == undefined) {
            shift.Pays = []
          }
          for (var p of shift.Pays) {
            if (p._id != body.pay_id) {
              new_pays.push(p)
            }
            else if (p.type == 'debt') {
              if (p.value > body.value) {
                p.value -= body.value
                new_pays.push(p)
              }
              debt_to_payout = JSON.parse(JSON.stringify(p))
              debt_to_payout.comment = body.comment
              debt_to_payout._id = body._id
              debt_to_payout.type = 'pay_out'
              debt_to_payout.created_shift_id = body.to_shift_id
              debt_to_payout.value = body.value
            }
          }
          instance.Shifts.updateOne({ _id: body.from_shift_id }, { $set: { Pays: new_pays } }, (err, _) => {
            if (err) {
              instance.send_Error('Error on updating shift pays', JSON.stringify(err))
              reply.error('Error on updating shift pays')
            }
            else {
              var created_shift_id = body.to_shift_id
              instance.Shifts.findOne({ _id: created_shift_id }, (err, shift) => {
                if (err) {
                  instance.send_Error('finding shift on pays ', JSON.stringify(err))
                  reply.error('Error to find shift')
                }
                else {
                  if (shift) {
                    var paid_out = 0
                    for (var pay of [debt_to_payout]) {
                      if (pay.type == 'pay_in' || pay.type == 'pay_out') {
                        if (pay.type == 'pay_out') {
                          paid_out += pay.value
                        }
                        else {
                          paid_in += pay.value
                        }
                      }
                      if (Object.keys(pay).length != 0) {
                        shift.Pays.push({
                          _id: pay._id,
                          created_shift_id: created_shift_id,
                          shift_id: pay.shift_id,
                          time: pay.time,
                          who: user.name,
                          comment: pay.comment,
                          type: pay.type,
                          value: pay.value
                        })
                      }
                    }
                    shift.cash_drawer.paid_out += paid_out
                    shift.cash_drawer.exp_cash_amount = shift.cash_drawer.starting_cash + shift.cash_drawer.paid_in - shift.cash_drawer.paid_out + shift.cash_drawer.cash_payment - shift.cash_drawer.cash_refund
                    shift.cash_drawer.act_cash_amount -= paid_out
                    instance.Shifts.updateOne({ _id: shift._id }, { $set: shift }, (err, doc) => {
                      if (err) {
                        reply.error('Error on updating shifts')
                        instance.send_Error('updating shift', JSON.stringify(err))
                      }
                      else {
                        reply.ok(shift)
                      }
                    })
                  }
                  else {
                    reply.error('shift closed or does not exist')
                  }
                }
              })
            }
          })
        }
        else {
          reply.error('shift does not found')
        }
      }
    })
  }

  instance.post('/shifts/update/debt', { version: '1.0.0' }, (request, reply) => {
    on(request, reply, (user) => {
      shift_update_debt(request, reply, user)
    })
  })

  instance.post('/shifts/get_pays_by_button', { version: '1.0.0' }, (request, reply) => {
    on(request, reply, (user) => {
      if (user) {
        var start = request.body.start
        var end = request.body.end
        var service = request.body.service
        var name = request.body.name
        instance.Shifts.find({
          organization: user.organization,
          service: service,
          opening_time: {
            $gte: start,
            $lte: end
          },
          closing_time: {
            $ne: 0
          }
        }, (err, shifts) => {
          if (err) {
            reply.error('Error to find shifts')
          }
          else {
            if (shifts == null) {
              shifts = []
            }
            var Answer = []
            for (var s of shifts) {
              if (s.Pays == null) {
                s.Pays = []
              }
              for (var p of s.Pays) {
                if (p.type == name && p.is_show) {
                  Answer.push(p)
                }
              }
            }
            reply.ok(Answer)
          }
        })
      }
      else {
        if (request.headers['accept-user'] == 'admin') {
          reply.status(401).send({
            message: 'Unauthorized'
          })
        }
        else {
          reply.send({
            statusCode: 498,
            message: 'Access error'
          })
        }
      }
    })
  })

  next()
}