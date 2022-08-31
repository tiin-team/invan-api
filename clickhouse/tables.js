async function createInventoryTable(clickhouse) {
    clickhouse.query(`
    CREATE TABLE IF NOT EXISTS inventory_history
      (
        \`organization\` String,
        \`date\` UInt64,
        \`unique\` String,
        \`category_id\` String,
        \`category_name\` String,
        \`product_id\` String,
        \`product_name\` String,
        \`cost\` UInt32,
        \`service\` String,
        \`service_name\` String,
        \`employee_id\` String,
        \`employee_name\` String,
        \`reason\` String,
        \`type\` String,
        \`adjustment\` UInt32,
        \`stock_after\` UInt32,
      )
    ENGINE = MergeTree()
    PRIMARY KEY(organization, service, product_id, employee_id, reason, date)
    `)
}
module.exports = { createInventoryTable }