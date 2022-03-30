const fp = require('fastify-plugin')

async function addStockHandler(request, reply, instance) {
    try {
        const { _id, add_stock } = request.body;
        
        const service_id = request.headers['accept-service'];
        const service = await instance.services.findById(service_id);
        if(!service) {
            return reply.fourorfour('Service')
        }

        const exist_item = await instance.goodsSales.findById(_id);
        if(!exist_item) {
            return reply.fourorfour('')
        }
        let in_stock;
        let item_in_stock;
        for(const s of exist_item.services) {
            if(s.service+'' == service_id+'') {
                item_in_stock = s.in_stock
            }
        }
        if(typeof item_in_stock != typeof 5) {
            if(+item_in_stock == 0 || +item_in_stock) {
                item_in_stock = +item_in_stock
            }
            else {
                item_in_stock = 0
            }

            await instance.goodsSales.updateOne(
                {
                    _id: _id,
                    services: {
                        $elemMatch: {
                            service: service._id
                        }
                    }
                },
                {
                    $set: {
                        'services.$.in_stock': item_in_stock+add_stock,
                        last_stock_updated: new Date().getTime(),
                        last_updated: new Date().getTime()
                    }
                }
            )
            in_stock = item_in_stock+add_stock
        }
        else {
            const item = await instance.goodsSales.findOneAndUpdate(
                {
                    _id: _id,
                    services: {
                        $elemMatch: {
                            service: service._id
                        }
                    }
                },
                {
                    $inc: {
                        'services.$.in_stock': add_stock
                    },
                    $set: {
                        last_stock_updated: new Date().getTime(),
                        last_updated: new Date().getTime()
                    }
                },
                { new: true }
            );

            if(!item) {
                return reply.fourorfour('Item')
            }
            for(const s of item.services) {
                if(s.service+'' == service_id+'') {
                    in_stock = s.in_stock
                }
            }
        }

        const user = request.user;
        if(add_stock) {
            await instance.create_inventory_history(user, 'item edit', '', service_id, exist_item._id, exist_item.cost, add_stock, in_stock, new Date().getTime())
        }
        reply.ok()

    } catch (error) {
        reply.error(error.message)
    }
    return reply;
}

module.exports = fp((instance, _, next) => {

    const bodySchema = {
        body: {
            type: 'object',
            required: [
                'add_stock',
                '_id'
            ],
            properties: {
                add_stock: {
                    type: 'number',
                    minimum: 0
                },
                _id: {
                    type: 'string',
                    minLength: 24,
                    maxLength: 24
                }
            }
        }
    }

    instance.post(
        '/items/add-stock',
        {
            version: '1.0.0',
            schema: bodySchema,
            attachValidation: true,
            preValidation: [instance.authorize_employee]
        },
        (request, reply) => {
            if(request.validationError) {
                return reply.validation(request.validationError.message)
            }
            return addStockHandler(request, reply, instance)
        }
    )

    next()
})
