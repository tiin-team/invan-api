'use strict'
const { join } = require('path')
const AutoLoad = require('fastify-autoload')
const fp = require('fastify-plugin')

module.exports = fp(function (fastify, opts, next) {
  fastify.register(AutoLoad, {
    dir: join(__dirname, 'didox'),
    options: Object.assign(options, opts)
  })

  fastify.register(AutoLoad, {
    dir: join(__dirname, 'integration-cartame'),
    options: Object.assign(options, opts)
  })

  next()
})
