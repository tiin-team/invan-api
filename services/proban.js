const fp = require('fastify-plugin')

module.exports = fp((instance, _, next) => {

  instance.generate('/regions', instance.model('regions', {
    name: String
  }), {
    public: true
  })

  var accountmant = new instance.model('accountmant', {
    name: String,
    phone_number: String,
    is_admin: {
      type: Boolean,
      default: false
    },
    password: String,
    region_id: String
  })
  instance.decorate('accountmant', accountmant)
  instance.generate('/accountmant', accountmant, {
    public: true
  })

  var accountmantReports = new instance.model('accountmantReports', {
    report_number: {
      type: Number,
      default: 1
    },
    created_time: Number,
    reporter_name: String,
    report_theme: String,
    material_size: Number,
    used_material_siza: Number,
    used_material_quantity: Number,
    price: Number,
    region_id: String,
    accountmant_id: String
  })
  instance.decorate('accountmantReports', accountmantReports)
  instance.generate('/accountmant/reports', accountmantReports, {
    public: true
  })

  next()
})