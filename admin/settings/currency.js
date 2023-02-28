
const axios = require('axios')

module.exports = ((instance, _, next) => {

    const getCurrency = async (request, reply) => {
        try {
            const user = request.user
            const currency = await instance.Currency.findOne({
                organization: user.organization
            })
            if (currency && !currency.currency) {
                currency.currency = 'uzs'
            }
            if (currency) {
                return reply.ok(currency)
            }
            let current_currency = {
                organization: user.organization,
                value: null,
                currency: 'uzs',
                number_of_zero: 2
            }
            try {
                const res = await axios.get(process.env.CURRENCY_URL)
                current_currency.value = res.data.rates.UZS
                await new instance.Currency(current_currency).save()
            } catch (error) {
                instance.send_Error('Currency', error.message)
            }
            reply.ok(current_currency)
        } catch (error) {
            reply.error(error.message)
        }
    }

    instance.get(
        '/currency/get',
        {
            version: '1.0.0'
        },
        (request, reply) => {
            instance.authorization(request, reply, (user) => {
                return getCurrency(request, reply)
            })
        }
    )

    const currencySchema = {
        body: {
            type: 'object',
            additionalProperties: false,
            required: ['value'],
            properties: {
                value: { type: 'number' },
                currency: {
                    type: 'string',
                    enum: ['uzs', 'usd'],
                    default: 'uzs'
                },
                number_of_zero: {
                    type: 'number',
                    default: 2
                }
            }
        }
    }

    const currencyUpdate = async (request, reply) => {
        try {
            const user = request.user
            let { value, currency, number_of_zero } = request.body;
            if (number_of_zero < 2) {
                number_of_zero = 2;
            }
            if (!await instance.Currency.findOne({ organization: user.organization })) {
                await new instance.Currency({
                    organization: user.organization,
                    value: value,
                    currency: currency,
                    number_of_zero
                }).save()
            }
            else {
                await instance.Currency.updateOne({
                    organization: user.organization
                }, {
                    $set: {
                        value: value,
                        currency: currency,
                        number_of_zero
                    }
                })
            }
            reply.ok()
        } catch (error) {
            reply.error(error.message)
        }
    }

    instance.post(
        '/currency/update',
        {
            version: '1.0.0',
            schema: currencySchema
        },
        (request, reply) => {
            instance.oauth_admin(request, reply, (user) => {
                return currencyUpdate(request, reply)
            })
        }
    )

    next()
})

