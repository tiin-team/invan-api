
const PDFDocument = require('pdfkit');
const fs = require('fs');
const PdfTable = require('voilab-pdf-table')

const pdfWriter = async function (params, customer, items, reply, instance, user) {
    const { from_time, to_time } = params;
    const organization = await instance.organizations.findById(user.organization)
    if (!organization) {
        return reply.fourorfour('Organization')
    }
    let currency = await instance.Currency.findOne({ organization: organization._id })
    if (!currency || !currency.value) {
        currency = {
            currency: 'uzs',
            value: 1
        }
    }

    let total_debt_by_date = 0;
    let total_paid_by_date = 0;
    for (const itm of items) {
        if (typeof itm.total_debt == typeof 5 && itm.total_debt) {
            total_debt_by_date += itm.currency == 'usd' ? (itm.total_debt * itm.currency_value) : itm.total_debt;
        }
        if (typeof itm.paid == typeof 5 && itm.paid) {
            total_paid_by_date += itm.currency == 'usd' ? (itm.paid * itm.currency_value) : itm.paid;
        }
    }
    if (currency.currency == 'usd') {
        total_debt_by_date /= currency.value
        total_paid_by_date /= currency.value
    }

    const doc = new PDFDocument({
        layout: 'landscape'
    });

    doc.registerFont('NotoSansRegular', './static/pdfFonts/ya_r.ttf');
    doc.registerFont('NotoSansBold', './static/pdfFonts/ya_b.ttf');

    const time = new Date().getTime();
    const fileName = `${time}-debt.pdf`;
    const stream = doc.pipe(fs.createWriteStream(`./static/${fileName}`));
    const headers = [
        {
            header: 'Дата',
            id: 'date',
            width: 100,
            align: 'left',
            renderer: function (tb, data) {
                doc.font('NotoSansRegular')
                doc.fontSize(11)
                if(!data.date) {
                    return ''
                }
                return instance.date_ddmmyy_hhmm(data.date+4*60*60*1000);
            }
        },
        {
            header: 'Название товара',
            id: 'product_name',
            width: 120,
            align: 'left'
        },
        {
            header: 'Количество',
            id: 'value',
            width: 70,
            align: 'right'
        },
        {
            header: 'шт.',
            id: 'reminder',
            width: 30,
            align: 'right'
        },
        {
            header: 'Цена',
            id: 'price',
            width: 90,
            align: 'right',
            renderer: function (tb, data) {
                const value = data.price ? data.price.toLocaleString() : data.price;
                return value;
            }
        },
        {
            header: 'Оплачено',
            id: 'paid',
            width: 90,
            align: 'right',
            renderer: function (tb, data) {
                const value = data.paid ? data.paid.toLocaleString() : data.paid;
                return value;
            }
        },
        {
            header: 'Валюта',
            id: 'currency',
            width: 50,
            align: 'center'
        },
        {
            header: 'Курс',
            id: 'currency_value',
            width: 90,
            align: 'center',
            renderer: function (tb, data) {
                if (data.last_row) {
                    doc.font('NotoSansBold');
                    doc.fontSize(12);
                    return data.property_text;
                }
                const value = data.currency_value ? (Math.round(data.currency_value * 100) / 100).toLocaleString() : data.currency_value;
                return value;
            }
        },
        {
            header: 'Долг',
            id: 'total_debt',
            width: 100,
            align: 'right',
            renderer: function (tb, data) {
                if (data.last_row) {
                    return data.total;
                }
                const value = data.total_debt ? (Math.round(data.total_debt * 100) / 100).toLocaleString() : (data.paid ? (-1 * data.paid).toLocaleString() : data.total_debt);
                return value;
            }
        }
    ]

    let col1LeftPos = 30;
    let colTop = 10;
    let colWidth = 200;
    let col2LeftPos = colWidth + col1LeftPos;
    doc.image('./static/pdfFonts/invan.png', col1LeftPos - 10, colTop, {
        width: 130, height: 50
    })

    doc
        .font('NotoSansBold')
        .fontSize(10)
        .text(`${organization.name}`, col2LeftPos, colTop + 20)

    doc
        .font('NotoSansBold')
        .fontSize(10)
        .text(`Акт сверка по: ${instance.date_ddmmyy(from_time)} - ${instance.date_ddmmyy(to_time)}`, col2LeftPos, colTop + 40)

    colTop += 80;

    customer.first_name = customer.first_name?customer.first_name:'';
    customer.last_name = customer.last_name?customer.last_name:'';
    customer.phone_number=customer.phone_number?customer.phone_number:'';
    customer.email=customer.email?customer.email:'';
    customer.note=customer.note?customer.note:'';
    doc
        .font('NotoSansBold')
        .fontSize(10)
        .text('Клиент:', col1LeftPos, colTop, {
            lineGap: 30
        })
        .font('NotoSansRegular')
        .text(`${customer.first_name}\n${customer.last_name}\n${customer.phone_number}\n${customer.email}\n${customer.note}`, col2LeftPos, colTop)
    colTop += 70;

    user.name = user.name?user.name:'';
    user.role=user.role?user.role:'';
    user.phone_number = user.phone_number?user.phone_number:'';
    doc
        .font('NotoSansBold')
        .fontSize(10)
        .text('Пользователь:', col1LeftPos, colTop, {
            lineGap: 30
        })
        .font('NotoSansRegular')
        .text(`${user.name}\n${user.role}\n${user.phone_number}`, col2LeftPos, colTop)
    colTop += 50;

    doc
        .fontSize(10)
        .font('NotoSansBold')
        .text('', col1LeftPos, colTop)

    const table = new PdfTable(doc);
    table
        .addPlugin(new (require('voilab-pdf-table/plugins/fitcolumn'))({}))
        .setColumnsDefaults({
            headerBorder: ['B', 'T', 'L', 'R'],
            border: ['B', 'T', 'L', 'R'],
            headerPadding: [5, 2, 2, 3],
            padding: [5, 2, 2, 3],
            align: 'left'
        })
        .addColumns(headers)
        .onPageAdded(function (tb) {
            doc.font('NotoSansBold').fontSize(10);
            doc.text('', col1LeftPos, 50)
            tb.addHeader();
            doc.font('NotoSansRegular').fontSize(12);
        });

    table.addBody(items);
    table.showHeaders = false;

    table.setColumnsDefaults({
        border: [],
        padding: [5, 1, 1, 1]
    })
    table.setColumns(headers);
    table.addBody([
        {
            last_row: true,
            property_text: 'Общий долг:',
            total: customer.debt ? (Math.round(customer.debt * 100) / 100).toLocaleString() : customer.debt
        },
        {
            last_row: true,
            property_text: 'Долг по дата:',
            total: total_debt_by_date ? (Math.round(total_debt_by_date * 100) / 100).toLocaleString() : total_debt_by_date
        },
        {
            last_row: true,
            property_text: 'Оплачено по дата:',
            total: total_paid_by_date ? (Math.round(total_paid_by_date * 100) / 100).toLocaleString() : total_paid_by_date
        },
    ]);

    doc
        .fontSize(12)
        .font('NotoSansBold')
        .text('', 50, doc.y + 10, 50);

    doc.end();

    stream.on('finish', async function () {
        reply.sendFile(`/${fileName}`)
        setTimeout(() => {
            fs.unlink(`./static/${fileName}`, (err) => {
                if (err) {
                    instance.send_Error('exported items file', JSON.stringify(err))
                }
            })
        }, 2000)
    })
}

const customerDebtHistoryHandler = async function (request, reply, instance) {

    try {
        const { token, customer_id, from_time, to_time } = request.params;
        const user = await instance.User.findOne({ admin_token: token });
        if (!user) {
            return reply.unauthorized()
        }

        const customer = await instance.clientsDatabase.findOne({ _id: customer_id }, { debt_pay_history: 0 });

        if (!customer) {
            return reply.fourorfour('customer')
        }

        const matchCustomer = {
            $match: {
                _id: customer._id
            }
        }
        const unwindDebtHistory = {
            $unwind: {
                path: '$debt_pay_history'
            }
        }
        const filterDebtHistory = {
            $match: {
                'debt_pay_history.date': {
                    $gte: from_time,
                    $lte: to_time
                }
            }
        }
        const projectDebtHistory = {
            $project: {
                amount_type: '$debt_pay_history.amount_type',
                by_id: '$debt_pay_history.by_id',
                by_name: '$debt_pay_history.by_name',
                comment: '$debt_pay_history.comment',
                currency: '$debt_pay_history.currency',
                currency_value: '$debt_pay_history.currency_value',
                date: '$debt_pay_history.date',
                paid: '$debt_pay_history.paid',
            }
        }
        const debt_pay_history = await instance.clientsDatabase.aggregate([
            matchCustomer,
            unwindDebtHistory,
            filterDebtHistory,
            projectDebtHistory
        ]).allowDiskUse(true).exec();

        customer.debt_pay_history = debt_pay_history;

        const matchReceipts = {
            $match: {
                organization: user.organization,
                receipt_type: 'debt',
                user_id: customer.user_id,
                date: {
                    $gte: from_time,
                    $lte: to_time
                }
            }
        }
        const unwindItems = {
            $unwind: {
                path: '$sold_item_list'
            }
        }
        const projectItems = {
            $project: {
                date: '$date',
                product_name: '$sold_item_list.product_name',
                price: '$sold_item_list.price',
                value: '$sold_item_list.value',
                reminder: '$sold_item_list.reminder',
                currency: '$currency',
                currency_value: '$currency_value',
                total_debt: '$sold_item_list.total_debt',
                is_refund: '$is_refund'
            }
        }
        const sortReceipts = {
            $sort: {
                date: 1
            }
        }

        const receiptsResult = await instance.Receipts.aggregate([
            matchReceipts,
            unwindItems,
            projectItems,
            sortReceipts,
        ])
            .allowDiskUse(true)
            .exec();

        if (!(customer.debt_pay_history instanceof Array)) {
            customer.debt_pay_history = []
        }
        for(const index in receiptsResult) {
            if(receiptsResult[index].is_refund) {
                receiptsResult[index].reminder *= (-1);
                receiptsResult[index].total_debt *= (-1);
                receiptsResult[index].value *= (-1);
            }
        }
        const history = customer.debt_pay_history.concat(receiptsResult);
        history.sort((a, b) => (a.date > b.date) ? 1 : ((b.date > a.date) ? -1 : 0));

        await pdfWriter(request.params, customer, history, reply, instance, user);
    } catch (error) {
        reply.error(error.message)
    }
    return reply;
}

module.exports = ((instance, _, next) => {

    const customerDebtHistorySchema = {
        params: {
            type: 'object',
            required: [
                'token', 'customer_id',
                'from_time', 'to_time'
            ],
            properties: {
                token: { type: 'string' },
                customer_id: {
                    type: 'string',
                    minLength: 24,
                    maxLength: 24
                },
                from_time: {
                    type: 'number'
                },
                to_time: {
                    type: 'number'
                }
            }
        }
    }

    instance.get(
        '/customer-debt-history-pdf/:token/:customer_id/:from_time/:to_time/:name',
        {
            schema: customerDebtHistorySchema
        },
        (request, reply) => {
            customerDebtHistoryHandler(request, reply, instance)
        }
    )

    next()
})
