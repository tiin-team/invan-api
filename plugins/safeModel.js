const fp = require("fastify-plugin");
const mongoose = require('mongoose');

module.exports = fp((instance, _, next) => {

    const safeHistoryType = {
        history_id: {
            type: mongoose.Schema.Types.ObjectId
        },
        history_type: {
            type: String,
            enum: [
                'fee', 'customer_debt',
                'supplier_transaction'
            ]
        },
        by_user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'users'
        },
        by_user_name: String,
        value: Number,
        date: Number
    }

    const SafeModelSchema = new mongoose.Schema({
        organization: String,
        type: {
            type: String,
            enum: [
                'uzs', 'usd', 'transfer'
            ]
        },
        value: {
            type: Number,
            default: 0
        },
        history: {
            type: safeHistoryType,
            default: []
        }
    });

    SafeModelSchema.statics.updateValue = async function (data, history) {
        if (!history.date) {
            history.date = new Date().getTime()
        }
        const { organization, type, value } = data;
        return await instance.Safe.findOneAndUpdate(
            {
                organization,
                type
            },
            {
                $inc: {
                    value
                },
                $push: {
                    history
                }
            },
            {
                new: true,
                upsert: true
            }
        )
    }

    SafeModelSchema.statics.getValues = async function (organization) {
        const $match = {
            $match: {
                organization
            }
        }
        const $group = {
            $group: {
                _id: '$organization',
                uzs_value: {
                    $sum: {
                        $cond: {
                            if: {
                                $eq: [
                                    '$type',
                                    'uzs'
                                ]
                            },
                            then: '$value',
                            else: 0
                        }
                    }
                },
                usd_value: {
                    $sum: {
                        $cond: {
                            if: {
                                $eq: [
                                    '$type',
                                    'usd'
                                ]
                            },
                            then: '$value',
                            else: 0
                        }
                    }
                },
                transfer_value: {
                    $sum: {
                        $cond: {
                            if: {
                                $eq: [
                                    '$type',
                                    'transfer'
                                ]
                            },
                            then: '$value',
                            else: 0
                        }
                    }
                },
            }
        }
        const result = await instance.Safe.aggregate([
            $match,
            $group
        ]).allowDiskUse(true).exec();

        if (result && result.length > 0) {
            return result[0];
        }
        return {
            uzs_value: 0,
            usd_value: 0,
            transfer_value: 0
        }
    }

    SafeModelSchema.statics.getReports = async function (type, page, organization) {

        const { uzs_value, usd_value, transfer_value } = await instance.Safe.getValues(organization);

        const limit = 10;
        const $match = {
            $match: {
                organization,
                type
            }
        }
        const $unwind = {
            $unwind: {
                path: '$history'
            }
        }
        const $skip = {
            $skip: (page - 1) * limit
        }
        const $limit = {
            $limit: limit
        }
        const $project = {
            $project: {
                history_id: '$history.history_id',
                history_type: '$history.history_type',
                by_user: '$history.by_user',
                by_user_name: '$history.by_user_name',
                value: '$history.value',
                date: '$history.date',
            }
        }

        const histories = await instance.Safe.aggregate([
            $match,
            $unwind,
            $skip,
            $limit,
            $project
        ]).allowDiskUse(true).exec();

        return {
            uzs_value,
            usd_value,
            transfer_value,
            histories
        }
    }

    const SafeModel = mongoose.model('SafeModel', SafeModelSchema);
    instance.decorate('Safe', SafeModel);

    next()
});
