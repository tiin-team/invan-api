module.exports = (instance, options, next) => {

  // get receipt by time

  const get_receipts = async (request, reply, employee) => {
    try {
      const time = parseInt(request.params.time)
      const receipts = await instance.Receipts
        .find({
          organization: employee.organization,
          service: request.headers['accept-service'],
          $or: [
            {
              created_time: {
                $gte: time
              }
            },
            {
              'debtData.is_done': false
            }
          ]
        })
        .limit(200)
        .lean()
      reply.ok(receipts)
    } catch (error) {
      reply.error(error.message)
    }
    return reply;
  }

  instance.get('/receipts/find/:time', options.version, (request, reply) => {
    instance.authorization(request, reply, (employee) => {
      get_receipts(request, reply, employee)
    })
  })

  next()
}