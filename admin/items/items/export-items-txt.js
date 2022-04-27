
const ExcelJs = require('exceljs');
const fs = require('fs');
const path = require('path');

module.exports = ((instance, _, next) => {

  instance.get(
    '/items/get/excel/:organization/:service/:name',
    async (request, reply) => {
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
            price: '$services.price'
          }
        }

        const items = await instance.goodsSales.aggregate([
          itemsQuery,
          unWindServices,
          serviceMatch,
          necessaryFields
        ])

        const timeStamp = new Date().getTime()

        const rows = []
        for (const it of items) {
          rows.push({
            PluCode: it.sku,
            UnitPrice: it.price,
            UnitWeight: 0,
            PluName: it.name,
            Discount: 0,
            PluNo: it.sku,
            ValidDate: 0,
            Tare: 0,
            SaleType: 0,
            DateType: 0,
            ManualMessage: 0,
            PriceChangeable: 0,
            DiscountMethod: 0,
            Transferable: "TRUE",
            MeasurementMethod: 0,
            Department: 0,
            Counter: 0,
            WeightUnit: 0,
            BarcodeType: 1,
            LabelFormat: 0
          })
        }

        const json2xls = require('json2xls');
        const xls = json2xls(rows);

        fs.writeFileSync(`./static/${timeStamp}.xls`, xls, 'binary');

        reply.sendFile(`./${timeStamp}.xls`)
        setTimeout(() => {
          fs.unlink(`./static/${timeStamp}.xls`, (err) => {
            if (err) {
              instance.send_Error('exported ' + timeStamp + ' file', JSON.stringify(err))
            }
          })
        }, 2000);
      } catch (error) {
        reply.error(error.message)
      }
      return reply;
    }
  )

  instance.get(
    '/items/get/excel-cas/:organization/:service/:name',
    async (request, reply) => {
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
            price: '$services.price'
          }
        }

        const items = await instance.goodsSales.aggregate([
          itemsQuery,
          unWindServices,
          serviceMatch,
          necessaryFields
        ])

        const timeStamp = new Date().getTime()
        const headers = [
          { name: '1.Department No', key: 'smth1', width: 100 },
          { name: '2.PLU No', key: 'smth2', width: 100 },
          { name: '4.PLU Type', key: 'smth3', width: 100 },
          { name: '11.ItemCode', key: 'smth4', width: 100 },
          { name: '10.Name', key: 'smth5', width: 100 },
          { name: '80.Label No', key: 'smth6', width: 100 },
          { name: '6.Price', key: 'smth6', width: 100 },
        ]

        const items_row = []
        for (const itm of items) {
          const row = [];
          row.push('21');
          row.push(itm.sku);
          row.push(1);
          row.push(0);
          row.push(itm.name);
          row.push(52);
          row.push(itm.price * 100);
          items_row.push(row)
        }
        const workbook = new ExcelJs.Workbook();
        const worksheet = workbook.addWorksheet('excelSheet', {
          pageSetup: { paperSize: 9, orientation: 'landscape' }
        });

        worksheet.addTable({
          name: 'ItemsTable',
          ref: 'A1',
          headerRow: true,
          columns: headers,
          rows: items_row
        })

        const file = `${timeStamp}.xlsx`;
        const file_dir = path.join(__dirname, '..', '..', '..', '/static/', file)
        await workbook.xlsx.writeFile(file_dir);

        reply.sendFile(`./${timeStamp}.xlsx`)
        setTimeout(() => {
          fs.unlink(`./static/${timeStamp}.xlsx`, (err) => {
            if (err) {
              instance.send_Error('exported ' + timeStamp + ' file', JSON.stringify(err))
            }
          })
        }, 2000);
      } catch (error) {
        reply.error(error.message)
      }
      return reply;
    }
  )

  instance.get(
    '/items/get/txt/:organization/:service/:name',
    async (request, reply) => {
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
            prices: '$services.prices'
          }
        }

        const items = await instance.goodsSales.aggregate([
          itemsQuery,
          unWindServices,
          serviceMatch,
          necessaryFields
        ])

        const timeStamp = new Date().getTime()
        let itemsText = ''

        for (const it of items) {
          let price = it.price;
          if (!(it.prices instanceof Array)) {
            it.prices = []
          }

          if (it.prices.length > 0 && it.prices[0].price) {
            price = it.prices[0].price
          }

          itemsText += `${it.sku};${it.name};;${price};0;0;0;${it.sku};0;0;;01.01.1999;0;7;11;0;01.01.2001\n`;
        }

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
  )

  instance.get(
    '/items/get/second-txt/:organization/:service/:name',
    async (request, reply) => {
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
            prices: '$services.prices'
          }
        }

        const items = await instance.goodsSales.aggregate([
          itemsQuery,
          unWindServices,
          serviceMatch,
          necessaryFields
        ])

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

          itemsText += `${items[index].sku}, ${price}, 0, ${items[index].name}, 0, ${items[index].sku}, 0, 0, 0, 0, 0, 0, 0, True, 0, 0, 0, 0, 0, 0\n`;
        }

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
  )

  instance.get(
    '/items/get/third-txt/:organization/:service/:name',
    async (request, reply) => {
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
            prices: '$services.prices'
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

          itemsText += `${items[index].name};${items[index].sku};${items[index].sku};7;${price};29;\n`;
        }

        fs.writeFile(`./static/${timeStamp}.txt`, itemsText, function (err, data) {
          reply.sendFile(`./${timeStamp}.txt`)
          setTimeout(() => {
            fs.unlink(`./static/${timeStamp}.txt`, (err) => {
              if (err) {
                instance.send_Error('exported ' + name + ' file', JSON.stringify(err))
              }
            })
          }, 2000);
        })

      } catch (error) {
        reply.error(error.message)
      }
      return reply;
    }
  )

  instance.get(
    '/items/get/shtrix-m/encoded/:organization/:service/:name',
    async (request, reply) => {
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
            organization: org_id
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
            prices: '$services.prices'
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

          itemsText += `${+index + 1};${items[index].name};;${price};0;0;0;${items[index].sku};0;0;;01.01.01;1;\n`;
        }
        const legacy = require('legacy-encoding');
        const buffer = legacy.encode(itemsText, 'windows-1251');
        fs.writeFile(`./static/${timeStamp}.txt`, buffer, function (err, data) {
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
  )

  instance.get(
    '/items/get/shtrix-m/:organization/:service/:name',
    async (request, reply) => {
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
            organization: org_id
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

          itemsText += `${+index + 1};${items[index].name};;${price};0;0;0;${items[index].sku};0;0;;01.01.01;${items[index].sold_by == 'each' ? '1' : '0'};\n`;
        }

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
  )

  next()
})
