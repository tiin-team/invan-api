const fp = require('fastify-plugin');

module.exports = fp((instance, options, next) => {

  instance.decorate('check_sub_category', (id, sub_id) => {
    instance.goodsCategory.find({
      _id: sub_id
    }, (_, categ) => {
      var type = 'top';
      if(categ) {
        type = sub_id
      }
      instance.goodsCategory.updateOne({
        _id: id
      }, {
        $set: {
          type: type
        }
      }, (err) => {
        if(err) {
          instance.send_Error('sub category', JSON.stringify(err))
        }
      })
    })
  })

  instance.decorate('delete_sub_category', (id, organization_id) => {
    instance.goodsCategory.find({
      is_other: true,
      organization: organization_id
    }, (_, other) => {
      if(other) {
        instance.goodsCategory.find({
          type: id
        }, (_, categories) => {
          if(categories == null) {
            categories = []
          }
          for(var c of categories) {
            instance.delete_sub_category(c._id, organization_id)
          }
        })
        instance.goodsSales.updateMany({
          category: id
        }, {
          $set: {
            category: other._id,
            category_name: 'Other',
            category_id: instance.ObjectId(other._id),
            last_updated: new Date().getTime(),
            last_stock_updated: new Date().getTime()
          }
        }, (err) => {
          if(err) {
            instance.send_Error('delete sub category', JSON.stringify(err))
          }
          instance.goodsCategory.deleteOne({
            _id: id,
            is_other: {
              $ne: true
            }
          }, (err) => {
            if(err) {
              instance.send_Error('delete sub category', JSON.stringify(err))
            }
          })
        })
      }
    })
  })

  next()
})