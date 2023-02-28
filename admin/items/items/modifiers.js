
const searchModifiers = async function(request, reply, instance) {
    try {
        const { limit, page } = request.params;
        const { service } = request.body;
        const user = request.user;
        const modifiersQuery = {
            organization: user.organization
        }
        if(service && service.length == 24) {
            modifiersQuery.services = {
                $elemMatch: {
                    service: service,
                    available: true
                }
            }
        }
        const modifiers_count = await instance.Modifiers.countDocuments(modifiersQuery);
        const modifiers = await instance.Modifiers.find(modifiersQuery).sort({_id: 1}).skip(limit*(page-1)).limit(limit);
        reply.ok({
            total: modifiers_count,
            page: Math.ceil(modifiers_count/limit),
            data: modifiers
        })
    } catch (error) {
        reply.error(error.message)
    }
}

const createModifier = async function (request, reply, instance) {
    try {
        const user = request.user;
        request.body.organization = user.organization;
        const { _id: id } = await new instance.Modifiers(request.body).save()
        reply.ok(id)
    } catch (error) {
        reply.error(error.message)
    }
}

const updateModifier = async function (request, reply, instance) {
    try {
        const { id } = request.params;
        const modifier = await instance.Modifiers.findById(id);
        if(!modifier) {
            return reply.fourorfour('Modifier')
        }
        await instance.Modifiers.updateOne(
            { _id: id },
            {
                $set: request.body
            }
        )
        reply.ok(modifier._id)
    } catch (error) {
        reply.error(error.message)
    }
}

module.exports = ((instance, options, next) => {

    const getModifierById = async (request, reply) => {
        try {
            const id = request.params.id
            const user = request.user
            const modifier = await instance.Modifiers.findById(id)
            if(!modifier) {
                return reply.fourorfour('modifier')
            }
            if(typeof modifier.services != typeof []) {
                modifier.services=[]
            }
            const sObj={}
            for(const s of modifier.services) {
                try {
                    sObj[s.service] = s.toObject()
                }
                catch(error) {
                instance.send_Error('to Object', error.message)
                }
            }
            const services = await instance.services.find({ organization: user.organization })
            const mod_services = []
            for(const s of services) {
                if(sObj[s._id]) {
                    mod_services.push({
                        ...sObj[s._id],
                        service_name: s.name
                    })
                }
                else {
                    mod_services.push({
                        service: s._id,
                        service_name: s.name
                    })
                }
            }
            modifier.services = mod_services
            return reply.ok(modifier)
        } catch (error) {
            return reply.error(error.message)
        }
    }

    instance.get('/items/modifier/get/:id', options.version, (request, reply) => {
        instance.oauth_admin(request, reply, (user) => {
            return getModifierById(request, reply)
        })
    })
    
    const searchModifiersSchema = {
        params: {
            type: 'object',
            required: [
                'limit', 'page'
            ],
            properties: {
                limit: {
                    type: 'number',
                    minimum: 1
                },
                page: {
                    type: 'number',
                    minimum: 1
                }
            }
        },
        body: {
            type: 'object',
            required: ['service'],
            properties: {
                service: {
                    oneOf: [
                        {
                            type: 'string'
                        }
                    ]
                }
            }
        }
    }

    instance.post(
        '/items/modifiers/searching/:limit/:page',
        {
            version: '1.0.0',
            schema: searchModifiersSchema,
            attachValidation: true
        },
        (request, reply) => {
            if(request.validationError) {
                return reply.validation(request.validationError.message)
            }
            instance.oauth_admin(request, reply, (user) => {
                request.user = user;
                searchModifiers(request, reply, instance)
            })
        }
    )

    const ModifiersSchema = {
        body: {
            type: 'object',
            additionalProperties: false,
            required: [
                'name', 'options', 'services'
            ],
            properties: {
                name: { type: 'string', minLength: 1 },
                options: {
                    type: 'array',
                    minItems: 1,
                    items: {
                        type: 'object',
                        required: [
                            'option_name', 'price'
                        ],
                        additionalProperties: false,
                        properties: {
                            option_name: { type: 'string', minLength: 1 },
                            price: { type: 'number' }
                        }
                    }
                },
                services: {
                    type: 'array',
                    minItems: 1,
                    items: {
                        type: 'object',
                        required: ['available', 'service'],
                        additionalProperties: false,
                        properties: {
                            available: { type: 'boolean' },
                            service: {
                                type: 'string',
                                minLength: 24,
                                maxLength: 24
                            },
                            service_name: { type: 'string' }
                        }
                    }
                }
            }
        }
    }

    instance.post(
        '/items/modifiers/create',
        {
            version: '1.0.0',
            schema: ModifiersSchema,
            attachValidation: true
        },
        (request, reply) => {
            if(request.validationError) {
                return reply.validation(request.validationError.message)
            }
            instance.oauth_admin(request, reply, (user) => {
                request.user = user;
                createModifier(request, reply, instance)
            })
        }
    )

    instance.post(
        '/items/modifiers/update/:id',
        {
            version: '1.0.0',
            schema: ModifiersSchema,
            attachValidation: true
        },
        (request, reply) => {
            if(request.validationError) {
                return reply.validation(request.validationError.message)
            }
            instance.oauth_admin(request, reply, (user) => {
                request.user = user;
                updateModifier(request, reply, instance)
            })
        }
    )

    next()
})
