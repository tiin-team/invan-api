
const cronJob = require('node-cron');
const axios = require('axios');
const os = require("os");

const sendNotify = async function (instance) {
  try {
    if (!process.env.BOT_TOKEN) {
      return
    }
    const used_memory = Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100;
    const freeRAM = Math.round(os.freemem() / 1024 / 1024 * 100) / 100;
    await axios.get(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage?chat_id=569942658&parse_mode=html&text=Used memory: ${used_memory} MB\nFree RAM: ${freeRAM} MB`, {})
    await axios.get(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage?chat_id=270852337&parse_mode=html&text=Working fine!`, {})
    instance.log.info(`Send`)
  } catch (error) {
    instance.log.error(error.message)
  }
}

module.exports = ((instance, _, next) => {

  // const cronString = '*/50 * * * * *';
  // if (!cronJob.validate(cronString)) {
  //   instance.log.error('Invalid CRON_TIME is specified:', cronString);
  //   // process.exit(1);
  // } else

  //   cronJob.schedule(cronString, () => {
  //     sendNotify(instance)
  //   })

  /**
  * @param {[string]} services 
  * @param {{ min: string, max: string }} filter
  * @return {Promise<[{
  *   _id: string,
  *   p_items: [any[]],
  * }]>}
  */
  const getProductPurchases = async (user, filter, services = []) => {
    try {
      const $match_purchase = {
        $match: {
          organization: user.organization,
          status: { $ne: 'pending' },
          purchase_order_date: {
            $gte: filter.min,
            $lte: filter.max,
          }
        }
      }

      const $lookup = {
        $lookup: {
          from: 'purchaseitems',
          let: { p_id: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$purchase_id', '$$p_id'] },
                  ],
                },
              },
            },
            {
              $group: {
                _id: '$product_id',
                product_name: { $first: '$product_name' },
                barcode: { $addToSet: '$barcode' },
                ordered: { $sum: '$ordered' },
                received: { $sum: '$received' },
                cancelled: { $sum: '$cancelled' },
                to_receive: { $sum: '$to_receive' },
                quality: { $sum: '$quality' },
                amount: { $sum: '$amount' }
              },
            },
          ],
          as: 'p_items',
        }
      }

      const group = {
        $group: {
          _id: '$type',
          p_items: { $push: '$p_items' }
        }
      }
      return await instance.inventoryPurchase.aggregate([
        $match_purchase, $lookup, group,
      ])
        .allowDiskUse(true)
        .exec()

      const purchases = await instance.inventoryPurchase
        .find(
          {
            organization: user.organization,
            status: { $ne: 'pending' },
            purchase_order_date: {
              $gte: filter.min,
              $lte: filter.max,
            }
          },
          { _id: 1 }
        ).lean()

      const $match = {
        $match: {
          is_cancelled: false,
          purchase_id: { $in: purchases.map(p => p._id) }
        }
      }
      if (services.length)
        $match.$match.service = { $in: services }

      const $group = {
        $group: {
          _id: '$product_id',
          product_name: { $first: '$product_name' },
          barcode: { $addToSet: '$barcode' },
          ordered: { $sum: '$ordered' },
          received: { $sum: '$received' },
          cancelled: { $sum: '$cancelled' },
          to_receive: { $sum: '$to_receive' },
          quality: { $sum: '$quality' },
          amount: { $sum: '$amount' }
        }
      }

      const pipelines = [$match, $group]

      return await instance.purchaseItem.aggregate(pipelines).exec()
    } catch (error) {
      console.log(error);
      instance.send_Error('getProductPurchases xlsx', JSON.stringify(error))

      return []
    }
  }

  /**
  * @param {[string]} services 
  * @param {{ min: string, max: string }} filter
  * @return {Promise<[{
  *  id: string,
  *  _id: string,
  *  name : string,
  *  cost_of_goods: number,
  *  sale_count: number,
  *  amount: number,
  * }]>}
   //  *  cost_of_goods: number,
   //  *  gross_sales: number,
   //  *  refunds: number,
   //  *  discounts: number,
   //  *  sale_count: number,
   //  *  items_sold: number,
   //  *  items_refunded: number,
   //  *  net_sales: number,
   //  *  gross_profit: number
 */
  const getProductsSaleInfo = async (user, filter, services = []) => {
    try {
      const filterReceipts = {
        organization: user.organization,
        receipt_state: { $ne: 'draft' },
        debt_id: null,
        date: {
          $gte: filter.min,
          $lte: filter.max,
        },
      };

      const unwindSoldItemList = { $unwind: "$sold_item_list" };

      const calculateItemsReport = {
        $group: {
          _id: "$sold_item_list.product_id",
          product_name: { $last: "$sold_item_list.product_name" },
          sale_count: {
            $sum: {
              $multiply: [
                { $max: ["$sold_item_list.value", 0] },
                { $cond: ["$is_refund", -1, 1] },
              ]
            }
          },
          amount: {
            $sum: {
              $multiply: [
                { $max: ["$sold_item_list.price", 0] },
                { $max: ["$sold_item_list.value", 0] },
                { $cond: ["$is_refund", -1, 1] }
              ],
            },
          },
          cost_of_goods: {
            $sum: {
              $multiply: [
                { $max: ["$sold_item_list.cost", 0] },
                { $max: ["$sold_item_list.value", 0] },
                { $cond: ["$is_refund", -1, 1] }
              ],
            },
          },
          // gross_sales: {
          //   $sum: {
          //     $multiply: [
          //       { $max: ["$sold_item_list.price", 0] },
          //       { $max: ["$sold_item_list.value", 0] },
          //       { $cond: ["$is_refund", 0, 1] },
          //     ]
          //   }
          // },
          // refunds: {
          //   $sum: {
          //     $multiply: [
          //       { $max: ["$sold_item_list.price", 0] },
          //       { $max: ["$sold_item_list.value", 0] },
          //       { $cond: ["$is_refund", 1, 0] },
          //     ],
          //   },
          // },
          // discounts: {
          //   $sum: {
          //     $multiply: [
          //       { $max: ["$sold_item_list.total_discount", 0] },
          //       { $cond: ["$is_refund", -1, 1] },
          //     ],
          //   },
          // },
          // items_sold: {
          //   $sum: {
          //     $cond: [
          //       "$is_refund",
          //       0,
          //       {
          //         $cond: [
          //           { $eq: ['$sold_item_list.sold_item_type', 'box_item'] },
          //           {
          //             $divide: [
          //               { $max: ["$sold_item_list.value", 0] },
          //               { $max: ["$sold_item_list.count_by_type", 1] }
          //             ]
          //           },
          //           { $max: ["$sold_item_list.value", 0] },
          //         ],
          //       },
          //     ],
          //   },
          // },
          // items_refunded: {
          //   $sum: {
          //     $cond: [
          //       "$is_refund",
          //       {
          //         $cond: [
          //           { $eq: ['$sold_item_list.sold_item_type', 'box_item'] },
          //           {
          //             $divide: [
          //               { $max: ["$sold_item_list.value", 0] },
          //               { $max: ["$sold_item_list.count_by_type", 1] }
          //             ],
          //           },
          //           { $max: ["$sold_item_list.value", 0] },
          //         ],
          //       },
          //       0,
          //     ],
          //   },
          // },
        },
      };

      const sortResult = { $sort: { gross_sales: -1 } };

      const projectResult = {
        $project: {
          id: "$_id",
          name: "$product_name",
          amount: 1,
          cost_of_goods: 1,
          gross_sales: 1,
          refunds: 1,
          discounts: 1,
          items_sold: 1,
          items_refunded: 1,
          sale_count: 1,
          net_sales: {
            $subtract: [
              "$gross_sales",
              { $add: ["$refunds", "$discounts"] },
            ],
          },
          gross_profit: {
            $subtract: [
              {
                $subtract: [
                  "$gross_sales",
                  { $add: ["$refunds", "$discounts"] },
                ],
              },
              "$cost_of_goods",
            ],
          },
        },
      };
      const projectCategoryFilter = {
        $project: {
          sold_item_list: 1,
          is_refund: 1,
        }
      }

      return await instance.Receipts.aggregate([
        { $match: filterReceipts },
        projectCategoryFilter,
        unwindSoldItemList,
        calculateItemsReport,
        sortResult,
        projectResult
      ])
        .allowDiskUse(true)
        .exec();
    }
    catch (error) {
      console.log(error);
      instance.send_Error('getProductPurchases xlsx', JSON.stringify(error))
      return []
    }
  }

  const calculateOrganizationOtchot = async (organization_id) => {

    const month_name = ''
    const start_time = 32
    const end_time = 3

    console.log('starting...');
    const start = new Date().getTime()
    const purchases = await getProductPurchases(user, { max: 1630551900343, min: 1629551900343 })
    console.log(new Date().getTime() - start);
    // return reply.code(404).send({ purchases })
    const saleInfo = await getProductsSaleInfo(user, { max: 1630551900343, min: 1629551900343 })
    console.log(new Date().getTime() - start);
    // return reply.code(404).send({ saleInfo })
    console.log(purchases.length, saleInfo.length);
    const p_items = []
    const p_refund_items = []

    for (const p of purchases) {
      if (p._id === 'coming')
        for (const p_item of p.p_items) {
          p_items.push(...p_item)
        }
      else if (p._id === 'refund')
        for (const p_item of p.p_items) {
          p_refund_items.push(...p_item)
        }
    }

    const set = new Set()
    const result = {}

    for (const p_item of p_items) {
      set.add(p_item._id)
      if (result[p_item._id]) {
        result[p_item._id].purchase_count += p_item.received
        result[p_item._id].purchase_amount += p_item.amount
      } else {
        result[p_item._id] = {
          name: p_item.product_name,
          sale_count: 0,
          cost_of_goods: 0,
          sale_amount: 0,
          purchase_count: p_item.received,
          purchase_amount: p_item.amount,
        }
      }
    }
    for (const p_item of p_refund_items) {
      set.add(p_item._id)
      if (result[p_item._id]) {
        result[p_item._id].purchase_count -= p_item.received
        result[p_item._id].purchase_amount -= p_item.amount
      } else {
        result[p_item._id] = {
          name: p_item.product_name,
          sale_count: 0,
          cost_of_goods: 0,
          sale_amount: 0,
          purchase_count: -p_item.received,
          purchase_amount: -p_item.amount,
        }
      }
    }

    for (const s of saleInfo) {
      if (s._id.length === 24) {
        set.add(s._id)
        if (result[s._id]) {
          result[s._id].sale_count += s.sale_count
          result[s._id].cost_of_goods == s.cost_of_goods
          result[s._id].sale_amount += s.amount
        } else {
          result[s._id] = {
            name: s.name,
            sale_count: s.sale_count,
            cost_of_goods: s.cost_of_goods,
            sale_amount: s.amount,
            purchase_count: 0,
            purchase_amount: 0,
          }
        }
      }
    }
    const otchot_goods = await instance.goodsOtchot
      .find({ organization: organization_id })
      .lean()

    const new_otchot_good_ids = []

    for (const otchot_g of otchot_goods) {
      if (!Object.keys(result).includes(otchot_g.product_id))
        new_otchot_good_ids.push(
          new instance.goodsOtchot({
            organization: organization_id,
            // service_id
            // service_name
            // available: true,
            // sku,
            product_id: result[otchot_g.product_id]._id,
            product_name: result[otchot_g.product_id].name,
            // category_id
            // category_name
            // sold_by
            // count_by_type
            // barcode_by_type
            // barcode
            // mxik
            stock_monthly: [],
            sale_monthly_info: [],
            purchase_monthly_info: [],
          })
        )
    }

    for (const p_id of Object.keys(result)) {
      await instance.goodsOtchot.findOneAndUpdate(
        {
          product_id: result[result]._id,
          organization: organization_id,
        },
        {
          stock_monthly: { $push: result[p_id] },
          sale_monthly_info: {
            $push: {
              month_name: month_name,
              start_time: start_time,
              end_time: end_time,
              count: result[p_id].sale_count,
              cost_amount: result[p_id].cost_of_goods,
              sale_amount: result[p_id].sale_amount,
            },
          },
          purchase_monthly_info: { $push: result[p_id] },
        },
        { lean: true },
      )
      instance.update(update(
        { "_id": { "$eq": 1 } },
        [
          {
            $set:
            {
              "is_exists_sale_monthly_info":
              {
                $ne:
                  [
                    {
                      $filter: {
                        input: "$sale_monthly_info",
                        cond: { $eq: ["$$this.month_name", month_name] },
                      },
                    },
                    [],
                  ]
              }
            }
          },
          {
            "$set":
            {
              "key":
              {
                "$cond":
                  ["$v2-exists",
                    {
                      "$map":
                      {
                        "input": "$key",
                        "in":
                        {
                          "$cond":
                            [{ "$eq": ["$$this", "1-value-2"] }, "1-value-3", "$$this"]
                        }
                      }
                    },
                    { "$concatArrays": ["$key", ["1-value-3"]] }]
              }
            }
          },
          { "$unset": ["v2-exists"] }
        ])
      )
    }
  }
  // const cronString_ = '*/50 * * * * *';
  // if (!cronJob.validate(cronString_)) {
  //   instance.log.error('Invalid CRON_TIME is specified:', cronString_);
  //   // process.exit(1);
  // } else

  // cronJob.schedule(cronString_, async () => {
  //   const organizations = await instance.organization
  //     .find(
  //       { _id: '' },
  //       { _id: 1 },
  //     )
  //     .lean()

  //   calculateOrganizationOtchot(organizations[0]._id)
  // })

  next()
})
