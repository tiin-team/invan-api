
// const organizations = require('./organizations');
// const sign = require('./sign');
// const transactions = require('./transactions');
// const valuation = require('./valuation');

const fp = require('fastify-plugin');

module.exports = fp((instance, options, next) => {

    // instance.register(organizations, options)
    // instance.register(sign, options)
    // instance.register(transactions, options)
    // instance.register(valuation, options)

    next()
})
