const fp = require('fastify-plugin');
const { Types } = require('mongoose');

module.exports = fp((instance, _, next) => {

  const GoodsDailyStock = instance.model('GoodsDailyStock', {
    organization: String,
    month: { type: String }, // 01.01.2000
    month_name: { type: String }, // February
    sku: Number,
    product_id: Types.ObjectId,
    product_name: String,
    category_id: { type: Types.ObjectId },
    category_name: String,
    sold_by: {
      type: String,
      enum: [
        'each',
        'weight',
        'list',
        // 'karaoke',
        'pcs',
        'box',
        'litre',
        'metre'
      ],
      default: 'each'
    },
    count_by_type: { type: Number, default: 0 },
    barcode_by_type: String,
    barcode: { type: Array, default: [] },
    mxik: String,
    services: [{
      service_id: { type: Types.ObjectId },
      service_name: { type: String },
      start_price: { type: Number, default: 0 },
      start_cost: { type: Number, default: 0 },
      end_price: { type: Number, default: 0 },
      end_cost: { type: Number, default: 0 },
      start_stock: { type: Number, default: 0 },
      end_stock: { type: Number, default: 0 },
      start_prices: {
        type: Array,
        default: [],
      },
      end_prices: {
        type: Array,
        default: [],
      },
    }],
  })

  instance.decorate('GoodsDailyStock', GoodsDailyStock)

  next()
})
