
const PDFDocument = require('pdfkit');
const ExcelJs = require('exceljs');
const fs = require('fs');
const path = require('path')
const moment = require('moment')

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
const multiSetAlign = (worksheet, list) => {
    for (const cell of list) {
        console.log(cell);
        for (const row of cell.rows) {
            worksheet.getCell(`${cell.col}${row}`).alignment = {
                vertical: cell.vertical ? cell.vertical : 'middle',
                horizontal: cell.horizontal ? cell.horizontal : 'center',
                shrinkToFit: true
            };
        }
    }
}
const multiMergeCells = (worksheet, list) => {
    for (const cell of list) {
        worksheet.mergeCells(cell)
    }
}

module.exports = ((instance, _, next) => {

    const getPurchasePdf = async (request, reply) => {
        try {
            const id = request.params.id
            const purchase = await instance.inventoryPurchase.findById(id)
            if (!purchase) {
                return reply.send('Purchase not found')
            }

            try {
                const service = await instance.services.findById(purchase.service)
                if (service) {
                    purchase.service_name = service.name
                }
            } catch (error) { }

            try {
                const supplier = await instance.adjustmentSupplier.findById(purchase.supplier_id)
                if (supplier) {
                    purchase.supplier_name = supplier.supplier_name
                }
            } catch (error) { }

            try {
                const orderer = await instance.User.findById(purchase.ordered_by_id)
                if (orderer) {
                    purchase.ordered_by_name = orderer.name
                }
            } catch (error) { }

            const items = await instance.purchaseItem.find({ purchase_id: purchase._id })
            const pdfItems = []
            for (const it of items) {
                let amount = it.quality * it.purchase_cost
                try {
                    const good = await instance.goodsSales.findById(it.product_id)
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

            for (const it of purchase.additional_cost) {
                pdfItems.push({
                    product_name: it.name + '',
                    quality: '1',
                    purchase_cost: (it.amount ? (Math.round(it.amount * 100) / 100).toLocaleString() : (it.amount + '')) + (it.amount_currency == 'usd' ? ' $' : ''),
                    amount: (it.amount ? (Math.round(it.amount * 100) / 100).toLocaleString() : (it.amount + '')) + (it.amount_currency == 'usd' ? ' $' : '')
                })
            }
            const doc = new PDFDocument;
            doc.registerFont('NotoSansRegular', './static/pdfFonts/ya_r.ttf');
            doc.registerFont('NotoSansBold', './static/pdfFonts/ya_b.ttf')

            const time = new Date().getTime()
            try {
                const stream = doc.pipe(fs.createWriteStream(`./static/${time}.pdf`));
                // building pdf
                const title = `Purchase order ${purchase.p_order}`
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
        } catch (error) {
            return reply.send(error.message)
        }
    }
    const getPurchasePdfNewUmar = async (request, reply) => {
        try {
            const { id } = request.params
            const { type } = request.query

            const purchase = await instance.inventoryPurchase.findById(id)
            if (!purchase) {
                return reply.send('Purchase not found')
            }

            try {
                const service = await instance.services.findById(purchase.service)
                if (service) {
                    purchase.service_name = service.name
                }
            } catch (error) { }

            try {
                const supplier = await instance.adjustmentSupplier.findById(purchase.supplier_id)
                if (supplier) {
                    purchase.supplier_name = supplier.supplier_name
                }
            } catch (error) { }

            try {
                const orderer = await instance.User.findById(purchase.ordered_by_id)
                if (orderer) {
                    purchase.ordered_by_name = orderer.name
                }
            } catch (error) { }

            const items = await instance.purchaseItem.find({ purchase_id: purchase._id })
            const pdfItems = []
            const exelItems = []
            index = 1
            totalAmount = 0
            if (type == 'exel') {
                for (const it of items) {
                    let amount = it.quality * it.purchase_cost
                    try {
                        const good = await instance.goodsSales.findById(it.product_id)

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
                        const good = await instance.goodsSales.findById(it.product_id)
                        if (good) {
                            it.product_name = good.name
                            if (good.item_type == 'variant') {
                                it.product_name = `${good.parent_name} (${good.name})`
                            }
                        }
                    } catch (error) { }
                    pdfItems.push({
                        barcode:it.barcode,
                        product_name: it.product_name + '',
                        quality: it.quality + '',
                        purchase_cost: (it.purchase_cost ? (Math.round(it.purchase_cost * 100) / 100).toLocaleString() : (it.purchase_cost + '')) + (it.purchase_cost_currency == 'usd' ? ' $' : ''),
                        amount: (amount ? (Math.round(amount * 100) / 100).toLocaleString() : (amount + '')) + (it.purchase_cost_currency == 'usd' ? ' $' : '')
                    })
                }
            }
            if (type == 'exel') {
                for (const it of purchase.additional_cost) {
                    price = it.amount ? it.amount : 0
                    amount = (it.amount ? (Math.round(it.amount * 100) / 100).toLocaleString() : (it.amount + '')) + (it.amount_currency == 'usd' ? ' $' : '')
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
                    console.log("it", it)
                    pdfItems.push({
                        barcode:it.barcode,
                        product_name: it.name + '',
                        quality: '1',
                        purchase_cost: (it.amount ? (Math.round(it.amount * 100) / 100).toLocaleString() : (it.amount + '')) + (it.amount_currency == 'usd' ? ' $' : ''),
                        amount: (it.amount ? (Math.round(it.amount * 100) / 100).toLocaleString() : (it.amount + '')) + (it.amount_currency == 'usd' ? ' $' : '')
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
                                width: 230,
                                align: 'left',
                                renderer: function (tb, data) {
                                    doc.font('NotoSansRegular')
                                    doc.fontSize(10)
                                    return data.product_name;
                                }
                            },
                            {
                                header: 'BARCODE',
                                id: 'barcode',
                                width: 70,
                                align: 'left',
                                renderer: function (tb, data) {
                                    doc.font('NotoSansRegular')
                                    doc.fontSize(10)
                                    console.log(data)
                                    return data.barcode;
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
    instance.get('/inventory/purchase/pdf/:id/:name', async (request, reply) => {
        getPurchasePdfNewUmar(request, reply)
        // getPurchasePdf(request, reply)
        return reply;
    })

    instance.get('/inventory/purchase/pdf_for_supplier/:id/:name', async (request, reply) => {
        const { id } = request.params

        const purchase = await instance.inventoryPurchase.findById(id, { _id: 1, status: 1 }).lean()
        if (!purchase) {
            return reply.send('Purchase not found')
        }
        if (purchase.status !== 'pending') {
            return reply.status(421).send({ message: 'Not allowed' })
        }

        request.query.type = 'pdf'

        getPurchasePdfNewUmar(request, reply)
        return reply;
    })

    const getTransferPdf = async (request, reply) => {
        try {
            const id = request.params.id
            const { type } = request.query
            const transfer = await instance.Transfer.findById(id).lean()
            if (!transfer) {
                return reply.send('Transfer not found')
            }
            let total = 0;
            for (const itm of transfer.items) {
                total += (itm.quality * itm.price) ? itm.quality * itm.price : 0;
            }

            try {
                const first_service = await instance.services.findById(transfer.first_service).lean()
                if (first_service) {
                    transfer.first_service_name = first_service.name
                }
            } catch (error) { }

            try {
                const second_service = await instance.services.findById(transfer.second_service).lean()
                if (second_service) {
                    transfer.second_service_name = second_service.name
                }
            } catch (error) { }

            try {
                const orderer = await instance.User.findById(ordered_by_id).lean()
                if (orderer) {
                    transfer.ordered_by_name = orderer.name
                }
            } catch (error) { }

            const pdfItems = []
            const exelItems = []
            index = 1
            totalAmount = 0
            if (type == 'exel') {
                for (const it of transfer.items) {
                    let amount = it.quality * it.price
                    try {
                        const good = await instance.goodsSales
                            .findById(it.product_id, { name: 1, barcode: 1, item_type: 1, parent_name: 1 })
                            .lean()

                        if (good) {
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
                    price = it.price ? it.price : 0
                    totalAmount += amount
                    amount = (
                        amount
                            ? (Math.round(amount * 100) / 100).toLocaleString()
                            : (amount + '')) + (it.price == 'usd' ? ' $' : ''
                        )

                    exelItems.push([
                        index,
                        it.product_name + '',
                        barcode,
                        it.quality,
                        it.price ? it.price.toLocaleString() : '',
                        amount
                    ])
                    index++
                }
            } else {
                for (const it of transfer.items) {
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
                        price: it.price ? it.price.toLocaleString() : ''
                    })
                }
            }

            const time = new Date().getTime()
            const title = `Transfer order ${transfer.p_order}`
            if (type == 'exel') {
                const headers = [
                    { name: '№ п.п.', key: 'id', width: 10 }, // width berish beforyda ishlamaydi
                    { name: 'ITEM NAME', key: 'id', width: 300 },
                    { name: 'Штрих код', key: 'barcode', width: 5000 },
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
                worksheet.getCell('B2').value = `Transfer order ${transfer.p_order}`;
                // worksheet.getCell('B2').alignment = { vertical: 'middle', horizontal: 'center' };
                worksheet.getCell('B2').font = { name: 'times new roman', size: 16, bold: true };
                // worksheet.getCell('B3').value = `Поставщик:      ${purchase.supplier_name}`
                worksheet.getCell('B4').value = `Date:     ${moment(transfer.date).format("DD.MM.YYYY")}`
                worksheet.getCell('B5').value = `Created by:        ${transfer.ordered_by_name}`
                worksheet.getCell('B6').value = `Source store:        ${transfer.first_service_name}`
                worksheet.getCell('B7').value = `Destination store:        ${transfer.second_service_name}`

                // worksheet.getCell(`B${exelItems.length + 11}`).value = `Отпустил`
                // worksheet.getCell(`F${exelItems.length + 11}`).value = `Получил`
                // worksheet.getCell(`G${exelItems.length + 9}`).value = `Итого`
                // worksheet.getCell(`H${exelItems.length + 9}`).value = totalAmount.toLocaleString()

                multiMergeCells(worksheet, ['B2:H2', 'B3:H3', 'B4:H4', 'B5:H5', 'B6:H6', 'B7:H7',])
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
                        inv_type: 'transfer',
                        notes: transfer.notes ? transfer.notes + '' : '',
                        date: typeof transfer.date == typeof 5 ? instance.date_ddmmyy(transfer.date) : '',
                        ordered_by_name: typeof transfer.ordered_by_name == typeof 'invan' ? transfer.ordered_by_name : '',
                        first_service_name: typeof transfer.first_service_name == typeof 'invan' ? transfer.first_service_name : '',
                        second_service_name: typeof transfer.second_service_name == typeof 'invan' ? transfer.second_service_name : '',
                        total: total.toLocaleString(),
                        headers: [
                            {
                                header: 'ITEM NAME',
                                id: 'product_name',
                                width: 370,
                                align: 'left',
                                renderer: function (tb, data) {
                                    doc.font('NotoSansRegular')
                                    doc.fontSize(12)
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
                                id: 'price',
                                width: 70,
                                align: 'right'
                            },
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

    instance.get('/inventory/transfer/pdf/:id/:name', async (request, reply) => {
        getTransferPdf(request, reply)
        return reply;
    })

    const getStockPdf = async (request, reply) => {
        try {
            const id = request.params.id
            const { type } = request.query
            const stock = await instance.stockAdjustment.findById(id).lean()

            if (!stock) {
                return reply.send('Stock not found')
            }

            try {
                const service = await instance.services.findById(stock.service).lean()
                if (service) {
                    stock.service_name = service.name
                }
            } catch (error) { }

            try {
                const adjusted = await instance.User.findById(stock.adjusted_by_id).lean()
                if (adjusted) {
                    stock.adjusted_by = adjusted.name
                }
            } catch (error) { }

            const items = await instance.stockAdjustmentItems
                .find({ stock_adjustment_id: stock._id })
                .lean()

            const pdfItems = []
            const exelItems = []
            index = 1
            totalAmount = 0
            if (type == 'exel') {
                for (const it of items) {
                    // let amount = it.quality * it.purchase_cost
                    try {
                        const good = await instance.goodsSales
                            .findById(it.product_id, { name: 1, sold_by: 1, barcode: 1, parent_name: 1, })
                            .lean()

                        if (good) {
                            // it.sold_by = good.sold_by
                            // it.barcode = good.barcode
                            it.product_name = good.name
                            if (good.item_type == 'variant') {
                                it.product_name = `${good.parent_name} (${good.name})`
                            }
                        }
                    } catch (error) { }
                    // barcode = ''
                    // for (const bar of it.barcode) {
                    //     barcode += bar + ', '
                    // }
                    price = it.purchase_cost ? it.purchase_cost : 0
                    // totalAmount += amount
                    // amount = (amount ? (Math.round(amount * 100) / 100).toLocaleString() : (amount + '')) + (it.purchase_cost_currency == 'usd' ? ' $' : '')
                    // amount ? amount : 0
                    exelItems.push([
                        index,
                        it.product_name + '',
                        stock.reason,
                        it.in_stock,
                        it.changed,
                        it.stock_after,
                    ])
                    // barcode,
                    // price,
                    // amount
                    index++
                }
            } else {
                for (const it of items) {
                    if (it.cost_currency != 'usd' && typeof it.cost == typeof 5) {
                        it.cost = Math.round(it.cost)
                    }
                    else if (typeof it.cost == typeof 5) {
                        it.cost = Math.round(it.cost * 100) / 100
                    }
                    try {
                        const good = await instance.goodsSales
                            .findById(it.product_id, { name: 1, item_type: 1, parent_name: 1 })
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
                        changed: it.changed + '',
                        cost: (it.cost ? it.cost.toLocaleString() : it.cost + '') + (it.cost_currency == 'usd' ? ' $' : '')
                    })
                }
            }

            const time = new Date().getTime()
            const title = `Stock adjustment ${stock.p_order}`
            if (type == 'exel') {
                const headers = [
                    { name: '№', key: 'id', width: 10 },
                    { name: 'ITEM NAME', key: 'id', width: 300 },
                    { name: 'REASON', key: 'reason', width: 100 },
                    { name: 'IN STOCK', key: 'in_stock', width: 100 },
                    { name: 'REMOVE STOCK', key: 'rm_stock', width: 100 },
                    { name: 'STOCK AFTER', key: 'stock_after', width: 100 },
                    // { name: 'Сумма', key: 'Amount', filterButton: false, width: 100 },
                    // { name: 'Amount', totalsRowFunction: 'sum', filterButton: false },
                ]
                const workbook = new ExcelJs.Workbook();
                const worksheet = workbook.addWorksheet('MyExcel', {
                    pageSetup: { paperSize: 9, orientation: 'landscape' }
                });
                worksheet.properties.defaultColWidth = 200;
                worksheet.getCell('B2').value = `Stock adjustment ${stock.p_order}`;
                // worksheet.getCell('B2').alignment = { vertical: 'middle', horizontal: 'center' };
                worksheet.getCell('B2').font = { name: 'times new roman', size: 16, bold: true };
                worksheet.getCell('B4').value = `Date:     ${moment(stock.date).format("DD.MM.YYYY")}`
                worksheet.getCell('B4').value = `Reason:      ${stock.reason}`
                worksheet.getCell('B5').value = `Adjusted by:     ${stock.adjusted_by}`
                worksheet.getCell('B6').value = `Store::        ${stock.service_name}`

                // worksheet.getCell(`B${exelItems.length + 11}`).value = `Отпустил`
                // worksheet.getCell(`F${exelItems.length + 11}`).value = `Получил`
                // worksheet.getCell(`G${exelItems.length + 9}`).value = `Итого`
                // worksheet.getCell(`H${exelItems.length + 9}`).value = totalAmount.toLocaleString()

                multiMergeCells(worksheet, ['B2:E2', 'B3:E3', 'B4:E4', 'B5:E5', 'B6:E6',])
                multiSetAlign(worksheet, [
                    { col: 'B', rows: [10, 10 + exelItems.length], },
                    // { col: 'J', rows: [10, 10 + exelItems.length], vertical: 'bottom', horizontal: 'right' },
                ])
                removeBorders(worksheet, [
                    { cell: `B2` }, { cell: `B3` }, { cell: `B4` }, { cell: `B5` }, { cell: `B6` },
                    { cell: `D2` }, { cell: `D3` }, { cell: `D4` }, { cell: `D5` }, { cell: `D6` },
                    { cell: `B7`, bottom: 'A9A9A9' }, { cell: `C7`, bottom: 'A9A9A9' },
                    { cell: `D7`, bottom: 'A9A9A9' }, { cell: `E7`, bottom: 'A9A9A9' },
                    // { cell: `F7`, bottom: 'A9A9A9' }, { cell: `G7`, bottom: 'A9A9A9' },
                    // { cell: `H7`, bottom: 'A9A9A9' },
                    // { cell: `B${exelItems.length + 9}`, top: 'A9A9A9' },
                    // { cell: `C${exelItems.length + 9}`, top: 'A9A9A9' },
                    // { cell: `D${exelItems.length + 9}`, top: 'A9A9A9' },
                    // { cell: `E${exelItems.length + 9}`, top: 'A9A9A9' },
                    // { cell: `F${exelItems.length + 9}`, top: 'A9A9A9', right: 'A9A9A9' },
                    // { cell: `B${exelItems.length + 10}` },
                    // { cell: `C${exelItems.length + 10}` },
                    // { cell: `D${exelItems.length + 10}` },
                    // { cell: `F${exelItems.length + 10}` },
                    // { cell: `G${exelItems.length + 10}`, top: 'A9A9A9' },
                    // { cell: `H${exelItems.length + 10}`, top: 'A9A9A9', right: 'A9A9A9' },
                    // { cell: `B${exelItems.length + 11}` },
                    // { cell: `F${exelItems.length + 11}` },
                    // { cell: `C${exelItems.length + 11}`, bottom: 'A9A9A9' },
                    // { cell: `D${exelItems.length + 11}`, bottom: 'A9A9A9' },
                    // { cell: `E${exelItems.length + 11}`, bottom: 'A9A9A9' },
                    // { cell: `G${exelItems.length + 11}`, bottom: 'A9A9A9' },
                    // { cell: `H${exelItems.length + 11}`, bottom: 'A9A9A9', right: 'A9A9A9' },
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

                let headers = []
                switch (stock.reason) {
                    case 'receive': {
                        headers = [
                            {
                                header: 'ITEM NAME',
                                id: 'product_name',
                                width: 370,
                                align: 'left',
                                renderer: function (tb, data) {
                                    doc.font('NotoSansRegular')
                                    doc.fontSize(12)
                                    return data.product_name;
                                }
                            },
                            {
                                header: 'ADD STOCK',
                                id: 'changed',
                                width: 70,
                                align: 'right'
                            },
                            {
                                header: 'COST',
                                id: 'cost',
                                width: 70,
                                align: 'right'
                            }
                        ]
                        break
                    }
                    case 'recount': {
                        headers = [
                            {
                                header: 'ITEM NAME',
                                id: 'product_name',
                                width: 360,
                                align: 'left',
                                renderer: function (tb, data) {
                                    doc.font('NotoSansRegular')
                                    doc.fontSize(12)
                                    return data.product_name;
                                }
                            },
                            {
                                header: 'COUNTED STOCK',
                                id: 'changed',
                                width: 150,
                                align: 'right'
                            }
                        ]
                        break
                    }
                    case 'loss':
                    case 'damage':
                    case 'fee': {
                        headers = [
                            {
                                header: 'ITEM NAME',
                                id: 'product_name',
                                width: 360,
                                align: 'left',
                                renderer: function (tb, data) {
                                    doc.font('NotoSansRegular')
                                    doc.fontSize(12)
                                    return data.product_name;
                                }
                            },
                            {
                                header: 'REMOVE STOCK',
                                id: 'changed',
                                width: 150,
                                align: 'right'
                            }
                        ]
                        break
                    }
                }

                try {
                    const stream = doc.pipe(fs.createWriteStream(`./static/${time}.pdf`, { encoding: 'utf8' }));
                    // building pdf
                    const data = {
                        title: title,
                        inv_type: 'stock',
                        notes: stock.notes ? stock.notes + '' : '',
                        date: typeof stock.date == typeof 5 ? instance.date_ddmmyy(stock.date) : '',
                        reason: stock.reason + '',
                        adjusted_by: typeof stock.adjusted_by == typeof 'invan' ? stock.adjusted_by : '',
                        service_name: typeof stock.service_name == typeof 'invan' ? stock.service_name : '',
                        headers: headers,
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

    instance.get('/inventory/stock/pdf/:id/:name', async (request, reply) => {
        getStockPdf(request, reply)
        return reply;
    })

    const getCountPdf = async (request, reply) => {
        try {
            const id = request.params.id
            const { type } = request.query
            const count = await instance.inventoryCount.findById(id).lean()
            if (!count) {
                return reply.send('Inventory count not found')
            }

            try {
                const service = await instance.services.findById(count.service).lean()
                if (service) {
                    count.service_name = service.name
                }
            } catch (error) { }

            try {
                const created_by = await instance.User.findById(count.created_by_id).lean()
                if (created_by) {
                    count.created_by = created_by.name
                }
            } catch (error) { }

            let total_cost_difference = 0
            let total_difference = 0

            const items = await instance.inventoryCountItem.find({ count_id: count._id }).lean()
            const pdfItems = []
            const exelItems = []
            index = 1
            totalAmount = 0

            if (type == 'exel') {
                for (const it of items) {
                    // let amount = it.quality * it.purchase_cost
                    try {
                        const good = await instance.goodsSales
                            .findById(it.product_id, { name: 1, sold_by: 1, barcode: 1, parent_name: 1, })
                            .lean()

                        if (good) {
                            // it.sold_by = good.sold_by
                            // it.barcode = good.barcode
                            it.product_name = good.name
                            if (good.item_type == 'variant') {
                                it.product_name = `${good.parent_name} (${good.name})`
                            }
                        }
                    } catch (error) { }
                    // barcode = ''
                    // for (const bar of it.barcode) {
                    //     barcode += bar + ', '
                    // }
                    // price = it.purchase_cost ? it.purchase_cost : 0
                    // totalAmount += amount
                    // amount = (amount ? (Math.round(amount * 100) / 100).toLocaleString() : (amount + '')) + (it.purchase_cost_currency == 'usd' ? ' $' : '')
                    // amount ? amount : 0
                    exelItems.push([
                        index,
                        it.product_name + '',
                        it.exp_in_stock ? it.exp_in_stock : 0,
                        it.counted ? it.counted : 0,
                        it.difference ? it.difference : 0,
                    ])
                    // barcode,
                    // price,
                    // amount
                    index++
                }
            } else {
                for (const it of items) {
                    let cost_difference = ''
                    if (it.cost_currency == 'usd' && it.cost_difference) {
                        cost_difference = (Math.round(it.cost_difference * 100) / 100).toLocaleString() + ' $'
                    }
                    else if (it.cost_difference) {
                        cost_difference = (Math.round(it.cost_difference * 100) / 100).toLocaleString() + ''
                    }
                    try {
                        const good = await instance.goodsSales.findById(it.product_id)
                        if (good) {
                            it.product_name = good.name
                            if (good.item_type == 'variant') {
                                it.product_name = `${good.parent_name} (${good.name})`
                            }
                        }
                    } catch (error) { }
                    pdfItems.push({
                        product_name: it.product_name + '',
                        exp_in_stock: it.exp_in_stock ? Math.round(it.exp_in_stock * 100) / 100 + '' : '',
                        counted: it.counted ? Math.round(it.counted * 100) / 100 + '' : '',
                        difference: it.difference ? (Math.round(it.difference * 100) / 100 + '') : '',
                        cost_difference: cost_difference
                    })
                }
            }
            const time = new Date().getTime()
            const title = `Inventory count ${count.p_order}`
            if (type == 'exel') {
                const headers = [
                    { name: '№', key: 'id', width: 10 },
                    { name: 'ITEM NAME', key: 'id', width: 300 },
                    { name: 'Expected stock', key: 'exp_stock', width: 100 },
                    { name: 'Counted', key: 'counted', width: 100 },
                    { name: 'Difference', key: 'difference', width: 100 },
                    // { name: 'STOCK AFTER', key: 'stock_after', width: 100 },
                    // { name: 'Сумма', key: 'Amount', filterButton: false, width: 100 },
                    // { name: 'Amount', totalsRowFunction: 'sum', filterButton: false },
                ]
                const workbook = new ExcelJs.Workbook();
                const worksheet = workbook.addWorksheet('MyExcel', {
                    pageSetup: { paperSize: 9, orientation: 'landscape' }
                });
                worksheet.properties.defaultColWidth = 200;
                worksheet.getCell('B2').value = `${count.p_order}`;
                // worksheet.getCell('B2').alignment = { vertical: 'middle', horizontal: 'center' };
                worksheet.getCell('B2').font = { name: 'times new roman', size: 16, bold: true };
                worksheet.getCell('B3').value = `Date:     ${moment(count.created_time).format("DD.MM.YYYY")}`
                worksheet.getCell('B4').value = `${count.status}`
                worksheet.getCell('B5').value = `Created by:     ${count.created_by}`
                worksheet.getCell('B6').value = `Store:        ${count.service_name}`

                // worksheet.getCell(`B${exelItems.length + 11}`).value = `Отпустил`
                // worksheet.getCell(`F${exelItems.length + 11}`).value = `Получил`
                // worksheet.getCell(`G${exelItems.length + 9}`).value = `Итого`
                // worksheet.getCell(`H${exelItems.length + 9}`).value = totalAmount.toLocaleString()

                multiMergeCells(worksheet, ['B2:E2', 'B3:E3', 'B4:E4', 'B5:E5', 'B6:E6',])
                multiSetAlign(worksheet, [
                    { col: 'B', rows: [10, 10 + exelItems.length], },
                    // { col: 'J', rows: [10, 10 + exelItems.length], vertical: 'bottom', horizontal: 'right' },
                ])
                removeBorders(worksheet, [
                    { cell: `B2` }, { cell: `B3` }, { cell: `B4` }, { cell: `B5` }, { cell: `B6` },
                    { cell: `D2` }, { cell: `D3` }, { cell: `D4` }, { cell: `D5` }, { cell: `D6` },
                    { cell: `B7`, bottom: 'A9A9A9' }, { cell: `C7`, bottom: 'A9A9A9' },
                    { cell: `D7`, bottom: 'A9A9A9' }, { cell: `E7`, bottom: 'A9A9A9' },
                    // { cell: `F7`, bottom: 'A9A9A9' }, { cell: `G7`, bottom: 'A9A9A9' },
                    // { cell: `H7`, bottom: 'A9A9A9' },
                    // { cell: `B${exelItems.length + 9}`, top: 'A9A9A9' },
                    // { cell: `C${exelItems.length + 9}`, top: 'A9A9A9' },
                    // { cell: `D${exelItems.length + 9}`, top: 'A9A9A9' },
                    // { cell: `E${exelItems.length + 9}`, top: 'A9A9A9' },
                    // { cell: `F${exelItems.length + 9}`, top: 'A9A9A9', right: 'A9A9A9' },
                    // { cell: `B${exelItems.length + 10}` },
                    // { cell: `C${exelItems.length + 10}` },
                    // { cell: `D${exelItems.length + 10}` },
                    // { cell: `F${exelItems.length + 10}` },
                    // { cell: `G${exelItems.length + 10}`, top: 'A9A9A9' },
                    // { cell: `H${exelItems.length + 10}`, top: 'A9A9A9', right: 'A9A9A9' },
                    // { cell: `B${exelItems.length + 11}` },
                    // { cell: `F${exelItems.length + 11}` },
                    // { cell: `C${exelItems.length + 11}`, bottom: 'A9A9A9' },
                    // { cell: `D${exelItems.length + 11}`, bottom: 'A9A9A9' },
                    // { cell: `E${exelItems.length + 11}`, bottom: 'A9A9A9' },
                    // { cell: `G${exelItems.length + 11}`, bottom: 'A9A9A9' },
                    // { cell: `H${exelItems.length + 11}`, bottom: 'A9A9A9', right: 'A9A9A9' },
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
                        inv_type: 'count',
                        notes: count.notes ? count.notes + '' : '',
                        created_time: typeof count.created_time == typeof 5 ? instance.date_ddmmyy(count.created_time) : '',
                        created_by: typeof count.created_by == typeof 'invan' ? count.created_by : '',
                        service_name: typeof count.service_name == typeof 'invan' ? count.service_name : '',
                        total_difference: typeof count.total_difference == typeof 5 ? count.total_difference : '',
                        total_cost_difference: typeof count.total_cost_difference == typeof 5 ? Math.round(count.total_cost_difference * 100) / 100 : '',
                        headers: [
                            {
                                header: 'Item',
                                id: 'product_name',
                                width: 230,
                                align: 'left',
                                renderer: function (tb, data) {
                                    doc.font('NotoSansRegular')
                                    doc.fontSize(12)
                                    return data.product_name;
                                }
                            },
                            {
                                header: 'Expected stock',
                                id: 'exp_in_stock',
                                width: 70,
                                align: 'right'
                            },
                            {
                                header: 'Counted',
                                id: 'counted',
                                width: 70,
                                align: 'right'
                            },
                            {
                                header: 'Difference',
                                id: 'difference',
                                width: 70,
                                align: 'right'
                            },
                            {
                                header: 'Cost difference',
                                id: 'cost_difference',
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
            reply.send(error.message)
        }
    }

    instance.get('/inventory/counts/pdf/:id/:name', async (request, reply) => {
        getCountPdf(request, reply)
        return reply;
    })

    const getProductionPdf = async (request, reply) => {
        try {
            const id = request.params.id
            const production = await instance.Production.findById(id)
            if (!production) {
                return reply.send('Production not found')
            }
            try {
                const created_by = await instance.User.findById(production.created_by_id)
                if (created_by) {
                    production.created_by = created_by.name
                }
            } catch (error) { }

            try {
                const service = await instance.services.findById(production.service)
                if (service) {
                    production.service_name = service.name
                }
            } catch (error) { }

            try {
                const employee = await instance.User.findById(production.employee)
                if (employee) {
                    production.employee_name = employee.name
                }
            } catch (error) { }

            const pdfItems = []
            for (const it of production.items) {
                let cost = ''
                if (it.cost && it.cost_currency == 'usd') {
                    cost = (Math.round(it.cost * 100) / 100).toLocaleString() + ' $'
                }
                else if (it.cost || it.cost == 0) {
                    cost = Math.round(it.cost).toLocaleString() + ''
                }
                try {
                    const good = await instance.goodsSales.findById(it.product_id)
                    if (good) {
                        it.product_name = good.name
                        if (good.item_type == 'variant') {
                            it.product_name = `${good.parent_name} (${good.name})`
                        }
                    }
                } catch (error) { }
                pdfItems.push({
                    product_name: it.product_name + '',
                    cost: cost,
                    quality: it.quality + ''
                })
            }

            const doc = new PDFDocument;
            doc.registerFont('NotoSansRegular', './static/pdfFonts/ya_r.ttf');
            doc.registerFont('NotoSansBold', './static/pdfFonts/ya_b.ttf')

            const time = new Date().getTime()
            try {
                const stream = doc.pipe(fs.createWriteStream(`./static/${time}.pdf`));
                // building pdf
                const title = `${production.type == 'production' ? 'Production' : 'Disassembly'} ${production.p_order}`
                const data = {
                    title: title,
                    inv_type: 'production',
                    notes: production.notes ? production.notes + '' : '',
                    created_time: typeof production.created_time == typeof 5 ? instance.date_ddmmyy(production.created_time) : '',
                    created_by: typeof production.created_by == typeof 'invan' ? production.created_by : '',
                    employee_name: typeof production.employee_name == typeof 'invan' ? production.employee_name : '',
                    service_name: typeof production.service_name == typeof 'invan' ? production.service_name : '',
                    headers: [
                        {
                            header: 'ITEM NAME',
                            id: 'product_name',
                            width: 370,
                            align: 'left',
                            renderer: function (tb, data) {
                                doc.font('NotoSansRegular')
                                doc.fontSize(12)
                                return data.product_name;
                            }
                        },
                        {
                            header: 'COST',
                            id: 'cost',
                            width: 70,
                            align: 'right'
                        },
                        {
                            header: 'QUANTITY',
                            id: 'quality',
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
        } catch (error) {
            return reply.send(error.message)
        }
    }

    instance.get('/inventory/production/pdf/:id/:name', async (request, reply) => {
        getProductionPdf(request, reply)
        return reply;
    })

    const getReceiptPdf = async (request, reply) => {
        try {
            const { id } = request.params;
            const { type } = request.query
            const receipt = await instance.Receipts
                .findById(id)
                .lean();
            if (!receipt) {
                return reply.send('Receipt not found')
            }
            try {
                const user = await instance.User
                    .findOne({ organization: receipt.organization }, { ui_language: 1 })
                    .lean();
                if (user.ui_language && user.ui_language.value != undefined) {
                    instance.i18n.setLocale(user.ui_language.value)
                }
            }
            catch (error) {
                console.log(error)
            }
            try {
                const service = await instance.services
                    .findById(receipt.service, { name: 1 })
                    .lean()
                if (service) {
                    receipt.service_name = service.name
                }
            } catch (error) { }

            try {
                const cashier = await instance.User
                    .findById(receipt.cashier_id, { name: 1 })
                    .lean()
                if (cashier) {
                    receipt.cashier_name = cashier.name
                }
            } catch (error) { }

            let client_name = '';
            try {
                const client = await instance.clientsDatabase
                    .findOne(
                        { user_id: receipt.user_id, organization: receipt.organization },
                        { first_name: 1, last_name: 1 })
                    .lean();
                if (client) {
                    client_name = `${client.first_name} ${client.last_name ? client.last_name : ''}`
                }
            } catch (error) { }

            const partiationsObj = {}
            try {
                const partiation_ids = []
                for (const s_item of receipt.sold_item_list) {
                    if (s_item.partiation_id)
                        partiation_ids.push(instance.ObjectId(s_item.partiation_id))
                }
                const partiations = await instance.goodsSaleQueue
                    .find(
                        {
                            _id: { $in: partiation_ids },
                            // organization_id: receipt.organization,
                            // service_id: receipt.service,
                        },
                        {
                            p_order: 1,
                            supplier_name: 1
                        }
                    ).lean()
                for (const partiation of partiations) {
                    partiationsObj[partiation._id] = partiation
                }
            } catch (error) { }
            const goods_id = []
            for (let i = 0; i < receipt.sold_item_list.length; i++) {
                goods_id.push(receipt.sold_item_list[i].product_id)
                if (receipt.sold_item_list[i].partiation_id)
                    receipt.sold_item_list[i].p_order = partiationsObj[receipt.sold_item_list[i].partiation_id].p_order
                else {
                    receipt.sold_item_list[i].p_order = ''
                }
            }

            const goods = await instance.goodsSales
                .find(
                    { _id: { $in: goods_id } },
                    { sold_by: 1 },
                )
                .lean()

            const goodsObj = {}
            for (const good of goods) {
                goodsObj[good._id] = good
            }
            const time = new Date().getTime()

            const exelItems = []
            index = 1
            totalAmount = 0
            if (type == 'exel') {
                for (const it of receipt.sold_item_list) {
                    exelItems.push([
                        index,
                        it.product_name + '',
                        it.barcode,
                        instance.i18n.__(goodsObj[it.product_id].sold_by),
                        it.value,
                        it.price,
                        it.value * it.price,
                    ])
                    index++
                }

                const headers = [
                    { name: '№', key: 'id', width: 10 },
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
                let a = 2
                console.log(client_name);
                if (client_name) {
                    worksheet.getCell(`B${a}`).value = `${instance.i18n.__('client')}: ${client_name}               ${instance.i18n.__('receipt_no')}:  ${receipt.receipt_no}`;
                    // worksheet.getCell('B2').alignment = { vertical: 'middle', horizontal: 'center' };
                    worksheet.getCell(`B${a}`).font = { name: 'times new roman', size: 16, bold: true };
                    a++
                }
                worksheet.getCell(`B${a}`).value = `${instance.i18n.__('date')}: ${moment(receipt.date + 3 * 60 * 60 * 1000).format("DD.MM.YYYY MM:HH")}               ${instance.i18n.__('receipt_no')}:  ${receipt.receipt_no}`;
                // worksheet.getCell('B2').alignment = { vertical: 'middle', horizontal: 'center' };
                worksheet.getCell(`B${a}`).font = { name: 'times new roman', size: 16, bold: true };
                a++
                worksheet.getCell(`B${a}`).value = `${instance.i18n.__('store')}:      ${receipt.service_name}`
                a++
                worksheet.getCell(`B${a}`).value = `${instance.i18n.__('cashier')}:     ${receipt.cashier_name}`
                a++
                worksheet.getCell(`B${a}`).value = `${instance.i18n.__('pos')}:        ${receipt.pos_name}`
                // worksheet.getCell('B6').value = `Receipt:        ${receipt.receipt_no}`
                a++
                if (receipt.is_refund) {
                    worksheet.getCell(`B${a}`).value = `${instance.i18n.__('type')}:        ${instance.i18n.__('refund')}`
                    a++
                }
                // worksheet.getCell(`B${exelItems.length + 11}`).value = `Отпустил`
                // worksheet.getCell(`F${exelItems.length + 11}`).value = `Получил`
                const payment_len = receipt.payment && receipt.payment.length
                    ? receipt.payment.length
                    : 0;
                for (let i = 0; i < payment_len; i++) {
                    worksheet.getCell(`G${exelItems.length + 9 + i}`).value = `${instance.i18n.__(receipt.payment[i].name)}          ${receipt.payment[i].value}`
                }
                worksheet.getCell(`G${exelItems.length + 9 + payment_len}`).value = `${instance.i18n.__('total')}          ${receipt.total_price}`

                multiMergeCells(worksheet, ['B2:H2', 'B3:H3', 'B4:H4', 'B5:H5', 'B6:H6',])
                multiSetAlign(worksheet, [
                    { col: 'B', rows: [10, 10 + exelItems.length], },
                    // { col: 'J', rows: [10, 10 + exelItems.length], vertical: 'bottom', horizontal: 'right' },
                ])
                removeBorders(worksheet, [
                    { cell: `B2` }, { cell: `B3` }, { cell: `B4` }, { cell: `B5` }, { cell: `B6` },
                    { cell: `D2` }, { cell: `D3` }, { cell: `D4` }, { cell: `D5` }, { cell: `D6` },
                    { cell: `B7`, bottom: 'A9A9A9' }, { cell: `C7`, bottom: 'A9A9A9' },
                    { cell: `D7`, bottom: 'A9A9A9' }, { cell: `E7`, bottom: 'A9A9A9' },
                    { cell: `F7`, bottom: 'A9A9A9' }, { cell: `G7`, bottom: 'A9A9A9' },
                    { cell: `H7`, bottom: 'A9A9A9' },
                    { cell: `B${exelItems.length + 9}`, top: 'A9A9A9', left: 'A9A9A9' },
                    { cell: `C${exelItems.length + 9}`, top: 'A9A9A9' },
                    { cell: `D${exelItems.length + 9}`, top: 'A9A9A9' },
                    { cell: `E${exelItems.length + 9}`, top: 'A9A9A9' },
                    { cell: `F${exelItems.length + 9}`, top: 'A9A9A9' },
                    { cell: `G${exelItems.length + 9}`, top: 'A9A9A9' },
                    { cell: `H${exelItems.length + 9}`, top: 'A9A9A9', right: 'A9A9A9' },
                    { cell: `B${exelItems.length + 10}`, bottom: 'A9A9A9', left: 'A9A9A9' },
                    { cell: `C${exelItems.length + 10}`, bottom: 'A9A9A9', },
                    { cell: `D${exelItems.length + 10}`, bottom: 'A9A9A9', },
                    { cell: `E${exelItems.length + 10}`, bottom: 'A9A9A9', },
                    { cell: `F${exelItems.length + 10}`, bottom: 'A9A9A9', },
                    { cell: `G${exelItems.length + 10}`, bottom: 'A9A9A9', },
                    { cell: `H${exelItems.length + 10}`, bottom: 'A9A9A9', right: 'A9A9A9' },
                    // { cell: `B${exelItems.length + 11}`, bottom: 'A9A9A9', left: 'A9A9A9' },
                    // { cell: `F${exelItems.length + 11}`, bottom: 'A9A9A9' },
                    // { cell: `C${exelItems.length + 11}`, bottom: 'A9A9A9' },
                    // { cell: `D${exelItems.length + 11}`, bottom: 'A9A9A9' },
                    // { cell: `E${exelItems.length + 11}`, bottom: 'A9A9A9' },
                    // { cell: `G${exelItems.length + 11}`, bottom: 'A9A9A9' },
                    // { cell: `H${exelItems.length + 11}`, bottom: 'A9A9A9', right: 'A9A9A9' },
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
                return
            }
            const doc = new PDFDocument({ margin: 0, layout: 'landscape' });
            doc.registerFont('NotoSansRegular', './static/pdfFonts/ya_r.ttf');
            doc.registerFont('NotoSansBold', './static/pdfFonts/ya_b.ttf')
            // doc.addPage({ margin: 0 })

            try {
                const stream = doc.pipe(fs.createWriteStream(`./static/${time}.pdf`));
                // building pdf
                const title = `${instance.i18n.__('receipt_no')}  ${receipt.receipt_no}`;
                const payment = [];
                for (const p of receipt.payment) {
                    if (p.value) {
                        payment.push(p)
                    }
                }
                let has_count_by_type = false;
                for (const index in receipt.sold_item_list) {
                    receipt.sold_item_list[index].index = +index + 1;
                    if (receipt.sold_item_list[index].count_by_type) {
                        has_count_by_type = true;
                    }
                }

                const item_headers = [
                    {
                        header: `${instance.i18n.__('№')}`,
                        id: 'index',
                        width: 20,
                        align: 'left'
                    },
                    {
                        header: `${instance.i18n.__('item_name')}`,
                        id: 'product_name',
                        width: has_count_by_type ? 185 : 290,
                        align: 'left',
                        renderer: function (tb, data) {
                            doc.font('NotoSansRegular')
                            doc.fontSize(8)
                            return data.product_name;
                        }
                    },
                    {
                        header: `${instance.i18n.__('barcode')}`,
                        id: 'barcode',
                        width: 80,
                        align: 'left',
                        renderer: function (tb, data) {
                            doc.font('NotoSansRegular')
                            doc.fontSize(8)
                            return data.barcode;
                        }
                    },
                    {
                        header: `${instance.i18n.__('p_order')}`,
                        id: 'p_order',
                        width: 40,
                        align: 'left',
                        renderer: function (tb, data) {
                            doc.font('NotoSansRegular')
                            doc.fontSize(8)
                            return data.p_order;
                        }
                    },
                    {
                        header: `${instance.i18n.__('value')}`,
                        id: 'value',
                        width: 40,
                        align: 'right'
                    }
                ]

                if (has_count_by_type) {
                    item_headers.push({
                        header: `${instance.i18n.__('reminder')}`,
                        id: 'reminder',
                        width: 40,
                        align: 'right',
                        renderer: function (tb, data) {
                            if (!data.reminder) {
                                return '';
                            }
                            return data.reminder;
                        }
                    })
                }

                item_headers.push({
                    header: `${instance.i18n.__('price')}`,
                    id: 'price',
                    width: 65,
                    align: 'right',
                    renderer: function (tb, data) {
                        if (data.last_row) {
                            doc.font('NotoSansBold');
                            doc.fontSize(12);
                            return data.property_text;
                        }
                        const price = data.price ? data.price.toLocaleString() : data.price;
                        const currency = data.currency == 'usd' ? '$' : '';
                        return `${price} ${currency}`;
                    }
                });

                if (has_count_by_type) {
                    item_headers.push({
                        header: `${instance.i18n.__('price_for_pieces')}`,
                        id: 'price_for_pieces',
                        width: 65,
                        align: 'right',
                        renderer: function (tb, data) {
                            if (data.last_row) {
                                return '';
                            }
                            if (!(typeof data.count_by_type === 'number' && data.count_by_type)) {
                                return '';
                            }
                            if (!data.price) {
                                return '';
                            }

                            const price_for_pieces = (data.price / data.count_by_type).toLocaleString();
                            const currency = data.currency == 'usd' ? '$' : '';
                            return `${price_for_pieces} ${currency}`;
                        }
                    });
                }

                item_headers.push({
                    header: `${instance.i18n.__('total')}`,
                    id: 'total',
                    width: 65,
                    align: 'right',
                    renderer: function (tb, data) {
                        if (data.last_row) {
                            const total_str = typeof data.total == 'number' ? data.total.toLocaleString() : data.total;
                            const currency = receipt.currency == 'usd' ? '$' : '';
                            return `${total_str} ${currency}`;
                        }
                        let total = data.value * data.price;
                        if (data.reminder && data.count_by_type) {
                            total += data.price * (data.reminder / data.count_by_type);
                        }
                        const total_str = total ? total.toLocaleString() : total;
                        const currency = data.currency == 'usd' ? '$' : '';
                        return `${total_str} ${currency}`;
                    }
                });

                const data = {
                    title: title,
                    inv_type: 'receipt',
                    purchase_type: receipt.is_refund ? 'refund' : 'sale',
                    cashier_name: typeof receipt.cashier_name == typeof 'invan' ? receipt.cashier_name : '',
                    service_name: typeof receipt.service_name == typeof 'invan' ? receipt.service_name : '',
                    client_name: client_name,
                    // created_at: typeof receipt.date == typeof 5 ? instance.date_ddmmyy_hhmm(receipt.date + 4 * 60 * 60 * 1000) : '',
                    created_at: typeof receipt.date == typeof 5 ? instance.date_ddmmyy_hhmm(receipt.date + 3 * 60 * 60 * 1000) : '',
                    pos_name: typeof receipt.pos_name == 'string' ? receipt.pos_name : '',
                    headers: item_headers,
                    items: receipt.sold_item_list,
                    payment: payment,
                    total_price: receipt.total_price,
                    currency: receipt.currency
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
        } catch (error) {
            reply.send(error.message)
        }
        return reply;
    }

    instance.get('/report/receipts/pdf/:id/:name', async (request, reply) => {
        getReceiptPdf(request, reply)
        return reply;
    })

    /**
     * 
     * @param {
     * import('fastify').FastifyRequest
     * <IncomingMessage, DefaultQuery, DefaultParams, DefaultHeaders, any>} request 
     * @param {import('fastify').FastifyReply<ServerResponse>} reply 
     * @returns 
     */
    const getInternalOrderFile = async (request, reply) => {
        try {
            const { id } = request.params
            const { type } = request.query

            const iOrder = await instance.employeesOrder.findById(id).lean()
            if (!iOrder) {
                return reply.send('Order not found')
            }

            const items = iOrder.items
            const pdfItems = []
            const exelItems = []
            index = 1
            totalAmount = 0
            if (type == 'exel') {
                for (const it of items) {
                    try {
                        const good = await instance.goodsSales
                            .findById(it.product_id, { name: 1, parent_name: 1, item_type: 1 })
                            .lean()
                        if (good) {
                            it.product_name = good.name
                            if (good.item_type == 'variant') {
                                it.product_name = `${good.parent_name} (${good.name})`
                            }
                        }
                    } catch (error) { }
                    exelItems.push([
                        index,
                        it.product_name + '',
                        it.real_stock,
                        it.in_stock,
                        it.order_quantity,
                    ])
                    index++
                }
            } else {
                for (const it of items) {
                    try {
                        const good = await instance.goodsSales
                            .findById(it.product_id, { name: 1, parent_name: 1, item_type: 1, sku: 1 })
                            .lean()
                        if (good) {
                            it.product_name = good.name
                            if (good.item_type == 'variant') {
                                it.product_name = `${good.parent_name} (${good.name})`
                            }
                            it.sku = good.sku
                        }
                    } catch (error) { }
                    pdfItems.push({
                        index,
                        product_name: it.product_name + '',
                        sku: it.sku,
                        real_stock: it.real_stock,
                        in_stock: it.in_stock,
                        order_quantity: it.order_quantity,
                    })
                    index++
                }
            }

            const time = new Date().getTime()
            const title = `Internal order ${iOrder.p_order}`

            if (type == 'exel') {
                const headers = [
                    { name: ' № п.п.', key: 'id' },
                    { name: 'Наименование', key: 'id' },
                    { name: 'Real stock', key: 'barcode' },
                    { name: 'In stock', key: 'type' },
                    { name: 'Order qunatity', key: 'quantity' },
                ]
                const workbook = new ExcelJs.Workbook();
                const worksheet = workbook.addWorksheet('MyExcel', {
                    pageSetup: { paperSize: 9, orientation: 'portrait' }
                });
                worksheet.properties.defaultColWidth = 200;
                worksheet.getCell('B2').value = title;
                // worksheet.getCell('B2').alignment = { vertical: 'middle', horizontal: 'center' };
                worksheet.getCell('B2').font = { name: 'times new roman', size: 16, bold: true };
                worksheet.getCell('B3').value = iOrder.status
                worksheet.getCell('B4').value = `Date:                ${moment(iOrder.date).format("DD.MM.YYYY")}`
                worksheet.getCell('B5').value = `Accepted by:         ${iOrder.accept_by_name}`
                worksheet.getCell('B6').value = `Accepted date:       ${moment(iOrder.accept_date).format("DD.MM.YYYY")}`
                worksheet.getCell('B7').value = `Employee:            ${iOrder.employee_name}`
                worksheet.getCell('B8').value = `Store:               ${iOrder.service_name}`

                multiMergeCells(worksheet, [
                    'B2:F2', 'B3:F3', 'B4:F4',
                    'B5:F5', 'B6:F6',
                    'B7:F7', 'B8:F8',
                    // 'B9:F9', 'B10:F10', 'B11:F11', 'B12:F12',
                ]
                )
                worksheet.getColumn('B').width = 5
                worksheet.getColumn('C').width = 25
                worksheet.getColumn('F').width = 15

                removeBorders(worksheet, [
                    { cell: `B2` }, { cell: `B3` }, { cell: `B4` }, { cell: `B5` }, { cell: `B6` },
                    { cell: `B7` }, { cell: `B8` },
                    //  { cell: `B9` }, { cell: `B10` }, { cell: `B11` },
                ])

                try {
                    worksheet.addTable({
                        name: 'ItemsTable',
                        ref: 'B10',
                        headerRow: true,
                        // totalsRow: true,
                        columns: headers,
                        rows: exelItems
                    })
                } catch (error) { }

                const file = `${time}.xlsx`;
                const file_dir = path.join(__dirname, '../../static/', file)

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
                        inv_type: 'internal_order',
                        purchase_type: iOrder.type,
                        notes: iOrder.note ? iOrder.note + '' : '',
                        ordered_by_name: iOrder.employee_name ? iOrder.employee_name : '',
                        accept_by_name: iOrder.accept_by_name ? iOrder.accept_by_name : '',
                        purchase_order_date: typeof iOrder.date == typeof 5 ? instance.date_ddmmyy(iOrder.date) : '',
                        accept_date: typeof iOrder.date == typeof 5 ? instance.date_ddmmyy(iOrder.accept_date) : '',
                        ordered_by_name: typeof iOrder.employee_name == typeof 'invan' ? iOrder.employee_name : '',
                        service_name: typeof iOrder.service_name == typeof 'invan' ? iOrder.service_name : '',
                        headers: [
                            {
                                header: ' № п.п.',
                                id: 'index',
                                width: 20,
                                align: 'left',
                            },
                            {
                                header: 'ITEM NAME',
                                id: 'product_name',
                                width: 280,
                                align: 'left',
                                renderer: function (tb, data) {
                                    doc.font('NotoSansRegular')
                                    doc.fontSize(11)
                                    return data.product_name;
                                }
                            },
                            {
                                header: 'SKU',
                                id: 'sku',
                                width: 40,
                                align: 'right',
                            },
                            {
                                header: 'REAL STOCK',
                                id: 'real_stock',
                                width: 70,
                                align: 'right'
                            },
                            {
                                header: 'IN STOCK',
                                id: 'in_stock',
                                width: 70,
                                align: 'right'
                            },
                            {
                                header: 'ORDER QUANTITY',
                                id: 'order_quantity',
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
    instance.get('/internal/order/pdf/:id/:name', async (request, reply) => {

        getInternalOrderFile(request, reply)
        return reply;
    })

    next()
})
