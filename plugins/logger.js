
const os = require("os");
const fp = require('fastify-plugin')
module.exports = fp((instance, _, next) => {

    instance.addHook('onRequest', (req, rep, done) => {
        let error_occured = false;
        try {
            console.log(req.raw.url)
            req.come_time = new Date().getTime()
            const total_memory = Math.round(process.memoryUsage().heapTotal / 1024 / 1024 * 100) / 100;
            const used_memory = Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100;
            console.log('total_memory', total_memory)
            console.log('used_memory ', used_memory)
            console.log('Accept-Version: ', req.headers['Accept-Version'])
            console.log('Accept-User: ', req.headers['Accept-User'])
            console.log('Authorization: ', req.headers['Authorization'])
            const totalRAM = Math.round(os.totalmem() / 1024 / 1024 * 100) / 100;
            console.log('totalRAM', totalRAM)
            const freeRAM = Math.round(os.freemem() / 1024 / 1024 * 100) / 100;
            console.log('freeRAM', freeRAM)
            if (freeRAM < 50) {
                error_occured = true;
                return rep.status(500).send('Not enough memory')
            }
            return done()
        } catch (error) {
            console.log(error.message)
        }
        if (!error_occured) {
            done()
        }
    })

    instance.addHook('onResponse', (req, rep, done) => {
        try {
            const time = new Date().getTime() - req.come_time;
            console.log(req.raw.url, `${Math.round(time / 1000)} s ${time % 1000} ms`)
            return done()
        } catch (error) {
            console.log(error.message)
        }
        done()
    })

    next()
})
