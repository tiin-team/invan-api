const fp = require('fastify-plugin');

module.exports = fp((instance, _, next) => {
  const version = '2.0.0'

  /**
   * 
   * @param {import('fastify').FastifyRequest} request 
   * @param {import('fastify').FastifyReply} reply 
   * @param {*} user 
   * @returns 
   */
  const createFinanceAccount = async (request, reply, user) => {
    try {
      const body = request.body
      body.organization = user.organization
      body.created_by = user.name
      body.created_by_id = user._id

      const res = await instance.financeAccount.create(request.body)

      return reply.ok({ _id: res._id })
    } catch (error) {
      instance.log.error(error.message)

      return reply.error(error)
    }

    return reply
  }

  /**
   * 
   * @param {import('fastify').FastifyRequest} request 
   * @param {import('fastify').FastifyReply} reply 
   * @param {*} user 
   * @returns 
   */
  const getFinanceAccount = async (request, reply, user) => {
    try {
      const id = request.params.id

      const res = await instance.financeAccount
        .findById(
          {
            _id: id,
            organization: user.organization,
            deleted_at: null,
          },
          {
            deleted_at: 0,
            deleted_by: 0,
            deleted_by_id: 0,
          },
        )
        .lean()

      return reply.ok(res)
    } catch (error) {
      instance.log.error(error.message)

      return reply.error(error)
    }

    return reply;
  }

  /**
 * 
 * @param {import('fastify').FastifyRequest} request 
 * @param {import('fastify').FastifyReply} reply 
 * @param {*} user 
 * @returns 
 */
  const getFinanceAccounts = async (request, reply, user) => {
    try {
      const limit = Number.isFinite(request.query.limit)
        ? parseInt(request.query.limit)
        : 10

      const page = Number.isFinite(request.query.page) && request.query.page > 1
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

      const res = await instance.financeAccount
        .find(
          query,
          {
            deleted_at: 0,
            deleted_by: 0,
            deleted_by_id: 0,
          },
        )
        .limit(limit)
        .skip((page - 1) * limit)
        .lean()

      const total = await instance.financeAccount.countDocuments(query)

      return reply.ok({
        data: res.map(r => {
          r.name
        }),
        limit: limit,
        current_page: page,
        page: Math.ceil(total / limit),
        total: total,
      })
    } catch (error) {
      instance.log.error(error.message)

      return reply.error(error)
    }

    return reply;
  }

  /**
   * 
   * @param {import('fastify').FastifyRequest<,,,,{ name: string, balance: number }>} request 
   * @param {import('fastify').FastifyReply} reply 
   * @param {*} user 
   * @returns 
   */
  const findByIdAndUpdateFinanceAccount = async (request, reply, user) => {
    try {
      const id = request.params.id
      const body = request.body

      const query = {
        _id: id,
        organization: user.organization,
        deleted_at: null,
      }
      const account = await instance.financeAccount
        .findOne(
          query,
          { _id: 1, balance: 1 },
        )
        .lean()

      if (!account) {
        return reply.fourorfour('Finance account')
      }

      const res = await instance.financeAccount.findOneAndUpdate(
        query,
        {
          $set: {
            name: body.name,
            balance: body.balance,
          },
        },
        { lean: true, new: true },
      )

      return reply.ok({ _id: res._id })
    } catch (error) {
      instance.log.error(error)

      return reply.error('something went wrong')
    }

    return reply;
  }

  /**
 * 
 * @param {import('fastify').FastifyRequest} request 
 * @param {import('fastify').FastifyReply} reply 
 * @param {*} user 
 * @returns 
 */
  const findAndDeleteManyFinanceAccount = async (request, reply, user) => {
    try {
      const ids = request.body.ids

      const query = {
        _id: { $in: ids },
        organization: user.organization,
        deleted_at: null,
      }

      const accounts = await instance.financeAccount
        .find(query, { _id: 1 })
        .lean()

      if (!accounts || accounts.length != ids.length) {
        return reply.fourorfour('Finance accounts')
      }

      await instance.financeAccount.updateMany(
        query,
        {
          $set: {
            deleted_by: user.name,
            deleted_by_id: user._id,
            deleted_at: new Date(),
          },
        },
        { lean: true, new: true },
      )

      return reply.ok('OK')
    } catch (error) {
      instance.log.error(error)

      return reply.error('something went wrong')
    }

    return reply;
  }

  instance.post('/finance/account', {
    version: version,
    schema: {
      body: {
        type: 'object',
        required: [
          'name',
        ],
        properties: {
          name: { type: 'string', minLength: 1, },
          balance: { type: 'number', default: 0 },
        },
      },
    },
  }, (request, reply) => {
    instance.authorization(request, reply, (user) => {

      createFinanceAccount(request, reply, user)

      return reply
    });
  })

  instance.get('/finance/account/:id', {
    version: version,
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: {
            type: 'string',
            minLength: 24,
            maxLength: 24,
          },
        },
      },
    },
  }, (request, reply) => {
    instance.authorization(request, reply, async (user) => {

      getFinanceAccount(request, reply, user)

      return reply
    });
  })

  instance.get('/finance/account', {
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
    },
  }, (request, reply) => {
    instance.authorization(request, reply, async (user) => {

      getFinanceAccounts(request, reply, user)

      return reply
    });
  })

  instance.put('/finance/account/:id', {
    version: version,
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: {
            type: 'string',
            minLength: 24,
            maxLength: 24,
          },
        },
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, },
          balance: { type: 'number', },
        },
      },
    },
  }, (request, reply) => {
    instance.authorization(request, reply, async (user) => {

      findByIdAndUpdateFinanceAccount(request, reply, user)

      return reply;
    });
  })

  instance.delete('/finance/account/:id', {
    version: version,
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: {
            type: 'string',
            minLength: 24,
            maxLength: 24,
          },
        },
      },
    },
  }, (request, reply) => {
    instance.authorization(request, reply, async (user) => {

      findByIdAndDeleteFinanceAccount(request, reply, user)

      return reply
    });
  })

  instance.delete('/finance/account', {
    version: version,
    schema: {
      body: {
        type: 'object',
        required: ['ids'],
        properties: {
          ids: {
            items: {
              type: 'string'
            },
          },
        },
      },
    },
  }, (request, reply) => {
    instance.authorization(request, reply, async (user) => {

      findAndDeleteManyFinanceAccount(request, reply, user)

      return reply
    });
  })

  next()
})
