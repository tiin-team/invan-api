const fp = require("fastify-plugin");
const axios = require("axios");
const { appendFile } = require("fs/promises");
const { existsSync, mkdirSync } = require("fs");
const { resolve } = require("path");

const mxikFinderBaseUrl = "https://mxik-finder.in1.uz/api";
const axiosInstance = axios.default.create({
  baseURL: mxikFinderBaseUrl,
});

const path = resolve("./..", "myLogs");
const myConsole = {
  log: async (...args) => {
    await appendFile(`${path}/in1.log`, `${JSON.stringify(args)}\n`);
  },
  init: () => {
    const isExists = existsSync(path);
    if (isExists) {
      return;
    }

    mkdirSync(path);
  },
};
myConsole.init();
myConsole.log("test", "asdf");
module.exports = fp((instance, _, next) => {
  /**
   *
   * @param {string} processId
   * @param {string} organizationId
   * @param {string[]} barcode
   * @param {number} page
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async function syncProductsByBarcode(
    processId,
    organizationId,
    barcode,
    page = 1,
  ) {
    try {
      myConsole.log("getting request. page:", page);
      const axiosResponse = await axiosInstance.post("/products/filter", {
        limit: 100,
        page: page,
        startDate: Date.now(),
        endDate: Date.now(),
        barcode: barcode,
      });
      myConsole.log(axiosResponse.data, "afasdfasdf---------------");
      if (!axiosResponse.data.success) {
        await instance.mxikFinderSyncProcess.findByIdAndUpdate(
          processId,
          {
            $set: {
              endedAt: new Date().toISOString(),
              message: axiosResponse.data.message,
            },
            $push: { backendErrors: axiosResponse.data.errors },
          },
          {
            lean: true,
          },
        );

        return {
          success: axiosResponse.data.success,
          message: axiosResponse.data.message,
        };
      }

      const products = axiosResponse.data.data;
      const bulkWrites = new Array(products.length);
      for (let i = 0; i < products.length; i++) {
        bulkWrites[i] = {
          updateMany: {
            filter: {
              organization: organizationId,
              barcode: { $elemMatch: { $eq: products[i].barcode } },
            },
            update: {
              $set: {
                mxik: products[i].mxik,
                // marking: products[i].marking
              },
            },
          },
        };
      }

      const bulkOperationResult = await instance.goodsSales.bulkWrite(
        bulkWrites,
      );
      await instance.mxikFinderSyncProcess.findByIdAndUpdate(
        processId,
        {
          $set: {
            $inc: { syncProductsCount: products.length },
          },
        },
        {
          lean: true,
        },
      );

      if (
        axiosResponse.data.meta.currentPage ==
        axiosResponse.data.meta.totalPages
      ) {
        return { message: "Finished", success: true };
      }

      return await syncProductsByBarcode(
        processId,
        organizationId,
        barcode,
        ++page,
      );
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   *
   * @param {*} process
   * @param {string} organizationId
   * @param {number} page
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async function recursiveSyncProducts(process, organizationId, page = 1) {
    try {
      const batchSize = 1_000;
      const goodsSales = await instance.goodsSales
        .find(
          {
            organization: organizationId,
          },
          {
            barcode: 1,
          },
        )
        .limit(batchSize)
        .skip(page * batchSize)
        .lean();
      myConsole.log(organizationId, "organizationId");
      myConsole.log(goodsSales.length);

      if (goodsSales.length === 0) {
        await instance.mxikFinderSyncProcess.findByIdAndUpdate(
          process._id,
          {
            $set: {
              page: page,
              endedAt: new Date().toISOString(),
            },
          },
          {
            lean: true,
          },
        );

        return { success: true, message: "Success end" };
      }

      await syncProductsByBarcode(
        process._id,
        organizationId,
        goodsSales.flatMap((v) => v.barcode),
      );

      await instance.mxikFinderSyncProcess.findByIdAndUpdate(
        process._id,
        {
          $set: {
            page: page,
          },
        },
        {
          lean: true,
        },
      );

      return await recursiveSyncProducts(process, organizationId, ++page);
    } catch (error) {
      instance.mxikFinderSyncProcess
        .findByIdAndUpdate(
          process._id,
          {
            $set: {
              endedAt: new Date().toISOString(),
              message: `Failed in recursiveSyncProducts. ${error.message}`,
            },
            $push: { backendErrors: error },
          },
          {
            lean: true,
          },
        )
        .catch(() => {});

      return { success: false, message: "Failed" };
    }
  }

  /**
   *
   * @param {string} organizationId
   */
  async function syncProductsWithMxikFinder(organizationId) {
    try {
      const organization = await instance.organizations
        .findById(organizationId, { _id: 1 })
        .lean();
      if (!organization) {
        return { success: false, message: "Organization not found" };
      }

      const process = await instance.mxikFinderSyncProcess
        .findOne({
          organizationId: organizationId,
          endedAt: null,
        })
        .lean();
      if (process) {
        return { success: true, message: "Process allready started" };
      }

      const newProcess = await instance.mxikFinderSyncProcess.create({
        organizationId: organizationId,
        syncProductsCount: 0,
        endedAt: null,
      });

      recursiveSyncProducts(newProcess, organizationId);

      return { success: true, message: "Process successfully started" };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async function runFailedProcesses() {
    await new Promise((res) => setTimeout(res, 1000));

    const processes = await instance.mxikFinderSyncProcess
      .find({
        endedAt: null,
      })
      .lean();
    for (const process of processes) {
      myConsole.log(
        `to'xtab qolgan process. id:`,
        process._id,
        "orgId:",
        process.organizationId,
      );

      const res = await recursiveSyncProducts(process, process.organizationId);
      if (res.success) {
        continue;
      }

      await instance.mxikFinderSyncProcess.findByIdAndUpdate(
        process._id,
        {
          $set: {
            endedAt: new Date().toISOString(),
            message: { $concat: res.message },
          },
        },
        { lean: true },
      );
    }

    myConsole.log("FailedProcesses Finished");
  }

  runFailedProcesses();

  instance.post(
    "/items/sync-with/mxik-finder",
    {
      preValidation: instance.authorize_admin,
      version: "1.0.0",
      schema: {
        body: {
          type: "object",
          required: ["organization_id"],
          properties: {
            organization_id: {
              type: "string",
              minLength: 24,
              maxLength: 24,
            },
          },
        },
      },
      attachValidation: true,
    },
    async (request, reply) => {
      const res = await syncProductsWithMxikFinder(
        request.body.organization_id,
      );
      reply.ok(res);
      return reply;
    },
  );

  instance.post(
    "/items/sync-with/mxik-finder/get-last",
    {
      preValidation: instance.authorize_admin,
      version: "1.0.0",
      schema: {
        body: {
          type: "object",
          required: ["organization_id"],
          properties: {
            organization_id: {
              type: "string",
              minLength: 24,
              maxLength: 24,
            },
          },
        },
      },
      attachValidation: true,
    },
    async (request, reply) => {
      const organizationId = request.body.organization_id;
      if (request.user.organization != organizationId) {
        return reply.error("Permission denied");
      }

      const organization = await instance.organizations
        .findById(organizationId, { _id: 1 })
        .lean();
      if (!organization) {
        return reply.fourorfour("Organization");
      }

      const process = await instance.mxikFinderSyncProcess
        .findOne(
          {
            organizationId: organizationId,
          },
          {
            message: 1,
            organizationId: 1,
            startedAt: 1,
            endedAt: 1,
            syncProductsCount: 1,
          },
        )
        .lean();
      if (!process) {
        return reply.fourorfour("Process");
      }

      reply.ok(process);
      return reply;
    },
  );

  next();
});
