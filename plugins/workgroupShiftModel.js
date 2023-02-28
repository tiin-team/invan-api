
const fp = require('fastify-plugin');
const mongoose = require('mongoose');

module.exports = fp(function(instance, _, next) {

    const WorkgroupShiftSchema = new mongoose.Schema({
        organization: String,
        service: String,
        opening_time: Number,
        closing_time: {
            type: Number,
            default: 0
        },
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'users'
        },
        pos_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'posdevices'
        },
        comment: String
    })

    WorkgroupShiftSchema.statics.insertWorkgroupShift = async function(data, user) {
        try {
            data.organization = user.organization;
            data.user_id = user._id;
            data.opening_time = new Date().getTime()
            const { _id: id } = await new this(data).save();
            return id;
        } catch (error) {
            instance.log.error(`insertWorkgroupShift Error ${error.message}`);
            throw error
        }
    }

    const WorkgroupShift = mongoose.model('WorkgroupShift', WorkgroupShiftSchema)
    instance.decorate('WorkgroupShift', WorkgroupShift)  

    next()
})
