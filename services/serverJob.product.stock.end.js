const cronJob = require("node-cron");
const axios = require("axios");
const fp = require("fastify-plugin");
const os = require("os");

/**
 * @param {number | string} month
 * @return {string}
 */
const correctMonth = (month) => month >= 10 ? month : `0${month}`

const months = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

module.exports = fp((instance, _, next) => {


  //   /**
  //    * @param {string} service_id
  //    * @param {string} organization_id
  //    * @param {{ min: string, max: string }} filter
  //    * @return {Promise<[{
  //    *   _id: string,
  //    *   p_items: [any[]],
  //    * }]>}
  //    */
  //   const getProductPurchases = async (organization_id, filter, service_id) => {
  //     try {
  //       service_id = instance.ObjectId(service_id);

  //       const $match_purchase = {
  //         $match: {
  //           // organization: organization_id,
  //           status: { $ne: "pending" },
  //           purchase_order_date: {
  //             $gte: filter.min,
  //             $lte: filter.max,
  //           },
  //           service: service_id,
  //         },
  //       };

  //       const $lookup = {
  //         $lookup: {
  //           from: "purchaseitems",
  //           let: { p_id: "$_id" },
  //           pipeline: [
  //             {
  //               $match: {
  //                 $expr: {
  //                   $and: [
  //                     { $eq: ["$purchase_id", "$$p_id"] },
  //                     { $eq: ['$service', service_id] },
  //                   ],
  //                 },
  //               },
  //             },
  //             {
  //               $group: {
  //                 _id: "$product_id",
  //                 product_name: { $first: "$product_name" },
  //                 barcode: { $addToSet: "$barcode" },
  //                 ordered: { $sum: "$ordered" },
  //                 received: { $sum: "$received" },
  //                 cancelled: { $sum: "$cancelled" },
  //                 to_receive: { $sum: "$to_receive" },
  //                 quality: { $sum: "$quality" },
  //                 amount: { $sum: "$amount" },
  //               },
  //             },
  //           ],
  //           as: "p_items",
  //         },
  //       };

  //       const group = {
  //         $group: {
  //           _id: "$type",
  //           p_items: { $push: "$p_items" },
  //         },
  //       };
  //       return await instance.inventoryPurchase
  //         .aggregate([$match_purchase, $lookup, group])
  //         .allowDiskUse(true)
  //         .exec();
  //     } catch (error) {
  //       console.log(error);
  //       instance.send_Error("getProductPurchases function xlsx", JSON.stringify(error));

  //       return [];
  //     }
  //   };

  //   /**
  //   * @param {string} organization_id 
  //   * @param {string} service_id 
  //   * @param {{ min: string, max: string }} filter
  //   * @return {Promise<[{
  //   *  id: string,
  //   *  _id: string,
  //   *  name : string,
  //   *  cost_of_goods: number,
  //   *  sale_count: number,
  //   *  amount: number,
  //   * }]>}
  //  */
  //   const getProductsSaleInfo = async (organization_id, filter, service_id) => {
  //     try {
  //       const filterReceipts = {
  //         organization: organization_id + '',
  //         receipt_state: { $ne: "draft" },
  //         debt_id: null,
  //         service: service_id,
  //         date: {
  //           $gte: filter.min,
  //           $lte: filter.max,
  //         },
  //       };

  //       const unwindSoldItemList = { $unwind: "$sold_item_list" };

  //       const calculateItemsReport = {
  //         $group: {
  //           _id: "$sold_item_list.product_id",
  //           product_name: { $last: "$sold_item_list.product_name" },
  //           sale_count: {
  //             $sum: {
  //               $multiply: [
  //                 { $max: ["$sold_item_list.value", 0] },
  //                 { $cond: ["$is_refund", -1, 1] },
  //               ],
  //             },
  //           },
  //           amount: {
  //             $sum: {
  //               $multiply: [
  //                 { $max: ["$sold_item_list.price", 0] },
  //                 { $max: ["$sold_item_list.value", 0] },
  //                 { $cond: ["$is_refund", -1, 1] },
  //               ],
  //             },
  //           },
  //           cost_of_goods: {
  //             $sum: {
  //               $multiply: [
  //                 { $max: ["$sold_item_list.cost", 0] },
  //                 { $max: ["$sold_item_list.value", 0] },
  //                 { $cond: ["$is_refund", -1, 1] },
  //               ],
  //             },
  //           },
  //         },
  //       };

  //       const sortResult = { $sort: { gross_sales: -1 } };

  //       const projectResult = {
  //         $project: {
  //           id: "$_id",
  //           name: "$product_name",
  //           amount: 1,
  //           cost_of_goods: 1,
  //           gross_sales: 1,
  //           refunds: 1,
  //           discounts: 1,
  //           items_sold: 1,
  //           items_refunded: 1,
  //           sale_count: 1,
  //           net_sales: {
  //             $subtract: ["$gross_sales", { $add: ["$refunds", "$discounts"] }],
  //           },
  //           gross_profit: {
  //             $subtract: [
  //               {
  //                 $subtract: [
  //                   "$gross_sales",
  //                   { $add: ["$refunds", "$discounts"] },
  //                 ],
  //               },
  //               "$cost_of_goods",
  //             ],
  //           },
  //         },
  //       };
  //       const projectCategoryFilter = {
  //         $project: {
  //           sold_item_list: 1,
  //           is_refund: 1,
  //         },
  //       };

  //       return await instance.Receipts.aggregate([
  //         { $match: filterReceipts },
  //         projectCategoryFilter,
  //         unwindSoldItemList,
  //         calculateItemsReport,
  //         sortResult,
  //         projectResult,
  //       ])
  //         .allowDiskUse(true)
  //         .exec();
  //     } catch (error) {
  //       console.log(error);
  //       instance.send_Error("getProductsSaleInfo function", JSON.stringify(error));
  //       return [];
  //     }
  //   };

  /**
   * @param {string} organization_id
   * @param {string} service_id
   * @param {string} service_name
   * @param {{
   *  month_name: string,
   *  start_time: number,
   *  end_time: number
   * }} time
   */
  const calculateOrganizationOtchotByService = async (organization_id, service_id, service_name, time) => {
    try {
      console.log(`starting... , organization_id: ${organization_id}`);
      const result = {};

      const date = new Date(time.start_time)

      const otchots = await instance.goodsOtchot
        .find({
          organization: organization_id + '',
          month: `${date.getDate()}.${correctMonth(date.getMonth() + 1)}.${date.getFullYear()}`,
          month_name: time.month_name,
        })
        .lean()

      const otchotsObj = {}
      for (const otchot of otchots) {
        otchotsObj[otchot.product_id + ''] = otchot
        if (!result[otchot.product_id + '']) {
          result[otchot.product_id + ''] = null;
        }
      }

      const goods = await instance.goodsSales.aggregate([
        {
          $match: {
            $or: [
              {
                _id: { $in: Object.keys(result).map(i => instance.ObjectId(i)) },
              },
              { updatedAt: { $gte: new Date(time.start_time) } },
              { createdAt: { $gte: new Date(time.start_time) } },
            ],
          },
        },
        {
          $project: {
            sku: 1,
            name: 1,
            category_id: 1,
            category_name: 1,
            sold_by: 1,
            count_by_type: 1,
            barcode_by_type: 1,
            barcode: 1,
            mxik: 1,
            cost: 1,
            services: {
              $first: {
                $filter: {
                  input: "$services",
                  as: "service",
                  cond: {
                    $or: [
                      {
                        $eq: [{ $toString: "$$service.service_id" }, service_id + ''],
                      },
                      {
                        $eq: [{ $toString: "$$service.service" }, service_id + ''],
                      },
                    ]
                  },
                },
              },
            },
          }
        }
      ],
      )
        .allowDiskUse(true)
        .exec()

      const goodsObj = {}
      for (const good of goods) {
        good.services = good.services ? good.services : {}
        goodsObj[good._id + ''] = good
        if (result[good._id + '']) {
          // if (result[good._id].services) {
          result[good._id].end_stock = good.services.in_stock;
          result[good._id].name = good.name;
          result[good._id].start_stock = 0;
          result[good._id].cost = good.services.cost ? good.services.cost : good.cost;
          result[good._id].price = good.services.price;
          result[good._id].prices = good.services.prices;
          // }
        } else {
          result[good._id + ''] = {
            name: good.name,
            sale_count: 0,
            sale_cost_of_goods: 0,
            sale_amount: 0,
            purchase_count: 0,
            purchase_amount: 0,
            start_stock: 0,
            end_stock: good.services.in_stock,
            cost: good.services.cost ? good.services.cost : good.cost,
            price: good.services.price,
            prices: good.services.prices,
          };
        }
      }

      let new_otchots = []
      let update_otchots = []

      for (const p_id of Object.keys(result)) {
        const service_info = {
          service_id: service_id,
          service_name: service_name,
          stock_monthly: {
            start_stock: 0,
            end_stock: result[p_id].end_stock,
            cost: result[p_id].cost,
            price: result[p_id].price,
            prices: result[p_id].prices,
          },
          sale_monthly_info: {
            count: 0,
            cost_amount: 0,
            sale_amount: 0,
          },
          purchase_monthly_info: {
            count: 0,
            amount: 0,
          },
        }

        const otchot = otchotsObj[p_id]

        if (!otchot) {
          if (goodsObj[p_id])
            new_otchots.push({
              organization: organization_id,
              month: `${date.getDate()}.${correctMonth(date.getMonth() + 1)}.${date.getFullYear()}`,
              month_name: time.month_name,
              start_time: time.start_time,
              period_type: 'day',
              end_time: time.end_time,
              sku: goodsObj[p_id].sku,
              product_id: goodsObj[p_id]._id,
              product_name: goodsObj[p_id].name,
              category_id: goodsObj[p_id].category_id,
              category_name: goodsObj[p_id].category_name,
              sold_by: goodsObj[p_id].sold_by,
              count_by_type: goodsObj[p_id].count_by_type,
              barcode_by_type: goodsObj[p_id].barcode_by_type,
              barcode: goodsObj[p_id].barcode,
              mxik: goodsObj[p_id].mxik ? goodsObj[p_id].mxik : '',
              services: [service_info]
            })
        } else {
          const service_index = otchot.services.findIndex(serv => serv.service_id + '' === service_id + '')

          if (service_index >= 0) {
            otchot.month = `${date.getDate()}.${correctMonth(date.getMonth() + 1)}.${date.getFullYear()}`
            otchot.end_time = time.end_time
            otchot.services[service_index].service_id = service_info.service_id
            otchot.services[service_index].service_name = service_info.service_name
            otchot.services[service_index].stock_monthly.end_stock = service_info.stock_monthly.end_stock
            otchot.services[service_index].sale_monthly_info = service_info.sale_monthly_info
            otchot.services[service_index].purchase_monthly_info = service_info.purchase_monthly_info
          } else {
            otchot.services.push(service_info)
          }
          update_otchots.push({
            updateOne: {
              filter: { _id: otchot._id },
              update: { $set: { end_time: time.end_time, services: otchot.services } },
            }
          })
        }

        if (update_otchots.length >= 10000) {
          console.log(`update_otchots.length: ${update_otchots.length}`);
          await new Promise((res) => {
            instance.goodsOtchot.bulkWrite(update_otchots, (err) => {
              if (err) {
                console.log(err);
                instance.send_Error('bulkWrite update_otchots kun oxirida update qilish', JSON.stringify(err))
              }
              res(true)
            })
          })
          update_otchots = []
        }

        if (new_otchots.length >= 10000) {
          console.log(`new_otchots.length: ${new_otchots.length}`);
          await new Promise((res) => {
            instance.goodsOtchot.insertMany(new_otchots, (err) => {
              if (err) {
                console.log(err);
                instance.send_Error('kun oxirida update qilish insert qilish', JSON.stringify(err))
              }
              res(true)
            })
          })
          new_otchots = []
        }
      }

      console.log(`update_otchots.length: ${update_otchots.length}`);
      await new Promise((res) => {
        instance.goodsOtchot.bulkWrite(update_otchots, (err) => {
          if (err) {
            console.log(err);
            instance.send_Error('bulkWrite update_otchots kun oxirida update qilish', JSON.stringify(err))
          }
          res(true)
        })
      })
      update_otchots = []

      console.log(`new_otchots.length: ${new_otchots.length}`);
      await new Promise((res) => {
        instance.goodsOtchot.insertMany(new_otchots, (err) => {
          if (err) {
            console.log(err);
            instance.send_Error('kun oxirida update qilish insert qilish', JSON.stringify(err))
          }
          res(true)
        })
      })
      new_otchots = []
    } catch (err) {
      console.log(`error while calculate report, organization_id: ${organization_id}, service_id: ${service_id}, time: ${time}`);
    }
  };

  /**
   * @param {string} organization_id
   * @param {{
  *  month_name: string,
  *  start_time: number,
  *  end_time: number
  * }} time
 */
  const updateGoodsOtchotEndStock = async (organization_id, time) => {

    const date = new Date(time.start_time),
      date_string = `${date.getDate()}.${correctMonth(date.getMonth() + 1)}.${date.getFullYear()}`

    const reports = await instance.GoodsDailyStock
      .find({
        organization: organization_id + '',
        month: `${date.getDate()}.${correctMonth(date.getMonth() + 1)}.${date.getFullYear()}`,
        month_name: time.month_name,
      })
      .lean()

    const reportsObj = {}
    for (const report of reports) {
      reportsObj[report.product_id + ''] = report
    }

    const goods = await instance.goodsSales.aggregate([
      {
        $match: {
          organization: organization_id + '',
          $or: [
            {
              _id: { $in: reports.map(report => instance.ObjectId(report.product_id)) },
            },
            { updatedAt: { $gte: new Date(time.start_time) } },
            { createdAt: { $gte: new Date(time.start_time) } },
          ],
        },
      },
      {
        $project: {
          sku: 1,
          name: 1,
          category_id: 1,
          category_name: 1,
          sold_by: 1,
          count_by_type: 1,
          barcode_by_type: 1,
          barcode: 1,
          mxik: 1,
          cost: 1,
          services: 1,
        }
      }
    ])
      .allowDiskUse(true)
      .exec()

    const goodsObj = {}
    for (const good of goods) {
      good.services = Array.isArray(good.services) ? good.services : []
      goodsObj[good._id + ''] = good
    }

    let update_reports = []
    for (const good of goods) {

      const report = reportsObj[good._id + '']
      if (report) {
        report.services = report.services.map(serv => {
          const goodServ = good.services.find(s => s.service + '' == serv.service_id + '')
          if (goodServ)
            serv.end_stock = goodServ.in_stock
          return serv
        })

        update_reports.push({
          filter: {
            organization: organization_id,
            product_id: good._id,
            month: date_string,
          },
          updateOne: {
            $set: { services: report.services },
          },
        })
      } else {
        update_reports.push({
          insertOne: {
            "document": {
              organization: organization_id,
              month: date_string,
              month_name: time.month_name,
              sku: good.sku,
              product_id: good._id,
              product_name: good.name,
              category_id: good.category_id,
              category_name: good.category_name,
              sold_by: good.sold_by,
              count_by_type: good.count_by_type,
              barcode_by_type: good.barcode_by_type,
              barcode: good.barcode,
              mxik: good.mxik,
              services: good.services.map(serv => {
                return {
                  service_id: serv.service,
                  service_name: serv.service_name,
                  start_price: serv.price,
                  start_cost: serv.cost,
                  end_price: serv.price,
                  end_cost: serv.cost,
                  start_stock: serv.in_stock,
                  end_stock: serv.in_stock,
                  start_prices: serv.prices,
                  end_prices: serv.prices,
                }
              })
            }
          }
        })
      }

      if (update_reports.length >= 10000) {
        await updateGoodsDailyReport(update_reports)
        update_reports = 0
      }
    }

    if (update_reports.length >= 0) {
      await updateGoodsDailyReport(update_reports)
      update_reports = 0
    }

  }

  async function updateGoodsDailyReport(data) {
    await instance.GoodsDailyStock.bulkWrite(data)
  }

  /**
   * @param {Date} date
   * @param {boolean} calculate
   */
  const calculateOrganizationsOtchot = async (date) => {

    date.setHours(0, 0, 0, 0)
    const start_time = date.getTime() // start_time is current day 00:00

    date.setHours(23, 59, 59, 999)
    const end_time = date.getTime() // end_time is current day 23:59 sec:59 ms:999

    const month = date.getMonth()
    const month_name = months[month]

    console.log(new Date(start_time), start_time);
    console.log(new Date(end_time), end_time);

    const organizations = await instance.organizations
      .find(
        {},
        { _id: 1 },
      )
      .lean()
    console.log(organizations.length, 'organizations.length');
    for (const org of organizations) {
      const services = await instance.services
        .find(
          { organization: org._id },
        )
        .lean()

      await updateGoodsOtchotEndStock(
        org._id,
        {
          month_name: month_name,
          end_time: end_time,
          start_time: start_time,
        },
      )

      for (const service of services) {
        await calculateOrganizationOtchotByService(
          org._id,
          service._id,
          service.service_name,
          {
            month_name: month_name,
            end_time: end_time,
            start_time: start_time,
          },
        )
      }
    }
    console.log('the end...');
  }

  /**
   *****************************************************************************
   *                                                                           *
   *  Kun oxirida Productlarni stockini, purchaselarni sotuvni update qilish   *
   *                                                                           *
   *****************************************************************************
   */

  const cronString_ = '59 23 * * *';
  if (!cronJob.validate(cronString_)) {
    instance.log.error('Invalid CRON_TIME is specified:', cronString_);
  } else {
    cronJob.schedule(cronString_, async () => {
      const date = new Date()
      calculateOrganizationsOtchot(date)
    });
    console.log(`cronjon success run: ${cronString_}`);
  }

  // (async () => {
  //   const date = new Date()
  //   calculateOrganizationsOtchot(date)
  // })()

  console.log(require('os').EOL)

  next();
});
