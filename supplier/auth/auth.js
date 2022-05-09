
const fp = require('fastify-plugin');
const jwt = require('jsonwebtoken');

const getToken = (data) => jwt.sign(data, process.env.JWT_SECRET);
const verifyToken = (token) => jwt.verify(token, process.env.JWT_SECRET);
// const token = ''
// console.log(verifyToken(token))/;
module.exports = fp((instance, _, next) => {
    console.log('auth')
    instance.decorate('auth_supplier', async (request, reply, next) => {
        try {
            if (!request.headers['authorization']) return reply.code(401).send('unauthorized')

            const token = request.headers['authorization'].replace('Bearer ', '');

            const user = verifyToken(token);
            if (!user) return reply.code(403).send('wrong token')
            const services = await instance.services
                .find(
                    { organization: user.organization },
                    { organization: 1, address: 1, phone_number: 1, name: 1 },
                )
                .lean()
            user.services = services
            request.user = user;
            next();
        }
        catch (error) {
            console.log(error);
            reply.status(401).send({ statusCode: 401 })
        }
    });

    instance.decorate('sign_supplier', (data) => getToken(data));

    next()
});
