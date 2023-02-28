
module.exports = (instance, _, next) => {
   instance.generate('/settings/profile', instance.model('settingsProfile', {
      organization: String,
      service: String,
      email: String,
      business_name: String,
      timezone: String,
      ui_language: String,
      features: {
         shifts: Boolean,
         section: {
            type: Boolean,
            default: false
         },
         time_clock: Boolean,
         show_stock: Boolean,
         open_tickets: Boolean,
         kitchen_printers: Boolean,
         customer_displays: Boolean,
         dining_options: Boolean,
         low_stock_notifications: Boolean,
         negative_stock_alerts: Boolean
      }
   }))

   instance.generate('/settings/paytypes', instance.model('settingsPaytypes', {
      organization: String,
      service: String,
      payment_type: String,
      name: String
   }))

   instance.generate('/settings/loyalty', instance.model('settingsLoyalty', {
      organization: String,
      service: String,
      loyalty_type: {
         type: String,
         default: 'Bonus system'
      },
      amount: Number
   }))


   instance.generate('/settings/tax', instance.settingsTaxes)


   instance.generate('/settings/reciepts', instance.model('settingsReciepts', {
      organization: String,
      service: String,
      logo: {
         emailed: String,
         printed: String
      },
      header: String,
      footer: String,
      show_customer_info: Boolean,
      show_comments: Boolean,
      language: String
   }))

   instance.generate('/settings/reciepts/languages', instance.model('settingsRecieptsLanguage', {
      name: String
   }))

   instance.generate('/settings/outlets', instance.model('settingsOutlets', {
      organization: String,
      service: String,
      name: String,
      address: String,
      phone_number: String,
      description: String
   }))

   instance.generate('/settings/cashregister', instance.model('settingsCashregister', {
      organization: String,
      service: String,
      name: String
   }))

   instance.generate('/settings/printer', instance.model('printer', {
      organization: String,
      service: String,
      pos_id: String,
      id: Number,
      name: String,
      address: String,
      type: Number,
      print_receipt: {
         type: Boolean,
         default: false
      },
      auto_print_receipt: {
         type: Boolean,
         default: false
      },
      print_cashier: {
         type: Boolean,
         default: false
      },
      turn_on_cyrillic: {
         type: Boolean,
         default: false
      },
      beep_on: {
         type: Boolean,
         default: false
      },
      print_barcode: {
         type: Boolean,
         default: false
      },
      print_logo: {
         type: Boolean,
         default: false
      },
      smena: {
         type: Boolean,
         default: false
      },
      print_text: {
         type: Boolean,
         default: false
      },
      sections: Array,
      model: {
         type: String,
         // enum: ['xprinter80', 'xprinter58', 'xprinter76', 'sunmit2', 'pda5501', 'sam4s']
      },
      isQuick: {
         type: String
      }
   }))

   instance.generate('/settings/scale', instance.model('scale', {
      organization: String,
      service: String,
      id: String,
      ssid: String,
      password: String
   }))

   next()
}