const fp = require('fastify-plugin');

module.exports = fp((instance, options, next) => {
  const version = { version: '2.0.0' };
  const tiinOrganizationId = '5f5641e8dce4e706c062837a'

  const clientProjection = {
    cartameId: '$cartame_id',
    firstName: '$first_name',
    lastName: '$last_name',
    phoneNumber: '$phone_number',
    pointBalance: '$point_balance',
    gender: '$gender',
    email: '$email',
    birthday: '$birthday',
    city: '$city'
  };

  async function findClient(search) {
    search = search.replace('+', '')

    const query = {
      organization: tiinOrganizationId,
    }

    if (search) {
      query["$or"] = [
        {
          phone_number: search,
        },
        {
          phone_number: `+${search}`,
        },
        {
          cartame_id: search,
        },
      ];
    }

    const client = await instance.clientsDatabase
      .findOne(query, clientProjection)
      .lean(true);

    return client;
  }

  instance.post('/cartame/client',
    {
      ...version,
      schema: {
        body: {
          type: 'object',
          required: ['cartameId', 'firstName', 'lastName', 'phoneNumber'],
          properties: {
            cartameId: {
              type: 'string',
            },
            firstName: {
              type: 'string',
            },
            lastName: {
              type: 'string',
            },
            phoneNumber: {
              type: 'string',
            },
            gender: {
              type: 'string',
              enum: ['male', 'female', 'not_set'],
              default: 'not_set',
            },
            city: { type: 'string', default: '' },
            birthday: { type: 'string', default: '' },
            email: { type: 'string', default: '' },
          }
        }
      },
    },
    (request, reply) => {
      instance.authorizationCartaMe(request, reply, async () => {
        try {
          const body = request.body

          const phoneNumber = body.phoneNumber

          if (!/^\+998[0-9]{9}$/.test(phoneNumber))
            return reply.error('Invalid phoneNumber validation error')

          const client = await findClient(body.phoneNumber)

          if (client) {
            return reply.allready_exist('Client')
          }

          const res = await instance.clientsDatabase.create({
            cartame_id: body.cartameId,
            user_id: `${body.phoneNumber.replace('+', '')}${Date.now()}`,
            organization: tiinOrganizationId,
            first_name: body.firstName,
            last_name: body.lastName,
            email: body.email,
            phone_number: body.phoneNumber,
            note: 'Added by cartaMe',
            city: body.city,
            gender: body.gender,
            birthday: body.birthday,
          })

          return reply.created({ _id: res._id })
        } catch (error) {
          instance.log.error(error.message)
          return reply.server_error();
        }

      });
    }
  );

  // instance.get('/cartame/client',
  //   {
  //     ...version,
  //     schema: {
  //       querystring: {
  //         search: {
  //           type: 'string',
  //           default: '',
  //         }
  //       }
  //     }
  //   },
  //   (request, reply) => {
  //     instance.authorizationCartaMe(request, reply, async () => {
  //       try {
  //         const { search } = request.query

  //         const client = await findClient(search)

  //         if (!client) {
  //           return reply.fourorfour('Client')
  //         }
  //         return reply.ok(client);
  //       } catch (error) {
  //         instance.log.error(error.message)
  //         return reply.server_error();
  //       }

  //     });
  //   }
  // );

  instance.get('/cartame/client/:id',
    {
      ...version,
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: {
              type: 'string',
            },
          }
        }
      }
    },
    (request, reply) => {
      instance.authorizationCartaMe(request, reply, async () => {
        try {
          const id = request.params.id

          const client = await findClient(id)

          if (!client) {
            return reply.fourorfour('Client')
          }
          return reply.ok(client);
        } catch (error) {
          instance.log.error(error.message)
          return reply.error(error.message);
        }

      });
    }
  );

  instance.put('/cartame/client',
    {
      ...version,
      schema: {
        body: {
          type: 'object',
          required: ['phoneNumber', 'cartameId'],
          properties: {
            cartameId: {
              type: 'string',
            },
            phoneNumber: {
              type: 'string',
            },
            firstName: {
              type: 'string',
            },
            lastName: {
              type: 'string',
            },
            gender: {
              type: 'string',
              enum: ['male', 'female', 'not_set'],
            },
          }
        },
      }
    },
    (request, reply) => {
      instance.authorizationCartaMe(request, reply, async () => {
        try {
          const body = request.body;

          let client = await findClient(body.phoneNumber)

          if (!client) {
            return reply.fourorfour('Client')
          }

          client = await instance.clientsDatabase.findByIdAndUpdate(
            client._id,
            {
              cartame_id: body.cartameId,
              // first_name: body.firstName ? body.firstName : client.first_name,
              // last_name: body.lastName ? body.lastName : client.last_name,
              // gender: body.gender ? body.gender : client.gender,
            },
            {
              lean: true,
              new: true,
              projection: clientProjection,
            },
          )

          return reply.ok(client);
        } catch (error) {
          instance.log.error(error.message)
          return reply.allready_exist('Client cartameId')
          // return reply.error(error.message);
        }

      });
    }
  );

  next();
});
