const fp = require('fastify-plugin')
const PDFDocument = require('pdfkit');
const ExcelJs = require('exceljs');
const fs = require('fs');
const path = require('path')
const moment = require('moment')

const getPurchasePdf = async (request, reply, instance) => {
    try {
        const { id } = request.params
        const { type } = request.query

        const purchase = await instance.inventoryPurchase.findById(id).lean()
        if (!purchase)
            return reply.send('Purchase not found')

        const service = await instance.services
            .findById(purchase.service, { name: 1 })
            .lean()
        if (service)
            purchase.service_name = service.name

        const supplier = await instance.adjustmentSupplier
            .findById(purchase.supplier_id, { supplier_name: 1 })
            .lean()
        if (supplier)
            purchase.supplier_name = supplier.supplier_name

        const orderer = await instance.User
            .findById(purchase.ordered_by_id, { name: 1 })
            .lean()
        if (orderer)
            purchase.ordered_by_name = orderer.name

        const items = await instance.purchaseItem.find({ purchase_id: purchase._id }).lean()
        const pdfItems = []
        const exelItems = []
        index = 1
        totalAmount = 0
        if (type == 'exel') {
            for (const it of items) {
                let amount = it.quality * it.purchase_cost
                try {
                    const good = await instance.goodsSales
                        .findById(
                            it.product_id,
                            { sold_by: 1, barcode: 1, name: 1, item_type: 1 },
                        )
                        .lean()

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
                amount = (amount
                    ? (Math.round(amount * 100) / 100).toLocaleString()
                    : (amount + '')) + (it.purchase_cost_currency == 'usd'
                        ? ' $'
                        : ''
                    )
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
                    const good = await instance.goodsSales
                        .findById(
                            it.product_id,
                            { sold_by: 1, barcode: 1, name: 1, item_type: 1, parent_name: 1 },
                        )
                        .lean()
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
                    purchase_cost: (it.purchase_cost
                        ? (Math.round(it.purchase_cost * 100) / 100).toLocaleString()
                        : (it.purchase_cost + '')) + (it.purchase_cost_currency == 'usd'
                            ? ' $'
                            : ''
                        ),
                    amount: (amount
                        ? (Math.round(amount * 100) / 100).toLocaleString()
                        : (amount + '')) + (it.purchase_cost_currency == 'usd'
                            ? ' $'
                            : ''
                        )
                })
            }
        }
        if (type == 'exel') {
            for (const it of purchase.additional_cost) {
                price = it.amount ? it.amount : 0
                amount = (it.amount
                    ? (Math.round(it.amount * 100) / 100).toLocaleString()
                    : (it.amount + '')) + (it.amount_currency == 'usd'
                        ? ' $'
                        : ''
                    )
                // it.amount ? it.amount : 0
                totalAmount += it.amount ? it.amount : 0
                exelItems.push([
                    index,
                    it.name + '',
                    '',
                    '',
                    1,
                    price,
                    amount
                ])
                index++
            }
        }
        else {
            for (const it of purchase.additional_cost) {
                pdfItems.push({
                    product_name: it.name + '',
                    quality: '1',
                    purchase_cost: (it.amount
                        ? (Math.round(it.amount * 100) / 100).toLocaleString()
                        : (it.amount + '')) + (it.amount_currency == 'usd'
                            ? ' $'
                            : ''
                        ),
                    amount: (it.amount
                        ? (Math.round(it.amount * 100) / 100).toLocaleString()
                        : (it.amount + '')) + (it.amount_currency == 'usd'
                            ? ' $'
                            : ''
                        )
                })
            }
        }
        const time = new Date().getTime()
        const title = `Purchase order ${purchase.p_order}`

        if (type == 'exel') {
            const headers = [
                { name: ' № п.п.', key: 'id', width: 10 },
                { name: 'Наименование', key: 'id', width: 300 },
                { name: 'Штрих код', key: 'barcode', width: 5000 },
                { name: 'Ед. изм.', key: 'type', width: 1000 },
                { name: 'Кол-во', key: 'quantity', width: 100 },
                { name: 'Цена', key: 'price', width: 100 },
                { name: 'Сумма', key: 'Amount', filterButton: false, width: 100 },
                // { name: 'Amount', totalsRowFunction: 'sum', filterButton: false },
            ]
            const workbook = new ExcelJs.Workbook();
            const worksheet = workbook.addWorksheet('MyExcel', {
                pageSetup: { paperSize: 9, orientation: 'landscape' }
            });
            worksheet.properties.defaultColWidth = 200;
            worksheet.getCell('B2').value = `Приходная накладная ${purchase.p_order} от ${moment(purchase.expected_on).format("DD.MM.YYYY")}`;
            // worksheet.getCell('B2').alignment = { vertical: 'middle', horizontal: 'center' };
            worksheet.getCell('B2').font = { name: 'times new roman', size: 16, bold: true };
            worksheet.getCell('B3').value = `Поставщик:      ${purchase.supplier_name}`
            worksheet.getCell('B4').value = `Покупатель:     ${purchase.service_name}`
            worksheet.getCell('B5').value = `По заказу:        ${purchase.ordered_by_name}`

            worksheet.getCell(`B${exelItems.length + 11}`).value = `Отпустил`
            worksheet.getCell(`F${exelItems.length + 11}`).value = `Получил`
            worksheet.getCell(`G${exelItems.length + 9}`).value = `Итого`
            worksheet.getCell(`H${exelItems.length + 9}`).value = totalAmount.toLocaleString()

            multiMergeCells(worksheet, ['B2:H2', 'B3:H3', 'B4:H4', 'B5:H5', 'B6:H6',])
            multiSetAlign(worksheet, [
                { col: 'B', rows: [10, 10 + exelItems.length], },
                { col: 'J', rows: [10, 10 + exelItems.length], vertical: 'bottom', horizontal: 'right' },
            ])
            removeBorders(worksheet, [
                { cell: `B2` }, { cell: `B3` }, { cell: `B4` }, { cell: `B5` }, { cell: `B6` },
                { cell: `D2` }, { cell: `D3` }, { cell: `D4` }, { cell: `D5` }, { cell: `D6` },
                { cell: `B7`, bottom: 'A9A9A9' }, { cell: `C7`, bottom: 'A9A9A9' },
                { cell: `D7`, bottom: 'A9A9A9' }, { cell: `E7`, bottom: 'A9A9A9' },
                { cell: `F7`, bottom: 'A9A9A9' }, { cell: `G7`, bottom: 'A9A9A9' },
                { cell: `H7`, bottom: 'A9A9A9' },
                { cell: `B${exelItems.length + 9}`, top: 'A9A9A9' },
                { cell: `C${exelItems.length + 9}`, top: 'A9A9A9' },
                { cell: `D${exelItems.length + 9}`, top: 'A9A9A9' },
                { cell: `E${exelItems.length + 9}`, top: 'A9A9A9' },
                { cell: `F${exelItems.length + 9}`, top: 'A9A9A9', right: 'A9A9A9' },
                { cell: `B${exelItems.length + 10}` },
                { cell: `C${exelItems.length + 10}` },
                { cell: `D${exelItems.length + 10}` },
                { cell: `F${exelItems.length + 10}` },
                { cell: `G${exelItems.length + 10}`, top: 'A9A9A9' },
                { cell: `H${exelItems.length + 10}`, top: 'A9A9A9', right: 'A9A9A9' },
                { cell: `B${exelItems.length + 11}` },
                { cell: `F${exelItems.length + 11}` },
                { cell: `C${exelItems.length + 11}`, bottom: 'A9A9A9' },
                { cell: `D${exelItems.length + 11}`, bottom: 'A9A9A9' },
                { cell: `E${exelItems.length + 11}`, bottom: 'A9A9A9' },
                { cell: `G${exelItems.length + 11}`, bottom: 'A9A9A9' },
                { cell: `H${exelItems.length + 11}`, bottom: 'A9A9A9', right: 'A9A9A9' },
            ])

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
                    purchase_order_date: typeof purchase.purchase_order_date == typeof 5
                        ? instance.date_ddmmyy(purchase.purchase_order_date) : '',
                    expected_on: typeof purchase.expected_on == typeof 5
                        ? instance.date_ddmmyy(purchase.expected_on)
                        : '',
                    ordered_by_name: typeof purchase.ordered_by_name == typeof 'invan'
                        ? purchase.ordered_by_name
                        : '',
                    supplier_name: typeof purchase.supplier_name == typeof 'invan'
                        ? purchase.supplier_name
                        : '',
                    service_name: typeof purchase.service_name == typeof 'invan'
                        ? purchase.service_name
                        : '',
                    total: (purchase.total
                        ? purchase.total.toLocaleString()
                        : purchase.total + '') + (purchase.total_currency == 'usd'
                            ? ' $'
                            : ''),
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

module.exports = fp((instance, _, next) => {
    console.log('purchase')

    const querySchema = {
        query: {
            type: 'object',
            additionalProperties: false,
            required: [],
            properties: {
                type: { type: 'string', enum: ['exel', 'pdf'] },
            }
        }
    }

    instance.get(
        '/inventory/purchase/pdf/:id/:name',
        {
            version: '1.0.0',
            schema: querySchema,
            attachValidation: true,
            preValidation: [instance.auth_supplier]
        },
        (request, reply) => {
            if (request.validationError) {
                return reply.validation(request.validationError.message)
            }
            return getPurchasePdf(request, reply, instance)
        }
    );

    next()
})