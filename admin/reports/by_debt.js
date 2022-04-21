module.exports = (instance, _, next) => {

  var version = { version: '1.0.0' }


  // reports by debts  <<receipt>>

  var calculate_receipt_debts = (request, reply, receipts, user) => {
    var Ans = []
    var inc = 0
    var inc_id = {}
    for (var r of receipts) {
      var name = 'Waiter'
      if (r.waiter_name != undefined && r.waiter_name != "") {
        name = r.waiter_name
      } else if (r.cashier_name != undefined && r.cashier_name != "") {
        name = r.cashier_name
      }
      if (r.is_refund == false) {
        if (r.debt_id == undefined) {
          Ans.push({
            _id: r._id,
            receipt_no: r.receipt_no,
            given_time: r.date,
            donator: name,
            total: r.total_price,
            is_charged: false,
            receiver: "",
            employees: [r.waiter_id, r.cashier_id]
          })
          inc_id[r._id] = inc
          inc++
        }
        else {
          if (inc_id[r.debt_id] != undefined) {
            Ans[inc_id[r.debt_id]].is_charged = true
            Ans[inc_id[r.debt_id]].receiver = name
            Ans[inc_id[r.debt_id]].accepted_time = r.date
            Ans[inc_id[r.debt_id]].employees.push(r.cashier_id)
            Ans[inc_id[r.debt_id]].employees.push(r.waiter_id)
          }
        }
      }
      else {
        if (inc_id[r.refund] != undefined) {
          if (Ans[inc_id[r.refund]] != undefined) {
            Ans[inc_id[r.refund]].total -= r.total_price
          }
        }
      }
    }
    var Answer = []
    for (var a of Ans) {
      if (a.total != 0) {
        Answer.push(a)
      }
    }
    if(request.body.employees) {
      if(request.body.employees.length > 0) {
        var answer = []
        for(let i=0; i<Answer.length; i++) {
          for(let j=0; j< request.body.employees.length; j++) {
            if(Answer[i].employees.includes(request.body.employees[j])) {
              answer.push(Answer[i])
              break;
            }
          }
        }
        Answer = answer
      }
    }
    Ans = Answer
    var total = Ans.length
    Ans = Ans.splice(request.params.limit * (request.params.page - 1), request.params.limit)
    reply.ok({
      total: total,
      page: Math.ceil(total/request.params.limit),
      data: Ans
    })
  }

  const user_available_services = request.user.services.map(serv => serv.service.toString())

  var find_debts = (request, reply, user, handler = calculate_receipt_debts) => {
    var query = {
      organization: user.organization,
      service: { $in: user_available_services },
      $or: [{
        debtData: {
          $ne: null
        }
      }, {
        debt_id: {
          $ne: null
        }
      }],
      date: {
        $gte: request.params.min,
        $lte: request.params.max
      }
    }
    if(request.body) {
      if(request.body.services) {
        const { services } = request.body

        for (const service of services) {
          if (!user_available_services.includes(service)) {
            return reply.error('Acces denied')
          }
        }

        if(services.length > 0) {
          query.service = {
            $in: services
          }
        }
      }
    }
    instance.Receipts.find(query, (err, receipts) => {
      if (err || receipts == null) {
        receipts = []
      }
      // reply.ok(receipts)
      handler(request, reply, receipts, user)
    })
  }

  instance.post('/reports/by_debt/:min/:max/:limit/:page', version, (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      if(admin){find_debts(request, reply, admin)}
    })
  })

  next()
}