
const fp = require('fastify-plugin');
const mongoose = require('mongoose');

async function updateProcesses(ProcessModel) {
    try {
        await ProcessModel.updateMany({}, { $set: { processing: false } })
    } catch (error) {
        console.log(error.message)
    }
}

module.exports = fp((instance, _, next) => {

    const ProcessSchema = new mongoose.Schema({
        organization: String,
        processing: {
            type: Boolean,
            default: false
        },
        is_send: {
            type: Boolean,
            default: false
        },
        user_id: String,
        name: { type: String, default: '' },
        percentage: Number,
        path: String
    })

    ProcessSchema.statics.findProcess = async function (data) {
        return await ProcessModel.findOneAndUpdate(
            { organization: data.organization },
            {
                $set: {}
            },
            { new: true, upsert: true }
        );
    }

    ProcessSchema.statics.setProcessing = async function (data, processing) {
        return await ProcessModel.findOneAndUpdate(
            { organization: data.organization },
            {
                $set: {
                    processing: processing
                }
            },
            { new: true, upsert: true, lean: true }
        );
    }

    const ProcessModel = mongoose.model('ProcessModel', ProcessSchema);

    updateProcesses(ProcessModel);

    instance.decorate('ProcessModel', ProcessModel)

    next()
})
