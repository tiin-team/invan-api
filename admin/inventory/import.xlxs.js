const XLSX = require('xlsx')
const { join } = require('path')
const fp = require('fastify-plugin');
const { IncomingMessage, ServerResponse } = require('http');
const fs = require('fs')

/**
 * @param {string} path
 * @return {{
 * _id: string
 *  sku: number,
 *  name: string,
 *  in_stock: number,
 * }[]}
*/
async function readFileXlsxFunc(path) {
  try {
    const workbook = XLSX.readFile(path);
    const sheet_name_list = workbook.SheetNames;

    return XLSX.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]]);
  } catch (error) {
    instance.send_Error('import inventarizatsiya xlsx file', JSON.stringify(error))
    return []
  }
}

module.exports = fp((instance, _, next) => {
  const version = { version: '2.0.0' }

  /**
   * @param {import('fastify').FastifyRequest<IncomingMessage, import('fastify').DefaultQuery, import('fastify').DefaultParams, import('fastify').DefaultHeaders, any>} request
   * @param {import('fastify').FastifyReply<ServerResponse>} reply
   * @param {any} user
   * @param {string} _path
  */
  async function importExel(request, reply, user, _path) {
    try {

      // const _path = join(__dirname, './ExcelItems.xls')
      console.log(_path);

      const organization = request.params.service
      const service_id = request.params.service
      // return readXlsFunc()
      // return readExcelJsFunc()
      const data = readFileXlsxFunc(_path)
      // console.log(data);
      if (!data.length) return reply.error()
      for (const good of data) {
        await instance.goodsSales.findOneAndUpdate(
          {
            _id: good._id,
            organization: organization,
            services: {
              $elemMatch: {
                service: service_id
              }
            }
          },
          {
            $set: {
              'services.$.in_stock': good.in_stock
            }
          },
          { lean: true },
        )
      }

      reply.ok()
    } catch (error) {
      reply.error(error)
    }
  }

  /**
   * @param {import('fastify').FastifyRequest<IncomingMessage, import('fastify').DefaultQuery, import('fastify').DefaultParams, import('fastify').DefaultHeaders, any>} request
   * @param {import('fastify').FastifyReply<ServerResponse>} reply
   * @param {any} user
  */
  function upload_excel_file_mxik(request, reply, user) {
    try {
      const files = request.raw.files

      const excel = files['excel']
console.log(excel);
      if (excel) {
        const url = './static/' + excel.md5 + excel.name
        const wstream = fs.createWriteStream(url);
        wstream.on('error', error => { return reply.error(error.message) })
        wstream.on('finish', () => {
          return importExel(request, reply, user, url)
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
  }

  instance.post('/inventory/:organization/:service', version, (request, reply) => {
    instance.authorization(request, reply, (user) => {
      upload_excel_file_mxik(request, reply, user);
    });
  })
  next()
})
