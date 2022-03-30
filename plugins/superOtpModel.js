
const fp = require('fastify-plugin');
const mongoose = require('mongoose');

module.exports = fp((instance, _, next) => {

    const SuperOtpSchema = new mongoose.Schema({
        phone_number: String,
        otp: String,
    })

    SuperOtpSchema.statics.getOtp = async (phone_number) => {
        try {
            const super_otp = await instance.SuperOtp.findOne({ phone_number });
            if (!super_otp) {
                return null;
            }
            return super_otp.otp;
        }
        catch (error) {
            return null
        }
    }

    const SuperOtp = mongoose.model('SuperOtp', SuperOtpSchema)
    instance.decorate('SuperOtp', SuperOtp)

    next()
})
