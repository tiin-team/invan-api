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
    'A6:A8', 'B6:B8', 'C6:C8', 'D6:E6', 'D7:D8', 'E7:E8', 'F6:G6',
    'F7:F8', 'G7:G8',
    'H6:K6', 'H7:H8', 'I7:I8', 'J7:J8', 'K7:K8', 'L6:L8', 'M6:Z6', 'M7:M8', 'N7:N8',
    'O7:O8', 'P7:P8', 'Q7:Q8', 'R7:R8', 'S7:S8', 'T7:T8', 'U7:U8', 'V7:V8', 'W7:W8',
    'X7:X8', 'Y7:Y8', 'Z7:Z8', 'AA6:AN6', 'AA7:AA8', 'AB7:AB8', 'AC7:AC8', 'AD7:AD8',
    'AE7:AE8', 'AF7:AF8', 'AG7:AG8', 'AH7:AH8', 'AI7:AI8', 'AJ7:AJ8', 'AK7:AK8', 'AL7:AL8',
    'AM7:AM8', 'AN7:AN8', 'AO6:BH6', 'AO7:AO8', 'AP7:AP8', 'AQ7:AQ8', 'AR7:AR8', 'AS7:AS8',
    'AT7:AT8', 'AU7:AU8', 'AV7:AV8', 'AW7:AW8', 'AX7:AX8', 'AY7:AY8', 'AZ7:AZ8', 'BA7:BA8',
    'BB7:BC7', 'BD7:BD8', 'BE7:BF8', 'BG7:BG8', 'BH7:BH8',
  ])

  multiFillCells(worksheet, [
    //qizil
    { cell: 'A6', fColor: 'FF0000', value: 'п.п.' },
    { cell: 'B6', fColor: 'FF0000', value: `Тип счета-фактуры` },
    { cell: 'D6', fColor: 'FF0000', value: `Cчета-фактуры` },
    { cell: 'D7', fColor: 'FF0000', value: `№` },
    { cell: 'E7', fColor: 'FF0000', value: `Дата` },
    { cell: 'F6', fColor: 'FF0000', value: `Договор` },
    { cell: 'F7', fColor: 'FF0000', value: `№` },
    { cell: 'G7', fColor: 'FF0000', value: `Дата` },
    { cell: 'N7', fColor: 'FF0000', value: `ИНН` },
    { cell: 'X7', fColor: 'FF0000', value: `Директор` },
    { cell: 'Y7', fColor: 'FF0000', value: `Гл.бухгалтер` },
    { cell: 'AB7', fColor: 'FF0000', value: `ИНН` },
    { cell: 'AO7', fColor: 'FF0000', value: `п.п` },
    { cell: 'AS7', fColor: 'FF0000', value: `Наименование` },
    {
      cell: 'AT7', fColor: 'FF0000', value: `Идентификационный
    код и название по Единому электронному
    национальному каталогу товаров (услуг)` },
    { cell: 'AW7', fColor: 'FF0000', value: `Ед. изм. (код)` },
    { cell: 'BD7', fColor: 'FF0000', value: `Стоимость поставки` },
    { cell: 'BE7', fColor: 'FF0000', value: `НДС` },
    { cell: 'BE8', fColor: 'FF0000', value: `Ставка` },
    { cell: 'BF8', fColor: 'FF0000', value: `Сумма` },
    { cell: 'BG7', fColor: 'FF0000', value: `Стоимость поставки с учетом НДС` },
    { cell: 'BH7', fColor: 'FF0000', value: `Код Льготы` },
    // yashil ranglar
    { cell: 'M6', fColor: '6FCD27', value: `Исполнитель` },
    { cell: 'M9', fColor: '6FCD27' },
    { cell: 'N9', fColor: '6FCD27' },
    { cell: 'O9', fColor: '6FCD27' },
    { cell: 'P9', fColor: '6FCD27' },
    { cell: 'Q9', fColor: '6FCD27' },
    { cell: 'R9', fColor: '6FCD27' },
    { cell: 'S9', fColor: '6FCD27' },
    { cell: 'T9', fColor: '6FCD27' },
    { cell: 'U9', fColor: '6FCD27' },
    { cell: 'V9', fColor: '6FCD27' },
    { cell: 'W9', fColor: '6FCD27' },
    { cell: 'X9', fColor: '6FCD27' },
    { cell: 'Y9', fColor: '6FCD27' },
    { cell: 'Z9', fColor: '6FCD27' },
    //sariq raqamlar
    // Договор  Директор Дата    Гл.бухгалтер    Наименование   Ед. изм. (код) Стоимость поставки  НДС Ставка Сумма
    { cell: 'C6', fColor: 'FFFF00', value: `Код типа одностороннего счета-фактуры` },
    { cell: 'H6', fColor: 'FFFF00', value: `Доверенность` },
    { cell: 'H7', fColor: 'FFFF00', value: `№` },
    { cell: 'I7', fColor: 'FFFF00', value: `Дата` },
    { cell: 'J7', fColor: 'FFFF00', value: `ФИО` },
    { cell: 'K7', fColor: 'FFFF00', value: `ИНН` },
    { cell: 'L6', fColor: 'FFFF00', value: `Товар отпустил (ФИО)` },
    { cell: 'M7', fColor: 'FFFF00', value: `Наименование` },
    { cell: 'O7', fColor: 'FFFF00', value: `Код филиала` },
    { cell: 'P7', fColor: 'FFFF00', value: `Название филиала` },
    { cell: 'Q7', fColor: 'FFFF00', value: `Расчетный счет` },
    { cell: 'R7', fColor: 'FFFF00', value: `МФО` },
    { cell: 'S7', fColor: 'FFFF00', value: `Адрес` },
    { cell: 'T7', fColor: 'FFFF00', value: `Телефон` },
    { cell: 'U7', fColor: 'FFFF00', value: `Мобильный` },
    { cell: 'V7', fColor: 'FFFF00', value: `ОКЭД` },
    { cell: 'W7', fColor: 'FFFF00', value: `Район (код)` },
    { cell: 'Z7', fColor: 'FFFF00', value: `Код плательщика НДС` },
    { cell: 'AA7', fColor: 'FFFF00', value: `Наименование` },
    { cell: 'AC7', fColor: 'FFFF00', value: `Код филиала` },
    { cell: 'AD7', fColor: 'FFFF00', value: `Название филиала` },
    { cell: 'AE7', fColor: 'FFFF00', value: `Расчетный счет` },
    { cell: 'AF7', fColor: 'FFFF00', value: `МФО` },
    { cell: 'AG7', fColor: 'FFFF00', value: `Адрес` },
    { cell: 'AH7', fColor: 'FFFF00', value: `Телефон` },
    { cell: 'AI7', fColor: 'FFFF00', value: `Мобильный` },
    { cell: 'AJ7', fColor: 'FFFF00', value: `ОКЭД` },
    { cell: 'AK7', fColor: 'FFFF00', value: `Район (код)` },
    { cell: 'AL7', fColor: 'FFFF00', value: `Директор` },
    { cell: 'AM7', fColor: 'FFFF00', value: `Гл.бухгалтер` },
    { cell: 'AN7', fColor: 'FFFF00', value: `Код плательщика НДС` },
    { cell: 'AP7', fColor: 'FFFF00', value: `Наименование комитента` },
    { cell: 'AQ7', fColor: 'FFFF00', value: `ИНН комитента` },
    { cell: 'AR7', fColor: 'FFFF00', value: `Рег. код платель. НДС комитента` },
    { cell: 'AV7', fColor: 'FFFF00', value: `Серия товара` },
    { cell: 'AX7', fColor: 'FFFF00', value: `Базовая цена` },
    { cell: 'AY7', fColor: 'FFFF00', value: `% добавочной стоимости` },
    { cell: 'AZ7', fColor: 'FFFF00', value: `Кол-во` },
    { cell: 'BA7', fColor: 'FFFF00', value: `Цена` },
    { cell: 'BB7', fColor: 'FFFF00', value: `Акцизный налог` },
    { cell: 'BB8', fColor: 'FFFF00', value: `Ставка` },
    { cell: 'BC8', fColor: 'FFFF00', value: `Сумма` },
    { cell: 'A9', fColor: 'FFFF00' },
    { cell: 'B9', fColor: 'FFFF00' },
    { cell: 'C9', fColor: 'FFFF00' },
    { cell: 'D9', fColor: 'FFFF00' },
    { cell: 'E9', fColor: 'FFFF00' },
    { cell: 'F9', fColor: 'FFFF00' },
    { cell: 'G9', fColor: 'FFFF00' },
    { cell: 'H9', fColor: 'FFFF00' },
    { cell: 'I9', fColor: 'FFFF00' },
    { cell: 'J9', fColor: 'FFFF00' },
    { cell: 'K9', fColor: 'FFFF00' },
    { cell: 'L9', fColor: 'FFFF00' },
    //och chigar rang
    { cell: 'AO6', fColor: 'FFB000', value: `Товары (услуги)` },
    { cell: 'AO9', fColor: 'FFB000' },
    { cell: 'AP9', fColor: 'FFB000' },
    { cell: 'AQ9', fColor: 'FFB000' },
    { cell: 'AR9', fColor: 'FFB000' },
    { cell: 'AS9', fColor: 'FFB000' },
    { cell: 'AT9', fColor: 'FFB000' },
    { cell: 'AU9', fColor: 'FFB000' },
    { cell: 'AV9', fColor: 'FFB000' },
    { cell: 'AW9', fColor: 'FFB000' },
    { cell: 'AX9', fColor: 'FFB000' },
    { cell: 'AY9', fColor: 'FFB000' },
    { cell: 'AZ9', fColor: 'FFB000' },
    { cell: 'BA9', fColor: 'FFB000' },
    { cell: 'BB9', fColor: 'FFB000' },
    { cell: 'BC9', fColor: 'FFB000' },
    { cell: 'BD9', fColor: 'FFB000' },
    { cell: 'BE9', fColor: 'FFB000' },
    { cell: 'BF9', fColor: 'FFB000' },
    { cell: 'BG9', fColor: 'FFB000' },
    { cell: 'BH9', fColor: 'FFB000' },
    //ko'k ranglar
    { cell: 'AA6', fColor: '00A3F4', value: `Заказчик` },
    { cell: 'AA9', fColor: '00A3F4' },
    { cell: 'AB9', fColor: '00A3F4' },
    { cell: 'AC9', fColor: '00A3F4' },
    { cell: 'AD9', fColor: '00A3F4' },
    { cell: 'AE9', fColor: '00A3F4' },
    { cell: 'AF9', fColor: '00A3F4' },
    { cell: 'AG9', fColor: '00A3F4' },
    { cell: 'AH9', fColor: '00A3F4' },
    { cell: 'AI9', fColor: '00A3F4' },
    { cell: 'AJ9', fColor: '00A3F4' },
    { cell: 'AK9', fColor: '00A3F4' },
    { cell: 'AL9', fColor: '00A3F4' },
    { cell: 'AM9', fColor: '00A3F4' },
    { cell: 'AN9', fColor: '00A3F4' },
    { cell: 'AU7', fColor: '306DB5', value: `Штрих код товара/услуги` },
  ])

  let i = 0
  for (const cell of worksheet.getRow(6)._cells) {
    i++

    if (
      (cell._address[0] === 'A' && isNaN(cell._address[1])) ||
      cell._address[0] !== 'C' ||
      cell._address[0] !== 'L'
    ) {
      cell.style.border =
      {
        ...cell.style.border,
        top: { color: { argb: '000000' }, style: 'thin' },
        bottom: { color: { argb: '000000' }, style: 'thin' },
      }
    }
    if (i >= 60) break
  }

  const row7 = worksheet.getRow(7);
  const row8 = worksheet.getRow(8);
  row7.height = 60
  row8.height = 30
  row7.border = {
    ...row7.border,
    left: { color: '000000', style: 'thin' },
    right: { color: '000000', style: 'thin' },
  }
  row8.border = {
    ...row8.border,
    left: { color: '000000', style: 'thin' },
    right: { color: '000000', style: 'thin' },
  }

  worksheet.getCell('BB8').style.border = borderStyle4
  worksheet.getCell('BC8').style.border = borderStyle4
  worksheet.getCell('BH6').style.border = {
    right: { color: '000000', style: 'thin' },
  }
  // worksheet.getCell('T8').style.border = borderStyle4
}

const soldBy = {
  each: 1,
  weight: 2,
  pcs: 'pcs',
  box: 'box',
  litre: 'litre',
  metre: 'metre'
}
module.exports = fp((instance, _, next) => {

  const didocXls = async (request, reply) => {
    try {
      // reply.code(404).send('ok')
      const { id } = request.params
      const receipt = await instance.Receipts.findById(id).lean();
      if (!receipt) return reply.fourorfour('receipt')

      // const service = instance.services.findById(receipt.service).lean()
      // if (!service) return reply.fourorfour('service')
      const organization = await instance.organizations.findById(receipt.organization).lean()
      if (!organization) return reply.fourorfour('organization')

      const exelItems = []

      totalAmount = 0
      const product_ids = receipt.sold_item_list.map(e => e.product_id)
      const goods = await instance.goodsSales
        .find(
          { _id: { $in: product_ids } },
          { name: 1, barcode: 1, sold_by: 1, item_type: 1, parent_name: 1, barcode: 1, mxik: 1, nds_value: 1 })
        .lean()
      const goodsObj = {}
      for (const g of goods) {
        goodsObj[g._id] = g
      }

      index = 1
      for (const it of receipt.sold_item_list) {
        // let amount = it.quality * it.purchase_cost
        if (goodsObj[it.product_id]) {
          it.sold_by = goodsObj[it.product_id].sold_by
          it.barcode = it.barcode
            ? it.barcode
            : goodsObj[it.product_id].barcode && goodsObj[it.product_id].barcode[0]
              ? goodsObj[it.product_id].barcode[0]
              : ''
          it.product_name = goodsObj[it.product_id].name
          if (goodsObj[it.product_id].item_type == 'variant') {
            it.product_name = `${goodsObj[it.product_id].parent_name} (${goodsObj[it.product_id].name})`
          }
        }

        nds_value = isNaN(parseFloat(goodsObj[it.product_id].nds_value)) ? 15 : parseFloat(goodsObj[it.product_id].nds_value);

        exelItems.push([
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          organization.inn && index === 1 ? organization.inn : '',
          '',
          '',
          '',
          '',
          organization.address && index === 1 ? organization.address : '',
          '',
          organization.org_phone_number && index === 1 ? organization.org_phone_number : '',
          '',
          '',
          organization.director_name && index === 1 ? organization.director_name : '',
          organization.accaunter && index === 1 ? organization.accaunter : '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          index,
          '', //komitet ismi
          '', //komitet innsi
          '',
          it.product_name,
          goodsObj[it.product_id].mxik ? goodsObj[it.product_id].mxik : '',
          it.barcode,
          '',
          soldBy[it.sold_by] ? soldBy[it.sold_by] : it.sold_by,
          '',
          '',
          it.value,
          it.price,
          '',
          '',
          parseFloat((it.total * 100 / (100 + nds_value)).toFixed(2)),
          15,
          parseFloat((it.total * nds_value / (100 + nds_value)).toFixed(2)),
          parseFloat(it.total.toFixed(2)),
        ])
        index++
      }

      const time = new Date().getTime()

      const headers = [
        { name: '1', key: '1' },
        { name: '2', key: '2' },
        { name: '3', key: '3' },
        { name: '4', key: '4' },
        { name: '5', key: '5' },
        { name: '6', key: '6' },
        { name: '7', key: '7' },
        { name: '8', key: '8' },
        { name: '9', key: '9' },
        { name: '10', key: '10' },
        { name: '11', key: '11' },
        { name: '12', key: '12' },
        { name: '13', key: '13' },
        { name: '14', key: '14' },
        { name: '15', key: '15' },
        { name: '16', key: '16' },
        { name: '17', key: '17' },
        { name: '18', key: '18' },
        { name: '19', key: '19' },
        { name: '20', key: '20' },
        { name: '21', key: '21' },
        { name: '22', key: '22' },
        { name: '23', key: '23' },
        { name: '24', key: '24' },
        { name: '25', key: '25' },
        { name: '26', key: '26' },
        { name: '27', key: '27' },
        { name: '28', key: '28' },
        { name: '29', key: '29' },
        { name: '30', key: '30' },
        { name: '31', key: '31' },
        { name: '32', key: '32' },
        { name: '33', key: '33' },
        { name: '34', key: '34' },
        { name: '35', key: '35' },
        { name: '36', key: '36' },
        { name: '37', key: '37' },
        { name: '38', key: '38' },
        { name: '39', key: '39' },
        { name: '40', key: '40' },
        { name: '41', key: '41' },
        { name: '42', key: '42' },
        { name: '43', key: '43' },
        { name: '44', key: '44' },
        { name: '45', key: '45' },
        { name: '46', key: '46' },
        { name: '47', key: '47' },
        { name: '48', key: '48' },
        { name: '49', key: '49' },
        { name: '50', key: '50' },
        { name: '51', key: '51' },
        { name: '52', key: '52' },
        { name: '53', key: '53' },
        { name: '54', key: '54' },
        { name: '55', key: '55' },
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
