module.exports = (instance, options, next) => {
  // get access rights

  const get_access = async (request, reply, admin) => {
    const feature = await instance.settingFeatures
      .findOne({ organization: admin.organization })
      .lean();
    // , async (err, feature) => {
    if (feature) {
      const access = await instance.AccessRights.findOne({
        organization: admin.organization,
        name: admin.role,
      }).lean();
      //  (err, access) => {

      if (access) {
        const USER = {};
        // try {
        //   access = access.toObject()
        // }
        // catch (error) {
        //   instance.send_Error('to Object', error.message)
        // }
        delete access.pos;
        delete access.close_ticket;
        delete access.can_sell;
        delete access.refund;
        delete access.show_all_receipts;
        delete access.pay_debt;
        delete access.show_shift_history;
        delete access.apply_discount;
        delete access.change_settings;
        delete access.show_stock;
        delete access.edit_items;
        delete access.organization;
        delete access._id;
        delete access.back_office;
        access.inventory = true;
        USER.access = access;
        USER.feature = feature;
        reply.ok(USER);
      } else {
        // reply.error('Access does not exist')
        reply.ok({
          access: {
            is_bos: false,
            reports: true,
            items: true,
            inventory: true,
            employees: true,
            customers: true,
            settings: true,
            edit_profile: true,
            set_the_taxes: true,
            manage_pos_devices: true,
            can_delete_item: true,
          },
          feature: {
            opened_receipts: true,
            debts: true,
            shifts: true,
            orders: true,
            chat: true,
            print_pre_check: true,
            receipt_save_as_draft: true,
            can_change_price: true,
            open_tickets: true,
            time_clock: true,
            show_stock: false,
            karaoke: true,
            scale: true,
            section: true,
            __v: 0,
          },
        });
      }
      // })
    } else {
      // reply.error('Feature not exist')
      reply.ok({
        access: {
          is_bos: false,
          pos: false,
          close_ticket: false,
          wharehouse_manager: false,
          can_sell: true,
          print_pre_check: false,
          receipt_save_as_draft: false,
          can_change_price: false,
          refund: false,
          show_all_receipts: true,
          pay_debt: false,
          show_shift_history: false,
          apply_discount: false,
          change_settings: false,
          edit_items: false,
          edit_ticket: false,
          split_ticket: false,
          change_waiter: false,
          delete_ticket: false,
          show_all_tickets: false,
          can_access_to_shift: false,
          back_office: true,
          reports: true,
          items: true,
          employees: true,
          customers: true,
          settings: true,
          edit_profile: false,
          set_the_taxes: true,
          manage_pos_devices: true,
          can_delete_item: false,
          inventory: true,
          inv_purchase_orders: false,
          inv_purchase_mark: false,
          inv_purchase_orders_cost: false,
          inv_transfer_orders: false,
          inv_stock_adjusment: false,
          inv_stock_adjusment_cost: false,
          inv_inventory_counts: true,
          inv_productions: true,
          inv_productions_cost: true,
          inv_suppliers: true,
          inv_supplier_transaction: false,
          inv_supplier_transaction_corrector: false,
          inv_fees: false,
          inv_inventory_history: false,
          inv_inventory_valuation: false,
          workgroup: false,
          workgroup_edit_cost: false,
          name: 'admin',
          employee_access_rights: false,
          employee_list: true,
          employee_time_cards: false,
          employee_total_worked: false,
          item_add_from_warehause: false,
          item_categories: false,
          item_composite_item: false,
          item_discount: false,
          item_list: false,
          item_modifiers: true,
          item_mxik_search: false,
          item_price_change_history: false,
          item_print_label: true,
          report_abs: false,
          report_accaunt: false,
          report_debt: false,
          report_discount: false,
          report_employee: false,
          report_receipt: false,
          report_sale: false,
          report_sale_by_category: false,
          report_sale_by_item: false,
          report_sale_by_payment: false,
          report_sale_by_supplier: false,
          report_shift: false,
          report_taxes: false,
          setting_buttons: false,
          setting_currency: false,
          setting_general: false,
          setting_loyalty: tfalserue,
          setting_nds: false,
          setting_open_tickets: false,
          setting_options: false,
          setting_organization: false,
          setting_payment_types: false,
          setting_pos_devices: false,
          setting_receipt: false,
          setting_stores: false,
          setting_taxes: false,
          employee_access_rights_add: false,
          employee_access_rights_del: false,
          employee_list_add: false,
          employee_list_del: false,
          create: false,
          create_access: false,
          create_customer: false,
          create_discount: false,
          create_employee: false,
          create_fee: false,
          create_good_category: false,
          create_good_sale: false,
          create_inv_count: false,
          create_modifier: false,
          create_pos_device: false,
          create_production: false,
          create_purchase: false,
          create_reciept: false,
          create_stock_adjustmen: false,
          create_store: false,
          create_supplier: false,
          create_supplier_create_doc: false,
          create_taxes: false,
          create_time_card: false,
          create_transfer: false,
        },
        feature: {
          opened_receipts: true,
          debts: true,
          shifts: true,
          orders: true,
          chat: true,
          print_pre_check: true,
          receipt_save_as_draft: true,
          can_change_price: true,
          open_tickets: true,
          time_clock: true,
          show_stock: false,
          karaoke: true,
          scale: true,
          section: true,
          __v: 0,
        },
      });
    }
    // })
  };

  instance.get('/user/get_access', options.version, (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      get_access(request, reply, admin);
    });
  });

  // get for table

  const get_for_table = (request, reply, admin) => {
    instance.AccessRights.aggregate(
      [
        { $match: { organization: admin.organization } },
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
                      { $eq: ['$role', '$$name'] },
                    ],
                  },
                },
              },
            ],
            as: 'employees',
          },
        },
        {
          $project: {
            name: 1,
            pos: 1,
            back_office: 1,
            employees: 1,
            is_boss: 1,
          },
        },
      ],
      (err, array) => {
        if (array == null) {
          array = [];
        }
        const total = array.length;
        const page = parseInt(request.params.page);
        const limit = parseInt(request.params.limit);
        array = array.slice((page - 1) * limit, limit * page);
        for (let i = 0; i < array.length; i++) {
          array[i].employees = array[i].employees.length;
          if (array[i].is_boss == undefined) {
            array[i].is_boss = false;
          }
          array[i].access = '';
          if (array[i].back_office) {
            array[i].access += 'Back Office';
            if (array[i].pos) {
              array[i].access += ' and ';
            }
          }
          if (array[i].pos) {
            array[i].access += 'POS';
          }
        }
        reply.ok({
          total: total,
          page: Math.ceil(total / limit),
          data: array,
        });
      }
    );
  };

  instance.get(
    '/access/searching/:limit/:page',
    options.version,
    (request, reply) => {
      instance.oauth_admin(request, reply, (admin) => {
        get_for_table(request, reply, admin);
      });
    }
  );

  // get by id

  const get_by_id = async (request, reply, admin) => {
    const access = await instance.AccessRights.findById(
      request.params.id
    ).lean();

    if (access) {
      reply.ok(access);
    } else {
      reply.error('Not Found');
    }
  };

  instance.get('/access/get/:id', options.version, (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      get_by_id(request, reply, admin);
    });
  });

  // create access rigths

  const create_access = async (request, reply, admin) => {
    const access = await instance.AccessRights.findOne({
      organization: admin.organization,
      name: request.body.name,
    }).lean();
    // , (err, access) => {
    if (access) {
      instance.allready_exist(reply);
    } else {
      request.body.organization = admin.organization;
      const accessRights = new instance.AccessRights(request.body);
      accessRights.save((err) => {
        if (err) {
          reply.error('Error on saving');
          instance.send_Error('access rights ', JSON.stringify(err));
        } else {
          reply.ok();
        }
      });
    }
    // })
  };

  instance.post('/access/create', options.version, (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      create_access(request, reply, admin);
    });
  });

  // update access

  const update_access = async (request, reply, admin) => {
    const access = await instance.AccessRights.findOne({
      _id: request.params.id,
    }).lean();
    // , (err, access) => {
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
          //reports
          reports: true,
          report_sale: true,
          report_accaunt: true,
          report_abs: true,
          report_sale_by_item: true,
          report_sale_by_category: true,
          report_sale_by_supplier: true,
          report_employee: true,
          report_sale_by_payment: true,
          report_receipt: true,
          report_debt: true,
          report_discount: true,
          report_taxes: true,
          report_shift: true,
          //items
          items: true,
          item_list: true,
          item_mxik_search: true,
          item_composite_item: true,
          item_add_from_warehause: true,
          item_print_label: true,
          item_price_change_history: true,
          item_categories: true,
          item_modifiers: true,
          item_discount: true,
          //employees
          employees: true,
          employee_list: true,
          employee_list_add: true,
          employee_list_del: true,
          employee_access_rights: true,
          employee_access_rights_add: true,
          employee_access_rights_del: true,
          employee_time_cards: true,
          employee_total_worked: true,
          customers: true,
          //settings
          settings: true,
          setting_general: true,
          setting_organization: true,
          setting_nds: true,
          setting_payment_types: true,
          setting_currency: true,
          setting_loyalty: true,
          setting_taxes: true,
          setting_receipt: true,
          setting_open_tickets: true,
          setting_buttons: true,
          setting_options: true,
          setting_stores: true,
          setting_pos_devices: true,
          edit_profile: true,
          set_the_taxes: true,
          manage_pos_devices: true,
          can_delete_item: true,
          //create
          create: true,
          create_purchase: true,
          create_taxes: true,
          create_store: true,
          create_pos_device: true,
          create_customer: true,
          create_employee: true,
          create_access: true,
          create_time_card: true,
          create_transfer: true,
          create_stock_adjustmen: true,
          create_inv_count: true,
          create_production: true,
          create_supplier: true,
          create_supplier_create_doc: true,
          create_fee: true,
          create_good_sale: true,
          create_good_category: true,
          create_modifier: true,
          create_discount: true,
          create_reciept: true,
          //inventory
          inventory: true,
          inv_supplier_valuation: true,
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
          workgroup: true,
        };
      }
      const unique = await instance.AccessRights.findOne({
        organization: admin.organization,
        name: request.body.name,
        _id: { $ne: request.params.id },
      })
        .lean();
      // , (err, unique) => {
      if (unique) {
        instance.allready_exist(reply);
      } else {
        instance.AccessRights.updateOne(
          { _id: request.params.id },
          { $set: request.body },
          (err) => {
            if (err) {
              reply.error('Error on updating');
              instance.send_Error('updating access', JSON.stringify(err));
            } else {
              reply.ok();
              instance.push_to_organization(111, admin.organization);
            }
          }
        );
      }
      // })
    } else {
      reply.error('Not found');
    }
    // })
  };

  instance.post('/access/update/:id', options.version, (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      update_access(request, reply, admin);
    });
  });

  // delete access

  const delete_access = (request, reply, admin) => {
    instance.AccessRights.find(
      {
        organization: admin.organization,
        _id: {
          $in: request.body.indexes,
        },
      },
      (err, accesses) => {
        if (accesses == null) {
          accesses = [];
        }
        const names = [];
        for (var a of accesses) {
          names.push(a.name);
        }
        instance.User.find(
          {
            organization: admin.organization,
            role: { $in: names },
          },
          (err, users) => {
            if (users == null) {
              users = [];
            }
            if (users.length == 0) {
              instance.AccessRights.deleteMany(
                {
                  _id: {
                    $in: request.body.indexes,
                  },
                },
                (err) => {
                  if (err) {
                    reply.error('Error on deleting');
                    instance.send_Error('deleing access', JSON.stringify(err));
                  } else {
                    reply.ok();
                  }
                }
              );
            } else {
              reply.error('Error on deleting');
            }
          }
        );
      }
    );
  };

  instance.post('/access/delete_group', options.version, (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      delete_access(request, reply, admin);
    });
  });

  // get roles

  const get_roles = (request, reply, admin) => {
    instance.AccessRights.find(
      {
        organization: admin.organization,
      },
      (err, roles) => {
        const names = [];
        for (var r of roles) {
          if (r.name != 'boss') {
            names.push({
              name: r.name,
              value: r.name,
            });
          }
        }
        reply.ok(names);
      }
    );
  };

  instance.get('/access/get/roles', options.version, (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      get_roles(request, reply, admin);
    });
  });

  next();
};
