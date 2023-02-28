const fp = require('fastify-plugin')
const axios = require('axios');
const fs = require('fs');

module.exports = fp((instance, _, next) => {

  instance.get('/make_picture', (request, reply) => {
    // instance.goodsCategory.find({"organization" : "5de900980d6a873b3db4e4d9"}, (err, cats) => {
    //   for(var c of cats) {
    //     var position = ''
    //     for(let i=0; i<c.position.length; i++) {
    //       position = position + String.fromCharCode(c.position[i].charCodeAt()+15)
    //     }
    //     instance.goodsCategory.updateOne({
    //       _id: c._id
    //     }, {
    //       $set: {
    //         position: position
    //       }
    //     }, (err) => {
    //       instance.send_Error('eeee', JSON.stringify(err))
    //     })
    //   }
    // })
  })

  // get loyverse receipts

  // instance.get('/get_receipts/:file', (request, reply) => {
  //   // axios.defaults.headers.common['Cookie'] = 'ownercub-lls=09ae82e7-beea-4b8d-b804-5e12491ba393; __auc=7998b9cb16f75dda1b34cb72b2f; _hjid=c17b1c8a-0d36-4889-a3e7-beee64d1fd34; _fbp=fb.1.1578230456872.799155383; _ga=GA1.1.1799565747.1578230456; __stripe_mid=f7065c5f-3296-49c9-ba10-450681f49059; _gid=GA1.1.1713665457.1578752303; _gid=GA1.2.1713665457.1578752303; JSESSIONID=node012g3wizxjgnqf1a5pow7yutff34062.node0; __asc=6b58cff216fa42265604f8552a5; _ga=GA1.1.1799565747.1578230456; _ga_8ZPBSBH0BM=GS1.1.1579006715.19.0.1579006718.0; __stripe_sid=c13f78de-57bd-4da9-97a1-3d97aafebdf5; mp_92c6e09f236098fe1dd8f045937cc868_mixpanel=%7B%22distinct_id%22%3A%20725407%2C%22%24device_id%22%3A%20%2216f75dda0a72b7-00e86e4d79b577-15221102-13c680-16f75dda0a8fc3%22%2C%22%24initial_referrer%22%3A%20%22%24direct%22%2C%22%24initial_referring_domain%22%3A%20%22%24direct%22%2C%22%24user_id%22%3A%20725407%7D; intercom-session-re5afjv3=OGU2Z2NsRWlObnd3a0Q4dkVBSXVQMFhnMVdZUlpWWjhmRWVKeW1ObkxqOUNQa29ObzFCcnZjanlZM2o4U3dJcS0tbXZnZjA0ajE4czBqMjVKc1ZoaXpSZz09--a6259424b6d70c4fe0e7d5bcb6848617c7c7abea; AWSALB=02q2OMLjKPDM0P2/J/xmUbz1OGb2Fpy9isLOFVsjasoYdcJi190I7UP/sFv9swOYHrJ1P95Bij4En+IcVPpHFgJ2BDbTlVuYLzAtii6KSjNpAc0CO8clVfNp0e0x'
  //   // axios.defaults.headers.post['Content-Type'] = 'application/json';
  //   // var data = {"limit":"750","offset":0,"receiptType":null,"payType":null,"startDate":1572634800000,"endDate":1577473199000,"search":null,"tzOffset":18000000,"tzName":"Asia/Karachi","startTime":null,"endTime":null,"startWeek":0,"receiptId":null,"predefinedPeriod":{"name":null,"period":null},"customPeriod":true,"merchantsIds":"all","outletsIds":"all"}
  //   // axios.defaults.data = data
  //   // axios.post('https://r.loyverse.com/data/ownercab/getreceiptsarchive', data).then(function(response) {
  //     a = []
  //     var names = []
  //     var nameObj = {}
  //     var nameObj2 = {}
  //     var start_time = 1572634800000
  //     var last_time = 1577386800000
  //     var times = []
  //     var header = ['time']
  //     var save_as_csv = []
  //     for(var r of a) {
  //       for(var it of r.itemRows) {
  //         if(nameObj[it.name] == undefined && names.length<100) {
  //           names.push(it.name)
  //           nameObj[it.name] = true
  //           nameObj2[it.name] = {
  //             sold: 0
  //           }
  //           header.push(it.name.split(',').join('.'))
  //         }
  //       }
  //     }
  //     save_as_csv.push(header)
  //     var increment = 0
  //     for(let i=last_time; i>=start_time; i-=86400000) {
  //       if(increment<a.length){
  //         console.log(increment)
  //         while(a[increment].dateTS > i) {
  //           if(a[increment]){
  //             if(a[increment].dateTS > i-86400000)  {
  //               for(var it of a[increment].itemRows) {
  //                 if(nameObj[it.name]) {
  //                   nameObj2[it.name].sold += parseInt(it.quantity/1000)
  //                 }
  //               }
  //             }
  //           }
  //           else {
  //             break;
  //           }
  //           increment++
  //           if(increment == a.length){
  //             console.log('//////////////aaaaaaaaaa')
  //             break;
  //           }
  //         }
  //         console.log('bbbbbbbbbbb')
  //         header = [[new Date(i)]]
  //         for(var n of names) {
  //           header.push(nameObj2[n].sold)
  //           nameObj2[n].sold = 0
  //         }
  //         save_as_csv.push(header)
  //       }
  //     }
  //     const CSVString = save_as_csv.join('\n');
  //     var file = 'Loyverse_items.csv';
  //     fs.writeFile('./static/' + file, CSVString, (err) => {
  //       if (err) {
  //         instance.send_Error('writing to file', JSON.stringify(err))
  //       }
        
  //       reply.sendFile('./'+file, (err) => {
  //         if(err){
  //           instance.send_Error('on sending file', JSON.stringify(err))
  //         }
  //       })


  //       // console.log('EEEEEEEEEE')
  //       // fs.unlink('./static/'+file, (err) => {
  //       //   // console.log(err)
  //       //   if(err) {
  //       //     instance.send_Error('items.csv', JSON.stringify(err))
  //       //   }
  //       // })
  //     });
  //   // }).catch(function(err){
  //   //   console.log('//////////////////////////')
  //   //   console.log(err)
  //   //   reply.error('Error on finding')
  //   // })
  // })

  // instance.get('/test_sms_code', (request, reply) => {
  //   var data = {
  //     utime: 1578931132,
  //     username: "aktivcargo",
  //     service: {
  //       service: 1
  //     },
  //     message: {
  //       smsid: 102,
  //       phone: `+998930096972`,
  //       text: `InVan uchun maxfiy kod: ${123}`
  //     }
  //   }
  //   axios.defaults.headers.common['X-Access-Token'] = "193c85a7b24023175a41f086898f165c";
  //   axios.defaults.headers.post['Content-Type'] = 'application/json';
  //   axios.defaults.data = data
  //   axios.post('http://httpsms.sayqal.uz/TransmitSMS', data).then(function(res){
  //     console.log('Sucess')
  //     reply.ok()
  //   }).catch(function(err){
  //     console.log(err)
  //     reply.error('Error')
  //   })
  // })

  // tables

  function save_table(id) {
    var summ = instance.summaryTable({
      organization: id
    })
    summ.save((err) => {
      if(err) {
        instance.send_Error('table', JSON.stringify(err))
      }
    })
    var summ2 = instance.by_itemTable({
      organization: id
    })
    summ2.save((err) => {
      if(err) {
        instance.send_Error('table', JSON.stringify(err))
      }
    })
    var summ3 = instance.by_categoryTable({
      organization: id
    })
    summ3.save((err) => {
      if(err) {
        instance.send_Error('table', JSON.stringify(err))
      }
    })
  }

  instance.get('/full_tables', (request, reply) => {
    // instance.organizations.find({}, (err, orgs) => {
    //   console.log(orgs)
    //   if(err) {
    //     instance.send_Error('find orgs', JSON.stringify(err))
    //   }
    //   else {
    //     for(var or of orgs) {
    //       save_table(or._id)
    //     }
    //     reply.ok()
    //   }
    // })
  })

  function only_composite(id, comp) {
    instance.goodsSales.updateOne({
      _id: id
    }, {
      $set: {
        composite_items: comp
      }
    }, (err) => {
      if(err){
        instance.send_Error("update goods", err)
      }
    })
  }

  instance.get('/update_composite_items_for_name', (request, reply) => {
    instance.goodsSales.find({}, (err, goods) => {
      var gObj = {}
      for(var g of goods) {
        gObj[g._id] = g.name
      }
      instance.goodsSales.find({
        is_composite_item: true
      }, (err, comps) => {
        for(var g of comps) {
          var comp = []
          for(var c of g.composite_items) {
            if(gObj[c.product_id+'']) {
              c.product_name = gObj[c.product_id+'']
            }
            else {
              c.product_name = ''
            }
            comp.push(c)
          }
          only_composite(g._id, comp)
        }
        reply.ok()
      })
    })
  })

  function create_receipt(receipt) {
    var receiptModel = new instance.Shifts(receipt)
    receiptModel.save((err) => {
      if(err) {
        instance.send_Error('ERROR', JSON.stringify(err))
      }
    })
  }

  instance.get('/synx_receipts', (request, reply) => {
    // axios.defaults.headers.common['Authorization'] = "Qj8dKwdWejcRJf8cd67Bzj";
    // axios.defaults.headers.common['Accept-Version'] = "1.0.0";
    // axios.get("http://api.invan.uz/receipts/find").then((response) => {
    //   instance.goodsSales.find({
    //     organization: "5e0f41dccc2d6538242e5145"
    //   }, (err, goods) => {
    //     var gObj = {}
    //     for(var g of goods) {
    //       gObj[g.name] = g._id
    //     }
    //     var receipts = response.data.data
    //     for(let i=0; i<receipts.length; i++) {
    //       for(let j=0; j < receipts[i].sold_item_list.length; j ++) {
    //         if(gObj[receipts[i].sold_item_list[j].product_name] != undefined) {
    //           receipts[i].sold_item_list[j].product_id = gObj[receipts[i].sold_item_list[j].product_name]
    //         }
    //       }
    //       receipts[i].organization = "5e0f41dccc2d6538242e5145";
    //       receipts[i].service = "5e0f41dccc2d6538242e5148";
    //       receipts[i].pos_id = "5e0f41dccc2d6538242e514c";
    //       receipts[i].pos_name = "Pos 1";
    //       delete receipts[i]._id;
    //       create_receipt(receipts[i])
    //     }
    //     reply.ok()
    //   })
    // })
  })


  function do_random() {
    var a = ["#F44336","#E91E63", "#FF9800", "#CDDC39", "#4CAF50", "#2196F3", "#9C27B0"]
    var b = ['circle', 'triangle', 'hexagon']
    return {
      representation: a[Math.floor(Math.random() * Math.floor(7))],
      shape: b[Math.floor(Math.random() * Math.floor(3))]
    }
  }

  function update_goods(id) {
    var updating = do_random()
    updating.last_updated = new Date().getTime()
    updating.last_stock_updated = new Date().getTime()
    instance.goodsSales.updateOne({
      _id: id
    }, {
      $set: updating
    }, (err) => {
      if(err) {
        instance.send_Error('updating goods', JSON.stringify(err))
      }
    })
  }

  instance.get('/doit_random', (request, reply) => {
    // instance.goodsSales.find({
    //   organization: "5e05bbb675ad3a5abe9b03e0",
    //   shape: 'circle',
    //   representation: '#4CAF50'
    // }, (err, goods) => {
    //   for(var g of goods) {
    //     update_goods(g._id)
    //   }
    // })
  })

  function save_item(id) {
    axios.defaults.headers.common['Cookie'] = "ownercub-lls=478fbcd5-0398-4205-89d2-404375fb9c03; _gid=GA1.2.516104838.1578230456; __auc=7998b9cb16f75dda1b34cb72b2f; _hjid=c17b1c8a-0d36-4889-a3e7-beee64d1fd34; _fbp=fb.1.1578230456872.799155383; _ga=GA1.1.1799565747.1578230456; _gid=GA1.1.516104838.1578230456; __stripe_mid=f7065c5f-3296-49c9-ba10-450681f49059; __stripe_sid=ce5938e3-d0ca-4619-ae1a-8659279c94f9; __asc=2c3834a816f7ec916593d764929; JSESSIONID=node0fnaimgb9zrepz18d3lp1gko0136625.node0; _ga=GA1.1.1799565747.1578230456; _ga_8ZPBSBH0BM=GS1.1.1578380164.7.1.1578380184.0; mp_92c6e09f236098fe1dd8f045937cc868_mixpanel=%7B%22distinct_id%22%3A%20725407%2C%22%24device_id%22%3A%20%2216f75dda0a72b7-00e86e4d79b577-15221102-13c680-16f75dda0a8fc3%22%2C%22%24initial_referrer%22%3A%20%22%24direct%22%2C%22%24initial_referring_domain%22%3A%20%22%24direct%22%2C%22%24user_id%22%3A%20725407%7D; _gat=1; AWSALB=8VN5pJsoaZKHtVS2hUN5+LbGXAOkrFPmw2xkoPzYHuxJFZBjQ/Y3DeOS5a1BhvAH3y26+ux7efCdNueqlhTgqg5RWbHQqeKvIE/JkiH25lAbrqSqGYsDWVvvYinM; intercom-session-re5afjv3=RTU0WHczdE8reWxoV1I2VjUzelZzUjRhTzlVU21PMWFMYlo0WFJJbkpieVZrOTRCS09UQkZ6dWtaUzZnRGxNbC0temhpNldrMzl3QnBsWVRkVFNoWTBsdz09--8343d001e789be9747d7ed29cfbbf132b5784142";
    axios.defaults.data = {
      id: id
    }
    axios.post("https://r.loyverse.com/data/ownercab/getwarebyid", {
      id: id
    }).then(function(response){
      var sku = parseInt(response.data.article)
      var image = response.data.imgUrl
      if(image) {
        instance.goodsSales.updateOne({
          organization: "5e05bbb675ad3a5abe9b03e0",
          sku: sku
        }, {
          $set: {
            last_updated: new Date().getTime(),
            last_stock_updated: new Date().getTime(),
            representation: image,
            representation_type: "image"
          }
        }, (err) => {
          instance.send_Error('error on updating', JSON.stringify(err))
        })
      }
    }).catch(function(err){})
  }

  instance.get('/get_goods', (request, reply) => {
    // axios.defaults.headers.common['Cookie'] = "ownercub-lls=478fbcd5-0398-4205-89d2-404375fb9c03; _gid=GA1.2.516104838.1578230456; __auc=7998b9cb16f75dda1b34cb72b2f; _hjid=c17b1c8a-0d36-4889-a3e7-beee64d1fd34; _fbp=fb.1.1578230456872.799155383; _ga=GA1.1.1799565747.1578230456; _gid=GA1.1.516104838.1578230456; __stripe_mid=f7065c5f-3296-49c9-ba10-450681f49059; __stripe_sid=ce5938e3-d0ca-4619-ae1a-8659279c94f9; __asc=2c3834a816f7ec916593d764929; JSESSIONID=node0fnaimgb9zrepz18d3lp1gko0136625.node0; _ga=GA1.1.1799565747.1578230456; _ga_8ZPBSBH0BM=GS1.1.1578380164.7.1.1578380184.0; mp_92c6e09f236098fe1dd8f045937cc868_mixpanel=%7B%22distinct_id%22%3A%20725407%2C%22%24device_id%22%3A%20%2216f75dda0a72b7-00e86e4d79b577-15221102-13c680-16f75dda0a8fc3%22%2C%22%24initial_referrer%22%3A%20%22%24direct%22%2C%22%24initial_referring_domain%22%3A%20%22%24direct%22%2C%22%24user_id%22%3A%20725407%7D; _gat=1; AWSALB=8VN5pJsoaZKHtVS2hUN5+LbGXAOkrFPmw2xkoPzYHuxJFZBjQ/Y3DeOS5a1BhvAH3y26+ux7efCdNueqlhTgqg5RWbHQqeKvIE/JkiH25lAbrqSqGYsDWVvvYinM; intercom-session-re5afjv3=RTU0WHczdE8reWxoV1I2VjUzelZzUjRhTzlVU21PMWFMYlo0WFJJbkpieVZrOTRCS09UQkZ6dWtaUzZnRGxNbC0temhpNldrMzl3QnBsWVRkVFNoWTBsdz09--8343d001e789be9747d7ed29cfbbf132b5784142";
    // var data = {
    //   "offset":0,
    //   "limit":"600",
    //   "search":null,
    //   "outletId":null,
    //   "filters":{
    //     "inventory":"all",
    //     "category":"all"
    //   }
    // }
    // axios.defaults.data = data
    // axios.post('https://r.loyverse.com/data/ownercab/getwares', data)
    //   .then(function(response) {
    //     for(var item of response.data.wares) {
    //       save_item(item.id)
    //     }
    //     reply.send('DOING...')
    //   }).catch(function(error) {
    //     console.log(error)
    //   })
      // reply.send('GOOD')
  })

  instance.get('/just_base', (request, reply) => {
    instance.organizations.find({}, (err, organizations) => {
      var ids = []
      for(var r of organizations) {
        ids.push(r._id)
      }
      instance.settingFeatures.find({
        organization: {
          $in: ids
        }
      }, (err, features) => {
        var featureObj = {}
        if(features == null) {
          features = []
        }
        for(var f of features) {
          featureObj[f.organization] = f
        }
        for(var id of ids) {
          if(featureObj[id] == undefined) {
            var feature = new instance.settingFeatures({
              organization: id,
              opened_receipts: true,
              debts: true,
              shifts: true,
              orders: true,
              chat: true,
              open_tickets: true,
              time_clock: true,
              show_stock: false,
              karaoke: true,
              scale: true,
              section: true,
              inventory: true
            })
            feature.save((err) => {
              instance.send_Error('just', JSON.stringify(err))
            })
          }
        }
      })
      instance.AccessRights.find({
        organization: {
          $in: ids
        }
      }, (err, accs) => {
        if(accs==null) {
          accs = []
        }
        var acsObj = {}
        for(var a of accs) {
          acsObj[a.organization] = a
        }
        for(var id of ids) {
          if(acsObj[id] == undefined) {
            var acss1 = new instance.AccessRights({
              organization: id,
              name: 'boss',
              is_bos: true,
              pos: true,
              close_ticket: true,
              can_sell: true,
              refund: true,
              show_all_receipts: true,
              pay_debt: true,
              show_shift_history: true,
              apply_discount: true,
              change_settings: true,
              show_stock: true,
              edit_items: true,
              back_office: true,
              reports: true,
              items: true,
              employees: true,
              customers: true,
              settings: true,
              edit_profile: true,
              set_the_taxes: true,
              manage_pos_devices: true,
              can_delete_item: true
            })
            acss1.save((err) => {
              instance.send_Error('just', JSON.stringify(err))
            })
            var acss2 = new instance.AccessRights({
              organization: id,
              name: 'admin',
              is_bos: true,
              pos: true,
              close_ticket: true,
              can_sell: true,
              refund: true,
              show_all_receipts: true,
              pay_debt: true,
              show_shift_history: true,
              apply_discount: true,
              change_settings: true,
              show_stock: true,
              edit_items: true,
              back_office: true,
              reports: true,
              items: true,
              employees: true,
              customers: true,
              settings: true,
              edit_profile: true,
              set_the_taxes: true,
              manage_pos_devices: true,
              can_delete_item: true
            })
            acss2.save((err) => {
              instance.send_Error('just', JSON.stringify(err))
            })
            var acss3 = new instance.AccessRights({
              organization: id,
              name: 'cashier',
              is_bos: true,
              pos: true,
              close_ticket: true,
              can_sell: true,
              refund: true,
              show_all_receipts: true,
              pay_debt: true,
              show_shift_history: true,
              apply_discount: true,
              change_settings: true,
              show_stock: true,
              edit_items: true,
              back_office: true,
              reports: true,
              items: true,
              employees: true,
              customers: true,
              settings: true,
              edit_profile: true,
              set_the_taxes: true,
              manage_pos_devices: true,
              can_delete_item: true
            })
            acss3.save((err) => {
              instance.send_Error('just', JSON.stringify(err))
            })
            var acss4 = new instance.AccessRights({
              organization: id,
              name: 'waiter',
              is_bos: true,
              pos: true,
              close_ticket: true,
              can_sell: true,
              refund: true,
              show_all_receipts: true,
              pay_debt: true,
              show_shift_history: true,
              apply_discount: true,
              change_settings: true,
              show_stock: true,
              edit_items: true,
              back_office: true,
              reports: true,
              items: true,
              employees: true,
              customers: true,
              settings: true,
              edit_profile: true,
              set_the_taxes: true,
              manage_pos_devices: true,
              can_delete_item: true
            })
            acss4.save((err) => {
              instance.send_Error('just', JSON.stringify(err))
            })
            reply.ok()
          }
        }
      })
    })
  })

  instance.post('/fake_push', (request, reply) => {
    var TYPE = request.body.TYPE
    var service_id = request.body.service_id
    instance.pushnotification(TYPE, {_id: '5dd53dad7045db42875edea'}, service_id)
    reply.ok()
  })

  instance.decorate('calculator', (items, start_time, end_time, cnt) => {
    var result = []
    var dif = (end_time - start_time) / cnt
    var half = dif / 2
    var my = start_time
    var id = 0
    for (let i = 0; i < cnt; i++) {
      my = my + dif
      result.push({
        time: Math.floor(my - dif),
        value: 0
      })
      // half = 0
    }
    half = dif / 2
    var iter = 0
    while (id < cnt && iter < items.length) {

      if (result[id].time + dif < items[iter].time)
        id++

      if (id < cnt && result[id].time + dif >= items[iter].time) {
        result[id].value += items[iter].value
        iter++
      }
    }
    return result
  })
  next()
})


