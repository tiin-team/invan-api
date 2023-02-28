
const fp = require('fastify-plugin');
const mongoose = require('mongoose');
// @index({ organization: 1, product_id: 1 }, { unique: true, background: true })
module.exports = fp((instance, _, next) => {

    const itemsType = {
        product_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'goodssales'
        },
        product_name: {
            type: String
        },
        quality: {
            type: Number
        },
        cost: {
            type: Number
        },
        cost_currency: {
            type: String
        }
    }

    const TechMapSchema = new mongoose.Schema({
        organization: String,
        product_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'goodssales'
        },
        product_name: String,
        composite_items: {
            type: itemsType,
            _id: false,
            default: []
        }
    })

    TechMapSchema.statics.saveTechMap = async function (data) {
        return await new instance.TechMap(data).save();
    }

    TechMapSchema.statics.updateTechMap = async function (id, data) {
        return await instance.TechMap.findOneAndUpdate(
            { _id: id },
            {
                $set: data
            },
            {
                new: true
            }
        );
    }

    const TechMap = mongoose.model('TechMap', TechMapSchema)
    instance.decorate('TechMap', TechMap)

    next()
})
