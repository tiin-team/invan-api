const fp = require('fastify-plugin');

module.exports = fp((instance, opts, next) => {
    const req = { headers: {} }
    const socketID = req.headers["sec-websocket-key"];

    instance.io.on("message", message => {
        console.log({
            msg: message,
            socket: socketID
        });
    });
    instance.io.on("close", () => {
        console.log({
            msg: "Client disconnected",
            socket: socketID
        });
    });

    // instance.addHook("onClose", (instance, done) => {
    //     instance.log.info("in the onClose hook");
    //     done();
    // });

    instance.io.on('connect', (socket) => {
        console.log({
            msg: "Client connected",
            socket: socket.id,
        });
        const data = {
            message: "OK",
            id: socket.id,
        }
        instance.io.emit('msgToClient', data)
    })

    next()
})