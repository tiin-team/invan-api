
const fs = require('fs');
const CSVToJSON = require('csvtojson');
const joi = require('joi');

module.exports = ((instance, _, next) => {

  const saveProducts = async (request, reply, url) => {
    try {
      const data = await CSVToJSON().fromFile(url);

      const itemsSchema = joi.array().items({
        barcode: joi.string().regex(/^\d+$/).min(5).required(),
        name: joi.string().trim().required(),
        sold_by: joi.string().valid('each', 'weight', 'box', 'litre', 'metre', 'pcs')["default"]('each')
      })

      const { error, value: items } = itemsSchema.validate(data);
      if (error) {
        const { details } = error;
        const message = details.map(i => i.message).join(', ');
        reply.error(message)
      }
      else {
        for (const item of items) {
          instance.Products.saveProduct(item)
        }
        reply.ok({ ok: true });
      }
    }
    catch (error) {
      reply.error(error.message)
    }
  }

  const saveFile = async (request, reply) => {
    try {
      var files = request.raw.files
      const excel = files['excel']
      if (excel) {
        var url = './static/' + excel.md5 + excel.name
        var wstream = fs.createWriteStream(url);
        wstream.on('error', error => { return reply.error(error.message) })
        wstream.on('finish', () => {
          return saveProducts(request, reply, url)
        })
        wstream.write(excel.data)
        wstream.end()
      }
      else {
        reply.send({
          statusCode: 404,
          error: "File not found"
        })
      }
    }
    catch (err) {
      reply.error(error.message)
    }
    return reply;
  }

  instance.post(
    '/products/upload',
    saveFile
  )

  next()
})
