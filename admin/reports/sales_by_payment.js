
module.exports = (instance, _, next) => {

  const params = {
    version: '1.0.0',
    schema: {
      params: {
        type: 'object',
        required: [
          'min', 'max'
        ],
        properties: {
          min: {
            type: 'number',
            minimum: 1
          },
          max: {
            type: 'number',
            minimum: 1
          }
        }
      },
      body: {
        custom: {
          type: 'boolean',
          default: false
        },
        start: {
          type: 'number'
        },
        end: {
          type: 'number'
        },
        services: {
          type: 'array',
          default: [],
          items: {
            type: 'string',
            minLength: 24,
            maxLength: 24
          }
        },
        employees: {
          type: 'array',
          default: [],
          items: {
            type: 'string',
            minLength: 24,
            maxLength: 24
          }
        }
      }
    }
  }

  // reports sales by payment type

  var by_payment = async (request, reply, admin) => {

    const { min, max } = request.params;
    const { custom, start, end, services, employees } = request.body;

    const user_available_services = request.user.services.map(serv => serv.service.toString())

    const filterReceipts = {
      organization: admin.organization,
      receipt_state: {
        $ne: 'draft'
      },
      service: { $in: user_available_services },
      debt_id: null,
      date: {
        // $gte: min - 5 * 60 * 60 * 1000,
        // $lte: max - 5 * 60 * 60 * 1000,
        $gte: min,
        $lte: max,
      }
    }

    if (services && services.length > 0) {
      for (const service of services) {
        if (!user_available_services.includes(service)) {
          return reply.error('Acces denied')
        }
      }

      filterReceipts.service = {
        $in: services
      }
    }

    if (custom) {
      const additional_query = []
      for (let i = min; i < max; i += 86400000) {
        additional_query.push({
          date: {
            // $lte: i + end * 3600000 - 5 * 60 * 60 * 1000,
            // $gte: i + start * 3600000 - 5 * 60 * 60 * 1000,
            $lte: i + end * 3600000,
            $gte: i + start * 3600000,
          }
        })
      }
      delete filterReceipts.date
      filterReceipts['$or'] = additional_query
    }

    if (employees && employees.length > 0) {
      const employeesFilter = [
        {
          $and: [
            {
              waiter_id: ""
            },
            {
              cashier_id: {
                $in: employees
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
                $in: employees
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
                $in: employees
              }
            }
          ]
        }
      ]
      if (filterReceipts['$or']) {
        filterReceipts['$and'] = [
          { $or: employeesFilter },
          { $or: filterReceipts['$or'] }
        ]
        delete filterReceipts['$or']
      }
      else {
        filterReceipts['$or'] = employeesFilter
      }
    }

    const unWindPayment = {
      $unwind: "$payment"
    }

    const groupPayment = {
      $group: {
        _id: "$payment.name",
        payment_amount: {
          $sum: {
            $cond: [{ $eq: ["$is_refund", false] }, "$payment.value", 0]
          }
        },
        refund_amount: {
          $sum: {
            $cond: [{ $eq: ["$is_refund", true] }, "$payment.value", 0]
          }
        },
        net_amount: {
          $sum: {
            $cond: [{ $eq: ["$is_refund", false] }, "$payment.value", { $multiply: ["$payment.value", -1] }]
          }
        },
        payment_transaction: {
          $sum: {
            $cond: [{ $and: [{ $eq: ["$is_refund", false] }, { $ne: ["$payment.value", 0] }] }, 1, 0]
          }
        },
        refund_transaction: {
          $sum: {
            $cond: [{ $and: [{ $eq: ["$is_refund", true] }, { $ne: ["$payment.value", 0] }] }, 1, 0]
          }
        }
      }
    }

    const projectResult = {
      $project: {
        type: "$_id",
        refund_amount: 1,
        payment_amount: 1,
        net_amount: 1,
        payment_transaction: 1,
        refund_transaction: 1
      }
    }

    const sortResult = {
      $sort: {
        type: 1
      }
    }

    try {
      const result = await instance.Receipts.aggregate([
        {
          $match: filterReceipts
        },
        unWindPayment,
        groupPayment,
        projectResult,
        sortResult
      ])
        .allowDiskUse(true)
        .exec();

      const total = {
        type: 'total',
        net_amount: 0,
        payment_amount: 0,
        payment_transaction: 0,
        refund_amount: 0,
        refund_transaction: 0
      }
      for (const r of result) {
        total.net_amount += r.net_amount
        total.payment_amount += r.payment_amount
        total.payment_transaction += r.payment_transaction
        total.refund_amount += r.refund_amount
        total.refund_transaction += r.refund_transaction
      }
      reply.ok([...result, total])
    }
    catch (error) {
      return reply.error(error.message)
    }

    /*
    console.log(request.body)
    if (items == null) {
      items = []
    }
    var payment_type = {}

    var names = ['cash', 'card', 'gift', 'debt', 'qr_code', 'nfc', 'total']
    for (var name of names) {
      payment_type[name] = {
        payment_amount: 0,
        refund_amount: 0,
        payment_transaction: 0,
        refund_transaction: 0
      }
    }
    for (var rec of items) {
      if (rec.payment) {
        if (rec.payment.length > 0) {
          for (var pay of rec.payment) {
            if (pay != undefined) {
              if (rec.is_refund == false) {
                if (payment_type[pay.name].payment_transaction) {
                  if (pay.value != 0)
                    payment_type[pay.name].payment_transaction++
                  payment_type[pay.name].payment_amount += pay.value
                } else {
                  if (pay.value != 0)
                    payment_type[pay.name].payment_transaction = 1
                  payment_type[pay.name].payment_amount = pay.value
                }
              } else {
                if (payment_type[pay.name].refund_transaction) {
                  if (pay.value != 0)
                    payment_type[pay.name].refund_transaction++
                  payment_type[pay.name].refund_amount += pay.value
                } else {
                  if (pay.value != 0)
                    payment_type[pay.name].refund_transaction = 1
                  payment_type[pay.name].refund_amount = pay.value
                }
              }
            }
          }
        }
      }
    }
    var Answer = []
    for (var name of names) {
      payment_type[name].net_amount = payment_type[name].payment_amount - payment_type[name].refund_amount
      if (name != 'total') {
        if (payment_type['total'].payment_transaction == undefined) {
          payment_type['total'].payment_transaction = 0
        }
        if (payment_type['total'].refund_transaction == undefined) {
          payment_type['total'].refund_transaction = 0
        }
        if (payment_type[name].payment_transaction != null)
          payment_type['total'].payment_transaction += payment_type[name].payment_transaction
        if (payment_type[name].payment_amount != null)
          payment_type['total'].payment_amount += payment_type[name].payment_amount
        if (payment_type[name].refund_transaction != null)
          payment_type['total'].refund_transaction += payment_type[name].refund_transaction
        if (payment_type[name].refund_amount != null)
          payment_type['total'].refund_amount += payment_type[name].refund_amount
        if (payment_type[name].net_amount != null)
          payment_type['total'].net_amount += payment_type[name].net_amount
      }
      Answer.push(Object.assign({
        type: name
      }, payment_type[name]))
    }
    if (request.params.name == undefined) {
      reply.ok(Answer)
    }
    else {
      var answer = [[
        'type',
        'payment_amount',
        'refund_amount',
        'payment_transaction',
        'refund_transaction',
        'net_amount'
      ]]
      for (var a of Answer) {
        answer.push([
          a.type,
          a.payment_amount,
          a.refund_amount,
          a.payment_transaction,
          a.refund_transaction,
          a.net_amount
        ])
      }
      instance.send_csv(answer, 'by_payment', reply)
    }
    */
  }

  instance.post('/reports/sales/by_payment/:min/:max', params, (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      if (request.body.service != "" && request.body.service != null) {
        request.body.services = [request.body.service]
      }
      if (!admin) {
        return reply.error('Access!')
      }
      by_payment(request, reply, admin)
      // if (admin) { instance.get_receipt_by_range(request, reply, admin, by_payment) }
    })
  })

  // instance.get('/reports/sales/by_payment/:token/:services/:employees/:custom/:start/:end/:min/:max/:name', (request, reply) => {
  //   instance.make_beauty_for_export(request, reply, () => {
  //     instance.oauth_admin(request, reply, (admin) => {
  //       if (admin) {
  //         instance.get_receipt_by_range(request, reply, admin, by_payment)
  //       }
  //     })
  //   })
  // })

  next()

}
