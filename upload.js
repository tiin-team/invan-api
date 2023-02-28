
'use strict'

require('dotenv').config()
const path = require('path')
const AutoLoad = require('fastify-autoload')
const Cors = require('fastify-cors')
const options = {
    version: { version: '1.0.0' },
}

module.exports = function (fastify, opts, next) {

    fastify.register(Cors, {
        origin: true
    })

    fastify.register(require('fastify-file-upload'))
    fastify.register(require('fastify-static'), {
        root: path.join(__dirname, 'static'),
        prefix: '/static/'
    })

    fastify.register(AutoLoad, {
        dir: path.join(__dirname, 'plugins'),
        options: Object.assign(options, opts)
    })

    fastify.register(AutoLoad, {
        dir: path.join(__dirname, 'user'),
        options: Object.assign(options, opts)
    })

    fastify.register(AutoLoad, {
        dir: path.join(__dirname, 'services'),
        options: Object.assign(options, opts)
    })

    fastify.register(AutoLoad, {
        dir: path.join(__dirname, 'admin/items/items'),
        options: Object.assign(options, opts)
    })

    fastify.register(AutoLoad, {
        dir: path.join(__dirname, 'admin/items/crud'),
        options: Object.assign(options, opts)
    })

    fastify.register(AutoLoad, {
        dir: path.join(__dirname, 'translator'),
        options: Object.assign(options, opts)
    })

    next()
}
