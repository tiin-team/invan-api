
const fp = require('fastify-plugin')

async function signSupplier(request, reply, instance) {
    try {
        let { phone_number } = request.body;
        phone_number = `+${phone_number.replace(/[^0-9]/i, '')}`;
        const supplier = await instance.adjustmentSupplier.findOne({ phone_number }).lean();
        if (!supplier) {
            throw { message: 'not found' }
        }
        // send sms
        const otp = Math
            .random()
            .toString()
            .substr(2, 4);
        console.log(otp);
        await instance.SmsModel.saveOtp(supplier.phone_number, otp);
        reply.ok({ phone_number })
    } catch (error) {
        reply.error(error.message)
    }
    return reply;
}

async function verifySupplier(request, reply, instance) {
    try {
        let { phone_number, otp } = request.body;
        phone_number = `+${phone_number.replace(/[^0-9]/i, '')}`;
        const supplier = await instance.adjustmentSupplier.findOne({ phone_number }).lean();
        if (!supplier) {
            throw { message: 'not found' }
        }
        // check otp
        const sms = await instance.SmsModel.findOne({ phone_number: supplier.phone_number }).lean();
        if (!(sms && sms.otp == otp)) {
            throw { message: 'otp error' }
        }
        const params = {
            phone_number: phone_number,
            role: 'supplier'
        }
        const token = instance.sign_supplier(params);
        reply.ok({ phone_number, token })
    } catch (error) {
        reply.error(error.message)
    }
    return reply;
}

module.exports = fp((instance, _, next) => {
    console.log('sign')
    const bodySchema = {
        body: {
            type: 'object',
            additionalProperties: false,
            required: [
                'phone_number'
            ],
            properties: {
                phone_number: { type: 'string' },
                otp: { type: 'string' }
            }
        }
    }

    instance.post(
        '/supplier/login',
        {
            attachValidation: true,
            schema: bodySchema
        },
        (request, reply) => {
            if (request.validationError) {
                return reply.validation(request.validationError.message)
            }

            return signSupplier(request, reply, instance);
        }
    );

    instance.post(
        '/supplier/verify',
        {
            attachValidation: true,
            schema: bodySchema
        },
        (request, reply) => {
            if (request.validationError) {
                return reply.validation(request.validationError.message)
            }

            return verifySupplier(request, reply, instance);
        }
    );

    next()
})
