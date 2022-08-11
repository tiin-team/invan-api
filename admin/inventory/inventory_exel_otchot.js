const ExcelJs = require('exceljs');
const fs = require('fs');
const path = require('path')
// const moment = require('moment')
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
 * @param {{organization_name: string, start_time: string, end_time: string}} data
 * 
*/
const makeInventoryOtchotHeader = (worksheet, data, organization_name = 'Маркет SOF GO 1') => {
  multiMergeCells(worksheet, [
    'B5:B6', 'C5:C6', 'D5:D6', 'E5:E6', 'F5:F6',
    'G5:H5', 'I5:J5', 'K5:L5', 'M5:N5', 'C7:F7',
  ])

  multiFillCells(worksheet, [
    { cell: 'B5', fColor: 'FCF4A4', value: 'Код' },
    { cell: 'B7', fColor: 'FCF4A4', value: '' },
    { cell: 'C5', fColor: 'FCF4A4', value: `Баркод` },
    { cell: 'C7', fColor: 'FCF4A4', value: `Итого по ${data.organization_name}` },
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

  const inventoryOtchotXLSX = async (request, reply) => {
    try {
      const exelItems = []
      totalAmount = 0

      exelItems.push([
        '',
        '',
        '№',
        '',
        '',
        '',
        'sip_inn',
        'd_name',
        'a_name',
        'z.inn',
        'p.p',
        'product_name',
        'mxik',
        'barcode',
        'sold_item_type',
        'value',
        'price',
        'cost',
        15,
        16,
        17,
      ])

      const time = new Date().getTime()

      const headers = [
        { name: '1', key: '1' },
        { name: '2', key: '2' },
        { name: '4', key: '4' },
        { name: '5', key: '5' },
        { name: '6', key: '6' },
        { name: '7', key: '7' },
        { name: '14', key: '14' },
        { name: '24', key: '24' },
        { name: '25', key: '25' },
        { name: '28', key: '28' },
        { name: '41', key: '41' },
        { name: '45', key: '45' },
        { name: '46', key: '46' },
        { name: '47', key: '47' },
        { name: '49', key: '49' },
        { name: '52', key: '52' },
        { name: '53', key: '53' },
        { name: '56', key: '56' },
        { name: '57', key: '57' },
        { name: '58', key: '58' },
        { name: '59', key: '59' },
        { name: '60', key: '60' },
        // { name: 'Amount', totalsRowFunction: 'sum', filterButton: false },
      ]
      const workbook = new ExcelJs.Workbook();
      const worksheet = workbook.addWorksheet('MyExcel', {
        pageSetup: { paperSize: 9, orientation: 'landscape' }
      });
      makeInventoryOtchotHeader(
        worksheet,
        {
          end_time: 'end Time',
          organization_name: 'Organization name',
          start_time: 'Start time'
        },
      )

      try {
        worksheet.addTable({
          name: 'ItemsTable',
          ref: 'B8',
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

  instance.get('/inventory/otchot/excel', async (request, reply) => {
    inventoryOtchotXLSX(request, reply)
    return reply;
  })

  next()
})
