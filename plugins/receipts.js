const fp = require("fastify-plugin");

const receiptCreateGroup = async (request, reply, instance) => {
  const user = request.user;
  const body = request.body;

  const service_id = request.headers["accept-service"];
  const pos_id = request.headers["accept-id"];
  const by_user = request.headers["accept-user"];
  try {
    let pos;
    if (by_user == "admin") {
      pos = {
        name: "office",
        _id: user._id,
      };
    } else {
      pos = await instance.posDevices.findById(pos_id).lean();
      if (!pos) {
        return reply.unauth_user();
      }
    }

    instance.delete_ticket_and_item_data(request, body, [], user);

    var dates = [];
    var receipt_numbers = [];
    // for (var r of body) {
    //   dates.push(r.date);
    //   receipt_numbers.push(r.receipt_no);
    // }
    const receipts_find_query = [];
    for (const r of body) {
      receipts_find_query.push({
        date: r.date,
        receipt_no: r.receipt_no,
      });
    }
    let receiptss = [];
    if (receipts_find_query.length > 0) {
      receiptss = await instance.Receipts.find({
        organization: user.organization,
        service: service_id,
        $or: receipts_find_query,
        // $and: [
        //   { date: { $in: dates } },
        //   { receipt_no: { $in: receipt_numbers } },
        // ],
      }).lean();
    }

    if (!receiptss) {
      receiptss = [];
    }
    var allready_exist = [];
    var need_to_save = [];
    var date_and_numbers = [];
    var receiptObj = {};

    for (var re of receiptss) {
      date_and_numbers.push(
        JSON.stringify({ date: re.date, number: re.receipt_no }),
      );
      receiptObj[JSON.stringify({ date: re.date, number: re.receipt_no })] = re;
    }
    let current_currency = await instance.Currency.findOne({
      organization: user.organization,
    }).lean();
    if (!current_currency) {
      current_currency = {};
    }

    const sold_item_ids = new Set();
    const invalidObjectIds = [];
    const partiation_ids = new Set();
    for (const rr of request.body) {
      if (
        !date_and_numbers.includes(
          JSON.stringify({ date: rr.date, number: rr.receipt_no }),
        )
      ) {
        rr.sold_item_list = Array.isArray(rr.sold_item_list)
          ? rr.sold_item_list
          : [];
        rr.sold_item_list.forEach((item) => {
          if (!item.product_id && item.product_id.length != 24)
            invalidObjectIds.push({
              product_id: item.product_id,
              receipt_no: rr.receipt_no,
              product_name: item.product_name,
              value: item.value,
            });
          sold_item_ids.add(item.product_id);
          if (item.partiation_id) {
            partiation_ids.add(item.partiation_id);
          }
        });
      }
    }
    if (invalidObjectIds.length)
      instance.send_Error(
        `receiptCreateGroup, invalidObjectIds:`,
        JSON.stringify(invalidObjectIds),
      );

    const items = await instance.goodsSales
      .find(
        { _id: { $in: [...sold_item_ids] } },
        {
          sku: 1,
          barcode: 1,
          services: 1,
          category: 1,
          queue: 1,
          primary_supplier_id: 1,
          count_by_type: 1,
        },
      )
      .lean();

    const itemsObj = {};
    const primary_supplier_ids = new Set();
    const category_ids = new Set();

    for (const item of items) {
      itemsObj[item._id] = item;
      if (item.primary_supplier_id)
        primary_supplier_ids.add(item.primary_supplier_id);
      if (item.category) category_ids.add(item.category);
    }

    const categories = await instance.goodsCategory
      .find({ _id: { $in: [...category_ids] } }, { name: 1 })
      .lean();
    const categoriesObj = {};
    for (const cat of categories) {
      categoriesObj[cat._id] = cat;
    }

    const suppliers = await instance.adjustmentSupplier
      .find({ _id: { $in: [...primary_supplier_ids] } })
      .lean();
    const suppliersObj = {};
    for (const supp of suppliers) {
      suppliersObj[supp._id] = supp;
    }

    const other_category = await instance.goodsCategory
      .findOne({ organization: user.organization, is_other: true })
      .lean();

    const queues = await instance.goodsSaleQueue
      .find({
        $or: [
          {
            _id: {
              $in: [...partiation_ids].map((id) => instance.ObjectId(id)),
            },
          },
          {
            good_id: {
              $in: [...sold_item_ids].map((id) => instance.ObjectId(id)),
            },
            service_id: instance.ObjectId(service_id),
            quantity_left: { $gt: 0 },
          },
        ],
      })
      .sort({ queue: 1 })
      .lean();

    for (const rr of request.body) {
      console.log("Order id");
      console.log(rr.order_id);
      rr.old_id = rr._id;
      delete rr._id;
      if (
        date_and_numbers.includes(
          JSON.stringify({ date: rr.date, number: rr.receipt_no }),
        )
      ) {
        allready_exist.push(
          receiptObj[JSON.stringify({ date: rr.date, number: rr.receipt_no })],
        );
      } else {
        rr.organization = user.organization;
        rr.service = service_id;
        rr.pos_name = pos.name;
        rr.pos_id = pos._id;
        rr.created_time = new Date().getTime();
        rr.currency_value = current_currency.value;

        let receipt_type = "sale";
        for (const py of rr.payment) {
          if (py.name == "debt" && py.value != 0) {
            receipt_type = "debt";
          }
        }
        rr.receipt_type = receipt_type;

        const $receiptModel = new instance.Receipts(rr);
        let total_discount = 0;
        for (let i = 0; i < $receiptModel.sold_item_list.length; i++) {
          if ($receiptModel.sold_item_list[i].partiation_id) {
            $receiptModel.sold_item_list[i].partiation_id = instance.ObjectId(
              $receiptModel.sold_item_list[i].partiation_id,
            );
          }

          const reminder = Math.max(
            $receiptModel.sold_item_list[i].reminder,
            0,
          );
          const count_by_type = Math.max(
            $receiptModel.sold_item_list[i].count_by_type,
            1,
          );

          if (reminder > 0) {
            $receiptModel.sold_item_list[i].sold_item_type = "pcs_item";
          }

          // calculate discount
          let total_item_discount = 0;
          let total_modifiers = 0;

          for (const m of $receiptModel.sold_item_list[i].modifiers) {
            for (const mo of m.modifier_options) {
              total_modifiers += mo.price;
            }
          }
          let items_total =
            (total_modifiers + $receiptModel.sold_item_list[i].price) *
            ($receiptModel.sold_item_list[i].value + reminder / count_by_type);

          for (const d_index in $receiptModel.sold_item_list[i].discount) {
            const d = $receiptModel.sold_item_list[i].discount[d_index];
            if (items_total > 0) {
              if (d.type == "percentage") {
                total_item_discount += (items_total * d.value) / 100;
                $receiptModel.sold_item_list[i].discount[d_index].total_value =
                  (items_total * d.value) / 100;
                items_total -= (items_total * d.value) / 100;
              } else {
                total_item_discount +=
                  d.value *
                  ($receiptModel.sold_item_list[i].value +
                    reminder / count_by_type);
                $receiptModel.sold_item_list[i].discount[d_index].total_value =
                  d.value *
                  ($receiptModel.sold_item_list[i].value +
                    reminder / count_by_type);
                items_total -=
                  d.value *
                  ($receiptModel.sold_item_list[i].value +
                    reminder / count_by_type);
              }
            }
          }

          if (receipt_type == "debt") {
            $receiptModel.sold_item_list[i].total_debt = items_total;
            $receiptModel.sold_item_list[i].total_paid_debt = 0;
          }

          if (
            total_item_discount >
            (total_modifiers + $receiptModel.sold_item_list[i].price) *
              ($receiptModel.sold_item_list[i].value + reminder / count_by_type)
          ) {
            total_item_discount =
              (total_modifiers + $receiptModel.sold_item_list[i].price) *
              ($receiptModel.sold_item_list[i].value +
                reminder / count_by_type);
          }

          $receiptModel.sold_item_list[i].total_discount = total_item_discount;
          total_discount += total_item_discount;

          $receiptModel.sold_item_list[i].receipt_id = $receiptModel._id;

          try {
            const item = itemsObj[$receiptModel.sold_item_list[i].product_id];
            // const item = await instance.goodsSales
            //   .findById(
            //     $receiptModel.sold_item_list[i].product_id,
            //     {
            //       sku: 1,
            //       barcode: 1,
            //       services: 1,
            //       category: 1,
            //       queue: 1,
            //       primary_supplier_id: 1,
            //       count_by_type: 1,
            //     },
            //   )
            //   .lean();
            $receiptModel.sold_item_list[i].price_position = 0;

            if (item) {
              $receiptModel.sold_item_list[i].sku = item.sku;
              $receiptModel.sold_item_list[i].barcode =
                item.barcode && item.barcode.length > 0
                  ? item.barcode[0]
                  : $receiptModel.sold_item_list[i].barcode
                  ? $receiptModel.sold_item_list[i].barcode
                  : "";

              const serv = item.services.find(
                (serv) => serv.service + "" == service_id,
              );

              if (serv && serv.cost) {
                $receiptModel.sold_item_list[i].cost = serv.cost;
                $receiptModel.sold_item_list[i].total_cost =
                  $receiptModel.sold_item_list[i].value * serv.cost;
              }

              // const prices = serv && serv.prices ? serv.prices.filter(a => a.from !== 0) : []
              let prices =
                serv && Array.isArray(serv.prices)
                  ? serv.prices.filter((a) => a.from !== 0 && a.price !== 0)
                  : [];
              prices = prices.sort((a, b) => a.from - b.from);

              for (let z = 0; z < prices.length; z++) {
                if ($receiptModel.sold_item_list[i].value >= prices[z].from) {
                  $receiptModel.sold_item_list[i].price_position = z;
                }
              }

              // set category id and supplier id

              try {
                // const category = await instance.goodsCategory
                //   .findById(item.category)
                //   .lean();
                if (categoriesObj[item.category]) {
                  $receiptModel.sold_item_list[i].category_id =
                    categoriesObj[item.category]._id;
                  $receiptModel.sold_item_list[i].category_name =
                    categoriesObj[item.category].name;
                } else {
                  try {
                    if (other_category) {
                      $receiptModel.sold_item_list[i].category_id =
                        other_category._id;
                      $receiptModel.sold_item_list[i].category_name =
                        other_category.name;
                    }
                  } catch (error) {}
                }
              } catch (error) {}

              try {
                if (item.primary_supplier_id) {
                  $receiptModel.sold_item_list[i].supplier_id =
                    suppliersObj[item.primary_supplier_id]._id;
                  $receiptModel.sold_item_list[i].supplier_name =
                    suppliersObj[item.primary_supplier_id].supplier_name;
                }

                // const queue_query = {}
                // if (item.queue) queue_query.queue = item.queue
                // else queue_query = { queue: -1 }
                //xatolik bor
                // const partiation_query = $receiptModel.sold_item_list[i].partiation_id
                //   ? ({ _id: $receiptModel.sold_item_list[i].partiation_id })
                //   : ({
                //     good_id: instance.ObjectId(item._id),
                //     service_id: instance.ObjectId(service_id),
                //     // queue: item.queue,
                //     quantity_left: { $ne: 0 },
                //   })
                // const queueById = $receiptModel.sold_item_list[i].partiation_id
                //   ? queues.find(q => q._id == $receiptModel.sold_item_list[i].partiation_id)
                //   : undefined
                // const queue = $receiptModel.sold_item_list[i].partiation_id && queueById && queueById.quantity_left > 0
                //   ? queueById
                //   : queues.find(q => q.good_id == item._id && q.quantity_left > 0)
                // const queue = await instance.goodsSaleQueue
                //   .findOne(partiation_query)
                //   .sort({ queue: 1 })
                //   .lean()
                // bu keyinchalik olib tashlanadi

                let totalCost = 0;
                if ($receiptModel.sold_item_list[i].partiation_id) {
                  const queue = queues.find(
                    (q) =>
                      q._id == $receiptModel.sold_item_list[i].partiation_id,
                  );
                  if (queue) {
                    totalCost =
                      $receiptModel.sold_item_list[i].value * queue.cost;
                    $receiptModel.sold_item_list[i].queue_id = queue._id;
                    $receiptModel.sold_item_list[i].partiation_id = queue._id;
                    $receiptModel.sold_item_list[i].p_order = queue.p_order;
                    $receiptModel.sold_item_list[i].queue = queue.queue;
                    // partiali tovar bo'yicha supplierni olish
                    $receiptModel.sold_item_list[i].supplier_id =
                      queue.supplier_id;
                    $receiptModel.sold_item_list[i].supplier_name =
                      queue.supplier_name;

                    queue.quantity_left -=
                      $receiptModel.sold_item_list[i].value;

                    $receiptModel.sold_item_list[i].partitions = [
                      {
                        partition_id: queue._id,
                        count: $receiptModel.sold_item_list[i].value,
                        cost: queue.cost,
                        p_order: queue.p_order,
                        queue: queue.queue,
                        supplier_id: queue.supplier_id,
                        supplier_name: queue.supplier_name,
                      },
                    ];
                  }
                } else {
                  const filteredQueues = queues.filter(
                    (q) =>
                      q.good_id + "" ==
                        $receiptModel.sold_item_list[i].product_id + "" + "" &&
                      q.quantity_left > 0,
                  );

                  if (filteredQueues.length > 0) {
                    $receiptModel.sold_item_list[i].queue_id =
                      filteredQueues[0]._id;
                    $receiptModel.sold_item_list[i].partiation_id =
                      filteredQueues[0]._id;
                    $receiptModel.sold_item_list[i].p_order =
                      filteredQueues[0].p_order;
                    $receiptModel.sold_item_list[i].queue =
                      filteredQueues[0].queue;

                    $receiptModel.sold_item_list[i].supplier_id =
                      filteredQueues[0].supplier_id;
                    $receiptModel.sold_item_list[i].supplier_name =
                      filteredQueues[0].supplier_name;

                    $receiptModel.sold_item_list[i].partitions = [];

                    let diff = 0;
                    for (const queue of filteredQueues) {
                      if (
                        $receiptModel.sold_item_list[i].value - diff <=
                        queue.quantity_left
                      ) {
                        $receiptModel.sold_item_list[i].partitions.push({
                          partition_id: queue._id,
                          count: $receiptModel.sold_item_list[i].value - diff,
                          cost: queue.cost,
                          p_order: queue.p_order,
                          queue: queue.queue,
                          supplier_id: queue.supplier_id,
                          supplier_name: queue.supplier_name,
                        });
                        totalCost +=
                          ($receiptModel.sold_item_list[i].value - diff) *
                          queue.cost;
                        diff += $receiptModel.sold_item_list[i].value - diff;
                        queue.quantity_left -=
                          $receiptModel.sold_item_list[i].value - diff;
                        break;
                      } else {
                        $receiptModel.sold_item_list[i].partitions.push({
                          partition_id: queue._id,
                          count: queue.quantity_left,
                          cost: queue.cost,
                          p_order: queue.p_order,
                          queue: queue.queue,
                          supplier_id: queue.supplier_id,
                          supplier_name: queue.supplier_name,
                        });
                        diff += queue.quantity_left;
                        totalCost += queue.quantity_left * queue.cost;
                        queue.quantity_left = 0;
                      }
                    }

                    if (diff < $receiptModel.sold_item_list[i].value) {
                      const mod = $receiptModel.sold_item_list[i].value - diff;
                      diff += mod;
                      totalCost +=
                        mod * filteredQueues[filteredQueues.length - 1].cost;
                      $receiptModel.sold_item_list[i].partitions.push({
                        partition_id:
                          filteredQueues[filteredQueues.length - 1]._id,
                        count: mod,
                        cost: filteredQueues[filteredQueues.length - 1].cost,
                        p_order:
                          filteredQueues[filteredQueues.length - 1].p_order,
                        queue: filteredQueues[filteredQueues.length - 1].queue,
                        supplier_id:
                          filteredQueues[filteredQueues.length - 1].supplier_id,
                        supplier_name:
                          filteredQueues[filteredQueues.length - 1]
                            .supplier_name,
                      });
                    }
                  }
                }
                if (totalCost > 0) {
                  $receiptModel.sold_item_list[i].cost =
                    totalCost / $receiptModel.sold_item_list[i].value;
                  $receiptModel.sold_item_list[i].total_cost = totalCost;
                }
              } catch (error) {
                instance.send_Error(
                  "Sold item partion not found",
                  JSON.stringify(error),
                );
              }

              $receiptModel.sold_item_list[i].count_by_type =
                item.count_by_type;
            } else {
              try {
                // const other_category = await instance.goodsCategory
                //   .findOne({
                //     organization: user.organization,
                //     is_other: true,
                //   })
                //   .lean();
                if (other_category) {
                  $receiptModel.sold_item_list[i].category_id =
                    other_category._id;
                  $receiptModel.sold_item_list[i].category_name =
                    other_category.name;
                }
              } catch (error) {}
            }
          } catch (error) {}
        }
        $receiptModel.total_discount = total_discount;

        need_to_save.push($receiptModel);
      }
    }

    // let result = instance.Receipts.insertMany(need_to_save);
    let result = [];

    const users_donate = [];
    const clientsObj = {};
    const anonymous = "anonymous";
    const clients = await instance.clientsDatabase
      .find(
        {
          phone_number: {
            $in: need_to_save
              .filter((r) => r.cashback_phone != "")
              .map((r) => r.cashback_phone),
          },
          organization: user.organization,
        },
        {
          _id: 1,
          first_name: 1,
          last_name: 1,
          point_balance: 1,
          phone_number: 1,
          organization: 1,
          user_id: 1,
        },
      )
      .lean();

    for (const client of clients) {
      clientsObj[client.phone_number] = client;
    }

    for (const r of need_to_save) {
      const isDebtSaleLogic = r.organization === "64d2419da645877ca6a57dcf";
      try {
        if (clientsObj[r.cashback_phone] && isDebtSaleLogic) {
          r.client_id = clientsObj[r.cashback_phone]._id;
          r.user_id = clientsObj[r.cashback_phone].user_id;
        }
        const check = await new instance.Receipts(r).save();

        // donate for Turkey
        if (check.is_donate) {
          const client = clientsObj[r.cashback_phone];
          const total_donate = check.sold_item_list.reduce((sum, sold_item) => {
            return sum + (sold_item.price - sold_item.cost) * sold_item.value;
          }, 0);

          const data = {
            organization: check.organization,
            service_id: check.service,
            client_phone_number: anonymous,
            client_name: anonymous,
            client_id: anonymous,
            receipt_id: check._id,
            receipt_no: check.receipt_no,
            total_price: check.total_price,
            total_donate: total_donate,
            create_time: check.date,
          };

          if (client && client.phone_number) {
            data.client_phone_number = client.phone_number;
            data.client_name = `${client.first_name} ${
              client.last_name ? client.last_name : ""
            }`;

            data.client_id = client._id;
          }

          users_donate.push(data);
        }

        // save agent transaction
        console.log("save agent transaction");
        console.log(r.order_id);
        if (r.order_id) {
          await instance.save_agent_transaction(instance, check);
        }
        // cashbackni hisoblash
        if (r.cashback_phone && !check.is_donate && !isDebtSaleLogic) {
          console.log("save cashback");

          cash_back = await instance.CashBackClientUpdate(
            { ...{ ...check }._doc },
            { phone_number: r.cashback_phone },
            user,
          );
          cash_back = !isNaN(cash_back) ? cash_back : 0;
          await instance.Receipts.findByIdAndUpdate(r._id, {
            $set: { cash_back: cash_back },
          });
        }
        result.push(check);
      } catch (error) {
        instance.send_Error(
          `Save check \nservice_id: ${service_id}\n`,
          JSON.stringify(error),
        );
      }
    }

    // insert donates for Turkey
    try {
      await instance.UsersDonate.insertMany(users_donate);
    } catch (error) {
      instance.send_Error(
        `Error while insertMany donates, service_id: ${service_id}, pos_id: ${pos_id}`,
        error,
      );
    }

    for (const r of result) {
      if ((!r.refund_not_stock && r.is_refund) || !r.is_refund) {
        await instance.forReceiptToWorkCreate(request, user, r, r.is_refund);
      }
    }
    for (const rr of result) {
      console.log(rr.is_refund, "rr.is_refund");
      if (rr.is_refund) {
        await instance.update_receipt_sold_item(rr.refund, rr.sold_item_list);
        try {
          // oxirgi queue ga stockni qoshib qoyish krk
          await instance.update_queue_sold_item_refund(
            rr._id,
            rr.sold_item_list,
            service_id,
          );
        } catch (error) {
          instance.send_Error(
            `update_queue_sold_item_refund
            \nservice_id: ${service_id}`,
            error,
          );
        }
      } else {
        try {
          //goods_partiation_sale update stock queue
          instance.goods_partiation_sale(
            rr.sold_item_list,
            service_id,
            body.with_partiation ? true : false,
          );
        } catch (error) {
          instance.send_Error(
            `goods_partiation_sale
            \nservice_id: ${service_id}`,
            error,
          );
        }
      }
    }

    //! create didox document
    instance.createDidoxOnSale(
      result.filter((r) => r.create_didox_document == true && !r.is_refund),
      itemsObj,
      user.organization,
    );

    instance.customer_points(result);
    result = result.concat(allready_exist);
    reply.ok(result);
    instance.push_changes(request, 102, service_id);
  } catch (error) {
    reply.error(error.message);
    instance.send_Error(
      `receiptCreateGroup, service_id: ${service_id}, pos_id: ${pos_id}`,
      error,
    );
  }
  return reply;
};

// Shift ni update qilish
// async function updateShift(receipts, Taxes) {
//   let gross_sales = 0.0
//   let refunds = 0.0
//   let refunds_cash = 0.0
//   let discounts = 0.0
//   let net_sales = 0.0
//   let cash = 0.0
//   let taxes = 0.0

//   for (const receipt of receipts) {
//     for (const sold_item of receipt.sold_item_list) {
//       if (Array.isArray(sold_item.taxes)) {
//         for (const tax of sold_item.taxes) {
//           if (Taxes[tax] != null || Taxes[tax] != undefined) {
//             if (Taxes[tax].type == 'include') {
//               taxes += (sold_item.value * sold_item.price) / (1 + Taxes[tax].tax / 100.0) * Taxes[tax].tax / 100.0
//             }
//             else {
//               taxes += (sold_item.value * sold_item.price) * (Taxes[tax].tax / 100.0)
//             }
//           }
//         }
//       }
//     }

//     if (receipt.is_refund == false || receipt.is_refund == undefined) {
//       gross_sales += receipt.total_price;
//       if (receipt.discount)
//         for (const __dis of receipt.discount) {
//           if (__dis.type == 'percentage') {
//             discounts += __dis.value * receipt.total_price / 100;
//           }
//           else {
//             discounts += __dis.value;
//           }
//         }
//     } else {
//       refunds += receipt.total_price;
//       if (receipt.discount)
//         for (const __dis of receipt.discount) {
//           if (__dis.type == 'percentage') {
//             discounts -= __dis.value * receipt.total_price / 100;
//           }
//           else {
//             discounts -= __dis.value;
//           }
//         }
//     }
//     for (const pay of receipt.payment) {
//       if (pay.name == 'cash' && receipt.is_refund == false) {
//         cash += pay.value
//       } else if (pay.name == 'cash') {
//         refunds_cash += pay.value
//       }
//     }
//     if (receipt.is_refund) {
//       refunds += receipt.total_price
//     }
//   }

//   if (taxes > 0) {
//     const n = Math.round(Math.log10(taxes))
//     taxes = parseFloat(taxes.toPrecision(n + 2))
//   }

//   net_sales = gross_sales - (refunds + discounts)

//   instance.Shifts.findOne({ organization: user.organization, service: user.service, closing_time: 0 }, (err, shift) => {
//     if (shift) {
//       shift.cash_drawer.cash_payment += cash
//       shift.cash_drawer.cash_refund += refunds_cash
//       shift.cash_drawer.exp_cash_amount = shift.cash_drawer.starting_cash + shift.cash_drawer.cash_payment - shift.cash_drawer.cash_refund + shift.cash_drawer.paid_in - shift.cash_drawer.paid_out
//       shift.cash_drawer.act_cash_amount = shift.cash_drawer.exp_cash_amount
//       shift.sales_summary.gross_sales += gross_sales
//       shift.sales_summary.refunds += refunds
//       shift.sales_summary.discounts += discounts
//       shift.sales_summary.net_sales += net_sales
//       shift.sales_summary.cash += cash
//       shift.sales_summary.taxes += taxes
//       instance.Shifts.updateOne({ _id: shift._id }, { $set: shift }, (err, doc) => {
//         if (err) {
//           instance.send_Error('update shift', JSON.stringify(err))
//         }
//       })
//     }
//   })
// }

const receiptsSaveAsDraft = async (request, reply, instance) => {
  try {
    const user = request.user;
    const service = request.headers["accept-service"];
    const body = request.body;
    const pos_id = request.headers["accept-id"];
    const pos = await instance.posDevices.findById(pos_id);
    if (!pos) {
      return reply.unauth_user();
    }

    let current_currency = await instance.Currency.findOne({
      organization: user.organization,
    });
    if (!current_currency) {
      current_currency = {};
    }

    const receipts = [];
    for (const r of body) {
      r.old_id = r._id;
      delete r._id;
      r.organization = user.organization;
      r.service = service;
      r.receipt_state = "receipt";
      r.receipt_type = "sale";
      r.is_refund = false;

      const exist = await instance.Receipts.findOne({
        organization: r.organization,
        service: service,
        $and: [
          { date: { $eq: r.date } },
          { receipt_no: { $eq: r.receipt_no } },
        ],
      });
      if (exist) {
        receipts.push(exist);
      } else {
        r.organization = user.organization;
        r.service = service;
        r.pos_name = pos.name;
        r.pos_id = pos._id;
        r.created_time = new Date().getTime();
        r.currency_value = current_currency.value;

        let receipt_type = "sale";
        for (const py of r.payment) {
          if (py.name == "debt" && py.value != 0) {
            receipt_type = "debt";
          }
        }
        r.receipt_type = receipt_type;

        var $receiptModel = new instance.Receipts(r);
        let total_discount = 0;
        for (let i = 0; i < $receiptModel.sold_item_list.length; i++) {
          const reminder = Math.max(
            $receiptModel.sold_item_list[i].reminder,
            0,
          );
          const count_by_type = Math.max(
            $receiptModel.sold_item_list[i].count_by_type,
            1,
          );

          if (reminder > 0) {
            $receiptModel.sold_item_list[i].sold_item_type = "pcs_item";
          }

          // calculate discount
          let total_item_discount = 0;
          let total_modifiers = 0;

          for (const m of $receiptModel.sold_item_list[i].modifiers) {
            for (const mo of m.modifier_options) {
              total_modifiers += mo.price;
            }
          }
          let items_total =
            (total_modifiers + $receiptModel.sold_item_list[i].price) *
            ($receiptModel.sold_item_list[i].value + reminder / count_by_type);

          for (const d_index in $receiptModel.sold_item_list[i].discount) {
            const d = $receiptModel.sold_item_list[i].discount[d_index];
            if (items_total > 0) {
              if (d.type == "percentage") {
                total_item_discount += (items_total * d.value) / 100;
                $receiptModel.sold_item_list[i].discount[d_index].total_value =
                  (items_total * d.value) / 100;
                items_total -= (items_total * d.value) / 100;
              } else {
                total_item_discount +=
                  d.value *
                  ($receiptModel.sold_item_list[i].value +
                    reminder / count_by_type);
                $receiptModel.sold_item_list[i].discount[d_index].total_value =
                  d.value *
                  ($receiptModel.sold_item_list[i].value +
                    reminder / count_by_type);
                items_total -=
                  d.value *
                  ($receiptModel.sold_item_list[i].value +
                    reminder / count_by_type);
              }
            }
          }

          if (receipt_type == "debt") {
            $receiptModel.sold_item_list[i].total_debt = items_total;
            $receiptModel.sold_item_list[i].total_paid_debt = 0;
          }

          if (
            total_item_discount >
            (total_modifiers + $receiptModel.sold_item_list[i].price) *
              ($receiptModel.sold_item_list[i].value + reminder / count_by_type)
          ) {
            total_item_discount =
              (total_modifiers + $receiptModel.sold_item_list[i].price) *
              ($receiptModel.sold_item_list[i].value +
                reminder / count_by_type);
          }

          $receiptModel.sold_item_list[i].total_discount = total_item_discount;
          total_discount += total_item_discount;

          $receiptModel.sold_item_list[i].receipt_id = $receiptModel._id;
          try {
            const item = await instance.goodsSales.findById(
              $receiptModel.sold_item_list[i].product_id,
            );
            if (item) {
              $receiptModel.sold_item_list[i].barcode =
                item.barcode && item.barcode.length > 0 ? item.barcode[0] : "";

              // set category id and supplier id

              try {
                const category = await instance.goodsCategory.findById(
                  item.category,
                );
                if (category) {
                  $receiptModel.sold_item_list[i].category_id = category._id;
                  $receiptModel.sold_item_list[i].category_name = category.name;
                } else {
                  try {
                    const other_category = await instance.goodsCategory.findOne(
                      { organization: user.organization, is_other: true },
                    );
                    if (other_category) {
                      $receiptModel.sold_item_list[i].category_id =
                        other_category._id;
                      $receiptModel.sold_item_list[i].category_name =
                        other_category.name;
                    }
                  } catch (error) {}
                }
              } catch (error) {}

              try {
                const supplier = await instance.adjustmentSupplier.findById(
                  item.primary_supplier_id,
                );
                if (supplier) {
                  $receiptModel.sold_item_list[i].supplier_id = supplier._id;
                  $receiptModel.sold_item_list[i].supplier_name =
                    supplier.supplier_name;
                }
              } catch (error) {}

              $receiptModel.sold_item_list[i].count_by_type =
                item.count_by_type;
            } else {
              try {
                const other_category = await instance.goodsCategory.findOne({
                  organization: user.organization,
                  is_other: true,
                });
                if (other_category) {
                  $receiptModel.sold_item_list[i].category_id =
                    other_category._id;
                  $receiptModel.sold_item_list[i].category_name =
                    other_category.name;
                }
              } catch (error) {}
            }
          } catch (error) {}
        }
        $receiptModel.total_discount = total_discount;

        const existReceipt = await instance.Receipts.findOne({
          organization: r.organization,
          service: service,
          $and: [
            { date: { $eq: r.date } },
            { receipt_no: { $eq: r.receipt_no } },
          ],
        });
        if (existReceipt) {
          receipts.push(existReceipt);
        } else {
          $receiptModel.receipt_state = "draft";
          const result = await $receiptModel.save();
          receipts.push(result);
        }
      }
    }
    reply.ok(receipts);
  } catch (error) {
    reply.error(error.message);
  }
  return reply;
};

const useReceiptDraft = async (request, reply, instance) => {
  try {
    const { id } = request.params;
    const user = request.user;
    const service = request.headers["accept-service"];
    const receipt = await instance.Receipts.findOne({
      organization: user.organization,
      service: service,
      _id: id,
    });
    if (!receipt) {
      return reply.fourorfour("Receipt");
    }
    if (receipt.receipt_state != "draft") {
      return reply.send({
        statusCode: 402,
        message: "Receipt Draft already used",
      });
    }

    let receipt_type = "sale";
    for (const py of receipt.payment) {
      if (py.name == "debt" && py.value != 0) {
        receipt_type = "debt";
      }
    }
    receipt.receipt_type = receipt_type;

    let total_discount = 0;
    for (let i = 0; i < receipt.sold_item_list.length; i++) {
      const reminder = Math.max(receipt.sold_item_list[i].reminder, 0);
      const count_by_type = Math.max(
        receipt.sold_item_list[i].count_by_type,
        1,
      );

      if (reminder > 0) {
        receipt.sold_item_list[i].sold_item_type = "pcs_item";
      }

      // calculate discount
      let total_item_discount = 0;
      let total_modifiers = 0;

      for (const m of receipt.sold_item_list[i].modifiers) {
        for (const mo of m.modifier_options) {
          total_modifiers += mo.price;
        }
      }
      let items_total =
        (total_modifiers + receipt.sold_item_list[i].price) *
        (receipt.sold_item_list[i].value + reminder / count_by_type);

      for (const d_index in receipt.sold_item_list[i].discount) {
        const d = receipt.sold_item_list[i].discount[d_index];
        if (items_total > 0) {
          if (d.type == "percentage") {
            total_item_discount += (items_total * d.value) / 100;
            receipt.sold_item_list[i].discount[d_index].total_value =
              (items_total * d.value) / 100;
            items_total -= (items_total * d.value) / 100;
          } else {
            total_item_discount +=
              d.value *
              (receipt.sold_item_list[i].value + reminder / count_by_type);
            receipt.sold_item_list[i].discount[d_index].total_value =
              d.value *
              (receipt.sold_item_list[i].value + reminder / count_by_type);
            items_total -=
              d.value *
              (receipt.sold_item_list[i].value + reminder / count_by_type);
          }
        }
      }

      if (receipt_type == "debt") {
        receipt.sold_item_list[i].total_debt = items_total;
        receipt.sold_item_list[i].total_paid_debt = 0;
      }

      if (
        total_item_discount >
        (total_modifiers + receipt.sold_item_list[i].price) *
          (receipt.sold_item_list[i].value + reminder / count_by_type)
      ) {
        total_item_discount =
          (total_modifiers + receipt.sold_item_list[i].price) *
          (receipt.sold_item_list[i].value + reminder / count_by_type);
      }

      receipt.sold_item_list[i].total_discount = total_item_discount;
      total_discount += total_item_discount;

      try {
        const item = await instance.goodsSales.findById(
          receipt.sold_item_list[i].product_id,
        );
        if (item) {
          receipt.sold_item_list[i].barcode =
            item.barcode && item.barcode.length > 0 ? item.barcode[0] : "";

          // set category id and supplier id

          try {
            const category = await instance.goodsCategory.findById(
              item.category,
            );
            if (category) {
              receipt.sold_item_list[i].category_id = category._id;
              receipt.sold_item_list[i].category_name = category.name;
            } else {
              try {
                const other_category = await instance.goodsCategory.findOne({
                  organization: user.organization,
                  is_other: true,
                });
                if (other_category) {
                  receipt.sold_item_list[i].category_id = other_category._id;
                  receipt.sold_item_list[i].category_name = other_category.name;
                }
              } catch (error) {}
            }
          } catch (error) {}

          try {
            const supplier = await instance.adjustmentSupplier.findById(
              item.primary_supplier_id,
            );
            if (supplier) {
              receipt.sold_item_list[i].supplier_id = supplier._id;
              receipt.sold_item_list[i].supplier_name = supplier.supplier_name;
            }
          } catch (error) {}

          receipt.sold_item_list[i].count_by_type = item.count_by_type;
        } else {
          try {
            const other_category = await instance.goodsCategory.findOne({
              organization: user.organization,
              is_other: true,
            });
            if (other_category) {
              receipt.sold_item_list[i].category_id = other_category._id;
              receipt.sold_item_list[i].category_name = other_category.name;
            }
          } catch (error) {}
        }
      } catch (error) {}
      delete receipt.sold_item_list[i]._id;
    }
    receipt.total_discount = total_discount;
    receipt.receipt_state = "receipt";

    delete receipt._id;
    await instance.Receipts.updateOne(
      { _id: id },
      {
        $set: receipt,
      },
    );
    await instance.forReceiptToWorkCreate(
      request,
      user,
      receipt,
      receipt.is_refund,
    );
    await instance.update_receipt_sold_item(
      receipt.refund,
      receipt.sold_item_list,
    );
    await instance.customer_points([receipt]);
    reply.ok();
  } catch (error) {
    console.log(error.message);
    reply.error(error.message);
  }
};

const receiptSetClient = async (request, reply, instance) => {
  try {
    const { receipt_id, user_id } = request.body;
    const receipt = await instance.Receipts.findOne({ _id: receipt_id }).lean();
    if (!receipt) {
      return reply.fourorfour("Receipt");
    }
    if (receipt.user_id && receipt.user_id != "0") {
      return reply.fourorfour("Receipt");
    }

    if (receipt.user_id || receipt.client_id) {
      return reply.code(400).send({
        code: 400,
        message: "Client already setted",
        error: "Client already setted",
      });
    }

    const client = await instance.clientsDatabase
      .findOne({ user_id }, { _id: 1, user_id: 1 })
      .lean();
    const updated = await instance.Receipts.findOneAndUpdate(
      { _id: receipt._id },
      {
        $set: {
          user_id: client.user_id,
          client_id: client._id,
        },
      },
      { new: true, lean: true },
    );
    await instance.customer_points([updated]);
    reply.ok(receipt._id);
  } catch (error) {
    reply.error(error.message);
  }
  return reply;
};

async function findReceipt(request, reply, instance) {
  const pos_id = request.headers["accept-id"];
  const user = request.user;
  try {
    const posDevice = await instance.posDevices
      .findOne({ _id: pos_id, organization: user.organization })
      .lean();
    if (!posDevice) return reply.fourorfour("Pos device");

    const { receipt_no } = request.query;
    const limit = !isNaN(parseInt(request.query.limit))
      ? parseInt(request.query.limit)
      : 100;
    const page = !isNaN(parseInt(request.query.page))
      ? parseInt(request.query.page)
      : 1;

    const date = new Date();
    const date_time = date.getTime();
    date.setDate(date.getDate() - 30);

    const min_date_time = date.getTime();
    const filter_query = {
      organization: posDevice.organization,
      service: posDevice.service,
      created_time: {
        $gte: min_date_time,
        $lte: date_time,
      },
    };
    if (receipt_no) filter_query.receipt_no = receipt_no;

    const receipts = await instance.Receipts.find(filter_query)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await instance.Receipts.countDocuments(filter_query);

    const clientsObjByPhone = {};
    const clientsObjById = {};
    const clients = await instance.clientsDatabase
      .find(
        {
          organization: user.organization,
          $or: [
            {
              phone_number: {
                $in: receipts
                  .filter((r) => r.cashback_phone != "")
                  .map((r) => r.cashback_phone),
              },
            },
            {
              _id: {
                $in: receipts
                  .filter((r) => !!r.client_id)
                  .map((r) => r.client_id),
              },
            },
          ],
        },
        {
          _id: 1,
          first_name: 1,
          last_name: 1,
          point_balance: 1,
          phone_number: 1,
          organization: 1,
          user_id: 1,
        },
      )
      .lean();

    for (const client of clients) {
      clientsObjByPhone[client.phone_number] = client;
      clientsObjById[client._id] = client;
    }

    const goodsSalesObj = {};
    const goodsSales = await instance.goodsSales
      .find(
        {
          _id: {
            $in: receipts.flatMap((g) =>
              g.sold_item_list.map((p) => p.product_id),
            ),
          },
        },
        {
          _id: 1,
          mxik: 1,
          package_code: 1,
          package_name: 1,
          sold_by: 1,
        },
      )
      .lean();

    for (const product of goodsSales) {
      goodsSalesObj[product._id] = product;
    }

    for (const receipt of receipts) {
      receipt.client = clientsObjById[receipt.client_id]
        ? clientsObjById[receipt.client_id]
        : clientsObjByPhone[receipt.cashback_phone]
        ? clientsObjByPhone[receipt.cashback_phone]
        : null;

      receipt.ofd = receipt.ofd ? receipt.ofd : null;
      receipt.comment = receipt.comment ? receipt.comment : "";

      for (let i = 0; i < receipt.sold_item_list.length; i++) {
        if (!receipt.sold_item_list[i].mxik) {
          receipt.sold_item_list[i].mxik = receipt.sold_item_list[i].mxik
            ? receipt.sold_item_list[i].mxik
            : goodsSalesObj[receipt.sold_item_list[i].product_id].mxik;

          receipt.sold_item_list[i].package_code = receipt.sold_item_list[i]
            .package_code
            ? receipt.sold_item_list[i].package_code
            : goodsSalesObj[receipt.sold_item_list[i].product_id].package_code;

          receipt.sold_item_list[i].package_name = receipt.sold_item_list[i]
            .package_name
            ? receipt.sold_item_list[i].package_name
            : goodsSalesObj[receipt.sold_item_list[i].product_id].package_name;
        }

        receipt.sold_item_list[i].sold_by = receipt.sold_item_list[i].sold_by
          ? receipt.sold_item_list[i].sold_by
          : goodsSalesObj[receipt.sold_item_list[i].product_id].sold_by;

        receipt.sold_item_list[i].ofd_vat_percentage = receipt.sold_item_list[i]
          .ofd_vat_percentage
          ? receipt.sold_item_list[i].ofd_vat_percentage
          : null;

        // if (goodsSalesObj[receipt.sold_item_list[i].product_id]) {
        //   receipt.sold_item_list[i] = {
        //     ...goodsSalesObj[receipt.sold_item_list[i].product_id],
        //     ...receipt.sold_item_list[i],
        //   };
        // }
      }
    }

    return reply.code(200).send({
      error: "Ok",
      message: "Success",
      statusCode: 200,
      limit: limit,
      current_page: page,
      page: Math.ceil(total / limit),
      total: total,
      data: receipts,
    });
  } catch (error) {
    instance.send_Error(
      `On receipt search, \nPosId: ${pos_id}, \User name: ${user.name}`,
      JSON.stringify(error),
    );
    return reply.error(error.message);
  }
}

module.exports = fp((instance, _, next) => {
  instance.addSchema({
    $id: "receiptBody",
    type: "object",
    additionalProperties: false,
    required: [
      "cashier_id",
      "date",
      "is_refund",
      "is_self",
      "receipt_no",
      "service_value",
      "total_price",
      "payment",
      "sold_item_list",
    ],
    properties: {
      _id: { type: "string" },
      service: { type: "string" },
      ticket_id: { type: "string" },
      cashier_id: { type: "string" },
      waiter_id: { type: "string" },
      cashier_name: { type: "string" },
      date: { type: "number" },
      user_id: { type: "string" },
      order_id: { type: "string" },
      point_balance: { type: "number" },
      is_refund: { type: "boolean" },
      is_self: { type: "boolean" },
      is_charged: { type: "boolean" },
      receipt_no: { type: "string" },
      refund: { type: ["string", "null"] },
      refund_number: { type: ["string", "null"] },
      service_value: { type: "number" },
      total_price: { type: "number" },
      difference: { type: "number" },
      currency: {
        type: "string",
        enum: ["uzs", "usd"],
        default: "uzs",
      },
      payment: {
        type: "array",
        items: {
          type: "object",
          required: ["name", "value"],
          properties: {
            name: {
              type: "string",
              enum: [
                "cash",
                "card",
                "gift",
                "debt",
                "qr_code",
                "nfc",
                "cashback",
                "online_payment",
                "transfer_pay",
              ],
            },
            value: { type: "number" },
          },
        },
      },
      refund_not_stock: { type: "boolean" },
      sold_item_list: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "product_id",
            "product_name",
            "created_time",
            "price",
            "cost",
            "value",
            "reset_count",
            "modifiers",
            "discount",
          ],
          properties: {
            ofd_vat_percentage: { type: "number", default: 0 },
            qty_box: { type: "number", default: 0 },
            partiation_id: { type: "string", maxLength: 24, minLength: 24 },
            product_id: { type: "string" },
            sold_item_id: { type: "string" },
            product_name: { type: "string" },
            parent_name: { type: "string" },
            created_time: { type: "number" },
            closing_time: { type: "number" },
            price: { type: "number" },
            price_currency: { type: "string" },
            price_type: {
              type: "string",
              enum: ["P", "P1", "P2", "P3"],
              default: "P",
            },
            cost: { type: "number" },
            currency: {
              type: "string",
              default: "uzs",
            },
            total: { type: "number" },
            value: { type: "number" },
            price_position: { type: "string" },
            reset_count: { type: "number" },
            reminder: {
              type: "number",
              default: 0,
            },
            count_by_type: {
              type: "number",
              default: 1,
            },
            sold_item_type: {
              type: "string",
              enum: ["item", "box_item", "pcs_item"],
              default: "item",
            },
            comment: { type: "string", default: "" },
            discount: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["name", "type", "value", "_id"],
                properties: {
                  name: { type: "string" },
                  value: { type: "number" },
                  total: { type: "number" },
                  _id: { type: "string" },
                  type: {
                    type: "string",
                    enum: ["percentage", "sum"],
                  },
                },
              },
            },
            modifiers: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["modifier_id", "modifier_name", "modifier_options"],
                properties: {
                  modifier_id: { type: "string" },
                  modifier_name: { type: "string" },
                  modifier_options: {
                    type: "array",
                    items: {
                      type: "object",
                      additionalProperties: false,
                      required: ["option_name", "price"],
                      properties: {
                        option_name: { type: "string" },
                        price: { type: "number" },
                      },
                    },
                  },
                },
              },
            },
            taxes: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["name", "type", "tax", "_id"],
                properties: {
                  name: { type: "string" },
                  type: {
                    type: "string",
                    enum: ["include", "exclude"],
                  },
                  tax: { type: "number" },
                  _id: { type: "string" },
                },
              },
            },
          },
        },
      },
      cashback_phone: { type: "string" },
      zdachi_to_cashback: { type: "number", default: 0 },
      comment: { type: "string" },
      is_donate: { type: "boolean", default: false },
      create_didox_document: { type: "boolean", default: false },
      ofd: {
        type: "object",
        additionalProperties: false,
        required: ["terminal_id", "fiscal_sign", "receipt_seq", "date_time"],
        properties: {
          terminal_id: { type: "string" },
          fiscal_sign: { type: "string" },
          receipt_seq: { type: "number" },
          date_time: { type: "number" },
        },
      },
    },
  });

  instance.post(
    "/receipts/create_group",
    {
      version: "1.1.0",
      schema: {
        body: {
          type: "array",
          items: "receiptBody#",
        },
      },
      attachValidation: true,
    },
    (request, reply) => {
      if (request.validationError) {
        return reply.validation(request.validationError.message);
      }
      instance.authorization(request, reply, (user) => {
        request.user = user;
        return receiptCreateGroup(request, reply, instance);
      });
    },
  );

  instance.post(
    "/receipts/save_as_draft",
    {
      version: "1.1.0",
      schema: {
        body: {
          type: "array",
          items: "receiptBody#",
        },
      },
      attachValidation: true,
    },
    (request, reply) => {
      if (request.validationError) {
        return reply.validation(request.validationError.message);
      }
      instance.authorization(request, reply, (user) => {
        request.user = user;
        return receiptsSaveAsDraft(request, reply, instance);
      });
    },
  );

  instance.post(
    "/receipts/use_draft/:id",
    {
      version: "1.1.0",
      schema: {
        body: "receiptBody#",
      },
    },
    (request, reply) => {
      instance.authorization(request, reply, (user) => {
        request.user = user;
        useReceiptDraft(request, reply, instance);
      });
    },
  );

  instance.post(
    "/admin-receipt/create",
    {
      version: "1.0.0",
      schema: {
        body: "receiptBody#",
      },
      attachValidation: true,
    },
    (request, reply) => {
      instance.authorization(request, reply, async (user) => {
        if (!user) {
          return reply.error("Access");
        }
        request.user = user;

        if (request.validationError) {
          return reply.validation(request.validationError.message);
        }
        request.headers["accept-service"] = request.body.service;
        request.body.created_from = "office";
        let receipt_no = request.body.receipt_no;
        receipt_no = await instance.getReceiptNumber(
          instance,
          user.organization,
          receipt_no,
        );
        request.body.receipt_no = receipt_no;

        const client = await instance.clientsDatabase
          .findOne(
            {
              $or: [
                { user_id: request.body.user_id },
                { client_id: instance.ObjectId(request.body.client_id) },
              ],
            },
            { _id: 1, first_name: 1, last_name: 1 },
          )
          .lean();

        const debt_pay = request.body.payment.find((p) => p.name == "debt");
        if (debt_pay && debt_pay.value > 0 && !client) {
          return reply.code(400).send({
            message: "Bad request",
            error: "client required",
            code: 400,
          });
        }

        request.body.client_id = client._id;

        request.body = [request.body];

        return receiptCreateGroup(request, reply, instance);
      });
    },
  );

  instance.post(
    "/admin-receipt/set-client",
    { version: "1.0.0" },
    (request, reply) => {
      instance.authorization(request, reply, async (user) => {
        if (!user) {
          return reply.error("Access");
        }
        request.user = user;
        receiptSetClient(request, reply, instance);
      });
    },
  );

  instance.get(
    "/desktop-receipt/find",
    {
      version: "1.0.0",
      schema: {
        headers: {
          type: "object",
          additionalProperties: false,
          required: [
            "Accept-version",
            "Accept-user",
            "Authorization",
            "Accept-id",
          ],
          properties: {
            "Accept-version": { type: "string" },
            "Accept-user": {
              type: "string",
              enum: ["bos", "admin", "employee"],
            },
            Authorization: { type: "string" },
            "Accept-id": { type: "string" },
          },
        },
        querystring: {
          type: "object",
          additionalProperties: false,
          properties: {
            receipt_no: { type: "string", default: "" },
            limit: { type: "number", minimum: 3, maximum: 50 },
            page: { type: "number", minimum: 1 },
          },
        },
      },
    },
    (request, reply) => {
      instance.authorization(request, reply, async (user) => {
        if (!user) {
          return reply.error("Access");
        }
        request.user = user;

        findReceipt(request, reply, instance);
      });
    },
  );

  next();
});

// const receiptCreateGroup = async (request, reply, instance) => {
//   const user = request.user;
//   const body = request.body;

//   const service_id = request.headers["accept-service"];
//   const pos_id = request.headers["accept-id"];
//   const by_user = request.headers['accept-user'];
//   try {
//     let pos;
//     if (by_user == 'admin') {
//       pos = {
//         name: 'office',
//         _id: user._id
//       }
//     }
//     else {
//       pos = await instance.posDevices.findById(pos_id);
//       if (!pos) {
//         return reply.unauth_user();
//       }
//     }

//     instance.delete_ticket_and_item_data(request, body, [], user);

//     var dates = [];
//     var receipt_numbers = [];
//     // for (var r of body) {
//     //   dates.push(r.date);
//     //   receipt_numbers.push(r.receipt_no);
//     // }
//     const receipts_find_query = []
//     for (const r of body) {
//       receipts_find_query.push({
//         date: r.date,
//         receipt_no: r.receipt_no
//       })
//     }
//     let receiptss = []
//     if (receipts_find_query.length > 0) {
//       receiptss = await instance.Receipts
//         .find({
//           organization: user.organization,
//           service: service_id,
//           $or: receipts_find_query
//           // $and: [
//           //   { date: { $in: dates } },
//           //   { receipt_no: { $in: receipt_numbers } },
//           // ],
//         })
//         .lean();
//     }

//     if (!receiptss) {
//       receiptss = [];
//     }
//     var allready_exist = [];
//     var need_to_save = [];
//     var date_and_numbers = [];
//     var receiptObj = {};

//     for (const re of receiptss) {
//       date_and_numbers.push(
//         JSON.stringify({ date: re.date, number: re.receipt_no })
//       );
//       receiptObj[JSON.stringify({ date: re.date, number: re.receipt_no })] = re;
//     }
//     let current_currency = await instance.Currency
//       .findOne({ organization: user.organization })
//       .lean();
//     if (!current_currency) {
//       current_currency = {};
//     }
//     for (const rr of request.body) {
//       console.log('Order id')
//       console.log(rr.order_id)
//       rr.old_id = rr._id;
//       delete rr._id;
//       if (
//         date_and_numbers.includes(
//           JSON.stringify({ date: rr.date, number: rr.receipt_no })
//         )
//       ) {
//         allready_exist.push(
//           receiptObj[JSON.stringify({ date: rr.date, number: rr.receipt_no })]
//         );
//       } else {
//         rr.organization = user.organization;
//         rr.service = service_id;
//         rr.pos_name = pos.name;
//         rr.pos_id = pos._id;
//         rr.created_time = new Date().getTime();
//         rr.currency_value = current_currency.value;

//         let receipt_type = "sale";
//         for (const py of rr.payment) {
//           if (py.name == "debt" && py.value != 0) {
//             receipt_type = "debt";
//           }
//         }
//         rr.receipt_type = receipt_type;

//         var $receiptModel = new instance.Receipts(rr);
//         let total_discount = 0;
//         for (let i = 0; i < $receiptModel.sold_item_list.length; i++) {
//           const reminder = Math.max(
//             $receiptModel.sold_item_list[i].reminder,
//             0
//           );
//           const count_by_type = Math.max(
//             $receiptModel.sold_item_list[i].count_by_type,
//             1
//           );

//           if (reminder > 0) {
//             $receiptModel.sold_item_list[i].sold_item_type = "pcs_item";
//           }

//           // calculate discount
//           let total_item_discount = 0;
//           let total_modifiers = 0;

//           for (const m of $receiptModel.sold_item_list[i].modifiers) {
//             for (const mo of m.modifier_options) {
//               total_modifiers += mo.price;
//             }
//           }
//           let items_total =
//             (total_modifiers + $receiptModel.sold_item_list[i].price) *
//             ($receiptModel.sold_item_list[i].value + reminder / count_by_type);

//           for (const d_index in $receiptModel.sold_item_list[i].discount) {
//             const d = $receiptModel.sold_item_list[i].discount[d_index];
//             if (items_total > 0) {
//               if (d.type == "percentage") {
//                 total_item_discount += (items_total * d.value) / 100;
//                 $receiptModel.sold_item_list[i].discount[d_index].total_value =
//                   (items_total * d.value) / 100;
//                 items_total -= (items_total * d.value) / 100;
//               } else {
//                 total_item_discount +=
//                   d.value *
//                   ($receiptModel.sold_item_list[i].value +
//                     reminder / count_by_type);
//                 $receiptModel.sold_item_list[i].discount[d_index].total_value =
//                   d.value *
//                   ($receiptModel.sold_item_list[i].value +
//                     reminder / count_by_type);
//                 items_total -=
//                   d.value *
//                   ($receiptModel.sold_item_list[i].value +
//                     reminder / count_by_type);
//               }
//             }
//           }

//           if (receipt_type == "debt") {
//             $receiptModel.sold_item_list[i].total_debt = items_total;
//             $receiptModel.sold_item_list[i].total_paid_debt = 0;
//           }

//           if (
//             total_item_discount >
//             (total_modifiers + $receiptModel.sold_item_list[i].price) *
//             ($receiptModel.sold_item_list[i].value + reminder / count_by_type)
//           ) {
//             total_item_discount =
//               (total_modifiers + $receiptModel.sold_item_list[i].price) *
//               ($receiptModel.sold_item_list[i].value +
//                 reminder / count_by_type);
//           }

//           $receiptModel.sold_item_list[i].total_discount = total_item_discount;
//           total_discount += total_item_discount;

//           $receiptModel.sold_item_list[i].receipt_id = $receiptModel._id;
//           try {
//             const item = await instance.goodsSales.findById(
//               $receiptModel.sold_item_list[i].product_id
//             );
//             if (item) {
//               $receiptModel.sold_item_list[i].sku = item.sku;
//               $receiptModel.sold_item_list[i].barcode =
//                 item.barcode && item.barcode.length > 0 ? item.barcode[0] : "";

//               // set category id and supplier id

//               try {
//                 const category = await instance.goodsCategory.findById(
//                   item.category
//                 );
//                 if (category) {
//                   $receiptModel.sold_item_list[i].category_id = category._id;
//                   $receiptModel.sold_item_list[i].category_name = category.name;
//                 } else {
//                   try {
//                     const other_category = await instance.goodsCategory.findOne(
//                       { organization: user.organization, is_other: true }
//                     );
//                     if (other_category) {
//                       $receiptModel.sold_item_list[i].category_id =
//                         other_category._id;
//                       $receiptModel.sold_item_list[i].category_name =
//                         other_category.name;
//                     }
//                   } catch (error) { }
//                 }
//               } catch (error) { }

//               try {
//                 const supplier = await instance.adjustmentSupplier.findById(
//                   item.primary_supplier_id
//                 );
//                 if (supplier) {
//                   $receiptModel.sold_item_list[i].supplier_id = supplier._id;
//                   $receiptModel.sold_item_list[i].supplier_name =
//                     supplier.supplier_name;
//                 }
//               } catch (error) { }

//               $receiptModel.sold_item_list[i].count_by_type =
//                 item.count_by_type;
//             } else {
//               try {
//                 const other_category = await instance.goodsCategory.findOne({
//                   organization: user.organization,
//                   is_other: true,
//                 });
//                 if (other_category) {
//                   $receiptModel.sold_item_list[i].category_id =
//                     other_category._id;
//                   $receiptModel.sold_item_list[i].category_name =
//                     other_category.name;
//                 }
//               } catch (error) { }
//             }
//           } catch (error) { }
//         }
//         $receiptModel.total_discount = total_discount;

//         need_to_save.push($receiptModel);
//       }
//     }

//     // let result = instance.Receipts.insertMany(need_to_save);
//     let result = []
//     for (const r of need_to_save) {
//       const check = await new instance.Receipts(r).save();
//       // save agent transaction
//       console.log('save agent transaction')
//       console.log(r.order_id)
//       if (r.order_id) {
//         await instance.save_agent_transaction(instance, check);
//       }
//       // cashbackni hisoblash
//       if (r.cashback_phone) {
//         console.log('save cashback')

//         cash_back = await instance.CashBackClientUpdate(
//           { ...{ ...check }._doc },
//           { phone_number: r.cashback_phone, },
//           user
//         )
//         cash_back = !isNaN(cash_back) ? cash_back : 0;
//         await instance.Receipts.findByIdAndUpdate(r._id, { $set: { cash_back: cash_back } });
//       }
//       result.push(check)
//     }
//     for (const r of result) {
//       if (!r.refund_not_stock && r.is_refund || !r.is_refund) {
//         await instance.forReceiptToWorkCreate(request, user, r, r.is_refund);
//       }
//     }
//     for (const rr of result) {
//       if (rr.is_refund) {
//         await instance.update_receipt_sold_item(rr.refund, rr.sold_item_list);
//         try {
//           // oxirgi queue ga stockni qoshib qoyish krk
//           await instance.update_queue_sold_item_refund(rr._id, rr.sold_item_list, service_id)
//         } catch (error) {
//           instance.send_Error(
//             `update_queue_sold_item_refund
//             \nservice_id: ${service_id}`,
//             error,
//           )
//         }
//       } else {
//         try {
//           //goods_partiation_sale update stock queue
//           instance.goods_partiation_sale(rr.sold_item_list, service_id)
//         } catch (error) {
//           instance.send_Error(
//             `goods_partiation_sale
//             \nservice_id: ${service_id}`,
//             error,
//           )
//         }
//       }
//     }

//     instance.customer_points(result);
//     result = result.concat(allready_exist);
//     reply.ok(result);
//     instance.push_changes(request, 102, service_id);

//   } catch (error) {
//     console.log(error.message);
//     reply.error(error.message);
//   }
//   return reply;
//
