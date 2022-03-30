const fp=require('fastify-plugin')

module.exports = fp((instance, _, next) => {
    next()
})