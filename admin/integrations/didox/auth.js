const fp = require('fastify-plugin')
const axios = require("axios");

module.exports = fp(function (fastify, opts, next) {
  fastify.decorate('didoxGetToken', async (didoxINN, didoxPassword) => {
    try {
      const res = await axios.default.post(
        `https://api.didox.uz/v1/auth/${didoxINN}/password/uz)`,
        { password: didoxPassword },
      )

      return {
        success: true,
        data: res.data.token,
        error: null,
      }
    } catch (err) {
      return {
        success: false,
        data: null,
        error: err,
      }
    }
  })

  next()
})
