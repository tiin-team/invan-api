module.exports = (instance, options, next) => {

  const get_worked_hours = (request, reply, admin) => {
    const min = parseInt(request.params.min)
    const max = parseInt(request.params.max)
    const limit = Number.isFinite(request.params.limit)
      ? parseInt(request.params.limit)
      : 10

    const page = Number.isFinite(request.params.page) && request.params.page > 1
      ? parseInt(request.params.page)
      : 1

    const query = {
      organization: admin.organization,
      clock_in: {
        $lte: max,
        $gte: min
      }
    }
    if (request.body) {
      if (request.body.services) {
        if (request.body.services.length > 0) {
          for (let i = 0; i < request.body.services.length; i++) {
            if (request.body.services[i]) {
              request.body.services[i] = instance.ObjectId(request.body.services[i])
            }
          }
        }
      }
      if (request.body.employees) {
        if (request.body.employees.length > 0) {
          for (let i = 0; i < request.body.employees.length; i++) {
            if (request.body.employees[i]) {
              request.body.employees[i] = instance.ObjectId(request.body.employees[i])
            }
          }
        }
      }

      const search = request.body.search
      if (search)
        query.employee_name = { $regex: search, $options: "i" }
    }

    instance.timecard.find(query, (_, timecards) => {
      if (timecards == null) {
        timecards = []
      }
      var total = timecards.length
      if (request.params.name == undefined) {
        timecards = timecards.slice(limit * (page - 1), limit * page)
      }
      instance.User.find({
        organization: admin.organization
      }, (_, users) => {
        if (users == null) {
          users = []
        }
        var emplonameObj = {}
        var emplotimeObj = {}
        var emplohourObj = {}
        var total_hours = 0
        var ids = []
        for (var u of users) {
          ids.push(u._id)
          emplonameObj[u._id] = u.name
          emplotimeObj[u._id] = true
          emplohourObj[u._id] = {
            services: new Set(),
            value: 0
          }
        }
        for (var t of timecards) {
          if (emplonameObj[t.employee_id]) {
            if ((t.clock_out == null || t.clock_out == 0) && emplotimeObj[t.employee_id]) {
              emplotimeObj[t.employee_id] = false
              emplohourObj[t.employee_id].services.add(t.service_name)
              emplohourObj[t.employee_id].value += (max - t.clock_in) / (1000 * 60)
              total_hours += (max - t.clock_in) / (1000 * 60)
            }
            else {
              if (t.clock_in != null || t.clock_out != null || t.clock_out != 0) {
                emplohourObj[t.employee_id].services.add(t.service_name)
                emplohourObj[t.employee_id].value += (t.clock_out - t.clock_in) / (1000 * 60)
                total_hours += (t.clock_out - t.clock_in) / (1000 * 60)
              }
            }
          }
        }
        var answer = []
        if (request.params.name != undefined) {
          answer = [
            [
              'name',
              'store',
              'hours'
            ]
          ]
        }
        for (var id of ids) {
          if ([...emplohourObj[id].services].length > 0) {
            if (request.params.name == undefined) {
              answer.push({
                employee_name: emplonameObj[id],
                stores: [...emplohourObj[id].services],
                hours: emplohourObj[id].value
              })
            }
            else {
              answer.push([
                emplonameObj[id],
                [...emplohourObj[id].services].join(' | '),
                emplohourObj[id].value
              ])
            }
          }
        }
        if (request.params.name == undefined) {
          reply.ok({
            total: total,
            page: Math.ceil(total / limit),
            total_hours: total_hours,
            data: answer
          })
        }
        else {
          instance.send_csv(answer, 'work_hour', reply)
        }
      })
        .lean()
    }).sort({
      _id: -1
    })
      .lean()
  }

  instance.post('/worked/hours/:min/:max/:limit/:page', options.version, (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      get_worked_hours(request, reply, admin)
    })
  })

  instance.get('/worked/hours/:token/:services/:employees/:min/:max/:name', (request, reply) => {
    instance.make_beauty_for_export(request, reply, () => {
      instance.oauth_admin(request, reply, (admin) => {
        get_worked_hours(request, reply, admin)
      })
    })
  })

  next()
}