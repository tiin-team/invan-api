const fp = require('fastify-plugin');

async function getReceiptNumber(instance, organization, check_id) {
    try {
        const pos_device = await instance.posDevices.findOneAndUpdate(
            {
                organization: organization,
                check_id: check_id,
                back_office: true,
            },
            {
                $set: {
                    is_active: true,
                    status: true
                },
                $inc: {
                    receipt_no: 1,
                }
            },
            {
                new: true, upsert: true
            }
        );
        return `${pos_device.check_id}${pos_device.receipt_no}`;
    }
    catch (error) {
        console.log(error.message)
        return null;
    }
}

module.exports = fp((instance, _, next) => {

    instance.decorate('getReceiptNumber', getReceiptNumber)

    next();
})