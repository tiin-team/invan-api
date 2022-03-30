
const fp = require('fastify-plugin');
const { I18n } = require('i18n')
const path = require('path')
const i18n = new I18n({
    locales: ['en', 'uz', 'ru'],
    directory: path.join(__dirname, 'locales')
})

module.exports = fp(async (instance, _, next) => {

    try {
        i18n.init();
        instance.decorate('i18n', i18n)
    }
    catch(error) {
        instance.log.error(error.message)
    }
    next()
})
