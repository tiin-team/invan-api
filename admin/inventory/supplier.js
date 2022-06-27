
module.exports = (instance, options, next) => {

  // get supplier by id

  instance.get('/inventory/get_supplier/:id', options.version, (request, reply) => {
    instance.oauth_admin(request, reply, async (admin) => {
      try {
        const limit = !isNaN(request.query.limit) ? request.query.limit : 10;
        const page = !isNaN(request.query.page) ? request.query.page : 1;
        const { service } = request.query

        const supp = await instance.adjustmentSupplier
          .findOne({ _id: request.params.id })
          .lean();

        if (!supp) return reply.fourorfour('Supplier')

        const user_available_services = request.user.services.map(serv => serv.service);

        const query = {
          supplier_id: supp._id,
          status: { $ne: 'pending' },
          service: { $in: user_available_services },
        };
        if (service) {
          if (!user_available_services.find(serv => serv + '' === service))
            return reply.code(403).send('Forbidden service')

          query.service = instance.ObjectId(service);
        }

        const transactions = await instance.supplierTransaction.find(query).lean();

        // for (const [indexTran, tranItem] of transactions.entries()) {
        //   if (tranItem.document_id[0] == 'P' && (tranItem.document_id[1] == 0 || tranItem.document_id[1] == 1))
        //     await instance.supplierTransaction.findByIdAndUpdate(tranItem._id, {
        //       balance: -Math.abs(tranItem.balance)
        //     })
        // }

        // for (const [index, item] of transactions.entries()) {
        //   invent = await instance.inventoryPurchase.findOne({ _id: item.purchase_id }).lean()
        //   if (invent) {
        //     blnc = item.balance
        //     if (invent.type == 'coming')
        //       blnc = -Math.abs(item.balance)
        //     if (invent.type == 'refund')
        //       blnc = Math.abs(item.balance)
        //     await instance.supplierTransaction.findByIdAndUpdate(item._id, { balance: blnc })
        //   }
        // }

        let data = transactions
        allSum = 0
        const getFloat = num => isNaN(parseFloat(num)) ? 0 : parseFloat(num)

        //kerak emas
        // let data = transactions.filter(element => element.status != 'pending')
        // delete query.status
        // query.organization = supp.organization
        const purChase = await instance.inventoryPurchase.find(query).lean();

        for (let i = 0; i < transactions.length; i++) {
          allSum += transactions[i].status == 'pending'
            ? 0
            : getFloat(transactions[i].balance)
        }

        // .find({ supplier_id: supp._id, organization: supp.organization })

        for (const [index, item] of purChase.entries()) {
          // if (!data.find(x => x.document_id == item.p_order)) {
          if (!data.find(x => x.document_id == item.p_order) && item.status != 'pending') {
            if (item.type == 'coming')
              allSum -= getFloat(item.total)
            else if (item.type == 'refund')
              allSum += getFloat(item.total)

            data.push({
              // _id: "61ac9418a914c3ba42f9e877",
              balance: item.type == 'coming'
                ? -1 * item.total
                : item.type == 'refund'
                  ? getFloat(item.total)
                  : getFloat(item.total),
              balance_type: "cash",
              currency: item.total_currency,
              date: item.purchase_order_date,
              document_id: item.p_order,
              purchase_id: item._id,
              // employee: item.organization"5f5c7d286786602b6cf1dc7a",
              employee_name: item.ordered_by_name,
              status: item.type,
              supplier_id: item.supplier_id,
              item
            })
          }
        }

        // const getFloat = num => isNaN(parseFloat(num)) ? 0 : parseFloat(num)
        // const allSum = data.reduce((accum, item) => getFloat(accum) + getFloat(item.balance), 0)
        // const allSum = data.reduce((accum, item) => {
        //   return item.status == 'pending' ? 0 : getFloat(accum) + getFloat(item.balance)
        // })
        // allSum = 0
        // for (let i = 0; i < data.length; i++) {
        //   allSum += data[i].status == 'pending' ? 0 : getFloat(data[i].balance)
        // }
        // const allSum = data.reduce((accum, item) => item.status == 'active' ? (getFloat(accum) + getFloat(item.balance)) : 0, 0)

        data.sort(((a, b) => b.date - a.date))
        const total = data.length;

        supp.transactions = data.slice((page - 1) * limit, limit * page);
        // supp.transactions = transactions;
        // Calculate supplier balance
        // const $match = { $match: { supplier_id: supp._id } }
        // const $group = { $group: { _id: null, balance: { $sum: '$balance' } } }

        // const result = await instance.supplierTransaction.aggregate([$match, $group]);
        // const balance = result.length ? result[0].balance : 0;
        reply.ok({
          ...supp,
          // balance,
          saved_balance: allSum,
          total: total,
          page: Math.ceil(total / limit),
          current_page: page,
          limit: limit,
        })
      }
      catch (error) {
        instance.send_Error("get Supplier /:id", JSON.stringify(error))
        return reply.fourorfour('Supplier')
      }
    })
  })
  /*
    const getFloat = num => isNaN(parseFloat(num)) ? 0 : parseFloat(num)
   
  instance.get('/inventory/get_supplier/:id', options.version, (request, reply) => {
    instance.oauth_admin(request, reply, async (admin) => {
      try {
        const supp = await instance.adjustmentSupplier
          .findOne({ _id: request.params.id })
          .lean();
        if (!supp) return reply.fourorfour('Supplier')
   
        const query = { supplier_id: supp._id, status: { $ne: 'pending' } };
        // if (request.query.service) query.service = request.query.service;
        // else query.service = { $in: request.user.services.map(elem => elem.service) };
   
        const purChase = await instance.inventoryPurchase.find(query).lean();
        const data = purChase.map(elem => {
          return {
            balance: elem.total,
            balance_type: "cash",
            currency: elem.total_currency,
            date: elem.purchase_order_date,
            document_id: elem.p_order,
            purchase_id: elem._id,
            employee_name: elem.ordered_by_name,
            status: elem.status,
            supplier_id: elem.supplier_id,
            elem,
          }
        })
   
        const transactions = await instance.supplierTransaction.find(query).lean();
        for (const [index, item] of transactions.entries()) {
          if (!data.find(x => x.p_order == item.document_id) && item.status != 'pending') {
            if (item.status == 'coming')
              allSum -= getFloat(item.balance)
            else if (item.status == 'refund')
              allSum += getFloat(item.balance)
   
            data.push({
              // _id: "61ac9418a914c3ba42f9e877",
              balance: item.status == 'coming'
                ? -1 * item.balance
                : getFloat(item.balance),
              balance_type: "cash",
              currency: item.currency,
              date: item.date,
              document_id: item.document_id,
              purchase_id: item.purchase_id,
              // employee: item.organization"5f5c7d286786602b6cf1dc7a",
              employee_name: item.employee_name,
              status: item.status,
              supplier_id: item.supplier_id,
              item
            })
          }
        }
   
        for (const [index, item] of purChase.entries()) {
          invent = await instance.inventoryPurchase.findOne({ _id: item.purchase_id }).lean()
          if (invent) {
            blnc = item.balance
            if (invent.type == 'coming')
              blnc = -Math.abs(item.balance)
            if (invent.type == 'refund')
              blnc = Math.abs(item.balance)
            await instance.supplierTransaction.findByIdAndUpdate(item._id, { balance: blnc })
          }
        }
   
        allSum = 0
   
        for (let i = 0; i < data.length; i++) {
          allSum += data[i].status == 'pending' ? 0 : getFloat(data[i].balance)
        }
   
        data.sort(((a, b) => a.date - b.date))
        supp.transactions = data;
        //       supp.transactions = transactions;
        // Calculate supplier balance
        const $match = { $match: { supplier_id: supp._id } }
        const $group = { $group: { _id: null, balance: { $sum: '$balance' } } }
   
        const result = await instance.supplierTransaction.aggregate([$match, $group]);
        const balance = result.length ? result[0].balance : 0;
        reply.ok({
          ...supp,
          balance,
          saved_balance: allSum
        })
      }
      catch (error) {
        return reply.fourorfour('Supplier')
      }
    })
  })
  */
  // get suppliers

  const get_suppliers = async (request, reply, admin) => {
    const page = parseInt(request.params.page)
    const limit = parseInt(request.params.limit)

    if (request.body == undefined) { request.body = {} }

    let supplier_name = request.body.supplier_name
    if (typeof supplier_name != typeof 'invan') {
      supplier_name = ''
    }
    const query = {
      is_deleted: { $ne: true },
      organization: admin.organization,
      $or: [
        { supplier_name: { $regex: supplier_name, $options: 'i' } },
        { supplier_name: { $regex: instance.converter(supplier_name), $options: 'i' } }
      ]
    }

    const total = await instance.adjustmentSupplier.countDocuments(query)
    if (page) {
      const suppliers = await instance.adjustmentSupplier
        .find(query)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()

      return reply.ok({
        total: total,
        page: Math.ceil(total / limit),
        data: suppliers
      })
    } else {
      const suppliers = await instance.adjustmentSupplier
        .find(query)
        .lean()

      return reply.ok(suppliers)
    }
    // instance.adjustmentSupplier.find(query, (err, suppliers) => {
    //   if (err || suppliers == null) suppliers = []

    //   if (page) {
    //     const total = suppliers.length
    //     suppliers = suppliers.splice(limit * (page - 1), limit)
    //     reply.ok({
    //       total: total,
    //       page: Math.ceil(total / limit),
    //       data: suppliers
    //     })
    //   }
    //   else {
    //     reply.ok(suppliers)
    //   }
    // })
    //   .lean()
  }

  instance.post('/inventory/get_suppliers/:limit/:page', options.version, (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      if (admin) { get_suppliers(request, reply, admin) }
    })
  })

  instance.get('/inventory/get_suppliers', options.version, (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      if (admin) { get_suppliers(request, reply, admin) }
    })
  })

  async function make_unique_suppliers(request, reply, admin, next) {
    const suppliers = await instance.adjustmentSupplier.find({
      organization: admin.organization,
      supplier_name: request.body.supplier_name
    })
      .lean();
    if (suppliers && suppliers.length > 0) {
      if (request.params && request.params.id && request.params.id == suppliers[0]._id) {
        next(request, reply, admin)
      }
      else {
        instance.allready_exist(reply)
      }
    } else {
      next(request, reply, admin)
    }
    // instance.adjustmentSupplier.find({
    //   organization: admin.organization,
    //   supplier_name: request.body.supplier_name
    // }, (_, suppliers) => {
    //   if (suppliers == null) {
    //     suppliers = []
    //   }
    //   if (suppliers.length > 0) {
    //     if (request.params) {
    //       if (request.params.id) {
    //         if (request.params.id == suppliers[0]._id) {
    //           next(request, reply, admin)
    //         }
    //         else {
    //           instance.allready_exist(reply)
    //         }
    //       }
    //       else {
    //         instance.allready_exist(reply)
    //       }
    //     }
    //     else {
    //       instance.allready_exist(reply)
    //     }
    //   }
    //   else {
    //     next(request, reply, admin)
    //   }
    // })
  }

  // create supplier 

  const create_supplier = (request, reply, admin) => {
    if (!request.body.supplier_name || !request.body.phone_number) {
      reply.error('Error on creating supplier phone_number and name required')
    }
    else {
      delete request.body._id
      const supplier_model = instance.adjustmentSupplier(Object.assign({
        organization: admin.organization,
      }, request.body))
      supplier_model.save((err, supp) => {
        if (err) {
          reply.error('Error on saving supplier')
          instance.send_Error('creating supplier', JSON.stringify(err))
        }
        else {
          reply.ok(supp)
        }
      })
    }
  }

  instance.post('/inventory/create_supplier', options.version, (request, reply) => {
    if (request.body && request.body.balance) {
      delete request.body.balance
    }
    instance.oauth_admin(request, reply, (admin) => {
      if (admin) {
        make_unique_suppliers(request, reply, admin, create_supplier)
      }
    })
  })

  // update supplier

  const update_supplier = (request, reply, admin) => {
    instance.adjustmentSupplier.updateOne({ _id: request.params.id }, { $set: request.body }, (err, result) => {
      if (result.ok) {
        reply.ok()
      }
      else {
        reply.error('Error on updating')
        if (err) { instance.send_Error('update supplier', JSON.stringify(err)) }
      }
    })
  }

  instance.post('/inventory/update_supplier/:id', options.version, (request, reply) => {
    if (request.body) {
      delete request.body.balance
    }
    instance.oauth_admin(request, reply, (admin) => {
      if (!admin) {
        return reply.error('Access')
      }
      make_unique_suppliers(request, reply, admin, update_supplier)
    })
  })

  // delete supplier

  const delete_supplier = (request, reply, admin) => {
    instance.adjustmentSupplier.deleteOne({ _id: request.params.id }, (err, _) => {
      if (err) {
        instance.send_Error('delete supp', JSON.stringify(err))
      }
      else {
        reply.ok()
      }
    })
  }

  instance.delete('/inventory/delete_supplier/:id', options.version, (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      if (admin) {
        delete_supplier(request, reply, admin)
      }
    })
  })

  // delete group

  const delete_suppliers = (request, reply, admin) => {
    instance.adjustmentSupplier.deleteMany({
      _id: { $in: request.body.indexes }
    }, (err, _) => {
      if (err) {
        reply.error('Error on deleting')
        instance.send_Error('deleting suppliers', JSON.stringify(err))
      }
      else {
        reply.ok()
      }
    })
  }

  instance.post('/inventory/delete_suppliers', options.version, (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      if (admin) {
        delete_suppliers(request, reply, admin)
      }
    })
  })

  // create supplier transaction

  const createTransactionHandler = async (request, reply) => {
    try {
      const supplier_id = request.body.supplier_id
      const body = request.body
      const user = request.user
      const supplier = await instance.adjustmentSupplier
        .findOne({ _id: supplier_id })
        .lean();
      const service = await instance.services.findById(body.service).lean();

      if (!supplier) return reply.fourorfour('Supplier')
      if (!service) return reply.fourorfour('Service')

      if (request.body.return_money) body.balance *= (-1)

      body.service = service._id
      body.service_name = service.name

      const supplierTransaction = {
        ...body,
        supplier_id: supplier._id,
        employee: user._id,
        employee_name: user.name,
        date: new Date().getTime()
      }
      const { _id: id } = await new instance.supplierTransaction(supplierTransaction).save()

      if (!id) return reply.error('Could not save')

      if (!supplier.balance) supplier.balance = 0;

      if (!supplier.balance_usd) supplier.balance_usd = 0;

      if (body.currency == 'usd') {
        supplier.balance_usd += body.balance;
        // try {
        //   let currency = await instance.Currency.findOne({ organization: user.organization })
        //   if (!currency) {
        //     currency = { value: 1 }
        //   }

        //   body.balance = body.balance * currency.value
        // } catch (error) { }
      }
      else {
        supplier.balance += body.balance;
      }
      await instance.adjustmentSupplier.updateOne(
        { _id: supplier._id },
        {
          $set: {
            balance: supplier.balance,
            balance_usd: supplier.balance_usd
          }
        })

      if (body.status == 'active') {
        const { _id: consumption_id } = await new instance.consumptionModel({
          transaction_id: id,
          date: supplierTransaction.date,
          supplier: supplierTransaction.supplier_id,
          organization: user.organization,
          by: user._id,
          by_name: user.name,
          type: 'company_to_fees',
          supplier_name: supplier.supplier_name,
          amount_type: supplierTransaction.balance_type,
          amount: body.balance,
          currency_amount: supplierTransaction.balance,
          currency: body.currency
        }).save()

        /** Remove from Safe */
        const safe_data = {
          organization: user.organization,
          type: body.currency,
          value: (-1) * supplierTransaction.balance,
        }
        const safe_history = {
          by_user: user._id,
          by_user_name: user.name,
          history_type: 'fee',
          history_id: consumption_id,
          value: (-1) * supplierTransaction.balance,
        }
        await instance.Safe.updateValue(safe_data, safe_history);
        /** */

      }
      reply.ok({ id: id })
    } catch (error) {
      return reply.error(error.message)
    }
  }

  const createTransactionSchema = {
    version: '1.0.0',
    schema: {
      body: {
        type: 'object',
        additionalProperties: false,
        required: [
          'supplier_id', 'document_id', 'service',
          'currency', 'status', 'balance'
        ],
        properties: {
          service: { type: 'string' },
          supplier_id: { type: 'string' },
          document_id: { type: 'string' },
          currency: {
            type: 'string',
            default: 'uzs'
          },
          status: {
            type: 'string',
            enum: ['active', 'pending']
          },
          balance_type: {
            type: 'string',
            enum: ['cash', 'card']
          },
          balance: { type: 'number' },
          return_money: {
            type: 'boolean',
            default: false
          }
        }
      }
    },
    attachValidation: true
  }

  instance.post(
    '/inventory/supplier/transaction/create',
    createTransactionSchema,
    (request, reply) => {
      if (request.validationError) {
        return reply.validation(request.validationError.message)
      }
      instance.oauth_admin(request, reply, (admin) => {
        request.user = admin
        return createTransactionHandler(request, reply)
      })
    }
  )

  // update transaction

  const updateTransactionHandler = async (request, reply) => {
    const id = request.params.id
    const body = request.body
    const user = request.user
    try {
      const transaction = await instance.supplierTransaction.findOne({ _id: id })
      if (!transaction) {
        return reply.fourorfour('Transaction')
      }
      await instance.supplierTransaction.updateOne(
        { _id: transaction._id },
        { $set: body },
        { lean: true },
      )
      reply.ok({ _id: id })
      if (transaction.status == 'pending' && body.status == 'active') {
        if (transaction.currency == 'usd') {
          try {
            let currency = await instance.Currency
              .findOne({ organization: user.organization })
              .lean();

            if (!currency) currency = { value: 1 }

            body.balance = transaction.balance * currency.value
          } catch (error) { }
        }
        const supplier = await instance.adjustmentSupplier
          .findOne({ _id: transaction.supplier_id })
          .lean();
        const supplier_name = supplier && supplier.supplier_name ? supplier.supplier_name : ''
        const { _id: consumption_id } = await new instance.consumptionModel({
          organization: user.organization,
          transaction_id: transaction._id,
          date: transaction.date,
          supplier: transaction.supplier_id,
          organization: user.organization,
          by: user._id,
          type: 'company_to_fees',
          supplier_name: supplier_name,
          amount_type: transaction.balance_type,
          amount: body.balance,
          currency_amount: transaction.balance,
          currency: transaction.currency,
          by: user._id,
          by_name: user.name
        }).save()

        /** Remove from Safe */
        const safe_data = {
          organization: user.organization,
          type: transaction.currency,
          value: (-1) * transaction.balance
        }
        const safe_history = {
          by_user: user._id,
          by_user_name: user.name,
          history_type: 'fee',
          history_id: consumption_id,
          value: (-1) * transaction.balance
        }
        await instance.Safe.updateValue(safe_data, safe_history);
        /** */

      }
    } catch (error) {
      return reply.fourorfour('Transaction')
    }
  }

  const updateTransactionSchema = {
    version: '1.0.0',
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string' } }
      },
      body: {
        type: 'object',
        additionalProperties: false,
        required: ['status'],
        properties: {
          status: {
            type: 'string',
            enum: ['active', 'pending']
          }
        }
      }
    },
    attachValidation: true
  }

  instance.post(
    '/inventory/supplier/transaction/update/:id',
    updateTransactionSchema,
    (request, reply) => {
      if (request.validationError) {
        return reply.validation(request.validationError.message)
      }
      instance.oauth_admin(request, reply, (admin) => {
        request.user = admin
        return updateTransactionHandler(request, reply)
      })
    }
  )
  const get_supplier_bot = async (request, reply) => {
    const supplier_phone = request.query.phone && typeof request.query.phone == typeof 'invan'
      ? `+${request.query.phone}`
      : '';

    instance.adjustmentSupplier.aggregate([
      {
        $match: {
          phone_number: supplier_phone,
          is_deleted: { $ne: true },
          //   // telegram_acces: true
        },
      },
      {
        $lookup: {
          from: instance.organizations.collection.collectionName,
          localField: 'organization',
          foreignField: '_id',
          as: 'organs',
        },
      },
      // {
      //   $project: {
      //     organization: 1,
      //     supplier_name: 1,
      //     phone_number: 1,
      //     website: 1,
      //     email: 1,
      //     address_first: 1,
      //     address_second: 1,
      //     note: 1,
      //     service: 1,
      //     contact: 1,
      //     balance: 1,
      //     balance_usd: 1,
      //     city: 1,
      //     zip_code: 1,
      //     country: { text: 1, value: 1 },
      //     region_state_province: 1,
      //     balance_currency: 1,
      //     organs: 1,
      // "organization._id": "organization._id",
      // "organization._id": "organization._id",
      // "organization.address": "organization.address",
      // "organization.name": "organization.name",
      // }
      // }
    ], async (err, suppliers) => {

      if (err || suppliers == null) {
        suppliers = []
      }

      for (const [index, item] of suppliers.entries()) {
        organization = item.organization
          ? await instance.organizations.findById(item.organization).lean()
          : {}
        suppliers[index].organization = {
          _id: organization._id,
          address: organization.address,
          name: organization.name,
        }
      }
      // console.log(suppliers[0]);

      reply.ok(suppliers)
    })
  }
  instance.get('/bot/inventory/get_suppliers/phone', (request, reply) => {
    if (request.query.secret && request.query.secret == process.env.bot_secret)
      get_supplier_bot(request, reply)
    else
      reply.send("acces denied")
  })

  next()
}