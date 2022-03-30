
const fp = require('fastify-plugin');
const mongoose = require('mongoose');

module.exports = fp((instance, _, next) => {

    // @index ({ employee_id: 1, date: 1 }, { unique: true })
    const UserTaskSchema = new mongoose.Schema({
        organization: String,
        employee_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'users'
        },
        weight: Number,
        date: Number
    });

    UserTaskSchema.statics.saveTask = async function (data) {
        data.date = new Date().getTime();
        return await new instance.UserTask(data).save();
    }

    const UserTask = mongoose.model('UserTask', UserTaskSchema);
    instance.decorate('UserTask', UserTask)

    next()
})
