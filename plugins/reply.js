const fp = require('fastify-plugin')
const fs = require('fs')

module.exports = fp((instance, _, next) => {

  instance.decorateReply('response', function (code, name, data = undefined) {
    var message = name === 'Ok' ? 'Success' : 'Error: ' + name
    var response = {
      statusCode: name === 'Ok' ? 200 : code,
      error: name,
      message: message
    }
    if (data) {
      response.data = data
    }
    this.send(response)
  })

  instance.decorateReply('ok', function (data = undefined) {
    var response = {
      statusCode: 200,
      error: 'Ok',
      message: 'Success'
    }
    if (data) {
      response.data = data
    }
    this.send(response)
  })

  instance.decorateReply('error', function (name) {
    var response = {
      statusCode: 422,
      error: name,
      message: 'Error: ' + name
    }
    this.send(response)
  })

  instance.decorateReply('validation', function (message) {
    var response = {
      statusCode: 400,
      error: 'Error ' + message,
      message: message
    }
    this.send(response)
  })

  instance.decorateReply('fourorfour', function (name = 'Object') {
    var response = {
      statusCode: 404,
      error: name,
      message: name + ' not found'
    }
    this.send(response)
  })

  instance.decorateReply('invalidmediatype', function () {
    var response = {
      statusCode: 415,
      error: 'Invalid Media Type'
    }
    this.send(response)
  })

  instance.decorateReply('unauth_user', function () {
    this.send({
      statusCode: 498,
      error: "Invalid token",
      message: "Invalid token"
    })
  })

  instance.decorate('unauthorized', (reply) => {
    if (reply.status)
      reply.status(401).send('Unauthorized')
  })

  instance.decorate('aldy_exs', (reply, status = '') => {
    var aldy_exs = {
      statusCode: 419,
      status: status,
      error: 'has already exist'
    }
    reply.send(aldy_exs)
  })

  instance.decorate('hs_not_exs', (reply) => {
    var hs_not_exs = {
      statusCode: 420,
      error: 'has not registered'
    }
    reply.send(hs_not_exs)
  })

  instance.decorate('allready_exist', (reply) => {
    reply.send({
      statusCode: 411,
      message: 'Allready exist'
    })
  })

  instance.decorateReply('allready_exist', function (name, code = 411, data=null) {
    this.send({
      statusCode: code,
      message: name,
      data: data,
      error: name + ' allready exist'
    })
  })

  instance.decorateReply('couldnotdelete', function (name) {
    var response = {
      statusCode: 412,
      message: 'could not delete ' + name
    }
    this.send(response)
  })

  instance.decorateReply('sendPdfFile', filename => {
    const stream = fs.createReadStream('./static/' + filename)
    this.send(stream)
  })

  // techmap errors

  instance.decorateReply(
    'techMapExist',
    function () {
      const response = {
        statusCode: 50000,
        message: "TechMap allready exist"
      }
      this.send(response)
    }
  )

  next()
})
