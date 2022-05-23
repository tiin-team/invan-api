module.exports = (instance, _, next) => {

  const version = { version: '1.0.0' }

  // reports by shifts

  const by_shift = (request, reply, user) => {
    const min = parseInt(request.params.min)
    const max = parseInt(request.params.max)
    const limit = parseInt(request.params.limit)
    const page = parseInt(request.params.page)

    const { services } = request.body.services;

    const user_available_services = request.user.services.map(serv => serv.service + '')

    const Query = {
      organization: user.organization,
      opening_time: {
        $lte: max,
        $gte: min
      },
      service: { $in: user_available_services },
      closing_time: {
        $ne: 0
      }
    }
    if (services) {
      if (services.length > 0) {
        for (const service of services) {
          if (!user_available_services.includes(service)) {
            return reply.error('Acces denied')
          }
        }

        Query.service = {
          $in: services
        }
      }
    }
    if (request.body.employees) {
      if (request.body.employees.length > 0) {
        Query.by_whom = {
          $in: request.body.employees
        }
      }
    }
    instance.Shifts.find(Query, {
      pos: 1,
      opening_time: 1,
      closing_time: 1,
      'cash_drawer.exp_cash_amount': 1,
      'cash_drawer.act_cash_amount': 1,
      'cash_drawer.difference': 1,
      'sales_summary': 1,
    }, async (err, shifts) => {
      if (err || shifts == null) {
        shifts = []
      }
      if (request.params.name == undefined) {
        const total = await instance.Shifts.countDocuments(Query);
        // shifts = shifts.splice((page - 1) * limit, limit)
        for (let i = 0; i < shifts.length; i++) {
          // try {
          //   shifts[i] = shifts[i].toObject()
          // }
          // catch (error) {
          //   instance.send_Error('to Object', error.message)
          // }
          shifts[i].exp_cash_amount = shifts[i].cash_drawer.exp_cash_amount
          shifts[i].act_cash_amount = shifts[i].cash_drawer.act_cash_amount
          shifts[i].difference = shifts[i].cash_drawer.difference
          delete shifts[i].cash_drawer
        }
        reply.ok({
          total: total,
          page: Math.ceil(total / limit),
          data: shifts
        })
      }
      else {
        const answer = [[
          'pos',
          'opening_time',
          'closing_time',
          'exp_cash_amount',
          'act_cash_amount',
          'difference'
        ]]
        for (const sh of shifts) {
          answer.push([
            sh.pos,
            sh.opening_time,
            sh.closing_time,
            sh.cash_drawer.exp_cash_amount,
            sh.cash_drawer.act_cash_amount,
            sh.cash_drawer.difference
          ])
        }
        instance.send_csv(answer, 'by_shift', reply)
      }
    })
      .sort({ opening_time: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()
  }

  instance.post('/reports/by_shift/:min/:max/:limit/:page', version, (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      if (admin) { by_shift(request, reply, admin) }
    })
  })

  instance.get('/reports/sales/by_shift/:token/:services/:employees/:custom/:start/:end/:min/:max/:name', (request, reply) => {
    instance.make_beauty_for_export(request, reply, () => {
      instance.oauth_admin(request, reply, (admin) => {
        by_shift(request, reply, admin)
      })
    })
  })

  next()
}