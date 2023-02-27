const XLSX = require('xlsx')
const fp = require('fastify-plugin');
const { IncomingMessage, ServerResponse } = require('http');
const fs = require('fs')
const joi = require('joi');

/**
 * @param {string} path
 * @return {Promise<{
 *  _id: string,
 *  sku: number,
 *  name: string,
 *  category_name: string,
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
   * @param {{
   *  sku: number,
   *  name: string,
   *  category_id: string,
   *  category_name: string,
   * }[]} data
   * @param {{_id: string, name: string, organization: string}} service
   * @return {Promise<number>}
   */
  async function updateGoods(data, service) {
    let not_updated = 0;
    const update_items = []

    for (const good of data) {
      if (!good._id) {
        not_updated++
        continue
      }

      update_items.push({
        update: {
          filter: {
            sku: good.sku,
            organization: service.organization,
          },
          updateOne: {
            $set: {
              category: good.category_id,
              category_id: good.category_id,
              category_name: good.category_name,
            }
          }
        }
      })

    }
    await instance.goodsSales.bulkWrite(update_items)

    return not_updated;
  }


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
        .findOne(
          { _id: service_id, organization: organization },
          { _id: 1, name: 1, organization: 1 },
        )
        .lean()

      if (!service) return reply.code(404).send('Service not found')

      const data = await readFileXlsxFunc(_path)

      if (!data.length) return reply.error()

      const itemsSchema = joi
        .array()
        .items({
          // _id: joi.string().length(24).required(),
          name: joi.string(),
          sku: joi.number().required(),
          in_stock: joi.number().required(),
          category_name: joi.string().required(),
        })
        .options({ allowUnknown: true })

      const { error, value: items } = itemsSchema.validate(data);
      if (error) {
        const { details } = error;
        const message = details.map(i => i.message).join(', ');
        return reply.error(message)
      }

      const categories = await instance.goodsCategory
        .find(
          {
            organization: organization,
            name: {
              $in: data.map(d => d.category_name)
            },
          },
          {
            _id: 1,
            name: 1,
            type: 1,
          },
        )
        .lean()

      const catsObj = {}
      let not_found_cats_length = 0
      const not_found_cats = []
      for (const cat of categories) {
        catsObj[cat.name] = cat
      }

      for (const d of data) {
        const cat = catsObj[d.category_name]

        if (cat) {
          d.category_id = cat._id
          d.category_name = cat.name
        }
        else {
          not_found_cats_length++
          not_found_cats.push(d.category_name)
        }
      }

      if (not_found_cats_length > 0) {
        return reply.code(400).send({
          all_data: items.length,
          not_found_cats_length: not_found_cats_length,
          not_found_cats: not_found_cats,
        })
      }
      // tovarlarni update qilish
      const not_updated = await updateGoods(data, service)

      reply.ok({
        all_data: items.length,
        not_updated: not_updated,
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
  function upload_excel_file_items_category(request, reply, user) {
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

  instance.post('/inventory/update-items-category/:organization/:service', version, (request, reply) => {
    instance.authorization(request, reply, (user) => {
      // if (
      //   user.organization != request.params.organization ||
      //   !user.services ||
      //   !user.services.find(serv => serv.service + '' === request.params.service)
      // )
      //   return reply.code(403).send('Forbidden')
      upload_excel_file_items_category(request, reply, user);
    });
  })

  next()
})
