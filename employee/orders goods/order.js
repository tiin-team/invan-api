const fp = require('fastify-plugin');

module.exports = fp((instance, options, next) => {
  const version = { version: '2.0.0' }

  instance.post('/employee/create/order', version, (request, reply) => {
    instance.authorization(request, reply, (employee) => {
      // get_receipts(request, reply, employee)
      const data = request.body;

      data.organization_id = employee.organization;
      data.organization_name = employee.organization_name;

      data.employee_id = employee.employee_id;
      data.employee_name = employee.employee_name;
      const ordersCount = await instance.employeesOrder
        .countDocuments({ organization: user.organization })
        .exec();

      data.p_order = 'EP' + ('0000' + (ordersCount + 1001)).slice(-6);

      instance.employeesOrder.save(request.body)
    })
  })

  instance.post('/employee/get/orders', version, (request, reply) => {
    instance.authorization(request, reply, (employee) => {
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