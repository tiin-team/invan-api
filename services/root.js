const TokenGenerator = require('uuid-token-generator')
const fs = require('fs')
const mongoose = require('mongoose')
const axios = require('axios')
const qs = require('qs');

var FCM = require('fcm-node')
var serverKey = 'AAAACPKexKE:APA91bHcaxbRaXNjWGaxWglbs0U4OpbI1MLxb1IvF3UY1OZnkllgQ_nizhvVyr9fXv2EBVyZxjb3C9rmrXFDuMap4Z96bgZ_kcVM7YA0kWgvMbpUAisdycuxCdUd_x3ib4gMN0y5Mlml'
var fcm = new FCM(serverKey)
var wrong_token = {
  statusCode: 498,
  error: "Invalid token",
  message: "Invalid token"
}
var my_headers = {
  'Authorization': 'Bearer xoxp-705019615312-693631035683-697967001330-e46e7a5503975f8dfd423212c482f6da'
}

var BASE_URL = 'http://178.218.207.90'
BASE_URL = 'http://localhost:3000'

function send_to_slack(method, model, er_or_suc) {
  // axios.post('https://slack.com/api/chat.postMessage', qs.stringify({
  //   channel: "GLT5K8EMU",
  //   text: `on ${method}    ${model}  ${er_or_suc} `
  // }), {headers: my_headers}).then(response => {}).catch((error) =>{})
  if (er_or_suc != 'Success')
    axios.post(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage?chat_id=-1001434635647&parse_mode=html&text=<strong>${er_or_suc}</strong>  On <b>${method}</b> method   <i>${model}</i>`)
      .then(function (response) { }).catch(function (err) { }).then(function () { })
}

function send_Error(url, error) {
  axios.post(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage?chat_id=-1001434635647&parse_mode=html&text=<strong>Error</strong> On <b>${url}</b> url :  \n${error}`)
    .then(function (response) { }).catch(function (err) { }).then(function () { })
}
module.exports = (instance, _, next) => {

  var serviceTypeOfBusinessModel = instance.model('servicestypeofbusinesses', { name: 'string' })

  instance.post('/register', { version: '1.0.0' }, (request, reply) => {
    instance.organizations.findOne({ inn: request.body.inn }, (err, organization) => {
      if (err) {
        send_Error(request.raw.url, JSON.stringify(err))
        reply.error('Error on finding organization')
      }
      else {
        if (organization) {
          send_Error(request.raw.url, 'Organization already exist:\n' + JSON.stringify(organization))
          reply.error('Organization has already exist')
        }
        else {
          instance.BOS.findOne({ phone_number: request.body.phone_number }, (err, bos) => {
            if (err) {
              send_Error(request.raw.url, ' on finding phone number:\n' + JSON.stringify(err))
              reply.error('Error on finding phone number')
            }
            else {
              if (bos) {
                send_Error(request.raw.url, 'Organization of Bos already exist:\n' + JSON.stringify(bos))
                reply.error('Organization has already exist')
              }
              else {
                var organization_name = request.body.organization
                instance.organizations.findOne({ name: organization_name }, (error, organization) => {
                  if (error) {
                    send_Error(request.raw.url, ' on finding organization:\n' + JSON.stringify(error))
                    reply.error('Error finding organization')
                  }
                  else {
                    if (organization) {
                      send_Error(request.raw.url, 'Organization already exist:\n' + JSON.stringify(organization))
                      reply.error('Organization has already exists!')
                    }
                    else {
                      var organization_model = new instance.organizations({
                        inn: request.body.inn,
                        name: organization_name,
                        address: request.body.address,
                        services: [],
                        is_verify: false
                      })
                      organization_model.save((error) => {
                        if (error) {
                          send_Error(request.raw.url, 'Could not save:\n' + JSON.stringify(error))
                          reply.error('Could not save!')
                        }
                        else {
                          instance.organizations.findOne({ name: organization_name }, (error, organization) => {
                            var data = {
                              organization: organization._id,
                              full_name: request.body.full_name,
                              password: request.body.password,
                              phone_number: request.body.phone_number,
                              email: request.body.email,
                              // token: (new TokenGenerator()).generate(),
                              image_url: request.body.image_url
                            }
                            var BOS_model = new instance.BOS(data)
                            BOS_model.save((error) => {
                              if (error) {
                                send_Error(request.raw.url, 'Could not save :\n' + JSON.stringify(error))
                                reply.error('Could not save!')
                              }
                              else {
                                instance.BOS.findOne({ organization: organization._id }, (error, _) => {
                                  if (error) {
                                    send_Error(request.raw.url, ' on finding bos:\n' + JSON.stringify(error))
                                    reply.error('Error on finding bos')
                                  }
                                  else {
                                    send_to_slack('organization register', 'inoneorganizations', 'Success')
                                    axios.defaults.headers.common['Accept-Version'] = '1.0.0';
                                    axios.defaults.headers.post['Content-Type'] = 'application/json';
                                    var obj = {
                                      inn: request.body.inn
                                    }
                                    axios.defaults.data = obj
                                    axios.post('htpps://purch.invan.uz/login', obj)
                                      .then(function (response) { })
                                      .catch(function (error) { instance.send_Error(request.raw.url, JSON.stringify(err)) }).then(function () { });
                                    reply.ok()
                                  }
                                })
                              }
                            })
                          })
                        }
                      })
                    }
                  }
                })
              }
            }
          })
        }
      }
    })
  })


  function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
  }

  function send_sms_code(sms_code, phone_number, reply) {
    reply.ok({ phone_number: phone_number })
    axios.post(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage?chat_id=${process.env.SMSCHANNEL}&parse_mode=html&text=${sms_code} is Sms code of ${phone_number}`)
      .then(function (response) { }).catch(function (err) { }).then(function () { })
  }
  var headers = {
    'Authorization': 'Bearer xoxp-637695996626-649119369920-698642311681-2ee950bb8e6bd82f0a29625456a280ba'
  }

  function send_slack(sms_code, phone_number, reply) {
    // axios.post('https://slack.com/api/chat.postMessage', qs.stringify({
    //   channel: "GLDF4580J",
    //   text: `Your InOne verification sms code: ${sms_code}\n Sent to ${phone_number}`
    // }), {headers: headers} )
    // .then(response => {
    // }).catch((error) => {
    //   send_Error('sending slack sms code ', JSON.stringify(error))
    // })
    // axios.post(`https://api.telegram.org/bot769464007:AAFjO5cpIsqUMbhG0rTLkQ4dex63fjs1nUM/sendMessage?chat_id=-1001258934534&parse_mode=html&text=${sms_code} is Sms code of ${phone_number}`)
    //   .then(function(response){}).catch(function(err){}).then(function(){})
  }

  function sent_token(name, token) {
    // axios.post('https://slack.com/api/chat.postMessage', qs.stringify({
    //   channel: "GLVRB304X",
    //   text: `token of the ${name} is ${token}`
    // }), {headers: headers})
    // .then(response => {
    // }).catch((error) => {
    //   send_Error('sending token to slack', JSON.stringify(error))
    // })
    axios.post(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage?chat_id=${TELEGRAMID}&parse_mode=html&text=Token of <b>${name}</b> is <i>${token}</i>`)
      .then(function (response) { }).catch(function (err) { }).then(function () { })
  }

  instance.post('/login', { version: '1.0.0' }, (request, reply) => {
    var inn = request.body.inn
    instance.organizations.findOne({ inn: inn }, (error, organization) => {
      // console.log(organization)
      if (error) {
        send_Error(request.raw.url, 'on finding inn:\n' + JSON.stringify(error))
        reply.error('Error')
      }
      else {
        if (organization) {
          instance.BOS.findOne({ organization: organization._id }, (error, bos) => {
            if (error) {
              send_Error(request.raw.url, 'on finding bos:\n' + JSON.stringify(error))
              reply.error('Error on finding bos')
            }
            else {
              if (bos) {
                instance.SMS.findOne({ phone_number: bos.phone_number, user: 'boss' }, (error, Sms_code) => {
                  var sms_code = getRandomInt(9000) + 1000;
                  // var sms_code = 1111
                  if (error) {
                    send_Error(request.raw.url, 'on finding sms code:\n' + JSON.stringify(error))
                    reply.error('Error on finding sms code')
                  }
                  else {
                    var timer = new Date().getTime()
                    if (Sms_code) {
                      instance.SMS.findOneAndUpdate({ _id: Sms_code._id }, { $set: { sms_code: sms_code, timer: timer } }, (error, doc) => {
                        if (error) {
                          send_Error(request.raw.url, JSON.stringify(error))
                          reply.error('Error on updating sms code')
                        }
                        else {
                          // send_slack(sms_code, bos.phone_number, reply)
                          // reply.ok({phone_number: bos.phone_number})
                          send_sms_code(sms_code, bos.phone_number, reply)
                        }
                      })
                    }
                    else {
                      var model = new instance.SMS({ phone_number: bos.phone_number, user: 'boss', sms_code: sms_code, timer: timer })
                      model.save((error) => {
                        if (error) {
                          send_Error(request.raw.url, JSON.stringify(error))
                          reply.error('Error')
                        }
                        else {
                          send_to_slack('bos login', JSON.stringify(model), 'Success')
                          send_slack(sms_code, bos.phone_number, reply)
                          // reply.ok({phone_number: bos.phone_number})
                          send_sms_code(sms_code, bos.phone_number, reply)
                        }
                      })
                    }
                  }
                })
              }
              else {
                send_Error(request.raw.url, 'bos does not exist')
                reply.error('BOS does not exists!')
              }
            }
          })
        }
        else {
          send_Error(request.raw.url, 'User does not exist')
          reply.error('User does not exists!')
        }
      }
    })
  })

  instance.post('/login/verify', { version: '1.0.0' }, (request, reply) => {
    var sms_code = request.body.sms_code
    var phone_number = request.body.phone_number
    instance.SMS.findOne({ phone_number: phone_number, user: 'boss', sms_code: sms_code }, (error, sms) => {
      if (error) {
        send_Error(request.raw.url, 'SMS could not found:\n' + JSON.stringify(error))
        reply.error('SMS could not found')
      }
      else {
        if (sms) {
          var timer = new Date().getTime()
          instance.BOS.findOne({ phone_number: phone_number }, (error, bos) => {
            if (error) {
              send_Error(request.raw.url, 'bos could not found:\n' + JSON.stringify(error))
              reply.error('BOS could not found')
            }
            else {
              if (bos) {
                if (sms.sms_code == request.body.sms_code && timer - sms.timer < 180000) {
                  instance.SMS.deleteOne({
                    _id: sms._id
                  }, (err, _) => {
                    instance.send_Error(request.raw.url, JSON.stringify(err))
                  })
                  var token = (new TokenGenerator()).generate()
                  if (bos.token !== undefined) {
                    token = bos.token
                  }
                  instance.BOS.findOneAndUpdate({ _id: bos._id }, { $set: { token: token } }, (err, doc) => {
                    if (err) {
                      send_Error(request.raw.url, JSON.stringify(err))
                      reply.error('Error on updating')
                    }
                    else {
                      if (doc) {
                        bos.token = token
                        instance.organizations.findOneAndUpdate({ _id: bos.organization }, { $set: { is_verify: true } }, (err, doc) => {
                          if (err) {
                            send_Error(request.raw.url, JSON.stringify(err))
                            reply.error('Error on finding organization')
                          }
                          else {
                            if (doc) {
                              sent_token(bos.full_name, bos.token)
                              send_to_slack('bos login verify', JSON.stringify(bos), 'Success')
                              reply.ok(bos)
                            } else {
                              send_Error(request.raw.url, 'Organization does not exist')
                              reply.error('Organization does not exist')
                            }
                          }
                        })
                      }
                      else {
                        send_Error(request.raw.url, 'Update could not found')
                        reply.error('Error on updating data')
                      }
                    }
                  })
                }
                else {
                  send_Error(request.raw.url, 'Timeout or Incorrect sms code')
                  reply.error('Timeout or Incorrect sms code')
                }
              }
              else {
                send_Error(request.raw.url, 'Bos equal null')
                reply.error('Impossible BOS')
              }
            }
          })
        }
        else {
          send_Error(request.raw.url, 'SMS does not exist')
          reply.error('SMS not exists!')
        }
      }
    })
  })

  instance.delete('/employee_remove/:id', { version: '1.0.0' }, (request, reply) => {
    instance.employees.findOne({ _id: request.params.id }, (err, employer) => {
      if (err) {
        send_Error(request.raw.url, JSON.stringify(err))
        reply.error("Error on finding employee")
      }
      else {
        if (employer) {
          instance.employees.deleteOne({ _id: request.params.id }, (error) => {
            if (error) {
              send_Error(request.raw.url, JSON.stringify(error))
              reply.error("Could not delete employee")
            }
            else {
              send_to_slack(request.raw.url, JSON.stringify(employer.name) + ' removed', 'Success')
              instance.pushnotification(111, employer, employer.service)
              reply.ok(employer)
            }
          })
        }
        else {
          send_Error(request.raw.url, 'Employee does not exist on id = ' + request.params.id)
          reply.error("employee does not exist")
        }
      }
    })
  })

  instance.post('/bosupdate', { version: '1.0.0' }, (request, reply) => {
    var token = request.headers['authorization']
    // console.log(request.body)
    if (token) {
      // console.log(token)
      instance.BOS.findOne({ token: token }, (error, bos) => {
        if (error) {
          send_Error(request.raw.url, JSON.stringify(error))
          reply.send({
            statusCode: 404,
            error: 'Not found',
            message: 'Bos not found'
          })
        }
        else {
          if (bos) {
            instance.BOS.updateOne({
              _id: bos.id
            }, request.body, (error, result) => {
              if (error) {
                send_Error(request.raw.url, JSON.stringify(error))
                reply.error('Could not update')
              } else {
                if (result.ok) {
                  instance.BOS.findOne({
                    _id: bos.id
                  }, (error, item) => {
                    if (error) {
                      send_Error(request.raw.url, JSON.stringify(error))
                      reply.error('Could not found')
                    } else {
                      reply.ok(item)
                    }
                  })
                }
                else {
                  send_Error(request.raw.url, JSON.stringify(result))
                  reply.error('Error on updating bos')
                }
              }
            })
          }
          else {
            send_Error(request.raw.url, 'Invalid token')
            reply.send({
              statusCode: 498,
              error: "Invalid token",
              message: "Invalid token"
            })
          }
        }
      })
    }
    else {
      send_Error(request.raw.url, 'Token required')
      reply.send({
        statusCode: 499,
        error: "Token required",
        message: "Token required"
      })
    }
  })

  instance.post('/send_error', { version: '1.0.0' }, (request, reply) => {
    axios.post(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage?chat_id=-1001193199441&parse_mode=html&text=${JSON.stringify(request.body)}`).then(() => { }).catch(() => { }).then(() => { })
    reply.ok()
  })

  function messageTo(receiver, reply) {
    var P = receiver.is_active ? 1 : 0
    var message = {
      to: receiver.fire_token,
      data: {
        type_message: "ALLOW",
        message: P
      }
    }

    fcm.send(message, function (err, response) {
      if (err) {
        send_Error('Allow employee to ' + receiver.name, JSON.stringify(err))
        reply.error('Invalid firebase token')
      } else {
        send_to_slack('Allow employee to ' + receiver.name, 'employeeslists', 'Success')
        reply.ok(receiver)
      }
    })
  }

  instance.post('/inone/getINN', { version: '1.0.0' }, (request, reply) => {
    instance.organizations.findOne({ inn: request.body.inn }, (err, organization) => {
      if (err) {
        reply.error('Error on finding Organization')
      }
      else {
        if (organization) {
          instance.BOS.findOne({ organization: organization._id }, (err, bos) => {
            if (err) {
              reply.error('Error on finding bos')
            }
            else {
              if (bos) {
                instance.SMS_Bot.findOne({ inn: request.body.inn }, (err, sms) => {
                  if (err) {
                    send_Error(request.raw.url, JSON.stringify(err))
                    reply.error('Error on finding sms_code')
                  }
                  else {
                    var sms_code = getRandomInt(90000) + 10000
                    if (sms) {
                      instance.SMS_Bot.updateOne({ _id: sms._id }, { $set: { sms_code: sms_code } }, (err, _) => {
                        if (err) {
                          send_Error(request.raw.url, JSON.stringify(err))
                          reply.error('Error on updating sms_code')
                        }
                        else {
                          send_sms_code(sms_code, bos.phone_number, reply)
                        }
                      })
                    }
                    else {
                      var sms_model = new instance.SMS_Bot({
                        inn: organization.inn,
                        phone_number: bos.phone_number,
                        sms_code: sms_code
                      })
                      sms_model.save((err) => {
                        if (err) {
                          send_Error(request.raw.url, JSON.stringify(err))
                          reply.error('Error on saving sms_code')
                        }
                        else {
                          send_sms_code(sms_code, bos.phone_number, reply)
                        }
                      })
                    }
                  }
                })
              }
              else {
                reply.error('Bos not found')
              }
            }
          })
        }
        else {
          reply.error('Organization not found')
        }
      }
    })
  })

  instance.post('/inone/check_password', { version: '1.0.0' }, (request, reply) => {
    reply.error('NOT found')

    instance.SMS_Bot.findOne({ inn: request.body.inn, sms_code: request.body.sms_code }, (err, sms) => {
      if (err) {
        reply.error('Error on finding sms code')
      }
      else {
        if (sms) {
          instance.organizations.findOne({ inn: request.body.inn }, (err, organization) => {
            if (err) {
              reply.error('Error on finding Organization')
            }
            else {
              if (organization) {
                instance.BOS.findOne({ organization: organization._id }, { "_id": 1, "organization": 1, "full_name": 1, "token": 1 }, (err, bos) => {
                  if (err) {
                    reply.error('Error on finding bos')
                  }
                  else {
                    if (bos) {
                      reply.ok(bos)
                    }
                    else {
                      reply.error('Bos not found')
                    }
                  }
                })
              }
              else {
                reply.error('Organization not found')
              }
            }
          })
        }
        else {
          reply.error('Sms code does not exist')
        }
      }
    })
  })

  instance.post('/employee/allow', { version: '1.0.0' }, (request, reply) => {
    var obj = request.body
    instance.employees.findOneAndUpdate({ _id: obj.employer_id }, { $set: { is_active: obj.is_active } }, function (err, doc) {
      if (err) {
        send_Error(request.raw.url, JSON.stringify(err))
        reply.error("Error on updating data")
      }
      else {
        if (doc) {
          instance.pushnotification(111, doc, doc.service)
          instance.employees.findOne({ _id: obj.employer_id }, (err, employer) => {
            if (err) {
              send_Error(request.raw.url, JSON.stringify(err))
              reply.error("Error")
            }
            else {
              if (employer) {
                messageTo(employer, reply)
              }
              else {
                send_Error(request.raw.url, 'could not update')
                reply.error("Error")
              }
            }
          })
        }
        else {
          send_Error(request.raw.url, 'Could not update data')
          reply.error("Error on updating data")
        }
      }
    })
  })

  instance.get('/organization/:id/services', { version: '1.0.0' }, (request, reply) => {
    var id = request.params.id
    instance.organizations.findOne({ _id: id }, (error, organization) => {
      if (error) {
        send_Error(request.raw.url, JSON.stringify(error))
        reply.error('Error on finding organization')
      }
      else {
        if (organization) {
          if (organization.services == null) {
            organization.services = []
          }
          instance.services.find({ organization: organization._id }, (error, services) => {
            if (error) {
              send_Error(request.raw.url, JSON.stringify(error))
              reply.error('Error on finding services')
            }
            else {
              if (services != null) {
                reply.ok(services)
              }
              else {
                send_Error(request.raw.url, 'Services could not found')
                reply.error('Services could not find')
              }
            }
          })
        }
        else {
          send_Error(request.raw.url, 'Organization could not found')
          reply.error('Organization could not found')
        }
      }
    })
  })

  instance.get('/organization', { version: '1.0.0' }, (request, reply) => {
    var token = request.headers['authorization']
    instance.authorization(request, reply, (bos) => {
      instance.organizations.findOne({ _id: bos.organization }, (error, organization) => {
        if (error) {
          send_Error(request.raw.url, JSON.stringify(error))
          reply.error('Organization could not found')
        }
        else {
          if (organization) {
            send_to_slack(request.raw.url, JSON.stringify(organization), 'Success')
            reply.ok(organization)
          }
          else {
            send_Error(request.raw.url, 'Organization could not found')
            reply.error('Organization could not found')
          }
        }
      })
    })
    // if (token) {
    //   instance.BOS.findOne({ token: token }, (error, bos) => {
    //     if (error) {
    //       reply.send({
    //         statusCode: 404,
    //         error: 'Not found',
    //         message: 'Bos not found'
    //       })
    //     }
    //     else {
    //       if (bos) {
    //         instance.organizations.findOne({ _id: bos.organization }, (error, organization) => {
    //           if (error) {
    //             send_Error(request.raw.url, JSON.stringify(error))
    //             reply.error('Organization could not found')
    //           }
    //           else {
    //             if (organization) {
    //               send_to_slack(request.raw.url, JSON.stringify(organization), 'Success')
    //               reply.ok(organization)
    //             }
    //             else {
    //               send_Error(request.raw.url, 'Organization could not found')
    //               reply.error('Organization could not found')
    //             }
    //           }
    //         })
    //       }
    //       else {
    //         send_Error(request.raw.url, 'Invalid token')
    //         reply.send({
    //           statusCode: 498,
    //           error: "Invalid token",
    //           message: "Invalid token"
    //         })
    //       }
    //     }
    //   })
    // }
    // else {
    //   send_Error(request.raw.url, 'Token required')
    //   reply.send({
    //     statusCode: 499,
    //     error: "Token required",
    //     message: "Token required"
    //   })
    // }
  })

  const organizationUpdateSchema = {
    body: {
      type: 'object',
      required: [],
      properties: {
        inn: { type: 'string' },
        loyalty_bonus: { type: 'number' },
        nds_value: { type: 'number' },
        address: { type: 'string' },
        epos_token: { type: 'string' },
      }
    }
  };

  instance.patch('/organization', { version: '1.0.0', schema: organizationUpdateSchema }, (request, reply) => {
    instance.authorization(request, reply, (bos) => {
      instance.organizations.findOneAndUpdate(
        { _id: bos.organization },
        { $set: request.body },
        { new: true },
        (error, organization) => {
          if (error) {
            send_Error(request.raw.url, JSON.stringify(error))
            reply.error('Organization could not found')
          }
          else {
            if (organization) {
              send_to_slack(request.raw.url, JSON.stringify(organization), 'Success')
              reply.ok(organization)
            }
            else {
              send_Error(request.raw.url, 'Organization could not found')
              reply.error('Organization could not found')
            }
          }
        })
    })
  })

  var create_service = (request, reply, user) => {
    instance.organizations.findOne({ _id: user.organization }, (error, organization) => {
      if (error) {
        send_Error(request.raw.url, JSON.stringify(error))
        return reply.error('Error')
      }
      else {
        if (organization) {
          instance.services.find({
            _id: { $in: organization.services }
          }, (err, servicesss) => {
            if (err || servicesss == null) {
              servicesss = []
            }
            var valid = true
            for (var ser of servicesss) {
              valid = valid && (!(ser.name == request.body.name || request.body.name == ""))
            }
            if (servicesss.length == 0) {
              valid = request.body.name != ""
            }
            if (valid) {
              var model = instance.services(Object.assign({ organization: user.organization }, request.body))
              model.save((error, service) => {
                if (error) {
                  send_Error(request.raw.url, JSON.stringify(error))
                  reply.error('Error')
                }
                else {
                  var _id = service._id
                  var services = organization.services
                  services.push(_id)
                  instance.organizations.updateOne({ _id: organization._id }, {
                    services: services
                  }, (error, _) => {
                    if (error) {
                      send_Error(request.raw.url, JSON.stringify(error))
                      reply.error('Error')
                    }
                    else {
                      send_to_slack(request.raw.url, model.collection.name, 'Success')
                      instance.organizations.updateOne({ _id: organization._id }, { $set: { is_service_created: true } }, (err, success) => {
                        if (err) {
                          send_Error(request.raw.url, JSON.stringify(err))
                        }
                      })
                      reply.ok(service)
                      instance.goodsSales.updateMany({
                        organization: organization._id
                      }, {
                        $push: {
                          services: {
                            available: false,
                            service: service._id,
                            service_name: service.name,
                            price: 0,
                            in_stock: 0,
                            low_stock: 0,
                            optimal_stock: 0
                          }
                        }
                      }, () => { })
                      // instance.goodsSales.find({
                      //   organization: organization._id,
                      // }, (err, goods) => {
                      //   if(err || goods == null) {
                      //     goods = []
                      //   }
                      //   for(var g of goods) {
                      //     var show = true
                      //     var price = 0.0
                      //     for(var s of g.services) {
                      //       show = show && s.available
                      //       price = s.price
                      //     }
                      //     g.services.push({
                      //       available: show,
                      //       service: service._id,
                      //       service_name: service.name,
                      //       price: price,
                      //       in_stock: 0,
                      //       low_stock: 0,
                      //       optimal_stock: 0
                      //     })

                      //     instance.goodsSales.updateOne({
                      //       _id: g._id
                      //     }, {
                      //       $set: g
                      //     }, (err, _) => {
                      //       if(err) {
                      //         instance.send_Error('adding service to goods', JSON.stringify(err))
                      //       }
                      //     })
                      //   }
                      // })
                      instance.goodsDiscount.updateMany({
                        organization: organization._id
                      }, {
                        $push: {
                          services: {
                            service: service._id,
                            service_name: service.name,
                            available: false
                          }
                        }
                      }, () => { })
                      // instance.goodsDiscount.find({
                      //   organization: organization._id
                      // }, (_, discs) => {
                      //   if(discs == null) {
                      //     discs = []
                      //   }
                      //   for(var d of discs) {
                      //     var show = true
                      //     for(var s of d.services) {
                      //       show = show && s.available
                      //     }
                      //     d.services.push({
                      //       service: service._id,
                      //       service_name: service.name,
                      //       available: show
                      //     })
                      //     instance.goodsDiscount.updateOne({_id: d._id}, {$set: d}, (err, _) => {
                      //       if(err) {
                      //         instance.send_Error('adding service to discouns', JSON.stringify(err))
                      //       }
                      //     })
                      //   }
                      // })
                      instance.settingsTaxes.updateMany({
                        organization: organization._id
                      }, {
                        $push: {
                          services: {
                            service: service._id,
                            service_name: service.name,
                            available: false
                          }
                        }
                      }, () => { })
                      // instance.settingsTaxes.find({
                      //   organization: organization._id
                      // }, (_, taxes) => {
                      //   if (taxes == null) {
                      //     taxes = []
                      //   }
                      //   for (var t of taxes) {
                      //     var show = true
                      //     for (var s of t.services) {
                      //       show = show && s.available
                      //     }
                      //     t.services.push({
                      //       service: service._id,
                      //       service_name: service.name,
                      //       available: show
                      //     })
                      //     instance.settingsTaxes.updateOne({
                      //       _id: t._id
                      //     }, {
                      //       $set: t
                      //     }, (err, _) => {
                      //       if (err) {
                      //         instance.send_Error('adding service to taxes', JSON.stringify(err))
                      //       }
                      //     })
                      //   }
                      // })
                      instance.User.updateMany({
                        organization: organization._id
                      }, {
                        $push: {
                          services: {
                            service: service._id,
                            service_name: service.name,
                            available: false
                          }
                        }
                      }, () => { })
                      // instance.User.find({
                      //   organization: organization._id,
                      //   role: 'admin'
                      // }, (_, users) => {
                      //   if (users == null) {
                      //     users = []
                      //   }
                      //   for (var u of users) {
                      //     u.services.push({
                      //       service: instance.ObjectId(service._id),
                      //       service_name: service.name,
                      //       available: true
                      //     })
                      //     instance.User.updateOne({
                      //       _id: u._id
                      //     }, {
                      //       $set: u
                      //     }, (err) => {
                      //       if (err) {
                      //         instance.send_Error('adding service to users', JSON.stringify(err))
                      //       }
                      //     })
                      //   }
                      // })
                      instance.goodsCategory.updateMany({
                        organization: organization._id
                      }, {
                        $push: {
                          services: {
                            service: service._id,
                            service_name: service.name,
                            available: false
                          }
                        }
                      }, () => {})
                    }
                  })
                }
              })
            }
            else {
              instance.aldy_exs(reply)
            }
          })
        }
        else {
          reply.error('Organization does not exist')
        }
      }
    })
  }

  instance.post('/organizations/service/:id/create', { version: '1.0.0' }, (request, reply) => {
    instance.authorization(request, reply, (user) => {
      create_service(request, reply, user)
    })
  })

  const serviceCreateSchema = {
    body: {
      type: 'object',
      additionalProperties: false,
      required: ['name'],
      properties: {
        name: { type: 'string', minLength: 1 },
        address: { type: 'string' },
        description: { type: 'string' },
        phone_number: { type: 'string' },
        type: {
          type: 'string',
          enum: ['shop', 'restaurant', 'market'],
          default: 'shop'
        }
      }
    }
  }

  instance.post(
    '/organizations/service/create',
    {
      version: '1.0.0',
      schema: serviceCreateSchema,
      attachValidation: true
    },
    (request, reply) => {
      if (request.validationError) {
        return reply.validation(request.validationError.message)
      }
      instance.authorization(request, reply, (user) => {
        create_service(request, reply, user)
      })
    })

  instance.post('/employees/password_edit', { version: '1.0.0' }, (request, reply) => {
    var token = request.headers['authorization']
    if (token) {
      instance.BOS.findOne({ token: token }, (error, bos) => {
        if (error) {
          reply.send({
            statusCode: 404,
            error: 'Not found',
            message: 'Bos not found'
          })
        }
        else {
          if (bos) {
            instance.employees.findOne({ _id: request.body.employee_id }, (err, employee) => {
              if (err || employee == null) {
                console.log('Employee not fount')
                reply.send({
                  statusCode: 404,
                  error: 'Not found',
                  message: 'Employee not found'
                })
              }
              else {
                instance.employees.find({ service: employee.service }, (err, employeess) => {
                  if (err || employeess == null) {
                    employeess = []
                  }
                  var passwords = []
                  for (var e of employeess) {
                    passwords.push(e.password)
                  }
                  var password = request.body.password
                  var Pass_all_exist = false
                  if (passwords.includes(password)) {
                    if (password == employee.password) {
                      Pass_all_exist = false
                    }
                    else {
                      Pass_all_exist = true
                    }
                  }
                  if (Pass_all_exist) {
                    reply.error('Password allready exist')
                  }
                  else {
                    axios.defaults.headers.common['Authorization'] = bos.token
                    axios.defaults.headers.common['Accept-Version'] = '1.0.0';
                    axios.defaults.headers.post['Content-Type'] = 'application/json';
                    var obj = {
                      password: password
                    }
                    axios.defaults.data = obj
                    axios.post(BASE_URL + '/employees/list/update/' + request.body.employee_id, obj)
                      .then(function (response) {
                        reply.send(response.data)
                      })
                      .catch(function (error) { reply.error('Error on updating') }).then(function () { });
                  }
                })
              }
            })
          }
          else {
            reply.send({
              statusCode: 498,
              error: "Invalid token",
              message: "Invalid token"
            })
          }
        }
      })
    }
    else {
      reply.send({
        statusCode: 499,
        error: "Token required",
        message: "Token required"
      })
    }
  })

  instance.post('/upload', (request, reply) => {
    const files = request.raw.files
    if (files) {
      if (files['image']) {
        const image = files['image']
        var wstream = fs.createWriteStream('./static/' + image.md5 + image.name);
        wstream.write(image.data)
        wstream.end()
        var path = image.md5 + image.name
        send_to_slack(request.raw.url, 'image', 'Success')
        reply.send({
          statusCode: 200,
          error: 'Ok',
          message: 'Success',
          data: {
            path: path
          }
        })
      }
      else {
        reply.callNotFound()
      }
    }
    else {
      send_Error(request.raw.url, 'Image Not found')
      reply.send({
        statusCode: 404,
        error: 'Not found',
        message: 'Image not found'
      })
    }
  })

  next()
}