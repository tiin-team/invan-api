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
   * ******************************************************
   * *                                                    *
   * *   Oy oxirida oylik otchot yozib qo'yish            *
   * *                                                    *
   * ******************************************************
   */

  /**
   * @param {Date} date
   */
  const calculateMonthlyReport = async (organization_id, date) => {
    console.log(`starting for organization_id: ${organization_id} date: ${date}`);
    const month = date.getMonth()
    const year = date.getFullYear()

    const month_name = months[month]

    const $match = {
      $match: {
        organization: organization_id + '',
        month_name: month_name,
      }
    }

    const $group = {
      $group: {
        _id: '$product_id',
        organization: { $last: '$organization' },
        month: { $last: '$month' },
        month_name: { $last: '$month_name' },
        start_time: { $first: '$start_time' },
        end_time: { $last: '$end_time' },
        sku: { $last: '$sku' },
        product_name: { $last: '$product_name' },
        category_id: { $last: '$category_id' },
        category_name: { $last: '$category_name' },
        sold_by: { $last: '$sold_by' },
        count_by_type: { $last: '$count_by_type' },
        barcode_by_type: { $last: '$barcode_by_type' },
        barcode: { $last: '$barcode' },
        mxik: { $last: '$mxik' },
        services_first: { $first: '$services' },
        services_last: { $last: '$services' },
        all_services: { $push: '$services' },
        // purchase_monthly_info: {
        //   $sum: { // sum qilish xato
        //     $function: {
        //       body: `
        //         function(services) {
        //           return services
        //         }
        //       `,
        //       'args': [
        //         '$services'
        //       ],
        //       'lang': 'js'
        //     }
        //   }
        // }
      }
    }

    const otchots = await instance.goodsOtchot
      .aggregate([$match])
      .allowDiskUse()
      .exec()
    const insert_otchots = []
    for (const otchot of otchots) {
      insert_otchots.push({
        organization: otchot.organization,
        month: `${date.getDate()}.${correctMonth(date.getMonth() + 1)}.${date.getFullYear()}`,
        month_name: month_name,
        period_type: 'month',
        start_time: otchot.start_time,
        end_time: otchot.end_time,
        sku: otchot.sku,
        product_id: otchot.product_id,
        product_name: otchot.product_name,
        category_id: otchot.category_id,
        category_name: otchot.category_name,
        sold_by: otchot.sold_by,
        count_by_type: otchot.count_by_type,
        barcode_by_type: otchot.barcode_by_type,
        barcode: otchot.barcode,
        mxik: otchot.mxik,
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
    }
  }

  // // oy oxirida calculate report
  // const lastDayOfMonthcronJobs = [
  //   '59 23 30 4,6,9,11 *',
  //   '59 23 31 1,3,5,7,8,10,12 *',
  //   '59 23 28 2 *',
  // ]

  // for (const cr of lastDayOfMonthcronJobs) {
  //   if (!cronJob.validate(cr)) {
  //     instance.log.error('Invalid CRON_TIME is specified:', cr);
  //   } else
  //     cronJob.schedule(cr, async () => {
  //       const date = new Date();

  //       const organizations = await instance.organizations
  //         .find({}, { _id: 1 })
  //         .lean();

  //       console.log(organizations.length, 'organizations.length');

  //       for (const organization of organizations) {
  //         await calculateMonthlyReport(organization._id, date)
  //       }
  //     });
  // }

  next();
});
