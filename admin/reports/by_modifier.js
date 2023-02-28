module.exports = ((instance, options, next) => {

  var by_modifier = (request, reply, items) => {

    var modifier_map_by_id = {}
    var modifier_ids = []
    var options_map_by_name = {}

    for (const item of items) {
      if (typeof item.sold_item_list != typeof []) {
        continue
      }
      for (const sold of item.sold_item_list) {
        if (typeof sold.modifiers != typeof []) {
          continue
        }
        for (const mod of sold.modifiers) {
          if (!modifier_map_by_id[mod.modifier_id]) {
            modifier_map_by_id[mod.modifier_id] = { ...mod, modifier_options: [] }
            modifier_ids.push(mod.modifier_id)
          }
          if (typeof mod.modifier_options != typeof []) {
            continue
          }
          for (const opt of mod.modifier_options) {
            if (!options_map_by_name[mod.modifier_id + '_' + opt.option_name]) {
              options_map_by_name[mod.modifier_id + '_' + opt.option_name] = {
                ...opt,
                quantity_sold: 0,
                gross_sales: 0,
                quantity_refunded: 0,
                refunds: 0,
                net_sales: 0
              }
              modifier_map_by_id[mod.modifier_id].modifier_options.push(mod.modifier_id + '_' + opt.option_name)
            }
            if (item.is_refund) {
              options_map_by_name[mod.modifier_id + '_' + opt.option_name].quantity_refunded += sold.value
              options_map_by_name[mod.modifier_id + '_' + opt.option_name].refunds += sold.value * opt.price
              options_map_by_name[mod.modifier_id + '_' + opt.option_name].net_sales -= sold.value * opt.price
            }
            else {
              options_map_by_name[mod.modifier_id + '_' + opt.option_name].quantity_sold += sold.value
              options_map_by_name[mod.modifier_id + '_' + opt.option_name].gross_sales += sold.value * opt.price
              options_map_by_name[mod.modifier_id + '_' + opt.option_name].net_sales += sold.value * opt.price
            }
          }
        }
      }
    }
    const limit = request.params.limit
    const page = request.params.page
    const total = modifier_ids.length
    modifier_ids = modifier_ids.slice((page - 1) * limit, page * limit)

    var modifier_report = []
    for (const modifier_id of modifier_ids) {
      var modifier_options = []
      for (const mopts of modifier_map_by_id[modifier_id].modifier_options) {
        modifier_options.push(options_map_by_name[mopts])
      }
      modifier_report.push({
        ...instance.addObjects(modifier_options),
        ...modifier_map_by_id[modifier_id]
      })
      for (const mopts of modifier_map_by_id[modifier_id].modifier_options) {
        modifier_report.push(options_map_by_name[mopts])
      }
    }

    reply.ok({
      total: total,
      page: Math.ceil(total / limit),
      data: modifier_report
    })
  }

  instance.post('/reports/by_modifier/:min/:max/:limit/:page', {
    ...options.version,
    ...options.reports_schema
  }, (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      if (admin) { instance.get_receipt_by_range(request, reply, admin, by_modifier) }
    })
  })

  next()
})