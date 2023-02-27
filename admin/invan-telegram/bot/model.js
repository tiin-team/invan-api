const fp = require('fastify-plugin');
const { Types } = require('mongoose');

module.exports = fp((instance, _, next) => {

  const invanBot = instance.model('invan_bot', {
    organization: String,
    name: String,
    use_for: { type: String, enum: ['timecard', 'cashback', 'sms'] },
    token: { type: String, required: true, trim: true },
    created_by: String,
    created_by_id: Types.ObjectId,
    deleted_at: { type: Date, default: null },
    deleted_by: { type: String, default: null },
    deleted_by_id: { type: Types.ObjectId, default: null },
  })

  invanBot.schema.index({ deleted_at: 1 })
  invanBot.schema.index({ organization: 1, token: 1, deleted_at: 1 }, { unique: true })

  instance.decorate('invanBot', invanBot)

  const doc = new instance.invanBot({
    organization: '5f5641e8dce4e706c062837a',
    name: 'time_card_bot',
    use_for: 'timecard',
    token: '5926961665:AAF7HRIopGBJP0UQkRYYF7-EFnWnkMz1d5g',
    created_by: 'INVAN',
    created_by_id: '5f5641e8dce4e706c062837f',
  })
  doc.save()

  next()
})
