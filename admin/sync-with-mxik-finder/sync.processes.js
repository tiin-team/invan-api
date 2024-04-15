const fp = require("fastify-plugin");
const { Schema } = require("mongoose");

module.exports = fp((instance, _, next) => {
  const mxikFinderSyncProcess = instance.model("mxikFinderSyncProcess", {
    organizationId: { type: String, required: true },
    startedAt: {
      type: Date,
      required: true,
      default: new Date().toISOString(),
    },
    endedAt: { type: Date, default: null },
    syncProductsCount: { type: Number, default: 0 },
    checkedProductsCount: { type: Number, default: 0 },
    page: { type: Number, default: 0, required: true },
    message: { type: String, default: "" },
    backendErrors: { type: Array, default: [] },
  });
  instance.decorate("mxikFinderSyncProcess", mxikFinderSyncProcess);

  next();
});
