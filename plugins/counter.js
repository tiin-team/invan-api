
const fp = require('fastify-plugin');
const mongoose = require('mongoose');

module.exports = fp((instance, _, next) => {

    const CounterSchema = new mongoose.Schema({
        name: String,
        value: {
            type: Number,
            default: 1
        }
    });

    CounterSchema.statics.getValue = async function (name) {
        const counter = await instance.CounterModel.findOneAndUpdate({ name }, { $inc: { value: 1 } }, { new: true, upsert: true });
        if (!counter) return null;
        return counter.value;
    }

    const CounterModel = mongoose.model('CounterModel', CounterSchema);
    instance.decorate('CounterModel', CounterModel);

    next()
})
