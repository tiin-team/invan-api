const fp = require('fastify-plugin');
const mongoose = require('mongoose');

module.exports = fp((instance, options, next) => {

    const ReleaseSchema = new mongoose.Schema({
        version: String,
        build_number: Number,
        change_log: String,
        file_name: String,
        file_size: Number,
        md5_hash: String,
    }, { collection: 'releases', timestamps: true });

    ReleaseSchema.index({ md5_hash: 1 }, { unique: true });
    ReleaseSchema.index({ build_number: 1, version: 1 });

    ReleaseSchema.statics.findByHash = async function (md5Hash) {
        return this.findOne({ md5_hash: md5Hash }).exec();
    };

    const Release = new mongoose.model('Release', ReleaseSchema);
    instance.decorate('Release', Release);

    next();

});