
const fp = require('fastify-plugin');
const mongoose = require('mongoose');

module.exports = fp((instance, _, next) => {

    const ProductsSchema = new mongoose.Schema({
        name: String,
        barcode: {
            type: String,
            unique: true
        },
        sold_by: {
            type: String
        }
    });

    ProductsSchema.statics.saveProduct = async function (data) {
        try {
            return await this.updateMany(
                { barcode: data.barcode },
                data,
                { upsert: true }
            )
        } catch (error) {
            console.log(error.message)
            return null
        }
    }

    const Products = mongoose.model('Products', ProductsSchema);
    instance.decorate('Products', Products)

    next()
})
