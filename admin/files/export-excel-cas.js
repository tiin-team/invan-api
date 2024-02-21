const path = require("path");
const fs = require("fs");
const fp = require("fastify-plugin");
const ExcelJs = require("exceljs");

module.exports = fp((instance, _, next) => {
  /**
   *
   * @param {FastifyRequest<IncomingMessage, DefaultQuery, DefaultParams, DefaultHeaders, any>} request
   * @param {FastifyReply<ServerResponse>} reply
   * @param {FastifyInstance<Server, IncomingMessage, ServerResponse>} instance
   * @returns
   */
  async function downloadTurkishCasExcel(request, reply, instance) {
    try {
      const {
        organization,
        service,
        name: fileNameInRequestParams,
      } = request.params;

      const itemsQuery = {
        $match: {
          organization: organization,
          sold_by: "weight",
        },
      };

      const unWindServices = {
        $unwind: {
          path: "$services",
        },
      };

      const serviceMatch = {
        $match: {
          $or: [
            {
              "services.service": {
                $eq: instance.ObjectId(service + ""),
              },
            },
            {
              "services.service": {
                $eq: service + "",
              },
            },
          ],
        },
      };

      const necessaryFields = {
        $project: {
          name: "$name",
          sku: "$sku",
          price: "$services.price",
        },
      };

      const items = await instance.goodsSales
        .aggregate([itemsQuery, unWindServices, serviceMatch, necessaryFields])
        .allowDiskUse(true)
        .exec();

      const excelItems = [];
      for (const index in items) {
        const item = items[index];
        excelItems.push([1, item.sku, item.sku, item.name, item.price]);
      }

      const workbook = new ExcelJs.Workbook();
      const worksheet = workbook.addWorksheet("MyExcel", {
        pageSetup: { paperSize: 9, orientation: "landscape" },
      });

      const headers = [
        { name: "Department", key: "1" },
        { name: "PLU No", key: "2" },
        { name: `Name1`, key: "3" },
        { name: "Unit Price", key: "4" },
      ];

      try {
        worksheet.addTable({
          name: "Items",
          ref: "A1",
          headerRow: true,
          columns: headers,
          rows: excelItems,
        });
      } catch (error) {}

      const time = Date.now();

      const fileDir = path.join(
        __dirname,
        `../../static/${time}${fileNameInRequestParams}.xlsx`,
      );

      await workbook.xlsx.writeFile(fileDir);

      reply.sendFile(`./${time}.xlsx`);

      setTimeout(() => {
        fs.unlink(fileDir, (err) => {
          if (err) {
            instance.send_Error(
              "exported " + time + " file",
              JSON.stringify(err),
            );
          }
        });
      }, 3000);
    } catch (error) {
      reply.error(error.message);
    }

    return reply;
  }

  instance.get(
    "/items/get/cas-turkish/excel/:organization/:service/:name",
    (request, reply) => {
      return downloadTurkishCasExcel(request, reply, instance);
    },
  );

  next();
});
