const TokenGenerator = require('uuid-token-generator')

module.exports = (instance, options, next) => {

  // get employee page and limit

  const search_employees = (request, reply, admin) => {
    // const user_available_services = request.user.services.map(serv => serv.service);
    const query = { organization: admin.organization }

    if (request.body) {
      if (request.body.service != '' && request.body.service != null) {
        query['$or'] = [
          {
            services: {
              $elemMatch: {
                service: {
                  $eq: instance.ObjectId(request.body.service)
                },
                available: {
                  $eq: true
                }
              }
            }
          },
          {
            role: 'boss'
          },
        ]
      }
    }
    const page = parseInt(request.params.page)
    const limit = parseInt(request.params.limit)

    instance.User.find(query, {
      name: 1,
      email: 1,
      phone_number: 1,
      role: 1
    }, async (err, users) => {
      if (users == undefined) {
        users = []
      }
      const total = await instance.User.countDocuments(query)

      reply.ok({
        total: total,
        page: Math.ceil(total / limit),
        data: users,
      })
    })
      .limit(limit)
      .skip(limit * (page - 1))
      .lean()
  }

  instance.post('/user/searching/:limit/:page', options.version, (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      if (admin) {
        search_employees(request, reply, admin)
      }
    })
  })

  // get All employees

  const getAllEmployees = (request, reply, user) => {
    const query = {
      organization: user.organization
    }
    if (request.body && request.body.service && request.body.service != '') {
      query['$or'] = [
        {
          services: { $elemMatch: { service: { $eq: request.body.service }, available: { $eq: true } } }
        },
        {
          role: 'boss'
        }
      ]
    }
    instance.User.find(query, { services: 0, employee_token: 0, boss_token: 0, admin_token: 0 }, (err, employees) => {
      if (err) {
        instance.send_Error('finding employee', JSON.stringify(err))
      }
      if (employees == null) {
        employees = []
      }
      reply.ok(employees)
    })
      .lean()
  }

  const getUserListHanler = (request, reply) => {
    instance.authorization(request, reply, (user) => {
      getAllEmployees(request, reply, user)
    })
  }

  instance.post('/getAllEmployees', options.version, getUserListHanler)
  const getAllEmployeesByService = (request, reply, user) => {
    // console.log(user);
    const serv = request.user.services.find(elem => elem.service == request.params.service)

    if (!(serv && serv.available))
      return reply.validation('you havent acces for this service')

    const query = {
      organization: user.organization,
      services: {
        $elemMatch: {
          service: request.params.service,
          available: { $eq: true }
        }
      }
    }
    const $project = {
      ui_language: 1,
      is_boss: 1,
      service: 1,
      is_active: 1,
      percentage: 1,
      is_password: 1,
      password: 1,
      role: 1,
      full_name: 1,
      name: 1,
      email: 1,
      last_name: 1,
      is_phone_number: 1,
      token: 1,
      fire_token: 1,
      boss_fire_token: 1,
      employee_fire_token: 1,
      image_url: 1,
      _id: 1,
      phone_number: 1,
      super_password: 1,
      organization: 1,
      // services: 0, employee_token: 0, boss_token: 0, admin_token: 0, token: 0
    }
    instance.User.find(query, $project, (err, employees) => {
      if (err) {
        instance.send_Error('finding employee', JSON.stringify(err))
      }
      if (employees == null) {
        employees = []
      }
      reply.ok(employees)
    })
      .lean()
  }
  const getUserListHanler2 = (request, reply) => {
    instance.authorization(request, reply, (user) => {
      getAllEmployeesByService(request, reply, user)
    })
  }
  instance.get('/getAllEmployees/:service', options.version, getUserListHanler2)

  instance.post('/user/search', options.version, getUserListHanler)

  // get employee by id

  const getEmployeeByID = (request, reply, user) => {
    instance.User.findOne({
      _id: request.params.id
    }, (err, employee) => {
      if (err) {
        reply.error('Error on finding employee')
      }
      else {
        const serviceObj = {}
        for (var s of employee.services) {
          serviceObj[s.service] = s.available
        }
        instance.services.find({
          organization: user.organization
        }, (err, services) => {
          employee.services = []
          for (var s of services) {
            employee.services.push({
              service: s._id,
              service_name: s.name,
              available: (serviceObj[s._id] || employee.role == 'boss') ? true : false
            })
          }
          reply.ok(employee)
        })
      }
    })
      .lean()
  }

  instance.get('/getEmployeeByID/:id', options.version, (request, reply) => {
    instance.authorization(request, reply, (user) => {
      getEmployeeByID(request, reply, user)
    })
  })

  // get employees only names

  const get_employees = (request, reply, admin) => {
    const query = {
      organization: admin.organization
    }
    if (request.body != undefined) {
      if (request.body.services != null) {
        if (request.body.services.length > 0) {
          for (let i = 0; i < request.body.services.length; i++) {
            if (request.body.services[i] != '' && request.body.services[i] != undefined) {
              request.body.services[i] != instance.ObjectId(request.body.services[i])
            }
          }
          query['$or'] = [
            {
              services: {
                $elemMatch: {
                  service: {
                    $in: request.body.services
                  },
                  available: {
                    $eq: true
                  }
                }
              }
            },
            {
              role: 'boss'
            }
          ]
        }
      }
    }
    if (request.body) {
      if (request.body.service) {
        query.services = { $elemMatch: { service: { $eq: request.body.service }, available: { $eq: true } } }
      }
    }
    // change it to users
    instance.User.find(query, { name: 1, role: 1, phone_number: 1 }, (err, employees) => {
      if (err || employees == null) {
        employees = []
      }
      reply.ok(employees)
    })
      .lean()
  }

  instance.post('/get_employees', options.version, (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      if (admin) {
        get_employees(request, reply, admin)
      }
    })
  })

  instance.post('/get_employeess', options.version, (request, reply) => {
    instance.authorization(request, reply, (admin) => {
      if (admin) {
        get_employees(request, reply, admin)
      }
    })
  })

  // get employees for POS
  const get_employees_pos = (request, reply, user) => {
    instance.User.find({
      organization: user.organization,
      $or: [{ services: { $elemMatch: { service: { $eq: request.headers['accept-service'] }, available: { $eq: true } } } }, { role: 'boss' }]
    }, { admin_token: 0, boss_token: 0, services: 0 }, (err, users) => {
      if (err || users == null) {
        users = []
      }
      for (let i = 0; i < users.length; i++) {
        users[i].token = users[i].employee_token
        users[i].employee_token = undefined
      }
      reply.ok(users)
    })
      .lean()
  }

  instance.get('/get_employees/pos', options.version, (request, reply) => {
    instance.authorization(request, reply, (user) => {
      get_employees_pos(request, reply, user)
    })
  })

  // create user

  const create_user = async (request, reply) => {
    const user = request.user
    try {
      const body = request.body
      // check role
      const role = await instance.AccessRights
        .findOne({ organization: user.organization, name: body.role })
        .lean()
      if (!role) {
        return reply.send({
          statusCode: 404,
          error: 'Role is not exist',
          message: 'Fail'
        })
      }
      // check phone number
      const exist_phone = await instance.User
        .findOne({ phone_number: body.phone_number })
        .lean()
      if (exist_phone) {
        return reply.send({
          statusCode: 411,
          error: 'Phone number exist',
          message: 'Fail'
        })
      }
      // check password
      const exist_password = await instance.User
        .findOne({ organization: user.organization, password: body.password })
        .lean()
      if (exist_password) {
        return reply.send({
          statusCode: 412,
          error: 'Password exist',
          message: 'Fail'
        })
      }
      const services = await instance.services
        .find({ organization: user.organization })
        .lean()
      const serviceObj = {}
      for (const s of body.services) {
        serviceObj[s.service] = s
      }
      const employee_services = []
      for (const s of services) {
        if (serviceObj[s._id]) {
          employee_services.push({
            service: s._id,
            service_name: s.name,
            available: serviceObj[s._id].available
          })
        }
        else {
          employee_services.push({
            service: s._id,
            service_name: s.name,
            available: false
          })
        }
      }
      body.services = employee_services
      body.organization = user.organization
      body.employee_token = (new TokenGenerator()).generate()
      await new instance.User(body).save()
      reply.ok()
    } catch (error) {
      return reply.error(error.message)
    }
    /*
    var USER = request.body
    instance.AccessRights.find({
      organization: user.organization
    }, (err, acrgs) => {
      if (acrgs == null) {
        acrgs = []
      }
      var roles = []
      for (var a of acrgs) {
        roles.push(a.name)
      }
      if (USER.is_phone_number != null) {
        if (!USER.is_phone_number) {
          USER.phone_number = "HAVE_THIS_NUMBER"
        }
      }
      instance.User.findOne({
        phone_number: USER.phone_number
      }, (err, u_user) => {
        if (err || u_user == null) {
          if (USER.phone_number == "HAVE_THIS_NUMBER") {
            USER.phone_number = ""
          }
          if (roles.includes(USER.role)) {
            instance.User.findOne({
              organization: user.organization,
              password: request.body.password
            }, (err, U) => {
              if (U) {
                instance.allready_exist(reply)
              }
              else {
                var service_ids = []
                if (typeof USER.services != 'undefined') {
                  if (Array.isArray(USER.services)) {
                    for (var s of USER.services) {
                      service_ids.push(s.service)
                    }
                  }
                  else {
                    USER.services = []
                  }
                }
                else {
                  USER.services = []
                }
                var servicesObj = {}
                for (var s of USER.services) {
                  servicesObj[s.service] = s.available
                }
                instance.services.find({
                  _id: {
                    $in: service_ids
                  }
                }, (err, services) => {
                  if (err || services == null) {
                    services = []
                  }
                  var valid_services = []
                  service_ids = []
                  for (var s of services) {
                    if (servicesObj[s._id]) {
                      service_ids.push(s._id)
                    }
                    valid_services.push({
                      service: instance.ObjectId(s._id),
                      service_name: s.name,
                      available: servicesObj[s._id]
                    })
                  }
                  if ((USER.password + '').length == 4) {
                    USER.organization = user.organization
                    USER.services = valid_services
                    USER.employee_token = (new TokenGenerator()).generate()
                    var User_model = instance.User(USER)
                    User_model.save((err) => {
                      if (err) {
                        reply.error('Error on saving')
                        instance.send_Error('create user', JSON.stringify(err))
                      }
                      else {
                        reply.ok()
                        for (var s of service_ids) {
                          instance.push_changes({ headers: {} }, 111, s)
                        }
                      }
                    })
                  }
                  else {
                    reply.error('PASSWORD')
                  }
                })
              }
            })
          }
          else {
            reply.error('role error')
          }
        }
        else {
          instance.aldy_exs(reply)
        }
      })
    })
    */
  }

  const employeeCreateSchema = {
    schema: {
      type: 'object',
      additionalProperties: false,
      required: [
        'name', 'phone_number',
        'role', 'password', 'services'
      ],
      properties: {
        name: { type: 'string' },
        email: { type: 'string' },
        phone_number: { type: 'string' },
        password: {
          type: 'string',
          pattern: "/^\d{4}$/"
        },
        role: { type: 'string' },
        services: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['service', 'available'],
            properties: {
              service: { type: 'string' },
              available: { type: 'boolean' }
            }
          }
        }
      }
    },
    attachValidation: true
  }

  instance.post('/user/create',
    {
      ...options.version,
      ...employeeCreateSchema
    },
    (request, reply) => {
      if (request.validationError) {
        return reply.validation(request.validationError.message)
      }
      instance.authorization(request, reply, (user) => {
        if (user) {
          create_user(request, reply)
        }
      })
    })

  // update user

  const update_user = async (request, reply, user) => {
    const update = request.body
    if (update.fire_token) {
      if (request.headers['accept-user'] == 'boss' && update.fire_token) {
        update.boss_fire_token = update.fire_token
      }
      else if (update.fire_token) {
        update.employee_fire_token = update.fire_token
      }
      update.fire_token = undefined
    }
    if (typeof update.role == typeof 'invan') {
      const role = await instance.AccessRights
        .findOne({ organization: user.organization, name: update.role })
        .lean()
      if (!role) {
        return reply.fourorfour('Role')
      }
    }

    const id = request.params.id
    const query = {
      organization: user.organization,
      _id: {
        $nin: request.params.id
      }
    }
    query['$or'] = []

    const passwordPattern = /^(\d{4})|\d{6}$/
    if (passwordPattern.test(update.password)) {
      query['$or'].push({ password: update.password })
      query['$or'].push({ super_password: update.password })
    }
    else {
      delete update.password
    }

    if (update.super_password) {
      query['$or'].push({ password: update.super_password })
      query['$or'].push({ super_password: update.super_password })
    }

    // if (passwordPattern.test(update.super_password)) {
    //   query['$or'].push({ password: update.super_password })
    //   query['$or'].push({ super_password: update.super_password })
    // }
    // else {
    //   if (update.super_password == '') {
    //     update.super_password = ''
    //   }
    //   else {
    //     delete update.super_password
    //   }
    // }
    if (update.password && update.password == update.super_password) {
      return reply.send({
        statusCode: 413,
        error: 'Fail: Same password',
        message: 'Same password'
      })
    }

    if (query['$or'].length > 0) {
      try {
        const exist_password = await instance.User.findOne(query).lean()
        if (exist_password) {
          return reply.send({
            statusCode: 412,
            error: 'Password exist',
            message: 'Fail'
          })
        }
      } catch (error) { }
    }

    if (update.phone_number) {
      try {
        const exist_phone = await instance.User.findOne({
          _id: {
            $ne: id
          },
          phone_number: update.phone_number
        })
          .lean()
        if (exist_phone) {
          return reply.send({
            statusCode: 411,
            error: 'Phone number exist',
            message: 'Fail'
          })
        }
      } catch (error) { }
    }

    instance.User.updateOne({ _id: id, organization: user.organization }, { $set: update }, (err, result) => {
      if (result.ok) {
        instance.push_to_organization(111, user.organization)
        instance.User.findOne({ _id: request.params.id }, (err, user) => {
          if (request.headers['accept-user'] == 'boss') {
            user.fire_token = user.boss_fire_token
            user.token = user.boss_token
          }
          else if (request.headers['accept-user'] == 'employee') {
            user.fire_token = user.employee_token
            user.token = user.employee_token
          }
          else {
            user.token = user.admin_token
          }
          user.boss_token = undefined
          user.boss_fire_token = undefined
          user.employee_token = undefined
          user.employee_fire_token = undefined
          user.admin_token = undefined
          reply.ok(user)
        })
          .lean()
      }
      else {
        reply.error('Error on updating')
        instance.send_Error('update user', JSON.stringify(err))
      }
    })
  }

  instance.post('/user/update/:id', options.version, (request, reply) => {
    instance.authorization(request, reply, (user) => {
      if (user) {
        update_user(request, reply, user)
      }
    })
  })

  instance.post('/user/update', options.version, (request, reply) => {
    instance.authorization(request, reply, (user) => {
      if (user) {
        request.params.id = user._id
        update_user(request, reply, user)
      }
    })
  })

  // deleting users

  const delete_users = (request, reply, user) => {
    instance.User.findOne({
      organization: user.organization,
      role: 'boss'
    }, (err, boss) => {
      var id = []
      if (boss) {
        id = [boss._id]
        instance.User.deleteMany({
          _id: {
            $in: request.body.indexes,
            $nin: id
          },
          organization: user.organization
        }, (err, _) => {
          if (err) {
            reply.error('Error on deleteing')
            instance.send_Error('deleting user', JSON.stringify(err))
          }
          else {
            reply.ok()
            instance.services.find({
              organization: user.organization
            }, (err, services) => {
              if (services == null) {
                services = []
              }
              for (var s of services) {
                instance.push_changes({ headers: {} }, 111, s._id)
              }
            })
          }
        })
      }
    })
  }

  instance.post('/user/delete_group', options.version, (request, reply) => {
    instance.authorize_boss_admin(request, reply, (user) => {
      if (user) {
        delete_users(request, reply, user)
      }
    })
  })

  next()
}