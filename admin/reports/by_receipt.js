module.exports = (instance, _, next) => {

  const params = {
    version: '1.0.0',
    schema: {
      params: {
        type: 'object',
        required: [
          'min', 'max',
          'limit', 'page'
        ],
        properties: {
          min: {
            type: 'number',
            minimum: 1
          },
          max: {
            type: 'number',
            minimum: 1
          },
          limit: {
            type: 'number',
            minimum: 1
          },
          page: {
            type: 'number',
            minimum: 1
          },
          type: {
            type: 'number',
            enum: [0, 1, 2, 3]
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
        },
        search: {
          type: 'string',
          default: ''
        }
      }
    }
  }

  // reports by receipts

  const by_receipt = async (request, reply, admin) => {

    const { min, max, limit, page, type } = request.params;
    const { custom, start, end, services, employees, search } = request.body;

    const user_available_services = request.user.services.map(serv => serv.service.toString())

    const filterReceipts = {
      organization: admin.organization,
      receipt_state: {
        $ne: 'draft'
      },
      service: { $in: user_available_services },
      debt_id: null,
      date: {
        // $gte: min-5*60*60*1000,
        // $lte: max-5*60*60*1000,
        $gte: min,
        $lte: max,
      }
    }

    if (search) {
      filterReceipts.receipt_no = {
        $regex: search,
        $options: 'i'
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

    const all_count = await instance.Receipts.countDocuments(filterReceipts);
    const sales_count = await instance.Receipts.countDocuments({ ...filterReceipts, is_refund: false });
    const refund_count = await instance.Receipts.countDocuments({ ...filterReceipts, is_refund: true });
    const drafts_count = await instance.Receipts.countDocuments({ ...filterReceipts, receipt_state: 'draft' })

    // console.log(drafts_count)

    let total_count;
    let receiptsFilter;
    switch (type) {
      case 0: {
        total_count = all_count
        receiptsFilter = filterReceipts
        break;
      }
      case 1: {
        total_count = sales_count
        receiptsFilter = { ...filterReceipts, is_refund: false }
        break;
      }
      case 3: {
        total_count = drafts_count
        receiptsFilter = { ...filterReceipts, receipt_state: 'draft' }
        break;
      }
      default:
        total_count = refund_count
        receiptsFilter = { ...filterReceipts, is_refund: true }
    }

    const receipts = await instance.Receipts.aggregate([
      {
        $match: receiptsFilter
      },
      {
        $project: {
          receipt_no: 1,
          date: 1,
          employee: 1,
          total_price: 1,
          is_refund: 1,
          service: 1,
          cashier_id: 1,
          user_id: 1
        }
      },
      {
        $sort: { date: -1 }
      },
      { $skip: (page - 1) * limit },
      { $limit: limit },
    ])

    const serviceMap = {}
    const employeeMap = {}
    const customerMap = {}

    for (const index in receipts) {
      try {
        receipts[index] = receipts[index].toObject()
      } catch (error) { }

      // service
      if (!serviceMap[receipts[index].service]) {
        try {
          const service = await instance.services.findById(receipts[index].service).lean();
          if (service) {
            serviceMap[service._id] = service
          }
        }
        catch (error) { }
      }

      if (serviceMap[receipts[index].service]) {
        receipts[index].service_name = serviceMap[receipts[index].service].name
      }

      // employee
      if (!employeeMap[receipts[index].cashier_id]) {
        try {
          const cashier = await instance.User.findById(receipts[index].cashier_id)
          if (cashier) {
            employeeMap[cashier._id] = cashier
          }
        }
        catch (error) { }
      }

      if (employeeMap[receipts[index].cashier_id]) {
        receipts[index].cashier_name = employeeMap[receipts[index].cashier_id].name
      }

      // customer
      if (receipts[index].user_id && !customerMap[receipts[index].user_id]) {
        try {
          const customer = await instance.clientsDatabase.findOne({ user_id: receipts[index].user_id })
          if (customer) {
            customerMap[customer._id] = customer
          }
        }
        catch (error) { }
      }

      if (receipts[index].user_id && customerMap[receipts[index].user_id]) {
        receipts[index].customer_name = customerMap[receipts[index].user_id].name
      }
      else {
        receipts[index].customer_name = '-'
      }
    }

    reply.ok({
      all_receipts: all_count,
      sales: sales_count,
      refunds: refund_count,
      drafts: drafts_count,
      total: total_count,
      page: Math.ceil(total_count / limit),
      receipts: receipts
    })

  }

  instance.post('/reports/by_receipt/:min/:max/:limit/:page', params, (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      if (!admin) {
        return reply.error('Access')
      }
      by_receipt(request, reply, admin)
      // if (admin) { instance.get_receipt_by_range(request, reply, admin, by_receipt, {}, true) }
    })
  })

  instance.post('/reports/by_receipt/:min/:max/:limit/:page/:type', params, (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      if (!admin) {
        return reply.error('Access')
      }
      by_receipt(request, reply, admin)
      // if (admin) { instance.get_receipt_by_range(request, reply, admin, by_receipt, {}, true) }
    })
  })

  next()
}