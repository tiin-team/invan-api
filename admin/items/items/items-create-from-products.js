
module.exports = ((instance, _, next) => {

  const createItemFromProducts = {
    body: {
      type: 'object',
      required: [
        'items', 'check'
      ],
      properties: {
        check: {
          type: 'boolean'
        },
        items: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            required: [
              'name', 'barcode', 'sold_by'
            ],
            properties: {
              name: {
                type: 'string',
                minLength: 1
              },
              barcode: {
                type: 'string',
                pattern: '^[0-9]{5,}$'
              },
              sold_by: {
                type: 'string',
                enum: [
                  'each', 'weight', 'box', 'litre', 'metre', 'pcs'
                ]
              }
            }
          }
        }
      }
    }
  }

  instance.post(
    '/items/create/from-products',
    {
      version: '1.0.0',
      attachValidation: true,
      preValidation: instance.authorize_admin,
      schema: createItemFromProducts
    },
    async (request, reply) => {
      if (request.validationError) {
        return reply.validation(request.validationError.message)
      }
      const { items, check } = request.body;
      const user = request.user;
      const barcodes = []

      for (const itm of items) {
        barcodes.push(itm.barcode)
      }

      if (check) {
        const existGoods = await instance.goodsSales.countDocuments({
          organization: user.organization,
          barcode: { $elemMatch: { $in: barcodes } }
        });
        return reply.ok({
          updating: existGoods,
          creating: items.length - existGoods
        })
      }

      const existItems = await instance.goodsSales.find(
        {
          organization: user.organization,
          barcode: { $elemMatch: { $in: barcodes } }
        },
        {
          barcode: 1
        }
      );
      const itemBarcodeMap = {}
      for (const itm of existItems) {
        if (itm.barcode instanceof Array) {
          itemBarcodeMap[itm.barcode] = itm
        }
      }
      const services = await instance.services.find({ organization: user.organization });
      const itemServices = []
      for (const s of services) {
        itemServices.push({
          service: s._id,
          service_name: s.name,
          prices: [],
          price: 0,
          in_stock: 0,
          available: true
        })
      }
      let lastItem = await instance.goodsSales.findOne(
        { organization: user.organization }
      ).sort({ sku: -1 });
      let availableSku = 10000;
      if (lastItem && lastItem.sku) {
        availableSku = lastItem.sku
      }
      for (const itm of items) {
        if (itemBarcodeMap[itm.barcode]) {
          await instance.goodsSales.updateOne({
            _id: itemBarcodeMap[itm.barcode]._id
          }, {
            $set: {
              name: itm.name
            }
          })
        }
        else {
          availableSku += 1;
          await new instance.goodsSales({
            organization: user.organization,
            services: itemServices,
            name: itm.name,
            is_track_stock: true,
            sku: availableSku,
            sold_by: itm.sold_by,
            cost: 0,
            default_purchase_cost: 0,
            barcode: [itm.barcode],
            last_updated: new Date().getTime()
          }).save()
        }
      }
      reply.ok({
        ok: true
      })
      return reply;
    }
  )

  next()
})
