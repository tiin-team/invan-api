
const fp = require('fastify-plugin')
const PdfTable = require('voilab-pdf-table')

module.exports = fp((instance, _, next) => {
    /**
     * 
     * @param {PDFKit.PDFDocument} doc 
     * @param {any} data 
     */
    const inventoryPdf = function (doc, data) {
        let col1LeftPos = 50;
        let colTop = 70;
        let colWidth = 100;
        let col2LeftPos = colWidth + col1LeftPos + 160;

        if (data.inv_type) {
            colTop -= 40;
        }
        // title
        if (data.inv_type != 'receipt') {
            if (data.inv_type == 'internal_order') {
                doc
                    .font('NotoSansBold')
                    .fontSize(30)
                    .text(data.title, col1LeftPos, colTop, {
                        lineGap: 30
                    })
                colTop += 35
            } else {
                doc
                    .font('NotoSansBold')
                    .fontSize(30)
                    .text(data.title, col1LeftPos, colTop, {
                        lineGap: 30
                    })
                colTop += 60
            }
        }
        else {
            doc
                .font('NotoSansBold')
                .fontSize(20)
                .text(data.title, col1LeftPos + 400, colTop - 10, {
                    lineGap: 30
                })
            colTop -= 10;
        }

        // before table
        switch (data.inv_type) {
            case 'purchase': {
                doc
                    .fontSize(12)
                    .font('NotoSansBold')
                    .text('PO date: ', col1LeftPos, colTop, {
                        continued: true
                    })
                    .font('NotoSansRegular')
                    .text(data.purchase_order_date, {
                        lineGap: 5
                    })
                colTop += 15

                doc
                    .font('NotoSansBold')
                    .text('Expected on: ', col1LeftPos, colTop, {
                        continued: true
                    })
                    .font('NotoSansRegular')
                    .text(data.expected_on, {
                        lineGap: 5
                    })
                colTop += 15

                doc
                    .font('NotoSansBold')
                    .text('Ordered by: ', col1LeftPos, colTop, {
                        continued: true
                    })
                    .font('NotoSansRegular')
                    .text(data.ordered_by_name, {
                        lineGap: 25
                    })
                colTop += 40

                if (data.purchase_type == 'refund') {
                    doc
                        .font('NotoSansBold')
                        .text('Type: ', col1LeftPos, colTop, {
                            continued: true
                        })
                        .font('NotoSansRegular')
                        .fillColor('red')
                        .text('Возврат', {
                            lineGap: 25
                        })
                        .fillColor('black')
                    colTop += 40
                }

                doc
                    .fontSize(12)
                    .font('NotoSansBold')
                    .text('Supplier: ', col1LeftPos, colTop, { width: colWidth })
                    .font('NotoSansRegular')
                    .text(data.supplier_name, col1LeftPos, colTop + 15, { width: colWidth })
                    .font('NotoSansBold')
                    .text('Ship to:', col2LeftPos, colTop, { width: colWidth })
                    .font('NotoSansRegular')
                    .text(data.service_name, col2LeftPos, colTop + 15, { width: colWidth })

                break;
            }

            case 'internal_order': {
                doc
                    .fontSize(12)
                    .font('NotoSansBold')
                    .text('IO date: ', col1LeftPos, colTop, {
                        continued: true
                    })
                    .font('NotoSansRegular')
                    .text(data.purchase_order_date, {
                        lineGap: 5
                    })
                colTop += 15

                doc
                    .font('NotoSansBold')
                    .text('Ordered by: ', col1LeftPos, colTop, {
                        continued: true
                    })
                    .font('NotoSansRegular')
                    .text(data.ordered_by_name, {
                        lineGap: 25
                    })
                colTop += 20

                doc
                    .font('NotoSansBold')
                    .text('Accepted date: ', col1LeftPos, colTop, {
                        continued: true
                    })
                    .font('NotoSansRegular')
                    .text(data.accept_date, {
                        lineGap: 5
                    })
                colTop += 15

                doc
                    .font('NotoSansBold')
                    .text('Accepted by: ', col1LeftPos, colTop, {
                        continued: true
                    })
                    .font('NotoSansRegular')
                    .text(data.accept_by_name, {
                        lineGap: 5
                    })
                colTop += 20

                doc
                    .fontSize(12)
                    .font('NotoSansBold')
                    .text('Store: ', col1LeftPos, colTop, { continued: true })
                    .font('NotoSansRegular')
                    .text(data.service_name, { lineGap: 5 })
                // .font('NotoSansBold')
                // .text('Ship to:', col2LeftPos, colTop, { width: colWidth })
                // .font('NotoSansRegular')
                // .text(data.service_name, col2LeftPos, colTop + 15, { width: colWidth })

                break;
            }

            case 'transfer': {
                doc
                    .fontSize(12)
                    .font('NotoSansBold')
                    .text('Date: ', col1LeftPos, colTop, {
                        continued: true
                    })
                    .font('NotoSansRegular')
                    .text(data.date, {
                        lineGap: 5
                    })
                colTop += 15

                doc
                    .font('NotoSansBold')
                    .text('Created by: ', col1LeftPos, colTop, {
                        continued: true
                    })
                    .font('NotoSansRegular')
                    .text(data.ordered_by_name, {
                        lineGap: 25
                    })
                colTop += 40

                doc
                    .fontSize(12)
                    .font('NotoSansBold')
                    .text('Source store: ', col1LeftPos, colTop, { width: colWidth })
                    .font('NotoSansRegular')
                    .text(data.first_service_name, col1LeftPos, colTop + 15, { width: colWidth })
                    .font('NotoSansBold')
                    .text('Destination store:', col2LeftPos, colTop, { width: colWidth })
                    .font('NotoSansRegular')
                    .text(data.second_service_name, col2LeftPos, colTop + 15, { width: colWidth })

                break;
            }

            case 'stock': {
                doc
                    .fontSize(12)
                    .font('NotoSansBold')
                    .text('Date: ', col1LeftPos, colTop, { width: colWidth })
                    .font('NotoSansRegular')
                    .text(data.date, col1LeftPos + 40, colTop, { width: colWidth })
                    .font('NotoSansBold')
                    .text('Reason: ', col1LeftPos, colTop + 15, { width: colWidth })
                    .font('NotoSansRegular')
                    .text(data.reason, col1LeftPos + 50, colTop + 15, { width: colWidth })
                    .font('NotoSansBold')
                    .text('Adjusted by: ', col1LeftPos, colTop + 30, { width: colWidth })
                    .font('NotoSansRegular')
                    .text(data.adjusted_by, col1LeftPos + 70, colTop + 30, { width: colWidth })
                    .font('NotoSansBold')
                    .text('Store:', col2LeftPos, colTop, { width: colWidth })
                    .font('NotoSansRegular')
                    .text(data.service_name, col2LeftPos, colTop + 15, { width: colWidth })
                break
            }

            case 'count': {
                doc
                    .fontSize(12)
                    .font('NotoSansBold')
                    .text('Date created:', col1LeftPos, colTop, { width: colWidth })
                    .font('NotoSansRegular')
                    .text(data.created_time, col1LeftPos + 75, colTop, { width: colWidth })
                    .font('NotoSansBold')
                    .text('Created by: ', col1LeftPos, colTop + 15, { width: colWidth })
                    .font('NotoSansRegular')
                    .text(data.created_by, col1LeftPos + 70, colTop + 15, { width: colWidth })
                    .font('NotoSansBold')
                    .text('Store:', col2LeftPos, colTop, { width: colWidth })
                    .font('NotoSansRegular')
                    .text(data.service_name, col2LeftPos, colTop + 15, { width: colWidth })
                break
            }

            case 'production': {
                doc
                    .fontSize(12)
                    .font('NotoSansBold')
                    .text('Date: ', col1LeftPos, colTop, { width: colWidth })
                    .font('NotoSansRegular')
                    .text(data.created_time, col1LeftPos + 40, colTop, { width: colWidth })
                    .font('NotoSansBold')
                    .text('Created by: ', col1LeftPos, colTop + 15, { width: colWidth })
                    .font('NotoSansRegular')
                    .text(data.created_by, col1LeftPos + 70, colTop + 15, { width: colWidth })
                    .font('NotoSansBold')
                    .text('Employee: ', col1LeftPos, colTop + 30, { width: colWidth })
                    .font('NotoSansRegular')
                    .text(data.employee_name, col1LeftPos + 70, colTop + 30, { width: colWidth })
                    .font('NotoSansBold')
                    .text('Store:', col2LeftPos, colTop, { width: colWidth })
                    .font('NotoSansRegular')
                    .text(data.service_name, col2LeftPos, colTop + 15, { width: colWidth })
                break
            }

            case 'receipt': {

                if (data.client_name) {
                    doc
                        .fontSize(20)
                        .font('NotoSansBold')
                        .text(`${instance.i18n.__('client')}: `, col1LeftPos, colTop, {
                            continued: true
                        })
                        .font('NotoSansRegular')
                        .text(data.client_name, {
                            lineGap: 25
                        })
                    colTop += 25
                }

                doc
                    .fontSize(12)
                    .font('NotoSansBold')
                    .text(`${instance.i18n.__('date')}: `, col1LeftPos, colTop, {
                        continued: true
                    })
                    .font('NotoSansRegular')
                    .text(data.created_at, {
                        lineGap: 5
                    })
                colTop += 15

                doc
                    .font('NotoSansBold')
                    .text(`${instance.i18n.__('store')}: `, col1LeftPos, colTop, {
                        continued: true
                    })
                    .font('NotoSansRegular')
                    .text(data.service_name, {
                        lineGap: 5
                    })
                colTop += 15

                doc
                    .font('NotoSansBold')
                    .text(`${instance.i18n.__('cashier')}: `, col1LeftPos, colTop, {
                        continued: true
                    })
                    .font('NotoSansRegular')
                    .text(data.cashier_name, {
                        lineGap: 5
                    })
                colTop += 15

                doc
                    .font('NotoSansBold')
                    .text(`${instance.i18n.__('pos')}: `, col1LeftPos, colTop, {
                        continued: true
                    })
                    .font('NotoSansRegular')
                    .text(data.pos_name, {
                        lineGap: 25
                    })
                colTop += 15

                if (data.purchase_type == 'refund') {
                    doc
                        .font('NotoSansBold')
                        .text(`${instance.i18n.__('type')}: `, col1LeftPos, colTop, {
                            continued: true
                        })
                        .font('NotoSansRegular')
                        .fillColor('red')
                        .text(`${instance.i18n.__('refund')}`, {
                            lineGap: 25
                        })
                        .fillColor('black')
                    colTop += 15
                }
                colTop += 25

                break;
            }
        }

        // items table
        colTop += 70;
        if (data.inv_type == 'receipt') {
            colTop -= 90;
        }
        if (data.inv_type == 'internal_order') {
            colTop -= 50;
        }
        doc
            .fontSize(10)
            .font('NotoSansBold')

        if (data.inv_type == 'receipt') {
            doc
                .fontSize(8)
                .font('NotoSansBold')
        }

        doc
            .text('', col1LeftPos, colTop);

        const table = new PdfTable(doc);
        const tableSettings = {
            headerBorder: 'B',
            padding: [5, 0, 0, 2],
            align: 'left'
        }
        if (data.inv_type == 'receipt' || data.inv_type == 'internal_order') {
            tableSettings.border = ['B', 'R', 'L'];
            tableSettings.padding = [5, 2, 2, 2];
            tableSettings.headerBorder = ['B', 'R', 'L', 'T'];
            tableSettings.headerPadding = [4, 1, 1, 1];
        }
        table
            .addPlugin(new (require('voilab-pdf-table/plugins/fitcolumn'))({}))
            .setColumnsDefaults(tableSettings)
            .addColumns(data.headers)
            .onPageAdded(function (tb) {
                doc.font('NotoSansBold').fontSize(10);
                if (data.inv_type == 'receipt') {
                    doc.font('NotoSansBold').fontSize(8);
                }
                doc.text('', col1LeftPos, 50)
                tb.addHeader();
                doc.font('NotoSansRegular').fontSize(12);
                if (data.inv_type == 'receipt') {
                    doc.font('NotoSansRegular').fontSize(8);
                }
            });

        table.addBody(data.items);

        if (data.inv_type == 'receipt') {
            table.showHeaders = false;

            table.setColumnsDefaults({
                border: [],
                padding: [5, 1, 1, 1]
            })
            table.setColumns(data.headers);
            const last_rows = [];
            for (const p of data.payment) {
                last_rows.push({
                    last_row: true,
                    property_text: `${instance.i18n.__(p.name)}`,
                    total: p.value
                })
            }
            last_rows.push({
                last_row: true,
                property_text: `${instance.i18n.__('total')}`,
                total: data.total_price
            })

            table.addBody(last_rows);
        }

        // table footer
        doc
            .fontSize(12)
            .font('NotoSansBold')
            .text('', 50, doc.y + 10, 50)

        switch (data.inv_type) {
            case 'purchase': {
                doc
                    .text(`Total:                ${data.total}`, {
                        width: 510,
                        align: 'right'
                    })
                    .text(`${instance.i18n.__(`receive`)} _______________________________`)
                    .text(`${instance.i18n.__(`otpustil`)} _______________________________`)
                break;
            }
            case 'count': {
                doc
                    .text(`Total:              ${data.total_difference}            ${data.total_cost_difference}`, {
                        width: 510,
                        align: 'right'
                    })
                break
            }
            case 'transfer': {
                doc
                    .text(`Total:                ${data.total}`, {
                        width: 510,
                        align: 'right'
                    })
                break;
            }
        }

        if (typeof data.notes == typeof 'invan' && data.notes != '') {
            doc
                .fontSize(12)
                .font('NotoSansBold')
                .text('Notes:')
                .font('NotoSansRegular')
                .text(data.notes)
        }
    }

    instance.decorate('inventoryPdf', inventoryPdf)

    // date tools

    const date_ddmmyy = (timestamp) => {
        if (typeof timestamp == typeof 5) {
            let day = new Date(timestamp).getDate()
            day = day < 10 ? `0${day}` : day
            let month = new Date(timestamp).getMonth()
            month = month < 9 ? `0${month + 1}` : (month + 1)
            let year = new Date(timestamp).getFullYear()
            return `${day}.${month}.${year}`
        }
        else return timestamp
    }
    instance.decorate('date_ddmmyy', date_ddmmyy)

    const date_ddmmyy_hhmm = (timestamp) => {
        if (typeof timestamp == typeof 5) {
            let day = new Date(timestamp).getDate()
            day = day < 10 ? `0${day}` : day
            let month = new Date(timestamp).getMonth()
            month = month < 9 ? `0${month + 1}` : (month + 1)
            let year = new Date(timestamp).getFullYear()
            let hour = new Date(timestamp).getHours()
            hour = hour < 10 ? `0${hour}` : hour
            let minutes = new Date(timestamp).getMinutes()
            minutes = minutes < 10 ? `0${minutes}` : minutes
            return `${day}.${month}.${year} ${hour}:${minutes}`
        }
        else return timestamp
    }
    instance.decorate('date_ddmmyy_hhmm', date_ddmmyy_hhmm)
    next()
})
