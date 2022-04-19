const mongoose = require("mongoose");

module.exports = ((instance, _, next) => {

    const createShift = async (request, reply, user) => {
        const body = request.body;

        const pos_device = await instance.posDevices.findById(body.pos_id).lean();
        if (!pos_device)
            return reply.error('Pos device not found')

        body.organization = user.organization;
        body.service = pos_device.service;
        body.pos = pos_device.name;
        body.currency = body.currency ? body.currency : 'uzs'
        body.pos_id = pos_device._id;
        body.by_whom = user._id;
        body.by_whom_name = user.name;
        body.by_whom_name_close = '';
        body.pays = [];

        body._id = new mongoose.Types.ObjectId();

        const shift = await new instance.Shifts(body).save();

        reply.ok(shift)
    }
    async function updateShift(request, reply, user) {
        const body = request.body;
        const shifId = request.params.id;
        const pos_device = await instance.posDevices.findById(body.pos_id);
        if (!pos_device)
            reply.error('Pos device not found')

        body.by_whom_close = user._id;
        body.by_whom_name_close = user.name;

        const shift = await instance.Shifts.findByIdAndUpdate(
            shifId, body, {
            new: true, lean: true,
        });

        reply.ok(shift)
    }
    const schemaShiftCreate = {
        schema: {
            body: {
                type: 'object',
                required: ['pos_id'],
                properties: {
                    pos_id: { type: 'string' },
                    opening_time: { type: 'number' },
                    currency: {
                        type: 'string',
                        enum: ['uzs', 'usd']
                    },
                    cash_drawer: {
                        starting_cash: { type: 'number' },
                        cash_payment: { type: 'number' },
                        inkassa: { type: 'number' },
                        cash_refund: { type: 'number' },
                        paid_in: { type: 'number' },
                        paid_out: { type: 'number' },
                        exp_cash_amount: { type: 'number' },
                        act_cash_amount: { type: 'number' },
                        withdrawal: { type: 'number' },
                        difference: { type: 'number' }
                    },
                    sales_summary: {
                        gross_sales: { type: 'number' },
                        refunds: { type: 'number' },
                        discounts: { type: 'number' },
                        net_sales: { type: 'number' },
                        cash: { type: 'number' },
                        card: { type: 'number' },
                        debt: { type: 'number' },
                        taxes: { type: 'number' }
                    },
                }
            }
        },
        attachValidation: true
    }
    instance.post('/desktop/shifts/create', {
        version: '2.0.0',
        ...schemaShiftCreate,
    }, (request, reply) => {
        instance.authorization(request, reply, async (user) => {
            if (request.validationError) {
                return reply.validation(request.validationError.message);
            }
            createShift(request, reply, user)
        })
    })
    const schemaShiftUpdate = {
        schema: {
            body: {
                type: 'object',
                // required: ['by_whom_name_close', 'by_whom_close'],
                properties: {
                    closing_time: { type: 'number' },
                    currency: {
                        type: 'string',
                        enum: ['uzs', 'usd']
                    },
                    cash_drawer: {
                        //starting_cash: { type: 'number' },
                        cash_payment: { type: 'number' },
                        inkassa: { type: 'number' },
                        cash_refund: { type: 'number' },
                        paid_in: { type: 'number' },
                        paid_out: { type: 'number' },
                        exp_cash_amount: { type: 'number' },
                        act_cash_amount: { type: 'number' },
                        withdrawal: { type: 'number' },
                        difference: { type: 'number' }
                    },
                    sales_summary: {
                        gross_sales: { type: 'number' },
                        refunds: { type: 'number' },
                        discounts: { type: 'number' },
                        net_sales: { type: 'number' },
                        cash: { type: 'number' },
                        card: { type: 'number' },
                        debt: { type: 'number' },
                        taxes: { type: 'number' }
                    },
                    Pays: { type: 'array' },
                }
            }
        },
        attachValidation: true
    }
    instance.patch('/desktop/shifts/:id', {
        version: '2.0.0',
        ...schemaShiftUpdate,
    }, (request, reply) => {
        instance.authorization(request, reply, (user) => {
            if (request.validationError) {
                return reply.validation(request.validationError.message);
            }
            updateShift(request, reply, user)
        })
    })
    next()
})
