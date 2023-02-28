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
  const createFinanceCategory = async (request, reply, user) => {
    try {
      const body = request.body
      body.organization = user.organization
      body.created_by = user.name
      body.created_by_id = user._id

      if (body.disbursement == body.income)
        return reply.error('disbursement and income must not equal')

      const res = await instance.financeCategory.create(request.body)

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
  const getFinanceCategory = async (request, reply, user) => {
    try {
      const id = request.params.id

      const res = await instance.financeCategory
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
  const getFinanceCategories = async (request, reply, user) => {
    try {
      const limit = Number.isFinite(parseInt(request.query.limit))
        ? parseInt(request.query.limit)
        : 10

      const page = Number.isFinite(parseInt(request.query.page)) && request.query.page > 1
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

      const res = await instance.financeCategory
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

      const total = await instance.financeCategory.countDocuments(query)

      const notDeletableAccounts = ['fees', 'company_to_fees', 'one_time_fees', 'salary']

      return reply.ok({
        data: res.map(r => {
          r.is_deletable = notDeletableAccounts.some(name => name == r.name)
          return r
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
   * @param {import('fastify').FastifyRequest} request 
   * @param {import('fastify').FastifyReply} reply 
   * @param {*} user 
   * @returns 
   */
  const findByIdAndUpdateFinanceCategory = async (request, reply, user) => {
    try {
      const id = request.params.id
      const body = request.body

      const cat = await instance.financeCategory
        .findOne({ _id: id, organization: user.organization, }, { _id: 1 })
        .lean()

      if (!cat) {
        return reply.fourorfour('Finance category')
      }

      const res = await instance.financeCategory.findOneAndUpdate(
        {
          _id: cat._id,
          organization: user.organization,
        },
        {
          $set: {
            name: body.name,
            disbursement: body.disbursement,
            income: body.income,
            is_active: body.is_active,
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
  const findAndDeleteManyFinanceCategory = async (request, reply, user) => {
    try {
      const ids = request.body.ids

      const query = {
        _id: { $in: ids },
        organization: user.organization,
      }

      const cats = await instance.financeCategory
        .find(query, { _id: 1 })
        .lean()

      if (!cats || cats.length != ids.length) {
        return reply.fourorfour('Finance categories')
      }

      await instance.financeCategory.updateMany(
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

  instance.post('/finance/category', {
    version: version,
    schema: {
      body: {
        type: 'object',
        required: [
          'name',
          'is_active',
        ],
        properties: {
          name: { type: 'string', minLength: 3, },
          is_active: { type: 'boolean' },
        },
      },
    },
  }, (request, reply) => {
    instance.authorization(request, reply, (user) => {

      createFinanceCategory(request, reply, user)

      return reply
    });
  })

  instance.get('/finance/category/:id', {
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

      getFinanceCategory(request, reply, user)

      return reply
    });
  })

  instance.get('/finance/category', {
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

      getFinanceCategories(request, reply, user)

      return reply
    });
  })

  instance.put('/finance/category/:id', {
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
        required: [
          'name',
          'is_active',
        ],
        properties: {
          name: { type: 'string', minLength: 3, },
          is_active: { type: 'boolean' },
        },
      },
    },
  }, (request, reply) => {
    instance.authorization(request, reply, async (user) => {

      findByIdAndUpdateFinanceCategory(request, reply, user)

      return reply;
    });
  })

  instance.delete('/finance/category/:id', {
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

      request.body.ids = [request.params.id]

      findAndDeleteManyFinanceCategory(request, reply, user)

      return reply
    });
  })

  instance.delete('/finance/category', {
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

      findAndDeleteManyFinanceCategory(request, reply, user)

      return reply
    });
  })

  next()
})
/** 
* Paste one or more documents here
*/