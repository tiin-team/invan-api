const fp = require('fastify-plugin');

module.exports = fp((instance, options, next) => {

    function normalizeError(error) {
        if (error.statusCode == null && error.code) {
            error.statusCode = error.code;
            error.code = undefined;
        }

        if (error.error == null) {
            error.error = 'Bad Request';
        }

        return error;
    }

    instance.decorate('normalizeError', normalizeError);

    next();

});