const mongoose = require('mongoose');
const fs = require("fs");
const json2xls = require("json2xls");
const moment = require('moment')

function writeAndReply(instance, page, filename, History, reply) {
    try {
        console.log(filename)
        console.log(page)
        const limit = 500;
        History.find({}, (error, result) => {
            if (!result) {
                console.log(error)
                return reply.error('Error')
            }
            const fs = require('fs');
            const csvWriter = require('csv-write-stream')

            const writer = csvWriter()
            writer.pipe(fs.createWriteStream(`./static/${filename}`, { flags: 'a' }))
            for (let data of result) {
                const writeData = {}
                writeData[`${instance.i18n.__('reason')}`] = data.reason;
                writeData[`${instance.i18n.__('adjustment')}`] = data.adjustment;
                writeData[`${instance.i18n.__('stock_after')}`] = data.stock_after;
                writeData[`${instance.i18n.__('employee_name')}`] = data.employee_name;
                writeData[`${instance.i18n.__('date')}`] = instance.date_ddmmyy_hhmm(data.date);
                writer.write(writeData)
            }
            writer.end()
            if (result.length < limit) {
                return reply.sendFile(`./${filename}`);
            }
            return writeAndReply(instance, page + 1, filename, History, reply);
        }).sort({ _id: 1 }).skip(limit * (page - 1)).limit(limit);

        // const db = mongoose.connection;
        // const collection = db.collection(col_name);
        // collection.find({}, (_, result) => {
        //     if (!result) {
        //         return reply.error('Error')
        //     }
        //     const fs = require('fs');
        //     const csvWriter = require('csv-write-stream')

        //     const writer = csvWriter()
        //     writer.pipe(fs.createWriteStream(`./static/${filename}`, { flags: 'a' }))
        //     for (const data of result) {
        //         writer.write(data)
        //     }
        //     writer.end()
        //     if (result.length < limit) {
        //         return reply.sendFile(`./${filename}`);
        //     }
        //     return writeAndReply(instance, page + 1, filename, collection, reply);
        // }).sort({ _id: 1 }).skip(limit * (page - 1)).limit(limit);
    }
    catch (error) {
        console.log(error);
        reply.error(error.message)
    }
}

async function getExcelFile(request, reply, instance) {
    try {
        const user = request.user;
        const organization = user.organization;

        const { min, max, service, category, employee, reason } = request.query;
        const matchHistory = {
            $match: {
                organization: organization,
                date: {
                    $gte: min - (process.env.TIME_DIFF | 0),
                    $lte: max - (process.env.TIME_DIFF | 0)
                }
            }
        }
        if (service) {
            matchHistory['$match'].service = service;
        }

        if (category) {
            matchHistory['$match'].category = category;
        }

        if (employee) {
            matchHistory['$match'].employee = employee;
        }
        if (reason) {
            matchHistory['$match'].reason = reason;
        }
        if (user.ui_language && user.ui_language.value != undefined) {
            instance.i18n.setLocale(user.ui_language.value)
        }
        const limitHistory = {
            $limit: 10000
        }
        const projectHistory = {
            $project: {
                _id: 1,
                reason: 1,
                product_name: 1,
                adjustment: 1,
                stock_after: 1,
                employee_name: 1,
                date: 1,
                sku: 1,
            }
        }
        const col_name = `inv_files_to_download`;
        // const col_name = `inv_his`;
        const out = {
            $out: col_name
        }
        // const histories = await 
        instance.inventoryHistory.aggregate([
            matchHistory,
            limitHistory,
            projectHistory,
            out
        ], async () => {
            /*
            const schema = mongoose.Schema({
                reason: String,
                product_name: String,
                adjustment: Number,
                stock_after: Number,
                employee_name: String,
                date: Number,
            });
            const History = mongoose.model(col_name, schema);
            return writeAndReply(instance, 1, `${col_name}.csv`, History, reply);
            */

            const mongoose = require('mongoose')
            const util = require('util')
            const stream = require('stream')
            const pipeline = util.promisify(stream.pipeline)
            const stringify = require('csv-stringify')
            const fs = require('fs')
            const fsp = require('fs').promises;

            const schema = mongoose.Schema({
                reason: String,
                product_name: String,
                adjustment: Number,
                stock_after: Number,
                employee_name: String,
                date: Number,
            });
            const History = mongoose.model(col_name, schema);

            const historyCursor = History.find({}).cursor({
                transform: (history) => {
                    let { _id: historyId, reason, product_name, adjustment, stock_after, employee_name, date } = history.toObject()
                    date = instance.date_ddmmyy_hhmm(date)
                    return { historyId, reason, product_name, adjustment, stock_after, employee_name, date }
                }
            })
            const csvStream = stringify({
                header: true,
                columns: {
                    reason: `${instance.i18n.__('reason')}`,
                    product_name: `${instance.i18n.__('product_name')}`,
                    adjustment: `${instance.i18n.__('adjustment')}`,
                    stock_after: `${instance.i18n.__('stock_after')}`,
                    employee_name: `${instance.i18n.__('employee_name')}`,
                    date: `${instance.i18n.__('date')}`
                }
            })
            let dst = `./static/history-${col_name}.csv`
            await pipeline(historyCursor, csvStream, fs.createWriteStream(dst))
            console.log('Done')
            reply.sendFile(`./history-${col_name}.csv`);
            setTimeout(() => {
                fs.unlink(dst, (err) => {
                    if (err) {
                        instance.send_Error(
                            "exported file",
                            JSON.stringify(err)
                        );
                    }
                });
                History.deleteMany({}, (error) => {
                    if (error) { console.log(error) }
                })
            }, 5000);

        }).allowDiskUse(true).exec();

        // const db = mongoose.connection;
        // const collection = db.collection(col_name);
        // console.log(col_name)
        // collection.find({}, (_, list) => {
        //     console.log(list)
        //     if (!list) return reply.error('Failed');

        //     // res.statusCode = 200;
        //     // res.setHeader('Content-Type', 'text/csv');
        //     // res.setHeader("Content-Disposition", 'attachment; filename=' + filename);
        //     // res.csv(products, true);
        //     const filename = 'history.csv';
        //     reply
        //         .code(200)
        //         .header("Content-Type", 'text/csv')
        //         .header("Content-Disposition", 'attachment; filename=' + filename)
        //         .csv(products, true);
        // })
        // reply.send('salom');
        // const excelRows = [];
        // for(const h of histories) {
        //     excelRows.push({
        //         [`${instance.i18n.__('date')}`]: instance.date_ddmmyy_hhmm(h.date),
        //         [`${instance.i18n.__('product_name')}`]: h.product_name,
        //         [`${instance.i18n.__('employee_name')}`]: h.employee_name,
        //         [`${instance.i18n.__('adjustment')}`]: h.adjustment,
        //         [`${instance.i18n.__('stock_after')}`]: h.stock_after,
        //         [`${instance.i18n.__('reason')}`]: h.reason,
        //     });
        // }

        // const fs = require("fs");
        // const json2xls = require("json2xls");
        // const xls = json2xls(excelRows);
        // const timeStamp = new Date().getTime()

        // fs.writeFileSync(`./static/history-${timeStamp}.xls`, xls, "binary");

        // reply.sendFile(`./history-${timeStamp}.xls`);
        // setTimeout(() => {
        //     fs.unlink(`./static/history-${timeStamp}.xls`, (err) => {
        //     if (err) {
        //         instance.send_Error(
        //         "exported file",
        //         JSON.stringify(err)
        //         );
        //     }
        //     });
        // }, 2000);
    } catch (error) {
        reply.error(error.message)
    }
    return reply;
}
async function getExcelFileNew(request, reply, instance) {
    try {
        const user = request.user;
        const organization = user.organization;

        const { min, max, service, category, employee, reason, type } = request.query;
        const matchHistory = {
            $match: {
                organization: organization,
                date: {
                    $gte: min - (process.env.TIME_DIFF | 0),
                    $lte: max - (process.env.TIME_DIFF | 0)
                }
            }
        }
        if (service) {
            matchHistory['$match'].service = service;
        }

        if (category) {
            matchHistory['$match'].category = category;
        }

        if (employee) {
            matchHistory['$match'].employee = employee;
        }
        if (reason) {
            matchHistory['$match'].reason = reason;
        }
        if (user.ui_language && user.ui_language.value != undefined) {
            instance.i18n.setLocale(user.ui_language.value)
        }
        const limitHistory = {
            $limit: 10000
        }
        const lookupItems = {
            $lookup: {
                from: 'goodssales',
                localField: 'product_id',
                foreignField: '_id',
                as: 'product'
            }
        }
        const projectHistory = {
            $project: {
                _id: 1,
                reason: 1,
                product_name: 1,
                adjustment: 1,
                stock_after: 1,
                employee_name: 1,
                barcode: {
                    $first: "$product.barcode"
                },
                date: 1,
                sku: 1,
            }
        }
        const col_name = `inv_files_to_download`;
        const out = {
            $out: col_name
        }
        instance.inventoryHistory.aggregate([
            matchHistory,
            lookupItems,
            // limitHistory,
            projectHistory,
            // out
        ], async (err, items) => {
            if (err) {
                reply.error(err)
            }
            if (type == 'json') {
                return reply.ok({
                    data: items
                })
            }

            const items_excel_arr = [];
            i = 1
            for (const it of items) {
                items_excel_arr.push({
                    [`${instance.i18n.__('count')}`]: i++,
                    [`${instance.i18n.__('_id')}`]: it._id,
                    [`${instance.i18n.__('date')}`]: moment(it.date).format("DD.MM.YYYY HH:MM"),
                    [`${instance.i18n.__('product_name')}`]: it.product_name,
                    [`${instance.i18n.__('employee_name')}`]: it.employee_name,
                    [`${instance.i18n.__('reason')}`]: it.reason,
                    [`${instance.i18n.__('adjustment')}`]: it.adjustment,
                    [`${instance.i18n.__('stock_after')}`]: it.stock_after
                })
            }
            const xls = json2xls(items_excel_arr);
            const timeStamp = new Date().getTime();
            await fs.writeFileSync(`./static/items-${timeStamp}.xls`, xls, "binary");
            reply.sendFile(`./items-${timeStamp}.xls`);
            setTimeout(() => {
                fs.unlink(`./static/items-${timeStamp}.xls`, (err) => {
                    if (err) {
                        instance.send_Error(
                            "exported file",
                            JSON.stringify(err)
                        );
                    }
                });
            }, 2000);
        }).allowDiskUse(true).exec();

    } catch (error) {
        reply.error(error.message)
    }
    return reply;
}

module.exports = ((instance, _, next) => {

    const querySchema = {
        schema: {
            query: {
                type: 'object',
                required: [
                    'token',
                    'min', 'max'
                ],
                properties: {
                    type: {
                        type: 'string'
                    },
                    token: {
                        type: 'string'
                    },
                    min: {
                        type: 'number'
                    },
                    max: {
                        type: 'number'
                    },
                    service: {
                        type: 'string'
                    },
                    category: {
                        type: 'string'
                    },
                    employee: {
                        type: 'string'
                    },
                    reason: {
                        type: 'string'
                    }
                }
            }
        }
    }

    instance.get('/inventory/history/excel-file', querySchema, (request, reply) => {
        const { token } = request.query;
        request.headers['authorization'] = token;
        request.headers['accept-user'] = 'admin';
        instance.oauth_admin(request, reply, (user) => {
            if (!user) {
                return reply.error('Access')
            }
            request.user = user
            return getExcelFileNew(request, reply, instance)
        })
    })

    next()
})
