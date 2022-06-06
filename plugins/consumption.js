
const mongoose = require('mongoose')
const fp = require('fastify-plugin')
module.exports = fp(function (instance, _, next) {

  instance.decorate('consumptionModel',
    mongoose.model('consumptionModel', new mongoose.Schema({
      organization: String,
      type: {
        type: String,
        enum: ['fees', 'one_time_fees', 'salary', 'company_to_fees'],
        default: 'fees'
      },
      service: String,
      service_name: String,
      employee: String,
      employee_name: String,
      supplier: String,
      supplier_name: String,
      option_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'feeoptions'
      },
      option_name: String,
      comment: {
        type: String,
        default: ''
      },
      amount: {
        type: Number,
        default: 0
      },
      currency_amount: {
        type: Number,
        default: 0
      },
      amount_type: {
        type: String,
        enum: ['cash', 'card']
      },
      currency: {
        type: String,
        default: 'uzs'
      },
      date: Number,
      transaction_id: String,
      by: String,
      by_name: String
    }))
  )

  const createConsumptionSchema = {
    schema: {
      body: {
        type: 'object',
        additionalProperties: false,
        required: [
          'type', 'currency_amount', 'amount_type', 'service'
        ],
        properties: {
          type: {
            type: 'string',
            enum: ['fees', 'one_time_fees', 'salary', 'company_to_fees'],
          },
          service: {
            type: ['string', 'null']
          },
          supplier: {
            type: ['string', 'null']
          },
          employee: {
            type: ['string', 'null']
          },
          comment: { type: 'string' },
          currency_amount: { type: 'number' },
          currency: {
            type: 'string',
            default: 'uzs'
          },
          amount_type: {
            type: 'string',
            enum: ['cash', 'card'],
            default: 'cash'
          },
          option_id: {
            type: 'string'
          }
        }
      }
    },
    attachValidation: true
  }

  const checkBody = async (request, reply) => {
    try {
      const body = request.body;
      if (body.option_id) {
        const option = await instance.FeeOptions.findById(body.option_id).lean();
        if (!option) {
          return reply.fourorfour('Service')
        }
        body.option_id = option._id;
        body.option_name = option.name;
      }
      const service = await instance.services
        .findOne({ _id: body.service })
        .lean()
      if (!service) {
        reply.fourorfour('Service')
        return { body: null }
      }
      body.service_name = service.name
      switch (body.type) {
        case 'fees':
        case 'one_time_fees': {
          // try {
          //   // const service = await instance.services
          //   //   .findOne({ _id: body.service })
          //   //   .lean()
          //   // if (!service) {
          //   //   reply.fourorfour('Service')
          //   //   return { body: null }
          //   // }
          //   // body.service_name = service.name
          return { body: body }
          // }
          // catch (error) {
          //   reply.error(error.message)
          //   return { body: null }
          // }
        }
        case 'salary': {
          try {
            const employee = await instance.User
              .findOne({ _id: body.employee })
              .lean()
            if (!employee) {
              reply.fourorfour('Employee')
              return { body: null }
            }
            body.employee_name = employee.name
            return { body: body }
          } catch (error) {
            reply.error(error.message)
            return { body: null }
          }
        }
        case 'company_to_fees': {
          try {
            const supplier = await instance.adjustmentSupplier
              .findOne({ _id: body.supplier })
              .lean()
            if (!supplier) {
              reply.fourorfour('Supplier')
              return { body: null }
            }
            body.supplier_name = supplier.supplier_name
            return { body: body }
          } catch (error) {
            reply.error(error.message)
            return { body: null }
          }
        }
        default: {
          reply.error('Failed')
          return { body: null }
        }
      }
    } catch (error) {
      reply.error(error.message)
      return { body: null }
    }
  }

  const createConsumption = async (request, reply) => {
    try {
      const { body: body } = await checkBody(request, reply)

      if (!body) {
        return
      }
      const user = request.user
      body.organization = user.organization
      body.by = user._id
      body.by_name = user.name
      body.date = new Date().getTime()
      if (body.currency == 'usd') {
        try {
          let currency = await instance.Currency
            .findOne({ organization: user.organization })
            .lean()
          if (!currency) {
            currency = { value: 1 }
          }
          body.amount = body.currency_amount * currency.value
        } catch (error) { }
      }
      else {
        body.amount = body.currency_amount
      }
      if (body.type === 'company_to_fees') {
        const supplierTransaction = {
          service: body.service,
          supplier_id: body.supplier,
          document_id: body.comment,
          currency: body.currency,
          status: 'active',
          balance_type: body.amount_type,
          balance: body.amount,
          return_money: false,
          employee: user._id,
          employee_name: user.name,
          date: body.date,
        }
        const { _id: transaction_id } = await new instance.supplierTransaction(supplierTransaction).save()
        body.transaction_id = transaction_id;
      }
      const { _id: id } = await new instance.consumptionModel(body).save();

      /** Remove from Safe */
      const safe_data = {
        organization: user.organization,
        type: body.currency,
        value: (-1) * body.currency_amount
      }
      const safe_history = {
        by_user: user._id,
        by_user_name: user.name,
        history_type: 'fee',
        history_id: id,
        value: (-1) * body.currency_amount
      }
      await instance.Safe.updateValue(safe_data, safe_history);
      /** */

      return reply.ok({ id: id })
    } catch (error) {
      return reply.error(error.message)
    }
  }

  instance.post('/consumption/create', {
    version: '1.0.0',
    ...createConsumptionSchema
  }, (request, reply) => {
    if (request.validationError) {
      return reply.validation(request.validationError.message)
    }
    instance.authorization(request, reply, (user) => {
      return createConsumption(request, reply)
    })
  })

  const getConsumptionSchema = {
    schema: {
      params: {
        type: 'object',
        required: ['limit', 'page'],
        properties: {
          limit: {
            oneOf: [
              {
                type: 'string',
                enum: ['all']
              },
              { type: 'integer' }
            ]
          },
          page: { type: 'integer' }
        }
      },
      body: {
        type: 'object',
        required: ['startDate', 'endDate'],
        properties: {
          amount_type: { type: 'string', enum: ['cash', 'card', ''] },
          service: {
            oneOf: [
              { type: 'string', minLength: 24, maxLength: 24 },
              { type: 'string', minLength: 0, maxLength: 0 },
            ],
          },
          supplier: {
            oneOf: [
              { type: 'string', minLength: 24, maxLength: 24 },
              { type: 'string', minLength: 0, maxLength: 0 },
            ],
          },
          type: { type: 'string', default: '' },
          startDate: { type: 'integer', minimum: 1 },
          endDate: { type: 'integer', minimum: 1 },
        },
      },
    },
  }

  instance.post(
    '/consumption/get/:limit/:page',
    {
      version: '1.0.0',
      ...getConsumptionSchema
    },
    (request, reply) => {
      instance.authorization(request, reply, async (user) => {
        try {
          const page = request.params.page
          const {
            startDate,
            endDate,
            type,
            amount_type,
            service,
            supplier,
            fee_type,
            filter
          } = request.body;
          const query = {
            organization: user.organization,
            date: {
              $gte: startDate,
              $lte: endDate
            }
          }
          if (amount_type) query.amount_type = amount_type
          if (service) query.service = service;
          if (supplier) query.supplier = supplier;

          if (type != '') query.type = type

          if (filter) {
            switch (fee_type) {
              case 'salary': {
                query.employee = filter
                break;
              }
              case 'company_to_fees': {
                query.supplier = filter
                break;
              }
              case 'one_time_fees':
              case 'fees': {
                query.service = filter
                break;
              }
            }
          }
          if (fee_type && fee_type != '') {
            query.type = fee_type
          }

          const total = await instance.consumptionModel.countDocuments(query);

          const limit = request.params.limit == 'all' ? (total == 0 ? 1 : total) : request.params.limit
          const fees = await instance.consumptionModel
            .find(query)
            .sort({ date: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean()

          reply.ok({
            total: total,
            fees: fees
          })
        } catch (error) {
          reply.error(error.message)
        }
      })
    }
  )

  next()
})
