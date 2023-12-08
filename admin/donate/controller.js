const fp = require('fastify-plugin');

module.exports = fp((instance, _, next) => {
  const version = '2.0.0'

  /**
 * 
 * @param {import('fastify').FastifyRequest} request 
 * @param {import('fastify').FastifyReply} reply 
 * @param {{ organization: string }} user 
 * @returns 
 */
  const getLastDonates = async (request, reply, user) => {
    try {
      const limit = Number.isFinite(Number(request.query.limit))
        ? parseInt(request.query.limit)
        : 10

      const page = Number.isFinite(Number(request.query.page)) && request.query.page > 1
        ? parseInt(request.query.page)
        : 1

      const search = request.query.search

      const query = {
        organization: user.organization,
        deleted_at: null,
      }

      if (search) {
        query.name = { $regex: search, $options: "i" }
      }

      const $match = {
        $match: query
      }

      const $group = {
        $group: {
          _id: '$organization',
          total_donate: { $sum: '$total_donate' },
          total_count: { $sum: 1 },
        }
      }
      const total = await instance.UsersDonate.aggregate([$match, $group]).exec()

      const res = await instance.UsersDonate
        .find(
          query,
          {
            deleted_at: 0,
            deleted_by: 0,
            deleted_by_id: 0,
          },
        )
        .sort({ _id: -1 })
        .limit(limit)
        .skip((page - 1) * limit)
        .lean()

      // const total = await instance.financeAccount.countDocuments(query)

      if (!total[0])
        return reply.error('error while calculate')

      return reply.ok({
        data: res,
        limit: limit,
        current_page: page,
        total_page: Math.ceil(total[0].total_count / limit),
        total_donate: total[0].total_donate,
        total_count: total[0].total_count,
      })
    } catch (error) {
      instance.log.error(error.message)

      return reply.error(error)
    }

    return reply;
  }

  instance.get('/donate/:organization/:whom', {
    version: version,
    schema: {
      querystring: {
        limit: {
          type: 'number',
          minLength: 5,
          maxLength: 100,
          default: 10,
        },
        page: {
          type: 'number',
          minLength: 1,
          default: 1,
        },
      },
      params: {
        organization: {
          type: 'string',
          minLength: 24,
          maxLength: 24,
        },
        whom: {
          type: 'string',
          default: 'turkey',
        }
      }
    },
  }, (request, reply) => {
    // instance.authorization(request, reply, async (user) => {

    const organization = request.params.organization

    getLastDonates(request, reply, { organization: organization })

    return reply
    // });
  })


  next()
})
