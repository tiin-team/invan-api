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
    { cell: 'B5', fColor: 'FCF4A4', value: 'Код' },
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

module.exports = fp((instance, _, next) => {
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

  const inventoryOtchotXLSX = async (request, reply, user) => {
    try {
      const month_time = request.params.month_time
      const month_date = new Date(month_time)
      const month = `${month_date.getDate()}.${month_date.getMonth() + 1}.${month_date.getFullYear()}`
      const month_name = months[month_date.getMonth()]
      const service_id = request.params.service_id
      // const service_id = '5f5641e8dce4e706c0628380'
      // const service_ids = [instance.ObjectId(service_id)]

      const organization = await instance.organizations
        .findById(user.organization)
        .lean()
      if (!organization) {
        return reply.fourorfour('Organization')
      }
      const $match = {
        $match: {
          organization: organization._id + '',
          month: month,
          month_name: month_name,
        }
      }

      const $project = {
        $project: {
          organization: 1,
          month: 1,
          month_name: 1,
          start_time: 1,
          end_time: 1,
          sku: 1,
          product_id: 1,
          product_name: 1,
          category_id: 1,
          category_name: 1,
          sold_by: 1,
          count_by_type: 1,
          barcode_by_type: 1,
          barcode: 1,
          mxik: 1,
          services: {
            $first: {
              $filter: {
                input: "$services",
                as: "service",
                cond: {
                  $eq: [{ $toString: "$$service.service_id" }, { $toString: service_id }],
                },
              },
            },
          },
        }
      }
      const data = await instance.goodsOtchot.aggregate([$match, $project])

      // return reply.ok(data)
      // return reply.code(404).send({ result })
      // const goodsObj = {}
      // // for (const purchase of purchases) {
      //   // goodsObj[purchase.product_id] = purchase
      // // }

      const exelItems = []
      let index = 1
      for (const item of data) {
        exelItems.push([
          index,
          item.barcode,
          item.product_name,
          item.mxik,
          item.services.cost,
          item.services.stock_monthly.start_stock, // End time count
          item.services.stock_monthly.start_stock * item.services.cost, // End time count
          item.services.purchase_monthly_info.count, // Prixod count
          item.services.purchase_monthly_info.amount, // Prixod sum
          item.services.sale_monthly_info.count, // Rasxod count
          item.services.sale_monthly_info.sale_amount, // Rasxod sum
          item.services.stock_monthly.end_stock, // End Time sum
          item.services.stock_monthly.end_stock * item.services.stock_monthly.cost, // End Time sum
        ])
        index++
      }

      const headers = [
        { name: '№', key: '1' },
        { name: 'A', key: '2' },
        { name: `A`, key: '3' },
        { name: 'A', key: '4' },
        { name: `Итого по ${organization.name}`, key: '5' },
        { name: 'Start time count', key: '6' },
        { name: 'Start time sum', key: '7' },
        { name: 'Prixod count', key: '8' },
        { name: 'Prixod sum', key: '9' },
        { name: 'Rasxod count', key: '10' },
        { name: 'Rasxod sum', key: '11' },
        { name: 'End time count', key: '12' },
        { name: 'End Time sum', key: '13' },
      ]
      const workbook = new ExcelJs.Workbook();
      const worksheet = workbook.addWorksheet('MyExcel', {
        pageSetup: { paperSize: 9, orientation: 'landscape' }
      });
      const start_date = new Date(data[0].start_time)
      const end_date = new Date(data[0].end_time)
      makeInventoryOtchotHeader(
        worksheet,
        {
          end_time: `${start_date.getDate()}.${start_date.getMonth() + 1}.${start_date.getFullYear()}`,
          start_time: `${end_date.getDate()}.${end_date.getMonth() + 1}.${end_date.getFullYear()}`,
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
          rows: exelItems
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

  instance.get('/inventory/otchot/excel/:service_id/:month_time', (request, reply) => {
    // user
    // request.headers['accept-user'] = 'admin'
    // request.headers['authorization'] = 'FsYMuTi4PWc9irRLrfYHLt'
    instance.authorization(request, reply, (user) => {
      inventoryOtchotXLSX(request, reply, user)
      return reply;
    });
  })

  next()
})
