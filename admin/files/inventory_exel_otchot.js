const ExcelJs = require('exceljs');
const fs = require('fs');
const path = require('path')
const fp = require('fastify-plugin')

const removeBorders = (worksheet, list) => {
  for (const cell of list) {
    worksheet.getCell(cell.cell).border = {
      top: { style: 'thin', color: { argb: cell.top ? cell.top : 'FFFFFFFF' } },
      left: { style: 'thin', color: { argb: cell.left ? cell.left : 'FFFFFFFF' } },
      bottom: { style: 'thin', color: { argb: cell.bottom ? cell.bottom : 'FFFFFFFF' } },
      right: { style: 'thin', color: { argb: cell.right ? cell.right : 'FFFFFFFF' } }
    }
  }
}

const borderStyle4 = {
  top: { color: { argb: '000000' }, style: 'thin' },
  right: { color: { argb: '000000' }, style: 'thin' },
  bottom: { color: { argb: '000000' }, style: 'thin' },
  left: { color: { argb: '000000' }, style: 'thin' },
}

const multiMergeCells = (worksheet, list) => {
  for (const cell of list) {
    worksheet.mergeCells(cell)
  }
}
/**
 * @param { ExcelJs.Worksheet} worksheet
 * @param {[{cell: string, fColor: string, value: string}]} list
 * 
*/
const multiFillCells = (worksheet, list) => {
  for (const cell of list) {
    worksheet.getCell(cell.cell).value = cell.value
    worksheet.getCell(cell.cell).style = {
      font: { name: 'Calibri', size: 12, bold: true },
      border: borderStyle4,
      alignment: {
        horizontal: "center",
        vertical: "middle",
      },
      fill: {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: cell.fColor },
      },
      protection: { locked: false }
    }
    if (['G6', 'H6', 'I6', 'J6', 'K6', 'L6', 'M6', 'N6'].includes(cell.cell))
      worksheet.getColumn(cell.cell[0]).width = 13
    // if (['H7', 'I7'].includes(cell.cell))
    //   worksheet.getColumn(cell.cell[0]).width = 20
    if (cell.cell === 'D5')
      worksheet.getColumn(cell.cell[0]).width = 28
    if (cell.cell === 'E5')
      worksheet.getColumn(cell.cell[0]).width = 20
  }
}

/**
 * @param { ExcelJs.Worksheet} worksheet
 * @param {{start_time: string, end_time: string}} data
 * 
*/
const makeInventoryOtchotHeader = (worksheet, data) => {
  multiMergeCells(worksheet, [
    'B5:B6', 'C5:C6', 'D5:D6', 'E5:E6', 'F5:F6',
    'G5:H5', 'I5:J5', 'K5:L5', 'M5:N5', 'C7:F7',
  ])

  multiFillCells(worksheet, [
    { cell: 'B5', fColor: 'FCF4A4', value: '' },
    { cell: 'B7', fColor: 'FCF4A4', value: '' },
    { cell: 'C5', fColor: 'FCF4A4', value: `Баркод` },
    { cell: 'C7', fColor: 'FCF4A4', value: '' },
    { cell: 'D5', fColor: 'FCF4A4', value: `Наименование` },
    { cell: 'E5', fColor: 'FCF4A4', value: `Ед. изм.` },
    { cell: 'F5', fColor: 'FCF4A4', value: `Цена` },
    { cell: 'G5', fColor: 'FCF4A4', value: `Остаток на ${data.start_time}` },
    { cell: 'G6', fColor: 'FCF4A4', value: `Количество` },
    { cell: 'G7', fColor: 'FCF4A4', value: `` },
    { cell: 'H6', fColor: 'FCF4A4', value: `Сумма` },
    { cell: 'H7', fColor: 'FCF4A4', value: `` },
    { cell: 'I5', fColor: 'FCF4A4', value: `Приход` },
    { cell: 'I6', fColor: 'FCF4A4', value: `Количество` },
    { cell: 'I7', fColor: 'FCF4A4', value: `` },
    { cell: 'J6', fColor: 'FCF4A4', value: `Сумма` },
    { cell: 'J7', fColor: 'FCF4A4', value: `` },
    { cell: 'K5', fColor: 'FCF4A4', value: `Расход` },
    { cell: 'K6', fColor: 'FCF4A4', value: `Количество` },
    { cell: 'K7', fColor: 'FCF4A4', value: `` },
    { cell: 'L6', fColor: 'FCF4A4', value: `Сумма` },
    { cell: 'L7', fColor: 'FCF4A4', value: `` },
    { cell: 'M5', fColor: 'FCF4A4', value: `Остаток на ${data.end_time}` },
    { cell: 'M6', fColor: 'FCF4A4', value: `Количество` },
    { cell: 'M7', fColor: 'FCF4A4', value: `` },
    { cell: 'N6', fColor: 'FCF4A4', value: `Сумма` },
    { cell: 'N7', fColor: 'FCF4A4', value: `` },
  ])


  const row5 = worksheet.getRow(5);

  for (const cell of row5._cells) {
    if (cell) {
      if (
        cell._address[0] !== 'B' ||
        cell._address[0] !== 'C' ||
        cell._address[0] !== 'D' ||
        cell._address[0] !== 'E' ||
        cell._address[0] !== 'F'
      ) {
        if (cell._address[0] === 'N') {
          cell.style.border =
          {
            ...cell.style.border,
            right: { color: { argb: '000000' }, style: 'thin' },
            top: { color: { argb: '000000' }, style: 'thin' },
            bottom: { color: { argb: '000000' }, style: 'thin' },
          }
        } else
          cell.style.border =
          {
            ...cell.style.border,
            top: { color: { argb: '000000' }, style: 'thin' },
            bottom: { color: { argb: '000000' }, style: 'thin' },
          }
      }
    }
  }

  const row6 = worksheet.getRow(6);
  row6.height = 60

  for (const cell of row6._cells) {
    if (cell) {
      if (
        cell._address[0] !== 'D' ||
        cell._address[0] !== 'E'
      ) {
        cell.style.border =
        {
          ...cell.style.border,
          left: { color: '000000', style: 'thin' },
          right: { color: '000000', style: 'thin' },
        }
      }
    }
  }

  const row7 = worksheet.getRow(7);

  for (const cell of row7._cells) {
    if (cell) {
      if (cell._address[0] === 'D') {
        cell.style.border =
        {
          left: { color: '000000', style: 'thin' },
          // right: { color: '000000', style: 'thin' },
          top: { color: { argb: '000000' }, style: 'thin' },
          bottom: { color: { argb: '000000' }, style: 'thin' },
        }
      } if (cell._address[0] === 'E') {
        cell.style.border =
        {
          // left: { color: '000000', style: 'thin' },
          right: { color: '000000', style: 'thin' },
          top: { color: { argb: '000000' }, style: 'thin' },
          bottom: { color: { argb: '000000' }, style: 'thin' },
        }
      }
      if (cell._address[0] === 'D') {
        cell.style.border =
        {
          left: { color: '000000', style: 'thin' },
          // right: { color: '000000', style: 'thin' },
          top: { color: { argb: '000000' }, style: 'thin' },
          bottom: { color: { argb: '000000' }, style: 'thin' },
        }
      } if (cell._address[0] === 'F') {
        cell.style.border = borderStyle4
      } else {
        cell.style.border =
        {
          ...cell.style.border,
          left: { color: '000000', style: 'thin' },
          right: { color: '000000', style: 'thin' },
        }
      }
    }
  }
}

/**
 * 
 * @param {number} num 
 * @param {number} def 
 * @returns {number}
 */
const getNumberOrDefault = (num, def) => typeof num === 'number' && num > 0 ? num : def

module.exports = fp((instance, _, next) => {
  const version = { version: '2.0.0' }
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

  // /**
  //  * 
  //  * @param {string} organization_id 
  //  * @param {string} service_id 
  //  * @param {Date} min_date 
  //  * @param {Date} max_date 
  //  */
  // const getReports = async (organization_id, service_id, min_date, max_date) => {

  //   const
  //     min_date_month = `${min_date.getDate()}.${min_date.getMonth() + 1}.${min_date.getFullYear()}`,
  //     max_date_month = `${max_date.getDate()}.${max_date.getMonth() + 1}.${max_date.getFullYear()}`,
  //     reportsObj = {},
  //     exelItems = []

  //   const data = instance.goodsOtchot
  //     .find({
  //       organization: organization_id + '',
  //       period_type: 'day',
  //       // start_time: { $gte: min_date.getTime() },
  //       // end_time: { $lte: max_date.getTime() },
  //       // createdAt: { $gte: min_date, $lte: max_date },
  //       // month: { $regex: month, $options: 'i' },
  //       // month_name: month_name,
  //     })

  //   const reportCursor = data.cursor({ batchSize: 10 })
  //   // console.log(await reportCursor);
  //   let
  //     doc = await reportCursor.next(),
  //     index = 1,
  //     ostatok_start_stock = 0,
  //     ostatok_start_sum = 0,
  //     ostatok_stock = 0,
  //     ostatok_sum = 0,
  //     prixod_stock = 0,
  //     prixod_sum = 0,
  //     rasxod_stock = 0,
  //     rasxod_sum = 0,
  //     end_stock = 0,
  //     start_stock = 0,
  //     services_cost = 0,
  //     purchase_monthly_info_count = 0,
  //     purchase_monthly_info_amount = 0,
  //     sale_monthly_info_count = 0,
  //     sale_monthly_info_sale_amount = 0

  //   while (doc) {
  //     const services = doc.services.filter(s => s.service_id + '' == service_id)[0]
  //     if (!services) {
  //       doc = await reportCursor.next()
  //       continue
  //     }

  //     if (reportsObj[doc.product_id]) {
  //       if (doc.month == min_date_month)
  //         reportsObj[doc.product_id].stock_monthly.start_stock += services.purchase_monthly_info.start_stock
  //       if (doc.month == max_date_month)
  //         reportsObj[doc.product_id].stock_monthly.end_stock += services.purchase_monthly_info.end_stock

  //       reportsObj[doc.product_id].purchase_monthly_info.count += services.purchase_monthly_info.count
  //       reportsObj[doc.product_id].purchase_monthly_info.amount += services.purchase_monthly_info.amount
  //       reportsObj[doc.product_id].sale_monthly_info.count += services.sale_monthly_info.count
  //       reportsObj[doc.product_id].sale_monthly_info.sale_amount += services.sale_monthly_info.amount
  //     } else {
  //       reportsObj[doc.product_id] = {
  //         services: {
  //           cost: services.stock_monthly.cost ? services.stock_monthly.cost : services.cost,
  //           purchase_monthly_info: {
  //             count: services.purchase_monthly_info.count,
  //             amount: services.purchase_monthly_info.amount,
  //           },
  //           sale_monthly_info: {
  //             count: services.sale_monthly_info.count,
  //             sale_amount: services.sale_monthly_info.amount,
  //           },
  //           stock_monthly: {
  //             start_stock: doc.month == min_date_month ? services.stock_monthly.start_stock : 0,
  //             end_stock: doc.month == max_date_month ? services.stock_monthly.end_stock : 0,
  //           },
  //         },
  //       };

  //       end_stock = getNumberOrDefault(services.stock_monthly.end_stock, 0)
  //       start_stock = getNumberOrDefault(services.stock_monthly.start_stock, 0)
  //       services_cost = getNumberOrDefault(services.cost, 0)
  //       purchase_monthly_info_count = getNumberOrDefault(services.purchase_monthly_info.count, 0)
  //       purchase_monthly_info_amount = getNumberOrDefault(services.purchase_monthly_info.amount, 0)
  //       sale_monthly_info_count = getNumberOrDefault(services.sale_monthly_info.count, 0)
  //       sale_monthly_info_sale_amount = getNumberOrDefault(services.sale_monthly_info.sale_amount, 0)

  //       ostatok_start_stock += start_stock
  //       ostatok_start_sum += start_stock * services_cost
  //       ostatok_stock += purchase_monthly_info_count
  //       ostatok_sum += purchase_monthly_info_amount
  //       prixod_stock += sale_monthly_info_count
  //       prixod_sum += sale_monthly_info_sale_amount
  //       rasxod_stock += end_stock
  //       rasxod_sum += end_stock * services_cost

  //       exelItems.push([
  //         index,
  //         Array.isArray(doc.barcode) ? doc.barcode.reduce((a, b) => `${a}${b},`, '') : '',
  //         doc.product_name,
  //         instance.i18n.__(doc.sold_by),
  //         services_cost.toFixed(2),
  //         start_stock.toFixed(2), // End time count
  //         (start_stock * services_cost).toFixed(2), // End time count
  //         purchase_monthly_info_count.toFixed(2), // Prixod count
  //         purchase_monthly_info_amount.toFixed(2), // Prixod sum
  //         sale_monthly_info_count.toFixed(2), // Rasxod count
  //         sale_monthly_info_sale_amount.toFixed(2), // Rasxod sum
  //         end_stock.toFixed(2), // End Time sum
  //         // doc.services.stock_monthly.end_stock * doc.services.stock_monthly.cost, // End Time sum
  //         end_stock * services_cost,
  //         // (
  //         //   end_stock
  //         //   * (purchase_monthly_info_amount / purchase_monthly_info_count)
  //         // ).toFixed(2), // End Time sum
  //       ])
  //     }
  //     doc = await reportCursor.next()
  //   }

  //   console.log('Done')
  //   return {
  //     exelItems: exelItems,
  //     ostatok_start_stock: ostatok_start_stock,
  //     ostatok_start_sum: ostatok_start_sum,
  //     ostatok_stock: ostatok_stock,
  //     ostatok_sum: ostatok_sum,
  //     prixod_stock: prixod_stock,
  //     prixod_sum: prixod_sum,
  //     rasxod_stock: rasxod_stock,
  //     rasxod_sum: rasxod_sum,
  //   }
  // }

  /**
 * 
 * @param {string} organization_id 
 * @param {string} service_id 
 * @param {Date} start_date 
 * @param {Date} end_date 
 */
  const getReports = async (organization_id, service_id, start_date, end_date) => {

    const
      min_date_month = `${start_date.getDate()}.${start_date.getMonth() + 1}.${start_date.getFullYear()}`,
      max_date_month = `${end_date.getDate()}.${end_date.getMonth() + 1}.${end_date.getFullYear()}`,
      reportsObj = {},
      exelItems = []

    const data = await instance.goodsOtchot
      .find({
        organization: organization_id + '',
        period_type: 'day',
        // start_time: { $gte: min_date.getTime() },
        // end_time: { $lte: max_date.getTime() },
        createdAt: { $gte: start_date, $lte: end_date },
        // month: { $regex: month, $options: 'i' },
        // month_name: month_name,
      })
      .lean()
    console.log(start_date.getTime(), end_date.getTime());
    let
      ostatok_start_stock = 0,
      ostatok_start_sum = 0,
      ostatok_stock = 0,
      ostatok_sum = 0,
      prixod_stock = 0,
      prixod_sum = 0,
      rasxod_stock = 0,
      rasxod_sum = 0,
      end_stock = 0,
      start_stock = 0,
      services_start_cost = 0,
      services_end_cost = 0,
      purchase_monthly_info_count = 0,
      purchase_monthly_info_amount = 0,
      sale_monthly_info_count = 0,
      sale_monthly_info_sale_amount = 0

    for (const doc of data) {

      const services = doc.services.filter(s => s.service_id + '' == service_id)[0]
      if (!services) {
        continue
      }

      if (reportsObj[doc.product_id + '']) {
        if (doc.month == min_date_month) {
          reportsObj[doc.product_id + ''].services.stock_monthly.start_stock = services.stock_monthly.start_stock
          reportsObj[doc.product_id + ''].services.stock_monthly.start_cost = services.stock_monthly.cost
        }
        if (doc.month == max_date_month) {
          reportsObj[doc.product_id + ''].services.stock_monthly.end_stock = services.stock_monthly.end_stock
          reportsObj[doc.product_id + ''].services.stock_monthly.end_cost = services.stock_monthly.cost
        }

        reportsObj[doc.product_id + ''].services.purchase_monthly_info.count += services.purchase_monthly_info.count
        reportsObj[doc.product_id + ''].services.purchase_monthly_info.amount += services.purchase_monthly_info.amount
        reportsObj[doc.product_id + ''].services.sale_monthly_info.count += services.sale_monthly_info.count
        reportsObj[doc.product_id + ''].services.sale_monthly_info.sale_amount += services.sale_monthly_info.sale_amount
      } else {
        reportsObj[doc.product_id + ''] = {
          sku: doc.sku,
          product_name: doc.product_name,
          barcode: doc.barcode,
          sold_by: doc.sold_by,
          services: {
            cost: services.stock_monthly.cost ? services.stock_monthly.cost : services.cost,
            purchase_monthly_info: {
              count: services.purchase_monthly_info.count,
              amount: services.purchase_monthly_info.amount,
            },
            sale_monthly_info: {
              count: services.sale_monthly_info.count,
              sale_amount: services.sale_monthly_info.sale_amount,
            },
            stock_monthly: {
              start_stock: doc.month == min_date_month ? services.stock_monthly.start_stock : 0,
              end_stock: doc.month == max_date_month ? services.stock_monthly.end_stock : 0,
              start_cost: services.stock_monthly.cost,
              end_cost: services.stock_monthly.cost,
            },
          },
        };
      }
    }

    for (const doc of Object.values(reportsObj)) {

      end_stock = getNumberOrDefault(doc.services.stock_monthly.end_stock, 0)
      start_stock = getNumberOrDefault(doc.services.stock_monthly.start_stock, 0)
      services_start_cost = getNumberOrDefault(doc.services.stock_monthly.start_cost, 0)
      services_end_cost = getNumberOrDefault(doc.services.stock_monthly.end_cost, 0)
      purchase_monthly_info_count = getNumberOrDefault(doc.services.purchase_monthly_info.count, 0)
      purchase_monthly_info_amount = getNumberOrDefault(doc.services.purchase_monthly_info.amount, 0)
      sale_monthly_info_count = getNumberOrDefault(doc.services.sale_monthly_info.count, 0)
      sale_monthly_info_sale_amount = getNumberOrDefault(doc.services.sale_monthly_info.sale_amount, 0)

      ostatok_start_stock += start_stock
      ostatok_start_sum += start_stock * services_start_cost
      ostatok_stock += purchase_monthly_info_count
      ostatok_sum += purchase_monthly_info_amount
      prixod_stock += sale_monthly_info_count
      prixod_sum += sale_monthly_info_sale_amount
      rasxod_stock += end_stock
      rasxod_sum += end_stock * services_end_cost

      exelItems.push([
        doc.sku,
        Array.isArray(doc.barcode) ? doc.barcode.reduce((a, b) => `${a}${b},`, '') : '',
        doc.product_name,
        instance.i18n.__(doc.sold_by),
        services_start_cost.toFixed(2),
        start_stock.toFixed(2), // End time count
        (start_stock * services_start_cost).toFixed(2), // End time count
        purchase_monthly_info_count.toFixed(2), // Prixod count
        purchase_monthly_info_amount.toFixed(2), // Prixod sum
        sale_monthly_info_count.toFixed(2), // Rasxod count
        sale_monthly_info_sale_amount.toFixed(2), // Rasxod sum
        end_stock.toFixed(2), // End Time sum
        end_stock * services_end_cost,
      ])
    }

    console.log('Done')
    return {
      min_date: start_date,
      max_date: end_date,
      exelItems: exelItems,
      ostatok_start_stock: ostatok_start_stock,
      ostatok_start_sum: ostatok_start_sum,
      ostatok_stock: ostatok_stock,
      ostatok_sum: ostatok_sum,
      prixod_stock: prixod_stock,
      prixod_sum: prixod_sum,
      rasxod_stock: rasxod_stock,
      rasxod_sum: rasxod_sum,
    }
  }

  // const inventoryOtchotXLSX = async (request, reply, user) => {
  //   try {
  //     const { service_id, min, max } = request.params
  //     const min_date = new Date(parseInt(min))
  //     const max_date = new Date(parseInt(max))
  //     if (min_date.toString() === 'Invalid Date' || max_date.toString() === 'Invalid Date') {
  //       return reply.error('Invalid Date')
  //     }

  //     const organization = await instance.organizations
  //       .findById(user.organization)
  //       .lean()
  //     if (!organization) {
  //       return reply.fourorfour('Organization')
  //     }

  //     const $match = {
  //       $match: {
  //         organization: organization._id + '',
  //         period_type: 'day',
  //         // start_time: { $gte: min_date.getTime() },
  //         // end_time: { $lte: max_date.getTime() },
  //         createdAt: { $gte: min_date, $lte: max_date },
  //         // month: { $regex: month, $options: 'i' },
  //         // month_name: month_name,
  //       }
  //     }

  //     const $sort = {
  //       $sort: { createdAt: 1 }
  //     }

  //     const $project = {
  //       $project: {
  //         organization: 1,
  //         month: 1,
  //         month_name: 1,
  //         start_time: 1,
  //         end_time: 1,
  //         sku: 1,
  //         product_id: 1,
  //         product_name: 1,
  //         category_id: 1,
  //         category_name: 1,
  //         sold_by: 1,
  //         count_by_type: 1,
  //         barcode_by_type: 1,
  //         barcode: 1,
  //         mxik: 1,
  //         services: {
  //           $first: {
  //             $filter: {
  //               input: "$services",
  //               as: "service",
  //               cond: {
  //                 $eq: [{ $toString: "$$service.service_id" }, service_id + ''],
  //               },
  //             },
  //           },
  //         },
  //         createdAt: 1,
  //       }
  //     }

  //     const $group = {
  //       $group: {
  //         _id: "$product_id",
  //         organization: { $last: "$organization" },
  //         start_time: { $first: "$organization" },
  //         end_time: { $last: "$end_time" },
  //         sku: { $last: "$sku" },
  //         product_id: { $last: "$product_id" },
  //         product_name: { $last: "$product_name" },
  //         category_id: { $last: "$category_id" },
  //         category_name: { $last: "$category_name" },
  //         sold_by: { $last: "$sold_by" },
  //         count_by_type: { $last: "$count_by_type" },
  //         barcode_by_type: { $last: "$barcode_by_type" },
  //         barcode: { $last: "$barcode" },
  //         mxik: { $last: "$mxik" },
  //         services: { $push: "$services" },
  //         first_createdAt: { $first: "$createdAt" },
  //         last_createdAt: { $last: "$createdAt" },
  //       }
  //     }

  //     const data = await instance.goodsOtchot
  //       .aggregate([$match, $sort, $project, $group])
  //       .allowDiskUse(true)
  //       .exec()

  //     for (const report of data) {
  //       let
  //         purchase_monthly_info_count = 0,
  //         purchase_monthly_info_amount = 0,
  //         sale_monthly_info_count = 0,
  //         sale_monthly_info_sale_amount = 0,
  //         cost = 0,
  //         start_stock = 0,
  //         end_stock = 0

  //       for (const serv of report.services) {
  //         purchase_monthly_info_count += serv.purchase_monthly_info.count
  //         purchase_monthly_info_amount += serv.purchase_monthly_info.amount
  //         sale_monthly_info_count += serv.sale_monthly_info.count
  //         sale_monthly_info_sale_amount += serv.sale_monthly_info.sale_amount
  //       }


  //       if (report.services && report.services.length > 0) {
  //         cost = report.services[0].stock_monthly.cost ?
  //           report.services[0].stock_monthly.cost
  //           : report.services[0].cost
  //             ? report.services[0].cost
  //             : 0
  //         start_stock = report.services[0].stock_monthly.start_stock
  //         end_stock = report.services[report.services.length - 1].stock_monthly.end_stock
  //       }

  //       report.services = {
  //         cost: cost,
  //         purchase_monthly_info: {
  //           count: purchase_monthly_info_count,
  //           amount: purchase_monthly_info_amount,
  //         },
  //         sale_monthly_info: {
  //           count: sale_monthly_info_count,
  //           sale_amount: sale_monthly_info_sale_amount,
  //         },
  //         stock_monthly: {
  //           start_stock: start_stock,
  //           end_stock: end_stock,
  //         },
  //       }
  //     }

  //     const exelItems = []
  //     let index = 1,
  //       ostatok_start_stock = 0,
  //       ostatok_start_sum = 0,
  //       ostatok_stock = 0,
  //       ostatok_sum = 0,
  //       prixod_stock = 0,
  //       prixod_sum = 0,
  //       rasxod_stock = 0,
  //       rasxod_sum = 0,
  //       end_stock = 0,
  //       start_stock = 0,
  //       services_cost = 0,
  //       purchase_monthly_info_count = 0,
  //       purchase_monthly_info_amount = 0,
  //       sale_monthly_info_count = 0,
  //       sale_monthly_info_sale_amount = 0

  //     for (const item of data) {
  //       if (item.services) {
  //         end_stock = getNumberOrDefault(item.services.stock_monthly.end_stock, 0)
  //         start_stock = getNumberOrDefault(item.services.stock_monthly.start_stock, 0)
  //         services_cost = getNumberOrDefault(item.services.cost, 0)
  //         purchase_monthly_info_count = getNumberOrDefault(item.services.purchase_monthly_info.count, 0)
  //         purchase_monthly_info_amount = getNumberOrDefault(item.services.purchase_monthly_info.amount, 0)
  //         sale_monthly_info_count = getNumberOrDefault(item.services.sale_monthly_info.count, 0)
  //         sale_monthly_info_sale_amount = getNumberOrDefault(item.services.sale_monthly_info.sale_amount, 0)

  //         ostatok_start_stock += start_stock
  //         ostatok_start_sum += start_stock * services_cost
  //         ostatok_stock += purchase_monthly_info_count
  //         ostatok_sum += purchase_monthly_info_amount
  //         prixod_stock += sale_monthly_info_count
  //         prixod_sum += sale_monthly_info_sale_amount
  //         rasxod_stock += end_stock
  //         rasxod_sum += end_stock * services_cost

  //         exelItems.push([
  //           index,
  //           Array.isArray(item.barcode) ? item.barcode.reduce((a, b) => `${a}${b},`, '') : '',
  //           item.product_name,
  //           instance.i18n.__(item.sold_by),
  //           services_cost.toFixed(2),
  //           start_stock.toFixed(2), // End time count
  //           (start_stock * services_cost).toFixed(2), // End time count
  //           purchase_monthly_info_count.toFixed(2), // Prixod count
  //           purchase_monthly_info_amount.toFixed(2), // Prixod sum
  //           sale_monthly_info_count.toFixed(2), // Rasxod count
  //           sale_monthly_info_sale_amount.toFixed(2), // Rasxod sum
  //           end_stock.toFixed(2), // End Time sum
  //           // item.services.stock_monthly.end_stock * item.services.stock_monthly.cost, // End Time sum
  //           end_stock * services_cost,
  //           // (
  //           //   end_stock
  //           //   * (purchase_monthly_info_amount / purchase_monthly_info_count)
  //           // ).toFixed(2), // End Time sum
  //         ])
  //         index++
  //       }
  //     }

  //     const headers = [
  //       { name: '№', key: '1' },
  //       { name: 'A', key: '2' },
  //       { name: `A`, key: '3' },
  //       { name: 'A', key: '4' },
  //       { name: `Итого по ${organization.name}`, key: '5' },
  //       // { name: `${instance.i18n.__('total')} ${ostatok_start_stock.toFixed(2)}`, key: '6' },
  //       { name: ostatok_start_stock.toFixed(2), key: '6' },
  //       { name: ostatok_start_sum.toFixed(2), key: '7' },
  //       { name: ostatok_stock.toFixed(2), key: '8' },
  //       { name: ostatok_sum.toFixed(2), key: '9' },
  //       { name: prixod_stock.toFixed(2), key: '10' },
  //       { name: prixod_sum.toFixed(2), key: '11' },
  //       { name: rasxod_stock.toFixed(2), key: '12' },
  //       { name: rasxod_sum.toFixed(2), key: '13' },
  //     ]
  //     const workbook = new ExcelJs.Workbook();
  //     const worksheet = workbook.addWorksheet('MyExcel', {
  //       pageSetup: { paperSize: 9, orientation: 'landscape' }
  //     });

  //     if (!data[0]) {
  //       data[0] = {}
  //     }

  //     // const start_date = new Date(data[0].start_time).toString() === 'Invalid Date'
  //     const start_date = new Date(data[0].first_createdAt).toString() !== 'Invalid Date' ?
  //       new Date(data[0].first_createdAt) :
  //       new Date(data[0].month).toString() !== 'Invalid Date' ?
  //         new Date(data[0].month).toString() :
  //         min_date
  //     // const end_date = new Date(data[data.length - 1].end_time).toString() === 'Invalid Date'
  //     const end_date = new Date(data[data.length - 1].last_createdAt).toString() !== 'Invalid Date' ?
  //       new Date(data[data.length - 1].last_createdAt) :
  //       new Date(data[data.length - 1].month).toString() !== 'Invalid Date' ?
  //         new Date(data[data.length - 1].month).toString() !== 'Invalid Date' :
  //         max_date

  //     console.log(
  //       'start_date', start_date, '\n',
  //       'end_date', end_date, '\n',
  //       'min_date', min_date, '\n',
  //       'max_date', max_date, '\n',
  //     );
  //     makeInventoryOtchotHeader(
  //       worksheet,
  //       {
  //         start_time: `${start_date.getDate()}.${start_date.getMonth() + 1}.${start_date.getFullYear()}`,
  //         end_time: `${end_date.getDate()}.${end_date.getMonth() + 1}.${end_date.getFullYear()}`,
  //       },
  //     )
  //     const time = new Date().getTime()

  //     try {
  //       worksheet.addTable({
  //         name: 'ItemsTable',
  //         ref: 'B7',
  //         headerRow: true,
  //         // totalsRow: true,
  //         columns: headers,
  //         rows: exelItems
  //       })
  //     } catch (error) { }

  //     const file_dir = path.join(__dirname, `../../static/${time}.xlsx`)

  //     await workbook.xlsx.writeFile(file_dir);
  //     console.log(file_dir);
  //     reply.sendFile(`./${time}.xlsx`)
  //     setTimeout(() => {
  //       fs.unlink(`./static/${time}.xlsx`, (err) => {
  //         if (err) {
  //           instance.send_Error('exported ' + time + ' file', JSON.stringify(err))
  //         }
  //       })
  //     }, 2000);

  //   } catch (error) {
  //     return reply.send(error.message)
  //   }
  // }
  const inventoryOtchotXLSX = async (request, reply, user) => {
    try {
      instance.i18n.setLocale(user.ui_language.value)

      const { service_id, min, max } = request.params
      const min_date = new Date(parseInt(+min - 18000000))
      const max_date = new Date(parseInt(+max - 18000000))

      if (min_date.toString() === 'Invalid Date' || max_date.toString() === 'Invalid Date') {
        return reply.error('Invalid Date')
      }

      const organization = await instance.organizations
        .findById(user.organization)
        .lean()
      if (!organization) {
        return reply.fourorfour('Organization')
      }

      const service = await instance.services
        .findById(service_id, { name: 1 })
        .lean();
      if (!service) {
        return reply.error('Service')
      }

      const reports = await getReports(organization._id, service_id, min_date, max_date)

      const headers = [
        { name: instance.i18n.__('sku'), key: '1' },
        { name: 'A', key: '2' },
        { name: `A`, key: '3' },
        { name: 'A', key: '4' },
        { name: `Итого по ${service.name}`, key: '5' },
        // { name: `${instance.i18n.__('total')} ${ostatok_start_stock.toFixed(2)}`, key: '6' },
        { name: reports.ostatok_start_stock.toFixed(2), key: '6' },
        { name: reports.ostatok_start_sum.toFixed(2), key: '7' },
        { name: reports.ostatok_stock.toFixed(2), key: '8' },
        { name: reports.ostatok_sum.toFixed(2), key: '9' },
        { name: reports.prixod_stock.toFixed(2), key: '10' },
        { name: reports.prixod_sum.toFixed(2), key: '11' },
        { name: reports.rasxod_stock.toFixed(2), key: '12' },
        { name: reports.rasxod_sum.toFixed(2), key: '13' },
      ]

      const workbook = new ExcelJs.Workbook();
      const worksheet = workbook.addWorksheet('MyExcel', {
        pageSetup: { paperSize: 9, orientation: 'landscape' }
      });

      console.log(
        'min_date', min_date, '\n',
        'max_date', max_date, '\n',
      );

      makeInventoryOtchotHeader(
        worksheet,
        {
          start_time: `${reports.min_date.getDate()}.${reports.min_date.getMonth() + 1}.${reports.min_date.getFullYear()}`,
          end_time: `${reports.max_date.getDate()}.${reports.max_date.getMonth() + 1}.${reports.max_date.getFullYear()}`,
        },
      )
      const time = new Date().getTime()

      try {
        worksheet.addTable({
          name: 'ItemsTable',
          ref: 'B7',
          headerRow: true,
          // totalsRow: true,
          columns: headers,
          rows: reports.exelItems
        })
      } catch (error) { }

      const file_dir = path.join(__dirname, `../../static/${time}.xlsx`)

      await workbook.xlsx.writeFile(file_dir);
      console.log(file_dir);
      reply.sendFile(`./${time}.xlsx`)
      setTimeout(() => {
        fs.unlink(`./static/${time}.xlsx`, (err) => {
          if (err) {
            instance.send_Error('exported ' + time + ' file', JSON.stringify(err))
          }
        })
      }, 2000);

    } catch (error) {
      return reply.send(error.message)
    }
  }
  instance.get('/inventory/otchot/excel/:service_id/:min/:max', {
    ...version,
    schema: {
      params: {
        type: 'object',
        properties: {
          service_id: {
            type: 'string',
            minLength: 24,
            maxLength: 24,
          },
          min: { type: 'number', maximum: 100000000000000, minimum: 1262286000000 },
          max: { type: 'number', maximum: 100000000000000, minimum: 1262286000000 }
        }
      }
    }
  }, (request, reply) => {
    // user
    instance.authorization(request, reply, (user) => {
      inventoryOtchotXLSX(request, reply, user)
      return reply;
    });
  })
  next()
})