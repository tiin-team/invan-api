
module.exports = (instance, options, next) => {
    // get supplier by id
    const getSupplierTransactions = async (supp) => {
        const query = { supplier_id: supp._id, status: { $ne: 'pending' } };

        const transactions = await instance.supplierTransaction
            .find(query, { document_id: 1, purchase_id: 1, balance: 1, status: 1, })
            .lean();

        for (const [index, item] of transactions.entries()) {
            invent = await instance.inventoryPurchase
                .findOne({ _id: item.purchase_id }, { type: 1 })
                .lean()
            if (invent) {
                blnc = item.balance
                if (invent.type == 'coming')
                    blnc = -Math.abs(item.balance)
                if (invent.type == 'refund')
                    blnc = Math.abs(item.balance)
                await instance.supplierTransaction
                    .findByIdAndUpdate(item._id, { balance: blnc }, { lean: true })
            }
        }

        allSum = 0
        const getFloat = num => isNaN(parseFloat(num)) ? 0 : parseFloat(num)

        for (let i = 0; i < transactions.length; i++) {
            allSum += transactions[i].status == 'pending'
                ? 0
                : getFloat(transactions[i].balance)
        }
        const purChases = await instance.inventoryPurchase
            .find(query, { p_order: 1, status: 1, type: 1, total: 1 })
            .lean();

        for (const purch of purChases) {
            if (!transactions.find(x => x.document_id == purch.p_order) && purch.status != 'pending') {
                if (purch.type == 'coming')
                    allSum -= getFloat(purch.total)
                else if (purch.type == 'refund')
                    allSum += getFloat(purch.total)
            }
        }

        return allSum
    }

    instance.get('/supplier-transactions/calculate-balance', { version: '2.0.0' }, (request, reply) => {
        instance.authorization(request, reply, async (user) => {
            try {
                const $match = {
                    $match: {
                        organization: user.organization,
                        is_deleted: { $ne: true },
                    },
                };
                const limit = !isNaN(parseInt(request.query.limit))
                    ? parseInt(request.query.limit)
                    : 10
                const page = !isNaN(parseInt(request.query.page))
                    ? parseInt(request.query.page)
                    : 1
                const $sort = { $sort: { _id: 1 } };
                const $skip = { $skip: (page - 1) * limit };
                const $limit = { $limit: limit };

                const $project = {
                    $project: {
                        _id: 1,
                        supplier_name: 1,
                    }
                }

                const pipeline = [
                    $match,
                    $project,
                    $skip,
                    $limit,
                    $sort,
                ];
                const suppliers = await instance.adjustmentSupplier.aggregate(pipeline)
                    .exec()
                console.log(suppliers);
                for (const index in suppliers) {
                    suppliers[index].balance = await getSupplierTransactions(suppliers[index])
                }
                return reply.ok(suppliers)
            }
            catch (error) {
                return reply.error(error)
            }
        })
    })

    next()
}