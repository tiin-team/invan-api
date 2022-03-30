const fp = require('fastify-plugin');
const mongoose = require('mongoose');
const moment = require('moment');
const EventEmitter = require('events');

module.exports = fp((instance, options, next) => {

    //--------------------------------------------------

    /**
     * Emits the following events:
     * - change(taskDone)
     *
     * How to subscribe:
     *
     * kpiEvents.on('change', (taskDone) => { ... })
     */
    class KPIEventEmitter extends EventEmitter {}

    const kpiEvents = new KPIEventEmitter();
    instance.decorate('kpiEvents', kpiEvents);

    //--------------------------------------------------

    class ExecutorType {
        static WorkGroup = 'workgroup';
        static User = 'user';

        static isValidType(executorType) {
            return [
                this.User,
                this.WorkGroup,
            ].includes(executorType);
        }

        static async isValidExecutor(id, type) {

            switch (type) {

                case this.WorkGroup:
                    return !!await mongoose.model('Workgroup').findById(id).exec();

                case this.User:
                    return !!await mongoose.model('User').findById(id).exec();

                default:
                    throw {
                        code: 400,
                        message: `Cannot validate an executor of this type: "${type}"`,
                    };

            }
        }
    }

    instance.decorate('ExecutorType', ExecutorType);

    //--------------------------------------------------

    const TaskLimitSchema = new mongoose.Schema({
        // it must be equal to the previous limit's "to" value
        from: Number,
        to: Number,
        bonus: Number,
        // arbitrary string value to detect & apply some business logic
        type: String,
        // true - apply bonus for each over limit
        each: Boolean,
    }, { _id: false });

    //--------------------------------------------------

    /**
     * @example
     * {
            "_id" : ObjectId("5f2d0857c8785c46c6d6073a"),
            "title" : "Paint",
            "type" : "renovation",
            "unit_name" : "m2",
            "limits" : [
                {
                    "from" : 0.0,
                    "to" : 5.0,
                    "bonus" : 0.0,
                    "type" : "a"
                },
                {
                    "from" : 5.0,
                    "to" : 99999.0,
                    "bonus" : 100.0,
                    "type" : "a",
                    "each" : true
                }
            ]
        }
     */
    const TaskSchema = new mongoose.Schema({
        organization: String,
        title: String,
        type: String,
        unit_name: String,
        limits: [TaskLimitSchema]
    });

    /**
     * Gets TaskLimit by volume
     * @param {number} volume completed tasks volume
     * @returns {mongoose.Schema|undefined}
     */
    TaskSchema.methods.getLimit = function (volume) {
        return this.limits.find(limit => limit.from < volume && volume <= limit.to);
    };

    /**
     * Gets an over limit value by volume
     * @param {number} volume completed tasks volume
     * @returns {number|undefined} over limit value
     */
    TaskSchema.methods.getOverLimit = function (volume) {
        const limit = this.getLimit(volume);

        if (!limit) {
            return;
        }

        if (limit.bonus === 0) {
            return 0;
        }

        return volume - limit.from;
    }

    /**
     * Calculates a bonus amount
     * @param {number} volume
     * @returns {number|undefined}
     */
    TaskSchema.methods.calculateBonus = function (volume) {
        const limit = this.getLimit(volume);

        if (!limit) {
            return;
        }

        if (limit.each) {
            const overLimit = this.getOverLimit(volume);
            return overLimit * limit.bonus;
        }

        return limit.bonus;
    };

    TaskSchema.statics.getParams = async function (taskId, volume) {

        const task = await mongoose.model('Task').findById(taskId).exec();

        if (!task) {
            throw { code: 404, message: 'Task not found' };
        }

        return {
            bonus: task.calculateBonus(volume),
            limit: task.getLimit(volume),
            over_limit: task.getOverLimit(volume),
        };

    };

    TaskSchema.statics.isExists = async function (id) {
        return !!await mongoose.model('Task').findById(id).exec();
    }

    const Task = mongoose.model('Task', TaskSchema);
    instance.decorate('Task', Task);

    //--------------------------------------------------

    const TaskDoneSchema = new mongoose.Schema({
        date: Date,
        executor_id: mongoose.ObjectId,
        executor_type: String,
        task_id: mongoose.ObjectId,
        volume: Number,
        over_limit: Number,
        bonus: Number,
        applied_limit: TaskLimitSchema,
    });

    TaskDoneSchema.statics.getForDate = async function (executor_id,
                                                        executor_type,
                                                        task_id,
                                                        date = moment().startOf('day').toDate()) {
        return this.findOne({ date, executor_id, executor_type, task_id }).exec();
    };

    TaskDoneSchema.methods.applyVolume = async function (taskId, totalVolume) {
        const info = await mongoose.model('Task').getParams(taskId, totalVolume);

        if (info.limit == null) {
            throw {
                code: 400,
                message: 'Limits are not configured for the task',
            };
        }

        this.volume = totalVolume;
        this.over_limit = info.over_limit;
        this.bonus = info.bonus;
        this.applied_limit = info.limit;

        const taskDone = await this.save();

        kpiEvents.emit('change', taskDone);

        return taskDone;
    };

    /**
     * Adds a volume for the given task by the specified executor
     * @param {VolumeParams} params
     * @returns {Promise<TaskDone>}
     */
    TaskDoneSchema.statics.addVolume = async function (params) {

        const today = moment().startOf('day').toDate();

        const doneTask = await this.getForDate(
            params.executor_id,
            params.executor_type,
            params.task_id,
            today
        );

        if (doneTask) {
            // update existing
            const totalVolume = doneTask.volume + params.volume;
            return await doneTask.applyVolume(params.task_id, totalVolume);
        }

        // create a new one

        const info = await Task.getParams(params.task_id, params.volume);

        const newDoneTask = new this({
            date: moment().startOf('day').toDate(),
            executor_id: params.executor_id,
            executor_type: params.executor_type,
            task_id: params.task_id,
            volume: params.volume,
            over_limit: info.over_limit,
            bonus: info.bonus,
            applied_limit: info.limit,
        });

        const taskDone = await newDoneTask.save();

        kpiEvents.emit('change', taskDone);

        return taskDone;

    };

    /**
     * Removes a volume for the given task by the specified executor
     * @param {VolumeParams} params
     * @returns {Promise<TaskDone>}
     */
    TaskDoneSchema.statics.removeVolume = async function (params) {

        const today = moment().startOf('day').toDate();

        const doneTask = await this.getForDate(
            params.executor_id,
            params.executor_type,
            params.task_id,
            today
        );

        if (!doneTask) {
            throw { code: 404, message: 'Done task not found' };
        }

        const totalVolume = doneTask.volume - params.volume;

        return await doneTask.applyVolume(params.task_id, totalVolume);

    };

    const TaskDone = mongoose.model('TaskDone', TaskDoneSchema);
    instance.decorate('TaskDone', TaskDone);

    //--------------------------------------------------

    next();

});

/**
 * @typedef VolumeParams
 * @property {ObjectId} executor_id
 * @property {string} executor_type 'user' | 'workgroup'
 * @property {ObjectId} task_id
 * @property {number} volume
 */