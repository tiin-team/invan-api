
const fs = require('fs');
async function downloadCsv(request, reply, instance) {
    try {
        const { organization, service } = request.params;
        const itemsQuery = {
            $match: {
                organization: organization
            }
        }

        const unWindServices = {
            $unwind: {
                path: '$services'
            }
        }

        const serviceMatch = {
            $match: {
                $or: [
                    {
                        'services.service': {
                            $eq: instance.ObjectId(service + '')
                        }
                    },
                    {
                        'services.service': {
                            $eq: service + ''
                        }
                    }
                ]
            }
        }

        const necessaryFields = {
            $project: {
                name: '$name',
                sku: '$sku',
                price: '$services.price',
                prices: '$services.prices',
                sold_by: '$sold_by',
            }
        }

        const items = await instance.goodsSales.aggregate([
            itemsQuery,
            unWindServices,
            serviceMatch,
            necessaryFields
        ])
            .allowDiskUse(true)
            .exec();

        const items_arr = [];
        for (const index in items) {
            const item = items[index];
            const item_ar = [];
            item_ar.push(+index + 1);
            item_ar.push(item.name);
            item_ar.push('');
            item_ar.push(item.price);
            item_ar.push('0');
            item_ar.push('0');
            item_ar.push('0');
            item_ar.push(item.sku);
            item_ar.push('0');
            item_ar.push('0');
            item_ar.push('');
            item_ar.push('01.01.01');
            item_ar.push(item.sold_by == 'each' ? '1' : '0');
            items_arr.push(item_ar)
            // itemsText += `${+index + 1};${items[index].name};;${price};0;0;0;${items[index].sku};0;0;;01.01.01;0;\n`;
        }
        const CSVString = items_arr.join('\n');
        const file = '_ITEMS.csv'
        fs.writeFile('./static/' + file, CSVString, (err) => {
            if (err) {
                instance.send_Error('writing to file', JSON.stringify(err))
            }
            reply.sendFile('./' + file, (err) => {
                instance.send_Error('on sending file', JSON.stringify(err))
            })
            setTimeout(() => {
                fs.unlink('./static/' + file, (err) => {
                    if (err) {
                        instance.send_Error('exported items file', JSON.stringify(err))
                    }
                })
            }, 1000)
        });
    } catch (error) {
        reply.error(error.message)
    }
    return reply;
}


async function downloadMettletoledoItems(request, reply, instance) {
    try {
        const org_id = request.params.organization;
        const service_id = request.params.service;
        const organization = await instance.organizations.findById(org_id);
        if (!organization) {
            return reply.fourorfour('Organization')
        }
        const service = await instance.services.findById(service_id);
        if (!service) {
            return reply.error('Service')
        }

        const itemsQuery = {
            $match: {
                organization: org_id,
                sold_by: 'weight'
            }
        }

        const unWindServices = {
            $unwind: {
                path: '$services'
            }
        }

        const serviceMatch = {
            $match: {
                $or: [
                    {
                        'services.service': {
                            $eq: instance.ObjectId(service_id + '')
                        }
                    },
                    {
                        'services.service': {
                            $eq: service_id + ''
                        }
                    }
                ]
            }
        }

        const necessaryFields = {
            $project: {
                name: '$name',
                sku: '$sku',
                price: '$services.price',
                prices: '$services.prices',
                sold_by: '$sold_by'
            }
        }

        const items = await instance.goodsSales.aggregate([
            itemsQuery,
            unWindServices,
            serviceMatch,
            necessaryFields
        ])
            .allowDiskUse(true)
            .exec();

        const timeStamp = new Date().getTime()
        let itemsText = '';

        for (const index in items) {
            let price = items[index].price;
            if (!(items[index].prices instanceof Array)) {
                items[index].prices = []
            }
            if (items[index].prices.length > 0 && items[index].prices[0].price) {
                price = items[index].prices[0].price
            }
            if (!items[index].name) {
                items[index].name = ''
            }
            if (typeof items[index].name == typeof 'invan') {
                items[index].name = items[index].name.replace(/,/g, '.')
            }

            // itemsText += `${+index + 1};${items[index].name};;${price};0;0;0;${items[index].sku};0;0;;01.01.01;${items[index].sold_by == 'each' ? '1' : '0'};\n`;
            const rounded_price = Math.round(price) / 100;
            itemsText += `${items[index].sku},${items[index].sku},0,${rounded_price},0,0,0,0,0,0,0,0,0,${items[index].name},\n`;
        }
        itemsText = itemsText.replace(/\n/g, '\r\n')
        fs.writeFile(`./static/${timeStamp}.txt`, itemsText, function (err, data) {
            reply.sendFile(`./${timeStamp}.txt`)
            setTimeout(() => {
                fs.unlink(`./static/${timeStamp}.txt`, (err) => {
                    if (err) {
                        instance.send_Error('exported ' + timeStamp + ' file', JSON.stringify(err))
                    }
                })
            }, 2000);
        })

    } catch (error) {
        reply.error(error.message)
    }
    return reply;
}

async function downloadMettletoledoSPCT1Items(request, reply, instance) {
    try {
        const org_id = request.params.organization;
        const service_id = request.params.service;
        const organization = await instance.organizations.findById(org_id);
        if (!organization) {
            return reply.fourorfour('Organization')
        }
        const service = await instance.services.findById(service_id);
        if (!service) {
            return reply.error('Service')
        }

        const itemsQuery = {
            $match: {
                organization: org_id,
                sold_by: 'weight'
            }
        }

        const unWindServices = {
            $unwind: {
                path: '$services'
            }
        }

        const serviceMatch = {
            $match: {
                $or: [
                    {
                        'services.service': {
                            $eq: instance.ObjectId(service_id + '')
                        }
                    },
                    {
                        'services.service': {
                            $eq: service_id + ''
                        }
                    }
                ]
            }
        }

        const necessaryFields = {
            $project: {
                name: '$name',
                sku: '$sku',
                price: '$services.price',
                prices: '$services.prices',
                sold_by: '$sold_by'
            }
        }

        const items = await instance.goodsSales.aggregate([
            itemsQuery,
            unWindServices,
            serviceMatch,
            necessaryFields
        ])
            .allowDiskUse(true)
            .exec();

        const timeStamp = new Date().getTime()
        let itemsText = '';

        for (const index in items) {
            let price = items[index].price;
            if (!(items[index].prices instanceof Array)) {
                items[index].prices = []
            }
            if (items[index].prices.length > 0 && items[index].prices[0].price) {
                price = items[index].prices[0].price
            }
            if (!items[index].name) {
                items[index].name = ''
            }
            if (typeof items[index].name == typeof 'invan') {
                items[index].name = items[index].name.replace(/,/g, '.')
            }

            // itemsText += `${+index + 1};${items[index].name};;${price};0;0;0;${items[index].sku};0;0;;01.01.01;${items[index].sold_by == 'each' ? '1' : '0'};\n`;
            const rounded_price = Math.round(price) / 100;
            itemsText += `${items[index].sku},${items[index].sku},0,${rounded_price},0,0,0,0,0,0,0,0,0,${items[index].name}\n`;
        }

        itemsText = itemsText.replace(/\n/g, '\r\n')
        // const buffer = Buffer.from(itemsText, 'latin1')

        fs.writeFile(`./static/${timeStamp}.txt`, itemsText, function (err, data) {
            reply.sendFile(`./${timeStamp}.txt`)
            setTimeout(() => {
                fs.unlink(`./static/${timeStamp}.txt`, (err) => {
                    if (err) {
                        instance.send_Error('exported ' + timeStamp + ' file', JSON.stringify(err))
                    }
                })
            }, 2000);
        })

    } catch (error) {
        reply.error(error.message)
    }
    return reply;
}

module.exports = ((instance, _, next) => {

    instance.get(
        '/items/get/shtrix-m/csv/:organization/:service/:name',
        (request, reply) => {
            return downloadCsv(request, reply, instance)
        }
    )

    instance.get(
        '/items/get/mettletoledo/:organization/:service/:name',
        (request, reply) => {
            return downloadMettletoledoItems(request, reply, instance);
        }
    )
    instance.get(
        '/items/get/mettletoledo-spct1/:organization/:service/:name',

        (request, reply) => {
            return downloadMettletoledoSPCT1Items(request, reply, instance)
        }
    )
    next()
})