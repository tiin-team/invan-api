
const PDFDocument = require('pdfkit');
const PdfTable = require('voilab-pdf-table')
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
                    pdfItems.push({
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
    instance.get('/inventory/purchase/pdf/:id/:name', async (request, reply) => {
        getPurchasePdfNewUmar(request, reply)
        // getPurchasePdf(request, reply)
        return reply;
    })

    const getTransferPdf = async (request, reply) => {
        try {
            const id = request.params.id
            const transfer = await instance.Transfer.findById(id)
            if (!transfer) {
                return reply.send('Transfer not found')
            }
            let total = 0;
            for (const itm of transfer.items) {
                total += (itm.quality * itm.price) ? itm.quality * itm.price : 0;
            }

            try {
                const first_service = await instance.services.findById(transfer.first_service)
                if (first_service) {
                    transfer.first_service_name = first_service.name
                }
            } catch (error) { }

            try {
                const second_service = await instance.services.findById(transfer.second_service)
                if (second_service) {
                    transfer.second_service_name = second_service.name
                }
            } catch (error) { }

            try {
                const orderer = await instance.User.findById(ordered_by_id)
                if (orderer) {
                    transfer.ordered_by_name = orderer.name
                }
            } catch (error) { }

            const pdfItems = []
            for (const it of transfer.items) {
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
                    price: it.price ? it.price.toLocaleString() : ''
                })
            }
            const doc = new PDFDocument;
            doc.registerFont('NotoSansRegular', './static/pdfFonts/ya_r.ttf');
            doc.registerFont('NotoSansBold', './static/pdfFonts/ya_b.ttf')

            const time = new Date().getTime()
            try {
                const stream = doc.pipe(fs.createWriteStream(`./static/${time}.pdf`));
                // building pdf
                const title = `Transfer order ${transfer.p_order}`
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
            const stock = await instance.stockAdjustment.findById(id)

            if (!stock) {
                return reply.send('Stock not found')
            }

            try {
                const service = await instance.services.findById(stock.service)
                if (service) {
                    stock.service_name = service.name
                }
            } catch (error) { }

            try {
                const adjusted = await instance.User.findById(stock.adjusted_by_id)
                if (adjusted) {
                    stock.adjusted_by = adjusted.name
                }
            } catch (error) { }

            const items = await instance.stockAdjustmentItems.find({ stock_adjustment_id: stock._id })
            const pdfItems = []
            for (const it of items) {
                if (it.cost_currency != 'usd' && typeof it.cost == typeof 5) {
                    it.cost = Math.round(it.cost)
                }
                else if (typeof it.cost == typeof 5) {
                    it.cost = Math.round(it.cost * 100) / 100
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
                    changed: it.changed + '',
                    cost: (it.cost ? it.cost.toLocaleString() : it.cost + '') + (it.cost_currency == 'usd' ? ' $' : '')
                })
            }

            const doc = new PDFDocument;
            doc.registerFont('NotoSansRegular', './static/pdfFonts/ya_r.ttf');
            doc.registerFont('NotoSansBold', './static/pdfFonts/ya_b.ttf')

            const time = new Date().getTime()
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
                const stream = doc.pipe(fs.createWriteStream(`./static/${time}.pdf`));
                // building pdf
                const title = `Stock adjustment ${stock.p_order}`
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
            const count = await instance.inventoryCount.findById(id)
            if (!count) {
                return reply.send('Inventory count not found')
            }

            try {
                const service = await instance.services.findById(count.service)
                if (service) {
                    count.service_name = service.name
                }
            } catch (error) { }

            try {
                const created_by = await instance.User.findById(count.created_by_id)
                if (created_by) {
                    count.created_by = created_by.name
                }
            } catch (error) { }

            let total_cost_difference = 0
            let total_difference = 0

            const items = await instance.inventoryCountItem.find({ count_id: count._id })
            const pdfItems = []
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

            const doc = new PDFDocument;
            doc.registerFont('NotoSansRegular', './static/pdfFonts/ya_r.ttf');
            doc.registerFont('NotoSansBold', './static/pdfFonts/ya_b.ttf')

            const time = new Date().getTime()
            try {
                const stream = doc.pipe(fs.createWriteStream(`./static/${time}.pdf`));
                // building pdf
                const title = `Inventory count ${count.p_order}`
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
            const receipt = await instance.Receipts.findById(id);
            if (!receipt) {
                return reply.send('Receipt not found')
            }
            try {
                const user = await instance.User.findOne({ organization: receipt.organization });
                if (user.ui_language && user.ui_language.value != undefined) {
                    instance.i18n.setLocale(user.ui_language.value)
                }
            }
            catch (error) {
                console.log(error)
            }
            try {
                const service = await instance.services.findById(receipt.service)
                if (service) {
                    receipt.service_name = service.name
                }
            } catch (error) { }

            try {
                const cashier = await instance.User.findById(receipt.cashier_id)
                if (cashier) {
                    receipt.cashier_name = cashier.name
                }
            } catch (error) { }

            let client_name = '';
            try {
                const client = await instance.clientsDatabase.findOne({ user_id: receipt.user_id, organization: receipt.organization });
                if (client) {
                    client_name = `${client.first_name} ${client.last_name ? client.last_name : ''}`
                }
            } catch (error) { }
            const doc = new PDFDocument({ margin: 0 });
            doc.registerFont('NotoSansRegular', './static/pdfFonts/ya_r.ttf');
            doc.registerFont('NotoSansBold', './static/pdfFonts/ya_b.ttf')
            // doc.addPage({ margin: 0 })

            const time = new Date().getTime()
            try {
                const stream = doc.pipe(fs.createWriteStream(`./static/${time}.pdf`));
                // building pdf
                const title = `Receipt ${receipt.receipt_no}`;
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
                        width: has_count_by_type ? 215 : 320,
                        align: 'left',
                        renderer: function (tb, data) {
                            doc.font('NotoSansRegular')
                            doc.fontSize(8)
                            return data.product_name;
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
                    created_at: typeof receipt.date == typeof 5 ? instance.date_ddmmyy_hhmm(receipt.date + 4 * 60 * 60 * 1000) : '',
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

    next()
})
