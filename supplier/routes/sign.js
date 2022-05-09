
const fp = require('fastify-plugin')

async function signSupplier(request, reply, instance) {
    try {
        let { phone_number } = request.body;
        phone_number = `+${phone_number.replace(/[^0-9]/i, '')}`;
        const supplier = await instance.adjustmentSupplier
            .findOne({ phone_number }, { phone_number: 1, supplier_name: 1 })
            .lean();
        if (!supplier) {
            return reply.code(404).send('Supplier not found')
        }
        // send sms
        const otp = Math
            .random()
            .toString()
            .substr(2, 4);
        console.log(otp);
        await instance.sending_sms_code(phone_number, otp, 'supplier', { name: supplier.supplier_name })
        await instance.SmsModel.saveOtp(supplier.phone_number, otp);
        reply.code(200).send({
            statusCode: 200,
            error: "Ok",
            message: "Success",
            phone_number
        })
    } catch (error) {
        reply.error(error.message)
    }
    return reply;
}

async function verifySupplier(request, reply, instance) {
    try {
        let { phone_number, otp } = request.body;
        phone_number = `+${phone_number.replace(/[^0-9]/i, '')}`;
        const supplier = await instance.adjustmentSupplier
            .findOne({ phone_number }, { phone_number: 1, organization: 1 })
            .lean();
        if (!supplier) {
            return reply.code(404).send('Supplier not found')
        }
        // check otp
        const sms = await instance.SmsModel
            .findOne(
                { phone_number: supplier.phone_number },
                { otp: 1 },
            )
            .lean();
        if (!(sms && sms.otp == otp)) {
            return reply.code(400).send('otp error')
        }
        const params = {
            _id: supplier._id,
            phone_number: phone_number,
            organization: supplier.organization,
            role: 'supplier'
        }
        const token = instance.sign_supplier(params);
        return reply.code(200).send({
            statusCode: 200,
            error: "Ok",
            message: "Success",
            phone_number,
            token
        })
    } catch (error) {
        reply.error(error.message)
    }
    return reply;
}

module.exports = fp((instance, _, next) => {
    // console.log('sign')
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
