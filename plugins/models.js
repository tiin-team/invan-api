const fp = require('fastify-plugin')
const mongoose = require('mongoose')

module.exports = fp((instance, _, next) => {

  const BOS = instance.model('inoneBOS', {
    organization: String,
    full_name: {
      type: String,
      default: "Anvar"
    },
    name: String,
    last_name: String,
    phone_number: String,
    password: String,
    token: String,
    email: String,
    image_url: String,
    fire_token: String
  })
  instance.decorate('BOS', BOS)

  const Admin = instance.model('inoneAdmin', {
    organization: String,
    name: String,
    last_name: String,
    phone_number: String,
    token: String,
    image_url: String
  })
  instance.decorate('Admin', Admin)

  const services = instance.model('inoneServices', {
    name: String,
    organization: String,
    type_of_business: {
      type: String,
      default: ""
    },
    type: {
      type: String,
      default: "shop",
      enum: ['shop', 'restaurant', 'market']
    },
    address: {
      type: String,
      default: ""
    },
    is_shop: {
      type: Boolean,
      default: false
    },
    phone_number: {
      type: String,
      default: ""
    },
    description: {
      type: String,
      default: ""
    },
    service_value: {
      type: Number,
      default: 0
    },
    location: {
      latitude: {
        type: Number,
        default: 41.311081
      },
      longitude: {
        type: Number,
        default: 69.240562
      },
    },
    location_name: {
      type: String,
      default: ''
    },
    count: {
      type: Number,
      default: 0
    },
    image_url: {
      type: String,
      default: ''
    },
    low_stock_date: { type: Number, default: 7 },
  })
  instance.decorate('services', services)
  instance.generate('/services', services, { public_search: true })

  instance.generate('/services/types', instance.model('servicesTypes', {
    type: String,
    name: String
  }), { public: true })
  instance.generate('/services/type_of_business', instance.model('servicesTypeOfBusiness', {
    name: String
  }), { public: true })

  const organizations = instance.model('inoneOrgaziations', {
    inn: {
      type: String,
      default: ""
    },
    services: Array,
    language: {
      type: String,
      enum: ['en', 'ru', 'uz'],
      default: 'en'
    },
    loyalty_bonus: {
      type: Number,
      default: 0
    },
    nds_value: {
      type: Number,
      default: 0
    },
    name: String,
    address: {
      type: String,
      default: ""
    },
    is_service_created: {
      type: Boolean,
      default: false
    },
    is_verify: {
      type: Boolean,
      default: true
    },
    // ]}})
    payments: {
      type: Array,// cash card gift debt qr_code nfc
      default: [
        {
          name: 'cash',
          title: 'Cash',
          enable: false,
          status: true
        },
        {
          name: 'card',
          title: 'Card',
          enable: true,
          status: true
        },
        {
          name: 'gift',
          title: 'Gift',
          enable: true,
          status: true
        },
        {
          name: 'debt',
          title: 'Debt',
          enable: true,
          status: true
        },
        {
          name: 'qr_code',
          title: 'QR Code',
          enable: true,
          status: true
        },
        {
          name: 'nfc',
          title: 'NFC',
          enable: true,
          status: true
        }
      ]
    },
    workgroup_comments: {
      type: Array,
      default: []
    },
    cash_back: {
      type: Array,
      default: [
        {},
      ]
    },
    is_ofd: {
      type: Boolean,
      default: false
    },
    director_name: {
      type: String,
      default: "",
    },
    accaunter: {
      type: String,
      default: "",
    },
    org_phone_number: {
      type: String,
      default: "",
    },
    is_same_service_price: {
      type: Boolean,
      default: false,
    },
    //didox uchun soliq to'lovchining kodi
    taxes_pair_code: {
      type: String,
      default: "",
    },
  })

  instance.decorate('organizations', organizations)
  instance.generate('/organizations', organizations, { access_get: true })

  const model = instance.model('sms_codees', {
    phone_number: String,
    user: {
      type: String,
      enum: ['admin', 'employee', 'boss']
    },
    sms_code: Number,
    timer: Number
  })
  instance.decorate('SMS', model)
  instance.generate('/sms', model)

  const sms_model = instance.model('sms_code_for_bot', {
    phone_number: String,
    inn: String,
    sms_code: Number
  })
  instance.decorate('SMS_Bot', sms_model)
  instance.generate('/sms_bot', sms_model)

  const employees = instance.model('employeesList', {
    organization: String,
    service: String,
    services: {
      type: Array,
      default: []// [id1, id2]
    },
    name: String,
    last_name: String,
    experience: String,
    percentage: Number,
    check_id: {
      type: String,
      default: 'A'
    },
    email: String,
    last_receipt: {
      type: Number,
      default: 0,
    },
    phone_number: String,
    password: {
      type: Number,
      default: 0
    },
    token: String,
    is_active: {
      type: Boolean,
      default: false
    },
    role: {
      type: String,
      enum: ["cashier", "waiter"]
    },
    image_url: String,
    fire_token: String
  })
  instance.decorate('employees', employees)

  const Passwords = instance.model('Passwords', {
    employee_id: String,
    password: Number
  })
  instance.decorate('Passwords', Passwords)

  const Receipts = instance.model('Receipts', {
    organization: String,
    service: String,
    workgroup_order_id: String,
    is_self: {
      type: Boolean,
      default: false
    },
    created_time: Number,
    receipt_no: {
      type: String,
      default: 'A0001'
    },
    total_price: Number,
    additional: {
      type: Number,
      default: 0
    },
    difference: {
      type: Number,
      default: 0
    },
    cashier_id: {
      type: String,
      default: ""
    },
    cashier_name: String,
    waiter_id: {
      type: String,
      default: ""
    },
    waiter_name: String,
    service_value: {
      type: Number,
      default: 0
    },
    pos_id: String,
    pos_name: {
      type: String,
      default: "Device77"
    },
    is_refund: {
      type: Boolean,
      default: false
    },
    debt_id: {
      type: String,
      default: null
    },
    debt_name: String,
    refund_number: String,
    ticket_id: {
      type: String,
      default: ""
    },
    is_charged: {
      type: Boolean,
      default: true
    },
    currency: {
      type: String,
      default: 'uzs',
      enum: ['uzs', 'usd']
    },
    currency_value: {
      type: Number
    },
    refund: String,
    total_discount: {
      type: Number,
      default: 0
    },
    sold_item_list: [{
      queue_id: mongoose.Types.ObjectId,
      queue: Number,
      partiation_id: mongoose.Types.ObjectId,
      p_order: String,
      qty_box: Number,
      receipt_id: String,
      variant_of: String,
      product_id: String,
      sku: String,
      product_name: String,
      category_id: String,
      category_name: String,
      supplier_id: String,
      supplier_name: String,
      parent_name: String,
      created_time: Number,
      closed_time: Number,
      is_karaoke: {
        type: Boolean,
        default: false
      },
      cost: Number,
      price: Number,
      price_currency: String,
      currency: String,
      price_position: Number,
      price_type: {
        type: String,
        enum: ['P', 'P1', 'P2', 'P3'],
        default: 'P'
      },
      total_discount: {
        type: Number,
        default: 0
      },
      total: Number,
      count_by_type: Number,
      value: Number,
      paid_value: {
        type: Number,
        default: 0
      },
      barcode: String,
      reset_count: Number,
      returned_reminder: {
        type: Number,
        default: 0
      },
      comment: String,
      sold_item_type: {
        type: String,
        enum: ['item', 'box_item', 'pcs_item'],
        default: 'item'
      },
      sold_item_id: String,
      reminder: {
        type: Number,
        default: 0
      },
      paid_reminder: {
        type: Number,
        default: 0
      },
      taxes: {
        type: Array,
        default: []
      },
      modifiers: {
        type: Array,
        default: []
      },
      // [{
      //   modifier_name: String,
      //   modifier_id: String,
      //   modifier_options: [
      //     {
      //       option_name: String,
      //       price: Number
      //     }
      //   ]
      // }]
      discount: {
        type: Array,
        default: []
      },
      total_debt: {
        type: Number,
        default: 0
      },
      total_paid_debt: {
        type: Number,
        default: 0
      },
      edit_history: {
        type: Array,
        default: []
      }
    }],
    debtData: Object,
    comment: String,
    discount: {
      type: Array,
      default: []
    },
    opened_time: Number,
    date: Number,
    payment: [{
      name: String,// cash card gift debt qr_code nfc
      value: Number
    }],
    taxes: Array,
    user_id: {
      type: String,
      default: '0'
    },
    order_id: {
      type: String,
      default: null
    },
    point_balance: {
      type: Number,
      default: 0
    },
    receipt_type: {
      type: String,
      enum: [
        'sale', 'debt'
      ],
      default: 'sale'
    },
    receipt_state: {
      type: String,
      enum: [
        'receipt', 'draft'
      ],
      default: 'receipt'
    },
    old_id: String,
    refund_not_stock: {
      type: Boolean,
      default: false
    },
    created_from: {
      type: String,
      default: 'pos' // pos | office
    },
    cashback_phone: String,
    cash_back: {
      type: Number,
      default: 0
    },
    zdachi_to_cashback: {
      type: Number,
      default: 0
    },
    comment: String,
  })
  instance.decorate('Receipts', Receipts)

  const Tables = instance.model('Tables', {
    organization: String,
    service: String,
    is_self: {
      type: Boolean,
      default: false
    },
    name: String,
    price: Number,
    is_empty: {
      type: Boolean,
      default: true
    },
    waiter_id: {
      type: String,
      default: ""
    },
    waiter_name: {
      type: String,
      default: ""
    },
    opened_time: Number,
    receipt_id: {
      type: String,
      default: ""
    },
    position: {
      type: Number,
      default: 0
    }
  })
  instance.decorate('Tables', Tables)

  const Shifts = instance.model('Shifts', {
    organization: String,
    old_id: String,
    service: String,
    by_whom: String,
    workgroup_order_id: String,
    by_whom_name: {
      type: String,
      default: 'Kassir'
    },
    by_whom_close: String,
    by_whom_name_close: {
      type: String,
      default: 'Kassir'
    },
    pos: String,
    pos_id: String,
    opening_time: Number,
    closing_time: {
      type: Number,
      default: 0
    },
    currency: {
      type: String,
      default: 'uzs',
      enum: ['uzs', 'usd']
    },
    cash_drawer: {
      starting_cash: {
        type: Number,
        default: 0
      },
      cash_payment: {
        type: Number,
        default: 0
      },
      inkassa: {
        type: Number,
        default: 0
      },
      cash_refund: {
        type: Number,
        default: 0
      },
      paid_in: {
        type: Number,
        default: 0
      },
      paid_out: {
        type: Number,
        default: 0
      },
      exp_cash_amount: {
        type: Number,
        default: 0
      },
      act_cash_amount: {
        type: Number,
        default: 0
      },
      withdrawal: {
        type: Number,
        default: 0
      },
      difference: {
        type: Number,
        default: 0
      }
    },
    sales_summary: {
      gross_sales: {
        type: Number,
        default: 0
      },
      refunds: {
        type: Number,
        default: 0
      },
      cashback_in: {
        type: Number,
        default: 0
      },
      cashback_out: {
        type: Number,
        default: 0
      },
      discounts: {
        type: Number,
        default: 0
      },
      net_sales: {
        type: Number,
        default: 0
      },
      cash: {
        type: Number,
        default: 0
      },
      card: {
        type: Number,
        default: 0
      },
      debt: {
        type: Number,
        default: 0
      },
      taxes: {
        type: Number,
        default: 0
      }
    },
    Pays: {
      type: Array,
      default: []
      /**[{
          time: Number,
          name: String,
          created_shift_id: String,
          shift_id: String,
          comment: String,
          value: Number,
          who: String,
          type: {
            type: String,
            enum: ['pay_in', 'pay_out', 'from_safe', 'debt', 'card']
          }
        }] */
    }
  })
  instance.decorate('Shifts', Shifts)

  const paysButtons = new instance.model('paysButtons', {
    organization: String,
    service: String,
    name: String,
    type: {
      type: String,
      enum: ['pay_in', 'pay_out', 'none']
    }
  })
  instance.decorate('paysButtons', paysButtons)
  instance.generate('/pays/buttons', paysButtons)

  const taxSchema = new mongoose.Schema({
    tax_id: mongoose.Schema.Types.ObjectId,
    available: {
      type: Boolean,
      default: false
    },
    name: String,
    tax: Number,
    type: String
  })

  const goodsSaleQueue = instance.model('goodsSaleQueue', {
    organization_id: mongoose.Types.ObjectId,
    supplier_id: mongoose.Types.ObjectId,
    supplier_name: String,
    purchase_id: mongoose.Types.ObjectId,
    p_order: String,
    partiation_no: String,
    service_id: mongoose.Types.ObjectId,
    service_name: String,
    good_id: mongoose.Types.ObjectId,
    good_name: String,
    cost: Number,
    barcode: {
      type: Array,
      default: []
    },
    quantity: Number,
    quantity_left: Number,
    queue: Number,
    date: Number,
  })
  instance.decorate('goodsSaleQueue', goodsSaleQueue)

  const goodsSales = instance.model('goodsSales', {
    organization: String,
    service: String,
    queue: Number,
    //partiation qill
    suppliers: [{
      supplier_id: mongoose.Types.ObjectId,
      supplier_name: String,
      service_id: mongoose.Types.ObjectId,
      service_name: String,
      stock: Number,
    }],
    services: [
      {
        service: mongoose.Schema.Types.ObjectId,
        service_name: String,
        price: {
          type: Number,
          default: 0
        },
        is_price_change: {
          type: Boolean,
          default: false
        },
        price_currency: {
          type: String,
          enum: ['uzs', 'usd'],
          default: 'uzs'
        },
        price_auto_fill: {
          type: Boolean,
          default: true
        },
        prices: {
          type: Array,
          default: []
        }, // { from: Number, price: Number },
        in_stock: {
          type: Number,
          default: 0
        },
        low_stock: Number,
        optimal_stock: Number,
        reminder: {
          type: Number,
          default: 0
        },
        variant_name: {
          type: String,
          default: ''
        },
        available: {
          type: Boolean
        },
        stopped_item: {
          type: Boolean,
          default: false
        },
        sku: Number,
        printed_time: {
          type: Number,
          default: 0
        },
        printed_price_change_time: {
          type: Number,
          default: 0
        },
        last_price_change: {
          type: Number,
          default: 0
        },
      }
    ],
    stopped_item: {
      type: Boolean,
      default: false
    },
    created_time: Number,
    last_updated: {
      type: Number,
      default: 0
    },
    last_stock_updated: {
      type: Number,
      default: 0
    },
    last_price_change: {
      type: Number,
      default: 0
    },
    name: {
      type: String,
      default: ''
    },
    fabricator: String,
    category: String,
    category_id: {
      type: mongoose.Schema.Types.ObjectId
    },
    category_name: String, // remove soon
    sale_is_avialable: {
      type: Boolean,
      default: true
    },
    sold_by: {
      type: String,
      enum: [
        'each',
        'weight',
        // 'list',
        // 'karaoke',
        'pcs',
        'box',
        'litre',
        'metre'
      ],
      default: 'each'
    },
    count_by_type: {
      type: Number,
      default: 0
    },
    barcode_by_type: {
      type: String
    },
    expire_date: Number,
    reminder: Number,
    has_discount: Boolean,
    old_price: Number,
    price: Number,
    prices: {
      type: Array,
      default: []
    },
    price_auto_fill: {
      type: Boolean,
      default: true
    },
    price_currency: {
      type: String,
      // enum: ['uzs', 'usd'],
      default: 'uzs'
    },
    cost: {
      type: Number,
      default: 0
    },
    cost_currency: {
      type: String,
      // enum: ['uzs', 'usd'],
      default: 'uzs'
    },
    max_cost: {
      type: Number,
      default: 0
    },
    sku: {
      type: Number,
      unique: true
    },
    hot_key: String,
    barcode: {
      type: Array,
      default: []
    },
    composite_item: {
      type: Boolean,
      default: false
    },
    is_composite_item: {
      type: Boolean,
      default: false
    },
    composite_items: {
      type: Array,
      default: []
      /**
       *product_id: String,
        product_name: String,
        own_cost: Number,
        quality: Number,
        cost: Number,
        cost_currency: Number
       */
    },
    use_production: {
      type: Boolean,
      default: false
    },
    use_sub_production: {
      type: Boolean,
      default: false
    },
    is_track_stock: {
      type: Boolean,
      default: true
    },
    in_stock: {
      type: Number,
      default: 0
    },
    low_stock: {
      type: Number,
      default: 0
    },
    optimal_stock: {
      type: Number,
      default: 0
    },
    primary_supplier_id: mongoose.Schema.Types.ObjectId,
    primary_supplier_name: String,
    default_purchase_cost: Number,
    purchase_cost_currency: {
      type: String,
      // enum: ['uzs', 'usd'],
      default: 'uzs'
    },
    representation_type: {
      type: String,
      enum: ['color', 'image'],
      default: 'color'
    },
    shape: {
      type: String,
      default: 'circle'
    },
    representation: {
      type: String,
      default: '#4CAF50'
    },
    taxes: {
      type: Array,
      default: []
    },
    stock_status: {
      low_stock: Number,
      out_of_stock: Number
    },
    item_type: {
      type: String,
      enum: ['variant', 'item'],
      default: 'item'
    },
    parent_item: {
      type: String,
    },
    parent_name: {
      type: String
    },
    has_variants: {
      type: Boolean,
      default: false
    },
    variant_options: {
      type: Array,
      default: []
    },
    variant_of: String,
    variant_items: {
      type: Array,
      default: []
    },
    modifiers: {
      type: Array,
      default: []
    },
    workgroups: {
      type: Array,
      default: []
    },
    show_on_bot: {
      type: Boolean,
      default: false
    },
    name_on_bot: String,
    dimentions: {
      x: {
        type: Number,
        default: 0
      },
      y: {
        type: Number,
        default: 0
      },
      z: {
        type: Number,
        default: 0
      }
    },
    weight: Number,
    brand: String,
    description: String,
    mxik: String,
    nds_value: Number,
    marking: { type: Boolean, default: false },
    created_by: String,
    created_by_id: mongoose.Types.ObjectId,
  })
  instance.decorate('goodsSales', goodsSales)

  instance.decorate('deletedGoodsSales', instance.model('deletedGoodsSales', {
    organization: String,
    organization_id: mongoose.Types.ObjectId,
    item_id: String,
    created_by: String,
    created_by_id: mongoose.Types.ObjectId,
    data: Object,
    date: Number
  }))

  const Tickets = instance.model('Tickets', {
    organization: String,
    service: String,
    created_time: Number,
    id: String,
    offline_id: String,
    waiter_name: String,
    waiter_id: String,
    user_id: Number,
    opening_time: Number,
    table_name: String,
    is_self: {
      type: Boolean,
      default: false
    },
    is_closed: Boolean,
    is_receipt_created: {
      type: Boolean,
      default: false
    },
    table_id: String,
    item_data: Array
  })
  instance.decorate('Tickets', Tickets)

  const Item_Data = instance.model('Item_Data', {
    organization: String,
    service: String,
    is_karaoke: {
      type: Boolean,
      default: false
    },
    created_time: {
      type: Number,
      default: 0
    },
    closed_time: {
      type: Number,
      default: 0
    },
    id: String,
    offline_ticket_id: String,
    name: String,
    comment: {
      type: String,
      default: ""
    },
    ticket_id: String,
    is_cancel: {
      type: Boolean,
      default: false
    },
    product_id: String,
    category_id: String,
    price: Number,
    price_currency: String,
    prices: Array,
    discount: Array,
    time: String,
    count: Number,
    selectedVariant: Object,
    selectedModifiers: Array,
    discount: Array,
    total: Number,
    currency: String
  })
  instance.decorate('Item_Data', Item_Data)

  const cancelledItemDatas = instance.model('cancelledItemDatas', {
    organization: String,
    service: String,
    created_time: {
      type: Number,
      default: 0
    },
    name: String,
    comment: {
      type: String,
      default: ""
    },
    product_id: String,
    category_id: String,
    price: Number,
    time: String,
    count: Number,
    waiter_id: String,
    waiter_name: String
  })
  instance.decorate('cancelledItemData', cancelledItemDatas)
  instance.generate('/cancelled_item_data', cancelledItemDatas)

  const goodsCategory = instance.model('goodsCategory', {
    organization: String,
    service: String,
    type: {
      type: String,
      default: 'top'
    },
    item_tree: {
      type: Boolean,
      default: false
    },
    position: {
      type: String,
      default: '0'
    },
    draggable_position: {
      type: Number,
      default: 0
    },
    parent_categories: {
      type: Array,
      default: []
      /**
       * category_id: ObjectId,
       * category_name: String
       */
    },
    created_time: Number,
    name: String,
    color: {
      type: String,
      default: '#2196F3'
    },
    section: String,
    section_id: String,
    is_other: {
      type: Boolean,
      default: false
    },
    count: {
      type: Number,
      default: 0
    },
    services: [{
      available: Boolean,
      service: String,
      service_name: String
    }],
    show_on_bot: {
      type: Boolean,
      default: false
    },
    show_on_bot_services: {
      type: Array,
      default: [],
      _id: false
    },
    present_type: {
      type: String,
      default: 'color'
    }, // color, image,
    image: {
      type: String,
      default: null
    }
  })
  instance.decorate('goodsCategory', goodsCategory)

  const Modifiers = instance.model('Modifiers', {
    organization: String,
    services: [{
      service: mongoose.Schema.Types.ObjectId,
      service_name: String,
      available: {
        type: Boolean,
        default: false
      }
    }],
    name: String,
    options: [{
      option_name: String,
      price: Number
    }]
  })
  instance.decorate('Modifiers', Modifiers)
  instance.generate('/modifiers', Modifiers)

  const goodsSection = instance.model('goodsSection', {
    organization: String,
    service: String,
    created_time: Number,
    name: String,
    color: {
      type: String,
      default: '#2196F3'
    },
    is_other: {
      type: Boolean,
      default: false
    },
    count: {
      type: Number,
      default: 0
    }
  })
  instance.decorate('goodsSection', goodsSection)

  const posDevices = instance.model('posDevices', {
    organization: String,
    service: String,
    service_id: mongoose.Schema.Types.ObjectId,
    name: String,
    is_active: {
      type: Boolean,
      default: false
    },
    check_id: {
      type: String,
      default: 'A'
    },
    status: {
      type: Boolean,
      default: false
    },
    imei: String,
    receipt_no: {
      type: Number,
      default: 0
    },
    back_office: {
      type: Boolean,
      default: false
    }
  })
  instance.decorate('posDevices', posDevices)
  instance.generate('/posdevices', posDevices)

  const goodsDiscount = instance.model('goodsDiscount', {
    organization: String,
    // service: String,
    services: [{
      service: mongoose.Types.ObjectId,
      service_name: String,
      available: {
        type: Boolean,
        default: false,
      },
    }],
    created_time: Number,
    name: String,
    value: Number,
    type: {
      type: String,
      enum: ['percentage', 'sum']
    },
    start_time: Number,
    end_time: Number,
    items: [{
      product_id: mongoose.Types.ObjectId,
      product_name: String,
      sku: Number,
      barcode: {
        type: Array,
        default: []
      },
    }],
  })
  instance.decorate('goodsDiscount', goodsDiscount)

  const goodsDiscountItems = instance.model('goodsDiscountItems', {
    discount_id: mongoose.Types.ObjectId,
    organization: String,
    // service: String,
    services: [{
      service: mongoose.Types.ObjectId,
      service_name: String,
      available: {
        type: Boolean,
        default: false,
      },
    }],
    created_time: Number,
    name: String,
    value: Number,
    type: {
      type: String,
      enum: ['percentage', 'sum']
    },
    start_time: Number,
    end_time: Number,
    product_id: mongoose.Types.ObjectId,
    product_name: String,
    sku: Number,
    barcode: {
      type: Array,
      default: []
    },
  })
  instance.decorate('goodsDiscountItems', goodsDiscountItems)

  const settingsTaxes = instance.model('settingsTaxes', {
    organization: String,
    services: [{
      service: mongoose.Schema.Types.ObjectId,
      service_name: String,
      available: {
        type: Boolean,
        default: false
      }
    }],
    created_time: Number,
    name: String,
    tax: Number,
    variant: {
      type: String,
      enum: ['new', 'exist', 'all', ''],
      default: 'new'
    },
    type: {
      type: String,
      enum: ['include', 'exclude']
    },
    option: Number
  })
  instance.decorate('settingsTaxes', settingsTaxes)

  const fcmNotification = instance.model('fcmnotification', {
    sender_id: String,
    message: String,
    receiver_id: String,
    date: Number,
    message_time: String,
    is_bos: Boolean
  })
  instance.decorate('fcmNotification', fcmNotification)

  const clients = instance.model('clientsDatabase', {
    id: { type: String, default: '' },
    user_id: {
      type: String,
      default: ''
    },
    organization: String,
    first_name: {
      type: String,
      default: ""
    },
    last_name: {
      type: String,
      default: ""
    },
    email: String,
    phone_number: String,
    note: String,
    visit_counter: {
      type: Number,
      default: 0
    },
    total_sale: {
      type: Number,
      default: 0
    },
    sales: {
      type: Number,
      default: 0
    },
    refunds: {
      type: Number,
      default: 0
    },
    first_visit: {
      type: Number,
      default: new Date().getTime()
    },
    last_visit: {
      type: Number,
      default: new Date().getTime()
    },
    point_balance: {
      type: Number,
      default: 0
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'not_set']
    },
    birthday: String,
    debt: Number,
    debt_pay_history: {
      type: Array,
      default: []
    },
    percentage: {
      type: Number,
      default: 1,
    },
    tariff_id: String,
    tariff_name: String,
    is_minimum_price: {
      type: Boolean,
      default: false,
    },
  })
  instance.decorate('clientsDatabase', clients)

  instance.decorate('clientstariffes',
    instance.model('clientstariffes', {
      organization: String,
      percentage: {
        type: Number,
        default: 1,
      },
      name: String,
    })
  )

  const feedback = instance.model('feedback', {
    organization: String,
    service: String,
    created_time: Number,
    table_id: String,
    comment: String,
    username: {
      type: String,
      default: ""
    },
    type: {
      type: String,
      enum: ['good', 'normal', 'bad']
    }
  })
  instance.decorate('feedback', feedback)
  instance.generate('/feedback', feedback, { public_search: true })

  const order_items = instance.model('order_items', {
    organization: String,
    service: String,
    table_id: String,
    order_id: String,
    product_id: String,
    product_name: String,
    price: Number,
    count: Number,
    cost: Number
  })
  instance.decorate('order_items', order_items)
  // instance.generate('/order_items', order_items, { public_search: true })

  const orders = instance.model('orders', {
    organization: String,
    service: String,
    table_id: String,
    table_name: {
      type: String,
      default: 'Table'
    },
    user_id: Number,
    language: {
      type: String,
      default: 'ru'
    },
    phone_number: String,
    id: Number,
    date: Number,
    items: Array,
    total_amount: Number
  })
  instance.decorate('orders', orders)
  // instance.generate('/orders', orders, { public_search: true })

  // timecards

  const timecard = instance.model('timecard', {
    organization: String,
    created_time: Number,
    clock_in: Object,
    clock_out: Object,
    employee_id: mongoose.Schema.Types.ObjectId,
    employee_name: String,
    service: mongoose.Schema.Types.ObjectId,
    service_name: String,
    total_hours: Number
  })
  instance.decorate('timecard', timecard)

  const timecardHistory = instance.model('timecardHistory', {
    timecard_id: String,
    date: Number,
    clock_in: Number,
    clock_out: Number,
    event: {
      type: String,
      enum: ['created', 'clocked_in', 'clocked_out', 'edited']
    }
  })
  instance.decorate('timecardHistory', timecardHistory)


  //** */ inventory models

  // purchase orders

  const inventoryPurchase = instance.model('inventoryPurchase', {
    organization: String,
    partiation_no: String,
    service: mongoose.Schema.Types.ObjectId,
    is_service_changable: {
      type: Boolean,
      default: true
    },
    p_order: String,
    purchase_order_date: Number,
    supplier_id: mongoose.Schema.Types.ObjectId,
    supplier_name: String,
    service_name: String,
    type: {
      type: String,
      enum: ['coming', 'refund'],
      default: 'coming'
    },
    status: {
      type: String,
      enum: ['partially', 'pending', 'closed'],
      default: 'pending'
    },
    received: {
      type: Number,
      default: 0
    },
    expected_on: Number,
    total: Number,
    total_currency: {
      type: String,
      enum: ['uzs', 'usd'],
      default: 'uzs'
    },
    notes: String,
    total_count: {
      type: Number,
      default: 0
    },
    pricing_status: {
      type: Boolean,
      default: false
    },
    last_pricing_date: Number,
    additional_cost: [
      {
        name: String,
        amount: Number,
        amount_currency: {
          type: String,
          default: 'uzs'
        },
        is_received: {
          type: Boolean,
          default: false
        },
        is_cancelled: {
          type: Boolean,
          default: false
        }
      }
    ],
    ordered_by_id: mongoose.Schema.Types.ObjectId,
    ordered_by_name: String,
    items: Array
  })

  instance.decorate('inventoryPurchase', inventoryPurchase)

  // purchase items

  const purchaseItem = instance.model('purchaseItem', {
    organization: String,
    service: mongoose.Schema.Types.ObjectId,
    purchase_id: mongoose.Schema.Types.ObjectId,
    product_id: mongoose.Schema.Types.ObjectId,
    product_name: String,
    sku: Number,
    price: Number,
    cost: Number,
    barcode: {
      type: Array,
      default: []
    },
    ordered: Number,
    received: {
      type: Number,
      default: 0
    },
    cancelled: {
      type: Number,
      default: 0
    },
    is_cancelled: {
      type: Boolean,
      default: false
    },
    incoming: {
      type: Number,
      default: 0
    },
    to_receive: {
      type: Number,
      default: 0
    },
    quality: {
      type: Number,
      default: 0
    },
    purchase_cost: {
      type: Number,
      default: 0
    },
    purchase_cost_currency: {
      type: String,
      default: 'uzs'
    },
    amount: Number
  })
  instance.decorate('purchaseItem', purchaseItem)

  // inventory suppliers
  // @index({ organization:1, phone_number:true },{ background:true, unique: true })
  const adjustmentSupplier = instance.model('adjustmentSupplier', {
    is_deleted: { type: Boolean, default: false },
    organization: String,
    supplier_name: String,
    contact: String,
    email: String,
    phone_number: String,
    website: String,
    address_first: String,
    address_second: String,
    city: String,
    zip_code: String,
    country: Object,
    region_state_province: String,
    note: String,
    services: [{
      service: mongoose.Schema.Types.ObjectId,
      service_name: String,
      balance: {
        type: Number,
        default: 0
      },
      balance_usd: {
        type: Number,
        default: 0
      },
      balance_currency: {
        type: String,
        default: 'uzs'
      },
      available: {
        type: Boolean,
        default: true
      },
      telegram_acces: {
        type: Boolean,
        default: false
      },
    }],
    balance: {
      type: Number,
      default: 0
    },
    balance_usd: {
      type: Number,
      default: 0
    },
    balance_currency: {
      type: String,
      default: 'uzs'
    },
    telegram_acces: {
      type: Boolean,
      default: false
    },
  })
  instance.decorate('adjustmentSupplier', adjustmentSupplier)
  instance.generate('/supplier', adjustmentSupplier)

  instance.decorate('supplierTransaction', instance.model('supplierTransaction', {
    supplier_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'adjustmentsuppliers'
    },
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'inoneservices'
    },
    service_name: {
      type: String
    },
    document_id: String,
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users'
    },
    employee_name: String,
    currency: {
      type: String,
      default: 'uzs'
    },
    status: {
      type: String,
      enum: ['active', 'pending']
    },
    balance_type: {
      type: String,
      enum: ['cash', 'card'],
      default: 'cash'
    },
    balance: Number,
    date: Number,
    purchase_id: String
  }))

  const Production = instance.model('Production', {
    organization: String,
    service: mongoose.Schema.Types.ObjectId,
    service_name: String,
    employee: mongoose.Schema.Types.ObjectId,
    employee_name: String,
    notes: String,
    created_time: Number,
    p_order: String,
    date: String,
    type: {
      type: String,
      enum: ['disassembly', 'production']
    },
    quality: {
      type: Number,
      default: 0
    },
    created_by_id: mongoose.Schema.Types.ObjectId,
    created_by: String,
    items: [{
      product_id: mongoose.Schema.Types.ObjectId,
      product_name: String,
      product_sku: Number,
      sku: Number,
      barcode: {
        type: Array,
        default: []
      },
      cost: Number,
      cost_currency: {
        type: String,
        enum: ['usd', 'uzs'],
        default: 'uzs'
      },
      quality: Number,
      price: Number,
    }]
  })
  instance.decorate('Production', Production)

  const Transfer = instance.model('Transfer', {
    organization: String,
    first_service: mongoose.Schema.Types.ObjectId,
    second_service: mongoose.Schema.Types.ObjectId,
    first_service_name: String,
    second_service_name: String,
    ordered_by_id: mongoose.Schema.Types.ObjectId,
    ordered_by_name: String,
    p_order: String,
    date: Number,
    notes: String,
    status: {
      type: String,
      enum: ['in_transit', 'transferred']
    },
    quality: {
      type: Number,
      default: 0
    },
    total: Number,
    items: [{
      product_id: mongoose.Schema.Types.ObjectId,
      product_name: String,
      product_sku: Number,
      sku: Number,
      price: Number,
      first_stock: {
        type: Number,
        default: 0
      },
      cost: {
        type: Number,
        default: 0
      },
      barcode: {
        type: Array,
        default: []
      },
      second_stock: {
        type: Number,
        default: 0
      },
      quality: Number,
    }]
  })
  instance.decorate('Transfer', Transfer)

  // inventory count

  const inventoryCount = instance.model('inventoryCount', {
    organization: String,
    service: mongoose.Schema.Types.ObjectId,
    service_name: String,
    notes: {
      type: String,
      default: '--'
    },
    p_order: String,
    type: {
      type: String,
      enum: ['partial', 'full']
    },
    created_time: Number,
    closed_time: Number,
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed']
    },
    created_by_id: mongoose.Schema.Types.ObjectId,
    created_by: String,
    total_difference: Number,
    total_cost_difference: Number,
    cost_currency: {
      type: String,
      enum: ['uzs', 'usd'],
      default: 'uzs'
    }
  })
  instance.decorate('inventoryCount', inventoryCount)

  const inventoryCountHistory = instance.model('inventoryCountHistory', {
    count_id: String,
    product_id: mongoose.Schema.Types.ObjectId,
    product_name: String,
    value: Number
  })
  instance.decorate('inventoryCountHistory', inventoryCountHistory)

  // inventory count items

  const inventoryCountItem = instance.model('inventoryCountItem', {
    organization: String,
    service: mongoose.Schema.Types.ObjectId,
    count_id: mongoose.Schema.Types.ObjectId,
    product_id: mongoose.Schema.Types.ObjectId,
    barcode: {
      type: Array,
      default: []
    },
    product_name: String,
    sku: Number,
    exp_in_stock: Number,
    cost: Number,
    cost_currency: {
      type: String,
      enum: ['uzs', 'usd'],
      default: 'uzs'
    },
    counted: Number,
    difference: Number,
    cost_difference: Number
  })
  instance.decorate('inventoryCountItem', inventoryCountItem)

  // stock adjustment

  const stockAdjustment = instance.model('stockAdjustment', {
    organization: String,
    p_order: String,
    service: mongoose.Schema.Types.ObjectId,
    service_name: String,
    quality: Number,
    adjusted_by: String,
    adjusted_by_id: mongoose.Schema.Types.ObjectId,
    date: Number,
    notes: String,
    reason: {
      type: String,
      enum: ['receive', 'recount', 'loss', 'damage', 'fee']
    }
  })
  instance.decorate('stockAdjustment', stockAdjustment)

  const stockAdjustmentItems = instance.model('stockAdjustmentItems', {
    stock_adjustment_id: mongoose.Schema.Types.ObjectId,
    category_id: String,
    category_name: String,
    product_id: mongoose.Schema.Types.ObjectId,
    product_name: String,
    sku: Number,
    price: Number,
    changed: Number,
    in_stock: Number,
    add_stock: Number,
    cost: Number,
    next_cost: Number,
    cost_currency: {
      type: String,
      enum: ['uzs', 'usd'],
      default: 'uzs'
    },
    counted_stock: Number,
    remove_stock: Number,
    stock_after: Number
  })
  instance.decorate('stockAdjustmentItems', stockAdjustmentItems)

  // inventory history

  const inventoryHistory = instance.model('inventoryHistory', {
    organization: String,
    date: Number,
    unique: String,
    category_id: String,
    category_name: String,
    product_id: mongoose.Schema.Types.ObjectId,
    product_name: String,
    cost: {
      type: Number,
      default: 0
    },
    service: mongoose.Schema.Types.ObjectId,
    service_name: String,
    employee_id: mongoose.Schema.Types.ObjectId,
    employee_name: String,
    reason: {
      type: String,
      enum: [
        'sold', 'returned', 'received', 'received.', 'receivedd',
        'returned_order', 'transferred',
        'recounted', 'damaged', 'lost',
        'item edit', 'production',
        'workgroup_order', 'fee', 'loss',
      ]
    },
    type: {
      type: String,
      enum: ['item', 'box_item'],
      default: 'item'
    },
    adjustment: Number,
    stock_after: Number
  })
  instance.decorate('inventoryHistory', inventoryHistory)

  const itemPriceChangeHistory = instance.model('itemPriceChangeHistory', {
    organization: String,
    service: mongoose.Schema.Types.ObjectId,
    service_name: String,
    date: Number,
    product_id: mongoose.Schema.Types.ObjectId,
    product_name: String,
    old_price: Number,
    new_price: Number,
    old_prices: Array,
    new_prices: Array,
    employee_id: mongoose.Schema.Types.ObjectId,
    employee_name: String,
    type: {
      type: String,
      enum: ['price', 'prices']
    }
  })
  instance.decorate('itemPriceChangeHistory', itemPriceChangeHistory)

  // History of edited item
  const itemEditHistory = instance.model('itemEditHistory', {
    organization: String,
    date: Number,
    product_id: mongoose.Schema.Types.ObjectId,
    product_name: String,
    service: mongoose.Schema.Types.ObjectId,
    service_name: String,
    employee_id: mongoose.Schema.Types.ObjectId,
    employee_name: String,
    reason: {
      type: String,
      enum: ['name', 'category', 'price', 'sku']
    },
    old_value: String,
    new_value: String
  })
  instance.decorate('itemEditHistory', itemEditHistory)

  // User Model

  const User = instance.model('User', {
    organization: String,
    organization_name: {
      type: String
    },
    timezone: String,
    ui_language: {
      type: Object,
      default: {
        text: "English",
        value: 'en'
      }
    },
    services: [{
      service: mongoose.Schema.Types.ObjectId,
      service_name: String,
      available: {
        type: Boolean,
        default: false
      }
    }],
    is_boss: {
      type: Boolean,
      default: false
    },
    service: {
      type: String,
      default: ""
    },
    is_active: {
      type: Boolean,
      default: true
    },
    percentage: {
      type: Number,
      default: 0
    },
    is_password: {
      type: Boolean,
      default: false
    },
    password: {
      type: String,
      default: '1111'
    },
    super_password: {
      type: String
    },
    role: {
      type: String,
      default: 'cashier'
    },
    full_name: {
      type: String,
      default: ""
    },
    name: {
      type: String,
      default: ''
    },
    email: {
      type: String,
      default: ""
    },
    last_name: {
      type: String,
      default: ""
    },
    is_phone_number: {
      type: Boolean,
      default: true
    },
    phone_number: String,
    token: {
      type: String,
      default: ""
    },
    boss_token: {
      type: String,
      default: "Unchanged"
    },
    admin_token: String,
    employee_token: {
      type: String,
      default: 'Unchanged'
    },
    fire_token: {
      type: String,
      default: ""
    },
    boss_fire_token: {
      type: String,
      default: ""
    },
    employee_fire_token: {
      type: String,
      default: ""
    },
    image_url: {
      type: String,
      default: ''
    },
    workgroup_id: mongoose.Schema.Types.ObjectId,
    workgroup_name: String,
    workgroup_token: String,
  })
  instance.decorate('User', User)

  const boolean = {
    type: Boolean,
    default: false
  }

  const AccessRights = instance.model('AccessRights', {
    organization: String,
    name: String,
    is_bos: boolean,
    pos: boolean,
    close_ticket: boolean,
    wharehouse_manager: boolean,
    can_sell: { type: Boolean, default: true },
    print_pre_check: boolean,
    receipt_save_as_draft: boolean,
    can_change_price: boolean,
    refund: boolean,
    show_all_receipts: boolean,
    pay_debt: boolean,
    show_shift_history: boolean,
    apply_discount: boolean,
    change_settings: boolean,
    edit_items: boolean,
    edit_ticket: boolean,
    split_ticket: boolean,
    change_waiter: boolean,
    delete_ticket: boolean,
    show_all_tickets: boolean,
    can_access_to_shift: boolean,
    back_office: boolean,
    //create roles
    create: boolean,
    create_purchase: boolean,
    create_mark: boolean,
    create_taxes: boolean,
    create_store: boolean,
    create_pos_device: boolean,
    create_customer: boolean,
    create_employee: boolean,
    create_access: boolean,
    create_time_card: boolean,
    create_transfer: boolean,
    create_stock_adjustmen: boolean,
    create_inv_count: boolean,
    create_production: boolean,
    create_supplier: boolean,
    create_supplier_create_doc: boolean,
    create_fee: boolean,
    create_good_sale: boolean,
    create_good_category: boolean,
    create_modifier: boolean,
    create_discount: boolean,
    create_reciept: boolean,
    // reports
    reports: boolean,
    report_sale: boolean,
    report_accaunt: boolean,
    report_abs: boolean,
    report_sale_by_item: boolean,
    report_sale_by_category: boolean,
    report_sale_by_supplier: boolean,
    report_employee: boolean,
    report_sale_by_payment: boolean,
    report_receipt: boolean,
    report_debt: boolean,
    report_discount: boolean,
    report_taxes: boolean,
    report_shift: boolean,
    material_report: boolean,
    //items
    items: boolean,
    item_edit: boolean,
    item_list: boolean,
    item_mark: boolean,
    item_mark_edit: boolean,
    item_mxik_search: boolean,
    item_composite_item: boolean,
    item_add_from_warehause: boolean,
    item_print_label: boolean,
    item_price_change_history: boolean,
    item_categories: boolean,
    item_modifiers: boolean,
    item_discount: boolean,
    //employees
    employees: boolean,
    employee_list: boolean,
    employee_list_add: boolean,
    employee_list_del: boolean,
    employee_access_rights: boolean,
    employee_access_rights_add: boolean,
    employee_access_rights_del: boolean,
    employee_time_cards: boolean,
    employee_total_worked: boolean,
    customers: boolean,
    //settings
    settings: boolean,
    setting_general: boolean,
    setting_organization: boolean,
    setting_nds: boolean,
    setting_payment_types: boolean,
    setting_currency: boolean,
    setting_loyalty: boolean,
    setting_taxes: boolean,
    setting_receipt: boolean,
    setting_open_tickets: boolean,
    setting_buttons: boolean,
    setting_options: boolean,
    setting_stores: boolean,
    setting_pos_devices: boolean,
    edit_profile: boolean,
    set_the_taxes: boolean,
    manage_pos_devices: boolean,
    can_delete_item: boolean,
    // inventory
    inventory: boolean,
    inv_purchase_orders: boolean,
    inv_purchase_mark: boolean,
    inv_purchase_orders_cost: boolean,
    inv_transfer_orders: boolean,
    inv_stock_adjusment: boolean,
    inv_stock_adjusment_cost: boolean,
    inv_inventory_counts: boolean,
    inv_productions: boolean,
    inv_productions_cost: boolean,
    inv_suppliers: boolean,
    inv_supplier_delete: boolean,
    inv_supplier_valuation: boolean,
    inv_supplier_transaction: boolean,
    inv_supplier_transaction_corrector: boolean,
    inv_fees: boolean,
    inv_inventory_history: boolean,
    inv_inventory_valuation: boolean,
    workgroup: boolean,
    workgroup_edit_cost: boolean,
  })

  instance.decorate('AccessRights', AccessRights)

  // general setting features

  const settingFeatures = instance.model('settingFeatures', {
    organization: String,
    opened_receipts: {
      type: Boolean,
      default: false
    },
    debts: {
      type: Boolean,
      default: false
    },
    shifts: {
      type: Boolean,
      default: true
    },
    prices: {
      type: Boolean,
      default: false
    },
    nds: {
      type: Boolean,
      default: false
    },
    add_from_warehause: {
      type: Boolean,
      default: false
    },
    show_stock: {
      type: Boolean,
      default: false
    },
    orders: {
      type: Boolean,
      default: false
    },
    chat: {
      type: Boolean,
      default: false
    },
    open_tickets: {
      type: Boolean,
      default: false
    },
    time_clock: {
      type: Boolean,
      default: false
    },
    karaoke: {
      type: Boolean,
      default: false
    },
    scale: {
      type: Boolean,
      default: false
    },
    section: {
      type: Boolean,
      default: false
    },
    inventory: {
      type: Boolean,
      default: false
    },
    is_local_server: {
      type: Boolean,
      default: false
    },
    use_purchase_cost_on_pricing: {
      type: Boolean,
      default: false
    },
    client_debt_by_category: {
      type: Boolean,
      default: false
    },
    delivery: {
      type: Boolean,
      default: false
    }
  })
  instance.decorate('settingFeatures', settingFeatures)

  /// for push notification

  const pushObj = instance.model('pushObj', {
    unique: String,
    service: String,
    code: Number,
    last_time: Number
  })
  instance.decorate('pushObj', pushObj)

  // for tables

  // for summary table

  const summaryTable = instance.model('summary_table', {
    organization: String,
    date: {
      type: Boolean,
      default: true
    },
    gross_sales: {
      type: Boolean,
      default: true
    },
    refunds: {
      type: Boolean,
      default: true
    },
    discounts: {
      type: Boolean,
      default: true
    },
    net_sales: {
      type: Boolean,
      default: true
    },
    taxes: {
      type: Boolean,
      default: true
    },
    cost_of_goods: {
      type: Boolean,
      default: true
    },
    gross_profit: {
      type: Boolean,
      default: true
    }
  })
  instance.decorate('summaryTable', summaryTable)

  // for by item

  const by_itemTable = instance.model('by_item_table', {
    organization: String,
    name: {
      type: Boolean,
      default: true
    },
    category: {
      type: Boolean,
      default: true
    },
    gross_sales: {
      type: Boolean,
      default: true
    },
    gross_profit: {
      type: Boolean,
      default: true
    },
    refund: {
      type: Boolean,
      default: true
    },
    sales: {
      type: Boolean,
      default: true
    },
    net_sales: {
      type: Boolean,
      default: true
    },
    refunds: {
      type: Boolean,
      default: true
    }
  })
  instance.decorate('by_itemTable', by_itemTable)

  // for by catergory

  const by_categoryTable = instance.model('by_category_table', {
    organization: String,
    name: {
      type: Boolean,
      default: true
    },
    sales: {
      type: Boolean,
      default: true
    },
    gross_sales: {
      type: Boolean,
      default: true
    },
    refund: {
      type: Boolean,
      default: true
    },
    refunds: {
      type: Boolean,
      default: true
    },
    discounts: {
      type: Boolean,
      default: true
    },
    net_sales: {
      type: Boolean,
      default: true
    },
    cost_of_goods: {
      type: Boolean,
      default: true
    },
    gross_profit: {
      type: Boolean,
      default: true
    }
  })
  instance.decorate('by_categoryTable', by_categoryTable)

  // sms code url

  const urlSms = instance.model('url_sms', {
    url: String
  })
  instance.decorate('url_sms', urlSms)

  // subscribe employee and inventory

  const subscribtion = instance.model('subscribtion', {
    organization: String,
    employee_subscribed: {
      type: Boolean,
      default: false
    },
    employee_end_date: Number,
    inventory_subscribed: {
      type: Boolean,
      default: false
    },
    inventory_end_date: Number
  })
  instance.decorate('subscribtion', subscribtion)

  instance.decorate('desktopFeedback',
    instance.model('desktopFeedback', {
      organization: String,
      file_path: String,
      comment: String,
      device_info: String,
      send_to_channel: {
        type: Boolean,
        default: false
      },
      createdAt: Number,
      updatedAt: Number
    })
  )

  instance.decorate('Currency',
    instance.model('Currency', {
      organization: {
        type: String,
        unique: true
      },
      value: Number,
      currency: {
        type: String,
        enum: ['usd', 'uzs'],
        default: 'uzs'
      },
      number_of_zero: {
        type: Number,
        default: 2
      }
    })
  )

  instance.decorate('settingReceipt',
    instance.model('settingReceipt', {
      organization: String,
      service: {
        type: String,
        unique: true
      },
      emailed_receipt: {
        type: String,
        default: ''
      },
      printed_receipt: {
        type: String,
        default: ''
      },
      header: {
        type: String,
        default: ''
      },
      footer: {
        type: String,
        default: ''
      },
      show_customer_info: {
        type: Boolean,
        default: false
      },
      show_comments: {
        type: Boolean,
        default: false
      }
    })
  )

  instance.decorate(
    'outdatedPrices',
    instance.model(
      'outdatedPrices',
      {
        organization: String,
        service: String,
        date: Number,
        indexes: [mongoose.Schema.Types.ObjectId]
      }
    )
  )

  const WorkgroupOrderInformation = instance.model('WorkgroupOrderInformation', {
    organization: String,
    workgroup_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'workgroups'
    },
    workgroup_order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'workgrouporders'
    },
    info_list: {
      type: Array,
      default: []
    }
  })
  instance.decorate('WorkgroupOrderInformation', WorkgroupOrderInformation)

  const WorkgroupDeviceInformation = instance.model('WorkgroupDeviceInformation', {
    organization: String,
    workgroup_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'workgroups'
    },
    workgroup_order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'workgrouporders'
    },
    info_list: {
      type: Array,
      default: []
    }
  })
  instance.decorate('WorkgroupDeviceInformation', WorkgroupDeviceInformation)

  const WorkgroupAdditionalInformation = instance.model('WorkgroupAdditionalInformation', {
    organization: String,
    workgroup_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'workgroups'
    },
    workgroup_order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'workgrouporders'
    },
    info_list: {
      type: Array,
      default: []
    }
  })
  instance.decorate('WorkgroupAdditionalInformation', WorkgroupAdditionalInformation)

  const FeeOptions = instance.model('FeeOptions', {
    organization: String,
    name: String
  })
  instance.decorate('FeeOptions', FeeOptions)

  const History = instance.model('inv_files_to_download', {
    reason: String,
    product_name: String,
    adjustment: Number,
    stock_after: Number,
    employee_name: String,
    date: Number,
  });
  instance.decorate('invFilesToDownload', History);
  // instance
  const soliqgoodsSchema = instance.model('soliqgood', {
    mxik: String,
    group_name_uz: String,
    group_name_ru: String,
    class_name_uz: String,
    class_name_ru: String,
    position_uz: String,
    position_ru: String,
    sub_position_uz: String,
    sub_position_ru: String,
    brand: String,
    attribute_uz: String,
    attribute_ru: String,
    barcode: String,
    unit: String,
    unit_of_pack: String,
  });
  instance.decorate('soliqgoods', soliqgoodsSchema);

  const employeesOrdersSchema = instance.model('employeesorder', {
    organization_id: mongoose.Types.ObjectId,
    organization_name: String,
    service_id: mongoose.Types.ObjectId,
    service_name: String,
    p_order: String,
    employee_id: mongoose.Types.ObjectId,
    employee_name: String,
    accept_by_id: mongoose.Types.ObjectId,
    accept_by_name: String,
    note: { type: String, default: '' },
    status: {
      type: String,
      enum: ['pending', 'accept'],
    },
    date: Number,
    required_date: Number,
    accept_date: Number,
    sector_name: String,
    items: [{
      product_id: mongoose.Schema.Types.ObjectId,
      product_name: String,
      product_sku: Number,
      supplier_id: mongoose.Types.ObjectId,
      sector_name: String,
      date: Number,
      in_stock: {
        type: Number,
        default: 0
      },
      real_stock: Number,
      barcode: {
        type: Array,
        default: []
      },
      order_quantity: Number,
      note: String,
      is_accept: { type: Boolean, default: false },
    }]
  });
  instance.decorate('employeesOrder', employeesOrdersSchema);

  const invanGoodsOtchotSchema = instance.model('goodsotchot', {
    organization: String,
    month: { type: String },
    month_name: { type: String },
    start_time: Number,
    end_time: Number,
    sku: Number,
    product_id: mongoose.Types.ObjectId,
    product_name: String,
    category_id: { type: mongoose.Schema.Types.ObjectId },
    category_name: String,
    sold_by: {
      type: String,
      enum: [
        'each',
        'weight',
        // 'list',
        // 'karaoke',
        'pcs',
        'box',
        'litre',
        'metre'
      ],
      default: 'each'
    },
    count_by_type: { type: Number, default: 0 },
    barcode_by_type: String,
    barcode: { type: Array, default: [] },
    mxik: String,
    services: [{
      service_id: { type: mongoose.Schema.Types.ObjectId },
      service_name: { type: String },
      available: { type: Boolean },
      price: { type: Number, default: 0 },
      cost: { type: Number, default: 0 },
      stock_monthly: {
        start_stock: { type: Number, default: 0 },
        end_stock: { type: Number, default: 0 },
        cost: { type: Number },
        price: { type: Number, default: 0 },
        prices: {
          type: Array,
          default: [],
        },
      },
      sale_monthly_info: {
        count: { type: Number, default: 0 },
        cost_amount: { type: Number, default: 0 },
        sale_amount: { type: Number, default: 0 },
      },
      purchase_monthly_info: {
        count: { type: Number, default: 0 },
        amount: { type: Number, default: 0 },
      },
    }],
  })
  instance.decorate('goodsOtchot', invanGoodsOtchotSchema);

  next()
})
