
export async function insertInvHistory(instance, data) {
  const ins = instance.clickhouse.insert(`INSERT INTO inventory_history
  (
    organization,
    date,
    unique,
    category_id,
    category_name,
    product_id,
    product_name,
    cost,
    service,
    service_name,
    employee_id,
    employee_name,
    reason,
    type,
    adjustment,
    stock_after
  )`,
    data,
  )
  return await ins.toPromise();
  // const insert_data = [{
  //     organization: 'feko',
  //     date: 1,
  //     unique: 'feko',
  //     category_id: 'feko',
  //     category_name: 'feko',
  //     product_id: 'feko',
  //     product_name: 'feko',
  //     cost: 1,
  //     service: 'feko',
  //     service_name: 'feko',
  //     employee_id: 'feko',
  //     employee_name: 'feko',
  //     reason: 'feko',
  //     type: 'feko',
  //     adjustment: 10,
  //     stock_after: 5
  //   }]
  //   const ins = clickhouse.insert(`INSERT INTO inventory_history
  //     (
  //       organization,
  //       date,
  //       unique,
  //       category_id,
  //       category_name,
  //       product_id,
  //       product_name,
  //       cost,
  //       service,
  //       service_name,
  //       employee_id,
  //       employee_name,
  //       reason,
  //       type,
  //       adjustment,
  //       stock_after
  //     )`,
  //     insert_data,
  //   )
}
