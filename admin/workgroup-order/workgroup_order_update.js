const updateWorkgroupOrder = async (request, reply, instance) => {

  try {
    const body = request.body;
    const user = request.user;
    const service_id = body.service;
    if (!service_id) {
      return reply.fourorfour("Service");
    }

    const service = await instance.services.findById(service_id);
    if (!service) {
      return reply.fourorfour("Service");
    }
    body.organization = user.organization;
    body.service = service_id;

    const item_id = body.item_id;
    const item = await instance.goodsSales.findById(item_id);
    if (!item) {
      return reply.fourorfour("item");
    }

    body.item_name = item.name;
    body.title=item.name

    const { id: workgroup_order_id } = request.params;
    const workgroup_order = await instance.WorkgroupOrder.findById(
      workgroup_order_id
    );
    // if (!workgroup_order || workgroup_order.state != "draft") {
    //   return reply.fourorfour("WorkgroupOrder");
    // }

    for (const index in body.workgroups) {
      const id = body.workgroups[index];
      const workgroup = await instance.Workgroup.findById(id);
      if (!workgroup) {
        return reply.fourorfour(`Workgroup with this id \`${id}\` not found`);
      }
    }

    for (const index in body.items) {
      const id = body.items[index].product_id;
      const item = await instance.goodsSales.findById(id);
      if (!item) {
        return reply.fourorfour(`Item with this id \`${id}\` not found`);
      }
      if (item.item_type == "variant") {
        item.name = `${item.parent_name} ( ${item.name} )`;
      }
      body.items[index].product_name = item.name;
      body.items[index].used_quantities = [];
      body.items[index].created_by = user._id;
      body.items[index].created_from = "admin";
    }

    body.createdBy = user._id;
    body.createdByName = user.name;

    if (body.state == 'draft') {
      body.state = 'draft';
    }
    else {
      body.state = 'pending';
    }
    body.updatedAt = new Date().getTime();
    await instance.WorkgroupOrder.updateOne({ _id: workgroup_order_id }, { $set: body });
    reply.ok({ id: workgroup_order_id });
  } catch (error) {
    reply.error(error.message);
  }
};

module.exports = (instance, _, next) => {
  const workgroupOrderCreateSchema = {
    body: {
      type: "object",
      additionalProperties: false,
      required: [
        "service",
        "item_id",
        "items",
        "comment",
        "priority",
        "workgroups",
      ],
      properties: {
        state: {
          type: 'string'
        },
        service: {
          type: "string",
          minLength: 24,
          maxLength: 24,
        },
        item_id: {
          type: "string",
          minLength: 24,
          maxLength: 24,
        },
        title: {
          type: "string",
          default: ''
        },
        comment: {
          type: "string",
          maxLength: 50,
        },
        info: {
          type: "object",
        },
        priority: {
          type: "string",
          enum: ["urgent", "normal", "low"],
        },
        workgroups: {
          type: "array",
          minItems: 1,
          items: {
            type: "string",
            minLength: 24,
            maxLength: 24,
          },
        },
        workgroup_positions: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            required: [
              'workgroup_id', 'position_index'
            ],
            properties: {
              workgroup_id: {
                type: 'string',
                minLength: 24,
                maxLength: 24
              },
              position_index: {
                type: 'integer',
                minimum: 1
              }
            }
          }
        },
        tech_map_id: {
          type: 'string'
        },
        tech_map_name: {
          type: 'string'
        },
        order_item_count: {
          type: 'number'
        },
        items: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["product_id"],
            properties: {
              product_id: {
                type: "string",
                minLength: 24,
                maxLength: 24,
              },
              quantity: {
                type: "number",
                minimum: 0,
                default: 0
              },
              cost: {
                type: "number",
                minimum: 0,
                default: 0,
              },
            },
          },
        },
      },
    },
  };

  instance.post(
    "/workgroup/order/update/:id",
    {
      version: "1.0.0",
      schema: workgroupOrderCreateSchema,
      preValidation: instance.authorize_admin,
      attachValidation: true,
    },
    async (request, reply) => {
      if (request.validationError) {
        return reply.validation(request.validationError.message);
      }
      updateWorkgroupOrder(request, reply, instance);
      return reply;
    }
  );

  next();
};
