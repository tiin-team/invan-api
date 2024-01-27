/**
 * 
 * @param {import("fastify").FastifyInstance} instance 
 * @param {{_id: string; name: string; organization: string}} user 
 * @param {{_id: string; name: string}} first_service 
 * @param {{_id: string; name: string}} second_service 
 * @param {*} page 
 * @returns 
 */
async function updateItemPrices(
    instance, user,
    first_service, second_service, page = 1
) {
    try {
        console.log('On page', page);
        const $match = {
            $match: { organization: user.organization }
        }
        const limit = 50;
        const $sort = {
            $sort: {
                _id: 1
            }
        }
        const $skip = {
            $skip: limit * (page - 1)
        }
        const $limit = {
            $limit: limit
        }

        const items = await instance.goodsSales.aggregate([
            $match,
            $sort,
            $skip,
            $limit
        ]).allowDiskUse(true).exec();
        const priceChangeHistories = []
        for (const item of items) {
            let price, prices = [];
            let old_price, old_prices = [];
            let is_all_zero = true;
            for (const s of item.services) {
                if (s.service + '' == second_service._id + '') {
                    old_price = s.price
                    old_prices = s.prices
                }

                if (s.service + '' == first_service._id + '') {
                    price = s.price;
                    prices = s.prices;
                    if (prices instanceof Array) {
                        for (const p of prices) {
                            if (p.price > 0) {
                                is_all_zero = false;
                            }
                        }
                    }
                }
            }

            if (is_all_zero) {
                continue;
            }

            instance.goodsSales.updateOne(
                {
                    _id: item._id,
                    services: {
                        $elemMatch: {
                            $or: [
                                {
                                    service: instance.ObjectId(second_service._id)
                                },
                                {
                                    service: second_service._id + ''
                                }
                            ]
                        }
                    }
                },
                {
                    $set: {
                        'services.$.prices': prices,
                        'services.$.price': price,
                        last_price_change: new Date().getTime(),
                        last_updated: new Date().getTime(),
                    }
                },
                () => { }
            );

            if (old_price != price || old_prices.length >= 1) {
                priceChangeHistories.push({
                    organization: user.organization,
                    service: second_service._id,
                    service_name: second_service.name,
                    date: Date.now(),
                    product_id: item._id,
                    product_name: item.name,
                    old_price: old_price,
                    new_price: price,
                    old_prices: old_prices,
                    new_prices: prices,
                    employee_id: user._id,
                    employee_name: user.name,
                    type: old_price != price ? 'price' : 'prices',
                })
            }
        }
        await new instance.itemPriceChangeHistory.insertMany(priceChangeHistories)

        console.log('Processing items finished on page', page);
        if (items.length < limit) {
            return await instance.ProcessModel.setProcessing({ organization: user.organization }, false);
        }

        return updateItemPrices(instance, user, first_service, second_service, page + 1);
    } catch (error) {
        console.log(error.message)
        await instance.ProcessModel.setProcessing(
            {
                organization: user.organization
            },
            false
        )
    }
}

/**
 * 
 * @param {import("fastify").FastifyInstance} instance 
 * @param {{_id: string; name: string; organization: string}} user 
 * @param {{_id: string; name: string}} first_service 
 * @param {{_id: string; name: string}} second_service 
 * @param {*} page 
 * @returns 
 */
async function updateItemPrice(
    instance, user, first_service, second_service, page = 1, limit = 50
) {
    try {
        console.log('On page', page);
        const $match = {
            $match: { organization: user.organization }
        }

        const $sort = {
            $sort: { _id: 1 }
        }
        const $skip = {
            $skip: limit * (page - 1)
        }
        const $limit = {
            $limit: limit
        }

        const items = await instance.goodsSales.aggregate([
            $match,
            $sort,
            $skip,
            $limit
        ]).allowDiskUse(true).exec();

        const priceChangeHistories = []

        for (const item of items) {
            let price, prices = [];
            let old_price, old_prices = [];
            let is_all_zero = true;
            for (const s of item.services) {
                if (s.service + '' == second_service._id + '') {
                    old_price = s.price
                    old_prices = s.prices
                }

                if (s.service + '' == first_service._id + '') {
                    price = s.price;
                    prices = s.prices;
                    if (price > 0) {
                        is_all_zero = false;
                    }
                }
            }

            if (is_all_zero) {
                continue;
            }

            instance.goodsSales.updateOne(
                {
                    _id: item._id,
                    services: {
                        $elemMatch: {
                            $or: [
                                {
                                    service: instance.ObjectId(second_service._id)
                                },
                                {
                                    service: second_service._id + ''
                                }
                            ]
                        }
                    }
                },
                {
                    $set: {
                        'services.$.prices': prices,
                        'services.$.price': price,
                        last_price_change: new Date().getTime(),
                        last_updated: new Date().getTime(),
                    }
                },
                () => { }
            );

            if (old_price != price || old_prices.length >= 1) {
                priceChangeHistories.push({
                    organization: user.organization,
                    service: second_service._id,
                    service_name: second_service.name,
                    date: Date.now(),
                    product_id: item._id,
                    product_name: item.name,
                    old_price: old_price,
                    new_price: price,
                    old_prices: old_prices,
                    new_prices: prices,
                    employee_id: user._id,
                    employee_name: user.name,
                    type: old_price != price ? 'price' : 'prices',
                })
            }
        }
        await new instance.itemPriceChangeHistory.insertMany(priceChangeHistories)

        console.log('Processing items finished on page', page);
        if (items.length < limit) {
            return await instance.ProcessModel.setProcessing({ organization: user.organization }, false);
        }

        return updateItemPrice(instance, user, first_service_id, second_service._id, page + 1);
    } catch (error) {
        console.log(error.message)
        await instance.ProcessModel.setProcessing(
            {
                organization: user.organization
            },
            false
        )
    }
}

async function itemsPricesSet(request, reply, instance, multi_price = true) {
    try {
        const user = request.user;
        const { first_service_id, second_service_id } = request.body;
        const first_service = await instance.services.findOne({
            _id: first_service_id,
            organization: user.organization
        })
            .lean();
        const second_service = await instance.services.findById({
            _id: second_service_id,
            organization: user.organization
        })
            .lean();
        if (!first_service || !second_service) {
            return reply.fourorfour('store')
        }

        const process = await instance.ProcessModel.findProcess({
            organization: user.organization
        });
        if (process.processing) {
            return reply.allready_exist('processing')
        }

        await instance.ProcessModel.setProcessing({ organization: process.organization }, true);
        if (multi_price)
            await updateItemPrices(instance, user, first_service, second_service, 1, 100);
        else
            await updateItemPrice(instance, user, first_service, second_service, 1, 100);

        reply.ok();
    } catch (error) {
        reply.error(error.message)
    }
    return reply;
}

async function itemsPricesCheck(request, reply, instance) {
    try {
        const user = request.user;
        const process = await instance.ProcessModel.findProcess({
            organization: user.organization
        });
        reply.ok(process)
    } catch (error) {
        reply.error(error.message)
    }
    return reply;
}

module.exports = ((instance, _, next) => {

    const schema = {
        schema: {
            body: {
                type: 'object',
                additionalProperties: false,
                required: [
                    'first_service_id',
                    'second_service_id'
                ],
                properties: {
                    first_service_id: {
                        type: 'string',
                        minLength: 24,
                        maxLength: 24
                    },
                    second_service_id: {
                        type: 'string',
                        minLength: 24,
                        maxLength: 24
                    }
                }
            }
        }
    }

    instance.post(
        '/items/prices/set/by-store',
        {
            ...schema,
            version: '1.0.0',
            preValidation: [instance.authorize_admin],
            attachValidation: true
        },
        (request, reply) => {
            if (request.validationError) {
                return reply.validation(request.validationError.message)
            }
            return itemsPricesSet(request, reply, instance);
        }
    )

    instance.post(
        '/items/price/set/by-store',
        {
            ...schema,
            version: '1.0.0',
            preValidation: [instance.authorize_admin],
            attachValidation: true
        },
        (request, reply) => {
            if (request.validationError) {
                return reply.validation(request.validationError.message)
            }
            return itemsPricesSet(request, reply, instance, false);
        }
    )

    instance.get(
        '/items/prices/set/by-store/check',
        {
            version: '1.0.0',
            preValidation: [instance.authorize_admin],
        },
        (request, reply) => {
            return itemsPricesCheck(request, reply, instance);
        }
    )

    next()
})
