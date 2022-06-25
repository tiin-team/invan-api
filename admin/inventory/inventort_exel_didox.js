const PDFDocument = require('pdfkit');
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
    if (['C7', 'D7', 'E7', 'F7', 'G7', 'V7'].includes(cell.cell))
      worksheet.getColumn(cell.cell[0]).width = 13
    if (['H7', 'I7'].includes(cell.cell))
      worksheet.getColumn(cell.cell[0]).width = 20
    if (cell.cell === 'L7')
      worksheet.getColumn(cell.cell[0]).width = 28
    if (cell.cell === 'M7')
      worksheet.getColumn(cell.cell[0]).width = 25
  }
}

/**
 * @param { ExcelJs.Worksheet} worksheet
 * @param a {[{cell: string, fColor: string, value: string}]} list
 * 
*/
const makeDidoxHeader = (worksheet) => {
  multiMergeCells(worksheet, [
    'A6:A8', 'B6:B8', 'C6:D6', 'C7:C8', 'D7:D8', 'E6:F6', 'G6:I6',
    'E7:E8', 'F7:F8',
    'G7:G8', 'H7:H8', 'I7:I8', 'J7:J8', 'K7:K8', 'L7:L8', 'M7:M8', 'N7:N8',
    'O7:O8', 'P7:P8', 'Q7:Q8', 'R7:R8', 'U7:U8', 'V7:V8',
    'K6:V6', 'S7:T7',
  ])

  multiFillCells(worksheet, [
    //qizil
    { cell: 'A6', fColor: 'FF0000', value: 'п.п.' },
    {
      cell: 'B6',
      fColor: 'FF0000',
      value: `Тип
счета-
фактуры`
    },
    { cell: 'C6', fColor: 'FF0000', value: `Счет-фактура` },
    { cell: 'C7', fColor: 'FF0000', value: `№` },
    { cell: 'D7', fColor: 'FF0000', value: `Дата` },
    { cell: 'E6', fColor: 'FF0000', value: `Договор` },
    { cell: 'E7', fColor: 'FF0000', value: `№` },
    { cell: 'F7', fColor: 'FF0000', value: `Дата` },
    { cell: 'G7', fColor: 'FF0000', value: `ИНН` },
    { cell: 'H7', fColor: 'FF0000', value: `Директор` },
    { cell: 'I7', fColor: 'FF0000', value: `Гл.бухгалтер` },
    { cell: 'J7', fColor: 'FF0000', value: `ИНН` },
    { cell: 'K7', fColor: 'FF0000', value: `п.п.` },
    { cell: 'L7', fColor: 'FF0000', value: `Наименование` },
    {
      cell: 'M7',
      fColor: 'FF0000',
      value: `Идентификационный
код и название по
Единому 
электронному
национальному
каталогу товаров
(услуг)`
    },
    { cell: 'O7', fColor: 'FF0000', value: `Ед. изм. (код)` },
    { cell: 'R7', fColor: 'FF0000', value: `Стоимость поставки` },
    { cell: 'S7', fColor: 'FF0000', value: `НДС` },
    { cell: 'S8', fColor: 'FF0000', value: `Ставка` },
    { cell: 'T8', fColor: 'FF0000', value: `Сумма` },
    {
      cell: 'U7',
      fColor: 'FF0000',
      value: `Стоимость
поставки с
учетом НДС`
    },
    { cell: 'V7', fColor: 'FF0000', value: `Код Льготы` },
    // yashil ranglar
    { cell: 'G6', fColor: '6FCD27' },
    { cell: 'G9', fColor: '6FCD27' },
    { cell: 'H9', fColor: '6FCD27' },
    { cell: 'I9', fColor: '6FCD27' },
    //sariq raqamlar
    { cell: 'A9', fColor: 'FFFF00' },
    { cell: 'B9', fColor: 'FFFF00' },
    { cell: 'C9', fColor: 'FFFF00' },
    { cell: 'D9', fColor: 'FFFF00' },
    { cell: 'E9', fColor: 'FFFF00' },
    { cell: 'F9', fColor: 'FFFF00' },
    { cell: 'P7', fColor: 'FFFF00', value: `Кол-во` },
    { cell: 'Q7', fColor: 'FFFF00', value: `Цена` },
    //och chigar rang
    { cell: 'K6', fColor: 'FFB000', value: `Товары (услуги)` },
    { cell: 'K9', fColor: 'FFB000' },
    { cell: 'L9', fColor: 'FFB000' },
    { cell: 'M9', fColor: 'FFB000' },
    { cell: 'N9', fColor: 'FFB000' },
    { cell: 'O9', fColor: 'FFB000' },
    { cell: 'P9', fColor: 'FFB000' },
    { cell: 'Q9', fColor: 'FFB000' },
    { cell: 'P9', fColor: 'FFB000' },
    { cell: 'R9', fColor: 'FFB000' },
    { cell: 'S9', fColor: 'FFB000' },
    { cell: 'T9', fColor: 'FFB000' },
    { cell: 'U9', fColor: 'FFB000' },
    { cell: 'V9', fColor: 'FFB000' },
    //ko'k ranglar
    { cell: 'J6', fColor: '00A3F4' },
    { cell: 'J9', fColor: '00A3F4' },
    { cell: 'N7', fColor: '306DB5', value: `Штрих код товара/услуги` },
  ])

  const row6 = worksheet.getRow(6);

  for (const cell of row6._cells) {
    if (cell._address[0] !== 'A' || cell._address[0] !== 'B') {
      cell.style.border =
      {
        ...cell.style.border,
        top: { color: { argb: '000000' }, style: 'thin' },
        bottom: { color: { argb: '000000' }, style: 'thin' },
      }
    }
  }
  for (const cell of worksheet.getRow(7)._cells) {
    if (cell._address[0] !== 'A' || cell._address[0] !== 'B') {
      cell
    }
  }
  const row7 = worksheet.getRow(7);
  const row8 = worksheet.getRow(8);
  row7.height = 60
  row8.height = 30
  row7.border = {
    left: { color: '000000', style: 'thin' },
    right: { color: '000000', style: 'thin' },
  }
  row8.border = {
    left: { color: '000000', style: 'thin' },
    right: { color: '000000', style: 'thin' },
  }

  worksheet.getCell('S8').style.border = borderStyle4
  worksheet.getCell('T8').style.border = borderStyle4
}

module.exports = fp((instance, _, next) => {

  const didocXls = async (request, reply) => {
    try {
      const { id } = request.params
      const receipt = await instance.Receipts.findById(id).lean();
      if (!receipt) return reply.fourorfour('receipt')

      // const service = instance.services.findById(receipt.service).lean()
      // if (!service) return reply.fourorfour('service')
      const organization = await instance.organizations.findById(receipt.organization).lean()
      if (!organization) return reply.fourorfour('organization')

      const exelItems = []
      index = 1
      totalAmount = 0
      const product_ids = receipt.sold_item_list.map(e => e.product_id)
      const goods = await instance.goodsSales
        .find(
          { _id: { $in: product_ids } },
          { name: 1, barcode: 1, sold_by: 1, item_type: 1, parent_name: 1, barcode: 1 })
        .lean()
      const goodsObj = {}
      for (const g of goods) {
        console.log(g);
        goodsObj[g._id] = g
      }

      for (const it of receipt.sold_item_list) {
        // let amount = it.quality * it.purchase_cost
        if (goodsObj[it.product_id]) {
          it.sold_by = goodsObj[it.product_id].sold_by
          it.barcode = goodsObj[it.product_id].barcode
          it.product_name = goodsObj[it.product_id].name
          if (goodsObj[it.product_id].item_type == 'variant') {
            it.product_name = `${goodsObj[it.product_id].parent_name} (${goodsObj[it.product_id].name})`
          }
        }
        barcode = ''
        for (const bar of goodsObj[it.product_id].barcode) {
          barcode += bar + ', '
        }

        exelItems.push([
          '',
          '',
          '№',
          '',
          '',
          '',
          'sip_inn',
          organization.director_name ? organization.director_name : '',
          organization.accaunter ? organization.accaunter : '',
          'z.inn',
          'p.p',
          it.product_name,
          goodsObj[it.product_id].mxik ? goodsObj[it.product_id].mxik : '',
          barcode,
          it.sold_item_type,
          it.value,
          it.price,
          it.cost,
          15,
          it.cost * 15 / 100,
          it.cost + it.cost * 15 / 100,
        ])
        index++
      }

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
      makeDidoxHeader(worksheet)


      try {
        worksheet.addTable({
          name: 'ItemsTable',
          ref: 'A9',
          headerRow: true,
          // totalsRow: true,
          columns: headers,
          rows: exelItems
        })
      } catch (error) { }

      const file_dir = path.join(__dirname, `../../static/${time}.xlsx`)

      await workbook.xlsx.writeFile(file_dir);

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

  instance.get('/inventory/didox/pdf/:id', async (request, reply) => {
    didocXls(request, reply)
    return reply;
  })

  next()
})
