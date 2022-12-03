const cronJob = require("node-cron");
const axios = require("axios");
const fp = require("fastify-plugin");
const os = require("os");

const sendNotify = async function (instance) {
  try {
    if (!process.env.BOT_TOKEN) {
      return;
    }
    const used_memory =
      Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100;
    const freeRAM = Math.round((os.freemem() / 1024 / 1024) * 100) / 100;
    await axios.get(
      `https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage?chat_id=569942658&parse_mode=html&text=Used memory: ${used_memory} MB\nFree RAM: ${freeRAM} MB`,
      {}
    );
    await axios.get(
      `https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage?chat_id=270852337&parse_mode=html&text=Working fine!`,
      {}
    );
    instance.log.info(`Send`);
  } catch (error) {
    instance.log.error(error.message);
  }
};

/**
 * @param {number} month
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
  // const cronString = '*/50 * * * * *';
  // if (!cronJob.validate(cronString)) {
  //   instance.log.error('Invalid CRON_TIME is specified:', cronString);
  //   // process.exit(1);
  // } else

  //   cronJob.schedule(cronString, () => {
  //     sendNotify(instance)
  //   })

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

      const purchases = await instance.inventoryPurchase
        .find(
          {
            organization: organization_id,
            status: { $ne: "pending" },
            purchase_order_date: {
              $gte: filter.min,
              $lte: filter.max,
            },
          },
          { _id: 1 }
        )
        .lean();

      const $match = {
        $match: {
          is_cancelled: false,
          purchase_id: { $in: purchases.map((p) => p._id) },
        },
      };
      if (services.length) $match.$match.service = { $in: services };

      const $group = {
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
      };

      const pipelines = [$match, $group];

      return await instance.purchaseItem.aggregate(pipelines).exec();
    } catch (error) {
      console.log(error);
      instance.send_Error("getProductPurchases xlsx", JSON.stringify(error));

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
  const getProductsSaleInfo = async (organization_id, filter, service_id) => {
    try {
      const filterReceipts = {
        organization: organization_id,
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
      instance.send_Error("getProductPurchases xlsx", JSON.stringify(error));
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
  //  *  month: string,
   */
  const calculateOrganizationOtchot = async (organization_id, service_id, service_name, time) => {
    console.log("starting...");
    const start = new Date().getTime();
    const purchases = await getProductPurchases(
      organization_id,
      {
        min: time.start_time,
        max: time.end_time,
      },
      service_id,
    );
    console.log(new Date().getTime() - start, `purchasega ketgan vaqt`);

    const saleInfo = await getProductsSaleInfo(
      organization_id + '',
      {
        min: time.start_time,
        max: time.end_time,
      },
      service_id + '',
    );
    console.log(new Date().getTime() - start, 'boshlanishidan saleInfoni olguncha ketgan vaqt');

    console.log(purchases.length, saleInfo.length);
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
      })
      .lean()

    const set = new Set();
    const result = {};

    console.log(transfers.length, 'transfers.length');
    try {
      for (const transfer of transfers) {
        for (const t_item of transfer.items) {
          set.add(t_item.product_id);
          if (result[t_item.product_id]) {
            result[t_item.product_id].name += t_item.product_name;
            result[t_item.product_id].purchase_count += t_item.quality;
            result[t_item.product_id].purchase_amount += t_item.cost * t_item.quality;
          } else {
            result[t_item.product_id] = {
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
    } catch (error) {
      console.log('error: 0', error);
      instance.send_Error('error: 0', error)
    }

    console.log(p_items.length, p_refund_items.length);
    console.log(saleInfo.length);
    try {
      for (const p_item of p_items) {
        set.add(p_item._id);
        if (result[p_item._id]) {
          result[p_item._id].name += p_item.product_name;
          result[p_item._id].purchase_count += p_item.received;
          result[p_item._id].purchase_amount += p_item.amount;
        } else {
          result[p_item._id] = {
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
    } catch (error) {
      console.log('error: 1', error);
      instance.send_Error('error: 1', error)
    }
    try {
      for (const p_item of p_refund_items) {
        set.add(p_item._id);
        if (result[p_item._id]) {
          result[p_item._id].name -= p_item.product_name;
          result[p_item._id].purchase_count -= p_item.received;
          result[p_item._id].purchase_amount -= p_item.amount;
        } else {
          result[p_item._id] = {
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
    } catch (error) {
      console.log('error: 2', error);
      instance.send_Error('error: 2', error)
    }
    try {
      for (const s of saleInfo) {
        if (s._id.length === 24) {
          set.add(s._id);
          if (result[s._id]) {
            result[s._id].name += s.name;
            result[s._id].sale_count += s.sale_count;
            result[s._id].sale_cost_of_goods == s.sale_cost_of_goods;
            result[s._id].sale_amount += s.amount;
          } else {
            result[s._id] = {
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
    } catch (error) {
      console.log('error: 3', error);
      instance.send_Error('error: 3', error)
    }

    const goods = await instance.goodsSales.aggregate([
      {
        $match: {
          _id: { $in: Object.keys(result).map(i => instance.ObjectId(i)) }
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
      goodsObj[good._id] = good
      if (result[good._id]) {
        // if (result[good._id].services) {
        result[good._id].end_stock = good.services.in_stock;
        result[good._id].name = good.name;
        result[good._id].start_stock = good.services.start_stock;
        result[good._id].cost = good.cost;
        result[good._id].price = good.services.price;
        result[good._id].prices = good.services.prices;
        // }
      } else {
        result[good._id] = {
          name: good.name,
          sale_count: 0,
          sale_cost_of_goods: 0,
          sale_amount: 0,
          purchase_count: 0,
          purchase_amount: 0,
          start_stock: good.services.in_stock,
          end_stock: good.services.in_stock,
          cost: good.cost,
          price: good.services.price,
          prices: good.services.prices,
        };
      }
    }
    const new_otchots = []

    for (const p_id of Object.keys(result)) {
      const service_info = {
        service_id: service_id,
        service_name: service_name,
        stock_monthly: {
          start_stock: result[p_id].start_stock,
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

      const otchot = await instance.goodsOtchot
        .findOne({
          product_id: p_id,
          organization: organization_id,
          month_name: time.month_name,
        })
        .lean()

      const date = new Date(time.end_time)
      if (!otchot) {
        if (goodsObj[p_id])
          new_otchots.push({
            organization: organization_id,
            month: `${date.getDate()}.${correctMonth(date.getMonth() + 1)}.${date.getFullYear()}`,
            month_name: time.month_name,
            start_time: time.start_time,
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
          if (new Date().getDate() === 1)
            otchot.services[service_index].start_stock = service_info.start_stock
          delete service_info.stock_monthly.start_stock
          otchot.services[service_index].service_id = service_info.service_id
          otchot.services[service_index].service_name = service_info.service_name
          otchot.services[service_index].stock_monthly = service_info.stock_monthly
          otchot.services[service_index].sale_monthly_info = service_info.sale_monthly_info
          otchot.services[service_index].purchase_monthly_info = service_info.purchase_monthly_info
        } else {
          otchot.services.push(service_info)
        }
        await instance.goodsOtchot.findByIdAndUpdate(
          otchot._id,
          otchot,
          { lean: true }
        );
      }
    }

    instance.goodsOtchot.insertMany(new_otchots, (err) => {
      if (err) {
        instance.send_Error('saving otchot', JSON.stringify(err))
      }
    })
  };

  /**
   * @param {Date} date
   * @param {boolean} calculate
   * if calculate equal false, only product sotck update
   */
  const calculateOrganizationsOtchot = async (date) => {
    const month = date.getMonth()
    const date_ = date.getDate()
    const year = date.getFullYear()

    const month_name = months[month]

    const start_date = new Date(`${month + 1}.${1}.${year}`)
    const end_date = new Date(`${month + 1}.${date_}.${year}`)
    end_date.setHours(23)
    end_date.setMinutes(59)
    end_date.setSeconds(59)
    end_date.setMilliseconds(999)
    // const start_date = new Date(`${8}.${1}.${2021}`)
    // const end_date = new Date(`${8}.${31}.${2021}`)
    console.log(start_date, end_date);

    const start_time = start_date.getTime()
    const end_time = end_date.getTime()
    console.log(new Date(start_time), start_time);
    console.log(new Date(end_time), end_time);

    const organizations = await instance.organizations
      .find(
        {},
        // { _id: '6305d062d18af98192f6a238' },
        { _id: 1 },
      )
      .lean()
    console.log(organizations.length, 'organizations.length');
    for (const org of organizations) {
      const services = await instance.services.find(
        { organization: org._id },
      )
        .lean()

      for (const service of services) {
        await calculateOrganizationOtchot(
          service.organization,
          service._id + '',
          service.name,
          {
            month_name: month_name,
            end_time: end_time,
            start_time: start_time,
          },
        )
      }
    }
    console.log('end...');
  }
  // calculateOrganizationsOtchot()

  const cronString_ = '59 23 * * *';
  if (!cronJob.validate(cronString_)) {
    instance.log.error('Invalid CRON_TIME is specified:', cronString_);
    // process.exit(1);
  } else
    cronJob.schedule(cronString_, async () => {
      const date = new Date()
      calculateOrganizationsOtchot(date, true)
    })

  /**
   * @param {Date} date
   */
  const insertProductsOtchotOnMonthOfFirstDay = async (organization_id, date) => {
    console.log("starting insertProductsOtchotOnMonthOfFirstDay");
    const month = date.getMonth()
    const year = date.getFullYear()

    const month_name = months[month]
    const start_date = new Date(`${month + 1}.${1}.${year}`)
    const start_time = start_date.getTime()

    const goods = await instance.goodsSales.aggregate([
      {
        $match: {
          organization: organization_id,
          updatedAt: { $exists: true }
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

    let new_otchots = []

    for (const good of goods) {

      const services_info = []
      for (const service of good.services) {
        const service_info = {
          service_id: service.service,
          service_name: service.service_name,
          stock_monthly: {
            start_stock: service.in_stock,
            end_stock: service.in_stock,
            cost: service.cost,
            price: service.price,
            prices: service.prices,
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

        services_info.push(service_info)
      }

      new_otchots.push({
        organization: good.organization,
        month: `${date.getDate()}.${correctMonth(date.getMonth() + 1)}.${date.getFullYear()}`,
        month_name: month_name,
        start_time: start_time,
        end_time: start_time,
        sku: good.sku,
        product_id: good._id,
        product_name: good.name,
        category_id: good.category_id,
        category_name: good.category_name,
        sold_by: good.sold_by,
        count_by_type: good.count_by_type,
        barcode_by_type: good.barcode_by_type,
        barcode: good.barcode,
        mxik: good.mxik ? good.mxik : '',
        services: services_info,
      })

      if (new_otchots.length === 50000) {
        await new Promise((res, rej) => {
          instance.goodsOtchot.insertMany(new_otchots, (err) => {
            if (err) rej(err)
            else res(true)
          })
        })
          .catch(err => {
            console.log('saving otchot, oyni boshida', JSON.stringify(err));
            instance.send_Error('saving otchot, oyni boshida', JSON.stringify(err))
          })

        new_otchots = []
      }
    }
  }

  // oy boshida stock yozib qo'yish
  const cronString00_00 = '00 00 * * *';
  if (!cronJob.validate(cronString00_00)) {
    instance.log.error('Invalid CRON_TIME is specified:', cronString00_00);
  } else
    cronJob.schedule(cronString00_00, async () => {
      const date = new Date();

      if (date.getDate() == 1) {
        const organizations = await instance.organizations
          .find(
            {},
            { _id: 1 },
          )
          .lean()
        console.log(organizations.length, 'organizations.length');

        for (const organization of organizations) {
          insertProductsOtchotOnMonthOfFirstDay(organization._id, date)
        }
      }
    })

  // /**
  //  * @param {Date} date
  //  * oyni oxirida stockni update qilish
  //  */
  // const updateProductsOtchotOnMonthOfLastDay = async (organizatio_id, date) => {
  //   console.log("starting updateProductsOtchotOnMonthOfLastDay");
  //   const month = date.getMonth()
  //   const month_name = months[month]
  //   const start = new Date().getTime();

  //   const otchotsObj = {}

  //   const otchots = await instance.goodsOtchot
  //     .find({ month_name: month_name, organization: organizatio_id })
  //     .lean()
  //   console.log(new Date().getTime() - start, `otchotsga ketgan vaqt`);
  //   console.log(otchots.length, `otchots.length`);

  //   for (const otchot of otchots) {
  //     otchotsObj[otchot.product_id] = otchot
  //   }

  //   const goods = await instance.goodsSales.aggregate([
  //     {
  //       $match: {
  //         organizatio: organizatio_id,
  //         $or: [
  //           { _id: { $in: otchots.map(otchot => instance.ObjectId(otchot.product_id)) } },
  //           { created_time: { $gte: new Date(`${date.getFullYear()}.${date.getMonth() + 1}.1`).getTime() } },
  //         ],
  //       },
  //     },
  //     {
  //       $project: {
  //         sku: 1,
  //         name: 1,
  //         category_id: 1,
  //         category_name: 1,
  //         sold_by: 1,
  //         count_by_type: 1,
  //         barcode_by_type: 1,
  //         barcode: 1,
  //         mxik: 1,
  //         cost: 1,
  //         services: 1,
  //       }
  //     }
  //   ])
  //     .allowDiskUse(true)
  //     .exec()
  //   console.log(new Date().getTime() - start, 'boshlanishidan goodsni olguncha ketgan vaqt');
  //   console.log(goods.length, `otchogoodsts.length`);

  //   let update_otchots = []
  //   for (const good of goods) {

  //     for (const g_service of good.services) {
  //       const service_index = otchotsObj[good._id].services.findIndex(serv =>
  //         serv.service_id + '' === g_service.service_id + ''
  //         || serv.service_id + '' === g_service.service + ''
  //       )

  //       const service_info = {
  //         service_id: g_service.service,
  //         service_name: "",
  //         stock_monthly: {
  //           start_stock: 0,
  //           end_stock: g_service.in_stock,
  //           cost: g_service.cost,
  //           price: g_service.price,
  //           prices: g_service.prices,
  //         },
  //         sale_monthly_info: {
  //           count: 0,
  //           cost_amount: 0,
  //           sale_amount: 0,
  //         },
  //         purchase_monthly_info: {
  //           count: 0,
  //           amount: 0,
  //         },
  //       }

  //       if (service_index >= 0) {
  //         otchotsObj[good._id].month = `${date.getDate()}.${correctMonth(date.getMonth() + 1)}.${date.getFullYear()}`

  //         otchotsObj[good._id].services[service_index].end_stock = g_service.in_stock
  //       } else {
  //         otchotsObj[good._id].services.push(service_info)
  //       }

  //       update_otchots.push({
  //         updateOne: {
  //           filter: { _id: otchotsObj[good._id]._id },
  //           update: { $set: otchotsObj[good._id] }
  //         }
  //       })
  //       // await instance.goodsOtchot.findByIdAndUpdate(otchot._id, otchot, { lean: true })
  //       //   .catch(err => {
  //       //     instance.send_Error('updating otchot, oyni oxirida', JSON.stringify(err))
  //       //   })
  //     }

  //     if (update_otchots.length > 50000) {
  //       console.log(`update_otchots.length: ${update_otchots.length}`);
  //       try {
  //         await instance.goodsOtchot.bulkWrite(update_otchots)
  //       } catch (err) {
  //         console.log(`error: ${err}`);
  //         instance.send_Error('updating otchot, oyni oxirida', JSON.stringify(err))
  //       }

  //       update_otchots = []
  //     }
  //   }
  //   console.log("the end updateProductsOtchotOnMonthOfLastDay");
  // }

  // // oy oxirida stock yozib qo'yish
  // const cronString23_59 = '59 23 * * *';
  // if (!cronJob.validate(cronString23_59)) {
  //   instance.log.error('Invalid CRON_TIME is specified:', cronString23_59);
  // } else
  //   cronJob.schedule(cronString23_59, async () => {
  //     const date = new Date();
  //     const date_ = date.getDate()
  //     const month = date.getMonth()

  //     const month_name = months[month]
  //     let calculate = false
  //     switch (month_name) {
  //       case 'January':
  //         calculate = date_ == 31
  //         break;
  //       case 'February':
  //         calculate = date_ == 28 || date_ == 29
  //         break;
  //       case 'March':
  //         calculate = date_ == 31
  //         break;
  //       case 'April':
  //         calculate = date_ == 30
  //         break;
  //       case 'May':
  //         calculate = date_ == 31
  //         break;
  //       case 'June':
  //         calculate = date_ == 30
  //         break;
  //       case 'July':
  //         calculate = date_ == 31
  //         break;
  //       case 'August':
  //         calculate = date_ == 31
  //         break;
  //       case 'September':
  //         calculate = date_ == 30
  //         break;
  //       case 'October':
  //         calculate = date_ == 31
  //         break;
  //       case 'November':
  //         calculate = date_ == 30
  //         break;
  //       case 'December':
  //         calculate = date_ == 31
  //         break;
  //       default:
  //         break;
  //     }

  //     if (calculate) {

  //       const organizations = await instance.organizations
  //         .find(
  //           {},
  //           { _id: 1 },
  //         )
  //         .lean()
  //       console.log(organizations.length, 'organizations.length');

  //       for (const organization of organizations) {
  //         updateProductsOtchotOnMonthOfLastDay(organization._id, date)
  //       }
  //     }
  //   })

  next();
});
