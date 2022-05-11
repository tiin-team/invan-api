module.exports = (instance, options, next) => {

    var get_services = (request, reply, admin) => {
        // instance.services.find({
        //     organization: admin.organization
        // }, { name: 1, address: 1, count: 1 }, (err, services) => {
        //     if (services == null) {
        //         services = []
        //     }
        //     reply.ok(services)
        // })
        instance.services.aggregate([
            {
                $match: {
                    organization: admin.organization
                }
            },
            {
                $lookup: {
                    from: 'posdevices',
                    localField: '_id',
                    foreignField: 'service_id',
                    as: 'count'
                },
            },
            // {
            //     $lookup: {
            //         from: 'settingreceipts',
            //         localField: '_id',
            //         foreignField: 'service',
            //         as: 'settingsReceipt'
            //     }
            // },
        ], async (err, services) => {
            if (services == null) {
                services = []
            }
            for (let i = 0; i < services.length; i++) {
                services[i].count = services[i].count.length
                services[i].settingReceipt = await instance.settingReceipt.findOne({ service: services[i]._id }).lean()
            }

            reply.ok(services)
        })
    }
    const get_services_new = (request, reply, admin) => {
        const user_available_services = admin.services.map(serv => serv.service + '')
        const $match = {
            $match: {
                organization: admin.organization,
            }
        }
        // if (admin.role !== 'boss')
        //     $match.$match._id = { $in: user_available_services }

        instance.services.aggregate([
            $match,
            { $addFields: { "service_id": { $toString: "$_id" } } },
            {
                $lookup: {
                    from: 'settingreceipts',
                    localField: 'service_id',
                    foreignField: 'service',
                    as: 'settingReceipt'
                }
            },
            { $addFields: { settingReceipt: { $first: "$settingReceipt" } } }
        ], (err, services) => {
            if (services == null || err) {
                services = []
            }
            // data = []
            // if (admin.role == 'boss') {
            //     data = services
            // } else
            //     for (let i = 0; i < services.length; i++) {
            //         serv = admin.services.find(
            //             (elem) => elem.available && elem.service.toString() == services[i]._id.toString()
            //         )
            //         if (serv && serv.available) {
            //             data.push(services[i])
            //         }
            //     }
            reply.ok(services)
        })
    }
    instance.get('/services/get', options.version, (request, reply) => {
        instance.oauth_admin(request, reply, (admin) => {
            get_services_new(request, reply, admin)
        })
    })
    instance.get('/tiin/services/get', (request, reply) => {
        get_services_new(request, reply, { organization: '5f5641e8dce4e706c062837a', role: 'boss' })
    })
    // get by id

    const get_service = async (request, reply, admin) => {
        try {
            const service_id = request.params.id
            const service = await instance.services
                .findOne({ _id: service_id, organization: admin.organization })
                .lean();
            if (!service) {
                return reply.fourorfour('Service');
            }

            const settingReceipt = await instance.settingReceipt
                .findOne({ service: service_id })
                .lean();
            service.receipt = settingReceipt
            return reply.ok(service);
        } catch (error) {
            return reply.error(error.message)
        }
    }

    instance.get(
        '/service/get/:id',
        {
            ...options.version,
            preHandler: (request, reply, done) => {
                instance.authorization(request, reply, (user) => {
                    if (!user) {
                        return instance.unauthorized(reply)
                    }
                    done();
                })
            }
        },
        (request, reply) => {
            const user = request.user
            get_service(request, reply, user)
        }
    )

    next()
}
