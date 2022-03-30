module.exports = (instance, options, next) => {

    const TaskSchema = {
        body: {
            type: 'object',
            properties: {
                title: { type: 'string' },
                type: { type: 'string' },
                unit_name: { type: 'string' },
                limits: {
                    type: 'array',
                    minItems: 1,
                    items: {
                        type: 'object',
                        properties: {
                            from: { type: 'number', minimum: 0 },
                            to: { type: 'number', minimum: 0 },
                            bonus: { type: 'number', minimum: 0 },
                            type: { type: 'string', enum: ['a', 'p'] },
                            each: { type: 'boolean', default: false },
                        },
                        required: [
                            'from',
                            'to',
                            'bonus',
                            'type',
                        ],
                    },
                },
            },
            required: [
                'title',
                'type',
                'unit_name',
                'limits',
            ],
            additionalProperties: false,
        },
    };

    class TaskUtils {

        static sortLimits(limits) {
            return limits.sort((a, b) => {
                if (a.from > b.from) return 1;
                if (b.from > a.from) return -1;
                return 0;
            });
        }

        static checkLimitsRange(limits) {
            for (const limit of limits) {
                if (limit.to <= limit.from) {
                    throw {
                        code: 400,
                        message: 'Limit "to", "from" values are invalid',
                    };
                }
            }
        }

        static checkUniquenessOfLimitsRanges(limits) {
            const count = {
                to: {},
                from: {},
            };

            for (const limit of limits) {
                count.from[limit.from]++;
                count.to[limit.to]++;
            }

            const nonUniqueFrom = Object.values(count.from).filter(value => value > 1);
            if (nonUniqueFrom.length > 0) {
                throw {
                    code: 400,
                    message: 'Duplicate "from" values are detected',
                };
            }

            const nonUniqueTo = Object.values(count.to).filter(value => value > 1);
            if (nonUniqueTo.length > 0) {
                throw {
                    code: 400,
                    message: 'Duplicate "to" values are detected',
                };
            }
        }

        static checkSiblingLimitsRange(limits) {
            for (let i = 0; i < limits.length - 1; i++) {
                const current = limits[i];
                const next = limits[i + 1];
                if (current.to !== next.from) {
                    throw {
                        code: 400,
                        message: 'Next limit must start with the previous limits upper bound value',
                    };
                }
            }
        }

        static validateLimits(limits) {
            this.checkLimitsRange(limits);
            this.checkUniquenessOfLimitsRanges(limits);
            this.checkSiblingLimitsRange(limits);
        }

        static async getTask(id) {
            const task = await instance.Task.findById(id);

            if (!task) {
                throw {
                    code: 400,
                    message: 'Task not found',
                };
            }

            return task;
        }

    }

    instance.post(
        '/kpi/task/add',
        {
            ...options.version,
            schema: TaskSchema,
        },
        (request, reply) => {
            instance.oauth_admin(request, reply, async (user) => {
                try {
                    const taskData = request.body;
                    taskData.organization = user.organization

                    taskData.limits = TaskUtils.sortLimits(taskData.limits);
                    TaskUtils.validateLimits(taskData.limits);

                    const task = await instance.Task.create(taskData);

                    reply.ok({
                        task,
                    });
                } catch (error) {
                    error = instance.normalizeError(error);
                    reply.send(error);
                }

                return reply;
            })
        }
    );

    instance.post(
        '/kpi/task/:id/update',
        {
            ...options.version,
            schema: TaskSchema,
        },
        async (request, reply) => {
            try {
                const task = await TaskUtils.getTask(request.params.id);
                const taskData = request.body;

                taskData.limits = TaskUtils.sortLimits(taskData.limits);
                TaskUtils.validateLimits(taskData.limits);

                // replace a task
                const updatedTask = await instance.Task.findByIdAndUpdate(
                    task._id,
                    taskData,
                    { returnOriginal: false }
                );

                reply.ok({
                    task: updatedTask,
                });
            } catch (error) {
                error = instance.normalizeError(error);
                reply.send(error);
            }

            return reply;
        }
    );

    instance.post(
        '/kpi/task/:id/delete',
        {
            ...options.version,
        },
        async (request, reply) => {
            try {
                const task = await TaskUtils.getTask(request.params.id);

                const workgroup = await instance.Workgroup.findOne({ task_id: task._id });
                if (workgroup) {
                    throw {
                        code: 400,
                        message: `There is a bound workgroup to this task: ${workgroup.name}`,
                    };
                }

                await instance.Task.findByIdAndDelete(task._id);

                reply.ok({
                    success: true
                });
            } catch (error) {
                error = instance.normalizeError(error);
                reply.send(error);
            }

            return reply;
        }
    );

    instance.get(
        '/kpi/task/:id',
        {
            ...options.version,
        },
        async (request, reply) => {
            try {
                const task = await TaskUtils.getTask(request.params.id);

                reply.ok({
                    task,
                });
            } catch (error) {
                error = instance.normalizeError(error);
                reply.send(error);
            }

            return reply;
        }
    );

    instance.get(
        '/kpi/task',
        {
            ...options.version,
        },
        (request, reply) => {
            instance.oauth_admin(request, reply, async (user) => {
                try {
                    const tasks = await instance.Task.find({ organization: user.organization }).sort({ type: 1, title: 1 }).exec();

                    reply.ok({
                        tasks,
                    });
                } catch (error) {
                    error = instance.normalizeError(error);
                    reply.send(error);
                }

                return reply;
            })
        }
    );

    next();

};