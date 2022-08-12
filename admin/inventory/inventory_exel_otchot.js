const ExcelJs = require('exceljs');
const fs = require('fs');
const path = require('path')
const fp = require('fastify-plugin')

const removeBorders = (worksheet, list) => {
  for (const cell of list) {
    worksheet.getCell(cell.cell).border = {
      top: { style: 'thin', color: { argb: cell.top ? cell.top : 'FFFFFFFF' } },
      left: { style: 'thin', color: { argb: cell.left ? cell.left : 'FFFFFFFF' } },
      bottom: { style: 'thin', color: { argb: cell.bottom ? cell.bottom : 'FFFFFFFF' } },
      right: { style: 'thin', color: { argb: cell.right ? cell.right : 'FFFFFFFF' } }
    }
  }
}

const borderStyle4 = {
  top: { color: { argb: '000000' }, style: 'thin' },
  right: { color: { argb: '000000' }, style: 'thin' },
  bottom: { color: { argb: '000000' }, style: 'thin' },
  left: { color: { argb: '000000' }, style: 'thin' },
}

const multiMergeCells = (worksheet, list) => {
  for (const cell of list) {
    worksheet.mergeCells(cell)
  }
}
/**
 * @param { ExcelJs.Worksheet} worksheet
 * @param {[{cell: string, fColor: string, value: string}]} list
 * 
*/
const multiFillCells = (worksheet, list) => {
  for (const cell of list) {
    worksheet.getCell(cell.cell).value = cell.value
    worksheet.getCell(cell.cell).style = {
      font: { name: 'Calibri', size: 12, bold: true },
      border: borderStyle4,
      alignment: {
        horizontal: "center",
        vertical: "middle",
      },
      fill: {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: cell.fColor },
      },
      protection: { locked: false }
    }
    if (['G6', 'H6', 'I6', 'J6', 'K6', 'L6', 'M6', 'N6'].includes(cell.cell))
      worksheet.getColumn(cell.cell[0]).width = 13
    // if (['H7', 'I7'].includes(cell.cell))
    //   worksheet.getColumn(cell.cell[0]).width = 20
    if (cell.cell === 'D5')
      worksheet.getColumn(cell.cell[0]).width = 28
    if (cell.cell === 'E5')
      worksheet.getColumn(cell.cell[0]).width = 20
  }
}

/**
 * @param { ExcelJs.Worksheet} worksheet
 * @param {{start_time: string, end_time: string}} data
 * 
*/
const makeInventoryOtchotHeader = (worksheet, data) => {
  multiMergeCells(worksheet, [
    'B5:B6', 'C5:C6', 'D5:D6', 'E5:E6', 'F5:F6',
    'G5:H5', 'I5:J5', 'K5:L5', 'M5:N5', 'C7:F7',
  ])

  multiFillCells(worksheet, [
    { cell: 'B5', fColor: 'FCF4A4', value: 'Код' },
    { cell: 'B7', fColor: 'FCF4A4', value: '' },
    { cell: 'C5', fColor: 'FCF4A4', value: `Баркод` },
    { cell: 'C7', fColor: 'FCF4A4', value: '' },
    { cell: 'D5', fColor: 'FCF4A4', value: `Наименование` },
    { cell: 'E5', fColor: 'FCF4A4', value: `Ед. изм.` },
    { cell: 'F5', fColor: 'FCF4A4', value: `Цена` },
    { cell: 'G5', fColor: 'FCF4A4', value: `Остаток на ${data.start_time}` },
    { cell: 'G6', fColor: 'FCF4A4', value: `Количество` },
    { cell: 'G7', fColor: 'FCF4A4', value: `` },
    { cell: 'H6', fColor: 'FCF4A4', value: `Сумма` },
    { cell: 'H7', fColor: 'FCF4A4', value: `` },
    { cell: 'I5', fColor: 'FCF4A4', value: `Приход` },
    { cell: 'I6', fColor: 'FCF4A4', value: `Количество` },
    { cell: 'I7', fColor: 'FCF4A4', value: `` },
    { cell: 'J6', fColor: 'FCF4A4', value: `Сумма` },
    { cell: 'J7', fColor: 'FCF4A4', value: `` },
    { cell: 'K5', fColor: 'FCF4A4', value: `Расход` },
    { cell: 'K6', fColor: 'FCF4A4', value: `Количество` },
    { cell: 'K7', fColor: 'FCF4A4', value: `` },
    { cell: 'L6', fColor: 'FCF4A4', value: `Сумма` },
    { cell: 'L7', fColor: 'FCF4A4', value: `` },
    { cell: 'M5', fColor: 'FCF4A4', value: `Остаток на ${data.end_time}` },
    { cell: 'M6', fColor: 'FCF4A4', value: `Количество` },
    { cell: 'M7', fColor: 'FCF4A4', value: `` },
    { cell: 'N6', fColor: 'FCF4A4', value: `Сумма` },
    { cell: 'N7', fColor: 'FCF4A4', value: `` },
  ])


  const row5 = worksheet.getRow(5);

  for (const cell of row5._cells) {
    if (cell) {
      if (
        cell._address[0] !== 'B' ||
        cell._address[0] !== 'C' ||
        cell._address[0] !== 'D' ||
        cell._address[0] !== 'E' ||
        cell._address[0] !== 'F'
      ) {
        if (cell._address[0] === 'N') {
          cell.style.border =
          {
            ...cell.style.border,
            right: { color: { argb: '000000' }, style: 'thin' },
            top: { color: { argb: '000000' }, style: 'thin' },
            bottom: { color: { argb: '000000' }, style: 'thin' },
          }
        } else
          cell.style.border =
          {
            ...cell.style.border,
            top: { color: { argb: '000000' }, style: 'thin' },
            bottom: { color: { argb: '000000' }, style: 'thin' },
          }
      }
    }
  }

  const row6 = worksheet.getRow(6);
  row6.height = 60

  for (const cell of row6._cells) {
    if (cell) {
      if (
        cell._address[0] !== 'D' ||
        cell._address[0] !== 'E'
      ) {
        cell.style.border =
        {
          ...cell.style.border,
          left: { color: '000000', style: 'thin' },
          right: { color: '000000', style: 'thin' },
        }
      }
    }
  }

  const row7 = worksheet.getRow(7);

  for (const cell of row7._cells) {
    if (cell) {
      if (cell._address[0] === 'D') {
        cell.style.border =
        {
          left: { color: '000000', style: 'thin' },
          // right: { color: '000000', style: 'thin' },
          top: { color: { argb: '000000' }, style: 'thin' },
          bottom: { color: { argb: '000000' }, style: 'thin' },
        }
      } if (cell._address[0] === 'E') {
        cell.style.border =
        {
          // left: { color: '000000', style: 'thin' },
          right: { color: '000000', style: 'thin' },
          top: { color: { argb: '000000' }, style: 'thin' },
          bottom: { color: { argb: '000000' }, style: 'thin' },
        }
      }
      if (cell._address[0] === 'D') {
        cell.style.border =
        {
          left: { color: '000000', style: 'thin' },
          // right: { color: '000000', style: 'thin' },
          top: { color: { argb: '000000' }, style: 'thin' },
          bottom: { color: { argb: '000000' }, style: 'thin' },
        }
      } if (cell._address[0] === 'F') {
        cell.style.border = borderStyle4
      } else {
        cell.style.border =
        {
          ...cell.style.border,
          left: { color: '000000', style: 'thin' },
          right: { color: '000000', style: 'thin' },
        }
      }
    }
  }
}

module.exports = fp((instance, _, next) => {

  /**
   * @param {[string]} services 
   * @param {{ min: string, max: string }} filter
   * @return {Promise<[{
   *   _id: string,
   *   p_items: [any[]],
   * }]>}
   */
  const getProductPurchases = async (user, filter, services = []) => {
    try {
      const $match_purchase = {
        $match: {
          organization: user.organization,
          status: { $ne: 'pending' },
          purchase_order_date: {
            $gte: filter.min,
            $lte: filter.max,
          }
        }
      }

      const $lookup = {
        $lookup: {
          from: 'purchaseitems',
          let: { p_id: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$purchase_id', '$$p_id'] },
                  ],
                },
              },
            },
            {
              $group: {
                _id: '$product_id',
                product_name: { $first: '$product_name' },
                barcode: { $addToSet: '$barcode' },
                ordered: { $sum: '$ordered' },
                received: { $sum: '$received' },
                cancelled: { $sum: '$cancelled' },
                to_receive: { $sum: '$to_receive' },
                quality: { $sum: '$quality' },
                amount: { $sum: '$amount' }
              },
            },
          ],
          as: 'p_items',
        }
      }

      const group = {
        $group: {
          _id: '$type',
          p_items: { $push: '$p_items' }
        }
      }
      return await instance.inventoryPurchase.aggregate([
        $match_purchase, $lookup, group,
      ])
        .allowDiskUse(true)
        .exec()

      const purchases = await instance.inventoryPurchase
        .find(
          {
            organization: user.organization,
            status: { $ne: 'pending' },
            purchase_order_date: {
              $gte: filter.min,
              $lte: filter.max,
            }
          },
          { _id: 1 }
        ).lean()

      const $match = {
        $match: {
          is_cancelled: false,
          purchase_id: { $in: purchases.map(p => p._id) }
        }
      }
      if (services.length)
        $match.$match.service = { $in: services }

      const $group = {
        $group: {
          _id: '$product_id',
          product_name: { $first: '$product_name' },
          barcode: { $addToSet: '$barcode' },
          ordered: { $sum: '$ordered' },
          received: { $sum: '$received' },
          cancelled: { $sum: '$cancelled' },
          to_receive: { $sum: '$to_receive' },
          quality: { $sum: '$quality' },
          amount: { $sum: '$amount' }
        }
      }

      const pipelines = [$match, $group]

      return await instance.purchaseItem.aggregate(pipelines).exec()
    } catch (error) {
      console.log(error);
      instance.send_Error('getProductPurchases xlsx', JSON.stringify(error))

      return []
    }
  }

  /**
 * @param {[string]} services 
 * @param {{ min: string, max: string }} filter
 * @return {Promise<[{
 *  id: string,
 *  _id: string,
 *  name : string,
 *  cost_of_goods: number,
 *  sale_count: number,
 *  amount: number,
 *  cost_of_goods: number,
 * }]>}
   //  *  gross_sales: number,
   //  *  refunds: number,
   //  *  discounts: number,
   //  *  sale_count: number,
   //  *  items_sold: number,
   //  *  items_refunded: number,
   //  *  net_sales: number,
   //  *  gross_profit: number
 */
  const getProductsSaleInfo = async (user, filter, services = []) => {
    try {
      const filterReceipts = {
        organization: user.organization,
        receipt_state: { $ne: 'draft' },
        debt_id: null,
        date: {
          $gte: filter.min,
          $lte: filter.max,
        },
      };

      const unwindSoldItemList = { $unwind: "$sold_item_list" };

      const calculateItemsReport = {
        $group: {
          _id: "$sold_item_list.product_id",
          product_name: { $last: "$sold_item_list.product_name" },
          sale_count: {
            $sum: {
              $multiply: [
                { $max: ["$sold_item_list.value", 0] },
                { $cond: ["$is_refund", -1, 1] },
              ]
            }
          },
          amount: {
            $sum: {
              $multiply: [
                { $max: ["$sold_item_list.price", 0] },
                { $max: ["$sold_item_list.value", 0] },
                { $cond: ["$is_refund", -1, 1] }
              ],
            },
          },
          cost_of_goods: {
            $sum: {
              $multiply: [
                { $max: ["$sold_item_list.cost", 0] },
                { $max: ["$sold_item_list.value", 0] },
                { $cond: ["$is_refund", -1, 1] }
              ],
            },
          },
          // gross_sales: {
          //   $sum: {
          //     $multiply: [
          //       { $max: ["$sold_item_list.price", 0] },
          //       { $max: ["$sold_item_list.value", 0] },
          //       { $cond: ["$is_refund", 0, 1] },
          //     ]
          //   }
          // },
          // refunds: {
          //   $sum: {
          //     $multiply: [
          //       { $max: ["$sold_item_list.price", 0] },
          //       { $max: ["$sold_item_list.value", 0] },
          //       { $cond: ["$is_refund", 1, 0] },
          //     ],
          //   },
          // },
          // discounts: {
          //   $sum: {
          //     $multiply: [
          //       { $max: ["$sold_item_list.total_discount", 0] },
          //       { $cond: ["$is_refund", -1, 1] },
          //     ],
          //   },
          // },
          // items_sold: {
          //   $sum: {
          //     $cond: [
          //       "$is_refund",
          //       0,
          //       {
          //         $cond: [
          //           { $eq: ['$sold_item_list.sold_item_type', 'box_item'] },
          //           {
          //             $divide: [
          //               { $max: ["$sold_item_list.value", 0] },
          //               { $max: ["$sold_item_list.count_by_type", 1] }
          //             ]
          //           },
          //           { $max: ["$sold_item_list.value", 0] },
          //         ],
          //       },
          //     ],
          //   },
          // },
          // items_refunded: {
          //   $sum: {
          //     $cond: [
          //       "$is_refund",
          //       {
          //         $cond: [
          //           { $eq: ['$sold_item_list.sold_item_type', 'box_item'] },
          //           {
          //             $divide: [
          //               { $max: ["$sold_item_list.value", 0] },
          //               { $max: ["$sold_item_list.count_by_type", 1] }
          //             ],
          //           },
          //           { $max: ["$sold_item_list.value", 0] },
          //         ],
          //       },
          //       0,
          //     ],
          //   },
          // },
        },
      };

      const sortResult = { $sort: { gross_sales: -1 } };

      const projectResult = {
        $project: {
          id: "$_id",
          name: "$product_name",
          amount: 1,
          cost_of_goods: 1,
          gross_sales: 1,
          refunds: 1,
          discounts: 1,
          items_sold: 1,
          items_refunded: 1,
          sale_count: 1,
          net_sales: {
            $subtract: [
              "$gross_sales",
              { $add: ["$refunds", "$discounts"] },
            ],
          },
          gross_profit: {
            $subtract: [
              {
                $subtract: [
                  "$gross_sales",
                  { $add: ["$refunds", "$discounts"] },
                ],
              },
              "$cost_of_goods",
            ],
          },
        },
      };
      const projectCategoryFilter = {
        $project: {
          sold_item_list: 1,
          is_refund: 1,
        }
      }

      return await instance.Receipts.aggregate([
        { $match: filterReceipts },
        projectCategoryFilter,
        unwindSoldItemList,
        calculateItemsReport,
        sortResult,
        projectResult
      ])
        .allowDiskUse(true)
        .exec();
    }
    catch (error) {
      console.log(error);
      instance.send_Error('getProductPurchases xlsx', JSON.stringify(error))
      return []
    }
  }

  const inventoryOtchotXLSX = async (request, reply, user) => {
    try {
      const exelItems = []
      totalAmount = 0

      exelItems.push([
        1,
        '24352345;056746745',
        `Organization name`,
        '',
        '',
        'Start time count',
        'Start time sum',
        'Prixod count',
        'Prixod sum',
        'Rasxod count',
        'Rasxod sum',
        'End time count',
        'End Time sum',
      ])

      const purchases = await getProductPurchases(user, { max: 1630551900343, min: 1629551900343 })
      // return reply.code(404).send({ purchases })
      const saleInfo = await getProductsSaleInfo(user, { max: 1630551900343, min: 1629551900343 })
      // return reply.code(404).send({ saleInfo })
      console.log(purchases.length, saleInfo.length);
      const p_items = []
      const p_refund_items = []

      for (const p of purchases) {
        if (p._id === 'coming')
          for (const p_item of p.p_items) {
            p_items.push(...p_item)
          }
        else if (p._id === 'refund')
          for (const p_item of p.p_items) {
            p_refund_items.push(...p_item)
          }
      }

      const set = new Set()
      const result = {}

      for (const p_item of p_items) {
        set.add(p_item._id)
        if (result[p_item._id]) {
          result[p_item._id].purchase_count += p_item.received
          result[p_item._id].purchase_amount += p_item.amount
        } else {
          result[p_item._id] = {
            name: p_item.product_name,
            sale_count: 0,
            cost_of_goods: 0,
            sale_amount: 0,
            purchase_count: p_item.received,
            purchase_amount: p_item.amount,
          }
        }
      }
      for (const p_item of p_refund_items) {
        set.add(p_item._id)
        if (result[p_item._id]) {
          result[p_item._id].purchase_count -= p_item.received
          result[p_item._id].purchase_amount -= p_item.amount
        } else {
          result[p_item._id] = {
            name: p_item.product_name,
            sale_count: 0,
            cost_of_goods: 0,
            sale_amount: 0,
            purchase_count: -p_item.received,
            purchase_amount: -p_item.amount,
          }
        }
      }

      for (const s of saleInfo) {
        if (s._id.length === 24) {
          set.add(s._id)
          if (result[s._id]) {
            result[s._id].sale_count += s.sale_count
            result[s._id].cost_of_goods == s.cost_of_goods
            result[s._id].sale_amount += s.amount
          } else {
            result[s._id] = {
              name: s.name,
              sale_count: s.sale_count,
              cost_of_goods: s.cost_of_goods,
              sale_amount: s.amount,
              purchase_count: 0,
              purchase_amount: 0,
            }
          }
        }
      }

      return reply.code(404).send({ result })
      const goodsObj = {}
      for (const purchase of purchases) {
        goodsObj[purchase.product_id] = purchase
      }

      const time = new Date().getTime()

      const headers = [
        { name: '№', key: '1' },
        { name: 'A', key: '2' },
        { name: `A`, key: '3' },
        { name: 'A', key: '4' },
        { name: `Итого по ${'organization_name'}`, key: '5' },
        { name: 'Start time count', key: '6' },
        { name: 'Start time sum', key: '7' },
        { name: 'Prixod count', key: '8' },
        { name: 'Prixod sum', key: '9' },
        { name: 'Rasxod count', key: '10' },
        { name: 'Rasxod sum', key: '11' },
        { name: 'End time count', key: '12' },
        { name: 'End Time sum', key: '13' },
      ]
      const workbook = new ExcelJs.Workbook();
      const worksheet = workbook.addWorksheet('MyExcel', {
        pageSetup: { paperSize: 9, orientation: 'landscape' }
      });
      makeInventoryOtchotHeader(
        worksheet,
        {
          end_time: 'end Time',
          start_time: 'Start time'
        },
      )

      try {
        worksheet.addTable({
          name: 'ItemsTable',
          ref: 'B7',
          headerRow: true,
          // totalsRow: true,
          columns: headers,
          rows: exelItems
        })
      } catch (error) { }

      const file_dir = path.join(__dirname, `../../static/${time}.xlsx`)

      await workbook.xlsx.writeFile(file_dir);
      console.log(file_dir);
      reply.sendFile(`./${time}.xlsx`)
      setTimeout(() => {
        fs.unlink(`./static/${time}.xlsx`, (err) => {
          if (err) {
            instance.send_Error('exported ' + time + ' file', JSON.stringify(err))
          }
        })
      }, 2000);

    } catch (error) {
      return reply.send(error.message)
    }
  }

  instance.get('/inventory/otchot/excel', (request, reply) => {
    // user
    request.headers['accept-user'] = 'admin'
    request.headers['authorization'] = 'FsYMuTi4PWc9irRLrfYHLt'
    instance.authorization(request, reply, (user) => {
      inventoryOtchotXLSX(request, reply, user)
      return reply;
    });
  })

  next()
})
