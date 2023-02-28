
const PDFDocument = require('pdfkit');
const fs = require('fs');

module.exports = ((instance, _, next) => {

    const emailReceiptHandler = async (request, reply) => {
        if (request.validationError) {
            return reply.validation(request.validationError.message)
        }
        const user = request.user;
        const receipt_id = request.params.receipt_id;
        const receipt = await instance.Receipts.findById(receipt_id);
        if (!receipt) {
            return reply.fourorfour('Receipt');
        }
        try {
            const service = await instance.services.findById(receipt.service)
            receipt.service_name = service.name
        } catch (error) { }
        let receipt_setting = {};
        try {
            receipt_setting = await instance.settingReceipt.findOne({ service: receipt.service })
            if (!receipt_setting) {
                receipt_setting = {}
            }
        } catch (error) { }

        let height = 300;

        if (!(receipt.sold_item_list instanceof Array)) {
            receipt.sold_item_list = []
        }
        height += receipt.sold_item_list.length * 120
        const doc = new PDFDocument({
            size: [210, height]
        });

        doc.registerFont('NotoSansRegular', './static/pdfFonts/ya_r.ttf');
        doc.registerFont('NotoSansBold', './static/pdfFonts/ya_b.ttf');
        doc.registerFont('NotoSansMedium', './static/pdfFonts/ya_m.ttf');
        doc.registerFont('NotoSansItalic', './static/pdfFonts/ya_i.ttf');
        const unique = receipt._id + new Date().getTime()
        let col1LeftPos = 30;
        let colLeftPos = 30;
        let colTop = 20;
        let colWidth = 100;
        let col2LeftPos = colWidth + col1LeftPos + 160;
        try {
            const stream = doc.pipe(fs.createWriteStream(`./static/${unique}.pdf`));

            if (typeof receipt_setting.emailed_receipt == typeof 'invan' && receipt_setting.emailed_receipt != '') {
                const list = receipt_setting.emailed_receipt.split('/static/')
                if (list.length > 1) {
                    doc.image(
                        `./static/${list[1]}`,
                        50,
                        colTop,
                        { width: 100, height: 100 }
                    )
                    colTop += 100
                }
            }
            doc
                .font('NotoSansBold')
                .fontSize(10)
                .text(receipt.service_name, 0, colTop, {
                    width: 200,
                    align: 'center'
                });
            colTop += 20;

            if (typeof receipt_setting.header == typeof 'invan' && receipt_setting.header != '') {
                colTop -= 10;
                doc
                    .font('NotoSansRegular')
                    .fontSize(10)
                    .text(receipt_setting.header, 0, colTop, {
                        width: 200,
                        align: 'center'
                    });
                colTop += 20;
            }

            total_price_text = receipt.total_price ? receipt.total_price.toLocaleString() : receipt.total_price

            doc
                .font('NotoSansMedium')
                .fontSize(30)
                .text(total_price_text + '', 0, colTop, {
                    width: 200,
                    align: 'center'
                });
            colTop += 40;
            doc
                .font('NotoSansRegular')
                .fontSize(10)
                .text('Total', 0, colTop, {
                    width: 200,
                    align: 'center'
                });
            colTop += 20;

            doc
                .font('NotoSansRegular')
                .fontSize(10)
                .text(`Cashier: ${receipt.cashier_name}`, colLeftPos, colTop, {
                    width: 300,
                    align: 'left'
                });
            colTop += 10;

            doc
                .font('NotoSansRegular')
                .fontSize(10)
                .text(`POS: ${receipt.pos_name}`, colLeftPos, colTop, {
                    width: 300,
                    align: 'left'
                });
            colTop += 20;

            let discount = 0.0;
            for (const it of receipt.sold_item_list) {
                let total = it.price * it.value;
                if (!(it.modifiers instanceof Array)) {
                    it.modifiers = []
                }
                const modifiers = []
                for (const m of it.modifiers) {
                    let modifier_total = 0;
                    for (const op of m.modifier_options) {
                        modifier_total += op.price * it.value
                    }
                    modifiers.push(`+${m.modifier_name} (${modifier_total})`)
                    total += modifier_total;
                    if (total < 0) {
                        total = 0;
                    }
                }
                if (!(it.discount instanceof Array)) {
                    it.discount = []
                }
                for (const d of it.discount) {
                    if (d.type == 'sum') {
                        discount += d.value
                    }
                    else {
                        discount += total * d.value / 100.0
                    }
                }

                const total_text = total ? total.toLocaleString() : total;
                doc
                    .font('NotoSansRegular')
                    .fontSize(10)
                    .text(`${it.product_name}`, colLeftPos, colTop, {
                        width: 150,
                        align: 'left',
                        continued: true
                    })
                    .text(`${total_text + ''}`, {
                        width: 400,
                        align: 'right'
                    })
                colTop += 10;
                doc
                    .font('NotoSansRegular')
                    .fontSize(10)
                    .text(`${it.value} x ${it.price ? it.price.toLocaleString() : it.price}`, colLeftPos, colTop, {
                        width: 300,
                        align: 'left'
                    })
                colTop += 20;

                if (typeof it.comment == typeof 'invan' && it.comment != '') {
                    colTop -= 10;
                    doc
                        .font('NotoSansItalic')
                        .fontSize(10)
                        .text(`${it.comment}`, colLeftPos, colTop, {
                            width: 300,
                            align: 'left'
                        })
                    colTop += 20;
                }

                if (modifiers.length > 0) {
                    colTop -= 10;
                    for (const m of modifiers) {
                        doc
                            .font('NotoSansRegular')
                            .fontSize(10)
                            .text(`${m}`, colLeftPos, colTop, {
                                width: 300,
                                align: 'left'
                            })
                        colTop += 10;
                    }
                    colTop += 10;
                }
            }

            if (discount != 0) {
                discount = discount.toLocaleString()
                doc
                    .font('NotoSansRegular')
                    .fontSize(10)
                    .text(`discount`, colLeftPos, colTop, {
                        width: 150,
                        align: 'left',
                        continued: true
                    })
                    .text(`${discount + ''}`, {
                        width: 400,
                        align: 'right'
                    })
                colTop += 20;
            }

            doc
                .font('NotoSansBold')
                .fontSize(10)
                .text(`Total`, colLeftPos, colTop, {
                    width: 150,
                    align: 'left',
                    continued: true
                })
                .text(`${total_price_text + ''}`, {
                    width: 400,
                    align: 'right'
                });
            colTop += 20;

            if (!(receipt.payment instanceof Array)) {
                receipt.payment = []
            }
            for (const p of receipt.payment) {
                p.value = p.value ? p.value.toLocaleString() : p.value
                doc
                    .font('NotoSansRegular')
                    .fontSize(10)
                    .text(p.name, colLeftPos, colTop, {
                        width: 150,
                        align: 'left',
                        continued: true
                    })
                    .text(`${p.value + ''}`, {
                        width: 400,
                        align: 'right'
                    });
                colTop += 15;
            }
            colTop += 5

            if (typeof receipt_setting.footer == typeof 'invan' && receipt_setting.footer != '') {
                doc
                    .font('NotoSansRegular')
                    .fontSize(10)
                    .text(receipt_setting.footer, 0, colTop, {
                        width: 200,
                        align: 'center'
                    });
                colTop += 20;
            }

            doc
                .font('NotoSansRegular')
                .fontSize(10)
                .text(instance.date_ddmmyy_hhmm(receipt.date), colLeftPos, colTop, {
                    width: 150,
                    align: 'left',
                    continued: true
                })
                .text(`№ ${receipt.receipt_no + ''}`, {
                    width: 400,
                    align: 'right'
                });

            doc.end();
            stream.on('finish', async function () {
                reply.sendFile(`/${unique}.pdf`)
                setTimeout(() => {
                    fs.unlink(`./static/${unique}.pdf`, (err) => {
                        if (err) {
                            instance.send_Error('exported items file', JSON.stringify(err))
                        }
                    })
                }, 5000)
            })
        } catch (error) {
            return reply.send(error.message)
        }

        return reply;
    }

    instance.get(
        '/receipt/email/:receipt_id',
        {
            schema: {
                params: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                        receipt_id: {
                            type: 'string',
                            minLength: 24,
                            maxLength: 24
                        }
                    },
                    required: ['receipt_id']
                }
            },
            attachValidation: true,
            // preValidation: instance.authorize_employee
        },
        emailReceiptHandler
    )

    next()
})
