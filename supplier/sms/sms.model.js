
const fp = require('fastify-plugin')
const mongoose = require('mongoose');

module.exports = fp((instance, _, next) => {

    const SmsModelSchema = new mongoose.Schema({
        phone_number: String,
        otp: String
    })


    SmsModelSchema.statics.saveOtp = async (phone_number, otp) => {
        await instance.sending_sms_code(phone_number, otp, 'supplier')
        await SmsModel.findOneAndUpdate({ phone_number }, { $set: { otp } }, { lean: true, upsert: true })
    }

    const SmsModel = mongoose.model('SmsModel', SmsModelSchema)
    instance.decorate('SmsModel', SmsModel)

    console.log('SMS')
    next()
})
