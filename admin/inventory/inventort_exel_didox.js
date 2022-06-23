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
        // worksheet.getCell(cell.cell).fullAddress = { col: { width: 300, }, row: { height: 500 } }
        // console.log(worksheet.properties);
        worksheet.getCell(cell.cell).value = cell.value
        worksheet.getCell(cell.cell).style = {
            font: { name: 'Calibri', size: 12, bold: true },
            border: {
                top: { color: { argb: '000000' }, style: 'thin' },
                right: { color: { argb: '000000' }, style: 'thin' },
                bottom: { color: { argb: '000000' }, style: 'thin' },
                left: { color: { argb: '000000' }, style: 'thin' },
                diagonal: { color: { argb: '000000' }, style: 'thin' },
            },
            alignment: {
                horizontal: "center",
                vertical: "middle",
                shrinkToFit: true

            },
            fill: {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: cell.fColor },
            },
            protection: { locked: false }
        }
    }
}

module.exports = fp((instance, _, next) => {

    const didocXls = async (request, reply) => {
        try {
            const { id } = request.params
            const { type } = request.query
            const items = []
            const purchase = {}
            const exelItems = []
            index = 1
            totalAmount = 0
            if (type == 'exel') {
                for (const it of items) {
                    let amount = it.quality * it.purchase_cost
                    try {
                        const good = await instance.goodsSales.findById(it.product_id).lean()

                        if (good) {
                            it.sold_by = good.sold_by
                            it.barcode = good.barcode
                            it.product_name = good.name
                            if (good.item_type == 'variant') {
                                it.product_name = `${good.parent_name} (${good.name})`
                            }
                        }
                    } catch (error) { }
                    barcode = ''
                    for (const bar of it.barcode) {
                        barcode += bar + ', '
                    }
                    price = it.purchase_cost ? it.purchase_cost : 0
                    totalAmount += amount
                    amount = (amount ? (Math.round(amount * 100) / 100).toLocaleString() : (amount + '')) + (it.purchase_cost_currency == 'usd' ? ' $' : '')
                    // amount ? amount : 0
                    exelItems.push([
                        index,
                        it.product_name + '',
                        barcode,
                        it.sold_by,
                        it.quality,
                        price,
                        amount
                    ])
                    index++
                }
            } else {
                for (const it of items) {
                    let amount = it.quality * it.purchase_cost
                    try {
                        const good = await instance.goodsSales.findById(it.product_id).lean()
                        if (good) {
                            it.product_name = good.name
                            if (good.item_type == 'variant') {
                                it.product_name = `${good.parent_name} (${good.name})`
                            }
                        }
                    } catch (error) { }
                    pdfItems.push({
                        product_name: it.product_name + '',
                        quality: it.quality + '',
                        purchase_cost: (it.purchase_cost ? (Math.round(it.purchase_cost * 100) / 100).toLocaleString() : (it.purchase_cost + '')) + (it.purchase_cost_currency == 'usd' ? ' $' : ''),
                        amount: (amount ? (Math.round(amount * 100) / 100).toLocaleString() : (amount + '')) + (it.purchase_cost_currency == 'usd' ? ' $' : '')
                    })
                }
            }

            const time = new Date().getTime()
            const title = `Purchase order ${purchase.p_order}`

            if (type == 'exel') {
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
                worksheet.properties.defaultColWidth = 200;
                // worksheet.getCell('B2').value = `Приходная накладная ${purchase.p_order} от ${moment(purchase.expected_on).format("DD.MM.YYYY")}`;
                // worksheet.getCell('B2').alignment = { vertical: 'middle', horizontal: 'center' };
                // worksheet.getCell('B2').font = { name: 'times new roman', size: 16, bold: true };
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
                    { cell: 'B6', fColor: 'FF0000', value: `Тип счета-фактуры` },
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
                    { cell: 'M7', fColor: 'FF0000', value: `Идентификационный код и название по Единому электронному национальному каталогу товаров (услуг)` },
                    { cell: 'O7', fColor: 'FF0000', value: `Ед. изм. (код)` },
                    { cell: 'R7', fColor: 'FF0000', value: `Стоимость поставки` },
                    { cell: 'S7', fColor: 'FF0000', value: `НДС` },
                    { cell: 'S8', fColor: 'FF0000', value: `Ставка` },
                    { cell: 'T8', fColor: 'FF0000', value: `Сумма` },
                    { cell: 'U7', fColor: 'FF0000', value: `Стоимость поставки с учетом НДС` },
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

                // worksheet.getCell(`B${exelItems.length + 11}`).value = `Отпустил`
                // worksheet.getCell(`F${exelItems.length + 11}`).value = `Получил`
                // worksheet.getCell(`G${exelItems.length + 9}`).value = `Итого`
                // worksheet.getCell(`H${exelItems.length + 9}`).value = totalAmount.toLocaleString()

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

                const file = `${time}.xlsx`;
                const file_dir = path.join(__dirname, '..', '..', '/static/', file)

                await workbook.xlsx.writeFile(file_dir);

                reply.sendFile(`./${time}.xlsx`)
                setTimeout(() => {
                    fs.unlink(`./static/${time}.xlsx`, (err) => {
                        if (err) {
                            instance.send_Error('exported ' + time + ' file', JSON.stringify(err))
                        }
                    })
                }, 2000);
            } else {
                const doc = new PDFDocument;
                doc.registerFont('NotoSansRegular', './static/pdfFonts/ya_r.ttf');
                doc.registerFont('NotoSansBold', './static/pdfFonts/ya_b.ttf')

                try {
                    const stream = doc.pipe(fs.createWriteStream(`./static/${time}.pdf`));
                    // building pdf
                    const data = {
                        title: title,
                        inv_type: 'purchase',
                        purchase_type: purchase.type,
                        notes: purchase.notes ? purchase.notes + '' : '',
                        purchase_order_date: typeof purchase.purchase_order_date == typeof 5 ? instance.date_ddmmyy(purchase.purchase_order_date) : '',
                        expected_on: typeof purchase.expected_on == typeof 5 ? instance.date_ddmmyy(purchase.expected_on) : '',
                        ordered_by_name: typeof purchase.ordered_by_name == typeof 'invan' ? purchase.ordered_by_name : '',
                        supplier_name: typeof purchase.supplier_name == typeof 'invan' ? purchase.supplier_name : '',
                        service_name: typeof purchase.service_name == typeof 'invan' ? purchase.service_name : '',
                        total: (purchase.total ? purchase.total.toLocaleString() : purchase.total + '') + (purchase.total_currency == 'usd' ? ' $' : ''),
                        headers: [
                            {
                                header: 'ITEM NAME',
                                id: 'product_name',
                                width: 300,
                                align: 'left',
                                renderer: function (tb, data) {
                                    doc.font('NotoSansRegular')
                                    doc.fontSize(11)
                                    return data.product_name;
                                }
                            },
                            {
                                header: 'QUANTITY',
                                id: 'quality',
                                width: 70,
                                align: 'right'
                            },
                            {
                                header: 'PRICE',
                                id: 'purchase_cost',
                                width: 70,
                                align: 'right'
                            },
                            {
                                header: 'AMOUNT',
                                id: 'amount',
                                width: 70,
                                align: 'right'
                            }
                        ],
                        items: pdfItems
                    }
                    instance.inventoryPdf(doc, data)
                    doc.end();
                    stream.on('finish', async function () {
                        reply.sendFile(`/${time}.pdf`)
                        setTimeout(() => {
                            fs.unlink(`./static/${time}.pdf`, (err) => {
                                if (err) {
                                    instance.send_Error('exported items file', JSON.stringify(err))
                                }
                            })
                        }, 2000)
                    })
                }
                catch (error) {
                    return reply.send(error.message)
                }
            }
        } catch (error) {
            return reply.send(error.message)
        }
    }

    instance.get('/inventory/didox/pdf', async (request, reply) => {
        didocXls(request, reply)
        // getPurchasePdf(request, reply)
        return reply;
    })

    next()
})
