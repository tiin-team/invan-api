const axios = require('axios')
const mongoose = require('mongoose')

// function get_headers()

module.exports = (instance, _, next) => {
  const BASE_URL = 'http://localhost:3000'
  instance.post('/something', { version: '1.0.0' }, (require, reply) => {
    var db = mongoose.connection;
    var collection = db.collection('employeeslists')
    const regex = new RegExp('yus', 'i')
    collection.find({ name: { $regex: regex } }, (error, result) => {
      console.log(result)
    })
    reply.ok()
  })
  
  next()
}

/**
 *if (item.is_refund == false) {
        for (const __dis of item.discount) {
          if(__dis != undefined){
            if(__dis.type != undefined){
              if (__dis.type == 'percentage') {
                item.total_price = item.total_price * 100 / (100-__dis.value)
                discounts += __dis.value * item.total_price / 100;
              } else {
                item.total_price += __dis.value
                discounts += __dis.value;
              }
            }
          }
        }
        gross_sales += item.total_price;
      } else {
        for (const __dis of item.discount) {
          if(__dis != undefined){
            if(__dis.type != undefined){
              if (__dis.type == 'percentage') {
                item.total_price = item.total_price * 100 / (100-__dis.value)
                discounts -= __dis.value * item.total_price / 100;
              } else {
                item.total_price += __dis.value
                discounts -= __dis.value;
              }
            }
          }
        }
        refunds += item.total_price;
      }
 *
 */