const fp = require("fastify-plugin");

module.exports = fp((instance, _, next) => {

const petrolClientSchema = {
    schema: {
      body: {
        type: "object",
        additionalProperties: false,
        required: ["user_id"],
        properties: {
          first_name: { type: "string" },
          last_name: { type: "string" },
          phone_number: { type: "string" },
          comment: { type: "string" },
          note: {
            type: "string"
          },
          user_id: { type: "string" },
        },
      },
    },
    attachValidation: true,
  };

  async function create_petrol_client(request, reply, user) {
    try {
      const customer = await get_client(
        request.body.phone_number,
        user.organization
      );

      if (customer && request.body.phone_number) {
        return reply.code(400).send({ message: "User already exists" })
      }

      request.body.organization = user.organization;
      const created_customer = await insert_new_client(request.body);

      return reply.ok(created_customer);
    } catch (error) {
      if (error.code === -55000) {
        instance.send_Error(error.message, JSON.stringify(error.data));
        if (is_reply) {
          return reply.error(error.message);
        } else {
          return null;
        }
      }
      throw error;
    }
  }

  instance.post(
    "/petrol/client/create",
    { version: "2.0.0", ...petrolClientSchema },
    async (request, reply) => {
      if (request.headers["authorization"] != "KKHUs4zMeQYGndkhvjrXXN") {
        return instance.unauthorized(reply)
      }
      const admin = await instance.User
        .findOne(
          {
            organization: "623fc1a1710dc4e2f01fa304",
            $and: [
              { admin_token: { $exists: true } },
              { admin_token: { $ne: "" } },
            ],
          },
          {
            admin_token: 1,
          },
        )
        .lean()

      request.headers["authorization"] = admin.admin_token;
      request.headers["accept-user"] = "admin";

      instance.authorization(request, reply, (user) => {
        create_petrol_client(request, reply, user);
      })
    }
  );
  
  next();
});
