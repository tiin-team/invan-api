
module.exports = ((instance, _, next) => {

  const consumptionReportSchema = {
    params: {
      type: 'object',
      required: ['start', 'end'],
      properties: {
        start: { type: 'number' },
        end: { type: 'number' },
      }
    },
    body: {
      type: 'object'
    }
  }

  const calculateConsumption = async (request, reply) => {
    try {
      const start = request.params.start
      const end = request.params.end
      const user = request.user;

      const consumptions = await instance.consumptionModel.find({
        organization: user.organization,
        date: {
          $lte: end,
          $gte: start
        }
      });
      
      let fees = 0, one_time_fees = 0, salary = 0, company_to_fees = 0;
      let all_cash_fee = 0, all_card_fee = 0;
      for (const con of consumptions) {
        fees += con.type == 'fees' ? con.amount : 0
        one_time_fees += con.type == 'one_time_fees' ? con.amount : 0
        salary += con.type == 'salary' ? con.amount : 0
        company_to_fees += con.type == 'company_to_fees' ? con.amount : 0
        all_cash_fee += con.amount_type == 'cash' ? con.amount : 0
        all_card_fee += con.amount_type == 'card' ? con.amount : 0
      }

      const shifts = await instance.Shifts.find({
        organization: user.organization,
        closing_time: {
          $ne: 0
        },
        opening_time: {
          $lte: end,
          $gte: start
        }
      })

      let all_card = 0, all_cash = 0;
      for (const sh of shifts) {
        all_cash += sh.cash_drawer && sh.cash_drawer.act_cash_amount ? sh.cash_drawer.act_cash_amount : 0
        all_card += sh.sales_summary && sh.sales_summary.card ? sh.sales_summary.card : 0
      }

      reply.ok({
        all_cash: all_cash,
        all_card: all_card,
        all_cash_actual: all_cash - all_cash_fee,
        all_card_actual: all_card - all_card_fee,
        fees: fees,
        one_time_fees: one_time_fees,
        salary: salary,
        company_to_fees: company_to_fees
      })

    } catch (error) {
      reply.error(error.message)
    }
  }

  instance.post('/reports/consumption/:start/:end',
    {
      version: '1.0.0',
      schema: {
        consumptionReportSchema
      },
      attachValidation: true
    }, (request, reply) => {
      if (request.validationError) {
        return reply.validation(request.validationError.message)
      }

      instance.authorization(request, reply, (user) => {
        return calculateConsumption(request, reply)
      })
    })

  const calculateConsumptions = async (request, reply) => {
    try {
      const { start, end } = request.params;
      const user = request.user;

      const filterConsumptions = {
        $match: {
          organization: user.organization,
          date: {
            $lte: end,
            $gte: start
          }
        }
      }

      const calculateConsumption = {
        $group: {
          _id: null,
          fees: {
            $sum: {
              $cond: [
                { $eq: ["$type", "fees"] },
                { $max: ["$amount", 0] },
                0
              ]
            }
          },
          one_time_fees: {
            $sum: {
              $cond: [
                { $eq: ["$type", "one_time_fees"] },
                { $max: ["$amount", 0] },
                0
              ]
            }
          },
          salary: {
            $sum: {
              $cond: [
                { $eq: ["$type", "salary"] },
                { $max: ["$amount", 0] },
                0
              ]
            }
          },
          company_to_fees: {
            $sum: {
              $cond: [
                { $eq: ["$type", "company_to_fees"] },
                { $max: ["$amount", 0] },
                0
              ]
            }
          },
          all_cash_fee: {
            $sum: {
              $cond: [
                { $eq: ["$amount_type", "cash"] },
                { $max: ["$amount", 0] },
                0
              ]
            }
          },
          all_card_fee: {
            $sum: {
              $cond: [
                { $eq: ["$amount_type", "card"] },
                { $max: ["$amount", 0] },
                0
              ]
            }
          }
        }
      }

      const cunsumptionReport = await instance.consumptionModel.aggregate([
        filterConsumptions,
        calculateConsumption
      ])
        .allowDiskUse(true)
        .exec();

      const cunsumptionResult = cunsumptionReport && cunsumptionReport.length > 0 ?
        cunsumptionReport[0] :
        {
          fees: 0,
          one_time_fees: 0,
          salary: 0,
          company_to_fees: 0,
          all_cash_fee: 0,
          all_card_fee: 0
        }

      const filterShifts = {
        $match: {
          organization: user.organization,
          closing_time: {
            $ne: 0
          },
          opening_time: {
            $lte: end,
            $gte: start
          }
        }
      }

      const calculateShift = {
        $group: {
          _id: null,
          all_cash: {
            $sum: {
              $max: [
                0,
                "$cash_drawer.act_cash_amount"
              ]
            }
          },
          all_card: {
            $sum: {
              $max: [
                0,
                "$sales_summary.card"
              ]
            }
          }
        }
      }

      const shiftReport = await instance.Shifts.aggregate([
        filterShifts,
        calculateShift
      ])
        .allowDiskUse(true)
        .exec();

      const shiftResult = shiftReport && shiftReport.length > 0 ? shiftReport[0] : {
        all_cash: 0,
        all_card: 0
      }

      reply.ok({
        ...cunsumptionResult,
        ...shiftResult,
        all_cash_actual: shiftResult.all_cash - cunsumptionResult.all_cash_fee,
        all_card_actual: shiftResult.all_card - cunsumptionResult.all_card_fee
      })

    } catch (error) {
      reply.error(error.message)
    }
  }

  instance.post(
    '/report/consumption/:start/:end',
    {
      version: '1.0.0',
      schema: consumptionReportSchema,
      attachValidation: true
    },
    (request, reply) => {
      if (request.validationError) {
        return reply.validation(request.validationError.message)
      }

      instance.authorization(request, reply, (user) => {
        return calculateConsumptions(request, reply)
      })
    }
  )

  next()
})
