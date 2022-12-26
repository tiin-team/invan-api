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

  /**
   * @param {string} service_id
   * @param {string} organization_id
   * @param {{ min: string, max: string }} filter
   * @return {Promise<[{
   *   _id: string,
   *   p_items: [any[]],
   * }]>}
   */
  const getProductPurchases = async (organization_id, filter, service_id) => {
    try {
      service_id = instance.ObjectId(service_id);

      const $match_purchase = {
        $match: {
          // organization: organization_id,
          status: { $ne: "pending" },
          purchase_order_date: {
            $gte: filter.min,
            $lte: filter.max,
          },
          service: service_id,
        },
      };

      const $lookup = {
        $lookup: {
          from: "purchaseitems",
          let: { p_id: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$purchase_id", "$$p_id"] },
                    { $eq: ['$service', service_id] },
                  ],
                },
              },
            },
            {
              $group: {
                _id: "$product_id",
                product_name: { $first: "$product_name" },
                barcode: { $addToSet: "$barcode" },
                ordered: { $sum: "$ordered" },
                received: { $sum: "$received" },
                cancelled: { $sum: "$cancelled" },
                to_receive: { $sum: "$to_receive" },
                quality: { $sum: "$quality" },
                amount: { $sum: "$amount" },
              },
            },
          ],
          as: "p_items",
        },
      };

      const group = {
        $group: {
          _id: "$type",
          p_items: { $push: "$p_items" },
        },
      };
      return await instance.inventoryPurchase
        .aggregate([$match_purchase, $lookup, group])
        .allowDiskUse(true)
        .exec();
    } catch (error) {
      console.log(error);
      instance.send_Error("getProductPurchases function xlsx", JSON.stringify(error));

      return [];
    }
  };

  /**
  * @param {string} organization_id 
  * @param {string} service_id 
  * @param {{ min: string, max: string }} filter
  * @return {Promise<[{
  *  id: string,
  *  _id: string,
  *  name : string,
  *  cost_of_goods: number,
  *  sale_count: number,
  *  amount: number,
  * }]>}
 */
  const getProductsSaleInfo = async (organization_id, filter, service_id) => {
    try {
      const filterReceipts = {
        organization: organization_id + '',
        receipt_state: { $ne: "draft" },
        debt_id: null,
        service: service_id,
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
              ],
            },
          },
          amount: {
            $sum: {
              $multiply: [
                { $max: ["$sold_item_list.price", 0] },
                { $max: ["$sold_item_list.value", 0] },
                { $cond: ["$is_refund", -1, 1] },
              ],
            },
          },
          cost_of_goods: {
            $sum: {
              $multiply: [
                { $max: ["$sold_item_list.cost", 0] },
                { $max: ["$sold_item_list.value", 0] },
                { $cond: ["$is_refund", -1, 1] },
              ],
            },
          },
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
            $subtract: ["$gross_sales", { $add: ["$refunds", "$discounts"] }],
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
        },
      };

      return await instance.Receipts.aggregate([
        { $match: filterReceipts },
        projectCategoryFilter,
        unwindSoldItemList,
        calculateItemsReport,
        sortResult,
        projectResult,
      ])
        .allowDiskUse(true)
        .exec();
    } catch (error) {
      console.log(error);
      instance.send_Error("getProductsSaleInfo function", JSON.stringify(error));
      return [];
    }
  };

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
      const start = new Date().getTime();
      const purchases = await getProductPurchases(
        organization_id,
        {
          min: time.start_time,
          max: time.end_time,
        },
        service_id,
      );
      console.log(new Date().getTime() - start, `purchasega ketgan vaqt, organization_id: ${organization_id}`);

      const saleInfo = await getProductsSaleInfo(
        organization_id + '',
        {
          min: time.start_time,
          max: time.end_time,
        },
        service_id + '',
      );
      console.log(new Date().getTime() - start, `boshlanishidan saleInfoni olguncha ketgan vaqt, , organization_id: ${organization_id}`);

      console.log(purchases.length, saleInfo.length, ` organization_id: ${organization_id}`);
      const p_items = [];
      const p_refund_items = [];

      for (const p of purchases) {
        if (p._id === "coming")
          for (const p_item of p.p_items) {
            p_items.push(...p_item);
          }
        else if (p._id === "refund")
          for (const p_item of p.p_items) {
            p_refund_items.push(...p_item);
          }
      }

      const transfers = await instance.Transfer
        .find({
          organization: organization_id + '',
          first_service: service_id + '',
          status: 'transferred',
          date: {
            $gte: time.start_time,
            $lte: time.end_time,
          },
        })
        .lean()

      const set = new Set();
      const result = {};

      console.log(transfers.length, `transfers.length, organization_id: ${organization_id}`);

      for (const transfer of transfers) {
        for (const t_item of transfer.items) {
          set.add(t_item.product_id + '');
          if (result[t_item.product_id + '']) {
            result[t_item.product_id + ''].name += t_item.product_name;
            result[t_item.product_id + ''].purchase_count += t_item.quality;
            result[t_item.product_id + ''].purchase_amount += t_item.cost * t_item.quality;
          } else {
            result[t_item.product_id + ''] = {
              name: t_item.product_name,
              sale_count: 0,
              sale_cost_of_goods: 0,
              sale_amount: 0,
              purchase_count: t_item.quality,
              purchase_amount: t_item.cost * t_item.quality,
              start_stock: 0,
              end_stock: 0,
              cost: 0,
              price: 0,
              prices: [],
            };
          }
        }
      }

      console.log(p_items.length, p_refund_items.length, `, organization_id: ${organization_id}`);
      console.log(saleInfo.length, `, organization_id: ${organization_id}`);

      for (const p_item of p_items) {
        set.add(p_item._id + '');
        if (result[p_item._id + '']) {
          result[p_item._id + ''].name += p_item.product_name;
          result[p_item._id + ''].purchase_count += p_item.received;
          result[p_item._id + ''].purchase_amount += p_item.amount;
        } else {
          result[p_item._id + ''] = {
            name: p_item.product_name,
            sale_count: 0,
            sale_cost_of_goods: 0,
            sale_amount: 0,
            purchase_count: p_item.received,
            purchase_amount: p_item.amount,
            start_stock: 0,
            end_stock: 0,
            cost: 0,
            price: 0,
            prices: [],
          };
        }
      }

      for (const p_item of p_refund_items) {
        set.add(p_item._id + '');
        if (result[p_item._id + '']) {
          result[p_item._id + ''].name -= p_item.product_name;
          result[p_item._id + ''].purchase_count -= p_item.received;
          result[p_item._id + ''].purchase_amount -= p_item.amount;
        } else {
          result[p_item._id + ''] = {
            name: p_item.product_name,
            sale_count: 0,
            sale_cost_of_goods: 0,
            sale_amount: 0,
            purchase_count: -p_item.received,
            purchase_amount: -p_item.amount,
            start_stock: 0,
            end_stock: 0,
            cost: 0,
            price: 0,
            prices: [],
          };
        }
      }

      for (const s of saleInfo) {
        if (s._id.length === 24) {
          set.add(s._id + '');
          if (result[s._id + '']) {
            result[s._id + ''].name += s.name;
            result[s._id + ''].sale_count += s.sale_count;
            result[s._id + ''].sale_cost_of_goods == s.sale_cost_of_goods;
            result[s._id + ''].sale_amount += s.amount;
          } else {
            result[s._id + ''] = {
              name: s.name,
              sale_count: s.sale_count,
              sale_cost_of_goods: s.sale_cost_of_goods,
              sale_amount: s.amount,
              purchase_count: 0,
              purchase_amount: 0,
              start_stock: 0,
              end_stock: 0,
              cost: 0,
              price: 0,
              prices: [],
            };
          }
        }
      }

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
            count: result[p_id].sale_count,
            cost_amount: result[p_id].sale_cost_of_goods,
            sale_amount: result[p_id].sale_amount,
          },
          purchase_monthly_info: {
            count: result[p_id].purchase_count,
            amount: result[p_id].purchase_amount,
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
              update: { $set: { services: otchot.services } },
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
