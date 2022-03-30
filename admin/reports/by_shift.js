module.exports = (instance, _, next) => {

  var version = { version: '1.0.0' }

  // reports by shifts

  var by_shift = (request, reply, user) => {
    var min = parseInt(request.params.min)
    var max = parseInt(request.params.max)
    var limit = parseInt(request.params.limit)
    var page = parseInt(request.params.page)
    var Query = {
      organization: user.organization,
      opening_time: {
        $lte: max,
        $gte: min
      },
      closing_time: {
        $ne: 0
      }
    }
    if(request.body.services) {
      if(request.body.services.length > 0){
        Query.service =   {
          $in: request.body.services
        }
      }
    }
    if(request.body.employees) {
      if(request.body.employees.length > 0) {
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
      'cash_drawer.difference': 1
    }, (err, shifts) => {
      if(err || shifts == null) {
        shifts = []
      }
      if(request.params.name == undefined) {
        var total = shifts.length
        shifts = shifts.splice((page-1)*limit, limit)
        for(let i=0; i<shifts.length; i++) {
          try {
            shifts[i] = shifts[i].toObject()
          }
          catch(error) {
            instance.send_Error('to Object', error.message)
          }
          shifts[i].exp_cash_amount = shifts[i].cash_drawer.exp_cash_amount
          shifts[i].act_cash_amount = shifts[i].cash_drawer.act_cash_amount
          shifts[i].difference = shifts[i].cash_drawer.difference
          delete shifts[i].cash_drawer
        }
        reply.ok({
          total: total,
          page: Math.ceil(total/limit),
          data: shifts
        })
      }
      else {
        var answer = [[
          'pos',
          'opening_time',
          'closing_time',
          'exp_cash_amount',
          'act_cash_amount',
          'difference'
        ]]
        for(var sh of shifts) {
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
    }).sort({opening_time: -1})
  }

  instance.post('/reports/by_shift/:min/:max/:limit/:page', version, (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      if(admin){by_shift(request, reply, admin)}
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