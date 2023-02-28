
module.exports = ((instance, _, next) => {

  const pItemsByReceiptSchema = {
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
            enum: ['pending', 'closed'],
            default: 'pending'
          },
          receipts: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'string',
              minLength: 24,
              maxLength: 24
            }
          },
          additional_cost: {
            type: 'array',
            items: {
              type: 'object',
              required: ['name', 'amount'],
              properties: {
                name: { type: 'string', minLength: 1 },
                amount: { type: 'number' }
              }
            }
          }
        }
      }
    }
  }

  instance.post(
    '/inventory/purchase-items-by-receipts',
    {
      ...pItemsByReceiptSchema,
      version: '1.0.0',
      attachValidation: true,
      preValidation: instance.authorize_admin
    },
    async (request, reply) => {
      if (request.validationError) {
        return reply.validation(request.validationError.message)
      }
      try {
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
        const user = request.user;
        const receipts = await instance.Receipts.find({ _id: request.body.receipts });
        const barcodes = []
        const itemsMap = {}
        for (const r of receipts) {
          if (!(r.sold_item_list instanceof Array)) {
            r.sold_item_list = []
          }
          for (const s of r.sold_item_list) {
            if (typeof s.barcode == typeof 'invan' && s.barcode != '') {
              barcodes.push(s.barcode)
              if (!itemsMap[s.barcode]) {
                itemsMap[s.barcode] = []
              }
              itemsMap[s.barcode].push({
                product_name: s.product_name,
                purchase_cost: s.price,
                quality: s.value
              })
            }
          }
        }
        
        const items = await instance.goodsSales.find({
          organization: user.organization,
          barcode: { $elemMatch: { $in: barcodes } }
        });
        
        const existBarcode = {};
        const itemsIdMap = {};
        for (const it of items) {
          itemsIdMap[it._id] = it
          if (!(it.barcode instanceof Array)) {
            it.barcode = []
          }
          for (const b of it.barcode) {
            existBarcode[b] = it._id;
          }
        }
        // services
        const services = await instance.services.find({ organization: user.organization });
        const itemServices = []
        for (const s of services) {
          itemServices.push({
            service: s._id,
            service_name: s.name,
            prices: [],
            price: 0,
            in_stock: 0,
            available: service == s._id
          })
        }
        //
        const pItems = []
        for (const b of barcodes) {
          if (!existBarcode[b]) {
            let last_sku = 10000;
            const lastItem = await instance.goodsSales.findOne({ organization: user.organization }).sort({sku: -1});
            if(lastItem && lastItem.sku) {
              last_sku = lastItem.sku + 1
            }
            const savedItem = await new instance.goodsSales({
              organization: user.organization,
              services: itemServices,
              barcode: [b],
              sold_by: 'each',
              sku: last_sku,
              last_updated: new Date().getTime(),
              last_stock_updated: new Date().getTime(),
              name: itemsMap[b][0].product_name,
              cost: itemsMap[b][0].price,
              is_track_stock: true,
              last_updated: new Date().getTime()
            }).save()
            existBarcode[b] = savedItem._id;
            itemsIdMap[savedItem._id] = savedItem
          }

          for (const it of itemsMap[b]) {
            if (itemsIdMap[existBarcode[b]]) {
              pItems.push({
                product_id: existBarcode[b],
                product_name: itemsIdMap[existBarcode[b]].name,
                sku: itemsIdMap[existBarcode[b]].sku,
                price: itemsIdMap[existBarcode[b]].price,
                cost: itemsIdMap[existBarcode[b]].cost,
                barcode: itemsIdMap[existBarcode[b]].barcode,
                ordered: it.quality,
                quality: it.quality,
                purchase_cost: it.purchase_cost,
                amount: it.purchase_cost * it.quality
              })
            }
          }
        }
        if(pItems.length == 0) {
          return reply.error('Barcode does not exist')
        }
        request.body.items = pItems

        instance.create_purchase_order(request, reply, request.user)
      } catch (error) {
        reply.error(error.message)
      }
      return reply;
    }
  )

  next()
})
