module.exports = (instance, _, next) => {

  var version = { version: '1.0.0' }

  // reports sales by category

  const sales_by_category = (request, reply, user, recepts, goods_sales, goods_category) => {
    var forindex = {}
    var sales = []
    var sold_product = []
    var prd = []
    var prd_index = {}
    var prd_ind = 0
    var goodsObj = {}
    for (var g of goods_sales) {
      goodsObj[g._id] = g.sold_by
    }
    for (const item of recepts) {
      if (item.is_refund == true) {
        for (const currentproduct of item.sold_item_list) {
          if (prd_index[currentproduct.product_id]) {
            var ind = prd_index[currentproduct.product_id]
            prd[ind].refund_value += currentproduct.value
            prd[ind].refund_price += currentproduct.price * currentproduct.value
            for (const dis of item.discount)
              if (dis.type == 'percentage') {
                prd[ind].discount += dis.value * currentproduct.price * (-1) * (currentproduct.value) / 100
              } else {
                prd[ind].discount += dis.value
              }
          } else {
            prd.push({
              refund_value: currentproduct.value,
              refund_price: currentproduct.price * currentproduct.value,
              discount: 0
            })
            for (const dis of item.discount)
              if (dis.type == 'percentage') {
                prd[prd_ind].discount -= dis.value * currentproduct.price * (-1) * (currentproduct.value) / 100
              } else {
                prd[prd_ind].discount -= dis.value
              }
            prd_index[currentproduct.product_id] = prd_ind
            prd_ind++
          }
          currentproduct.value *= (-1)
          sold_product.push(currentproduct)
        }
      }
      else {
        for (const currentproduct of item.sold_item_list) {
          if (prd_index[currentproduct.product_id]) {
            var ind = prd_index[currentproduct.product_id]
            for (const dis of item.discount)
              if (dis.type == 'percentage') {
                if (currentproduct.value > 0)
                  prd[ind].discount += dis.value * currentproduct.price * currentproduct.value / 100
              } else {
                if (currentproduct.value > 0)
                  prd[ind].discount += dis.value
              }
          }
          else {
            prd.push({
              refund_price: 0,
              refund_value: 0,
              discount: 0
            })
            for (const dis of item.discount)
              if (dis.type == 'percentage') {
                if (currentproduct.value > 0)
                  prd[prd_ind].discount += dis.value * currentproduct.price * currentproduct.value / 100
              } else {
                if (currentproduct.value > 0)
                  prd[prd_ind].discount += dis.value
              }
            prd_index[currentproduct.product_id] = prd_ind
            prd_ind++
          }
          sold_product.push(currentproduct)
        }
      }
    }
    var sold_item = []
    for (const cproduct of sold_product) {
      for (const goodsSale of goods_sales) {
        if (goodsSale._id == cproduct.product_id) {
          sold_item.push(goodsSale)
          break;
        }
      }
    }

    // console.log(sold_item.length)
    for (const currentItem of sold_item) {
      if (forindex[currentItem.category] == undefined) {
        for (const goodCateg of goods_category)
          if (goodCateg._id == currentItem.category) {
            forindex[currentItem.category] = {
              name: goodCateg.name,
              section_id: goodCateg.section,
              id: goodCateg._id
            }
          }
          else if (currentItem.category == "") {
            forindex['NoCategory_test'] = {
              name: "other",
              id: "0102030405"
            }
          }
      }
    }
    // console.log(prd_ind)
    var setitem = {}
    var indexitem = []
    var setted = {}
    var ind = 0
    var inde = 0
    for (let i = 0; i < sold_item.length; i++) {
      // console.log(setted[sold_item[i].category])
      if (setted[sold_item[i].category] == undefined) {
        if (sold_item[i].category != "")
          setted[sold_item[i].category] = ind
        else
          setted["NoCategory_test"] = ind
        ind++
        indexitem[inde] = 0
        setitem[sold_item[i].name] = inde
        // console.log(i)
        // console.log(sold_item[i])
        // console.log('////////////')

        inde++
        if (sold_item[i].category != '') {
          if (forindex[sold_item[i].category]) {
            var item_refund = 0
            var item_sold = 0
            if (sold_product[i].value > 0) {
              item_sold += sold_product[i].value
            }
            else {
              item_refund += sold_product[i].value * (-1)
            }
            var TOTAL = 0
            var TOTAL_PRICE = 0
            TOTAL = sold_product[i].price * sold_product[i].value
            TOTAL_PRICE = sold_product[i].price * sold_product[i].value
            if (goodsObj[sold_product[i].product_id] == 'karaoke') {
              var tt = (sold_product[i].closed_time - sold_product[i].created_time) / 60000
              if (parseInt(tt) * 60000 < tt * 60000) {
                TOTAL *= (parseInt(tt) + 1)
                TOTAL_PRICE *= (parseInt(tt) + 1)
              }
              else {
                TOTAL_PRICE *= parseInt(tt)
                TOTAL *= parseInt(tt)
              }
            }
            sales.push({
              category_name: forindex[sold_item[i].category].name,
              category_id: forindex[sold_item[i].category].id,
              section_id: forindex[sold_item[i].category].section_id,
              total: TOTAL,
              cost_of_goods: sold_product[i].cost * sold_product[i].value,
              items_refunded: prd[prd_index[sold_item[i]._id]].refund_value,
              refunds: prd[prd_index[sold_item[i]._id]].refund_price,
              discount: prd[prd_index[sold_item[i]._id]].discount,
              items: [Object.assign({
                name: sold_item[i].name,
                inStock: sold_item[i].in_stock,
                total_price: TOTAL_PRICE,
                item_sold: item_sold,
                item_refund: item_refund,
                price: sold_product[i].price
              })],
              items_sold: sold_product[i].value,
              count: 1
            })
          }
        }
        else {
          if (forindex['NoCategory_test']) {
            sales.push({
              category_name: forindex['NoCategory_test'].name,
              category_id: forindex['NoCategory_test'].id,
              total: sold_product[i].price * sold_product[i].value,
              cost_of_goods: sold_product[i].cost * sold_product[i].value,
              items_refunded: prd[prd_index[sold_item[i]._id]].refund_value,
              refunds: prd[prd_index[sold_item[i]._id]].refund_price,
              discount: prd[prd_index[sold_item[i]._id]].discount,
              items: [Object.assign({
                name: sold_item[i].name,
                inStock: sold_item[i].in_stock,
                total_price: sold_product[i].price * sold_product[i].value
              })],
              items_sold: sold_product[i].value,
              count: 1
            })
          }
        }
      } else {
        if (sold_item[i].category != '') {
          var TOTAL = 0
          var TOTAL_PRICE = 0
          TOTAL = sold_product[i].price * sold_product[i].value
          TOTAL_PRICE = sold_product[i].price * sold_product[i].value
          if (goodsObj[sold_product[i].product_id] == 'karaoke') {
            var tt = (sold_product[i].closed_time - sold_product[i].created_time) / 60000
            if (parseInt(tt) * 60000 < tt * 60000) {
              TOTAL *= (parseInt(tt) + 1)
              TOTAL_PRICE *= (parseInt(tt) + 1)
            }
            else {
              TOTAL_PRICE *= parseInt(tt)
              TOTAL *= parseInt(tt)
            }
          }
          var j = setted[sold_item[i].category]
          if (sales[j] != undefined) {
            if (sold_product[i].value > 0)
              sales[j].total += TOTAL
            sales[j].cost_of_goods += sold_product[i].cost * sold_product[i].value
            if (sold_product[i].value > 0)
              sales[j].items_sold += sold_product[i].value
            sales[j].count++
            if (setitem[sold_item[i].name] == undefined) {
              indexitem[inde] = sales[j].items.length
              setitem[sold_item[i].name] = inde
              inde++
              var item_refund = 0
              var item_sold = 0
              if (sold_product[i].value > 0) {
                item_sold += sold_product[i].value
              }
              else {
                item_refund += sold_product[i].value * (-1)
              }
              sales[j].items.push({
                name: sold_item[i].name,
                inStock: sold_item[i].in_stock,
                total_price: TOTAL_PRICE,
                item_sold: item_sold,
                item_refund: item_refund,
                price: sold_product[i].price
              })
            } else {
              var index = indexitem[setitem[sold_item[i].name]]
              if (sales[j] != undefined)
                if (sales[j].items[index] != undefined)
                  if (sales[j].items[index].total_price == undefined) {
                    if (sold_product[i].value > 0) {
                      sales[j].items[index].item_sold = sold_product[i].value
                    }
                    else {
                      sales[j].items[index].item_refund = sold_product[i].value * (-1)
                    }
                    sales[j].items[index].total_price = TOTAL_PRICE
                  }
                  else {
                    if (sold_product[i].value > 0) {
                      sales[j].items[index].item_sold += sold_product[i].value
                    }
                    else {
                      sales[j].items[index].item_refund += sold_product[i].value * (-1)
                    }
                    sales[j].items[index].total_price += TOTAL_PRICE
                  }
            }
          }
        }
        else {
          var j = setted['NoCategory_test']
          if (sales[j] != undefined) {
            sales[j].total += sold_product[i].price * sold_product[i].value
            sales[j].cost_of_goods += sold_product[i].cost * sold_product[i].value
            sales[j].items_sold += sold_product[i].value
            sales[j].count++
            if (setitem[sold_item[i].name] == undefined) {
              indexitem[inde] = sales[j].items.length
              setitem[sold_item[i].name] = inde
              inde++
              sales[j].items.push({
                name: sold_item[i].name,
                inStock: sold_item[i].in_stock,
                total_price: sold_product[i].price * sold_product[i].value
              })
            } else {
              var index = indexitem[setitem[sold_item[i].name]]
              if (sales[j] != undefined)
                if (sales[j].items[index] != undefined)
                  if (sales[j].items[index].total_price == undefined)
                    sales[j].items[index].total_price = sold_product[i].price * sold_product[i].value
                  else
                    sales[j].items[index].total_price += sold_product[i].price * sold_product[i].value
            }
          }
        }
      }
    }
    var Answer = []
    if (request.params.name != 'undefined') {
      Answer = [[
        'name',
        'items_sold',
        'gross_sales',
        'items_refunded',
        'refunds',
        'discount',
        'net_sales',
        'cost_of_goods',
        'gross_profit'
      ]]
    }
    for (var sale of sales) {
      sale.gross_sales = sale.total
      var ref = 0
      if (sale.items == null) {
        sale.items = []
      }
      for (var item of sale.items) {
        ref += (item.price * item.item_refund)
      }
      sale.refunds = ref
      sale.net_sales = sale.gross_sales - sale.discount - sale.refunds
      sale.gross_profit = sale.net_sales - sale.cost_of_goods
      sale.items = sale.items
      if (request.params.name == undefined) {
        Answer.push(sale)
      }
      else {
        Answer.push([
          sale.category_name,
          sale.items_sold,
          sale.gross_sales,
          sale.items_refunded,
          sale.refunds,
          sale.discount,
          sale.net_sales,
          sale.cost_of_goods,
          sale.gross_profit
        ])
      }
    }
    if (request.body.section_id) {
      var Answer2 = []
      for (var i of Answer) {
        if (i.section_id == request.body.section_id) {
          Answer2.push(i)
        }
      }
      if (request.params.name == undefined) {
        Answer = Answer2
      }
    }
    if (request.params.page != undefined) {
      var total = Answer.length
      var limit = parseInt(request.params.limit)
      var page = parseInt(request.params.page)
      if (request.params.name == undefined) {
        Answer = {
          data: Answer.splice(limit * (page - 1), limit * page),
          total: total
        }
      }
    }
    if (request.params.name == undefined) {
      reply.ok(Answer)
    }
    else {
      instance.send_csv(Answer, 'by_category', reply)
    }
  }

  var reportsGoodsCategories = (request, reply, user, recepts, goodsSales, handler = sales_by_category) => {
    if (!user) {
      reply.error("Access")
    } else {
      var ides = []
      for (const goodsSale of goodsSales) {
        if (goodsSale.category != "" && goodsSale.category != null) {
          ides.push(goodsSale.category)
        }
      }
      ides = [...new Set(ides)]
      instance.goodsCategory.find({
        _id: {
          $in: ides
        }
      }, (err, items) => {
        if (err) {
          reply.error('Error on finding category')
          instance.send_Error('finding categ', JSON.stringify(err))
        } else {
          if (items == null) {
            items = []
          }
          handler(request, reply, user, recepts, goodsSales, items)
        }
      })
    }
  }

  var reportsGoodsSales = (request, reply, recepts, user, handler = reportsGoodsCategories) => {
    if (!user) {
      reply.error('Access')
    } else {
      var query = { organization: user.organization }
      var services = []
      if (request.body) {
        if (request.body.services) {
          if (request.body.services.length > 0) {
            for (let i = 0; i < request.body.services.length; i++) {
              request.body.services[i].service = instance.ObjectId(request.body.services[i].service)
            }
            services = request.body.services
            query.services = { $elemMatch: { service: { $in: services } } }
          }
        }
        if (request.body.service != '' && request.body.service != null) {
          services = [instance.ObjectId(request.body.service)]
          query.services = { $elemMatch: { service: { $in: services } } }
        }
      }
      instance.goodsSales.find(query, (error, items) => {
        if (error) {
          reply.error('Items could found')
        }
        else {
          if (items == null) {
            items = []
          }
          for (let i = 0; i < items.length; i++) {
            var in_stock = 0;
            for (var s of items[i].services) {
              if (services.includes(s.service)) {
                if (s.in_stock) {
                  in_stock += s.in_stock
                }
              }
            }
            items[i].in_stock = in_stock
            items[i].services = undefined
          }
          handler(request, reply, user, recepts, items)
        }
      })
    }
  }


  var just_simplier = async (request, reply, receipts, admin) => {

    var query = {
      organization: admin.organization
    }
    if (request.body) {
      if (request.body.services) {
        if (request.body.services.length > 0) {
          for (let i = 0; i < request.body.services.length; i++) {
            request.body.services[i] = instance.ObjectId(request.body.services[i])
          }
          query.services = { $elemMatch: { service: { $in: request.body.services }, available: { $eq: true } } }
        }
      }
    }

    var index = 0
    var indexObj = {}
    var answer = []
    const itemIds = []
    const universalObj = {}

    for (var r of receipts) {
      for (var s of r.sold_item_list) {
        // calculated discount
        var discount = 0.0
        for (var dis of r.discount) {
          if (dis.type == 'percentage') {
            discount += s.price * s.value * dis.value / 100.0
            //  * (r.is_refund ? (-1) : 1)
          }
          else {
            discount += dis.value
            //  * (r.is_refund ? (-1) : 1)
          }
        }

        // get item category
        if (!universalObj[s.product_id]) {
          try {
            const good = await instance.goodsSales.findById(s.product_id)
            if (good && good.category) {
              universalObj[s.product_id] = good.category
            }
          } catch (error) { }
        }
        // calculate sold and refund

        if (universalObj[s.product_id]) {
          if (indexObj[universalObj[s.product_id]] == undefined) {
            indexObj[universalObj[s.product_id]] = index
            var sub_name = ''
            // if (universalObj[s.product_id].parent_categories) {
            //   if (universalObj[s.product_id].parent_categories.length > 0) {
            //     for (var C of universalObj[s.product_id].parent_categories) {
            //       sub_name = sub_name + C.category_name + '->'
            //     }
            //   }
            // }
            let name;
            try {
              const curCat = await instance.goodsCategory.findById(universalObj[s.product_id])
              if (curCat) {
                name = curCat.name
              }
            } catch (error) { }
            if (name) {
              answer.push({
                category_name: name,
                items_sold: 0,
                gross_sales: 0,
                items_refunded: 0,
                refunds: 0,
                discount: 0,
                net_sales: 0,
                cost_of_goods: 0,
                gross_profit: 0
              })
              index++
            }
          }
        }
        if (universalObj[s.product_id] && typeof indexObj[universalObj[s.product_id]] == typeof 5) {
          answer[indexObj[universalObj[s.product_id]]].gross_sales += (s.price * s.value * (r.is_refund ? 0 : 1))
          answer[indexObj[universalObj[s.product_id]]].items_sold += s.value * (r.is_refund ? 0 : 1)
          answer[indexObj[universalObj[s.product_id]]].items_refunded += s.value * (r.is_refund ? 1 : 0)
          answer[indexObj[universalObj[s.product_id]]].refunds += (s.price * s.value * (r.is_refund ? 1 : 0))
          answer[indexObj[universalObj[s.product_id]]].discount += discount * (r.is_refund ? (-1) : 1)
          answer[indexObj[universalObj[s.product_id]]].net_sales += (s.price * s.value - discount) * (r.is_refund ? (-1) : 1)
          answer[indexObj[universalObj[s.product_id]]].cost_of_goods += s.cost * s.value * (r.is_refund ? (-1) : 1)
          answer[indexObj[universalObj[s.product_id]]].gross_profit += ((s.price - s.cost) * s.value - discount) * (r.is_refund ? (-1) : 1)
        }
      }
    }

    var page = parseInt(request.params.page)
    var limit = parseInt(request.params.limit)

    if (request.body && typeof request.body.search == typeof 'invan') {
      const ANSWER = [];
      for (const res of answer) {
        if (res.category_name && res.category_name.toLowerCase().match(request.body.search.toLowerCase())) {
          ANSWER.push(res)
        }
      }
      answer = ANSWER
    }

    var total = answer.length
    answer = answer.slice((page - 1) * limit, limit * page)
    if (request.params.name == undefined) {
      reply.ok({
        total: total,
        page: Math.ceil(total / limit),
        data: answer
      })
    }

    /*instance.goodsSales.aggregate([
      {
        $match: query
      },
      {
        $lookup: {
          from: 'goodscategories',
          let: {category: '$category_id', organization: '$organization'},
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [{
                    $and: [
                      {$eq: ['$organization', '$$organization']},
                      {$eq: ['$_id', '$$category']}
                    ]
                  },
                  {
                    $and: [
                      {$eq: ['$organization', '$$organization']},
                      {$eq: ['$is_other', true]}
                    ]
                  }]
                }
              }
            }
          ],
          as: "CATEGORY"
        }
      }
    ], (err, goods) => {
      var universalObj = {}
      for(var p of goods) {
        if(p.CATEGORY.length == 1) {
          universalObj[p._id] = p.CATEGORY[0]
        }
        else {
          for(var c of p.CATEGORY) {
            if(c.is_other == false){
              universalObj[p._id] = c
            }
          }
        }
      }
      var index = 0
      var indexObj = {}
      var answer = []
      for(var r of receipts) {
        for(var s of r.sold_item_list) {
          // calculated discount
          var discount = 0.0
          for(var dis of r.discount) {
            if(dis.type == 'percentage') {
              discount += s.price*s.value*dis.value/100.0
              //  * (r.is_refund ? (-1) : 1)
            }
            else {
              discount += dis.value
              //  * (r.is_refund ? (-1) : 1)
            }
          }
          // calculate sold and refund
 
          if(universalObj[s.product_id])
          if(indexObj[universalObj[s.product_id]._id] == undefined) {
            indexObj[universalObj[s.product_id]._id] = index
            var sub_name = ''
            if(universalObj[s.product_id].parent_categories) {
              if(universalObj[s.product_id].parent_categories.length>0) {
                for(var C of universalObj[s.product_id].parent_categories) {
                  sub_name = sub_name + C.category_name + '->'
                }
              }
            }
            answer.push({
              category_name: sub_name+universalObj[s.product_id].name,
              items_sold: 0,
              gross_sales: 0,
              items_refunded: 0,
              refunds: 0,
              discount: 0,
              net_sales: 0,
              cost_of_goods: 0,
              gross_profit: 0
            })
            index ++
          }
          if(universalObj[s.product_id]){
            answer[indexObj[universalObj[s.product_id]._id]].gross_sales += (s.price*s.value * (r.is_refund ? 0 : 1))
            answer[indexObj[universalObj[s.product_id]._id]].items_sold += s.value * (r.is_refund ? 0 : 1)
            answer[indexObj[universalObj[s.product_id]._id]].items_refunded += s.value * (r.is_refund ? 1 : 0)
            answer[indexObj[universalObj[s.product_id]._id]].refunds += (s.price*s.value * (r.is_refund ? 1 : 0))
            answer[indexObj[universalObj[s.product_id]._id]].discount += discount * (r.is_refund ? (-1) : 1)
            answer[indexObj[universalObj[s.product_id]._id]].net_sales += (s.price*s.value-discount) * (r.is_refund ? (-1) : 1)
            answer[indexObj[universalObj[s.product_id]._id]].cost_of_goods += s.cost*s.value * (r.is_refund ? (-1) : 1)
            answer[indexObj[universalObj[s.product_id]._id]].gross_profit += ((s.price-s.cost)*s.value-discount) * (r.is_refund ? (-1) : 1)
          }
        }
      }
      var page = parseInt(request.params.page)
      var limit = parseInt(request.params.limit)
      var total = answer.length
      answer = answer.slice((page-1)*limit, limit*page)
      if(request.params.name == undefined) {
        reply.ok({
          total: total,
          page: Math.ceil(total/limit),
          data: answer
        })
      }
      else {
        var Answer = [[
          'name',
          'items_sold',
          'gross_sales',
          'items_refunded',
          'refunds',
          'discount',
          'net_sales',
          'cost_of_goods',
          'gross_profit'
        ]]
        for(var sale of answer) {
          Answer.push([
            sale.category_name,
            sale.items_sold,
            sale.gross_sales,
            sale.items_refunded,
            sale.refunds,
            sale.discount,
            sale.net_sales,
            sale.cost_of_goods,
            sale.gross_profit
          ])
        }
        instance.send_csv(Answer, 'by_category', reply)
      }
    })*/

  }


  const categoryParams = {
    version: '1.0.0',
    schema: {
      params: {
        type: 'object',
        required: [
          'min', 'max', 'limit', 'page'
        ],
        properties: {
          min: { type: 'number', minimum: 1 },
          max: { type: 'number', minimum: 1 },
          limit: { type: 'number', minimum: 1 },
          page: { type: 'number', minimum: 1 },
        }
      },
      body: {
        type: 'object',
        required: [
          'custom', 'employees',
          'end', 'services', 'start'
        ],
        properties: {
          custom: { type: 'boolean' },
          start: { type: 'number' },
          end: { type: 'number' },
          employees: {
            type: 'array',
            items: {
              type: 'string',
              minLength: 24,
              maxLength: 24
            }
          },
          services: {
            type: 'array',
            items: {
              type: 'string',
              minLength: 24,
              maxLength: 24
            }
          },
          search: {
            type: 'string',
            default: ''
          }
        }
      }
    }
  }

  const by_category_report = async (request, reply, admin) => {
    const { min, max, limit, page } = request.params;
    const { custom, start, end, services, employees, search } = request.body;

    const user_available_services = request.user.services.map(serv => serv.service.toString())

    const filterReceipts = {
      organization: admin.organization,
      receipt_state: {
        $ne: 'draft'
      },
      service: { $in: user_available_services },
      debt_id: null,
      date: {
        // $gte: min - (process.env.TIME_DIFF | 0),
        // $lte: max - (process.env.TIME_DIFF | 0),
        $gte: min,
        $lte: max,
      }
    }

    if (services && services.length > 0) {
      for (const service of services) {
        if (!user_available_services.includes(service)) {
          return reply.error('Acces denied')
        }
      }

      filterReceipts.service = {
        $in: services
      }
    }

    if (custom) {
      const additional_query = []
      for (let i = min; i < max; i += 86400000) {
        additional_query.push({
          date: {
            // $lte: i + end * 3600000 - (process.env.TIME_DIFF | 0),
            // $gte: i + start * 3600000 - (process.env.TIME_DIFF | 0),
            $lte: i + end * 3600000,
            $gte: i + start * 3600000,
          }
        })
      }
      delete filterReceipts.date
      filterReceipts['$or'] = additional_query
    }

    if (employees && employees.length > 0) {
      const employeesFilter = [
        {
          $and: [
            {
              waiter_id: ""
            },
            {
              cashier_id: {
                $in: employees
              }
            }
          ]
        },
        {
          $and: [
            {
              cashier_id: ""
            },
            {
              waiter_id: {
                $in: employees
              }
            }
          ]
        },
        {
          $and: [
            {
              waiter_id: {
                $ne: ""
              }
            },
            {
              cashier_id: {
                $ne: ""
              }
            },
            {
              waiter_id: {
                $in: employees
              }
            }
          ]
        }
      ]
      if (filterReceipts['$or']) {
        filterReceipts['$and'] = [
          { $or: employeesFilter },
          { $or: filterReceipts['$or'] }
        ]
        delete filterReceipts['$or']
      }
      else {
        filterReceipts['$or'] = employeesFilter
      }
    }

    const unwindSoldItemList = {
      $unwind: "$sold_item_list"
    }

    const calculateItemsReport = {
      $group: {
        _id: "$sold_item_list.category_id",
        category_name: {
          $last: "$sold_item_list.category_name"
        },
        cost_of_goods: {
          $sum: {
            $multiply: [
              { $max: ["$sold_item_list.cost", 0] },
              { $max: ["$sold_item_list.value", 0] },
              {
                $cond: [
                  "$is_refund",
                  -1, 1
                ]
              }
            ]
          }
        },
        gross_sales: {
          $sum: {
            $multiply: [
              { $max: ["$sold_item_list.price", 0] },
              { $max: ["$sold_item_list.value", 0] },
              {
                $cond: [
                  "$is_refund",
                  0, 1
                ]
              }
            ]
          }
        },
        refunds: {
          $sum: {
            $multiply: [
              { $max: ["$sold_item_list.price", 0] },
              { $max: ["$sold_item_list.value", 0] },
              {
                $cond: [
                  "$is_refund",
                  1, 0
                ]
              }
            ]
          }
        },
        discounts: {
          $sum: {
            $multiply: [
              {
                $max: [
                  "$sold_item_list.total_discount",
                  0
                ]
              },
              {
                $cond: [
                  "$is_refund",
                  -1, 1
                ]
              }
            ]
          }
        },
        items_sold: {
          $sum: {
            $cond: [
              "$is_refund",
              0,
              {
                $cond: [
                  { $eq: ['$sold_item_list.sold_item_type', 'box_item'] },
                  {
                    $divide: [
                      { $max: ["$sold_item_list.value", 0] },
                      { $max: ["$sold_item_list.count_by_type", 1] }
                    ]
                  },
                  { $max: ["$sold_item_list.value", 0] }
                ]
              }
            ]
          }
        },
        items_refunded: {
          $sum: {
            $cond: [
              "$is_refund",
              {
                $cond: [
                  { $eq: ['$sold_item_list.sold_item_type', 'box_item'] },
                  {
                    $divide: [
                      { $max: ["$sold_item_list.value", 0] },
                      { $max: ["$sold_item_list.count_by_type", 1] }
                    ]
                  },
                  { $max: ["$sold_item_list.value", 0] }
                ]
              },
              0
            ]
          }
        },
        taxes: { $sum: 0 }
      }
    }

    const searchByItemName = {
      $match: {
        category_name: {
          $regex: (search ? search : ''),
          $options: 'i'
        }
      }
    }

    const sortResult = {
      $sort: {
        gross_sales: -1
      }
    }

    const skipResult = {
      $skip: limit * (page - 1)
    }

    const limitResult = {
      $limit: limit
    }

    const projectResult = {
      $project: {
        id: "$_id",
        category_name: "$category_name",
        cost_of_goods: 1,
        gross_sales: 1,
        refunds: 1,
        discounts: 1,
        items_sold: 1,
        items_refunded: 1,
        taxes: 1,
        net_sales: {
          $subtract: [
            "$gross_sales",
            {
              $add: ["$refunds", "$discounts"]
            }
          ]
        },
        gross_profit: {
          $subtract: [
            {
              $subtract: [
                "$gross_sales",
                {
                  $add: ["$refunds", "$discounts"]
                }
              ]
            },
            "$cost_of_goods"
          ]
        }
      }
    }

    const result = await instance.Receipts.aggregate([
      {
        $match: filterReceipts
      },
      unwindSoldItemList,
      calculateItemsReport,
      searchByItemName,
      sortResult,
      skipResult,
      limitResult,
      projectResult
    ])
      .allowDiskUse(true)
      .exec();

    const groupSoldItems = {
      $group: {
        _id: "$sold_item_list.category_id",
        category_name: {
          $last: "$sold_item_list.category_name"
        }
      }
    }

    const countAllItems = {
      $group: {
        _id: null,
        count: {
          $sum: 1
        }
      }
    }

    const totalCount = await instance.Receipts.aggregate([
      {
        $match: filterReceipts
      },
      unwindSoldItemList,
      groupSoldItems,
      searchByItemName,
      countAllItems
    ])
      .allowDiskUse(true)
      .exec();

    const total_result = totalCount && totalCount.length > 0 && totalCount[0].count ? totalCount[0].count : 0;

    reply.ok({
      total: total_result,
      page: Math.ceil(total_result / limit),
      data: result
    })
  }

  instance.post(
    '/reports/sales/by_category/next/:min/:max/:limit/:page',
    categoryParams,
    (request, reply) => {
      instance.authorization(request, reply, (admin) => {
        if (!admin) {
          return reply.error('Access')
        }
        by_category_report(request, reply, admin)
        // if (admin) {
        //   instance.get_receipt_by_range(request, reply, admin, just_simplier)
        // }
      })
    })



  // instance.get('/reports/sales/by_category/next/:token/:services/:employees/:custom/:limit/:page/:min/:max/:name', (request, reply) => {
  //   request.headers = {
  //     'authorization': request.params.token,
  //     'accept-user': 'admin'
  //   }
  //   request.params.services = request.params.services.split('[').join('').split(']').join('').split('\'').join('').split('"').join('').split('`')
  //   request.params.employees = request.params.employees.split('[').join('').split(']').join('').split('\'').join('').split('"').join('').split('`')
  //   var services = []
  //   for (var s of request.params.services) {
  //     if (s != '') {
  //       services.push(s)
  //     }
  //   }
  //   var employees = []
  //   for (var s of request.params.employees) {
  //     if (s != '') {
  //       employees.push(s)
  //     }
  //   }
  //   request.body = {
  //     services: services,
  //     employees: employees,
  //     custom: request.params.custom == 'true',
  //     start: request.params.start,
  //     end: request.params.end
  //   }
  //   instance.authorization(request, reply, (admin) => {
  //     instance.get_receipt_by_range(request, reply, admin, just_simplier)
  //   })
  // })

  next()
}