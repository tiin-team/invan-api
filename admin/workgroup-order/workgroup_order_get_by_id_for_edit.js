const getWorkgroupOrderById = async (request, reply, instance) => {
  try {
    const { id } = request.params;
    await instance.WorkgroupOrder.setLastState(id);
    const workgroup_order = await instance.WorkgroupOrder.findById(id);
    if (!workgroup_order) {
      return reply.fourorfour("WorkgroupOrder");
    }
    if (workgroup_order.tech_map_id) {
      try {
        const tech_map = await instance.TechMap.findById(workgroup_order.tech_map_id);
        if (tech_map) {
          workgroup_order.tech_map_name = tech_map.name
        }
      }
      catch (error) { }
    }
    reply.ok(workgroup_order);
  } catch (error) {
    reply.error(error.message);
  }
};

module.exports = (instance, _, next) => {
  instance.get(
    "/workgroup/order/admin-get-for-edit/:id",
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
