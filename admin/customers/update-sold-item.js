
async function updateSoldItem(request, reply, instance) {
    try {
        const user = request.user;
        let { receipt_id, sold_id, value, price, customer_id } = request.body;
        const customer = await instance.clientsDatabase
            .findById(customer_id)
            .lean();
        if (!customer) {
            return reply.fourorfour('Customer')
        }

        if (!customer.debt) {
            customer.debt = 0;
        }
        const receipt = await instance.Receipts
            .findById(receipt_id)
            .lean();
        if (!receipt) {
            return reply.fourorfour('Receipt')
        }
        // try {
        //     sold_id = instance.ObjectId(sold_id)
        // } catch (error) { }
        const sold_item_list = [];
        let total_price = receipt.total_price;
        let payment = receipt.payment;
        for (const s of receipt.sold_item_list) {
            if (s._id + '' == sold_id + '') {
                try {
                    total_price -= (s.value * s.price);
                    s.total_debt -= (s.value * s.price);
                    customer.debt -= (s.value * s.price);
                    payment[0].value -= (s.value * s.price);
                }
                catch (error) {
                    console.log(error.message)
                }
                if (!(s.edit_history instanceof Array)) {
                    s.edit_history = [];
                }

                s.edit_history.push({
                    value: value,
                    price: price,
                    user_id: user._id
                })
                s.value = value;
                s.price = price;
                try {
                    total_price += (s.value * s.price);
                    s.total_debt += (s.value * s.price);
                    customer.debt += (s.value * s.price);
                    payment[0].value += (s.value * s.price);
                }
                catch (error) {
                    console.log(error.message)
                }
            }
            sold_item_list.push(s)
        }

        await instance.Receipts.updateOne(
            { _id: receipt_id },
            {
                $set: {
                    sold_item_list: sold_item_list,
                    total_price: total_price,
                    payment: payment
                }
            }
        );

        await instance.clientsDatabase.updateOne(
            { _id: customer._id },
            {
                $set: {
                    debt: customer.debt
                }
            }
        )

        reply.ok({ receipt_id })
    } catch (error) {
        reply.error(error.message)
    }
    return reply;
}

async function updateSoldItemGroup(request, reply, instance) {
    try {
        const user = request.user;
        // let { receipt_id, sold_id, value, price, customer_id } = request.body;
        let { receipt_id, customer_id } = request.body;
        const customer = await instance.clientsDatabase
            .findById(customer_id)
            .lean();
        if (!customer) {
            return reply.fourorfour('Customer')
        }

        if (!customer.debt) {
            customer.debt = 0;
        }
        const receipt = await instance.Receipts
            .findById(receipt_id)
            .lean();
        if (!receipt) {
            return reply.fourorfour('Receipt')
        }

        const soldItemObj = {}
        for (const item of request.body.sold_item_list) {
            soldItemObj[item.sold_id] = item
        }

        // try {
        //     sold_id = instance.ObjectId(sold_id)
        // } catch (error) { }
        const sold_item_list = [];
        let total_price = receipt.total_price;
        let payment = receipt.payment;
        for (const s of receipt.sold_item_list) {
            if (soldItemObj[s._id]) {
                const debt = payment.find(p => p.name == "debt")

                try {
                    total_price -= (s.value * s.price);
                    s.total_debt -= (s.value * s.price);
                    customer.debt -= (s.value * s.price);
                    debt.value -= (s.value * s.price);
                }
                catch (error) {
                    console.log(error.message)
                }
                if (!(s.edit_history instanceof Array)) {
                    s.edit_history = [];
                }

                s.edit_history.push({
                    value: soldItemObj[s._id].value,
                    price: soldItemObj[s._id].price,
                    user_id: user._id
                })
                s.value = soldItemObj[s._id].value;
                s.price = soldItemObj[s._id].price;
                try {
                    total_price += (s.value * s.price);
                    s.total_debt += (s.value * s.price);
                    customer.debt += (s.value * s.price);
                    debt.value += (s.value * s.price);
                }
                catch (error) {
                    console.log(error.message)
                }
            }
            sold_item_list.push(s)
        }

        await instance.Receipts.updateOne(
            { _id: receipt_id },
            {
                $set: {
                    sold_item_list: sold_item_list,
                    total_price: total_price,
                    payment: payment
                }
            }
        );

        await instance.clientsDatabase.updateOne(
            { _id: customer._id },
            {
                $set: {
                    debt: customer.debt
                }
            }
        )

        reply.ok({ receipt_id })
    } catch (error) {
        reply.error(error.message)
    }
    return reply;
}

module.exports = ((instance, _, next) => {

    const bodySchema = {
        body: {
            type: 'object',
            additionalProperties: false,
            required: [
                'sold_id', 'receipt_id',
                'value', 'price', 'customer_id'
            ],
            properties: {
                sold_id: {
                    type: 'string',
                    minLength: 24,
                    maxLength: 24
                },
                receipt_id: {
                    type: 'string',
                    minLength: 24,
                    maxLength: 24
                },
                value: {
                    type: 'number'
                },
                price: {
                    type: 'number'
                },
                customer_id: {
                    type: 'string',
                    minLength: 24,
                    maxLength: 24
                }
            }
        }
    }

    instance.post(
        '/customer/update-sold-item',
        {
            scheme: bodySchema,
            attachValidation: true,
            version: '1.0.0',
            preValidation: instance.authorize_admin,
        },
        (request, reply) => {
            if (request.validationError) {
                return reply.validation(request.validationError.message)
            }
            return updateSoldItem(request, reply, instance)
        }
    )

    const groupBFodySchema = {
        body: {
            type: 'object',
            additionalProperties: false,
            required: [
                'receipt_id', 'customer_id'
            ],
            customer_id: {
                type: 'string',
                minLength: 24,
                maxLength: 24,
            },
            receipt_id: {
                type: 'string',
                minLength: 24,
                maxLength: 24,
            },
            sold_item_list: {
                type: 'array',
                required: [
                    'sold_id', 'value', 'price',
                ],
                items: {
                    sold_id: {
                        type: 'string',
                        minLength: 24,
                        maxLength: 24
                    },
                    value: {
                        type: 'number'
                    },
                    price: {
                        type: 'number'
                    },
                }
            }
        }
    }
    instance.post(
        '/customer/group-update-sold-item',
        {
            scheme: groupBFodySchema,
            attachValidation: true,
            version: '1.0.0',
            preValidation: instance.authorize_admin,
        },
        (request, reply) => {
            if (request.validationError) {
                return reply.validation(request.validationError.message)
            }
            return updateSoldItemGroup(request, reply, instance)
        }
    )

    next()
})
