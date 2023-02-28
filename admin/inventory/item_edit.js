const fp = require('fastify-plugin');

module.exports = fp((instance, options, next) => {
  // create edited item

  instance.decorate('create_item_edit_by_admin', (old_item, new_item, user) => {

  })
/**organization: String,
    date: Number,
    product_id: mongoose.Schema.Types.ObjectId,
    product_name: String,
    service: mongoose.Schema.Types.ObjectId,
    service_name: String,
    employee_id: mongoose.Schema.Types.ObjectId,
    employee_name: String,
    reason: {
      type: String,
      enum: ['name', 'category', 'price', 'sku']
    },
    old_value: String,
    new_value: String */
  instance.decorate('create_item_edit_by_employee', (old_item, new_item, service_id, user) => {
    instance.services.findOne({
      _id: service_id
    }, (err, service) => {
      if(service) {
        for(var i of ['name', 'category', 'price', 'sku']) {
          if(old_item[i] != new_item[i]){
            var edited_item = instance.itemEditHistory({
              organization: user.organization,
              date: new Date().getTime(),
              product_id: instance.ObjectId(old_item._id),
              product_name: old_item.name,
              service: instance.ObjectId(service_id),
              service_name: service.name,
              employee_id: instance.ObjectId(user._id),
              employee_name: user.name,
              reason: i,
              old_value: old_item[i],
              new_value: new_item[i]
            })
            edited_item.save((err)=>{
              if(err){
                instance.send_Error('saving edited item', JSON.stringify(err))
              }
            })
          }
        }
      }
      else {
        if(err) {
          instance.send_Error('finding service', JSON.stringify(err))
        }
      }
    })
  })
  // get edited item

  instance.post('/get/edited/item/:min/:max', options.version, (request, reply) => {
    return reply;
  })

  next()
})