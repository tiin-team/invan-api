// const TokenGenerator = require('uuid-token-generator')
// const axios = require('axios')
const fp = require('fastify-plugin')

module.exports = fp((instance, options, next) => {
  // registration

  instance.post('/user/register', {
    version: '2.0.0',

  }, async (request, reply) => {
    if (!request.body) {
      return reply.error('Body empty')
    }
    const phone_number = request.body.phone_number
    if (!phone_number)
      return reply.error('phone number')

    if (!/^\+9989[012345789][0-9]{7}$/.test(phone_number))
      return reply.error('phone_number validation error')

    const user = await instance.User
      .findOne({ phone_number: phone_number }, { _id: 1 })
      .lean()
    if (user) {
      return instance.aldy_exs(reply, 'phone_number')
    }

    const organization_name = request.body.organization
    const organization = await instance.organizations
      .findOne({ name: organization_name }, { _id: 1 })
      .lean()

    if (organization) {
      return instance.aldy_exs(reply, 'organization')
    }

    const organization_model = new instance.organizations({
      name: organization_name,
      address: request.body.address,
      services: [],
      is_verify: false
    })
    const new_organization = await organization_model.save()

    // columns
    const summ1 = instance.summaryTable({ organization: new_organization._id })
    summ1.save((err) => {
      if (err) {
        instance.send_Error('register table', JSON.stringify(err))
      }
    })

    const summ2 = instance.by_itemTable({ organization: new_organization._id })
    summ2.save((err) => {
      if (err) {
        instance.send_Error('table', JSON.stringify(err))
      }
    })

    const summ3 = instance.by_categoryTable({ organization: new_organization._id })
    summ3.save((err) => {
      if (err) {
        instance.send_Error('table', JSON.stringify(err))
      }
    })
    /////////////
    const featureModel = instance.settingFeatures({ organization: new_organization._id })
    featureModel.save((err) => {
      if (err) {
        instance.send_Error('creating feature', JSON.stringify(err))
      }
    })

    const data = {
      organization: new_organization._id,
      organization_name: organization_name,
      name: request.body.name,
      phone_number: request.body.phone_number,
      email: request.body.email,
      role: 'boss',
      is_boss: true,
      // token: (new TokenGenerator()).generate(),
      image_url: request.body.image_url
    }

    const User_model = new instance.User(data)

    const new_user_create_error = await new Promise((resolve) => {
      User_model.save((error) => {
        if (error) {
          instance.send_Error('new_user', JSON.stringify(err))
          return resolve(true)
        }
        return resolve(false)
      })
    })

    if (new_user_create_error) {
      return reply.error('Could not save')
    }

    const serviceModel = new instance.services({
      name: new_organization.name,
      organization: new_organization._id
    })

    const new_service = await serviceModel.save((err) => {
      if (err) {
        instance.send_Error('creating service', JSON.stringify(err))
      }
      else {
        const deviceModel = new instance.posDevices({
          name: 'Pos 1',
          organization: new_organization._id,
          service: serviceModel._id
        })
        deviceModel.save((err) => {
          if (err) {
            instance.send_Error('creating pos device', JSON.stringify(err))
          }
        })

        const section = new instance.goodsSection({
          organization: new_organization._id,
          name: "Other",
          is_other: true
        })
        section.save((err) => {
          if (err) {
            instance.send_Error('creating section', JSON.stringify(err))
          }
        })

        const categoryModel = new instance.goodsCategory({
          organization: new_organization._id,
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

    await instance.User.findByIdAndUpdate(
      new_service._id,
      {
        $set: {
          services: [{
            service: new_service._id,
            service_name: new_service.name,
            available: true,
          }]
        },
      },
      { lean: true },
    )

    const boss = new instance.AccessRights({
      organization: new_organization._id,
      name: 'boss',
      is_bos: true,
      can_sell: true,
      pos: true,
      close_ticket: true,
      wharehouse_manager: true,
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
      items: true,
      item_edit: true,
      item_list: true,
      item_mxik_search: true,
      item_composite_item: true,
      item_add_from_warehause: true,
      item_print_label: true,
      item_price_change_history: true,
      item_categories: true,
      item_modifiers: true,
      item_discount: true,
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
      workgroup: true,
      workgroup_edit_cost: true,
    })

    boss.save((err) => {
      if (err) {
        instance.send_Error('saving boss role', JSON.stringify(err))
      }
    })

    const admin = new instance.AccessRights({
      organization: new_organization._id,
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

    const cashier = new instance.AccessRights({
      organization: new_organization._id,
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

    return reply.ok()
  })

  next()
})
