
const editStateWorkgroupOrder = async function (request, reply, instance) {
  try {
    const { id } = request.params;
    const user = request.user;
    const workgroupOrder = await instance.WorkgroupOrder.findById(id);
    if (!workgroupOrder) {
      return reply.fourorfour('WorkgroupOrder')
    }
    
    if (workgroupOrder.state != 'rejected') {
      return reply.response(403, 'Could not undo')
    }

    await instance.WorkgroupOrder.editStateWorkgroupOrder(workgroupOrder, user, 'pending')
    reply.ok({ id: id })
  } catch (error) {
    reply.error(error.message)
  }
}

module.exports = ((instance, _, next) => {

  instance.get(
    '/workgroup/order/undo/:id',
    {
      version: '1.0.0',
      preValidation: instance.authorize_admin
    },
    async (request, reply) => {
      editStateWorkgroupOrder(request, reply, instance)
      return reply;
    }
  )

  next()
})
