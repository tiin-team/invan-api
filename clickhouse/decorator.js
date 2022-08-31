

const fastifyPlugin = require("fastify-plugin");
const { ClickHouse } = require("clickhouse");
const { createInventoryTable } = require("./tables");


/**
 * @param {FastifyInstance<Server, IncomingMessage, ServerResponse>} fastify
 * @param {{
 * url: string,
 * port: number,
 * debug: boolean,
 * basicAuth: { username: string, password: string },
 * isUseGzip: boolean,
 * format: "json" | "csv" | "tsv",
 * config: {
 *  session_id: string,
 *  session_timeout: number,
 *  output_format_json_quote_64bit_integers: number,
 *  enable_http_compression: number,
 *  database: string,
 * },
 * }} options
 * @param {fastifyPlugin.nextCallback | undefined} done
 */
async function clickhouseConnector(fastify, options, done) {
  const {
    url,
    port,
    debug,
    basicAuth,
    // basicAuth: { username, password },
    isUseGzip,
    format,
    config: { database },
  } = options;

  const clickhouse = new ClickHouse({
    url,
    port,
    debug,
    basicAuth,
    isUseGzip,
    format,
    config: {
      database,
    },
  });
  createInventoryTable(clickhouse)
  fastify.decorate("clickhouse", clickhouse);

  done();
}

module.exports = fastifyPlugin(clickhouseConnector);
// CREATE TABLE INVAN.inventory_history
//   (
//     `organization` String,
//     `date` UInt64,
//     `unique` String,
//     `category_id` String,
//     `category_name` String,
//     `product_id` String,
//     `product_name` String,
//     `cost` UInt32,
//     `service` String,
//     `service_name` String,
//     `employee_id` String,
//     `employee_name` String,
//     `reason` String,
//     `type` String,
//     `adjustment` UInt32,
//     `stock_after` UInt32,
//   )
// ENGINE = MergeTree()
// PRIMARY KEY(organization, service, product_id, employee_id, reason, date)
// SELECT
// product_id,
// product_name,
// reason,
// SUM(adjustment) AS adjustment,
//     SUM(1) AS number_of_trips
// FROM inventory_history
// GROUP BY product_id, product_name, reason