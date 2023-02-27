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
  const getTimeCardBot = async (request, reply, user) => {
    try {
      const res = await instance.invanBot
        .findOne(
          {
            use_for: 'timecard',
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

      if (!res) {
        return reply.fourorfour('Timecard bot')
      }

      const chats = await instance.invanTGChat
        .find(
          {
            use_for: 'timecard',
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

      res.chats = chats

      return reply.ok(res)
    } catch (error) {
      instance.log.error(error.message)

      return reply.error(error)
    }

    return reply;
  }

  instance.get('/invan-telegram/bot/for_timecard', {
    version: version,
  }, (request, reply) => {
    instance.authorization(request, reply, async (user) => {

      getTimeCardBot(request, reply, user)

      return reply
    });
  })

  next()
})
