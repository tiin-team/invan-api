const fp = require('fastify-plugin');
const { Types } = require('mongoose');

module.exports = fp((instance, _, next) => {

  const boolean = {
    type: Boolean,
    default: false
  }

  const financeCategory = instance.model('financeCategory', {
    organization: String,
    name: String,
    // xarajatlar
    disbursement: boolean,
    // kirimlar
    income: boolean,
    is_active: boolean,
    created_by: String,
    created_by_id: Types.ObjectId,
    deleted_at: { type: Date, default: null },
    deleted_by: { type: String, default: null },
    deleted_by_id: { type: Types.ObjectId, default: null },
  })

  financeCategory.schema.index({ deleted_at: 1 })
  financeCategory.schema.index({ organization: 1, name: 1, deleted_at: 1 }, { unique: true })

  instance.decorate('financeCategory', financeCategory)

  next()
})
