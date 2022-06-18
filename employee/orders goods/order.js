const fp = require('fastify-plugin');

module.exports = fp((instance, options, next) => {
  const version = { version: '2.0.0' }

  const employeeOrderBody = {
    schema: {
      body: {
        type: 'object',
        additionalProperties: false,
        required: [
          'organization_id', 'service_id',
          'status', 'date',
        ],
        properties: {
          organization_id: { type: 'string', maxLength: 24, minLength: 24 },
          organization_name: { type: 'string' },
          service_id: { type: 'string', maxLength: 24, minLength: 24 },
          service_name: { type: 'string' },
          p_order: { type: 'string' },
          employee_id: { type: 'string', maxLength: 24, minLength: 24 },
          employee_name: { type: 'string' },
          status: {
            type: 'string',
            enum: ['pending', 'accept'],
            default: 'pending',
          },
          date: { type: 'number', minimum: new Date().getTime() - 216000000 },
          sector_name: { type: 'string' },
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
                note: { type: 'string', default: '' },
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

        data.employee_id = employee._id;
        data.employee_name = employee.name;


        const ordersCount = await instance.employeesOrder
          .countDocuments({ organization: employee.organization })
          .exec();

        data.p_order = 'EP' + ('0000' + (ordersCount + 1001)).slice(-6);
        console.log(data);
        res = await instance.employeesOrder.create(data);

        return reply.ok(res);
      }
      catch (error) {
        reply.error(error.message)
      }
    })
  })

  instance.post('/employee/orders/get', version, (request, reply) => {
    instance.authorization(request, reply, async (employee) => {
      const { limit, page, search } = request.body

      const user_available_services = request.user.services.map(serv => serv.service)

      const query = {
        service_id: { $in: user_available_services },
      }

      if (search)
        query.$or = [
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

      const $match = { $match: query };
      const $limit = { $limit: limit };
      const $skip = { $skip: (page - 1) * limit };

      const data = await instance.employeesOrder
        .aggregate([$match, $limit, $skip])
        .exec();

      const total = await instance.employeesOrder.countDocuments(query);

      return reply.ok({
        total: total,
        limit: limit,
        page: Math.ceil(total / limit),
        current_page: page,
        data: data,
      })
    })
  })

  next()
})