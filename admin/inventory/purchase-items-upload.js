
const fs = require('fs');
const csvParser = require('csv-parse');
const Joi = require('joi');

const convertPItemsToJSON = (array, correct_names) => {
  const first = array[0].join()
  const headers = first.split(',');
  if (!(headers instanceof Array)) {
    headers = []
  }
  const errors = []
  for (let i = 0; i < 4; i++) {
    if (i < headers.length) {
      if (headers[i] != correct_names[i]) {
        errors.push({
          place: String.fromCharCode(i + 65) + '1',
          Error: headers[i] + " must be " + correct_names[i]
        })
      }
    }
    else {
      errors.push({
        place: String.fromCharCode(i + 65) + '1',
        Error: correct_names[i] + ' Field does not exist'
      })
    }
  }

  if (errors.length > 0) {
    return {
      type: 'error',
      errors: errors
    }
  }

  const data = []
  const itemsMap = {};
  const barcodes = [];
  for (const i in array) {
    if (i > 0) {
      let item = {
        barcode: array[i][0],
        name: array[i][1],
        quality: array[i][2],
        p_cost: array[i][3]
      }
      const itemSchema = Joi.object({
        barcode: Joi.string().required(),
        name: Joi.string().required(),
        quality: Joi.number().required(),
        p_cost: Joi.number().required()
      })
      const { error, value } = itemSchema.validate(item);
      if (error) {
        const { details } = error;
        const message = details.map(i => i.message).join(', ');
        errors.push({
          place: `On cell ${+i + 1}`,
          Error: message
        })
      }
      else {
        data.push(value)
        if (itemsMap[value.barcode] == undefined) {
          barcodes.push(value.barcode);
          itemsMap[value.barcode] = [];
        }
        itemsMap[value.barcode].push(value);
      }
    }
  }
  if (errors.length > 0) {
    return {
      type: 'error',
      errors: errors
    }
  }

  return {
    items: data,
    itemsMap,
    barcodes
  }
}

module.exports = ((instance, _, next) => {

  const uploadPItemsSchema = {
    schema: {
      body: {
        type: 'object',
        required: [
          'service', 'supplier_id',
          'purchase_order_date',
          'expected_on'
        ],
        properties: {
          service: {
            type: 'string',
            minLength: 24,
            maxLength: 24
          },
          supplier_id: {
            type: 'string',
            minLength: 24,
            maxLength: 24
          },
          purchase_order_date: {
            type: 'number'
          },
          expected_on: {
            type: 'number'
          },
          notes: {
            type: 'string'
          },
          status: {
            type: 'string',
            enum: [ 'pending', 'closed' ],
            default: 'pending'
          }
        }
      }
    }
  }

  const checkItems = async (request, reply, url) => {
    try {
      fs.readFile(url, { encoding: 'utf-8' }, function (_, csvData) {
        if (!csvData) {
          return reply.error('Could not read csvData');
        }
        csvParser(
          csvData,
          {
            delimiter: ',',
            skip_empty_lines: true
          },
          async function (_, data) {
            if (!data || data.length < 2) {
              return reply.error('Could not read data');
            }
            const correct_names = [
              'barcode', 'name', 'quality', 'p_cost'
            ]

            const json_data = convertPItemsToJSON(data, correct_names)

            if (json_data.type == 'error') {
              return reply.ok({
                type: 'error',
                errors: json_data.errors
              })
            }

            const p_data = request.body;

            const user = request.user;
            const services = await instance.services.find({ organization: user.organization });
            const itemServices = []
            for (const s of services) {
              itemServices.push({
                service: s._id,
                service_name: s.name,
                prices: [],
                price: 0,
                in_stock: 0,
                available: p_data.service == s._id
              })
            }
            const items = json_data.items;
            const itemsMap = json_data.itemsMap;
            const barcodes = json_data.barcodes;
            const exist_items = await instance.goodsSales.find(
              {
                organization: user.organization,
                barcode: { $elemMatch: { $in: barcodes } }
              }
            );

            const existBarcode = {};
            const itemsIdMap = {}
            for (const it of exist_items) {
              itemsIdMap[it._id] = it
              if (!(it.barcode instanceof Array)) {
                it.barcode = []
              }
              for (const b of it.barcode) {
                existBarcode[b] = it._id
              }
            }

            let lastItem = await instance.goodsSales.findOne(
              { organization: user.organization }
            ).sort({ sku: -1 });
            let availableSku = 10000;
            if (lastItem && lastItem.sku) {
              availableSku = lastItem.sku
            }

            for (const b of barcodes) {
              if (!existBarcode[b]) {
                availableSku += 1;
                const savedItem = await new instance.goodsSales(
                  {
                    organization: user.organization,
                    name: itemsMap[b][0].name,
                    services: itemServices,
                    is_track_stock: true,
                    sku: availableSku,
                    sold_by: 'each',
                    cost: 0,
                    default_purchase_cost: itemsMap[b][0].p_cost,
                    barcode: [b],
                    last_updated: new Date().getTime()
                  }
                ).save();
                exist_items.push(savedItem)
                existBarcode[b] = savedItem._id
                itemsIdMap[savedItem._id] = savedItem
              }
            }

            const countPOrders = await instance.inventoryPurchase.countDocuments({ organization: user.organization });
            const p_order = 'P' + ('0000' + (countPOrders + 1001)).slice(-5);
            let total = 0, total_count = 0;

            for (const b of barcodes) {
              for (const it of itemsMap[b]) {
                total += it.p_cost * it.quality
                total_count += it.quality
              }
            }

            const purchaseOrder = {
              organization: user.organization,
              p_order: p_order,
              purchase_order_date: p_data.purchase_order_date,
              service: p_data.service,
              service_name: p_data.service_name,
              supplier_id: p_data.supplier_id,
              supplier_name: p_data.supplier_name,
              type: 'coming',
              status: 'pending',
              expected_on: p_data.expected_on,
              total: total,
              notes: p_data.notes,
              total_count: total_count,
              additional_cost: [],
              ordered_by_id: user._id,
              ordered_by_name: user.name,
              items: []
            }
            
            const pOrder = await new instance.inventoryPurchase(purchaseOrder).save();
            const pItems = []
            for (const b of barcodes) {
              for (const it of itemsMap[b]) {
                pItems.push({
                  organization: user.organization,
                  service: p_data.service,
                  purchase_id: pOrder._id,
                  product_id: itemsIdMap[existBarcode[b]]._id,
                  product_name: itemsIdMap[existBarcode[b]].name,
                  sku: itemsIdMap[existBarcode[b]].sku,
                  price: itemsIdMap[existBarcode[b]].price,
                  cost: itemsIdMap[existBarcode[b]].cost,
                  barcode: itemsIdMap[existBarcode[b]].barcode,
                  ordered: it.quality,
                  quality: it.quality,
                  purchase_cost: it.p_cost,
                  amount: it.p_cost * it.quality
                })
              }
            }
            await instance.purchaseItem.insertMany(pItems)
            
            if(p_data.status == 'closed') {
              const purchaseItems = await instance.purchaseItem.find({ purchase_id: pOrder._id })
              for(const i in purchaseItems) {
                purchaseItems[i]. to_receive = purchaseItems[i].quality
              }
              p_data.items = purchaseItems
              
              instance.receivePurchase({ body: p_data, params: { id: pOrder._id } }, reply, user)
            }
            else {
              reply.ok({ _id: pOrder._id })
            }
          }
        )
      })
    } catch (error) {
      return reply.error(error.message)
    }
  }

  instance.post(
    '/inventory/upload-purchase-items',
    {
      ...uploadPItemsSchema,
      attachValidation: true,
      preValidation: instance.authorize_admin
    },
    async (request, reply) => {
      if (request.validationError) {
        return reply.validation(request.validationError.message)
      }
      try {
        var files = request.raw.files
        const excel = files['file']
        const { service, supplier_id } = request.body;

        const org_ser = await instance.services.findById(service);
        if (!org_ser) {
          return reply.fourorfour('Service')
        }
        request.body.service_name = org_ser.name

        const org_supp = await instance.adjustmentSupplier.findById(supplier_id);
        if (!org_supp) {
          return reply.fourorfour('Supplier')
        }
        request.body.supplier_name = org_supp.supplier_name
        
        if (!excel || excel.name.slice(-3) != 'csv') {
          return reply.fourorfour('Csv File')
        }

        const url = `./static/${excel.md5}${excel.name}`;
        const wstream = fs.createWriteStream(url);
        wstream.on('error', error => { return reply.error(error.message) });
        wstream.on('finish', () => {
          return checkItems(request, reply, url);
        })
        wstream.write(excel.data)
        wstream.end()
      } catch (error) {
        reply.error(error.message)
      }
      return reply;
    }
  )

  next()
})
