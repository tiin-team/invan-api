
module.exports = ((instance, _, next) => {

  const priceChangeSchema = {
    body: {
      type: 'object',
      required: [
        'from', 'to',
        'service', 'employee',
        'limit', 'page',
        'search'
      ],
      properties: {
        from: {
          type: 'number'
        },
        to: {
          type: 'number'
        },
        service: {
          oneOf: [
            {
              type: 'string',
              minLength: 24,
              maxLength: 24
            },
            {
              type: 'string',
              enum: ['']
            }
          ]
        },
        employee: {
          oneOf: [
            {
              type: 'string',
              minLength: 24,
              maxLength: 24
            },
            {
              type: 'string',
              enum: ['']
            }
          ]
        },
        limit: {
          type: 'number',
          munimum: 1
        },
        page: {
          type: 'number',
          minimum: 1
        },
        search: {
          type: 'string',
          default: ''
        }
      }
    }
  }

  instance.post(
    '/items/price_change_history',
    {
      version: '1.0.0',
      schema: priceChangeSchema
    },
    (request, reply) => {
      instance.oauth_admin(request, reply, async (user) => {
        if (!user) {
          return reply.error('Access')
        }
        let { from, to, service, employee, limit, page, search } = request.body;
        const historyMatch = {
          $match: {
            organization: user.organization,
            $or: [
              { service: { $in: user.services.map(serv => serv.service + '') } },
              { service: { $in: user.services.map(serv => serv.service) } },
            ],
            date: {
              $gte: from,
              $lte: to
            },
            product_name: {
              $regex: search,
              $options: 'i'
            }
          }
        }

        if (service != '') {
          try {
            service = instance.ObjectId(service)
          } catch (error) { }
          historyMatch['$match'].service = {
            $eq: service
          }
        }

        if (employee != '') {
          try {
            employee = instance.ObjectId(employee)
          } catch (error) { }
          historyMatch['$match'].employee_id = {
            $eq: employee
          }
        }

        const lookupWithServices = {
          $lookup: {
            from: 'inoneservices',
            localField: 'service',
            foreignField: '_id',
            as: 'service'
          }
        }

        const lookupWithEmployees = {
          $lookup: {
            from: 'users',
            localField: 'employee_id',
            foreignField: '_id',
            as: 'employee'
          }
        }

        const lookupWithItems = {
          $lookup: {
            from: 'goodssales',
            localField: 'product_id',
            foreignField: '_id',
            as: 'product'
          }
        }

        const total = await instance.itemPriceChangeHistory.countDocuments(historyMatch['$match']);

        const history = await instance.itemPriceChangeHistory.aggregate([
          historyMatch,
          lookupWithServices,
          lookupWithEmployees,
          lookupWithItems,
          {
            $sort: {
              date: -1
            }
          },
          {
            $skip: (page - 1) * limit
          },
          {
            $limit: limit
          }
        ])

        for (let i = 0; i < history.length; i++) {
          if (history[i].product.length > 0) {
            if (history[i].product[0].item_type == 'variant') {
              let current_item = history[i].product[0]
              try {
                const parent = await instance.goodsSales.findOne({
                  variant_items: {
                    $elemMatch: {
                      $eq: current_item._id
                    }
                  }
                })

                if (parent) {
                  history[i].product_name = `${parent.name} ( ${current_item.name} )`
                }
              }
              catch (err) { }
            }
            else {
              history[i].product_name = history[i].product[0].name
            }
          }
          delete history[i].product
          if (history[i].service.length > 0) {
            history[i].service_name = history[i].service[0].name
          }
          delete history[i].service
          if (history[i].employee.length > 0) {
            history[i].employee_name = history[i].employee[0].name
          }
          delete history[i].employee
        }

        reply.ok({
          total: total,
          page: Math.ceil(total / limit),
          data: history
        })

      })
    }
  )

  next()
})
