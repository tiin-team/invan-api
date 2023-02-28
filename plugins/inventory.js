const fp = require('fastify-plugin');
const { insertInvHistory } = require('../clickhouse/insert_inv_history');

module.exports = fp((instance, _, next) => {

  // create inventory history

  instance.decorate('create_inventory_history', async (user, reason, unique, service_id, product_id, cost, adjustment, stock_after, date) => {
    try {
      if (adjustment == 0) return;

      const service = await instance.services
        .findById(service_id, { name: 1 })
        .lean();
      if (!service) {
        instance.log.error('Service not found');
        return;
      }
      const item = await instance.goodsSales
        .findById(product_id, { name: 1, category: 1, item_type: 1 })
        .lean();
      if (!item) {
        instance.log.error('Item not found')
        return;
      }

      let category = {}
      try {
        category = await instance.goodsCategory.findById(item.category, { name: 1 }).lean();
      } catch (error) { }
      if (!category) {
        category = {}
      }

      if (item.item_type == 'variant') {
        try {
          const parent = await instance.goodsSales.findOne(
            {
              variant_items: {
                $elemMatch: { $eq: item._id }
              }
            },
            { name: 1 }
          )
            .lean();

          if (parent) item.name = `${parent.name} ( ${item.name} )`
        }
        catch (err) { }
      }

      const new_history = {
        organization: user.organization,
        date: date,
        unique: unique,
        category_id: category._id,
        category_name: category.name,
        product_id: product_id,
        product_name: item.name,
        cost: cost,
        service: instance.ObjectId(service._id),
        service_name: service.name,
        employee_id: user._id,
        employee_name: user.name,
        reason: reason,
        adjustment: adjustment,
        stock_after: stock_after
      }

      const history_model = new instance.inventoryHistory(new_history)
      const { _id: id } = await history_model.save();
      instance.log.info(`Saved history id -> ${id}`);

      await insertInvHistory(instance, [new_history])
    } catch (error) {
      instance.log.error(error.message)
      instance.send_Error(
        `creating inventory. reason: ${reason}. user:${JSON.stringify(user)}. service_id: ${service_id}. product_id: ${product_id + '  ' +
        cost + ' ' +
        adjustment + ' ' +
        stock_after + ' ' + date
        }`,
        JSON.stringify(error),
      )
    }

    /*
    instance.services.findOne({_id: service_id}, (err, service) => {
      if(err || service == null) {
        if(!err) {
          err = {service: null}
        }
        instance.send_Error("creating inventory", JSON.stringify(err))
      }
      else {
        instance.goodsSales.findOne({_id: product_id}, async (err, item) => {
          if(err || item == null) {
            if(!err){
              err = {item: null}
            }
            instance.send_Error("creating inventory", JSON.stringify(err))
          }
          else {
            if(item.item_type == 'variant') {
              try {
                const parent = await instance.goodsSales.findOne({
                  variant_items: {
                    $elemMatch: {
                      $eq: item._id
                    }
                  }
                })
                
                if (parent) {
                  item.name = `${parent.name} ( ${item.name} )`
                }
              }
              catch (err) { }
            }
            
            var history_model = new instance.inventoryHistory({
              organization: user.organization,
              date: date,
              unique: unique,
              product_id: product_id,
              product_name: item.name,
              cost: cost,
              service: instance.ObjectId(service._id),
              service_name: service.name,
              employee_id: user._id,
              employee_name: user.name,
              reason: reason,
              adjustment: adjustment,
              stock_after: stock_after
            })
          }
          if(adjustment != 0) {
            history_model.save((err) => {
              if(err){
                instance.send_Error('creating inventory', JSON.stringify(err))
              }
            })
          }
        })
      }
    })
    */
  })

  next()
})