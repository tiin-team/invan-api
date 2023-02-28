
module.exports = (instance, _, next) => {

  instance.post('/get_shifts', { version: '1.0.0' }, (request, reply) => {
    instance.on(request, reply, (user) => {
      instance.Shifts.find({
        organization: user.organization,
        service: request.body.service
      }, { opening_time: 1, closing_time: 1, _id: 0 }, (err, shifts) => {
        if (err || shifts == null) {
          shifts = []
        }
        reply.ok(shifts)
      }).sort({ opening_time: -1 }).limit(5)
    })
  })

  next()
}