
const TokenGenerator = require('uuid-token-generator')
const axios = require('axios')

module.exports = (instance, options, next) => {

  // registration

  instance.post('/user/register', options.version, (request, reply) => {
    if (request.body) {
      const phone_number = request.body.phone_number
      if (/^\+9989[012345789][0-9]{7}$/.test(phone_number))
        return reply.error('phone_number validation error')

      if (phone_number) {
        instance.User.findOne({ phone_number: phone_number }, (err, user) => {
          if (err) {
            reply.error('Error on finding phone number')
          }
          else {
            if (user) {
              instance.aldy_exs(reply, 'phone_number')
            }
            else {
              var organization_name = request.body.organization
              instance.organizations.findOne({ name: organization_name }, (error, organization) => {
                if (error) {
                  reply.error('Error finding organization')
                }
                else {
                  if (organization) {
                    instance.aldy_exs(reply, 'organization')
                  }
                  else {
                    var organization_model = new instance.organizations({
                      name: organization_name,
                      address: request.body.address,
                      services: [],
                      is_verify: false
                    })
                    organization_model.save((error) => {
                      if (error) {
                        reply.error('Could not save!')
                      }
                      else {
                        instance.organizations.findOne({ name: organization_name }, (error, organization) => {
                          // columns
                          var summ1 = instance.summaryTable({
                            organization: organization._id,
                          })
                          summ1.save((err) => {
                            if (err) {
                              instance.send_Error('table', JSON.stringify(err))
                            }
                          })
                          var summ2 = instance.by_itemTable({
                            organization: organization._id,
                          })
                          summ2.save((err) => {
                            if (err) {
                              instance.send_Error('table', JSON.stringify(err))
                            }
                          })
                          var summ3 = instance.by_categoryTable({
                            organization: organization._id,
                          })
                          summ3.save((err) => {
                            if (err) {
                              instance.send_Error('table', JSON.stringify(err))
                            }
                          })
                          /////////////
                          var featureModel = instance.settingFeatures({
                            organization: organization._id
                          })
                          featureModel.save((err) => {
                            if (err) {
                              instance.send_Error('creating feature', JSON.stringify(err))
                            }
                          })
                          var data = {
                            organization: organization._id,
                            organization_name: organization_name,
                            name: request.body.name,
                            phone_number: request.body.phone_number,
                            email: request.body.email,
                            role: 'boss',
                            is_boss: true,
                            // token: (new TokenGenerator()).generate(),
                            image_url: request.body.image_url
                          }
                          var User_model = new instance.User(data)
                          User_model.save((error) => {
                            if (error) {
                              reply.error('Could not save!')
                            }
                            else {
                              var serviceModel = new instance.services({
                                name: organization.name,
                                organization: organization._id
                              })
                              serviceModel.save((err) => {
                                if (err) {
                                  instance.send_Error('creating service', JSON.stringify(err))
                                }
                                else {
                                  var deviceModel = new instance.posDevices({
                                    name: 'Pos 1',
                                    organization: organization._id,
                                    service: serviceModel._id
                                  })
                                  deviceModel.save((err) => {
                                    if (err) {
                                      instance.send_Error('creating pos device', JSON.stringify(err))
                                    }
                                  })
                                  var section = new instance.goodsSection({
                                    organization: organization._id,
                                    name: "Other",
                                    is_other: true
                                  })
                                  section.save((err) => {
                                    if (err) {
                                      instance.send_Error('creating section', JSON.stringify(err))
                                    }
                                  })
                                  var categoryModel = new instance.goodsCategory({
                                    organization: organization._id,
                                    section: section._id,
                                    section_id: instance.ObjectId(section._id),
                                    name: "Other",
                                    is_other: true
                                  })
                                  categoryModel.save((err) => {
                                    if (err) {
                                      instance.send_Error('creating category', JSON.stringify(err))
                                    }
                                  })
                                }
                              })
                              var boss = new instance.AccessRights({
                                organization: organization._id,
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
                                show_stock: true,
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
                              })
                              boss.save((err) => {
                                if (err) {
                                  instance.send_Error('saving boss role', JSON.stringify(err))
                                }
                              })
                              var admin = new instance.AccessRights({
                                organization: organization._id,
                                name: 'admin',
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
                              admin.save((err) => {
                                if (err) {
                                  instance.send_Error('saving admin role', JSON.stringify(err))
                                }
                              })
                              var cashier = new instance.AccessRights({
                                organization: organization._id,
                                name: 'cashier',
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
                                back_office: false,
                                reports: false,
                                items: false,
                                employees: false,
                                customers: false,
                                settings: false,
                                edit_profile: false,
                                set_the_taxes: false,
                                manage_pos_devices: false,
                                can_delete_item: false,
                              })
                              cashier.save((err) => {
                                if (err) {
                                  instance.send_Error('saving cashier role', JSON.stringify(err))
                                }
                              })
                              reply.ok()
                              // instance.User.findOne({ organization: organization._id }, (error, _) => {
                              //   if (error) {
                              //     reply.error('Error on finding user')
                              //   }
                              //   else {
                              //     axios.defaults.headers.common['Accept-Version'] = '1.0.0';
                              //     axios.defaults.headers.post['Content-Type'] = 'application/json';
                              //     axios.defaults.headers.post['Accept-User'] = request.headers['accept-user'];
                              //     var obj = {
                              //       phone_number: request.body.phone_number
                              //     }
                              //     axios.defaults.data = obj
                              //     axios.post('htpp://localhost:3000/user/login', obj)
                              //       .then(function (response) { })
                              //       .catch(function (error) { instance.send_Error(request.raw.url, JSON.stringify(err)) }).then(function () { });
                              //     reply.ok()
                              //   }
                              // })
                            }
                          })
                        })
                      }
                    })
                  }
                }
              })
            }
          }
        })
      }
      else {
        reply.error('phone number')
      }
    }
    else {
      reply.error('Body empty')
    }
  })

  function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
  }

  async function getGeneratedOtp(phone_number) {
    const otp = await instance.SuperOtp.getOtp(phone_number);
    if (!otp) {
      return getRandomInt(9000) + 1000;
    }
    return otp;
  }

  // #login

  instance.post('/user/login', options.version, (request, reply) => {
    var phone_number = request.body.phone_number
    instance.User.findOne({
      phone_number: phone_number
    }, (err, user) => {
      if (err || user == undefined) {
        instance.hs_not_exs(reply)
      }
      else {
        instance.organizations.findOne({
          _id: user.organization
        }, (err, organization) => {
          if (err || organization == null) {
            instance.hs_not_exs(reply)
          }
          else if (user.is_phone_number && user.phone_number != "") {
            instance.SMS.findOne({ phone_number: user.phone_number, user: request.headers['accept-user'] }, async (_, sms) => {
              var sms_code = await getGeneratedOtp(user.phone_number)
              var timer = new Date().getTime()
              if (sms) {
                instance.SMS.findOneAndUpdate({ _id: sms._id }, { $set: { sms_code: sms_code, timer: timer } }, (error, doc) => {
                  if (error) {
                    instance.send_Error(request.raw.url, JSON.stringify(error))
                    reply.error('Error on updating sms code')
                  }
                  else {
                    instance.services.find({
                      organization: organization._id
                    }, { name: 1 }, (err, services) => {
                      if (err || services == null) {
                        services = []
                      }
                      var data = {
                        phone_number: user.phone_number
                      }
                      if (request.headers['accept-user'] == 'employee') {
                        data = services
                      }
                      reply.ok(data)
                      instance.sending_sms_code(user.phone_number, sms_code, request.headers['accept-user'], organization)
                    })
                  }
                })
              }
              else {
                var model = new instance.SMS({ phone_number: user.phone_number, user: request.headers['accept-user'], sms_code: sms_code, timer: timer })
                model.save((error) => {
                  if (error) {
                    instance.send_Error(request.raw.url, JSON.stringify(error))
                    reply.error('Error')
                  }
                  else {
                    instance.services.find({
                      organization: organization._id
                    }, { name: 1 }, (err, services) => {
                      if (err || services == null) {
                        services = []
                      }
                      var data = {
                        phone_number: user.phone_number
                      }
                      if (request.headers['accept-user'] == 'employee') {
                        data = services
                      }
                      reply.ok(data)
                      instance.sending_sms_code(user.phone_number, sms_code, request.headers['accept-user'], organization)
                    })
                  }
                })
              }
            })
          }
          else {
            reply.error('INVALID PHONE NUMBER')
          }
        })
      }
    })
  })

  instance.post('/user/login/verify', options.version, (request, reply) => {
    var phone_number = request.body.phone_number
    instance.User.findOne({
      phone_number: phone_number
    }, (error, user) => {
      if (error) {
        reply.error('Error on finding employee')
      } else {
        if (user) {
          instance.SMS.findOne({
            phone_number: phone_number,
            user: request.headers['accept-user']
          }, (error, sms) => {
            if (error || sms == null) {
              reply.error('Error')
            }
            else {
              if (sms) {
                var timer = new Date().getTime()
                if (sms.sms_code == request.body.sms_code && timer - sms.timer < 180000) {
                  instance.SMS.deleteOne({
                    _id: sms._id
                  }, (err, _) => {
                    if (err) {
                      instance.send_Error(request.raw.url, JSON.stringify(err))
                    }
                  })
                  if (request.headers['accept-user'] == 'boss' && user.boss_token == 'Unchanged') {
                    user.boss_token = (new TokenGenerator()).generate()
                  }
                  else if (request.headers['accept-user'] == 'admin') {
                    user.admin_token = (new TokenGenerator()).generate()
                  }
                  else {
                    if (user.employee_token == 'Unchanged') {
                      user.employee_token = (new TokenGenerator()).generate()
                    }
                  }
                  instance.User.updateOne({ _id: user._id }, { $set: user }, (err, _) => {
                    if (err) {
                      reply.error('Error on updating')
                    }
                    else {
                      if (request.headers['accept-user'] == 'boss') {
                        user.token = user.boss_token
                      }
                      else if (request.headers['accept-user'] == 'admin') {
                        user.token = user.admin_token
                      }
                      else {
                        user.token = user.employee_token
                      }
                      user.boss_token = undefined
                      user.admin_token = undefined
                      user.employee_token = undefined
                      user.boss_fire_token = undefined
                      user.employee_fire_token = undefined
                      user.fire_token = ""
                      instance.AccessRights.findOne({
                        organization: user.organization,
                        name: user.role
                      }, (_, access) => {
                        if (access) {
                          try {
                            user = user.toObject()
                            access = access.toObject()
                          }
                          catch (error) {
                            instance.send_Error('to Object', error.message)
                          }
                          user.access = {
                            ...access,
                            close_ticket: access.close_ticket,
                            can_sell: access.can_sell,
                            print_pre_check: access.print_pre_check,
                            receipt_save_as_draft: access.receipt_save_as_draft,
                            wharehouse_manager: access.wharehouse_manager,
                            can_change_price: access.can_change_price,
                            refund: access.refund,
                            show_all_receipts: access.show_all_receipts,
                            pay_debt: access.pay_debt,
                            show_shift_history: access.show_shift_history,
                            apply_discount: access.apply_discount,
                            change_settings: access.change_settings,
                            show_stock: access.show_stock,
                            edit_items: access.edit_items,
                            edit_ticket: access.edit_ticket,
                            split_ticket: access.split_ticket,
                            change_waiter: access.change_waiter,
                            delete_ticket: access.delete_ticket,
                            show_all_tickets: access.show_all_tickets,
                            can_access_to_shift: access.can_access_to_shift,
                          }
                          reply.ok(user)
                        }
                        else {
                          reply.error('Incorrect sms code')
                        }
                      })

                      instance.organizations.findOne({ _id: user.organization }, (_, organization) => {
                        // instance.sending_sms_code_success(user, organization)
                        if (organization) {
                          if (organization.services == undefined) {
                            organization.services = []
                          }
                          for (var s of organization.services) {
                            instance.pushnotification(111, s, {})
                          }
                        }
                      })
                    }
                  })
                }
                else {
                  reply.error('Incorrect sms code')
                }
              }
            }
          })
        }
        else {
          instance.hs_not_exs(reply)
        }
      }
    })
  })

  next()
}
