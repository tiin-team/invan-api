
const acceptWorkgroupOrder = async (request, reply, instance) => {
  try {
    let user = request.user;

    const id = request.params.id;
    const workgroupOrder = await instance.WorkgroupOrder.findById(id);
    if (!workgroupOrder) {
      return reply.fourorfour('workgroupOrder')
    }

    // if (workgroupOrder.current_workgroup + '' != user.workgroup_id + '') {
    //   return reply.response(411, 'could not accept')
    // }

    if (!workgroupOrder.workgroups.includes(user.workgroup_id)) {
      return reply.response(411, 'could not accept')
    }

    // if(workgroupOrder.state != 'pending') {
    //   return reply.response(412, 'workgroup is in progress')
    // }
    const result = await instance.WorkgroupOrder.acceptWorkgroupOrder(workgroupOrder, user);

    if (!result) {
      return reply.error('Could not accept');
    }
    reply.ok(result)
  } catch (error) {
    reply.error(error.message)
  }
  return reply;
}

module.exports = ((instance, _, next) => {

  instance.get(
    '/workgroup/order/accept/:id',
    {
      version: '1.0.0',
      preValidation: [instance.authorize_employee]
    },
    (request, reply) => {
      return acceptWorkgroupOrder(request, reply, instance)
    }
  )


  next()
})
