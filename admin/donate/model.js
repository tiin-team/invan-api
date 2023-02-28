const fp = require('fastify-plugin');
const { Types } = require('mongoose');

module.exports = fp((instance, _, next) => {

  const UsersDonate = instance.model('UsersDonate', {
    organization: String,
    service_id: Types.ObjectId,
    client_phone_number: String,
    client_name: String,
    client_id: String,
    receipt_id: Types.ObjectId,
    receipt_no: String,
    total_price: Number,
    total_donate: Number,
    create_time: Number,
    deleted_at: { type: Date, default: null },
    deleted_by: { type: String, default: null },
    deleted_by_id: { type: Types.ObjectId, default: null },
  })

  instance.decorate('UsersDonate', UsersDonate)

  next()
})
