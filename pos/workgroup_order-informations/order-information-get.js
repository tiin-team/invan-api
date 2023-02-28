const orderInformationGet = async function (request, reply, instance) {
  try {
    const user = request.user;
    if (!user.workgroup_id) {
      return reply.response(403, "workgroup is not activated to user");
    }

    const workgroup = await instance.Workgroup.findById(user.workgroup_id);
    if (!workgroup) {
      return reply.fourorfour("workgroup");
    }
    const { workgroup_order_id: workgroup_order_id } = request.body;
    const workgroupOrder = await instance.WorkgroupOrder.findById(
      workgroup_order_id
    );
    if (!workgroupOrder) {
      return reply.fourorfour("workgroupOrder");
    }

    const info = await instance.WorkgroupOrderInformation.aggregate([
      {
        $match: {
          organization: user.organization,
          workgroup_order_id: workgroupOrder._id,
        },
      },
      {
        $unwind: {
          path: "$info_list",
        },
      },
      {
        $match: {
          "info_list.workgroup_id": workgroup._id,
        },
      },
      {
        $group: {
          _id: "$_id",
          info_list: {
            $push: {
              date: "$info_list.date",
              value: "$info_list",
            },
          },
        },
      },
    ]).allowDiskUse(true);

    if (!info || info.length == 0) {
      return reply.ok([]);
    }
    const info_list = [];
    
    for (const inf of info[0].info_list) {
      const o_inf = {
        date: inf.date,
        IsComplete: inf.value['IsComplete'] == 'true',
        value: {
          // date: inf.date,
          // workgroup_id: inf.value['workgroup_id'],
        }
      };
      for (const k of workgroup.order_info) {
        o_inf.value[k.text] = inf.value[k.text];
      }
      info_list.push(o_inf);
    }
    reply.ok(info_list);
  } catch (error) {
    reply.error(error.message);
  }
};

module.exports = (instance, _, next) => {
  const orderInformationGetSchema = {
    body: {
      type: "object",
      required: ["workgroup_order_id"],
      properties: {
        workgroup_order_id: {
          type: "string",
          minLength: 24,
          maxLength: 24,
        },
      },
    },
  };

  instance.post(
    "/workgroup_order/order-information/get",
    {
      version: "1.0.0",
      preValidation: [instance.authorize_employee],
      schema: orderInformationGetSchema,
    },
    async (request, reply) => {
      orderInformationGet(request, reply, instance);
      return reply;
    }
  );

  next();
};
