
module.exports = (instance, _, next) => {

  instance.generate('/inventory/transsfer', instance.model('inventoryTransfer', {
    organization: String,
    service: String,
    source_store: String,
    destination_store: String,
    date_of_transfer_order: Number,
    notes: String,
    items: Array
  }))

  instance.generate('/inventory/adjustment', instance.model('inventoryAdjustment', {
    organization: String,
    service: String,
    reason: String,
    notes: String,
    items: Array
  }))

  instance.generate('/inventory/counts', instance.model('adjustmentCounts', {
    organization: String,
    service: String,
    notes: String,
    type: {
      type: String,
      enum: ['partial', 'full']
    },
    items: Array
  }))

  instance.generate('/inventory/productions', instance.model('adjustmentProductions', {
    organization: String,
    service: String,
    notes: String,
    items: Array
  }))

  next()
}