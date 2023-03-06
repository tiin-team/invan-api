const mongoose = require("mongoose")

module.exports = (instance, options, next) => {


  // get timecards

  const get_timecards = async (request, relpy, admin) => {
    const min = parseInt(request.params.min)
    const max = parseInt(request.params.max)

    let limit = parseInt(request.params.limit)

    if (!limit || limit < 0) {
      limit = 10
    }

    let page = parseInt(request.params.page)
    if (!page || page < 0) {
      page = 1
    }


    const query = {
      organization: admin.organization,
      created_time: {
        $gte: min,
        $lte: max
      }
    }

    if (request.body) {
      if (request.body.services) {
        if (request.body.services.length > 0) {
          for (let i = 0; i < request.body.services.length; i++) {
            if (request.body.services[i] != '') {
              request.body.services[i] = instance.ObjectId(request.body.services[i])
            }
          }
          query.service = {
            $in: request.body.services
          }
        }
      }
      if (request.body.employees) {
        if (request.body.employees.length > 0) {
          for (let i = 0; i < request.body.employees.length; i++) {
            if (request.body.employees[i] != '') {
              request.body.employees[i] = instance.ObjectId(request.body.employees[i])
            }
          }
          query.employee_id = {
            $in: request.body.employees
          }
        }
      }

      if (request.body.search) {
        query.employee_name = {
          $regex: request.body.search,
          $options: "i",
        }
      }
    }


    console.log(limit, page)

    const tcards = await instance.timecard.aggregate([
      {
        $match: query
      },
      {
        $limit: limit
      },
      {
        $skip: (page - 1) * limit
      },
      {
        $lookup: {
          from: 'inoneservices',
          localField: 'service',
          foreignField: '_id',
          as: 'SERVICE'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'employee_id',
          foreignField: '_id',
          as: 'EMPLOYEE'
        }
      }
    ])

    const total = await instance.timecard.countDocuments(query)


    for (let i = 0; i < tcards.length; i++) {
      if (tcards[i].SERVICE.length > 0) {
        tcards[i].service_name = tcards[i].SERVICE[0].name
      }
      tcards[i].SERVICE = undefined
      if (tcards[i].EMPLOYEE.length > 0) {
        tcards[i].employee_name = tcards[i].EMPLOYEE[0].name
      }
      tcards[i].EMPLOYEE = undefined
    }

    relpy.ok({
      total: total,
      page: Math.ceil(total / limit),
      data: tcards
    })
    // instance.timecard.find(query, (err, cards) => {
    //   if(cards == null) {
    //     cards = []
    //   }

    // })
  }

  instance.post('/employees/timecard/:min/:max/:limit/:page', options.version, (request, relpy) => {
    instance.oauth_admin(request, relpy, (admin) => {
      get_timecards(request, relpy, admin)
    })
  })

  // create timecard

  const timecard_create = (request, relpy, user) => {
    var timecard = request.body
    timecard.organization = user.organization
    timecard.created_time = new Date().getTime()
    instance.services.findOne({
      _id: request.body.service
    }, (_, service) => {
      if (service) {
        timecard.service = instance.ObjectId(service._id)
        timecard.service_name = service.name
        instance.User.findOne({
          _id: request.body.employee_id
        }, (_, emp) => {
          if (emp) {
            timecard.employee_id = instance.ObjectId(emp._id)
            timecard.employee_name = emp.name
            timecard.total_hours = (timecard.clock_out - timecard.clock_in) / 60000
            instance.timecard.findOne({
              employee_id: timecard.employee_id,
              $and: [
                {
                  clock_in: {
                    $nin: [null, 0]
                  }
                },
                {
                  clock_out: {
                    $nin: [null, 0]
                  }
                }
              ],
              $or: [
                {
                  clock_in: {
                    $lt: timecard.clock_out,
                    $gt: timecard.clock_in
                  }
                },
                {
                  clock_out: {
                    $lt: timecard.clock_out,
                    $gt: timecard.clock_in
                  }
                }
              ]
            }, (_, tcard) => {
              if (tcard && request.body.check == true) {
                relpy.ok({
                  _id: tcard._id,
                  overflow: true
                })
              }
              else {
                var timecardM = new instance.timecard(timecard)
                timecardM._id = new mongoose.Types.ObjectId()
                timecardM.save((err) => {
                  if (err) {
                    relpy.error('Error on saving timecard')
                  }
                  else {
                    relpy.ok({
                      _id: timecardM._id,
                      overflow: false
                    })
                    var timecard_history = new instance.timecardHistory({
                      timecard_id: timecardM._id,
                      date: new Date().getTime(),
                      clock_in: timecard.clock_in,
                      clock_out: timecard.clock_out,
                      event: 'created'
                    })
                    timecard_history.save((err) => {
                      if (err) {
                        instance.send_Error('timecard history create', JSON.stringify(err))
                      }
                    })
                  }
                })
              }
            })
          }
          else {
            relpy.fourorfour('employee')
          }
        })
      }
      else {
        relpy.fourorfour('service')
      }
    })
  }

  instance.post('/employees/timecard/create', options.version, (request, relpy) => {
    instance.oauth_admin(request, relpy, (admin) => {
      timecard_create(request, relpy, admin)
    })
  })

  // get by id

  const get_timecard_by_id = (request, relpy, admin) => {
    instance.timecard.findOne({
      _id: request.params.id
    }, (_, timecard) => {
      if (timecard) {
        instance.timecardHistory.find({
          timecard_id: timecard._id
        }, (_, histories) => {
          if (histories == null) {
            histories = []
          }
          try {
            timecard = timecard.toObject()
          }
          catch (error) {
            instance.send_Error('to Object', error.message)
          }
          timecard.histories = histories
          relpy.ok(timecard)
        })
      }
      else {
        relpy.fourorfour('timecard')
      }
    })
  }

  instance.get('/employees/timecard/get/:id', options.version, (request, relpy) => {
    instance.oauth_admin(request, relpy, (admin) => {
      get_timecard_by_id(request, relpy, admin)
    })
  })

  // update timecard

  const update_timecard = (request, relpy, admin) => {
    instance.timecard.findOne({
      _id: request.params.id
    }, (err, timecard) => {
      if (timecard) {
        if (timecard.clock_in != request.body.clock_in || timecard.clock_out != request.body.clock_out) {
          instance.timecard.updateOne({
            _id: request.params.id
          }, {
            $set: {
              clock_in: request.body.clock_in ? request.body.clock_in : timecard.clock_in,
              clock_out: request.body.clock_out ? request.body.clock_out : timecard.clock_out,
              total_hours: (request.body.clock_out - request.body.clock_in) / 60000
            }
          }, (err) => {
            if (err) {
              relpy.error('Error on updating timecard')
              instance.send_Error('update timecard', JSON.stringify(err))
            }
            else {
              const timecard_history = new instance.timecardHistory({
                timecard_id: request.params.id,
                date: new Date().getTime(),
                clock_in: request.body.clock_in ? request.body.clock_in : timecard.clock_in,
                clock_out: request.body.clock_out ? request.body.clock_out : timecard.clock_out,
                event: 'edited'
              })
              timecard_history.save((err) => {
                if (err) {
                  instance.send_Error('timecard history create', JSON.stringify(err))
                }
              })
              relpy.ok()
            }
          })
        }
        else {
          relpy.ok()
        }
      }
      else {
        relpy.fourorfour('Timecard')
      }
    })
  }

  instance.post('/employees/timecard/update/:id', options.version, (request, relpy) => {
    instance.oauth_admin(request, relpy, (admin) => {
      update_timecard(request, relpy, admin)
    })
  })

  // delete timecard
  const delete_timecard = (request, relpy, admin) => {
    instance.timecard.deleteMany({
      _id: {
        $in: request.body.indexes
      }
    }, (err) => {
      relpy.ok()
      if (err) {
        instance.send_Error('delete timecard', JSON.stringify(err))
      }
      else {
        instance.timecardHistory.deleteMany({
          timecard_id: {
            $in: request.body.indexes
          }
        }, (err) => {
          if (err) {
            instance.send_Error('delete timecard History', JSON.stringify(err))
          }
        })
      }
    })
  }

  instance.post('/employees/timecard/delete_group', options.version, (request, relpy) => {
    instance.oauth_admin(request, relpy, (admin) => {
      delete_timecard(request, relpy, admin)
    })
  })

  // clock in out
  const clock_in_out = (request, relpy, employee) => {
    var service_id = request.headers['accept-service']
    instance.services.findOne({
      _id: service_id
    }, (err, service) => {
      if (err || service == null) {
        relpy.error('Service not found')
      }
      else {
        if (request.body) {
          if (request.body.length) {
            var timecards = request.body.sort((a, b) => (a.created_time > b.created_time) ? 1 : ((b.created_time > a.created_time) ? -1 : 0));
            instance.timecard.findOne({
              employee_id: employee._id,
              clock_out: 0
            }, (err, tim) => {
              var has_clock_in = false
              var clock_data = []
              if (tim) {
                has_clock_in = true
              }
              for (var t of timecards) {
                if (has_clock_in && t) {
                  if (t.type == 'clock_out') {
                    tim.clock_out = t.created_time
                    tim.total_hours = (tim.clock_out - tim.clock_in) / 60000
                  }
                  else {
                    tim.clock_out = null
                    clock_data.push({
                      organization: employee.organization,
                      employee_id: instance.ObjectId(employee._id),
                      employee_name: employee.name,
                      service: instance.ObjectId(service._id),
                      service_name: service.name,
                      created_time: t.created_time,
                      clock_in: t.created_time,
                      clock_out: 0
                    })
                  }
                  has_clock_in = false
                }
                else {
                  var assign = {
                    organization: employee.organization,
                    employee_id: instance.ObjectId(employee._id),
                    employee_name: employee.name,
                    service: instance.ObjectId(service._id),
                    service_name: service.name,
                  }
                  if (t.type == 'clock_out') {
                    if (clock_data.length > 0) {
                      if (clock_data[clock_data.length - 1].clock_out == 0) {
                        clock_data[clock_data.length - 1].clock_out = t.created_time
                        clock_data[clock_data.length - 1].created_time = t.created_time
                        clock_data[clock_data.length - 1].total_hours = (clock_data[clock_data.length - 1].clock_out - clock_data[clock_data.length - 1].clock_in) / 60000
                      }
                      else {
                        clock_data.push(Object.assign(assign, {
                          created_time: t.created_time,
                          clock_in: null,
                          clock_out: t.created_time
                        }))
                      }
                    }
                    else {
                      clock_data.push(Object.assign(assign, {
                        created_time: t.created_time,
                        clock_in: null,
                        clock_out: t.created_time
                      }))
                    }
                  }
                  else {
                    if (clock_data.length > 0)
                      if (clock_data[clock_data.length - 1].clock_out == 0) {
                        clock_data[clock_data.length - 1].clock_out = null
                      }
                    clock_data.push(Object.assign(assign, {
                      created_time: t.created_time,
                      clock_in: t.created_time,
                      clock_out: 0
                    }))
                  }
                }
              }
              relpy.ok()
              if (tim) {
                instance.timecard.updateOne({
                  _id: tim._id
                }, {
                  $set: tim
                }, (err, _) => {
                  if (err) {
                    instance.send_Error('updating timecard', JSON.stringify(err))
                  }
                  else {
                    var timecard_history = new instance.timecardHistory({
                      timecard_id: tim._id,
                      date: tim.clock_out,
                      clock_in: null,
                      clock_out: tim.clock_out,
                      event: 'clocked_out'
                    })
                    timecard_history.save((err) => {
                      if (err) {
                        instance.send_Error('timecard history create', JSON.stringify(err))
                      }
                    })
                  }
                })
              }
              instance.timecard.insertMany(clock_data, (err, timecards) => {
                if (err) {
                  instance.send_Error('saving timecard', JSON.stringify(err))
                }
                else {
                  if (timecards == null) {
                    timecards = []
                  }
                  for (let i = 0; i < timecards.length; i++) {
                    var timecard_history = new instance.timecardHistory({
                      timecard_id: timecards[i]._id,
                      date: timecards[i].clock_out ? timecards[i].clock_out : timecards[i].clock_in,
                      clock_in: timecards[i].clock_in,
                      clock_out: timecards[i].clock_out == 0 ? null : timecards[i].clock_out,
                      event: timecards[i].clock_out > 0 ? 'clocked_out' : 'clocked_in'
                    })
                    timecard_history.save((err) => {
                      if (err) {
                        instance.send_Error('timecard history create', JSON.stringify(err))
                      }
                    })
                  }
                }
              })
            })
          }
          else {
            relpy.error('Body is not iterator')
          }
        }
        else {
          relpy.error('Error on creating')
        }
      }
    })
  }

  instance.post(
    '/employees/timecard/clock_in_out',
    {
      ...options.version,
      preValidation: instance.authorize_employee
    },
    (request, relpy) => {
      const employee = request.user;
      clock_in_out(request, relpy, employee)
    }
  )

  next()
}