let instancee;
let c_data = []
setInterval(async (instance = instancee) => {
  try {
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
      c_data.map(i => {
        return {
          organization: i.organization,
          date: i.date,
          unique: i.unique,
          category_id: i.category_id,
          category_name: i.category_name,
          product_id: i.product_id,
          product_name: i.product_name,
          cost: i.cost,
          service: i.service,
          service_name: i.service_name,
          employee_id: i.employee_id,
          employee_name: i.employee_name,
          reason: i.reason,
          type: i.type,
          adjustment: isNaN(i.adjustment) ? 0 : parseFloat(i.adjustment),
          stock_after: isNaN(i.stock_after) ? 0 : parseFloat(i.stock_after),
        }
      }),
    )

    const res = await ins.toPromise();
    c_data = []
    return res;
  } catch (error) {
    instance.send_Error('insertInvHistory.setInterval', JSON.stringify(error))
  }
}, 60000, instancee);
async function insertInvHistory(instance, data = []) {
  instancee = instance

  try {
    if (!(data && data.length)) return
    c_data.push(...data)

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

  } catch (error) {
    instance.send_Error('insertInvHistory', JSON.stringify(error))
  }
}

module.exports = { insertInvHistory }
