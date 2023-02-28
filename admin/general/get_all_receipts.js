const fp = require('fastify-plugin')

module.exports = fp((instance, _, next) => {

  // get receipts by range 


  instance.decorate('get_receipt_by_range', (request, reply, user, callback, query = {}, for_receipt_report = false) => {

    var min = parseInt(request.params.min)
    var max = parseInt(request.params.max)
    if (request.body.service != null && request.body.service != '') {
      request.body.services = [request.body.service]
    }
    var service_ids = request.body.services
    var employee_ids = request.body.employees
    var Query = {
      organization: user.organization,
      debt_id: null,
      receipt_state: {
        $ne: 'draft'
      },
      date: {
        $lte: max,
        $gte: min
      }
    }

    if (request.body) {
      if (request.body.custom) {
        var start = parseInt(request.body.start)
        var end = parseInt(request.body.end)
        additional_query = []
        for (let i = min; i < max; i += 86400000) {
          additional_query.push({
            date: {
              $lte: i + end * 3600000,
              $gte: i + start * 3600000
            }
          })
        }
        delete Query.date
        Query['$or'] = additional_query
      }
    }

    if (service_ids) {
      if (service_ids.length > 0) {
        Query.service = {
          $in: service_ids
        }
      }
      if (employee_ids)
        if (employee_ids.length > 0) {
          Query['$or'] = [
            {
              $and: [
                {
                  waiter_id: ""
                },
                {
                  cashier_id: {
                    $in: employee_ids
                  }
                }
              ]
            },
            {
              $and: [
                {
                  cashier_id: ""
                },
                {
                  waiter_id: {
                    $in: employee_ids
                  }
                }
              ]
            },
            {
              $and: [
                {
                  waiter_id: {
                    $ne: ""
                  }
                },
                {
                  cashier_id: {
                    $ne: ""
                  }
                },
                {
                  waiter_id: {
                    $in: employee_ids
                  }
                }
              ]
            }
          ]
        }
    }

    Query = Object.assign(Query, query)
    instance.Receipts.find(Query, (err, receipts) => {
      if (err || receipts == null) {
        receipts = []
      }

      for (let i = 0; i < receipts.length; i++) {
        var tax_value = 0.0
        for (var t of receipts[i].sold_item_list) {
          for (var T of t.taxes) {
            if (T.type != 'include') {
              tax_value += T.tax
            }
          }
        }
        for (let j = 0; j < receipts[i].payment.length; j++) {
          receipts[i].payment[j].value /= (1 + tax_value / 100)
        }
        receipts[i].total_price = receipts[i].total_price / (1 + tax_value / 100)
        // Products = [...new Set(Products.concat(ids))]
        // PRO = PRO.concat(item.sold_item_list)
      }

      callback(request, reply, receipts, user = user)
    })
      .lean()
      .limit(100);

  })

  next()
})