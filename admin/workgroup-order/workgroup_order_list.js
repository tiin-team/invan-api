
const workgroupOrderListHanler = async (request, reply, instance) => {
  try {
    let { workgroup_id } = request.body;
    const user = request.user;
    workgroup_id = workgroup_id == 'undefined' ? undefined : workgroup_id;
    
    let query = {
      workgroups: workgroup_id,
      state: {
        $nin: ['complete_confirmed', 'draft', 'completed', 'rejected', 'cancelled']
      }
    }
    if(!workgroup_id) {
      query = {
        state: {
          $in: ['complete_confirmed', 'draft', 'completed', 'rejected', 'cancelled']
        }
      }
    }

    const total = await instance.WorkgroupOrder.countDocuments({
      ...query,
      organization: user.organization
    });
    const workgroup_orders = await instance.WorkgroupOrder.getWorkgroupOrderList(request.body, user);

    reply.ok({
      total: total,
      workgroup_orders: workgroup_orders
    })
  } catch (error) {
    reply.error(error.message)
  }
  return reply;
}

module.exports = ((instance, _, next) => {

  const workgroupOrderListSchema = {
    body: {
      type: 'object',
      required: [
        'workgroup_id',
        'limit', 'page'
      ],
      properties: {
        workgroup_id: {
          oneOf: [
            {
              type: 'string',
              enum: ['undefined']
            },
            {
              type: 'string',
              minLength: 24,
              maxLength: 24
            }
          ]
        },
        limit: {
          type: 'integer',
          minimum: 1
        },
        page: {
          type: 'integer',
          minimum: 1
        }
      }
    }
  }

  instance.post(
    '/workgroup/order/list',
    {
      schema: workgroupOrderListSchema,
      version: '1.0.0',
      preValidation: instance.authorize_admin,
      attachValidation: true
    },
    async (request, reply) => {
      if (request.validationError) {
        return reply.validation(request.validationError.message)
      }
      workgroupOrderListHanler(request, reply, instance)
      return reply;
    }
  )

  next()
})
