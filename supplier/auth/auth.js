
const fp = require('fastify-plugin');
const jwt = require('jsonwebtoken');

const getToken = (data) => jwt.sign(data, process.env.JWT_SECRET);
const verifyToken = (token) => jwt.verify(token, process.env.JWT_SECRET);

module.exports = fp((instance, _, next) => {
    console.log('auth')
    instance.decorate('auth_supplier', (request, reply, next) => {
        try {
            const token = request.headers['authorization'];
            const user = verifyToken(token);
            if (!user) throw { message: 'wrong token' }
            request.user = user;
            next();
        }
        catch (error) {
            reply.status(401).send({ statusCode: 401 })
        }
    });

    instance.decorate('sign_supplier', (data) => getToken(data));

    next()
});
