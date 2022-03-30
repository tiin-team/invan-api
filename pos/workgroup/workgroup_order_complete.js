
const completeWorkgroupOrderHandler = async (request, reply, instance) => {
  try {
    const user = request.user;
    const id = request.params.id;
    const workgroup_order = await instance.WorkgroupOrder.findById(id);
    if (!workgroup_order) {
      return reply.fourorfour('workgroupOrder')
    }

    // if (workgroup_order.current_employee+'' != user._id+'') {
    //   return reply.response(403, 'workgroup is not for you')
    // }

    const berofe_w_ids = [];
    const berofe_w_map = {}
    for (const w of workgroup_order.workgroups) {
      if (user.workgroup_id + '' == w + '') {
        break;
      }
      berofe_w_ids.push(w);
      berofe_w_map[w] = false
    }

    for (const e of workgroup_order.employees) {
      berofe_w_map[e.workgroup_id] = e.state == 'done';
    }
    let all_done = true;
    for (const w_id of berofe_w_ids) {
      all_done = all_done && berofe_w_map[w_id];
    }

    if (!all_done) {
      return reply.response(405, 'there is uncompleted process');
    }

    const result = await instance.WorkgroupOrder.completeWorkgroupOrder(workgroup_order, user);
    if (!result) {
      return reply.error('Could not Coplete order')
    }
    reply.ok()
  } catch (error) {
    reply.error(error.message)
  }
}

module.exports = ((instance, _, next) => {

  instance.get(
    '/workgroup/order/complete/:id',
    {
      version: '1.0.0',
      preValidation: [instance.authorize_employee],
    },
    async (request, reply) => {
      completeWorkgroupOrderHandler(request, reply, instance)
      return reply;
    }
  )

  next()
})
