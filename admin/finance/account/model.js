const fp = require('fastify-plugin');
const { Types } = require('mongoose');

module.exports = fp((instance, _, next) => {

  const financeAccount = instance.model('financeAccount', {
    organization: String,
    name: String,
    balance: { type: Number, default: 0 },
    created_by: String,
    created_by_id: Types.ObjectId,
    deleted_at: { type: Date, default: null },
    deleted_by: { type: String, default: null },
    deleted_by_id: { type: Types.ObjectId, default: null },
  })

  financeAccount.schema.index({ deleted_at: 1 })
  financeAccount.schema.index({ organization: 1, name: 1, deleted_at: 1 }, { unique: true })

  instance.decorate('financeAccount', financeAccount)

  next()
})
