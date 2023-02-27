const fp = require('fastify-plugin');
const { Types } = require('mongoose');

module.exports = fp((instance, _, next) => {

  const invanTGChat = instance.model('invan_telegram_chat', {
    organization: String,
    title: String,
    use_for: { type: String, enum: ['timecard', 'cashback', 'sms'] },
    type: { type: String, enum: ['channel', 'private', 'group', 'supergroup'] },
    chat_id: { type: Number, required: true },
    created_by: String,
    created_by_id: Types.ObjectId,
    deleted_at: { type: Date, default: null },
    deleted_by: { type: String, default: null },
    deleted_by_id: { type: Types.ObjectId, default: null },
  })

  invanTGChat.schema.index({ deleted_at: 1 })
  invanTGChat.schema.index({ organization: 1, chat_id: 1, deleted_at: 1 }, { unique: true })

  instance.decorate('invanTGChat', invanTGChat)

  const doc = new instance.invanTGChat({
    organization: '5f5641e8dce4e706c062837a',
    title: 'TimeCard',
    use_for: 'timecard',
    type: 'channel',
    chat_id: -1001709583424,
    created_by: 'INVAN',
    created_by_id: '5f5641e8dce4e706c062837f',
  })
  doc.save()

  next()
})
