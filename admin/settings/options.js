
async function options_get(request, reply, instance) {
    try {
        const user = request.user;
        const options = await instance.FeeOptions.find({
            organization: user.organization
        });
        reply.ok(options)
    } catch (error) {
        reply.error(error.message)
    }
    return reply;
}

async function options_create(request, reply, instance) {
    try {
        const user = request.user;
        const { name } = request.body;
        const result = await new instance.FeeOptions({ name, organization: user.organization }).save();
        reply.ok(result)
    } catch (error) {
        reply.error(error.message)
    }
    return reply;
}

async function options_update(request, reply, instance) {
    try {
        const { name, _id } = request.body;
        const user = request.user;
        const option = await instance.FeeOptions.findOne({ _id, organization: user.organization });
        if (!option) {
            return reply.fourorfour('option')
        }
        const result = await instance.FeeOptions.findByIdAndUpdate(
            option._id,
            {
                $set: {
                    name
                }
            },
            {
                new: true
            }
        );

        reply.ok(result)
    } catch (error) {
        reply.error(error.message)
    }
    return reply;
}

async function options_delete(request, reply, instance) {
    try {
        const { _id } = request.body;
        const user = request.user;
        const result = await instance.FeeOptions.deleteOne({ _id, organization: user.organization });
        reply.ok(result)
    } catch (error) {
        reply.error(error.message)
    }
    return reply;
}

async function options_delete_group(request, reply, instance) {
    try {
        const { indexes } = request.body;
        const user = request.user;
        const result = await instance.FeeOptions.deleteMany({ _id: { $in: indexes }, organization: user.organization });
        reply.ok(result)
    } catch (error) {
        reply.error(error.message)
    }
    return reply;
}

module.exports = ((instance, _, next) => {

    instance.post(
        '/settings/options/get',
        {
            version: '1.0.0',
            preValidation: [instance.authorize_admin]
        },
        (request, reply) => {
            options_get(request, reply, instance)
        }
    );

    instance.post(
        '/settings/options/create',
        {
            version: '1.0.0',
            preValidation: [instance.authorize_admin]
        },
        (request, reply) => {
            options_create(request, reply, instance)
        }
    );

    instance.post(
        '/settings/options/update',
        {
            version: '1.0.0',
            preValidation: [instance.authorize_admin]
        },
        (request, reply) => {
            options_update(request, reply, instance)
        }
    );

    instance.post(
        '/settings/options/delete',
        {
            version: '1.0.0',
            preValidation: [instance.authorize_admin]
        },
        (request, reply) => {
            options_delete(request, reply, instance)
        }
    );

    instance.post(
        '/settings/options/delete-group',
        {
            version: '1.0.0',
            preValidation: [instance.authorize_admin]
        },
        (request, reply) => {
            options_delete_group(request, reply, instance)
        }
    );

    next()
});
