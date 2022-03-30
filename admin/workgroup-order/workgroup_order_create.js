
const createWorkgroupOrder = async (request, reply, instance) => {
  const body = request.body;
  const user = request.user;
  const service_id = body.service;
  if (!service_id) {
    return reply.fourorfour('Service')
  }

  const service = await instance.services.findById(service_id);
  if (!service) {
    return reply.fourorfour('Service')
  }
  body.organization = user.organization
  body.service = service_id

  // const client_id = body.client_id;
  // const client = await instance.clientsDatabase.findById(client_id);
  // if (!client) {
  //   return reply.fourorfour('Client')
  // }

  // body.client_name = client.first_name;
  // body.client_unique_id = client.user_id
  try {

    const item = await instance.goodsSales.findById(body.item_id);
    if (!item) {
      return reply.fourorfour('Item')
    }
    body.item_id = item._id;
    if (item.item_type == 'variant') {
      body.item_name = `${item.parent_name}(${item.name})`;
    }
    else {
      body.item_name = item.name;
    }
    body.title = body.item_name;

    for (const index in body.workgroups) {
      const id = body.workgroups[index]
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
      if (item.item_type == 'variant') {
        item.name = `${item.parent_name} ( ${item.name} )`
      }
      body.items[index].product_name = item.name
      body.items[index].used_quantities = []
      body.items[index].created_by = user._id;
      body.items[index].created_from = 'admin';
      body.items[index].is_track_stock = item.is_track_stock;
    }

    body.createdBy = user._id;
    body.createdByName = user.name;
    if (body.state == 'draft') {
      body.state = 'draft';
    }
    else {
      body.current_workgroup = body.workgroups[0];
      body.state = 'pending';
    }
    const { _id: id } = await instance.WorkgroupOrder.saveWorkgroupOrder(body);
    // await instance.createWorkgroupShift(id, body);
    reply.ok({ id: id })
  } catch (error) {
    reply.error(error.message)
  }
}

module.exports = ((instance, _, next) => {

  const workgroupOrderCreateSchema = {
    body: {
      type: 'object',
      additionalProperties: false,
      required: [
        'service', 'items',
        'comment', 'priority',
        'workgroups', 'item_id'
      ],
      properties: {
        state: {
          type: 'string'
        },
        service: {
          type: 'string',
          minLength: 24,
          maxLength: 24
        },
        item_id: {
          type: 'string',
          minLength: 24,
          maxLength: 24
        },
        title: {
          type: 'string',
          default: ''
        },
        comment: {
          type: 'string',
          maxLength: 50
        },
        info: {
          type: 'object'
        },
        priority: {
          type: 'string',
          enum: [
            'urgent', 'normal', 'low'
          ]
        },
        workgroups: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'string',
            minLength: 24,
            maxLength: 24
          }
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
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: [
              'product_id'
            ],
            properties: {
              product_id: {
                type: 'string',
                minLength: 24,
                maxLength: 24
              },
              quantity: {
                type: 'number',
                minimum: 0,
                default: 0
              },
              cost: {
                type: 'number',
                minimum: 0,
                default: 0
              }
            }
          }
        }
      }
    }
  }

  instance.post(
    '/workgroup/order/create',
    {
      version: '1.0.0',
      schema: workgroupOrderCreateSchema,
      preValidation: instance.authorize_admin,
      attachValidation: true
    },
    async (request, reply) => {
      if (request.validationError) {
        return reply.validation(request.validationError.message)
      }
      createWorkgroupOrder(request, reply, instance)
      return reply;
    }
  )

  next()
})
