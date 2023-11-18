const fp = require('fastify-plugin')
const axios = require("axios");

module.exports = fp(function (fastify, opts, next) {
  fastify.decorate('didoxGetToken', async () => {
    try {
      const res = await axios.default.post(
        `https://api.didox.uz/v1/auth/${process.env('didoxINN')}/password/uz)`,
        { password: process.env("didoxPassword") },
      )

      return {
        success: true,
        data: res.data.token,
        err: null,
      }
    } catch (err) {
      return {
        success: false,
        data: null,
        err: err,
      }
    }
  })

  next()
})
