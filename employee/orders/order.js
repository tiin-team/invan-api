const fp = require('fastify-plugin');

module.exports = fp((instance, options, next) => {
  const version = { version: '2.0.0' }

  const employeeOrderBody = {
    schema: {
      body: {
        type: 'object',
        additionalProperties: false,
        required: [
          'organization_id', 'service_id', 'date', 'required_date',
        ],
        properties: {
          organization_id: { type: 'string', maxLength: 24, minLength: 24 },
          service_id: { type: 'string', maxLength: 24, minLength: 24 },
          employee_id: { type: 'string', maxLength: 24, minLength: 24 },
          date: { type: 'number', minimum: new Date().getTime() - 216000000 },
          required_date: { type: 'number', minimum: new Date().getTime() - 216000000 },
          sector_name: { type: 'string' },
          note: { type: 'string', default: '' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: [
                'product_id', 'product_name', 'product_sku',
                'in_stock', 'barcode', 'order_quantity', //'sector_name'
              ],
              properties: {
                product_id: { type: 'string', maxLength: 24, minLength: 24 },
                product_name: { type: 'string' },
                product_sku: { type: 'number' },
                supplier_id: { type: 'string', maxLength: 24, minLength: 24 },
                sector_name: { type: 'string' },
                in_stock: {
                  type: 'number',
                  default: 0
                },
                date: { type: 'number' },
                real_stock: {
                  type: 'number',
                  default: 0
                },
                barcode: {
                  type: 'array',
                  items: {
                    type: 'string',
                  },
                  default: [],
                },
                order_quantity: { type: 'number' },
                note: { type: 'string' }
              },
            },
          },
        },
      },
    }
  }
  instance.post('/employee/order/create', { ...version, ...employeeOrderBody }, (request, reply) => {
    instance.authorization(request, reply, async (employee) => {
      try {
        const data = request.body;

        if (employee.organization !== data.organization_id)
          return reply.code(403).send("Forbidden Organization")

        const organization = await instance.organizations
          .findOne({ _id: data.organization_id }, { name: 1 })
          .lean()
        if (!organization)
          return reply.fourorfour('Organization not found')

        const service = await instance.services
          .findOne(
            { _id: data.service_id, organization: data.organization_id },
            { name: 1 },
          )
          .lean()

        if (!service)
          return reply.fourorfour('Service not found')

        data.organization_id = organization._id;
        data.organization_name = organization.name;
        data.service_id = service._id;
        data.service_name = service.name;
        data.status = 'pending';
        data.employee_id = employee._id;
        data.employee_name = employee.name;


        const ordersCount = await instance.employeesOrder
          .countDocuments({ organization_id: organization._id })
          .exec();

        data.p_order = 'IO' + ('0000' + (ordersCount + 1001)).slice(-6);

        const res = await instance.employeesOrder.create(data);
        res.items_count = res.items.length
        res.accept_items_count = 0;

        return reply.ok(res);
      }
      catch (error) {
        reply.error(error.message)
      }
    })
  })

  const getBodySchema = {
    schema: {
      body: {
        type: 'object',
        additionalProperties: false,
        required: [
          'limit', 'page',
        ],
        properties: {
          limit: { type: 'number', minimum: 5 },
          page: { type: 'number', minimum: 1 },
          service: {
            OneOf: [
              { type: 'string', maxLength: 24, minLength: 24 },
              { type: 'string', maxLength: 0, minLength: 0 },
            ]
          },
          employee_id: {
            OneOf: [
              { type: 'string', maxLength: 24, minLength: 24 },
              { type: 'string', maxLength: 0, minLength: 0 },
            ]
          },
          search: { type: 'string', default: '' },
          status: { type: 'string', enum: ['pending', 'accept', ''] },
          min: { type: 'number' },
          max: { type: 'number' },
        },
      },
    }
  }

  instance.get('/employee/orders/:id', version, (request, reply) => {
    instance.authorization(request, reply, async (user) => {
      try {
        const order = await instance.employeesOrder
          .findOne({
            _id: instance.ObjectId(request.params.id),
            service_id: { $in: user.services.map(serv => serv.service) },
          })
          .lean()
        i = 0
        let productIds = []
        for (const item of order.items) {
            productIds.push(item.product_id)
            if (item.is_accept === true) {
                i++
            } else {
                item.is_accept = false
            }
        }

        console.log(productIds)

        const products = await instance.goodsSales.find({_id:{$in:productIds}})


        const productsMap = new Map(products.map((product) => [product._id, product]));


        console.log(productsMap)


        for (const orderItem of order.items) {
            const product = productsMap.get(orderItem.product_id)
            console.log(orderItem.product_id, product)
            if (product) {
                orderItem.category = {
                    id:product.category_id,
                    name:product.category_name
                }
            }
        }

        order.accept_items_count = i
        order.items_count = order && order.items ? order.items.length : 0

        return reply.ok(order)
      } catch (error) {
        reply.error(error.message)
      }
    })
  })

  instance.post('/employee/orders/get', { ...version, ...getBodySchema }, (request, reply) => {
    instance.authorization(request, reply, async (user) => {
      try {
        const { limit, page, search, service, status, employee_id, min, max } = request.body

        const user_available_services = user.services.map(serv => serv.service)

        const query = {
          organization_id: instance.ObjectId(user.organization),
        }

        if (search)
          query.$or = [
            {
              p_order: { $regex: search, $options: 'i' },
            },
            {
              organization_name: { $regex: search, $options: 'i' },
            },
            {
              service_name: { $regex: search, $options: 'i' },
            },
            {
              employee_name: { $regex: search, $options: 'i' },
            },
            {
              sector_name: { $regex: search, $options: 'i' },
            },
          ]

        if (min && max) {
          query.date = {
            $gte: min,
            $lte: max,
          }
        }

        if (service) {
          if (!user_available_services.find(serv => serv + '' === service))
            return reply.code(403).send('Forbidden service')
          query.service_id = instance.ObjectId(service);
        } else {
          query.service_id = { $in: user_available_services }
        }

        if (status) query.status = status;
        if (employee_id) query.employee_id = instance.ObjectId(employee_id);

        const $match = { $match: query };
        const $limit = { $limit: limit };
        const $skip = { $skip: (page - 1) * limit };
        const $sort = { $sort: { _id: -1 } };
        const $project = {
          $project: {
            organization_id: 1,
            organization_name: 1,
            service_id: 1,
            service_name: 1,
            p_order: 1,
            employee_id: 1,
            employee_name: 1,
            accept_by_id: 1,
            accept_by_name: 1,
            note: 1,
            status: 1,
            date: 1,
            required_date: 1,
            accept_date: 1,
            sector_name: 1,
            items: 1,
            createdAt: 1,
            updatedAt: 1,
            items_count: { $size: '$items' },
            accept_items_count: {
              $reduce: {
                input: "$items",
                initialValue: 0,
                in: {
                  $sum: [
                    {
                      $cond: [
                        { $eq: ["$$this.is_accept", true] },
                        1,
                        0
                      ]
                    },
                    "$$value"
                  ]
                }
              }
            }
          }
        }

        const data = await instance.employeesOrder
          .aggregate([$match, $sort, $skip, $limit, $project])
          .exec();

        const total = await instance.employeesOrder.countDocuments(query);

        return reply.ok({
          total: total,
          limit: limit,
          page: Math.ceil(total / limit),
          current_page: page,
          data: data,
        })
      } catch (error) {
        reply.error(error.message)
      }
    })
  })
  const employeeOrderUpdateBody = {
    schema: {
      body: {
        type: 'object',
        additionalProperties: false,
        required: [
          // 'organization_id', 'service_id', 'date', 'required_date',
        ],
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: [
                'product_id', 'is_accept'
              ],
              properties: {
                product_id: { type: 'string', maxLength: 24, minLength: 24 },
                is_accept: { type: 'boolean', },
              },
            },
          },
        },
      },
    }
  }
  instance.put('/employee/orders/:_id', { ...version, ...employeeOrderUpdateBody }, (request, reply) => {
    instance.authorization(request, reply, async (employee) => {
      try {
        const id = request.params._id
        const order = await instance.employeesOrder.findById(id).lean()

        const user_available_services = employee.services.map(serv => serv.service)

        if (employee.organization !== order.organization_id + '')
          return reply.code(403).send("Forbidden Organization")

        if (!user_available_services.find(serv => serv + '' === order.service_id + ''))
          return reply.code(403).send('Forbidden service')

        order.status = 'accept';
        order.accept_by_id = employee._id;
        order.accept_by_name = employee.name;
        order.accept_date = new Date().getTime();
        for (const reqItem of request.body.items) {
          order.items.find(e => e.product_id + '' === reqItem.product_id + '').is_accept = reqItem.is_accept
            ? true
            : false
        }
        const res = await instance.employeesOrder.findByIdAndUpdate(
          id,
          order,
          { new: true, lean: true },
        );

        return reply.ok(res);
      }
      catch (error) {
        reply.error(error.message)
      }
    })
  })

  next()
})