const fp = require('fastify-plugin');

module.exports = fp((instance, _, next) => {
    const version = { version: '2.0.0' }

    // reports by taxes

    // const by_tax = (request, reply, items) => {
    //     var net_sales = 0.0
    //     var taxable_sales = 0.0
    //     var taxes = []
    //     var taxObj = {}
    //     for (var r of items) {
    //         for (var s of r.sold_item_list) {
    //             var not_refund = 1
    //             if (r.is_refund) {
    //                 not_refund = -1
    //             }
    //             var discount = 0.0
    //             if (s.discount == undefined) {
    //                 s.discount = []
    //             }
    //             var total = s.price * s.value
    //             for (var dis of s.discount) {
    //                 if (dis.type == 'percentage') {
    //                     total += not_refund * (total * dis.value / 100)
    //                 }
    //                 else {
    //                     total += not_refund * dis.value
    //                 }
    //             }
    //             if (s.taxes.length == 0)
    //                 net_sales += total
    //             else
    //                 for (var t of s.taxes) {
    //                     taxable_sales += total
    //                     if (taxObj[t._id] == undefined) {
    //                         taxObj[t._id] = {
    //                             name: t.name,
    //                             taxable_sales: 0,
    //                             tax_amount: 0
    //                         }
    //                         taxes.push(t._id)
    //                     }

    //                     var tax = 0
    //                     if (t.type == 'include') {
    //                         tax += total / (1 + t.tax / 100.0) * t.tax / 100.0 * not_refund
    //                     }
    //                     else {
    //                         tax += total * (t.tax / 100.0) * not_refund
    //                     }
    //                     taxObj[t._id].taxable_sales += total
    //                     taxObj[t._id].tax_amount += tax
    //                 }
    //         }
    //     }
    //     var answer = []
    //     for (var id of taxes) {
    //         answer.push(taxObj[id])
    //     }
    //     if (request.params.name == undefined) {
    //         reply.ok({
    //             taxable_sales: taxable_sales,
    //             non_taxable_sales: net_sales,
    //             total_net_sales: net_sales + taxable_sales,
    //             total: answer.length,
    //             page: Math.ceil(answer.length / request.params.limit),
    //             taxes: answer.splice(request.params.limit * (request.params.page - 1), request.params.limit)
    //         })
    //     }
    //     else {
    //         var Answer = [[
    //             'name',
    //             'taxable_sales',
    //             'tax_amount'
    //         ]]
    //         for (var a of answer) {
    //             Answer.push([
    //                 a.name,
    //                 a.taxable_sales,
    //                 a.tax_amount
    //             ])
    //         }
    //         Answer.push([])
    //         Answer.push([])
    //         Answer.push(['taxable_sales', taxable_sales])
    //         Answer.push(['non_taxable_sales', net_sales])
    //         Answer.push(['total_net_sales', net_sales + taxable_sales])
    //         instance.send_csv(Answer, 'by_tax', reply)
    //     }
    //     // var products = []
    //     // var products_id = []
    //     // var products_index = {}
    //     // var ind = 0
    //     // var net_sale = 0
    //     // for (const item of items) {
    //     //   if (item.is_refund == true) {
    //     //     net_sale -= item.total_price
    //     //     for (const __dis of item.discount) {
    //     //       if (__dis.type == 'sum') {
    //     //         net_sale += __dis.value
    //     //       } else {
    //     //         net_sale += __dis.value * item.total_price / 100
    //     //       }
    //     //     }
    //     //   } else {
    //     //     net_sale += item.total_price
    //     //     for (const __dis of item.discount) {
    //     //       if (__dis.type == 'sum') {
    //     //         net_sale -= __dis.value
    //     //       } else {
    //     //         net_sale -= __dis.value * item.total_price / 100
    //     //       }
    //     //     }
    //     //   }
    //     //   for (const product of item.sold_item_list) {
    //     //     if (products_index[product.product_id] == undefined) {
    //     //       products.push(product)
    //     //       if (product.product_id != '' && product.product_id != undefined && product.product_id.includes('-') == false)
    //     //         products_id.push(product.product_id)
    //     //       products_index[product.product_id] = ind
    //     //       ind++
    //     //     }
    //     //   }
    //     // }
    //     // instance.goodsSales.find({
    //     //   _id: {
    //     //     $in: products_id
    //     //   }
    //     // }, (err, goods) => {
    //     //   if (err) {
    //     //     instance.send_Error('goods sales', JSON.stringify(err))
    //     //     reply.error("GoodsSales dont exist")
    //     //   } else {
    //     //     if (goods) {
    //     //       var taxes = []
    //     //       var taxes_id = []
    //     //       var taxes_index = {}
    //     //       var ind_tax = 0
    //     //       for (const good of goods) {
    //     //         for (const tax of good.taxes) {
    //     //           if(tax.available) {
    //     //             if (taxes_index[tax.tax_id] == undefined) {
    //     //               taxes.push({
    //     //                 product: [products[products_index[good._id]]]
    //     //               })
    //     //               taxes_id.push(tax.tax_id)
    //     //               taxes_index[tax.tax_id] = ind_tax
    //     //               ind_tax++
    //     //             } else {
    //     //               taxes[taxes_index[tax.tax_id]].product.push(products[products_index[good._id]])
    //     //             }
    //     //           }
    //     //         }
    //     //       }
    //     //       instance.settingsTaxes.find({
    //     //         _id: {
    //     //           $in: taxes_id
    //     //         }
    //     //       }, (err, taxs) => {
    //     //         if (taxs == null) {
    //     //           taxs = []
    //     //         }
    //     //         var result = []
    //     //         var id = 0
    //     //         var taxable_sales = 0
    //     //         for (const Tax of taxs) {
    //     //           result.push({
    //     //             name: Tax.name,
    //     //             taxable_sales: 0,
    //     //             tax_amount: 0
    //     //           })
    //     //           for (const product of taxes[taxes_index[Tax._id]].product) {
    //     //             result[id].taxable_sales += product.value * product.price
    //     //             taxable_sales += product.value * product.price
    //     //             if (Tax.type == 'include') {
    //     //               result[id].tax_amount += product.price - product.price / (1.0 + Tax.tax / 100.0)
    //     //             } else {
    //     //               result[id].tax_amount += product.price * Tax.tax / 100.0
    //     //             }
    //     //           }
    //     //           id++
    //     //         }
    //     //         reply.ok({
    //     //           taxable_sales: Math.round(taxable_sales * 100) / 100,
    //     //           non_taxable_sales: Math.round((net_sale - taxable_sales) * 100) / 100,
    //     //           total_net_sales: Math.round(net_sale * 100) / 100,
    //     //           total: result.length,
    //     //           taxes: result.splice(request.params.limit * (request.params.page - 1), request.params.limit)
    //     //         })
    //     //       })
    //     //     } else {
    //     //       reply.error("Error on finding GoodsSales")
    //     //     }
    //     //   }
    //     // })
    // }

    // instance.post('/reports/by_tax/:min/:max/:limit/:page', version, (request, reply) => {
    //     instance.oauth_admin(request, reply, (admin) => {
    //         if (admin) { instance.get_receipt_by_range(request, reply, admin, by_tax) }
    //     })
    // })

    next()
})