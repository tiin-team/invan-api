const deviceInformationGet = async function (request, reply, instance) {
  try {
    const user = request.user;
    const { workgroup_order_id, workgroup_id } = request.body;
    const workgroup = await instance.Workgroup.findById(workgroup_id);
    if (!workgroup) {
      return reply.fourorfour("workgroup");
    }

    const workgroupOrder = await instance.WorkgroupOrder.findById(
      workgroup_order_id
    );
    if (!workgroupOrder) {
      return reply.fourorfour("workgroupOrder");
    }

    const info = await instance.WorkgroupAdditionalInformation.aggregate([
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
          _id: null,
          info_list: {
            $push: "$info_list",
          },
        },
      },
    ]).allowDiskUse(true);

    if (!info || info.length == 0) {
      return reply.ok([]);
    }
    reply.ok(info[0].info_list);
  } catch (error) {
    reply.error(error.message);
  }
};

module.exports = (instance, _, next) => {
  const deviceInformationGetSchema = {
    body: {
      type: "object",
      required: ["workgroup_order_id", "workgroup_id"],
      properties: {
        workgroup_order_id: {
          type: "string",
          minLength: 24,
          maxLength: 24,
        },
        workgroup_id: {
          type: "string",
          minLength: 24,
          maxLength: 24,
        },
      },
    },
  };

  instance.post(
    "/workgroup_order/additional-information/get/details",
    {
      version: "1.0.0",
      preValidation: [instance.authorize_admin],
      schema: deviceInformationGetSchema,
    },
    async (request, reply) => {
      deviceInformationGet(request, reply, instance);
      return reply;
    }
  );

  next();
};
