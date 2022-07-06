const XLSX = require('xlsx')
const { join } = require('path')
const fp = require('fastify-plugin');
const { IncomingMessage, ServerResponse } = require('http');
const fs = require('fs')

/**
 * @param {string} path
 * @return {Promise<{
 * _id: string,
 *  sku: number,
 *  name: string,
 *  in_stock: number,
 * }[]>}
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
      const organization = request.params.organization
      const service_id = request.params.service
      const service = await instance.services
        .findById(service_id, { _id: 1 })
        .lean()

      if (!service) return reply.code(404).send('Service not found')

      const data = await readFileXlsxFunc(_path)

      let not_updated = 0
      if (!data.length) return reply.error()
      for (const good of data) {
        if (!good._id) {
          not_updated++
          continue
        }

        const res = await instance.goodsSales.findOneAndUpdate(
          {
            _id: good._id,
            organization: organization,
            services: {
              $elemMatch: {
                service: service._id,
              },
            },
          },
          {
            $set: {
              'services.$.in_stock': good.in_stock
            }
          },
          { lean: true, new: true },
        )
          .then((res) => {
            return res === null ? -1 : 1
          })
          .catch(() => -1)

        if (res === -1)
          not_updated++
      }

      reply.ok({
        all_data: data.length,
        success: data.length - not_updated,
        fail_count: not_updated,
      })

      fs.unlink(_path, (err) => {
        if (err) {
          instance.send_Error(`Unlink file, path: ${_path}`, JSON.stringify(err))
        }
      })
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
      reply.error(err.message)
    }
  }

  instance.post('/inventory/:organization/:service', version, (request, reply) => {
    const user = {}
    // instance.authorization(request, reply, (user) => {
    //   if (
    //     user.organization != request.params.organization ||
    //     !user.services ||
    //     !user.services.find(serv => serv.service + '' === request.params.service)
    //   )
    // return reply.code(403).send('Forbidden')
    upload_excel_file_mxik(request, reply, user);
    // });
  })
  next()
})
