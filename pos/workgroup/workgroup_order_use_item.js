
const useWorkgroupOrder = async (request, reply, instance) => {
  try {
    const user = request.user;
    const body = request.body;
    const service_id = request.headers['accept-service']
    const service = await instance.services.findById(service_id)
    
    if (!service) {
      return reply.fourorfour('Service')
    }

    const workgroup_order = await instance.WorkgroupOrder.findById(body.workgroup_order_id);
    if (!workgroup_order) {
      return reply.fourorfour('workgroupOrder')
    }

    // if (workgroup_order.current_employee+'' != user._id+'') {
    //   return reply.response(411, 'workgroup is not activated');
    // }

    const item = await instance.goodsSales.findById(body.product_id)
    if (!item) {
      return reply.fourorfour('Item')
    }

    const items = [];
    let is_exist = false;
    for(const itm of workgroup_order.items) {
      if(itm.product_id == item._id) {
        is_exist = true;
        itm.used_quantities.push({
          quantity: body.quantity,
          residue: body.residue,
          comment: body.comment,
          user_id: user._id
        })
      }
      items.push(itm)
    }

    if(!is_exist) {
      return reply.response(412, 'Item is not in workgroup');
    }
    
    const result = await instance.WorkgroupOrder.useWorkgroupOrderItem(workgroup_order, items)
    if(!result) {
      return reply.error('Could not use item')
    }

    let item_in_stock;
    if(item.services instanceof Array) {
      for(const s of item.services) {
        if(s.service+'' == service._id+'') {
          item_in_stock = s.in_stock;
        }
      }
    }

    if(body.quantity) {
      await instance.goodsSales.updateOne(
        { _id: item._id },
        {
          $inc: {
            "services.$[elem].in_stock": body.quantity*(-1)
          },
          $set: {
            last_updated: new Date().getTime(),
            last_stock_updated: new Date().getTime()
          }
        },
        {
          arrayFilters: [
            {
              "elem.service": {
                "$eq": service._id
              }
            }
          ]
        }
      )

      await new instance.inventoryHistory({
        organization: user.organization,
        service: service._id,
        service_name: service.name,
        date: new Date().getTime(),
        product_id: item._id,
        product_name: item.name,
        employee_id: user._id,
        employee_name: user.name,
        unique: workgroup_order.order_number,
        reason: 'workgroup_order',
        adjustment: body.quantity*(-1),
        stock_after: (+body.quantity)*(-1) + +item_in_stock
      }).save()
    }

    reply.ok()
  } catch (error) {
    reply.error(error.message)
  }
  return reply;
}

module.exports = ((instance, _, next) => {

  const workgroupOrderUseItem = {
    body: {
      type: 'object',
      required: [
        'workgroup_order_id',
        'product_id'
      ],
      properties: {
        workgroup_order_id: {
          type: 'string',
          minLength: 24,
          maxLength: 24
        },
        product_id: {
          type: 'string',
          minLength: 24,
          maxLength: 24
        },
        quantity: {
          type: 'number',
          default: 0
        },
        comment: {
          type: 'string',
          default: ''
        },
        residue: {
          type: 'number',
          default: 0
        }
      }
    }
  }

  instance.post(
    '/workgroup/order/use/item',
    {
      version: '1.0.0',
      schema: workgroupOrderUseItem,
      attachValidation: true,
      preValidation: [instance.authorize_employee]
    },
    async (request, reply) => {
      if(request.validationError) {
        return reply.validation(request.validationError.message)
      }
      useWorkgroupOrder(request, reply, instance)
      return reply;
    }
  )

  next()
})
