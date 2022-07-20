module.exports = (instance, _, next) => {

  version = { version: '1.0.0' }

  function addObjects(arr) {
    let c = {}
    Object.keys(arr[0]).forEach(k => {
      c[k] = 0
      for (let i = 0; i < arr.length; i++) {
        if (arr[i][k] && typeof arr[i][k] === typeof 5.5) {
          c[k] += arr[i][k]
        }
        else if (arr[i][k] && typeof arr[i][k] === typeof 'invan') {
          c[k] = arr[i][k]
        }
      }
    })
    return c
  }

  // reports sales by item above

  var by_item_above = (request, reply, items) => {
    var ctn = 7;
    if (request.body.count != undefined) {
      ctn = Math.round(request.body.count)
    }
    var sold_times = {}
    var sold_values = {}
    var gsoitem = {}
    var giftoitem = {}
    var countsitem = {}
    var countritem = {}
    var rfoitem = {}
    var cogitem = {}
    var disoitem = {}
    var names = []
    var default_id = 'default_id'
    if (request.body.product_id) {
      default_id = request.body.product_id
    }
    // help to draw
    var start = parseInt(request.params.min)
    var end = parseInt(request.params.max)
    if (end - start == 86400000 || end - start == 86400000 - 60000) {
      ctn = 24
    }

    var right = start
    var diff = parseInt((end - start) / ctn)
    var middle = right + diff
    // var inc = start+0.0
    // diff *= 2
    var left = start + diff
    var pro_names = []
    var pro_name_map = {}
    var pro_ids = []
    var percent_of_gift = {}

    var default_times = []
    var default_values = []
    for (var time = start; time < end; time += diff) {
      default_times.push(time)
      default_values.push(0)
    }

    for (var item of items) {

      // calculate persentage of gift
      var g = 0.0
      for (var p of item.payment) {
        if (p.name == 'gift') {
          g += p.value
        }
      }
      if (item.total_price != 0) {
        percent_of_gift[item._id] = g / item.total_price
      }
      else {
        percent_of_gift[item._id] = 0
      }

      for (var s of item.sold_item_list) {
        pro_name_map[s.product_id] = s.product_name
        // calculating gitf on goods
        if (default_id == 'default_id' || s.product_id == default_id) {
          // if (giftoitem[s.product_name] == undefined) {
          //   giftoitem[s.product_name] = 0
          // }
          if (giftoitem[s.product_id] == undefined) {
            giftoitem[s.product_id] = 0
          }
          // giftoitem[s.product_name] += percent_of_gift[item._id] * (s.value * s.price)
          giftoitem[s.product_id] += percent_of_gift[item._id] * (s.value * s.price)

          // pro_names.push(s.product_name)
          pro_ids.push(s.product_id)
          // if (sold_values[s.product_name] == undefined) {
          //   sold_values[s.product_name] = default_values.concat([])
          // }
          if (sold_values[s.product_id] == undefined) {
            sold_values[s.product_id] = default_values.concat([])
          }

          // if (sold_times[s.product_name] == undefined) {
          //   sold_times[s.product_name] = default_times.concat([])
          // }
          if (sold_times[s.product_id] == undefined) {
            sold_times[s.product_id] = default_times.concat([])
          }
        }
      }
    }
    // pro_names = [...new Set(pro_names)]
    pro_ids = [...new Set(pro_ids)]
    for (var item of items) {
      // sold times and values
      for (var s of item.sold_item_list) {
        if (default_id == 'default_id' || s.product_id == default_id) {
          var disc = 0.0;
          for (var dic of item.discount) {
            if (dic.type == 'percentage') {
              disc += s.price * s.value * dic.value / 100.0
            }
          }
          if (item.is_refund == false) {
            // sold_values[s.product_name][Math.floor((item.date - start) / diff)] += (s.price * s.value - disc) * (1 - percent_of_gift[item._id])
            sold_values[s.product_id][Math.floor((item.date - start) / diff)] += (s.price * s.value - disc) * (1 - percent_of_gift[item._id])
          }
          else {
            // sold_values[s.product_name][Math.floor((item.date - start) / diff)] -= (s.price * s.value - disc) * (1 - percent_of_gift[item._id])
            sold_values[s.product_id][Math.floor((item.date - start) / diff)] -= (s.price * s.value - disc) * (1 - percent_of_gift[item._id])
          }
        }
      }

      /*
      for (var s of item.sold_item_list) {
        if (default_id == 'default_id' || s.product_id == default_id) {
          names.push(s.product_name)
          // calculate cost of goods
          if (cogitem[s.product_name] == undefined) {
            cogitem[s.product_name] = 0
          }
          if (item.is_refund == false) {
            cogitem[s.product_name] += s.value * s.cost
          }
          else {
            cogitem[s.product_name] -= s.value * s.cost
          }
          // calculate gross sales and refunds of good
          // also calculate sold and refund items
          if (gsoitem[s.product_name] == undefined) {
            gsoitem[s.product_name] = 0
          }
          if (countsitem[s.product_name] == undefined) {
            countsitem[s.product_name] = 0
          }
          if (rfoitem[s.product_name] == undefined) {
            rfoitem[s.product_name] = 0
          }
          if (countritem[s.product_name] == undefined) {
            countritem[s.product_name] = 0
          }
          if (item.is_refund == false) {
            gsoitem[s.product_name] += s.value * s.price
            countsitem[s.product_name] += s.value
          }
          else {
            rfoitem[s.product_name] += s.value * s.price
            countritem[s.product_name] += s.value
          }
          // calculate discount
          if (disoitem[s.product_name] == undefined) {
            disoitem[s.product_name] = 0
          }
          for (var d of item.discount) {
            if (d.type == 'percentage') {
              if (item.is_refund == false) {
                disoitem[s.product_name] += s.value * s.price * d.value / 100.0
              }
              else {
                disoitem[s.product_name] -= s.value * s.price * d.value / 100.0
              }
            }
          }
        }
      }
      names = [...new Set(names)]*/

      for (var s of item.sold_item_list) {
        if (default_id == 'default_id' || s.product_id == default_id) {
          pro_ids.push(s.product_id)
          // calculate cost of goods
          if (cogitem[s.product_id] == undefined) {
            cogitem[s.product_id] = 0
          }
          if (item.is_refund == false) {
            cogitem[s.product_id] += s.value * s.cost
          }
          else {
            cogitem[s.product_id] -= s.value * s.cost
          }
          // calculate gross sales and refunds of good
          // also calculate sold and refund items
          if (gsoitem[s.product_id] == undefined) {
            gsoitem[s.product_id] = 0
          }
          if (countsitem[s.product_id] == undefined) {
            countsitem[s.product_id] = 0
          }
          if (rfoitem[s.product_id] == undefined) {
            rfoitem[s.product_id] = 0
          }
          if (countritem[s.product_id] == undefined) {
            countritem[s.product_id] = 0
          }
          if (item.is_refund == false) {
            gsoitem[s.product_id] += s.value * s.price
            countsitem[s.product_id] += s.value
          }
          else {
            rfoitem[s.product_id] += s.value * s.price
            countritem[s.product_id] += s.value
          }
          // calculate discount
          if (disoitem[s.product_id] == undefined) {
            disoitem[s.product_id] = 0
          }
          for (var d of item.discount) {
            if (d.type == 'percentage') {
              if (item.is_refund == false) {
                disoitem[s.product_id] += s.value * s.price * d.value / 100.0
              }
              else {
                disoitem[s.product_id] -= s.value * s.price * d.value / 100.0
              }
            }
          }
        }
      }
      pro_ids = [...new Set(pro_ids)]

    }
    var data = []
    for (var pro_id of pro_ids) {
      var sold_value = []
      for (let i = 0; i < sold_values[pro_id].length; i++) {
        sold_value.push([sold_times[pro_id][i], sold_values[pro_id][i]])
      }
      data.push({
        name: pro_name_map[pro_id],
        total_sold: gsoitem[pro_id],
        items_sold: countsitem[pro_id],
        total_cost: cogitem[pro_id],
        discount: disoitem[pro_id],
        net_sales: gsoitem[pro_id] - rfoitem[pro_id] - disoitem[pro_id] - giftoitem[pro_id],
        sold_values: sold_value
      })
    }
    data.sort((a, b) => (a.net_sales > b.net_sales) ? -1 : ((b.net_sales > a.net_sales) ? 1 : 0));
    var Answer = []
    for (let t = 0; t < 5; t++) {
      if (data.length > t) {
        Answer.push(data[t])
      }
    }
    reply.ok(Answer)
  }

  instance.post('/report/sales/by_item/above/:min/:max', version, (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      instance.get_receipt_by_range(request, reply, admin, by_item_above)
    })
  })

  // report excel items
  const exportExcel = async (answer, reply) => {
    for (const ind in answer) {
      answer[ind] = {
        name: answer[ind].name,
        items_sold: answer[ind].items_sold
      }
    }
    return reply.ok(answer)
    // const json2xls = require('json2xls');
    // const xls = json2xls(answer);
    // const fs = require('fs');
    // const timeStamp = new Date().getTime();
    // fs.writeFileSync(`./static/${timeStamp}.xls`, xls, 'binary');
    // return reply.sendFile(`./${timeStamp}.xls`)
  }

  // reports sales by item below

  const itemsBelowParams = {
    version: '1.0.0',
    schema: {
      params: {
        type: 'object',
        required: [
          'min', 'max', 'limit', 'page'
        ],
        properties: {
          min: { type: 'number', minimum: 1 },
          max: { type: 'number', minimum: 1 },
          limit: { type: 'number', minimum: 1 },
          page: { type: 'number', minimum: 1 },
        }
      },
      body: {
        type: 'object',
        required: [
          'custom', 'employees',
          'end', 'services', 'start'
        ],
        properties: {
          custom: { type: 'boolean' },
          start: { type: 'number' },
          end: { type: 'number' },
          employees: {
            type: 'array',
            items: {
              type: 'string',
              minLength: 24,
              maxLength: 24
            }
          },
          services: {
            type: 'array',
            items: {
              type: 'string',
              minLength: 24,
              maxLength: 24
            }
          },
          search: {
            type: 'string',
            default: ''
          }
        }
      }
    }
  }

  const by_item_below = async (request, reply, admin) => {
    try {
      const { min, max, limit, page } = request.params;
      const { category, supplier, custom, start, end, services, employees, search } = request.body;

      const user_available_services = request.user.services.map(serv => serv.service.toString())

      const filterReceipts = {
        organization: admin.organization,
        receipt_state: { $ne: 'draft' },
        service: { $in: user_available_services },
        debt_id: null,
        date: {
          // $gte: min - (process.env.TIME_DIFF | 0),
          // $lte: max - (process.env.TIME_DIFF | 0)
          $gte: min,
          $lte: max
        },
      };

      if (services && services.length > 0) {
        for (const service of services) {
          if (!user_available_services.includes(service)) {
            return reply.error('Acces denied')
          }
        }

        filterReceipts.service = { $in: services };
      }

      if (custom) {
        const additional_query = []
        for (let i = min; i < max; i += 86400000) {
          additional_query.push({
            date: {
              // $lte: i + end * 3600000 - (process.env.TIME_DIFF | 0),
              // $gte: i + start * 3600000 - (process.env.TIME_DIFF | 0)
              $lte: i + end * 3600000,
              $gte: i + start * 3600000,
            }
          })
        }
        delete filterReceipts.date
        filterReceipts['$or'] = additional_query
      }

      if (employees && employees.length > 0) {
        const employeesFilter = [
          {
            $and: [
              { waiter_id: "" },
              { cashier_id: { $in: employees } }
            ]
          },
          {
            $and: [
              { cashier_id: "" },
              { waiter_id: { $in: employees } },
            ],
          },
          {
            $and: [
              { waiter_id: { $ne: "" } },
              { cashier_id: { $ne: "" } },
              { waiter_id: { $in: employees } },
            ],
          },
        ];
        if (filterReceipts['$or']) {
          filterReceipts['$and'] = [
            { $or: employeesFilter },
            { $or: filterReceipts['$or'] }
          ]
          delete filterReceipts['$or']
        }
        else {
          filterReceipts['$or'] = employeesFilter
        }
      }

      const unwindSoldItemList = { $unwind: "$sold_item_list" };

      const calculateItemsReport = {
        $group: {
          _id: "$sold_item_list.product_id",
          sku: { $last: "$sold_item_list.sku" },
          product_name: { $last: "$sold_item_list.product_name" },
          cost_of_goods: {
            $sum: {
              $multiply: [
                { $max: ["$sold_item_list.cost", 0] },
                { $max: ["$sold_item_list.value", 0] },
                { $cond: ["$is_refund", -1, 1] }
              ],
            },
          },
          gross_sales: {
            $sum: {
              $multiply: [
                { $max: ["$sold_item_list.price", 0] },
                { $max: ["$sold_item_list.value", 0] },
                { $cond: ["$is_refund", 0, 1] },
              ]
            }
          },
          refunds: {
            $sum: {
              $multiply: [
                { $max: ["$sold_item_list.price", 0] },
                { $max: ["$sold_item_list.value", 0] },
                { $cond: ["$is_refund", 1, 0] },
              ],
            },
          },
          discounts: {
            $sum: {
              $multiply: [
                { $max: ["$sold_item_list.total_discount", 0] },
                { $cond: ["$is_refund", -1, 1] },
              ],
            },
          },
          items_sold: {
            $sum: {
              $cond: [
                "$is_refund",
                0,
                {
                  $cond: [
                    { $eq: ['$sold_item_list.sold_item_type', 'box_item'] },
                    {
                      $divide: [
                        { $max: ["$sold_item_list.value", 0] },
                        { $max: ["$sold_item_list.count_by_type", 1] }
                      ]
                    },
                    { $max: ["$sold_item_list.value", 0] },
                  ],
                },
              ],
            },
          },
          items_refunded: {
            $sum: {
              $cond: [
                "$is_refund",
                {
                  $cond: [
                    { $eq: ['$sold_item_list.sold_item_type', 'box_item'] },
                    {
                      $divide: [
                        { $max: ["$sold_item_list.value", 0] },
                        { $max: ["$sold_item_list.count_by_type", 1] }
                      ],
                    },
                    { $max: ["$sold_item_list.value", 0] },
                  ],
                },
                0,
              ],
            },
          },
          taxes: { $sum: 0 },
        },
      };
      if (supplier) {
        filterReceipts["sold_item_list.supplier_id"] = supplier
        calculateItemsReport.$group.supplier = { $last: "$sold_item_list.supplier_name" }
      }
      // if (category) {
      //   filterReceipts["sold_item_list.category_id"] = category
      //   calculateItemsReport.$group.category = { $last: "$sold_item_list.category_name" }
      // }

      const searchByItemName = {
        $match: {
          product_name: {
            $regex: (search ? search : ''),
            $options: 'i'
          }
        }
      }

      const sortResult = { $sort: { gross_sales: -1 } };

      const skipResult = { $skip: limit * (page - 1) };

      const limitResult = { $limit: limit };

      const projectResult = {
        $project: {
          id: "$_id",
          sku: 1,
          name: "$product_name",
          cost_of_goods: 1,
          gross_sales: 1,
          refunds: 1,
          discounts: 1,
          items_sold: 1,
          items_refunded: 1,
          taxes: 1,
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
          barcode: "$barcode",
        },
      };
      const projectCategoryFilter = {
        $project: {
          sold_item_list: 1,
          is_refund: 1,
        }
      }
      if (category)
        projectCategoryFilter.$project.sold_item_list = {
          $filter: {
            input: "$sold_item_list",
            as: "item",
            cond: { $eq: ["$$item.category_id", category] }
          },
        }

      const result = await instance.Receipts.aggregate([
        { $match: filterReceipts },
        projectCategoryFilter,
        unwindSoldItemList,
        calculateItemsReport,
        searchByItemName,
        sortResult,
        skipResult,
        limitResult,
        projectResult
      ])
        .allowDiskUse(true)
        .exec();

      const groupSoldItems = {
        $group: {
          _id: "$sold_item_list.product_id",
          product_name: { $last: "$sold_item_list.product_name" },
        },
      }

      const countAllItems = {
        $group: {
          _id: null,
          count: { $sum: 1 },
        },
      };

      const totalCount = await instance.Receipts.aggregate([
        { $match: filterReceipts },
        projectCategoryFilter,
        unwindSoldItemList,
        groupSoldItems,
        searchByItemName,
        countAllItems
      ])
        .allowDiskUse(true)
        .exec();

      const total_result = totalCount && totalCount.length > 0 && totalCount[0].count ? totalCount[0].count : 0;

      const categoryMap = {}
      const items = await instance.goodsSales
        .find(
          { _id: { $in: result.map(i => i.id) } },
          {
            category: 1,
            category_id: 1,
            barcode: 1,
          },
        )
        .lean()
      const itemsObj = {}
      for (const item of items) {
        itemsObj[item._id] = item
      }
      console.log(result.map(i => i.id));
      for (const index in result) {
        try {
          // const item = await instance.goodsSales.findById(result[index].id).lean();
          const cat_id = itemsObj[result[index].id].category
            ? itemsObj[result[index].id].category
            : itemsObj[result[index].id].category_id;
          if (itemsObj[result[index].id] && cat_id) {
            if (!categoryMap[cat_id]) {
              try {
                const category = await instance.goodsCategory
                  .findById(itemsObj[result[index].id].category, { name: 1 })
                  .lean();
                if (category) {
                  categoryMap[cat_id] = category.name
                }
              } catch (error) { }
            }
            result[index].category = categoryMap[cat_id] ? categoryMap[cat_id] : ''
            result[index].barcode = itemsObj[result[index].id].barcode ? itemsObj[result[index].id].barcode : []
          }
        } catch (error) { }
      }

      reply.ok({
        total: total_result,
        page: Math.ceil(total_result / limit),
        data: result,
      })
    }
    catch (error) {
      reply.error(error.message)
    }
    return reply;
  }
  const by_category_by_item_below = async (request, reply, admin) => {
    try {
      const { category, supplier, min, max, limit, page } = request.params;
      const { custom, start, end, services, employees, search } = request.body;
      const filterReceipts = {
        organization: admin.organization,
        receipt_state: { $ne: 'draft' },
        debt_id: null,
        date: {
          // $gte: min - (process.env.TIME_DIFF | 0),
          // $lte: max - (process.env.TIME_DIFF | 0)
          $gte: min,
          $lte: max,
        }
      }

      if (services && services.length > 0)
        filterReceipts.service = { $in: services }

      if (custom) {
        const additional_query = []
        for (let i = min; i < max; i += 86400000) {
          additional_query.push({
            date: {
              // $lte: i + end * 3600000 - (process.env.TIME_DIFF | 0),
              // $gte: i + start * 3600000 - (process.env.TIME_DIFF | 0)
              $lte: i + end * 3600000,
              $gte: i + start * 3600000,

            }
          })
        }
        delete filterReceipts.date
        filterReceipts['$or'] = additional_query
      }

      if (employees && employees.length > 0) {
        const employeesFilter = [
          {
            $and: [
              { waiter_id: "" },
              { cashier_id: { $in: employees } },
            ]
          },
          {
            $and: [
              { cashier_id: "" },
              { waiter_id: { $in: employees } },
            ]
          },
          {
            $and: [
              { waiter_id: { $ne: "" } },
              { cashier_id: { $ne: "" } },
              { waiter_id: { $in: employees } },
            ]
          }
        ]
        if (filterReceipts['$or']) {
          filterReceipts['$and'] = [
            { $or: employeesFilter },
            { $or: filterReceipts['$or'] }
          ]
          delete filterReceipts['$or']
        }
        else {
          filterReceipts['$or'] = employeesFilter
        }
      }

      const unwindSoldItemList = { $unwind: "$sold_item_list" };

      const calculateItemsReport = {
        $group: {
          _id: "$sold_item_list.product_id",
          product_name: { $last: "$sold_item_list.product_name" },
          sku: 1,
          cost_of_goods: {
            $sum: {
              $multiply: [
                { $max: ["$sold_item_list.cost", 0] },
                { $max: ["$sold_item_list.value", 0] },
                { $cond: ["$is_refund", -1, 1] },
              ],
            },
          },
          gross_sales: {
            $sum: {
              $multiply: [
                { $max: ["$sold_item_list.price", 0] },
                { $max: ["$sold_item_list.value", 0] },
                { $cond: ["$is_refund", 0, 1] },
              ],
            }
          },
          refunds: {
            $sum: {
              $multiply: [
                { $max: ["$sold_item_list.price", 0] },
                { $max: ["$sold_item_list.value", 0] },
                { $cond: ["$is_refund", 1, 0] },
              ]
            }
          },
          discounts: {
            $sum: {
              $multiply: [
                {
                  $max: [
                    "$sold_item_list.total_discount",
                    0
                  ]
                },
                {
                  $cond: [
                    "$is_refund",
                    -1, 1
                  ]
                }
              ]
            }
          },
          items_sold: {
            $sum: {
              $cond: [
                "$is_refund",
                0,
                {
                  $cond: [
                    { $eq: ['$sold_item_list.sold_item_type', 'box_item'] },
                    {
                      $divide: [
                        { $max: ["$sold_item_list.value", 0] },
                        { $max: ["$sold_item_list.count_by_type", 1] }
                      ]
                    },
                    { $max: ["$sold_item_list.value", 0] }
                  ]
                }
              ]
            }
          },
          items_refunded: {
            $sum: {
              $cond: [
                "$is_refund",
                {
                  $cond: [
                    { $eq: ['$sold_item_list.sold_item_type', 'box_item'] },
                    {
                      $divide: [
                        { $max: ["$sold_item_list.value", 0] },
                        { $max: ["$sold_item_list.count_by_type", 1] }
                      ]
                    },
                    { $max: ["$sold_item_list.value", 0] }
                  ]
                },
                0
              ]
            }
          },
          taxes: { $sum: 0 }
        }
      }
      if (supplier) {
        filterReceipts["sold_item_list.supplier_id"] = supplier
        calculateItemsReport.$group.supplier = { $last: "$sold_item_list.supplier_name" }
      }
      else {
        filterReceipts["sold_item_list.category_id"] = category
        calculateItemsReport.$group.category = { $last: "$sold_item_list.category_name" }
      }

      const searchByItemName = {
        $match: {
          product_name: {
            $regex: (search ? search : ''),
            $options: 'i'
          }
        }
      }

      const sortResult = { $sort: { gross_sales: -1 } };

      const skipResult = { $skip: limit * (page - 1) };

      const limitResult = { $limit: limit };

      const projectResult = {
        $project: {
          id: "$_id",
          name: "$product_name",
          category: 1,
          sku: 1,
          supplier: 1,
          cost_of_goods: 1,
          gross_sales: 1,
          refunds: 1,
          discounts: 1,
          items_sold: 1,
          items_refunded: 1,
          taxes: 1,
          net_sales: {
            $subtract: [
              "$gross_sales",
              { $add: ["$refunds", "$discounts"] }
            ]
          },
          gross_profit: {
            $subtract: [
              {
                $subtract: [
                  "$gross_sales",
                  { $add: ["$refunds", "$discounts"] }
                ]
              },
              "$cost_of_goods"
            ]
          }
        }
      }

      const result = await instance.Receipts.aggregate([
        { $match: filterReceipts },
        unwindSoldItemList,
        calculateItemsReport,
        searchByItemName,
        sortResult,
        skipResult,
        limitResult,
        projectResult
      ])
        .allowDiskUse(true)
        .exec();

      const groupSoldItems = {
        $group: {
          _id: "$sold_item_list.product_id",
          product_name: { $last: "$sold_item_list.product_name" },
        },
      }

      const countAllItems = {
        $group: {
          _id: null,
          count: { $sum: 1 }
        },
      }

      const totalCount = await instance.Receipts.aggregate([
        { $match: filterReceipts },
        unwindSoldItemList,
        groupSoldItems,
        searchByItemName,
        countAllItems
      ])
        .allowDiskUse(true)
        .exec();

      const total_result = totalCount && totalCount.length > 0 && totalCount[0].count
        ? totalCount[0].count
        : 0;

      // const categoryMap = {}

      // for (const index in result) {
      //   try {
      //     const item = await instance.goodsSales.findById(result[index].id);
      //     if (item && item.category) {
      //       if (!categoryMap[item.category]) {
      //         result[index].category = categoryMap[item.category]
      //         try {
      //           const category = await instance.goodsCategory.findById(item.category)
      //           if (category) {
      //             categoryMap[item.category] = category.name
      //           }
      //         } catch (error) { }
      //       }
      //       console.log(categoryMap);
      //       result[index].category = categoryMap[item.category] ? categoryMap[item.category] : ''
      //     }
      //   } catch (error) { }
      // }

      reply.ok({
        total: total_result,
        page: Math.ceil(total_result / limit),
        data: result
      })
    }
    catch (error) {
      reply.error(error.message)
    }
    return reply;
  }
  instance.post('/report/sales/by_item/below/:min/:max/:limit/:page', itemsBelowParams, (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      if (!admin) {
        return reply.error('Access')
      }
      by_item_below(request, reply, admin);
    })
  })
  instance.post('/report/sales/by_category/by_item/below/:category/:min/:max/:limit/:page', itemsBelowParams, (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      if (!admin) {
        return reply.error('Access')
      }
      by_category_by_item_below(request, reply, admin);
    })
  })
  instance.post('/report/sales/by_supplier/by_item/below/:supplier/:min/:max/:limit/:page', itemsBelowParams, (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      if (!admin) {
        return reply.error('Access')
      }
      by_category_by_item_below(request, reply, admin);
    })
  })

  const by_item_below_excel = (request, reply, items) => {
    by_item_below(request, reply, items, false)
  }

  instance.post('/report/sales/by_item/below/:min/:max/:limit/:page/json', version, (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      if (admin) {
        instance.get_receipt_by_range(request, reply, admin, by_item_below_excel)
      }
    })
  })

  next()
}
