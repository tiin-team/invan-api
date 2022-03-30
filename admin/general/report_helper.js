
const fp = require('fastify-plugin')
const fastify = require('fastify')

module.exports = fp((instance, options, next) => {

  function addObjects(arr) {
    let c = {}
    if(arr.length == 0) {
      return c
    }
    Object.keys(arr[0]).forEach(k => {
      c[k] = 0
      for (let i = 0; i < arr.length; i++) {
        if (arr[i][k] && typeof arr[i][k] === typeof 5.5) {
          c[k] += arr[i][k]
        }
        else if (arr[i][k] && typeof arr[i][k] === typeof 'invan') {
          c[k] = arr[i][k]
        }
      }
    })
    return c
  }
  instance.decorate('addObjects', addObjects)

  next()
})
