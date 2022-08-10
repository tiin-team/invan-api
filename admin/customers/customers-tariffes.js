const fp = require("fastify-plugin");

module.exports = fp((instance, options, next) => {
  const version = { version: '2.0.0' }

  const create_tariff = async (request, reply, user) => {
    const body = request.body
    const tariff = await instance.clientstariffes
      .findOne({
        organization: user.organization,
        name: body.name,
      })
      .lean()

    if (tariff) {
      return instance.allready_exist(reply);
    }

    body.organization = user.organization

    const new_tariff = await new instance.clientstariffes(body).save();
    reply.ok(new_tariff)
  }

  instance.post("/tariffes/create", version, (request, reply) => {
    instance.authorization(request, reply, (user) => {
      create_tariff(request, reply, user);
    });
  })

  instance.get("/tariffes/get/", version, (request, reply) => {
    instance.authorization(request, reply, async (user) => {
      const limit = !isNaN(parseInt(request.query.limit))
        ? parseInt(request.query.limit)
        : 10

      const page = !isNaN(parseInt(request.query.page))
        ? parseInt(request.query.page)
        : 1
      const filter_query = { organization: user.organization, }
      const data = await instance.clientstariffes
        .find(filter_query)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()

      const total = await instance.clientstariffes.countDocuments(filter_query)

      reply.ok({
        limit: limit,
        current_page: page,
        total: total,
        page: Math.ceil(total / limit),
        data: data,
      })
    });
  })

  async function update_tariff(request, reply, user) {
    try {
      const id = request.params.id;
      const body = request.body;
      const tariff = await instance.clientstariffes
        .findOne({ _id: id })
        .lean();
      if (!tariff) {
        return reply.fourorfour("Tariff");
      }

      await instance.clientstariffes.updateOne({ _id: id }, { $set: body });
      return reply.ok({ id });
    } catch (error) {
      return reply.error(error.message);
    }
  }

  const updateHandler = (request, reply) => {
    if (request.validationError) {
      return reply.validation(request.validationError.message);
    }
    instance.authorization(request, reply, (user) => {
      return update_tariff(request, reply, user);
    });
  };

  const tariffSchema = {
    schema: {
      body: {
        type: "object",
        additionalProperties: false,
        required: ["name", "percentage"],
        properties: {
          organization: {
            type: "string",
            minLength: 24,
            maxLength: 24
          },
          percentage: {
            type: "number",
            default: 1,
          },
          name: { type: "string" },
        },
      },
    },
    attachValidation: true,
  };

  instance.post(
    "/tariffes/update/:id",
    { ...version, ...tariffSchema },
    updateHandler
  );

  async function delete_tariffes(request, reply, user) {
    try {
      await instance.clientsDatabase.deleteMany({
        organization: user.organization,
        _id: { $in: request.body.indexes },
      });
      return reply.ok();
    } catch (error) {
      instance.send_Error("deleting tariffes", JSON.stringify(error));
      return reply.error("Error on deleting");
    }
  }

  instance.delete("/tariffes/delete_group", version, (request, reply) => {
    instance.authorization(request, reply, (user) => {
      return delete_tariffes(request, reply, user);
    });
  });

  const findOneById = async (request, reply, user) => {

    const tariff = await instance.clientstariffes
      .findById(request.params.id)
      .lean()

    reply.ok(tariff)
  }

  instance.get("/tariffes/get/:id", version, (request, reply) => {
    instance.authorization(request, reply, (user) => {
      findOneById(request, reply, user);
    });
  });

  next();
});
