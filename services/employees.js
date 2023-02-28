const TokenGenerator = require('uuid-token-generator')
const mongoose = require('mongoose')
var FCM = require('fcm-node')
var serverKey = 'AAAACPKexKE:APA91bHcaxbRaXNjWGaxWglbs0U4OpbI1MLxb1IvF3UY1OZnkllgQ_nizhvVyr9fXv2EBVyZxjb3C9rmrXFDuMap4Z96bgZ_kcVM7YA0kWgvMbpUAisdycuxCdUd_x3ib4gMN0y5Mlml'
var fcm = new FCM(serverKey)
const axios = require('axios')
const qs = require('qs');

var wrong_token = {
  statusCode: 498,
  error: "Invalid token",
  message: "Invalid token"
}
var empl_aldy_exs = {
  statusCode: 419,
  error: 'Employee has already exist'
}
var empl_hs_not_exs = {
  statusCode: 420,
  error: 'Employee has not registered'
}
module.exports = (instance, _, next) => {

  // var on = function (request, reply, next) {
  //   if (request.headers.authorization) {
  //     var token = request.headers['authorization']
  //     instance.BOS.findOne({ token: token }, (err, bos) => {
  //       if (err) {
  //         reply.error('Error on finding bos')
  //       }
  //       else {
  //         if (bos) {
  //           next(bos)
  //         }
  //         else {
  //           instance.employees.findOne({ token: token }, (err, employee) => {
  //             if (err) {
  //               reply.error('Error on finding employee')
  //             }
  //             else {
  //               if (employee) {
  //                 next(employee)
  //               }
  //               else {
  //                 if (request.headers['accept-user'] == 'admin') {
  //                   reply.status(401).send({
  //                     message: 'Unauthorized'
  //                   })
  //                 }
  //                 else {
  //                   reply.send(wrong_token)
  //                 }
  //               }
  //             }
  //           })
  //         }
  //       }
  //     })
  //   }
  //   else {
  //     reply.send(wrong_token)
  //   }
  // }

  const on = function (request, reply, next) {
    instance.authorization(request, reply, (user) => {
      if (user) { next(user) }
    })
  }

  instance.generate('/employees/list', instance.employees)

  function messageTo(receiver, request, reply, sender) {
    var message = {
      to: receiver.fire_token,
      // notification: {
      //   title: 'registering',
      //   body: request.body.name + " has registered your service"
      // },
      data: {
        employer_id: sender._id,
        type_message: 'REGISTER',
        body: sender.name
      }
    }

    fcm.send(message, function (err, response) {
      if (err) {
        instance.send_Error('employee register', JSON.stringify(err))
        reply.ok()
      }
      else {
        reply.ok('Successfully sent to ' + receiver.full_name)
      }
    })
  }

  function messageToBos(receiver, reply, sender) {
    var message = {
      to: receiver.fire_token,
      data: {
        employer_id: sender._id,
        type_message: 'REGISTER',
        body: sender.name
      }
    }

    fcm.send(message, function (err, response) {
      if (err) {
        instance.send_Error('')
        reply.error(err)
      }
      else {
        reply.ok('Successfully sent to ' + receiver.full_name)
      }
    })
  }
  function employee_edit(receiver, sender) {
    var message = {
      to: receiver.fire_token,
      data: {
        type_message: 'CHANGES',
        body: sender.name
      }
    }

    fcm.send(message, function (err, response) {
      if (err) {
        console.log("Error " + err)
      }
      else {
        console.log("Successfully sent !!!")
      }
    })
  }

  // axios.post('https://inone.uz/send.php', qs.stringify({
  //   number: phone_number,
  //   sms: `Your InOne verification sms code: ${sms_code}`
  // }))


  instance.get('/askpermission', { version: '1.0.0' }, (request, reply) => {
    var token = request.headers['authorization']
    instance.employees.findOne({ token: token }, (err, employer) => {
      if (err) {
        reply.error('Error on finding employee')
      }
      else {
        if (employer) {
          instance.BOS.findOne({ organization: employer.organization }, (error, bos) => {
            if (error) {
              reply.error('Bos not found')
            } else {
              if (bos) {
                messageToBos(bos, reply, employer)
              } else {
                reply.error('Bos not found')
              }
            }
          })
        }
        else {
          reply.send(wrong_token)
        }
      }
    })
  })

  instance.post('/employees/register', { version: '1.0.0' }, (request, reply) => {
    instance.organizations.findOne({
      _id: request.body.organization
    }, (error, organization) => {
      if (error) {
        reply.error('Could not found a organization')
      } else {
        instance.services.findOne({
          _id: request.body.service
        }, (error, service) => {
          if (error) {
            reply.error('Could not found service')
          } else {
            if (organization) {
              instance.employees.find({ service: service._id }, (err, employeess) => {
                if (err || employeess == null) {
                  employeess = []
                }
                var passwords = []
                for (var e of employeess) {
                  passwords.push(e.password)
                }
                var password = getRandomInt(9000) + 1000;
                while (passwords.includes(password)) {
                  password = getRandomInt(9000) + 1000;
                }
                var data = {
                  organization: organization._id,
                  service: service._id,
                  name: request.body.name,
                  email: request.body.email,
                  password: password,
                  check_id: String.fromCharCode(65 + employeess.length),
                  phone_number: request.body.phone_number,
                  percentage: service.service_value,
                  // last_name: employer.last_name,
                  // experience: employer.experience,
                  token: (new TokenGenerator()).generate(),
                  role: request.body.role,
                  image_url: request.body.image_url
                }
                instance.employees.findOne({
                  phone_number: data.phone_number
                }, (error, employees) => {
                  if (error) {
                    reply.error('Error in finding employees')
                  } else {
                    if (employees) {
                      reply.send(empl_aldy_exs)
                    } else {
                      var model = new instance.employees(data)
                      model.save((error) => {
                        if (error) {
                          reply.error('Could not save!')
                        } else {
                          instance.employees.findOne({
                            phone_number: data.phone_number
                          }, (error, employees) => {
                            if (error) {
                              reply.error('Error finding employer')
                            } else {
                              instance.BOS.findOne({ organization: data.organization }, (err, bos) => {
                                if (err) {
                                  reply.error('Error on finding bos')
                                }
                                else {
                                  if (bos) {
                                    sent_token(employees.name, employees.token)
                                    instance.pushnotification(111, employees, employees.service)
                                    messageTo(bos, request, reply, model)
                                  }
                                  else {
                                    reply.error('Bos does not exist')
                                  }
                                }
                              })
                            }
                          })
                        }
                      })
                    }
                  }
                })
              })
            }
            else {
              reply.error('Organization could not found')
            }
          }
        })
      }
    })
  })

  function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
  }

  function send_sms_code(sms_code, phone_number, reply) {
    reply.ok()
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
    //   console.log('Success')
    // }).catch((error) => {
    //   console.log(error)
    // })
    axios.post(`https://api.telegram.org/bot769464007:AAFjO5cpIsqUMbhG0rTLkQ4dex63fjs1nUM/sendMessage?chat_id=-1001258934534&parse_mode=html&text=${sms_code} is Sms code of ${phone_number}`)
      .then(function (response) { }).catch(function (err) { }).then(function () { })
  }

  function sent_token(name, token) {
    // axios.post('https://slack.com/api/chat.postMessage', qs.stringify({
    //   channel: "GLVRB304X",
    //   text: `token of the ${name} is ${token}`
    // }), {headers: headers})
    // .then(response => {
    //   console.log('Success')
    // }).catch((error) => {
    //   console.log('Error')
    // })
    axios.post(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage?chat_id=${TELEGRAMID}&parse_mode=html&text=Token of <b>${name}</b> is <i>${token}</i>`)
      .then(function (response) { }).catch(function (err) { }).then(function () { })
  }

  instance.post('/employees/login', {
    version: '1.0.0'
  }, (request, reply) => {
    var phone_number = request.body.phone_number
    instance.employees.findOne({
      phone_number: phone_number
    }, (error, employer) => {
      if (error) {
        reply.error('Error on finding employee')
      } else {
        if (employer) {
          instance.SMS.findOne({
            phone_number: phone_number,
            user: 'employee'
          }, (error, Sms_code) => {
            var sms_code = getRandomInt(9000) + 1000;
            // var sms_code = 1111
            if (error) {
              reply.error('Error')
            }
            else {
              var timer = new Date().getTime()
              if (Sms_code) {
                instance.SMS.findOneAndUpdate({ _id: Sms_code._id }, { $set: { sms_code: sms_code, timer: timer } }, (err, doc) => {
                  if (err) {
                    reply.error('Error on updating sms code')
                  }
                  else {
                    send_slack(sms_code, employer.phone_number, reply)
                    send_sms_code(sms_code, employer.phone_number, reply)
                  }
                })
              }
              else {
                var model = new instance.SMS({
                  phone_number: phone_number,
                  user: 'employee',
                  sms_code: sms_code,
                  timer: timer
                })
                model.save((error) => {
                  if (error) {
                    reply.error('Error')
                  }
                  else {
                    send_slack(sms_code, employer.phone_number, reply)
                    send_sms_code(sms_code, employer.phone_number, reply)
                  }
                })
              }
            }
          })
        }
        else {
          reply.send(empl_hs_not_exs)
        }
      }
    })
  })

  instance.post('/employees/login/verify', {
    version: '1.0.0'
  }, (request, reply) => {
    var phone_number = request.body.phone_number
    // console.log(phone_number)
    instance.employees.findOne({
      phone_number: phone_number
    }, (error, employer) => {
      if (error) {
        reply.error('Error on finding employee')
      } else {
        if (employer) {
          instance.SMS.findOne({
            phone_number: phone_number,
            user: 'employee'
          }, (error, sms) => {
            if (error) {
              reply.error('Error')
            }
            else {
              if (sms) {
                var timer = new Date().getTime()
                if (sms.sms_code == request.body.sms_code && timer - sms.timer < 180000) {
                  instance.SMS.deleteOne({
                    _id: sms._id
                  }, (err, _) => {
                    if (err) {
                      instance.send_Error(request.raw.url, JSON.stringify(err))
                    }
                  })
                  ///////////////////////////////
                  var idd = employer.organization
                  instance.organizations.findOne({ _id: idd }, (error, organization) => {
                    if (error) {
                      reply.error('Error on finding organization')
                    }
                    else {
                      if (organization) {
                        instance.services.findOne({ _id: employer.service }, (error, services) => {
                          if (error) {
                            reply.error('Error on finding services')
                          }
                          else {
                            if (services) {
                              data = {}
                              // for(const service of services){
                              var my_service = services;
                              // if (employer.service == service._id){
                              // my_service = service
                              data = {
                                inn: organization.inn,
                                _id: employer._id,
                                fire_token: employer.fire_token,
                                organization: employer.organization,
                                service: employer.service,
                                check_id: employer.check_id,
                                last_receipt: employer.last_receipt,
                                service_value: my_service.service_value,
                                name: employer.name,
                                // last_name: employer.last_name,
                                // experience: employer.experience,
                                email: employer.email,
                                phone_number: employer.phone_number,
                                token: employer.token,
                                password: employer.password,
                                role: employer.role,
                                image_url: employer.image_url,
                                __v: employer.__v,
                                is_shop: my_service.is_shop
                              }
                              //   break;
                              // }
                              // }
                              if (data.inn) {
                                reply.ok(data)
                              }
                              else {
                                reply.error('Error on finding employee')
                              }
                            }
                            else {
                              reply.error('Services could not find')
                            }
                          }
                        })
                      }
                      else {
                        reply.error('Organization could not found')
                      }
                    }
                  })
                  ///////////////////////////////
                }
                else {
                  reply.error('Incorrect sms code')
                }
              }
            }
          })
        }
        else {
          reply.send(empl_hs_not_exs)
        }
      }
    })
  })

  var on2 = function (request, reply, next) {
    var token = request.body.token
    if (token) {
      instance.employees.findOne({ token: token }, (err, employee) => {
        if (err) {
          reply.error('Error on finding employee')
        }
        else {
          if (employee) {
            next(employee)
          }
          else {
            reply.send(wrong_token)
          }
        }
      })
    } else {
      reply.send({
        statusCode: 499,
        error: "Token required",
        message: "Token required"
      })
    }
  }


  instance.post('/employees/edit', { version: '1.0.0' }, (request, reply) => {
    var token = request.headers['authorization']
    if (token) {
      delete request.body.token
      delete request.body.is_active
      instance.User.findOne({ employee_token: token }, (error, employer) => {
        if (error) {
          reply.send({
            statusCode: 404,
            error: 'Not found',
            message: 'Employee not found'
          })
        }
        else {
          if (employer) {
            reply.ok(employer)
            // if (Object.keys(request.body).length == 0) {
            //   instance.pushnotification(111, employer, employer.service)
            //   reply.ok(employer)
            // }
            // else {
            //   instance.employees.updateOne({
            //     _id: employer.id
            //   }, request.body, (error, result) => {
            //     if (error) {
            //       reply.error('Could not update')
            //     } else {
            //       if (result.ok) {
            //         if (employer != undefined)
            //           if (employer.organization != undefined)
            //             instance.BOS.findOne({ organization: employer.organization }, (err, bos) => {
            //               if (err) {
            //                 console.log(err)
            //               }
            //               else {
            //                 if (bos) {
            //                   instance.pushnotification(111, employer, employer.service)
            //                   employee_edit(bos, employer)
            //                 }
            //                 else {
            //                   console.log('bos does not exist')
            //                 }
            //               }
            //             })
            //         instance.employees.findOne({
            //           _id: employer.id
            //         }, (error, item) => {
            //           if (error) {
            //             reply.error('Could not found')
            //           } else {
            //             instance.pushnotification(111, item, item.service)
            //             reply.ok(item)
            //           }
            //         })
            //       }
            //     }
            //   })
            // }
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

  const getAllEmployees = (request, reply, user) => {
    if (!user) {
      return reply.unauthorized()
    }
    const by_whom = request.query.by_whom
    const query = { organization: user.organization }
    if (request.headers['accept-service'] != undefined) {
      delete query.service
      query['$or'] = [{ services: { $elemMatch: { service: { $eq: request.headers['accept-service'] }, available: { $eq: true } } } }, { role: 'boss' }]
    }
    instance.User.find(query, { boss_token: 0, admin_token: 0, boss_fire_token: 0, services: 0 }, (err, employees) => {
      if (err) {
        reply.error('Error on finding Employees')
      }
      else {
        if (employees == null) {
          employees = []
        }
        instance.AccessRights.find({
          organization: user.organization
        }, async (err, accesses) => {
          if (accesses == null) {
            accesses = []
          }
          var accessObj = {}
          for (var a of accesses) {
            accessObj[a.name] = a
          }
          var EMPLOYEES = []
          for (let i = 0; i < employees.length; i++) {
            try {
              employees[i] = employees[i].toObject()
            }
            catch (error) {
              instance.send_Error('to Object', error.message)
            }
            if (employees[i].employee_token == 'Unchanged') {
              employees[i].employee_token = (new TokenGenerator()).generate()
              await instance.User.updateOne({ _id: employees[i]._id }, { $set: { employee_token: employees[i].employee_token } })
            }

            try {
              const workgroup = await instance.Workgroup.findById(employees[i].workgroup_id)
              if (workgroup) {
                employees[i].is_warehouse = workgroup.is_warehouse;
              }
            } catch (error) { }
            if (!employees[i].is_warehouse) {
              employees[i].is_warehouse = false;
            }

            employees[i].token = employees[i].employee_token
            employees[i].employee_token = undefined
            employees[i].fire_token = employees[i].employee_fire_token
            employees[i].employee_fire_token = undefined
            try {
              employees[i].password = by_whom == 'csharp' ? employees[i].password : +employees[i].password
              // employees[i].password = +employees[i].password
            }
            catch (error) {
              console.log(error.message)
            }
            if (accessObj[employees[i].role] != undefined) {
              if (accessObj[employees[i].role].pos) {
                employees[i].access = {
                  close_ticket: accessObj[employees[i].role].close_ticket,
                  can_sell: accessObj[employees[i].role].can_sell,
                  print_pre_check: accessObj[employees[i].role].print_pre_check,
                  receipt_save_as_draft: accessObj[employees[i].role].receipt_save_as_draft,
                  wharehouse_manager: accessObj[employees[i].role].wharehouse_manager,
                  can_change_price: accessObj[employees[i].role].can_change_price,
                  refund: accessObj[employees[i].role].refund,
                  show_all_receipts: accessObj[employees[i].role].show_all_receipts,
                  pay_debt: accessObj[employees[i].role].pay_debt,
                  show_shift_history: accessObj[employees[i].role].show_shift_history,
                  apply_discount: accessObj[employees[i].role].apply_discount,
                  change_settings: accessObj[employees[i].role].change_settings,
                  show_stock: accessObj[employees[i].role].show_stock,
                  edit_items: accessObj[employees[i].role].edit_items,
                  edit_ticket: accessObj[employees[i].role].edit_ticket,
                  split_ticket: accessObj[employees[i].role].split_ticket,
                  change_waiter: accessObj[employees[i].role].change_waiter,
                  delete_ticket: accessObj[employees[i].role].delete_ticket,
                  show_all_tickets: accessObj[employees[i].role].show_all_tickets,
                  can_access_to_shift: accessObj[employees[i].role].can_access_to_shift,
                }
                if (employees[i].role != 'waiter') {
                  employees[i].role = 'cashier'
                }
                EMPLOYEES.push(employees[i])
              }
            }
          }
          reply.ok(EMPLOYEES)
        })
      }
    })
  }
  const getUpdatedAllEmployees = async (request, reply, user) => {
    const from = request.query.from
    const to = request.query.to
    const service = request.query.service
    if (typeof service != 'string' || service.length != 24) {
      return reply.error('service must objectId')
    }
    const date = new Date();
    const from_time = from ? new Date(parseInt(from)) : date;
    date.setDate(date.getDate() + 1);
    const to_time = to ? new Date(parseInt(to)) : date;
    if (from_time == 'Invalid Date' || to_time == 'Invalid Date')
      return reply.error('time must timestamp')
    const query = {
      organization: user.organization,
      $and: [
        {
          $or: [
            {
              services: {
                $elemMatch: {
                  available: { $eq: true },
                }
              }
            },
            { role: 'boss' },
          ],
        },
        {
          $or: [
            { updatedAt: { $gte: from_time, $lte: to_time } },
            { createdAt: { $gte: from_time, $lte: to_time } },
          ],
        }
      ],
    }
    if (service)
      query.$and[0].$or[0].services.$elemMatch.service = {
        $eq: instance.ObjectId(service)
      }
    const employees = await instance.User
      .find(
        query,
        { boss_token: 0, admin_token: 0, boss_fire_token: 0, services: 0 }
      )
      .lean();

    const accesses = await instance.AccessRights
      .find({ organization: user.organization })
      .lean()

    const accessObj = {}
    for (var a of accesses) {
      accessObj[a.name] = a
    }
    const EMPLOYEES = []
    for (let i = 0; i < employees.length; i++) {
      if (employees[i].employee_token == 'Unchanged') {
        employees[i].employee_token = (new TokenGenerator()).generate()
        await instance.User.updateOne(
          { _id: employees[i]._id },
          { $set: { employee_token: employees[i].employee_token } }
        )
      }

      employees[i].token = employees[i].employee_token
      employees[i].employee_token = undefined
      employees[i].fire_token = employees[i].employee_fire_token
      employees[i].employee_fire_token = undefined
      employees[i].password = employees[i].password

      if (accessObj[employees[i].role] != undefined) {
        if (accessObj[employees[i].role].pos) {
          employees[i].access = {
            close_ticket: accessObj[employees[i].role].close_ticket,
            can_sell: accessObj[employees[i].role].can_sell,
            print_pre_check: accessObj[employees[i].role].print_pre_check,
            receipt_save_as_draft: accessObj[employees[i].role].receipt_save_as_draft,
            wharehouse_manager: accessObj[employees[i].role].wharehouse_manager,
            can_change_price: accessObj[employees[i].role].can_change_price,
            refund: accessObj[employees[i].role].refund,
            show_all_receipts: accessObj[employees[i].role].show_all_receipts,
            pay_debt: accessObj[employees[i].role].pay_debt,
            show_shift_history: accessObj[employees[i].role].show_shift_history,
            apply_discount: accessObj[employees[i].role].apply_discount,
            change_settings: accessObj[employees[i].role].change_settings,
            show_stock: accessObj[employees[i].role].show_stock,
            edit_items: accessObj[employees[i].role].edit_items,
            edit_ticket: accessObj[employees[i].role].edit_ticket,
            split_ticket: accessObj[employees[i].role].split_ticket,
            change_waiter: accessObj[employees[i].role].change_waiter,
            delete_ticket: accessObj[employees[i].role].delete_ticket,
            show_all_tickets: accessObj[employees[i].role].show_all_tickets,
            can_access_to_shift: accessObj[employees[i].role].can_access_to_shift,
          }
          if (employees[i].role != 'waiter') {
            employees[i].role = 'cashier'
          }
          EMPLOYEES.push(employees[i])
        }
      }
    }
    reply.ok(EMPLOYEES)
  }
  instance.get('/employees/find', { version: '1.0.0' }, (request, reply) => {
    instance.authorization(request, reply, (user) => {
      getAllEmployees(request, reply, user)
    })
  })
  instance.get('/employees/find', { version: '2.0.0' }, (request, reply) => {
    instance.authorization(request, reply, (user) => {
      getUpdatedAllEmployees(request, reply, user)
    })
  })
  instance.post('/employees/password_check', { version: '1.0.0' }, (request, reply) => {
    var token = request.headers['authorization']
    if (token) {
      instance.employees.findOne({ token: token }, (error, employer) => {
        if (error) {
          reply.send({
            statusCode: 404,
            error: 'Not found',
            message: 'Employee not found'
          })
        }
        else {
          if (employer) {
            instance.employees.find({ service: employer.service }, (err, employerrs) => {
              if (employerrs == null || err) {
                reply.ok({
                  correct: false
                })
              }
              else {
                var send = false
                for (var t of employerrs) {
                  if (t.password == request.body.password && t.role == 'cashier') {
                    send = true
                  }
                }
                reply.ok({
                  correct: send
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

  const findAllEmployee = (request, reply) => {
    instance.employees.find(request.body, { "_id": 1, "name": 1 }, (err, employees) => {
      if (err || employees == null) {
        reply.ok([])
      }
      else {
        reply.ok(employees)
      }
    })
  }


  instance.post('/inone/getEmployees', { version: '1.0.0' }, (request, reply) => {
    on(request, reply, (user) => {
      findAllEmployee(request, reply)
    })
  })

  instance.get('/inone/check_service', { version: '1.0.0' }, (request, reply) => {
    instance.authorization(request, reply, (user) => {
      reply.ok({ is_created: false })
      instance.organizations.findOneAndUpdate({ _id: user.organization }, { $set: { is_service_created: false } }, (err, organization) => {
        if (err || organization == null) {
          reply.ok({ is_created: false })
        }
        else {
          reply.ok({ is_created: organization.is_service_created })
        }
      })
    })
  })

  instance.post('/employee/get_available_pos', { version: '1.0.0' }, (request, reply) => {
    request.headers['Authorization'] = request.body.token
    instance.authorization(request, reply, (user) => {
      var imei = request.body.imei
      instance.posDevices.find({ organization: user.organization, $or: [{ imei: imei }, { status: false }] }, (err, devices) => {
        if (err || devices == []) {
          devices = []
        }
        reply.ok(devices)
      })
    })
  })

  instance.post('/employee/activate_pos_device', { version: '1.0.0' }, (request, reply) => {
    instance.authorization(request, reply, (user) => {
      var imei = request.body.imei
      instance.posDevices.findOne({ _id: request.body._id }, (err, device) => {
        if (err) {
          reply.error('Error on finding pos device')
        }
        else {
          if (device) {
            if (device.status == false || device.imei == imei) {
              device.status = true
              device.imei = request.body.imei
              instance.posDevices.updateOne({
                _id: device._id
              }, {
                $set: {
                  is_active: true
                }
              }, (err) => {
                if (err) {
                  instance.send_Error('updating pos device', JSON.stringify(err))
                }
              })
              instance.Shifts.find({
                organization: user.organization,
                pos_id: device._id,
                closing_time: 0
              }, (err, result) => {
                if (err || result == null) {
                  result = []
                }
                if (result.length == 0) {
                  device.receipt_no = 0
                  reply.ok(device)
                  instance.posDevices.updateOne({
                    _id: device._id
                  }, { $set: device }, (err, _) => {
                    if (err) {
                      instance.send_Error('updating pos device number', JSON.stringify(err))
                    }
                  })
                }
                else {
                  instance.Receipts.find({
                    organization: user.organization,
                    service: request.headers['accept-service'],
                    pos_id: device._id,
                    date: {
                      $gte: result[0].opening_time
                    }
                  }, (err, receipt) => {
                    if (err || receipt == null) {
                      receipt = []
                    }
                    if (receipt.length == 0) {
                      device.receipt_no = 0
                      reply.ok(device)
                    }
                    else {
                      device.receipt_no = parseInt(receipt[0].receipt_no.replace(/\D+/, ""));
                      reply.ok(device)
                    }
                    instance.posDevices.updateOne({
                      _id: device._id
                    }, { $set: device }, (err, _) => {
                      if (err) {
                        instance.send_Error('updating pos device number', JSON.stringify(err))
                      }
                    })
                  }).sort({ date: -1 }).limit(1)
                }
              }).sort({ opening_time: -1 }).limit(1)
            }
            else {
              reply.error('Device allready in use')
            }
          }
          else {
            reply.error('Device not found')
          }
        }
      })
    })
  })


  const employees_roles = instance.model('employeesPermits', {
    organization: String,
    role: {
      type: String,
      default: "Cashier"
    },
    is_pos: Boolean,
    pos: {
      view_all_receipts: Boolean,
      apply_discounts_with_restricted_access: Boolean,
      change_taxes_in_a_sale: Boolean,
      carry_out_purchasing_returns: Boolean,
      open_cash_drawer_without_making_a_sale: Boolean,
      edit_items: Boolean,
      change_settings: Boolean,
      access_to_live_chat_support: Boolean,
      show_stock: Boolean
    },
    is_back_office: Boolean,
    back_office: {
      reports: Boolean,
      items_and_inventory_management: Boolean,
      employees: Boolean,
      customers: Boolean,
      edit_profile: Boolean,
      manage_billing: Boolean,
      set_the_payment_types: Boolean,
      change_settings_of_loyalty_program: Boolean,
      set_the_taxes: Boolean,
      manage_pos_devices: Boolean,
      can_delete_item: Boolean,
      support: Boolean
    }
  })

  instance.decorate('employees_roles', employees_roles)
  instance.generate('/employees/permits', employees_roles)

  next()
}