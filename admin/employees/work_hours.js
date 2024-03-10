module.exports = (instance, options, next) => {

  const get_worked_hours = (request, reply, admin) => {
    const min = parseInt(request.params.min)
    const max = parseInt(request.params.max)
    const limit = Number.isFinite(Number(request.params.limit))
      ? parseInt(request.params.limit)
      : 10

    const page = Number.isFinite(Number(request.params.page)) && request.params.page > 1
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
      const total = timecards.length
      if (request.params.name == undefined) {
        timecards = timecards.slice(limit * (page - 1), limit * page)
      }
      instance.User.find({
        organization: admin.organization
      }, (_, users) => {
        if (users == null) {
          users = []
        }

        const employeeObj = {}
        const emplotimeObj = {}
        const emplohourObj = {}
        let total_hours = 0
        const ids = []
        for (const user of users) {
          ids.push(user._id)
          employeeObj[user._id] = user
          emplotimeObj[user._id] = true
          emplohourObj[user._id] = {
            services: new Set(),
            value: 0
          }
        }
        for (const t of timecards) {
          if (employeeObj[t.employee_id]) {
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
        const answer = []
        if (request.params.name != undefined) {
          answer = [
            [
              'name',
              'store',
              'minutes',
              'tin',
            ]
          ]
        }
        for (const id of ids) {
          if ([...emplohourObj[id].services].length > 0) {
            if (request.params.name == undefined) {
              answer.push({
                employee_name: employeeObj[id].name,
                stores: [...emplohourObj[id].services],
                minutes: emplohourObj[id].value,
                tin: employeeObj[id].tin,
              })
            }
            else {
              answer.push([
                employeeObj[id].name,
                [...emplohourObj[id].services].join(' | '),
                emplohourObj[id].value,
                employeeObj[id].tin
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
    })
      .sort({ _id: -1 })
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