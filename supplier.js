
'use strict'

require('dotenv').config()
const path = require('path')
const AutoLoad = require('fastify-autoload')
const Cors = require('fastify-cors')
const options = { version: {} }

module.exports = function (fastify, opts, next) {

    fastify.register(Cors, {
        origin: true
    })

    fastify.register(AutoLoad, {
        dir: path.join(__dirname, 'plugins'),
        options: Object.assign(options, opts)
    })

    fastify.register(AutoLoad, {
        dir: path.join(__dirname, 'supplier'),
        options: Object.assign(options, opts)
    })

    fastify.register(AutoLoad, {
        dir: path.join(__dirname, 'user'),
        options: Object.assign(options, opts)
    })

    fastify.register(AutoLoad, {
        dir: path.join(__dirname, 'admin/inventory'),
        options: Object.assign(options, opts)
    })


    next()
}