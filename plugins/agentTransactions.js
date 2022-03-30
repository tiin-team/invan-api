const fp = require('fastify-plugin');
const mongoose = require('mongoose');

async function save_agent_transaction(instance, check) {
    try {
        const order_number = +check.order_id;
        console.log('Order number', order_number)
        const order = await instance.BeeToOrders.findOne({ order_number });
        if (!order) {
            console.log('No Order Found')
            return;
        }
        const transaction_params = {
            organization: check.organization,
            client: order.client_id,
            created_date: new Date(),
            amount: check.is_refund ? (-1 * check.total) : check.total,
            amount_type: 'cash',
            type: 'credit',
            hostId: order._id,
            moderator: order.moderator_id,
        }
        await new instance.AgentTransaction(transaction_params).save();
    } catch (error) {
        console.log(error)
    }
}

module.exports = fp((instance, _, next) => {

    instance.decorate(
        'save_agent_transaction',
        save_agent_transaction
    )

    const AgentTransactionSchema = new mongoose.Schema({
        organization: String,
        client: mongoose.ObjectId,
        created_date: Date,
        amount: Number,
        amount_type: String,
        type: String,
        hostId: mongoose.ObjectId,
        moderator: mongoose.ObjectId,
    }, { collection: 'agent_transactions' })

    const AgentTransaction = mongoose.model('AgentTransaction', AgentTransactionSchema)
    instance.decorate('AgentTransaction', AgentTransaction)

    const OrderSchema = new mongoose.Schema({
        organization: String,
        items: Array,
        address: String,
        intercom: String,
        entrance: String,
        floor: String,
        description: String,
        ofis: String,
        total: Number,
        order_number: Number,
        skipped_drivers: Array,
        driver_id: mongoose.ObjectId,
        client_id: mongoose.ObjectId,
        region_id: mongoose.ObjectId,
        from_location: Object,
        location: Object,
        time: Number,
        images: Array,
        state: String,
        created_time: Date,
        accept_time: Date,
        pickup_time: Date,
        completed_time: Date,
        rate: Number,
        delivery: Number,
        moderator_id: mongoose.ObjectId,
    }, { collection: 'beeto_orders' })

    const BeeToOrders = mongoose.model('BeeToOrders', OrderSchema)
    instance.decorate('BeeToOrders', BeeToOrders)

    next();
})
