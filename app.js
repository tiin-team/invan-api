'use strict'

require('dotenv').config()
const path = require('path')
const AutoLoad = require('fastify-autoload')
const Cors = require('fastify-cors')
console.log('app.js running');
module.exports = function (fastify, opts, next) {

  const options = {
    version: { version: '1.0.0' },
    reports_schema: {
      schema: {
        params: {
          type: 'object',
          properties: {
            limit: { type: 'number', minimum: 1 },
            page: { type: 'number', minimum: 1 },
            min: { type: 'number', maximum: 100000000000000, minimum: 0 },
            max: { type: 'number', maximum: 100000000000000, minimum: 0 }
          }
        }
      }
    }
  }

  fastify.register(Cors, { origin: true })

  fastify.register(require('fastify-file-upload'))
  fastify.register(require('fastify-static'), {
    root: path.join(__dirname, 'static'),
    prefix: '/static/'
  })

  // fastify.register(require('fastify-socket.io'))

  // fastify.register(AutoLoad, {
  //   dir: path.join(__dirname, 'socket/connect-test'),
  //   options: Object.assign(options, opts)
  // })

  fastify.register(require('fastify-graceful-shutdown'))

  fastify.after(() => {
    fastify.gracefulShutdown((signal, next) => {
      console.log('Upps!')
      next()
    })
  })

  fastify.register(require('./clickhouse/decorator'), {
    url: 'http://localhost',
    port: 8123,
    debug: false,
    basicAuth: { username: '', password: '' },
    isUseGzip: false,
    format: 'json', // "json" || "csv" || "tsv"
    config: {
      // session_id: 'session_id if neeed',
      session_timeout: 60,
      output_format_json_quote_64bit_integers: 0,
      enable_http_compression: 0,
      database: 'INVAN',
    },
    // debug: true,
  });

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
    dir: path.join(__dirname, 'admin/reports'),
    options: Object.assign(options, opts)
  })

  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'admin/kpi'),
    options: Object.assign(options, opts)
  })

  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'admin/partiation/routes'),
    options: Object.assign(options, opts)
  })

  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'admin/partiation/services'),
    options: Object.assign(options, opts)
  })

  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'admin/releases'),
    options: Object.assign(options, opts)
  })

  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'admin/employees'),
    options: Object.assign(options, opts)
  })

  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'admin/donate'),
    options: Object.assign(options, opts)
  })

  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'admin/invan-telegram/bot'),
    options: Object.assign(options, opts)
  })

  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'admin/invan-telegram/chat'),
    options: Object.assign(options, opts)
  })

  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'admin/customers'),
    options: Object.assign(options, opts)
  })

  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'admin/settings'),
    options: Object.assign(options, opts)
  })

  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'admin/general'),
    options: Object.assign(options, opts)
  })

  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'admin/inventory'),
    options: Object.assign(options, opts)
  })

  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'admin/workgroup-order'),
    options: Object.assign(options, opts)
  })

  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'admin/workgroup-informations'),
    options: Object.assign(options, opts)
  })

  // fastify.register(AutoLoad, {
  //   dir: path.join(__dirname, 'admin/files'),
  //   options: Object.assign(options, opts)
  // })

  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'admin/items/items'),
    options: Object.assign(options, opts)
  })

  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'admin/items/crud'),
    options: Object.assign(options, opts)
  })

  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'admin/items/category'),
    options: Object.assign(options, opts)
  })

  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'admin/items/tech_map'),
    options: Object.assign(options, opts)
  })

  // bos
  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'bos'),
    options: Object.assign(options, opts)
  })

  // cash-back
  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'cash-back'),
    options: Object.assign(options, opts)
  })
  // employee

  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'employee/general'),
    options: Object.assign(options, opts)
  })

  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'employee/orders'),
    options: Object.assign(options, opts)
  })

  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'employee/receipts'),
    options: Object.assign(options, opts)
  })

  // feedback
  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'feedback'),
    options: Object.assign(options, opts)
  })

  // pos helpers
  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'pos/receipts'),
    options: Object.assign(options, opts)
  })

  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'pos/items'),
    options: Object.assign(options, opts)
  })

  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'pos/orders'),
    options: Object.assign(options, opts)
  })

  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'pos/workgroup'),
    options: Object.assign(options, opts)
  })

  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'pos/workgroup_order-informations'),
    options: Object.assign(options, opts)
  })

  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'pos/task'),
    options: Object.assign(options, opts)
  })

  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'translator'),
    options: Object.assign(options, opts)
  })

  // petronet
  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'petronet'),
    options: Object.assign(options, opts)
  })

  next()
}
