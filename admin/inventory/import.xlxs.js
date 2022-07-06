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
   * 
   * @param {{
   * _id: string;
   * sku: number;
   * name: string;
   * in_stock: number;
   * }[]} items 
   * @param {{_id: string, name: string}} service 
   * @param {*} user 
   * @return {Promise<{
   *   _id: string,
   *   error: string,
   * }>}
   */
  async function createInventoryCount(items, service, user) {
    try {
      const count_length = await instance.inventoryCount.countDocuments({ organization: user.organization });
      const p_order = 'IC' + (1001 + count_length)

      const invcount = {
        organization: user.organization,
        service: instance.ObjectId(service),
        service_name: service.name,
        p_order: p_order,
        type: 'partial',
        created_time: new Date().getTime(),
        closed_time: new Date().getTime(),
        status: 'in_progress',
        created_by: user.name,
        created_by_id: instance.ObjectId(user._id),
        cost_currency: 'uzs',
      }

      const query = {
        organization: user.organization,
        _id: {
          $in: items.map(e => e._id)
        }
      }

      const goods = await instance.goodsSales
        .find(
          query,
          {
            sku: 1,
            name: 1,
            cost: 1,
            barcode: 1,
            services: 1,
            cost_currency: 1,
          },
        )
        .lean();

      const gObj = {}
      for (const g of goods) {
        serv = g.services.find(s => s.service + '' === service._id + '')
        g.in_stock = serv.in_stock
        gObj[g._id] = g
      }

      const invCount = new instance.inventoryCount(invcount)

      const total = {
        total_difference: 0,
        total_cost_difference: 0
      }

      const invCountItems = [];

      for (const item of items) {
        if (gObj[item._id] != undefined) {
          invCountItems.push({
            organization: user.organization,
            service: instance.ObjectId(service),
            service_name: service.name,
            count_id: instance.ObjectId(invCount._id),
            product_id: gObj[item._id]._id,
            barcode: gObj[item._id].barcode,
            product_name: gObj[item._id].name,
            sku: gObj[item._id].sku,
            exp_in_stock: gObj[item._id].in_stock,
            cost: gObj[item._id].cost,
            cost_currency: 'uzs',
            counted: item.in_stock,
            difference: item.in_stock - gObj[item._id].in_stock,
            cost_difference: (item.in_stock - gObj[item._id].in_stock) * gObj[item._id].cost
          })
          total.total_difference += item.in_stock - gObj[item._id].in_stock
          total.total_cost_difference += (item.in_stock - gObj[item._id].in_stock) * gObj[item._id].cost
        }
      }

      invCount.total_difference = total.total_difference
      invCount.total_cost_difference = total.total_cost_difference

      await invCount.save();
      await instance.inventoryCountItem.insertMany(invCountItems);

      return {
        _id: invCount._id,
        error: '',
      }
    } catch (er) {
      console.log(er);
      return {
        _id: null,
        error: er,
      }
    }
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
        .findById(service_id, { _id: 1, name: 1 })
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

      const invCount = await createInventoryCount(data, service, user)

      reply.ok({
        inv_count_id: invCount._id,
        inv_create_error: invCount.error,
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
    instance.authorization(request, reply, (user) => {
      if (
        user.organization != request.params.organization ||
        !user.services ||
        !user.services.find(serv => serv.service + '' === request.params.service)
      )
        return reply.code(403).send('Forbidden')
      upload_excel_file_mxik(request, reply, user);
    });
  })
  next()
})
