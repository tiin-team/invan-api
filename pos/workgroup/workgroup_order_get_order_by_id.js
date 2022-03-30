
const workgroupOrderGet = async (request, reply, instance) => {
  try {
    const id = request.params.id
    const workgroupOrder = await instance.WorkgroupOrder.findById(id);
    const user = request.user;
    if(!workgroupOrder) {
      return reply.fourorfour('workgroupOrder')
    }
    let state = 'pending';
    for(const e of workgroupOrder.employees) {
      if(user._id+'' == e.employee_id+'') {
        state = e.state == 'done' ? 'completed' : 'in_progress'
      }
    }
    workgroupOrder.state = state;
    const workgroup_order_items = [];
    for(const index in workgroupOrder.items) {
      if(typeof workgroupOrder.items[index].residue != typeof 5) {
        workgroupOrder.items[index].residue = 0
      }
      try {
        const item = await instance.goodsSales.findById(workgroupOrder.items[index].product_id)
        if(item) {
          workgroupOrder.items[index].is_track_stock = item.is_track_stock ? true : false;
          if(item.item_type == 'variant') {
            const parent = await instance.goodsSales.findOne({
              variant_items: {
                $elemMatch: {
                  $eq: item._id
                }
              }
            });
            if(parent) {
              item.workgroups = parent.workgroups
            }
          }
          workgroupOrder.items[index].workgroups = item.workgroups;
        }
      }
      catch (error) {
        instance.log.error(error.message)
      }
      if(!workgroupOrder.items[index].workgroups) {
        workgroupOrder.items[index].workgroups = []
      }
      if(workgroupOrder.items[index].created_from == 'user' && workgroupOrder.items[index].created_by+'' == user._id+'') {
        workgroup_order_items.push(workgroupOrder.items[index])
      }
      else if(workgroupOrder.items[index].created_from != 'user') {
        workgroup_order_items.push(workgroupOrder.items[index])
      }
    }

    workgroupOrder.items = workgroup_order_items;
    
    const orderInfo = {}
    try {
      const organization = await instance.organizations.findById(user.organization);
      if(!(organization.workgroup_comments instanceof Array)) {
        organization.workgroup_comments = []
      }
      for(const w_c of organization.workgroup_comments) {
        if(w_c.workgroups && w_c.workgroups.includes(user.workgroup_id+'')) {
          orderInfo[w_c.text] = workgroupOrder.info[w_c.text]
        }
      }
    } catch (error) {}
    
    workgroupOrder.info = orderInfo

    reply.ok(workgroupOrder)
  } catch (error) {
    reply.error(error.message)
  }
  return reply;
}

module.exports = ((instance, _, next) => {

  instance.get(
    '/workgroup/order/get/:id',
    {
      version: '1.0.0',
      preValidation: [instance.authorize_employee]
    },
    async (request, reply) => {
      workgroupOrderGet(request, reply, instance)
      return reply;
    }
  )

  next()
})
