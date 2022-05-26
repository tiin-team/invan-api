const fp = require('fastify-plugin');

module.exports = fp((instance, _, next) => {
  // create items for back office

  instance.decorate('check_sku_and_category', (request, organization, next) => {
    if (!request.body) {
      request.body = {}
    }

    if (request.body.representation_type === "") {
      delete request.body.representation_type
    }
    if (request.body.created_time === undefined) {
      request.body.created_time = new Date().getTime()
    }
    if (request.body.in_stock === '') {
      delete request.body.in_stock
    }
    if (request.body.representation === "") {
      delete request.body.representation
    }
    if (request.body.shape === "") {
      delete request.body.shape
    }
    if (request.body.is_composite_item === '') {
      request.body.is_composite_item = false
    }
    if (typeof request.body.category_name != typeof 'invan') {
      request.body.category_name = 'Other'
    }
    instance.goodsCategory.findOne({ name: request.body.category_name, organization: organization }, (err, cat) => {
      if (err || cat == null) {
        instance.goodsCategory.findOne({ organization: organization, is_other: true }, (err, catg) => {
          if (err || catg == null) {
            next({
              success: 0
            })
          }
          else {
            request.body.category = catg._id
            request.body.category_name = "Other"
            request.body.category_id = instance.ObjectId(catg._id)
            instance.check_sku(request, organization, next)
          }
        })
          .lean()
      }
      else {
        request.body.category = cat._id
        request.body.category_id = instance.ObjectId(cat._id)
        instance.check_sku(request, organization, next)
      }
    })
      .lean()
  })

  // check sku

  instance.decorate('check_sku', (request, organization, next) => {
    if (request.body.sku != '') {
      let query = { organization: organization, sku: request.body.sku }
      if (typeof request.body.hot_key == typeof 'invan' && request.body.hot_key != '') {
        delete query.sku
        query[`$or`] = [
          {
            sku: request.body.sku
          },
          {
            hot_key: request.body.hot_key
          }
        ]
      }

      instance.goodsSales.findOne(query, (err, item) => {
        if (err) {
          next({
            success: 0
          })
        }
        else {
          const item_id = request.params && request.params.id ? request.params.id : ''
          if (item) {
            if (request.params != undefined) {
              if (request.params.id == item._id) {
                if (request.body.barcode && (request.body.barcode instanceof Array) && request.body.barcode.length > 0) {
                  let barcode = JSON.parse(JSON.stringify(request.body.barcode))
                  const barcodes = barcode;
                  let barcode_by_type = request.body.barcode_by_type
                  if (request.body.sold_by == 'box' && typeof barcode_by_type == typeof 'invan' && barcode_by_type.length > 0) {
                    barcodes.push(barcode_by_type)
                  }

                  instance.goodsSales.findOne({ organization: organization, barcode: { $elemMatch: { $in: barcodes } } }, (_, item2) => {
                    if (item2 && item2._id == request.params.id || !item2) {
                      next({
                        success: 1,
                        data: request.body
                      })
                    }
                    else {
                      next({
                        success: 0,
                        barcode: 1
                      })
                    }
                  })
                    .lean()
                }
                else {
                  next({
                    success: 1,
                    data: request.body
                  })
                }
              }
              else {
                next({
                  success: 0,
                  sku: 1
                })
              }
            }
            else {
              next({
                success: 0,
                sku: 1
              })
            }
          }
          else {
            if ((request.body.barcode instanceof Array) && request.body.barcode.length > 0) {
              let barcode = JSON.parse(JSON.stringify(request.body.barcode));
              const barcodes = barcode
              let barcode_by_type = request.body.barcode_by_type
              if (request.body.sold_by == 'box' && typeof barcode_by_type == typeof 'invan' && barcode_by_type.length > 0) {
                barcodes.push(barcode_by_type)
              }
              const by_barcode_query = { _id: { $ne: item_id }, organization: organization, barcode: { $elemMatch: { $in: barcodes } } }
              if (!item_id || item_id.length != 24) {
                delete by_barcode_query._id
              }
              instance.goodsSales.findOne(by_barcode_query, (err, item2) => {
                if (item2) {
                  next({
                    success: 0,
                    barcode: 1
                  })
                }
                else if (!err) {
                  next({
                    success: 1,
                    data: request.body
                  })
                }
                else {
                  next({
                    success: 0,
                    barcode: 1
                  })
                }
              })
            }
            else {
              next({
                success: 1,
                data: request.body
              })
            }
          }
        }
      })
        .lean()
    }
    else {
      next({
        success: 0,
        sku: 1
      })
    }
  })

  instance.decorate(
    'update_in_stock_of_sold_items',
    async (id, service_id, in_stock, user, receipt, REASON = 'other', request = null, by_box = 0) => {
      if (typeof by_box != typeof 5) {
        by_box = 0
      }

      if (typeof in_stock != typeof 5) {
        if (+in_stock) {
          in_stock = +in_stock
        }
        else {
          in_stock = 0
        }
      }

      try { service_id = instance.ObjectId(service_id) }
      catch (err) { }

      try {
        const item = await instance.goodsSales.findOne({ _id: id })
        if (item != null) {
          if (item.item_type == 'variant') {
            try {
              const parent = await instance.goodsSales.findOne({
                variant_items: {
                  $elemMatch: { $eq: item._id }
                }
              })
              if (parent) {
                item.name = `${parent.name} ( ${item.name} )`;
                if (typeof item.is_track_stock != typeof true) {
                  item.is_track_stock = parent.is_track_stock
                }
                item.is_composite_item = parent.is_composite_item
              }
            }
            catch (err) { }
          }

          // if (item.is_track_stock || item.is_composite_item) {
          if (item.is_composite_item && item.use_production == false) {
            for (var i of item.composite_items) {
              await instance.update_in_stock_of_sold_items(i.product_id, service_id, i.quality * in_stock, user, receipt)
            }
          }
          else {
            if (!in_stock) {
              in_stock = 0
            }
            let val1 = `{
            "$inc": {
              "services.$[elem].in_stock": ${in_stock}
            },
            "$set": {
              "last_updated": ${new Date().getTime()}`

            if (REASON != 'other') {
              val1 += `,
              "last_stock_updated": ${new Date().getTime()}
            `
            }

            val1 += `
            }
          }
          `

            let old_reminder;
            let new_reminder;

            if (by_box) {
              if (by_box > 0) {
                if (item.count_by_type) {
                  in_stock -= Math.floor(by_box / item.count_by_type)
                  by_box = (by_box % item.count_by_type)
                }

                if (item.services instanceof Array) {
                  let less = false
                  let reminder = 0;
                  for (const s of item.services) {
                    if (service_id + '' == s.service + '') {
                      if (s.reminder < by_box || s.reminder < 0) {
                        less = true
                        reminder = s.reminder
                      }
                      old_reminder = s.reminder
                    }
                  }
                  if (less) {
                    in_stock -= 1
                    by_box = item.count_by_type - by_box
                  }
                  else {
                    by_box *= -1
                  }
                  if (typeof old_reminder == typeof 5) {
                    new_reminder = old_reminder + by_box
                  }
                }
              }
              else {
                if (item.count_by_type) {
                  in_stock -= Math.ceil(by_box / item.count_by_type)
                  by_box = (-1) * (by_box % item.count_by_type)
                }

                if (item.services instanceof Array) {
                  let less = false
                  let reminder = 0;
                  for (const s of item.services) {
                    if (service_id + '' == s.service + '') {
                      if (s.reminder + by_box >= item.count_by_type || s.reminder < 0) {
                        less = true
                        reminder = s.reminder
                      }
                      old_reminder = s.reminder
                    }
                  }
                  if (less) {
                    in_stock += 1
                    by_box = by_box - item.count_by_type;
                  }
                  if (typeof old_reminder == typeof 5) {
                    new_reminder = old_reminder + by_box
                  }
                }

              }

              val1 = `{
              "$inc": {
                "services.$[elem].in_stock": ${in_stock},
                "services.$[elem].reminder": ${by_box}
              },
              "$set": {
                "last_updated": ${new Date().getTime()}`

              if (REASON != 'other') {
                val1 += `,
                "last_stock_updated": ${new Date().getTime()}
              `
              }

              val1 += `
              }
            }
            `
            }
            const val2 = `{
            "arrayFilters": [
                {
                  "elem.service": {
                    "$eq": "${service_id}"
                  }
                }
              ]
          }`

            var updateQuery1 = JSON.parse(val1)
            var updateQuery2 = JSON.parse(val2)

            try {
              await instance.goodsSales.updateOne({ _id: id }, updateQuery1, updateQuery2)
              const g = await instance.goodsSales.findOne({ _id: id })
              if (g) {
                var insstock = 987654321;
                for (const s of g.services) {
                  if (s.service + '' == service_id + '') {
                    insstock = s.in_stock
                  }
                }
                if (REASON == 'other') {
                  var reason = receipt.is_refund == true ? 'returned' : 'sold'
                  if (insstock != 987654321) {
                    await instance.create_inventory_history(user, reason, receipt.receipt_no, service_id, id, g.cost, in_stock, insstock, receipt.date)
                  }
                }
                else {
                  await instance.create_inventory_history(user, REASON, receipt.receipt_no, service_id, id, g.cost, in_stock, insstock, receipt.date)
                }

                if ((typeof old_reminder == typeof 5 || typeof new_reminder == typeof 5) && old_reminder != new_reminder) {
                  const reason = REASON == 'other' ? (receipt.is_refund ? 'returned' : 'sold') : REASON;
                  await instance.create_reminder_history(user, reason, receipt.receipt_no, service_id, id, g.cost, old_reminder, new_reminder, receipt.date)
                }
              }
              instance.push_changes(request, 101, service_id)
            } catch (error) {
              instance.send_Error('Error on updating Item', JSON.stringify(error.message))
            }

          }
          // }
          // else {
          //   instance.goodsSales.updateOne({
          //     _id: item._id
          //   }, {
          //     $set: {
          //       "services.$[elem].in_stock": 0,
          //       last_updated: new Date().getTime()
          //     }
          //   }, {
          //     arrayFilters: [
          //       {
          //         "elem.service": {
          //           $nin: []
          //         }
          //       }
          //     ]
          //   }, (err) => {
          //     instance.push_changes(request, 101, service_id)
          //     if (err) {
          //       instance.send_Error('Error on updating to 0', JSON.stringify(err))
          //     }
          //   })
          // }
        }
        // instance.goodsSales.findOne({ _id: id }, async (err, item) => {
        //   if (err) {
        //     instance.send_Error('updating in_stock of item', JSON.stringify(err))
        //   }
        //   else if (item) {

        //   }
        // })
      } catch (error) {

      }
    })

  instance.decorate('update_composite_items_for_pro', (id, service_id, in_stock, user, receipt, REASON = 'other') => {
    instance.goodsSales.findOne({ _id: id }, (err, item) => {
      if (err) {
        instance.send_Error('updating in_stock of item', JSON.stringify(err))
      }
      else if (item) {
        if (!(item.composite_items instanceof Array)) {
          item.composite_items = []
        }
        for (var i of item.composite_items) {
          if (i.product_id != '' && i.product_id != null) {
            instance.update_in_stock_of_sold_items(i.product_id, service_id, i.quality * in_stock, user, receipt, REASON)
          }
        }
      }
    })
  })

  instance.decorate('updateGoodsSales', async (id, data, user, service) => {
    try {
      const item = await instance.goodsSales.findOne({ _id: id }).lean();
      const services = await instance.services.find({ organization: user.organization }).lean();

      const itemServicesMap = {}
      if (typeof item.services == typeof []) {
        for (const ser of item.services) {
          try {
            itemServicesMap[ser.service] = ser.toObject()
          }
          catch (error) {
            instance.send_Error('to Object', error.message)
          }
        }
      }
      const item_services = []
      let change = data.in_stock
      for (const ser of services) {
        if (itemServicesMap[ser._id]) {
          item_services.push({
            ...itemServicesMap[ser._id],
            service: ser._id,
            service_name: ser.name
          })
        }
        else {
          item_services.push({
            available: false,
            price: item.price,
            in_stock: 0,
            service: ser._id,
            service_name: ser.name
          })
        }
        if (item_services[item_services.length - 1].service == service && typeof item_services[item_services.length - 1].in_stock == typeof 5) {
          change -= item_services[item_services.length - 1].in_stock
        }
      }

      data.services = item_services
      data.last_updated = new Date().getTime()

      if (change != 0) {
        instance.create_inventory_history(user, 'item edit', "", service, id, data.cost, change, data.in_stock, new Date().getTime())
      }
      return await instance.goodsSales.updateOne({
        _id: id
      }, {
        $set: data
      })
    } catch (error) {
      return false
    }
  })

  // get good by id

  instance.decorate('get_product_by_id', async (id, reply, admin) => {
    try {
      const organization = await instance.organizations.findById(org_id, { nds_value: 1, name: 1 }).lean();
      const item = await instance.goodsSales.findById(id).lean();
      item.nds_value = item.nds_value >= 0 ? item.nds_value : organization.nds_value;
      if (!item) {
        return reply.fourorfour('Item')
      }

      // get Category
      try {
        const category = await instance.goodsCategory.findById(item.category).lean();
        if (!category) {
          const other_category = await instance.goodsCategory
            .findOne({ organization: admin.organization, is_other: true })
            .lean();
          if (other_category) {
            item.category = other_category._id;
            item.category_name = other_category.name;
          }
          else {
            delete item.category;
            delete item.category_name;
          }
        }
        else {
          item.category = category._id
          item.category_name = category.name
        }
      } catch (error) {
        delete item.category;
        delete item.category_name;
        instance.log.error(error.message)
      }

      // get Supplier
      try {
        const supplier = await instance.adjustmentSupplier
          .findById(item.primary_supplier_id)
          .lean();
        if (supplier) {
          item.primary_supplier_id = supplier._id;
          item.primary_supplier_name = supplier.supplier_name;
        }
        else {
          delete item.primary_supplier_id;
          delete item.primary_supplier_name;
        }
      } catch (error) {
        delete item.primary_supplier_id;
        delete item.primary_supplier_name;
        instance.log.error(error.message)
      }

      // get taxes
      // try {
      //   const taxes = await instance.settingsTaxes.find({ organization: admin.organization }).lean();

      // } catch (error) { }

      // composite items
      try {
        const comp_ids = [], comItemMap = {}
        for (const c of item.composite_items) {
          comp_ids.push(c.product_id)
          comItemMap[c.product_id + ''] = c.quality;
        }
        const composite_items = await instance.goodsSales
          .find(
            { _id: { $in: comp_ids } },
            {
              name: 1,
              cost: 1,
              cost_currency: 1
            }
          )
          .lean();
        let cost = 0;
        const updated_composite_items = [];
        for (const it of composite_items) {
          cost += it.cost * comItemMap[it._id + '']
          updated_composite_items.push({
            product_id: it._id,
            product_name: it.name,
            own_cost: it.cost * comItemMap[it._id + ''],
            cost: it.cost,
            cost_currency: it.cost_currency,
            quality: comItemMap[it._id + '']
          })
        }
        item.composite_items = updated_composite_items;
        if (item.composite_items.length > 0) {
          item.cost = cost
        }
      } catch (error) {
        item.composite_items = [];
        instance.log.error(error.message)
      }

      // get Services
      try {
        const user_available_services = admin.services.map(serv => serv.service)
        const services = await instance.services
          .find(
            {
              _id: { $in: user_available_services },
              organization: admin.organization,
            },
            { name: 1 },
          )
          .lean();
        const servicesMap = {}
        for (const s of services) {
          servicesMap[s._id + ''] = s.name;
        }
        if (item.has_variants) {
          const variant_items = await instance.goodsSales
            .find({ _id: { $in: item.variant_items } })
            .lean();
          const item_services = []
          for (const v_item_ind in variant_items) {
            const v_item = variant_items[v_item_ind];
            if (!(v_item.services instanceof Array)) {
              v_item.services = []
            }
            v_item.services = item.services.filter(serv => {
              if (user_available_services.find(u_serv => u_serv + '' === serv.service + ''))
                return serv;
              else return false;
            })
            const itemServicesMap = {};
            const sp_item_services = [];
            for (const s of v_item.services) {
              itemServicesMap[s.service + ''] = s;
            }
            for (const s of services) {
              if (itemServicesMap[s._id + '']) {
                itemServicesMap[s._id + ''].service_name = s.name;
                item_services.push(itemServicesMap[s._id + ''])
                sp_item_services.push(itemServicesMap[s._id + ''])
              }
              else {
                const sObj = {
                  service: s._id,
                  service_name: s.name,
                  available: false,
                  price: 0,
                  in_stock: 0,
                  prices: []
                }
                item_services.push(sObj);
                sp_item_services.push(sObj);
              }
            }
            variant_items[v_item_ind].services = sp_item_services;
          }
          item.variant_services = item_services;
          item.variant_items = variant_items;
          return reply.ok(item)
        }
        const itemServicesMap = {}
        if (!(item.services instanceof Array)) {
          item.services = []
        }
        item.services = item.services.filter(serv => {
          if (user_available_services.find(u_serv => u_serv + '' === serv.service + ''))
            return serv;
          else return false;
        })

        for (const s of item.services) {
          itemServicesMap[s.service + ''] = s;
        }
        const item_services = [];
        for (const s of services) {
          if (itemServicesMap[s._id + '']) {
            itemServicesMap[s._id + ''].service_name = s.name;
            item_services.push(itemServicesMap[s._id + ''])
            if (typeof itemServicesMap[s._id + ''].in_stock == 'number') {
              itemServicesMap[s._id + ''].in_stock = Math.round(itemServicesMap[s._id + ''].in_stock * 100) / 100
            }
          }
          else {
            item_services.push({
              service: s._id,
              service_name: s.name,
              available: false,
              price: 0,
              in_stock: 0,
              prices: []
            })
          }
        }
      } catch (error) {
        instance.log.error(error.message)
      }

      return reply.ok(item);
    } catch (error) {
      instance.log.error(error.message)
      return reply.error(error.message);
    }

    /*
    instance.goodsSales.aggregate([
      {
        $match: {
          _id: id
        }
      },
      {
        $lookup: {
          from: 'goodscategories',
          localField: 'category_id',
          foreignField: '_id',
          as: 'categoryObj'
        }
      },
      {
        $lookup: {
          from: 'adjustmentsuppliers',
          localField: 'primary_supplier_id',
          foreignField: '_id',
          as: 'Supplier'
        }
      },
      {
        $lookup: {
          from: 'inoneservices',
          localField: 'organization',
          foreignField: 'organization',
          as: 'SERVICES'
        }
      },
      {
        $lookup: {
          from: 'settingstaxes',
          localField: 'organization',
          foreignField: 'organization',
          as: 'TAXES'
        }
      }
    ], async (err, item) => {
      if (item == null) {
        item = {}
      }
      if (item.length > 0) {
        item = item[0]
        var comps = []
        var compQuality = {}
        for (var c of item.composite_items) {
          if (c.product_id != '' && c.product_id != null) {
            comps.push(c.product_id)
            compQuality[c.product_id + ''] = c.quality
          }
        }
        var serviceObj = {}
        if (!item.SERVICES || item.SERVICES.length == 0) {
          const services = await instance.services.find({ organization: admin.organization })
          item.SERVICES = services
        }
 
        for (let i = 0; i < item.SERVICES.length; i++) {
          serviceObj[item.SERVICES[i]._id + ''] = item.SERVICES[i].name
        }
        var servicesList = []
        if (!item.services) {
          item.services = []
        }
        if (!item.price_currency) {
          item.price_currency = 'uzs'
        }
        if (!item.cost_currency) {
          item.cost_currency = 'uzs'
        }
        if (!item.purchase_cost_currency) {
          item.purchase_cost_currency = 'uzs'
        }
        for (let i = 0; i < item.SERVICES.length; i++) {
          if (item.services[i] && serviceObj[item.SERVICES[i]._id + '']) {
            item.services[i].service_name = serviceObj[item.SERVICES[i]._id + '']
            if (!item.services[i].price_currency) {
              item.services[i].price_currency = 'uzs'
            }
            servicesList.push(item.services[i])
          }
          else {
            servicesList.push({
              available: false,
              service_name: serviceObj[item.SERVICES[i]._id + ''],
              service: item.SERVICES[i]._id,
              price: item.price,
              price_currency: 'uzs',
              prices: [],
              in_stock: 0,
              low_stock: 0,
              optimal_stock: 0
            })
          }
        }
        item.services = servicesList
        item.SERVICES = undefined
 
        var taxesList = []
        var taxObj = {}
        for (let i = 0; i < item.TAXES.length; i++) {
          taxObj[item.TAXES[i]._id + ''] = item.TAXES[i].name
        }
        for (var t of item.taxes) {
          if (taxObj[t.tax_id + '']) {
            t.name = taxObj[t.tax_id + '']
            taxesList.push(t)
          }
        }
        item.taxes = taxesList
        instance.goodsSales.find({
          _id: {
            $in: comps
          }
        }, { name: 1, cost: 1 }, async (_, items) => {
          if (items == null) {
            items = []
          }
          var composite_items = []
          var cost = 0
          for (var it of items) {
            cost += it.cost * compQuality[it._id + ''],
              composite_items.push({
                product_id: instance.ObjectId(it._id),
                product_name: it.name,
                own_cost: it.cost * compQuality[it._id + ''],
                cost: it.cost,
                quality: compQuality[it._id + '']
              })
          }
          item.composite_items = composite_items
          if (item.composite_items.length > 0) {
            item.cost = cost
          }
          if (item.categoryObj.length > 0) {
            item.category_name = item.categoryObj[0].name
          }
          item.categoryObj = undefined
          if (item.Supplier.length > 0) {
            item.primary_supplier_name = item.Supplier[0].supplier_name
          }
          item.Supplier = undefined
 
          if (!item.has_variants) {
            const parent_variant = await instance.goodsSales.findOne({
              variant_items: {
                $elemMatch: {
                  $eq: item._id
                }
              }
            })
            item.variant_options = []
            if (parent_variant) {
              item.variant_options = parent_variant.variant_options
              item.is_track_stock = parent_variant.is_track_stock
              item.use_production = parent_variant.use_production
            }
            return reply.ok(item)
          }
          const variant_items = await instance.goodsSales.find({
            _id: {
              $in: item.variant_items
            }
          })
          var item_services = []
          for (let i = 0; i < variant_items.length; i++) {
            item_services = item_services.concat(variant_items[i].services)
          }
          item.variant_items = variant_items
          item.variant_services = item_services
          reply.ok(item)
        })
      }
      else {
        reply.fourorfour('item')
      }
    })
    */
  })

  instance.decorate('change_all_composite', (id, user) => {
    id = instance.ObjectId(id)
    instance.goodsSales.findOne({
      _id: id
    }, (_, item) => {
      instance.goodsSales.find({
        composite_items: {
          $elemMatch: {
            product_id: {
              $eq: id
            }
          }
        }
      }, (err, items) => {
        if (items == null) {
          items = []
        }
        if (items.length > 0) {
          var prepare_push = []
          for (var it of items) {
            prepare_push.push(1)
            var cost = 0.0
            var composite_items = []
            for (var c of it.composite_items) {
              if (c.product_id + '' == id + '') {
                if (item) {
                  c.own_cost = item.cost
                  c.cost = c.quality * item.cost
                  if (item.cost != null) {
                    cost += c.quality * item.cost
                  }
                }
              }
              else {
                composite_items.push(c)
                cost += c.quality * c.own_cost
              }
            }
            if (composite_items.length == 0) {
              it.is_composite_item = false
            }
            it.composite_items = composite_items
            it.cost = cost
            if (it.max_cost < it.cost || it.max_cost == 0) {
              it.max_cost = it.cost
            }
            instance.goodsSales.updateOne({
              _id: it._id
            }, {
              $set: {
                composite_items: it.composite_items,
                is_composite_item: it.is_composite_item,
                cost: cost,
                max_cost: it.max_cost,
                last_updated: new Date().getTime(),
                last_stock_updated: new Date().getTime()
              }
            }, (err, _) => {
              if (err) {
                instance.send_Error('updating comp data', JSON.stringify(err))
              }
              if (prepare_push.length == items.length) {
                instance.services.find({
                  organization: user.organization
                }, (_, services) => {
                  if (services == undefined) {
                    services = []
                  }
                  for (var s of services) {
                    instance.push_changes({ headers: {} }, 102, s._id)
                  }
                })
              }
            })
          }
        }
      })
    })
  })

  instance.decorate('converter', (string) => {
    if (typeof string != typeof 'invan') string = ''

    const convert = {
      "G'": "Ғ",
      "g'": "ғ",
      "o'": "ў",
      "O'": "Ў",
      "G`": "Ғ",
      "g`": "ғ",
      "o`": "ў",
      "O`": "Ў",
      "'": "ъ",
      "`": "ъ",
      "ye": "е",
      "Ye": "Е",
      "yu": "ю",
      "Yu": "Ю",
      "YU": "Ю",
      "ya": "я",
      "YA": "Я",
      "Ya": "Я",
      "yo": "ё",
      "Yo": "Ё",
      "YO": "Ё",
      "b": "б",
      "ch": "ч",
      "ts": "ц",
      "sh": "ш",
      "shch": "щ",
      "y": "ы",
      "iu": "ю",
      "a": "а",
      "c": "ц",
      "d": "д",
      "e": "е",
      "f": "ф",
      "g": "г",
      "h": "х",
      "i": "и",
      "j": "ж",
      "k": "к",
      "l": "л",
      "m": "м",
      "n": "н",
      "o": "о",
      "p": "п",
      "q": "қ",
      "r": "р",
      "s": "с",
      "t": "т",
      "u": "у",
      "v": "в",
      "w": "уа",
      "x": "кс",
      "y": "й",
      "z": "з",
      "B": "Б",
      "CH": "Ч",
      "TS": "Ц",
      "SH": "Ш",
      "SHCH": "Щ",
      "Y": "Ы",
      "IU": "Ю",
      "A": "А",
      "C": "Ц",
      "D": "Д",
      "E": "Е",
      "F": "Ф",
      "G": "Г",
      "H": "Х",
      "I": "И",
      "J": "Ж",
      "K": "К",
      "L": "Л",
      "M": "М",
      "N": "Н",
      "O": "О",
      "P": "П",
      "Q": "Қ",
      "R": "Р",
      "S": "С",
      "T": "Т",
      "U": "У",
      "V": "В",
      "W": "УА",
      "X": "КС",
      "Y": "Й",
      "Z": "З",
      'Ғ': 'G`',
      'ғ': 'g`',
      'ў': 'o`',
      'Ў': 'O`',
      'ъ': '`',
      'е': 'e',
      'Е': 'E',
      'ю': 'iu',
      'Ю': 'IU',
      'я': 'ya',
      'Я': 'Ya',
      'ё': 'yo',
      'Ё': 'YO',
      'б': 'b',
      'ч': 'ch',
      'ц': 'c',
      'ш': 'sh',
      'щ': 'shch',
      'й': 'y',
      'а': 'a',
      'д': 'd',
      'ф': 'f',
      'г': 'g',
      'х': 'h',
      'и': 'i',
      'ж': 'j',
      'к': 'k',
      'л': 'l',
      'м': 'm',
      'н': 'n',
      'о': 'o',
      'п': 'p',
      'қ': 'q',
      'р': 'r',
      'с': 's',
      'т': 't',
      'у': 'u',
      'в': 'v',
      'уа': 'w',
      'кс': 'x',
      'з': 'z',
      'Б': 'B',
      'Ч': 'CH',
      'Ц': 'C',
      'Ш': 'SH',
      'Щ': 'SHCH',
      'Й': 'Y',
      'А': 'A',
      'Д': 'D',
      'Ф': 'F',
      'Г': 'G',
      'Х': 'H',
      'И': 'I',
      'Ж': 'J',
      'К': 'K',
      'Л': 'L',
      'М': 'M',
      'Н': 'N',
      'О': 'O',
      'П': 'P',
      'Қ': 'Q',
      'Р': 'R',
      'С': 'S',
      'Т': 'T',
      'У': 'U',
      'В': 'V',
      'УА': 'W',
      'КС': 'X',
      'З': 'Z'
    }
    let answer = ''
    for (let i = 0; i < string.length; i++) {
      if (convert[string[i]] != undefined)
        answer = answer + convert[string[i]]
    }
    return answer != '' ? answer : 'nothing_to_change'
  })

  instance.decorate('getGoodsSales', async (request, reply) => {
    try {
      const user = request.user;
      const time = parseInt(request.params.time) || 0;
      const service_id = request.headers['accept-service'];
      const service = await instance.services.findById(service_id).lean();

      if (!service) return reply.fourorfour('Service')

      const query = {
        organization: user.organization,
        services: { $elemMatch: { service: { $eq: service._id }, available: { $eq: true } } },
      }

      if (time) query.last_updated = { $gte: time }

      if (request.params.type == 'without_stock') {
        delete query.last_updated
        query.last_stock_updated = { $gte: time }
      }

      const $match = { $match: query };
      const $unwind = { $unwind: { path: '$services' } };

      const $matchService = {
        $match: {
          $or: [
            { 'services.service': service._id },
            { 'services.service': service._id + '' },
          ],
        },
      }
      const $group = {
        $group: {
          _id: '$_id',
          name: { $first: '$name' },
          price: { $first: '$services.price' },
          price_currency: { $first: '$services.price_currency' },
          default_purchase_cost: { $first: '$default_purchase_cost' },
          purchase_cost_currency: { $first: '$purchase_cost_currency' },
          cost: { $first: '$cost' },
          cost_currency: { $first: '$cost_currency' },
          max_cost: { $first: '$max_cost' },
          sale_is_avialable: { $first: '$sale_is_avialable' },
          composite_item: { $first: '$composite_item' },
          is_composite_item: { $first: '$is_composite_item' },
          use_production: { $first: '$use_production' },
          is_track_stock: { $first: '$is_track_stock' },
          in_stock: { $first: '$services.in_stock' },
          low_stock: { $first: '$services.low_stock' },
          optimal_stock: { $first: '$services.optimal_stock' },
          sku: { $first: '$sku' },
          created_time: { $first: '$created_time' },
          last_updated: { $first: '$last_updated' },
          representation_type: { $first: '$representation_type' },
          shape: { $first: '$shape' },
          representation: { $first: '$representation' },
          category: { $first: '$category' },
          category_id: { $first: '$category_id' },
          category_name: { $first: '$category_name' },
          sold_by: { $first: '$sold_by' },
          primary_supplier_id: { $first: '$primary_supplier_id' },
          primary_supplier_name: { $first: '$primary_supplier_name' },
          organization: { $first: '$organization' },
          fabricator: { $first: '$fabricator' },
          modifiers: { $first: '$modifiers' },
          prices: { $first: '$services.prices' },
          reminder: { $first: '$services.reminder' },
          stopped_item: { $first: '$stopped_item' },
          count_by_type: { $first: '$count_by_type' },
          barcode_by_type: { $first: '$barcode_by_type' },
          hot_key: { $first: '$hot_key' },
          barcode: { $first: '$barcode' },
          item_type: { $first: '$item_type' },
          has_variants: { $first: '$has_variants' },
          variant_items: { $first: '$variant_items' },
          taxes: { $first: '$taxes' },
        },
      };
      const $sort = { $sort: { _id: 1 } };

      const $project = {
        $project: {
          organization: 1,
          service: 1,
          price: 1,
          price_currency: {
            $cond: {
              if: { $eq: [{ $type: '$price_currency' }, 'string'] },
              then: '$price_currency',
              else: 'uz'
            }
          },
          prices: 1,
          in_stock: 1,
          reminder: 1,
          stopped_item: 1,
          name: 1,
          category: 1,
          sold_by: 1,
          count_by_type: 1,
          barcode_by_type: 1,
          cost: 1,
          cost_currency: {
            $cond: {
              if: {
                $eq: [{ $type: '$cost_currency' }, 'string'],
              },
              then: '$cost_currency',
              else: 'uz'
            }
          },
          sku: 1,
          hot_key: 1,
          barcode: 1,
          composite_item: 1,
          is_composite_item: 1,
          use_production: 1,
          representation_type: 1,
          shape: 1,
          representation: 1,
          item_type: 1,
          has_variants: 1,
          variant_items: 1,
          modifiers: 1,
          taxes: {
            $reduce: {
              input: "$taxes",
              initialValue: [],
              in: {
                $concatArrays: [
                  "$$value", {
                    $cond: [
                      { $eq: ["$$this.available", true] },
                      ["$$this.tax_id"],
                      []
                    ]
                  }
                ],
              }
            }
          },
        },
      };

      const goods = await instance.goodsSales.aggregate([
        $match,
        $unwind,
        $matchService,
        $group,
        $sort,
        $project
      ]).allowDiskUse(true).exec();

      reply.ok(goods)
    } catch (error) {
      reply.error(error.message)
    }
    return reply;
  })
  next()
})
