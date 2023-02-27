const ExcelJs = require('exceljs');
const fs = require('fs');
const path = require('path')
const fp = require('fastify-plugin')

const getMonthOrDay = (num) => num >= 10 ? num : `0${num}`

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
  const version = { version: '2.0.1' }

  /**
   * 
   * @param {string} organization_id 
   * @param {string} service_id 
   * @param {Date} start_date 
   * @param {Date} end_date 
   * @param {Number} limit 
   * @param {Number} page
   * @returns { Promise<{
   *  product_id: string
   *  item_edit: Number
   *  received: Number
   *  received_amunt: Number
   *  recounted: Number
   *  returned: Number
   *  returned_amount: Number
   *  returned_order: Number
   *  returned_order_amount: Number
   *  sold: Number
   *  sold_amount: Number
   *  transferred: Number
   *  actions_count: Number
   *  }[]>
   * }
  */
  const calculateReportsClickhouse = async (organization_id, service_id, start_date, end_date, limit = 10, page = 1) => {

    const query = `
      SELECT
        product_id,
        abs(sum(if(reason = 'item edit', adjustment, 0)))             as item_edit,
        abs(sum(if(reason = 'received', adjustment, 0)))              as received,
        abs(sum(if(reason = 'received', adjustment * cost, 0)))       as received_amunt,
        abs(sum(if(reason = 'recounted', adjustment, 0)))             as recounted,
        abs(sum(if(reason = 'returned', adjustment, 0)))              as returned,
        abs(sum(if(reason = 'returned', adjustment * cost, 0)))       as returned_amount,
        abs(sum(if(reason = 'returned_order', adjustment, 0)))        as returned_order,
        abs(sum(if(reason = 'returned_order', adjustment * cost, 0))) as returned_order_amount,
        abs(sum(if(reason = 'sold', adjustment, 0)))                  as sold,
        abs(sum(if(reason = 'sold', adjustment * cost, 0)))           as sold_amount,
        abs(sum(if(reason = 'transferred', adjustment, 0)))           as transferred,
        count(*)                                                      as actions_count
      FROM (
        SELECT product_id, reason, adjustment, service, cost
        FROM inventory_history
        WHERE organization = '${organization_id}'
          AND service = '${service_id}'
          AND date BETWEEN ${start_date.getTime()} AND ${end_date.getTime()}
        )
      GROUP BY product_id
      `
    // LIMIT ${limit}
    // OFFSET ${limit * (page - 1)}

    return await instance.clickhouse.query(query).toPromise()
  }

  /**
   * 
   * @param {string} organization_id 
   * @param {string} service_id 
   * @param {Date} start_date 
   * @param {Date} end_date 
  */
  const getReports = async (organization_id, service_id, start_date, end_date) => {

    const start_date_num = getMonthOrDay(start_date.getDate()),
      start_month_num = getMonthOrDay(start_date.getMonth() + 1),
      start_year_num = getMonthOrDay(start_date.getFullYear()),
      end_date_num = getMonthOrDay(end_date.getDate()),
      end_month_num = getMonthOrDay(end_date.getMonth() + 1),
      end_year_num = getMonthOrDay(end_date.getFullYear())

    const
      start_date_string = `${start_date_num}.${start_month_num}.${start_year_num}`,
      end_date_string = `${end_date_num}.${end_month_num}.${end_year_num}`,
      exelItems = [],
      res = {
        min_date: start_date,
        max_date: end_date,
        exelItems: exelItems,
        ostatok_start_stock: 0,
        ostatok_start_sum: 0,
        ostatok_stock: 0,
        ostatok_sum: 0,
        prixod_stock: 0,
        prixod_sum: 0,
        rasxod_stock: 0,
        rasxod_sum: 0,
      }

    /**
     * @type {{
     *  sku: Number
     *  month: String
     *  product_id: String
     *  product_name: String
     *  category_id: String
     *  category_name: String
     *  sold_by: String
     *  count_by_type: String
     *  barcode_by_type: String
     *  barcode: String[]
     *  mxik: String
     *  service: {
     *    service_id: String
     *    service_name: String
     *    available: String
     *    start_price: String
     *    start_cost: String
     *    end_price: String
     *    end_cost: String
     *    start_stock: String
     *    end_stock: String
     *    start_prices: String
     *    end_prices: String
     *  }
     * }[]}
    */
    const items = await instance.GoodsDailyStock
      .find(
        {
          organization: organization_id,
          month: { $in: [start_date_string, end_date_string] },
        },
        {
          product_id: 1,
          sku: 1,
          month: 1,
          product_name: 1,
          category_id: 1,
          category_name: 1,
          sold_by: 1,
          count_by_type: 1,
          barcode_by_type: 1,
          barcode: 1,
          mxik: 1,
          service: {
            $first: {
              $filter: {
                input: "$services",
                as: "service",
                cond: {
                  $eq: [
                    { $toString: "$$service.service_id" },
                    { $toString: service_id },
                  ],
                },
              }
            }
          }
        }
      )
      .lean()

    /**
     * @type {Record<string, {
     * sku: Number
     * product_id
     * product_name
     * sold_by
     * barcode
     * start_stock
     * start_cost
     * end_stock
     * end_cost
     * }>}
     */
    const itemsObj = {}

    for (const item of items) {
      if (itemsObj[item.product_id]) {
        if (item.month === start_date_string && item.service) {
          itemsObj[item.product_id].start_stock = item.service.start_stock
          itemsObj[item.product_id].start_cost = item.service.start_cost
        } else if (item.month === end_date_string && item.service) {
          itemsObj[item.product_id].end_stock = item.service.end_stock
          itemsObj[item.product_id].end_cost = item.service.end_cost
        }
      } else {
        itemsObj[item.product_id] = {
          sku: item.sku,
          product_id: item.product_id,
          product_name: item.product_name,
          sold_by: item.sold_by,
          barcode: item.barcode,
          start_stock: item.month === start_date_string && item.service ? item.service.start_stock : 0,
          start_cost: item.month === start_date_string && item.service ? item.service.start_cost : 0,
          end_stock: item.month === end_date_string && item.service ? item.service.end_stock : 0,
          end_cost: item.month === end_date_string && item.service ? item.service.end_cost : 0,
        }
      }
    }

    const reports = await calculateReportsClickhouse(organization_id, service_id, start_date, end_date)

    /**
     * @type {Record<String,{
     *  product_id: string
     *  item_edit: Number
     *  received: Number
     *  received_amunt: Number
     *  recounted: Number
     *  returned: Number
     *  returned_amount: Number
     *  returned_order: Number
     *  returned_order_amount: Number
     *  sold: Number
     *  sold_amount: Number
     *  transferred: Number
     *  actions_count: Number
     * }>
     *}
     */
    const reportsObj = {}
    if (reports.length <= 0) {
      return res
    }

    for (const report of reports) {
      reportsObj[report.product_id] = report
    }

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

    let counter = 0
    for (const [, item] of Object.entries(itemsObj)) {
      // reportsObj
      const itemReport = reportsObj[item.product_id]

      purchase_monthly_info_count = 0
      purchase_monthly_info_amount = 0
      sale_monthly_info_count = 0
      sale_monthly_info_sale_amount = 0

      if (itemReport) {

        if (counter <= 10) {
          console.log(itemReport);
          counter = 1
        }
        purchase_monthly_info_count = getNumberOrDefault(itemReport.received, 0) - getNumberOrDefault(itemReport.returned, 0)
        purchase_monthly_info_amount = getNumberOrDefault(itemReport.received_amunt, 0) - getNumberOrDefault(itemReport.returned_amount, 0)
        sale_monthly_info_count = getNumberOrDefault(itemReport.sold, 0)
        sale_monthly_info_sale_amount = getNumberOrDefault(itemReport.sold_amount, 0)
      }

      end_stock = getNumberOrDefault(item.end_stock, 0)
      start_stock = getNumberOrDefault(item.start_stock, 0)
      services_start_cost = getNumberOrDefault(item.start_cost, 0)
      services_end_cost = getNumberOrDefault(item.end_cost, 0)

      ostatok_start_stock += start_stock
      ostatok_start_sum += start_stock * services_start_cost
      rasxod_stock += end_stock
      rasxod_sum += end_stock * services_end_cost

      ostatok_stock += purchase_monthly_info_count
      ostatok_sum += purchase_monthly_info_amount
      prixod_stock += sale_monthly_info_count
      prixod_sum += sale_monthly_info_sale_amount

      exelItems.push([
        Number(item.sku),
        Array.isArray(item.barcode) ? item.barcode.join(', ') : '',
        item.product_name,
        instance.i18n.__(item.sold_by),
        Number(services_start_cost.toFixed(2)),
        Number(start_stock.toFixed(2)), // End time count
        Number((start_stock * services_start_cost).toFixed(2)), // End time count
        Number(purchase_monthly_info_count.toFixed(2)), // Prixod count
        Number(purchase_monthly_info_amount.toFixed(2)), // Prixod sum
        Number(sale_monthly_info_count.toFixed(2)), // Rasxod count
        Number(sale_monthly_info_sale_amount.toFixed(2)), // Rasxod sum
        Number(end_stock.toFixed(2)), // End Time sum
        Number(end_stock * services_end_cost),
      ])
    }

    console.log('Done')
    return {
      start_date: start_date,
      start_date_string: start_date_string,
      end_date: end_date,
      end_date_string: end_date_string,
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
        .findOne(
          { _id: service_id, organization: user.organization },
          { name: 1 },
        )
        .lean();
      if (!service) {
        return reply.error('Service')
      }

      const reports = await getReports(organization._id, service_id, min_date, max_date)

      // return reply.ok(reports)

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
          start_time: reports.start_date_string,
          end_time: reports.end_date_string,
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

      setTimeout(() => {
        fs.unlink(`./static/${time}.xlsx`, (err) => {
          if (err) {
            instance.send_Error('exported ' + time + ' file', JSON.stringify(err))
          }
        })
      }, 5000);

      reply.sendFile(`./${time}.xlsx`)

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