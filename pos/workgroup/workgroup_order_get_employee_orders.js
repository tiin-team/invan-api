
const workgroupOrderGet = async (request, reply, instance) => {
  try {
    const user = request.user;
    const { limit, page, state } = request.body;
    const service_id = request.headers['accept-service'];
    if (!service_id) {
      return reply.fourorfour('Service')
    }
    const service = await instance.services.findById(service_id);
    if (!service) {
      return reply.fourorfour('Service')
    }
    const query = {
      organization: user.organization,
      service: service_id,
      workgroups: user.workgroup_id,
      state: {
        $nin: [
          'draft', 'rejected', 'cancelled'
        ]
      }
    }
    switch (state) {
      case 'to_do': {
        // query['employees.employee_id'] = {
        //   $ne: user._id
        // }

        query['$or'] = [
          {
            "employees.0": {
              $exists: false
            },
            "workgroups.0": {
              $eq: user.workgroup_id
            }
          },
          {
            "employees.0": {
              $exists: true
            },
            "employees.employee_id": {
              $ne: user._id
            },
            "employees.workgroup_id": {
              $ne: user.workgroup_id
            }
          }
        ]
        break;
      }
      default: {
        query.employees = {
          $elemMatch: {
            employee_id: user._id,
            state: state
          }
        }
      }
    }

    const workgroupMatch = {
      $match: query
    }

    const workgroupSort = {
      $sort: {
        createdAt: -1
      }
    }
    const workgroupSkip = {
      $skip: limit * (page - 1)
    }
    const workgroupLimit = {
      $limit: limit
    }

    const workgroupLookupItem = {
      $lookup: {
        from: 'goodssales',
        localField: 'item_id',
        foreignField: '_id',
        as: 'products'
      }
    }

    const workgroupProject = {
      $project: {
        title: 1,
        comment: 1,
        priority: 1,
        order_number: 1,
        createdAt: 1,
        updatedAt: 1,
        in_stock: 1,
        sold_by: {
          $cond: {
            if: {
              $gt: [
                {
                  $size: '$products'
                },
                0
              ]
            },
            then: {
              $arrayElemAt: [
                '$products.sold_by', 0
              ]
            },
            else: 'each'
          }
        }
      }
    }

    const pipeline = [
      workgroupMatch,
      workgroupSort,
    ];

    // if (state != 'to_do') {
    pipeline.push(workgroupSkip);
    pipeline.push(workgroupLimit);
    pipeline.push(workgroupLookupItem);
    pipeline.push(workgroupProject);
    // }

    let workgroupOrders = await instance.WorkgroupOrder.aggregate(pipeline)
      .allowDiskUse(true)
      .exec();
    /*
    if (state == 'to_do') {
      const workgroup_orders = [];
      for (const w of workgroupOrders) {
        let user_position_index = 1;
        let before_doing = false;
        try {
          const positionMap = {}
          for (const wp of w.workgroup_positions) {
            if (wp.workgroup_id + '' == user.workgroup_id + '') {
              user_position_index = wp.position_index;
            }
            positionMap[wp.workgroup_id + ''] = wp.position_index;
          }
          const employee_workgroups = [];
          const done_w_ids = [];
          for (const e of w.employees) {
            done_w_ids.push(e.workgroup_id + '');
            employee_workgroups.push(e.workgroup_id + '')
            if (
              positionMap[e.workgroup_id + '']
              && user_position_index > positionMap[e.workgroup_id + '']
              && e.state != 'done'
            ) {
              before_doing = true;
            }
          }

          for (const wg of w.workgroups) {
            if (employee_workgroups.includes(wg + '')) {
              continue;
            }
            
            if (positionMap[wg + ''] && user_position_index > positionMap[wg + '']) {
              before_doing = true;
            }
          }

          if (!before_doing) {
            workgroup_orders.push({
              _id: w._id,
              title: w.title,
              comment: w.comment,
              priority: w.priority,
              order_number: w.order_number,
              createdAt: w.createdAt,
              updatedAt: w.updatedAt
            })
          }
        }
        catch (error) {
          console.log(error.message)
        }
      }

      workgroupOrders = workgroup_orders
    }*/

    reply.ok(workgroupOrders)
  } catch (error) {
    reply.error(error.message)
  }
  return reply;
}

module.exports = ((instance, _, next) => {

  const workgroupOrderGetSchema = {
    body: {
      type: 'object',
      required: [
        'limit', 'page', 'state'
      ],
      properties: {
        limit: {
          type: 'integer',
          minimum: 1
        },
        page: {
          type: 'integer',
          minimum: 1
        },
        state: {
          type: 'string',
          enum: ['to_do', 'doing', 'done']
        }
      }
    }
  }

  instance.post(
    '/workgroup/order/get',
    {
      schema: workgroupOrderGetSchema,
      preValidation: [instance.authorize_employee],
      version: '1.0.0',
      attachValidation: true
    },
    async (request, reply) => {
      if (request.validationError) {
        return reply.validation(request.validationError.message)
      }
      workgroupOrderGet(request, reply, instance)
      return reply;
    }
  )

  next()
})
