const getWorkgroupOrderById = async (request, reply, instance) => {
  try {
    const { id } = request.params;

    await instance.WorkgroupOrder.setLastState(id);

    const workgroup_order = await instance.WorkgroupOrder.findById(id);
    if (!workgroup_order) {
      return reply.fourorfour("WorkgroupOrder");
    }
    let response = workgroup_order;
    const service = await instance.services.findById(workgroup_order.service);
    if (service) {
      workgroup_order.service_name = service.name;
    }

    try {
      response = response.toObject();
    } catch (error) { }

    const client = await instance.clientsDatabase.findById(
      workgroup_order.client_id
    );
    response.client = client;

    const workgroups = await instance.Workgroup.getListSortedById(
      response.workgroups
    );

    const workgroup_names = [];
    const workgroupMap = {};
    for (const index in workgroups) {
      try {
        const w = workgroups[index];
        workgroupMap[w._id] = {
          name: w.name,
          employee: workgroup_order.employees[index] instanceof Array ? workgroup_order.employees[index][0] : workgroup_order.employees[index],
          employees: workgroup_order.employees[index],
        };
        if (workgroup_order.workgroup_type == 'not_order') {
          delete workgroupMap[w._id].employee
          delete workgroupMap[w._id].employees
        }
      }
      catch (error) {
        console.log('on, for', error.message)
      }
    }

    if (workgroup_order.workgroup_type == 'not_order') {
      for (const e of workgroup_order.employees) {
        try {
          workgroupMap[e.workgroup_id] = {
            name: workgroupMap[e.workgroup_id].name,
            employee: e
          }
        } catch (error) {
          console.log('on for', error.message)
        }
      }
      let state = response.state;
      let is_all_done = true;
      let is_all_workgroup_chosen = true;
      let noone_choose = true;
      const WMap = {}
      for (const w of workgroup_order.workgroups) {
        WMap[w + ''] = false;
      }

      for (const e of workgroup_order.employees) {
        is_all_done = is_all_done && e.state == 'done';
        WMap[e.workgroup_id + ''] = true;
        noone_choose = false;
      }
      for (const w of workgroup_order.workgroups) {
        is_all_workgroup_chosen = is_all_workgroup_chosen && WMap[w + ''];
      }
      if (![
        'draft', 'rejected',
        'complete_confirmed', 'cancelled'
      ].includes(state)) {
        if (is_all_workgroup_chosen && is_all_done) {
          state = 'completed'
        }
        else if (noone_choose) {
          state = 'pending'
        }
        else if (!is_all_workgroup_chosen || !is_all_done) {
          state = 'in_progress'
        }
      }
      if (state) {
        response.state = state;
      }
    }

    let active_workgroup_order = -1;
    let count_index = 1;
    for (const id of response.workgroups) {
      try {
        if (workgroupMap[id]) {
          workgroup_names.push({
            name: workgroupMap[id] ? workgroupMap[id].name : "Deleted",
            employee: workgroupMap[id] ? workgroupMap[id].employee : null,
            employees: workgroupMap[id] ? workgroupMap[id].employees : null,
          });
          if (workgroup_order.current_workgroup + "" == id + "") {
            active_workgroup_order = count_index;
          }
          count_index += 1;
        }
      } catch (error) {
        console.log('on for', error.message)
      }
    }
    
    for (const index in response.items) {
      const itm = response.items[index];
      try {
        const good = await instance.goodsSales.findById(itm.product_id);
        if (good) {
          if (good.item_type == 'variant') {
            good.name = `${good.parent_name} (${good.name})`;
          }
          response.items[index].product_name = good.name;
        }
      } catch (error) { }
    }
    
    //
    active_workgroup_order = -1
    response.active_workgroup_order = active_workgroup_order;
    response.workgroup_names = workgroup_names;
    reply.ok(response);
  } catch (error) {
    console.log(error.message)
    reply.error(error.message);
  }
  return reply;
};

module.exports = (instance, _, next) => {
  instance.get(
    "/workgroup/order/admin-get/:id",
    {
      version: "1.0.0",
      preValidation: instance.authorize_admin,
    },
    async (request, reply) => {
      getWorkgroupOrderById(request, reply, instance);
      return reply;
    }
  );

  next();
};
