const fp = require('fastify-plugin');

module.exports = fp((instance, options, next) => {
  const version = { version: '2.0.0' };
  const tiinOrganizationId = '5f5641e8dce4e706c062837a'

  const storeProjection = {
    type: '$type',
    name: '$name',
    organizationId: '$organization',
    phoneNumber: '$phone_number',
    address: '$address',
    location: '$location',
    locationName: '$location_name',
    imageUrl: '$image_url',
    workTime: '$work_time',
  };

  async function getAllStores(search, limit = 10, page = 1) {

    const query = {
      organization: tiinOrganizationId,
    }

    if (search) {
      query.name = {
        $regex: search,
        $options: "i",
      };
    }

    const [stores, total] = await Promise.all([
      instance.services
        .find(query, storeProjection)
        .limit(limit)
        .skip((page - 1) * limit)
        .lean(true),
      instance.services.countDocuments(query),
    ]);

    return { data: stores, total: total };
  }

  instance.get('/cartame/store',
    {
      ...version,
      schema: {
        querystring: {
          search: {
            type: 'string',
            default: '',
          },
          limit: {
            type: 'number',
            default: 10,
          },
          page: {
            type: 'number',
            default: 1,
          },
        }
      }
    },
    (request, reply) => {
      instance.authorizationCartaMe(request, reply, async () => {
        try {
          const { search } = request.query

          const limit = !isNaN(parseInt(request.query.limit))
            ? parseInt(request.query.limit)
            : 10
          const page = !isNaN(parseInt(request.query.page))
            ? parseInt(request.query.page)
            : 1

          const res = await getAllStores(search, limit, page)

          return reply.ok(res.data, {
            total: res.total,
            currentPage: page,
            limit: limit,
            pageCount: Math.ceil(res.total / limit),
          });
        } catch (error) {
          instance.log.error(error.message)
          return reply.server_error();
        }
      });
    }
  );

  instance.get('/cartame/store/:id',
    {
      ...version,
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: {
              type: 'string',
              minLength: 24,
              maxLength: 24
            },
          }
        }
      }
    },
    (request, reply) => {
      instance.authorizationCartaMe(request, reply, async () => {
        try {
          const id = request.params.id

          const store = await instance.services
            .findById(request.params.id, storeProjection)
            .lean(true);
          if (!store) {
            return reply.fourorfour('Store')
          }

          return reply.ok(store);
        } catch (error) {
          instance.log.error(error.message)
          return reply.server_error();
        }
      });
    }
  );

  next();
});
