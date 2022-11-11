const fp = require('fastify-plugin')
const mongoose = require('mongoose')

module.exports = fp((instance, _, next) => {

  const petronetReceipt = instance.model('petronetReceipt', {
    organization: String,
    cashier_name: String,
    date: Number,
    client: mongoose.Types.ObjectId,
    receipt_no: String,
    total_price: Number,
    items: [
      {
        discount: Number,
        price: Number,
        barcode: String,
        value: Number,
        name: String,
      }
    ],
    payment: [
      {
        name: String,
        value: Number,
      }
    ],
    cash_back: {
      type: Number,
      default: 0
    },
  })
  instance.decorate('petronetReceipt', petronetReceipt)

  next()
})
