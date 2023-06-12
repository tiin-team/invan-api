const fp = require('fastify-plugin');

module.exports = fp((instance, options, next) => {
  const version = { version: '2.0.0' };
  const tiinOrganizationId = ''

  async function findClient(search) {
    search = search.replace('+', '')

    const query = {
      organization_id: '5f5641e8dce4e706c062837a',
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
      .findOne(
        query,
        {
          cartameId: '$cartame_id',
          firstName: '$first_name',
          lastName: '$last_name',
          phoneNumber: '$phone_number',
          pointBalance: '$point_balance'
        }
      )
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
          }
        }
      },
    },
    (request, reply) => {
      instance.authorization_cartaMe(request, reply, async () => {
        try {
          const body = request.body

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
            email: '',
            phone_number: body.phoneNumber,
            note: 'Added by cartaMe',
          })

          return reply.ok({ _id: res._id })
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
  //     instance.authorization_cartaMe(request, reply, async () => {
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
      instance.authorization_cartaMe(request, reply, async () => {
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
          required: [],
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
      instance.authorization_cartaMe(request, reply, async () => {
        try {
          const body = request.body;

          let client = await findClient(body.phoneNumber)

          if (!client) {
            return reply.fourorfour('Client')
          }

          client = await instance.clientsDatabase.findOneAndUpdate(
            { phone_number: body.phoneNumber },
            data,
            {
              lean: true,
              new: true,
              projection: {
                cartameId: '$cartame_id',
                firstName: '$first_name',
                lastName: '$last_name',
                phoneNumber: '$phone_number',
                pointBalance: '$point_balance'
              }
            },
          )

          return reply.ok(client);
        } catch (error) {
          instance.log.error(error.message)
          return reply.error(error.message);
        }

      });
    }
  );

  next();
});
