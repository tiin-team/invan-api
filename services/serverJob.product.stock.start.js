const cronJob = require("node-cron");
const fp = require("fastify-plugin");

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

  async function insertGoodsOtchot(new_otchots) {
    console.log('goodsOtchot inserting...');
    await new Promise((res, rej) => {
      instance.goodsOtchot.insertMany(new_otchots, (err) => {
        if (err) rej(err)
        else res(true)
      })
    })
      .catch(err => {
        console.log('saving otchot, kun boshida', JSON.stringify(err));
        instance.send_Error('saving otchot, kun boshida', JSON.stringify(err))
      })
  }

  async function insertGoodsDailyReport(new_goods_daily_reports) {
    console.log('GoodsDailyStock inserting...');
    await new Promise((res, rej) => {
      instance.GoodsDailyStock.insertMany(new_goods_daily_reports, (err) => {
        if (err) rej(err)
        else res(true)
      })
    })
      .catch(err => {
        console.log('saving new_goods_daily_reports, kun boshida', JSON.stringify(err));
        instance.send_Error('saving new_goods_daily_reports, kun boshida', JSON.stringify(err))
      })
  }

  /**
   * ******************************************************
   * *                                                    *
   * *   Kun boshida Productlarni stockini yozib qo'yish  *
   * *                                                    *
   * ******************************************************
   */

  /**
   * @param {Date} date
   */
  const insertProductsOtBeginningOfTheDay = async (organization_id, date) => {
    console.log(`starting for organization_id: ${organization_id} date: ${date}`);
    const month = date.getMonth()
    const year = date.getFullYear()

    const month_name = months[month]
    const start_date = new Date(`${month + 1}.${date.getDate()}.${year}`)
    const date_string = `${date.getDate()}.${correctMonth(date.getMonth() + 1)}.${date.getFullYear()}`
    const start_time = start_date.getTime()

    const goods = await instance.goodsSales.aggregate([
      {
        $match: {
          organization: organization_id + '',
          // updatedAt: { $exists: true }
        },
      },
      {
        $project: {
          sku: 1,
          name: 1,
          organization: 1,
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

    let new_otchots = [],
      new_goods_daily_reports = []

    console.log(`goods.length: ${goods.length}`);
    for (const good of goods) {

      const services_info = []
      for (const service of good.services) {

        const start_stock = service.in_stock != null && !isNaN(service.in_stock) ? service.in_stock : 0
        const service_info = {
          service_id: service.service,
          service_name: service.service_name,
          stock_monthly: {
            start_stock: start_stock,
            end_stock: start_stock,
            cost: service.cost ? service.cost : good.cost,
            // cost: service.cost,
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

      new_goods_daily_reports.push({
        organization: organization_id,
        month: date_string,
        month_name: month_name,
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
      })

      new_otchots.push({
        organization: good.organization,
        month: date_string,
        period_type: 'day',
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

      if (new_goods_daily_reports.length >= 20000) {
        await insertGoodsDailyReport(new_goods_daily_reports)

        new_goods_daily_reports = []
      }

      if (new_otchots.length >= 20000) {
        await insertGoodsOtchot(new_otchots)

        new_otchots = []
      }
    }
    console.log('new_otchots.length', new_otchots.length);

    // await instance.goodsOtchot.deleteMany({})

    await insertGoodsOtchot(new_otchots)
    new_otchots = []

    console.log('the end!');
  }

  // kun boshida stock yozib qo'yish
  const cronString00_00 = '00 00 * * *';
  if (!cronJob.validate(cronString00_00)) {
    instance.log.error('Invalid CRON_TIME is specified:', cronString00_00);
  } else {
    cronJob.schedule(cronString00_00, async () => {
      const date = new Date();

      const organizations = await instance.organizations
        .find(
          {},
          { _id: 1 },
        )
        .lean()
      console.log(organizations.length, 'organizations.length');

      for (const organization of organizations) {
        await insertProductsOtBeginningOfTheDay(organization._id, date)
      }
    });
    console.log(`cronjon success run: ${cronString00_00}`);
  }
  // (async () => {
  //   const date = new Date();

  //   const organizations = await instance.organizations
  //     .find(
  //       { _id: "5d398917ff92e71a1b765b98" },
  //       { _id: 1 },
  //     )
  //     .lean()
  //   console.log(organizations.length, 'organizations.length');

  //   for (const organization of organizations) {
  //     insertProductsOtBeginningOfTheDay(organization._id, date)
  //   }

  // })()
  next();
});
