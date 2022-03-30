module.exports = (instance, options, next) => {

  // get access rights

  var get_access = (request, reply, admin) => {
    instance.settingFeatures.findOne({
      organization: admin.organization
    }, (err, feature) => {
      if (feature) {
        instance.AccessRights.findOne({
          organization: admin.organization,
          name: admin.role
        }, (err, access) => {
          if (access) {
            var USER = {}
            try {
              access = access.toObject()
            }
            catch (error) {
              instance.send_Error('to Object', error.message)
            }
            delete access.pos
            delete access.close_ticket
            delete access.can_sell
            delete access.refund
            delete access.show_all_receipts
            delete access.pay_debt
            delete access.show_shift_history
            delete access.apply_discount
            delete access.change_settings
            delete access.show_stock
            delete access.edit_items
            delete access.organization
            delete access._id
            delete access.back_office
            access.inventory = true
            USER.access = access
            USER.feature = feature
            reply.ok(USER)
          }
          else {
            // reply.error('Access does not exist')
            reply.ok({
              "access": {
                "is_bos": false,
                "reports": true,
                "items": true,
                "inventory": true,
                "employees": true,
                "customers": true,
                "settings": true,
                "edit_profile": true,
                "set_the_taxes": true,
                "manage_pos_devices": true,
                "can_delete_item": true
              },
              "feature": {
                "opened_receipts": true,
                "debts": true,
                "shifts": true,
                "orders": true,
                "chat": true,
                "print_pre_check": true,
                "receipt_save_as_draft": true,
                "can_change_price": true,
                "open_tickets": true,
                "time_clock": true,
                show_stock: false,
                "karaoke": true,
                "scale": true,
                "section": true,
                "__v": 0
              }
            })
          }
        })
      }
      else {
        // reply.error('Feature not exist')
        reply.ok({
          "access": {
            "is_bos": false,
            "reports": true,
            "items": true,
            "inventory": true,
            "employees": true,
            "customers": true,
            "settings": true,
            "edit_profile": true,
            "set_the_taxes": true,
            "manage_pos_devices": true,
            "can_delete_item": true
          },
          "feature": {
            "opened_receipts": true,
            "debts": true,
            "shifts": true,
            "orders": true,
            "chat": true,
            "print_pre_check": true,
            "receipt_save_as_draft": true,
            "can_change_price": true,
            "open_tickets": true,
            "time_clock": true,
            show_stock: false,
            "karaoke": true,
            "scale": true,
            "section": true,
            "__v": 0
          }
        })
      }
    })
  }

  instance.get('/user/get_access', options.version, (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      get_access(request, reply, admin)
    })
  })

  // get for table

  var get_for_table = (request, reply, admin) => {
    instance.AccessRights.aggregate([
      {
        $match: {
          organization: admin.organization
        }
      },
      {
        $lookup: {
          from: 'users',
          let: { name: '$name', organization: '$organization' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$organization', '$$organization'] },
                    { $eq: ['$role', '$$name'] }
                  ]
                }
              }
            }
          ],
          as: 'employees'
        }
      },
      {
        $project: {
          name: 1,
          pos: 1,
          back_office: 1,
          employees: 1,
          is_boss: 1
        }
      }
    ], (err, array) => {
      if (array == null) {
        array = []
      }
      var total = array.length
      var page = parseInt(request.params.page)
      var limit = parseInt(request.params.limit)
      array = array.slice((page - 1) * limit, limit * page)
      for (let i = 0; i < array.length; i++) {
        array[i].employees = array[i].employees.length
        if (array[i].is_boss == undefined) {
          array[i].is_boss = false
        }
        array[i].access = ""
        if (array[i].back_office) {
          array[i].access += "Back Office";
          if (array[i].pos) {
            array[i].access += " and ";
          }
        }
        if (array[i].pos) {
          array[i].access += "POS"
        }
      }
      reply.ok({
        total: total,
        page: Math.ceil(total / limit),
        data: array
      })
    })
  }

  instance.get('/access/searching/:limit/:page', options.version, (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      get_for_table(request, reply, admin)
    })
  })

  // get by id

  var get_by_id = (request, reply, admin) => {
    instance.AccessRights.findOne({
      _id: request.params.id
    }, (err, answer) => {
      if (answer) {
        // var reply_ = []
        // for(var i in answer) {
        //   reply_.push({
        //     text: i,
        //     value: answer[i]
        //   })
        // }

        reply.ok(answer)
      }
      else {
        reply.error('Not Found')
      }
    })
  }

  instance.get('/access/get/:id', options.version, (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      get_by_id(request, reply, admin)
    })
  })

  // create access rigths

  var create_access = (request, reply, admin) => {
    instance.AccessRights.findOne({
      organization: admin.organization,
      name: request.body.name
    }, (err, access) => {
      if (access) {
        instance.allready_exist(reply)
      }
      else {
        request.body.organization = admin.organization
        var accessRights = new instance.AccessRights(request.body)
        accessRights.save((err) => {
          if (err) {
            reply.error('Error on saving')
            instance.send_Error('access rights ', JSON.stringify(err))
          }
          else {
            reply.ok()
          }
        })
      }
    })
  }

  instance.post('/access/create', options.version, (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      create_access(request, reply, admin)
    })
  })

  // update access

  var update_access = (request, reply, admin) => {
    instance.AccessRights.findOne({
      _id: request.params.id
    }, (err, access) => {
      if (access) {
        if (access.name == 'boss') {
          request.body = {
            name: 'boss',
            is_bos: true,
            pos: true,
            close_ticket: true,
            can_sell: true,
            print_pre_check: true,
            receipt_save_as_draft: true,
            can_change_price: true,
            refund: true,
            show_all_receipts: true,
            pay_debt: true,
            show_shift_history: true,
            apply_discount: true,
            change_settings: true,
            edit_items: true,
            edit_ticket: true,
            split_ticket: true,
            change_waiter: true,
            delete_ticket: true,
            show_all_tickets: true,
            can_access_to_shift: true,
            back_office: true,
            reports: true,
            items: true,
            employees: true,
            customers: true,
            settings: true,
            edit_profile: true,
            set_the_taxes: true,
            manage_pos_devices: true,
            can_delete_item: true,
            inventory: true,
            inv_purchase_orders: true,
            inv_purchase_mark: true,
            inv_purchase_orders_cost: true,
            inv_transfer_orders: true,
            inv_stock_adjusment: true,
            inv_stock_adjusment_cost: true,
            inv_inventory_counts: true,
            inv_productions: true,
            inv_productions_cost: true,
            inv_suppliers: true,
            inv_supplier_transaction: true,
            inv_supplier_transaction_corrector: true,
            inv_fees: true,
            inv_inventory_history: true,
            inv_inventory_valuation: true,
            workgroup_edit_cost: true,
            workgroup: true
          }
        }
        instance.AccessRights.findOne({
          organization: admin.organization,
          name: request.body.name,
          _id: {
            $ne: request.params.id
          }
        }, (err, unique) => {
          if (unique) {
            instance.allready_exist(reply)
          }
          else {
            instance.AccessRights.updateOne({
              _id: request.params.id
            }, {
              $set: request.body
            }, (err) => {
              if (err) {
                reply.error('Error on updating')
                instance.send_Error('updating access', JSON.stringify(err))
              }
              else {
                reply.ok()
                instance.push_to_organization(111, admin.organization)
              }
            })
          }
        })
      }
      else {
        reply.error('Not found')
      }
    })
  }

  instance.post('/access/update/:id', options.version, (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      update_access(request, reply, admin)
    })
  })

  // delete access

  var delete_access = (request, reply, admin) => {
    instance.AccessRights.find({
      organization: admin.organization,
      _id: {
        $in: request.body.indexes
      }
    }, (err, accesses) => {
      if (accesses == null) {
        accesses = []
      }
      var names = []
      for (var a of accesses) {
        names.push(a.name)
      }
      instance.User.find({
        organization: admin.organization,
        role: {
          $in: names
        }
      }, (err, users) => {
        if (users == null) {
          users = []
        }
        if (users.length == 0) {
          instance.AccessRights.deleteMany({
            _id: {
              $in: request.body.indexes
            }
          }, (err) => {
            if (err) {
              reply.error('Error on deleting')
              instance.send_Error('deleing access', JSON.stringify(err))
            }
            else {
              reply.ok()
            }
          })
        }
        else {
          reply.error('Error on deleting')
        }
      })
    })
  }

  instance.post('/access/delete_group', options.version, (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      delete_access(request, reply, admin)
    })
  })

  // get roles

  var get_roles = (request, reply, admin) => {
    instance.AccessRights.find({
      organization: admin.organization
    }, (err, roles) => {
      var names = []
      for (var r of roles) {
        if (r.name != 'boss') {
          names.push({
            name: r.name,
            value: r.name
          })
        }
      }
      reply.ok(names)
    })
  }

  instance.get('/access/get/roles', options.version, (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      get_roles(request, reply, admin)
    })
  })

  next()
}