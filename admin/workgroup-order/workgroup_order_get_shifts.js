
const orderShiftsGet = async function (request, reply, instance) {
    try {
        const { service_id, user_id, time } = request.body;
        const shifts = await instance.WorkgroupShift.find({
            service: service_id,
            user_id: user_id,
            opening_time: {
                $lte: time
            },
            $or: [
                {
                    closing_time: {
                        $eq: 0
                    }
                },
                {
                    closing_time: {
                        $gte: time
                    }
                }
            ]
        });
        reply.ok(shifts)
    } catch (error) {
        reply.error(error.message)
    }
}

module.exports = ((instance, _, next) => {

    const orderShiftsGetSchema = {
        body: {
            type: 'object',
            required: [
                'service_id',
                'user_id',
                'time'
            ],
            properties: {
                service_id: {
                    type: 'string',
                    minLength: 24,
                    maxLength: 24
                },
                user_id: {
                    type: 'string',
                    minLength: 24,
                    maxLength: 24
                },
                time: {
                    type: 'number'
                }
            }
        }
    }

    instance.post(
        '/workgroup/order/shifts-get',
        {
            version: '1.0.0',
            schema: orderShiftsGetSchema,
            attachValidation: true,
            preValidation: instance.authorize_admin,
        },
        (request, reply) => {
            orderShiftsGet(request, reply, instance)
        }
    );

    next()
})
