module.exports = (instance, options, next) => {

    //--------------------------------------------------

    const KPISchema = {
        body: {
            type: 'object',
            properties: {
                executor_id: { type: 'string', minLength: 24, maxLength: 24 },
                executor_type: { type: 'string' },
                task_id: { type: 'string', minLength: 24, maxLength: 24 },
                volume: { type: 'number', maximum: 1000000000, exclusiveMinimum: 0 },
            },
            required: [
                'executor_id',
                'executor_type',
                'task_id',
                'volume',
            ],
            additionalProperties: false,
        }
    };

    const deepValidation = (request, reply, done) => {

        instance.oauth_admin(request, reply, async (admin) => {

            try {

                if (!admin) {
                    return reply.error('Access denied');
                }

                const { executor_type, executor_id, task_id } = request.body;

                if (!instance.ExecutorType.isValidType(executor_type)) {
                    return reply.validation('executor_type');
                }

                if (!await instance.ExecutorType.isValidExecutor(executor_id, executor_type)) {
                    return reply.validation('executor_id');
                }

                if (!await instance.Task.isExists(task_id)) {
                    return reply.validation('task_id');
                }

            } catch (error) {
                error = instance.normalizeError(error);
                return reply.send(error);
            }

            done();

        });

    };

    instance.post(
        '/kpi/add',
        {
            ...options.version,
            schema: KPISchema,
            preHandler: deepValidation,
        },
        async (request, reply) => {
            try {
                const doneTask = await instance.TaskDone.addVolume(request.body);
                reply.ok({
                    total_volume: doneTask.volume,
                    bonus: doneTask.bonus,
                    over_limit: doneTask.over_limit,
                });
            } catch (error) {
                error = instance.normalizeError(error);
                reply.send(error);
            }

            return reply;
        }
    );

    //--------------------------------------------------

    instance.post(
        '/kpi/delete',
        {
            ...options.version,
            schema: KPISchema,
            preHandler: deepValidation,
        },
        async (request, reply) => {
            try {
                const doneTask = await instance.TaskDone.removeVolume(request.body);
                reply.ok({
                    total_volume: doneTask.volume,
                    bonus: doneTask.bonus,
                    over_limit: doneTask.over_limit,
                });
            } catch (error) {
                error = instance.normalizeError(error);
                reply.send(error);
            }

            return reply;
        }
    );

    //--------------------------------------------------

    next();

};