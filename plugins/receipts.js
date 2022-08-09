const fp = require("fastify-plugin");

const receiptCreateGroup = async (request, reply, instance) => {
  const user = request.user;
  const body = request.body;

  const service_id = request.headers["accept-service"];
  const pos_id = request.headers["accept-id"];
  const by_user = request.headers['accept-user'];
  try {
    let pos;
    if (by_user == 'admin') {
      pos = {
        name: 'office',
        _id: user._id,
      }
    }
    else {
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
    const receipts_find_query = []
    for (const r of body) {
      receipts_find_query.push({
        date: r.date,
        receipt_no: r.receipt_no
      })
    }
    let receiptss = []
    if (receipts_find_query.length > 0) {
      receiptss = await instance.Receipts
        .find({
          organization: user.organization,
          service: service_id,
          $or: receipts_find_query
          // $and: [
          //   { date: { $in: dates } },
          //   { receipt_no: { $in: receipt_numbers } },
          // ],
        })
        .lean();
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
        JSON.stringify({ date: re.date, number: re.receipt_no })
      );
      receiptObj[JSON.stringify({ date: re.date, number: re.receipt_no })] = re;
    }
    let current_currency = await instance.Currency
      .findOne({ organization: user.organization })
      .lean();
    if (!current_currency) {
      current_currency = {};
    }

    const sold_item_ids = new Set()
    for (const rr of request.body) {
      if (
        !date_and_numbers.includes(
          JSON.stringify({ date: rr.date, number: rr.receipt_no })
        )
      ) {
        rr.sold_item_list = Array.isArray(rr.sold_item_list) ? rr.sold_item_list : []
        rr.sold_item_list.forEach(item => sold_item_ids.add(item.product_id))
      }
    }
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
      .lean()

    const itemsObj = {}
    const primary_supplier_ids = new Set()
    const category_ids = new Set()

    for (const item of items) {
      itemsObj[item._id] = item
      if (item.primary_supplier_id)
        primary_supplier_ids.add(item.primary_supplier_id)
      if (item.category)
        category_ids.add(item.category)
    }

    const categories = await instance.goodsCategory
      .find(
        { _id: { $in: [...category_ids] } },
        { name: 1 },
      )
      .lean();
    const categoriesObj = {}
    for (const cat of categories) {
      categoriesObj[cat._id] = cat
    }

    const suppliers = await instance.adjustmentSupplier
      .find(
        { _id: { $in: [...primary_supplier_ids] } },
      )
      .lean();
    const suppliersObj = {}
    for (const supp of suppliers) {
      suppliersObj[supp._id] = supp
    }

    const other_category = await instance.goodsCategory
      .findOne({ organization: user.organization, is_other: true })
      .lean();

    for (const rr of request.body) {
      console.log('Order id')
      console.log(rr.order_id)
      rr.old_id = rr._id;
      delete rr._id;
      if (
        date_and_numbers.includes(
          JSON.stringify({ date: rr.date, number: rr.receipt_no })
        )
      ) {
        allready_exist.push(
          receiptObj[JSON.stringify({ date: rr.date, number: rr.receipt_no })]
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
            $receiptModel.sold_item_list[i].partiation_id =
              instance.ObjectId($receiptModel.sold_item_list[i].partiation_id)
          }
          try {

          } catch (error) { }
          const reminder = Math.max(
            $receiptModel.sold_item_list[i].reminder,
            0
          );
          const count_by_type = Math.max(
            $receiptModel.sold_item_list[i].count_by_type,
            1
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
            const item = itemsObj[$receiptModel.sold_item_list[i].product_id]
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
            $receiptModel.sold_item_list[i].price_position = 0

            if (item) {
              $receiptModel.sold_item_list[i].sku = item.sku;
              $receiptModel.sold_item_list[i].barcode =
                item.barcode
                  && item.barcode.length > 0
                  ? item.barcode[0]
                  : $receiptModel.sold_item_list[i].barcode
                    ? $receiptModel.sold_item_list[i].barcode
                    : '';

              const serv = item.services
                .find(serv => serv.service + '' == service_id)

              // const prices = serv && serv.prices ? serv.prices.filter(a => a.from !== 0) : []
              let prices = serv && Array.isArray(serv.prices)
                ? serv.prices.filter(a => a.from !== 0 && a.price !== 0)
                : []
              prices = prices.sort((a, b) => a.from - b.from)

              for (const f_price_index in prices) {
                if ($receiptModel.sold_item_list[i].value >= prices[f_price_index].from) {
                  $receiptModel.sold_item_list[i].price_position = f_price_index
                }
              }

              // set category id and supplier id

              try {
                // const category = await instance.goodsCategory
                //   .findById(item.category)
                //   .lean();
                if (categoriesObj[item.category]) {
                  $receiptModel.sold_item_list[i].category_id = categoriesObj[item.category]._id;
                  $receiptModel.sold_item_list[i].category_name = categoriesObj[item.category].name;
                } else {
                  try {
                    if (other_category) {
                      $receiptModel.sold_item_list[i].category_id =
                        other_category._id;
                      $receiptModel.sold_item_list[i].category_name =
                        other_category.name;
                    }
                  } catch (error) { }
                }
              } catch (error) { }

              try {
                // const queue_query = {}
                // if (item.queue) queue_query.queue = item.queue
                // else queue_query = { queue: -1 }
                //xatolik bor
                const queue = await instance.goodsSaleQueue
                  .findOne({
                    product_id: instance.ObjectId(item._id),
                    service_id: instance.ObjectId(service_id),
                    // queue: item.queue,
                    quantity_left: { $ne: 0 },
                  })
                  .sort({ queue: 1 })
                  .lean()
                // bu keyinchalik olib tashlanadi
                if (item.primary_supplier_id) {
                  // const supplier = await instance.adjustmentSupplier
                  //   .findById(item.primary_supplier_id)
                  //   .lean();
                  $receiptModel.sold_item_list[i].supplier_id = suppliersObj[item.primary_supplier_id]._id;
                  $receiptModel.sold_item_list[i].supplier_name =
                    suppliersObj[item.primary_supplier_id].supplier_name;
                }

                if (queue) {
                  $receiptModel.sold_item_list[i].queue_id = queue._id
                  $receiptModel.sold_item_list[i].partiation_id = queue._id
                  $receiptModel.sold_item_list[i].p_order = queue.p_order
                  $receiptModel.sold_item_list[i].queue = queue.queue
                  // partiali tovar bo'yicha supplierni olish
                  $receiptModel.sold_item_list[i].supplier_id = queue.supplier_id;
                  $receiptModel.sold_item_list[i].supplier_name = queue.supplier_name;
                }

              } catch (error) {
                instance.send_Error('Solt item partion not found', JSON.stringify(error))
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
              } catch (error) { }
            }
          } catch (error) { }
        }
        $receiptModel.total_discount = total_discount;

        need_to_save.push($receiptModel);
      }
    }

    // let result = instance.Receipts.insertMany(need_to_save);
    let result = []
    for (const r of need_to_save) {
      try {
        const check = await new instance.Receipts(r).save();
        // save agent transaction
        console.log('save agent transaction')
        console.log(r.order_id)
        if (r.order_id) {
          await instance.save_agent_transaction(instance, check);
        }
        // cashbackni hisoblash
        if (r.cashback_phone) {
          console.log('save cashback')

          cash_back = await instance.CashBackClientUpdate(
            { ...{ ...check }._doc },
            { phone_number: r.cashback_phone, },
            user
          )
          cash_back = !isNaN(cash_back) ? cash_back : 0;
          await instance.Receipts.findByIdAndUpdate(r._id, { $set: { cash_back: cash_back } });
        }
        result.push(check)
      } catch (error) {
        instance.send_Error(
          `Save check \nservice_id: ${service_id}\n`,
          JSON.stringify(error),
        )
      }
    }
    for (const r of result) {
      if (!r.refund_not_stock && r.is_refund || !r.is_refund) {
        await instance.forReceiptToWorkCreate(request, user, r, r.is_refund);
      }
    }
    for (const rr of result) {
      console.log(rr.is_refund, 'rr.is_refund');
      if (rr.is_refund) {
        await instance.update_receipt_sold_item(rr.refund, rr.sold_item_list);
        try {
          // oxirgi queue ga stockni qoshib qoyish krk
          await instance.update_queue_sold_item_refund(rr._id, rr.sold_item_list, service_id)
        } catch (error) {
          instance.send_Error(
            `update_queue_sold_item_refund
            \nservice_id: ${service_id}`,
            error,
          )
        }
      } else {
        try {
          //goods_partiation_sale update stock queue
          instance.goods_partiation_sale(
            rr.sold_item_list,
            service_id,
            body.with_partiation ? true : false
          )
        } catch (error) {
          instance.send_Error(
            `goods_partiation_sale
            \nservice_id: ${service_id}`,
            error,
          )
        }
      }
    }

    instance.customer_points(result);
    result = result.concat(allready_exist);
    reply.ok(result);
    instance.push_changes(request, 102, service_id);

  } catch (error) {
    reply.error(error.message);
    instance.send_Error('receiptCreateGroup', error)
  }
  return reply;
};

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

    let current_currency = await instance.Currency
      .findOne({ organization: user.organization })
      .lean();
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
            0
          );
          const count_by_type = Math.max(
            $receiptModel.sold_item_list[i].count_by_type,
            1
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
              $receiptModel.sold_item_list[i].product_id
            );
            if (item) {
              $receiptModel.sold_item_list[i].barcode =
                item.barcode && item.barcode.length > 0 ? item.barcode[0] : "";

              // set category id and supplier id

              try {
                const category = await instance.goodsCategory.findById(
                  item.category
                );
                if (category) {
                  $receiptModel.sold_item_list[i].category_id = category._id;
                  $receiptModel.sold_item_list[i].category_name = category.name;
                } else {
                  try {
                    const other_category = await instance.goodsCategory.findOne(
                      { organization: user.organization, is_other: true }
                    );
                    if (other_category) {
                      $receiptModel.sold_item_list[i].category_id =
                        other_category._id;
                      $receiptModel.sold_item_list[i].category_name =
                        other_category.name;
                    }
                  } catch (error) { }
                }
              } catch (error) { }

              try {
                const supplier = await instance.adjustmentSupplier.findById(
                  item.primary_supplier_id
                );
                if (supplier) {
                  $receiptModel.sold_item_list[i].supplier_id = supplier._id;
                  $receiptModel.sold_item_list[i].supplier_name =
                    supplier.supplier_name;
                }
              } catch (error) { }

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
              } catch (error) { }
            }
          } catch (error) { }
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
          $receiptModel.receipt_state = 'draft';
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
    const service = request.headers['accept-service'];
    const receipt = await instance.Receipts.findOne({
      organization: user.organization,
      service: service,
      _id: id
    })
    if (!receipt) {
      return reply.fourorfour('Receipt')
    }
    if (receipt.receipt_state != 'draft') {
      return reply.send({
        statusCode: 402,
        message: 'Receipt Draft allready used'
      })
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
      const reminder = Math.max(
        receipt.sold_item_list[i].reminder,
        0
      );
      const count_by_type = Math.max(
        receipt.sold_item_list[i].count_by_type,
        1
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
              (receipt.sold_item_list[i].value +
                reminder / count_by_type);
            receipt.sold_item_list[i].discount[d_index].total_value =
              d.value *
              (receipt.sold_item_list[i].value +
                reminder / count_by_type);
            items_total -=
              d.value *
              (receipt.sold_item_list[i].value +
                reminder / count_by_type);
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
          (receipt.sold_item_list[i].value +
            reminder / count_by_type);
      }

      receipt.sold_item_list[i].total_discount = total_item_discount;
      total_discount += total_item_discount;

      try {
        const item = await instance.goodsSales.findById(
          receipt.sold_item_list[i].product_id
        );
        if (item) {
          receipt.sold_item_list[i].barcode =
            item.barcode && item.barcode.length > 0 ? item.barcode[0] : "";

          // set category id and supplier id

          try {
            const category = await instance.goodsCategory.findById(
              item.category
            );
            if (category) {
              receipt.sold_item_list[i].category_id = category._id;
              receipt.sold_item_list[i].category_name = category.name;
            } else {
              try {
                const other_category = await instance.goodsCategory.findOne(
                  { organization: user.organization, is_other: true }
                );
                if (other_category) {
                  receipt.sold_item_list[i].category_id =
                    other_category._id;
                  receipt.sold_item_list[i].category_name =
                    other_category.name;
                }
              } catch (error) { }
            }
          } catch (error) { }

          try {
            const supplier = await instance.adjustmentSupplier.findById(
              item.primary_supplier_id
            );
            if (supplier) {
              receipt.sold_item_list[i].supplier_id = supplier._id;
              receipt.sold_item_list[i].supplier_name =
                supplier.supplier_name;
            }
          } catch (error) { }

          receipt.sold_item_list[i].count_by_type =
            item.count_by_type;
        } else {
          try {
            const other_category = await instance.goodsCategory.findOne({
              organization: user.organization,
              is_other: true,
            });
            if (other_category) {
              receipt.sold_item_list[i].category_id =
                other_category._id;
              receipt.sold_item_list[i].category_name =
                other_category.name;
            }
          } catch (error) { }
        }
      } catch (error) { }
      delete receipt.sold_item_list[i]._id
    }
    receipt.total_discount = total_discount;
    receipt.receipt_state = 'receipt';

    delete receipt._id;
    await instance.Receipts.updateOne(
      { _id: id },
      {
        $set: receipt
      }
    )
    await instance.forReceiptToWorkCreate(request, user, receipt, receipt.is_refund);
    await instance.update_receipt_sold_item(receipt.refund, receipt.sold_item_list);
    await instance.customer_points([receipt]);
    reply.ok()
  } catch (error) {
    console.log(error.message)
    reply.error(error.message)
  }
}

const receiptSetClient = async (request, reply, instance) => {
  try {
    const { receipt_id, user_id } = request.body;
    const receipt = await instance.Receipts.findOne({ _id: receipt_id });
    if (!receipt) {
      return reply.fourorfour('Receipt')
    }
    if (receipt.user_id && receipt.user_id != '0') {
      return reply.fourorfour('Receipt')
    }

    const client = await instance.clientsDatabase.findOne({ user_id });
    const updated = await instance.Receipts.findOneAndUpdate(
      { _id: receipt._id },
      { $set: { user_id: client.user_id } },
      { new: true }
    );
    await instance.customer_points([updated]);
    reply.ok(receipt._id)
  } catch (error) {
    reply.error(error.message)
  }
  return reply;
}

async function findReceipt(request, reply, instance) {
  const pos_id = request.headers['accept-id']
  const user = request.user;
  try {
    const posdevice = await instance.posDevices
      .findOne({ _id: pos_id })
      .lean()
    if (!posdevice)
      return reply.fourorfour('Posdevice')

    const { receipt_no } = request.query;
    const limit = !isNaN(parseInt(request.query.limit))
      ? parseInt(request.query.limit)
      : 10
    const page = !isNaN(parseInt(request.query.page))
      ? parseInt(request.query.page)
      : 1

    const date = new Date();
    const date_time = date.getTime();
    date.setDate(date.getDate() - 30);

    const min_date_time = date.getTime();
    const filter_query = {
      organization: posdevice.organization,
      service: posdevice.service,
      created_time: {
        $gte: min_date_time,
        $lte: date_time,
      },
    }
    if (receipt_no) filter_query.receipt_no = receipt_no;

    const receipts = await instance.Receipts
      .find(filter_query)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await instance.Receipts.countDocuments(filter_query)

    return reply.code(200).send({
      error: "Ok",
      message: "Success",
      statusCode: 200,
      limit: limit,
      current_page: page,
      page: Math.ceil(total / limit),
      total: total,
      data: receipts,
    })
  } catch (error) {
    instance.send_Error(
      `On receipt search, \nPosId: ${pos_id}, \User name: ${user.name}`,
      JSON.stringify(error)
    );
    return reply.error(error.message)
  }
}

module.exports = fp((instance, _, next) => {
  instance.patch('/update/receipts/:organization', { version: '3.9.9' }, async (request, reply) => {
    return reply.ok(`ruxsat yo'q`);

    const organization = request.params.organization

    const receipts = await instance.Receipts
      .find({ organization: organization })
      .lean()
    // .limit(1)

    for (const receipt of receipts) {
      // console.log(receipt._id);
      for (const [index, item] of receipt.sold_item_list.entries()) {
        const good = await instance.goodsSales.findById(item.product_id).lean()
        let cat = await instance.goodsCategory.findById(good.category_id).lean();
        if (!cat)
          cat = await instance.goodsCategory.findOne({
            type: 'top',
            name: 'Other',
            organization: organization,
          }).lean()

        let supplier = await instance.adjustmentSupplier.findById(good.primary_supplier_id).lean();
        if (!supplier) supplier = { supplier_name: 'unSet', _id: null };

        receipt.sold_item_list[index].category_id = cat._id;
        receipt.sold_item_list[index].category_name = cat.name;
        receipt.sold_item_list[index].supplier_id = supplier._id;
        receipt.sold_item_list[index].supplier_name = supplier.supplier_name;
      }

      await instance.Receipts
        .findByIdAndUpdate(receipt._id, { $set: { sold_item_list: receipt.sold_item_list } });
    }

    return reply.ok(`length: ${receipts.length}`)
  })
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
      _id: { type: 'string' },
      service: { type: 'string' },
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
              enum: ["cash", "card", "gift", "debt", "qr_code", "nfc", "cashback"],
            },
            value: { type: "number" },
          },
        },
      },
      refund_not_stock: { type: 'boolean' },
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
              type: 'string',
              default: 'uzs'
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
    }
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
    }
  );

  instance.post(
    '/receipts/use_draft/:id',
    {
      version: '1.1.0',
      schema: {
        body: "receiptBody#",
      },
    },
    (request, reply) => {
      instance.authorization(request, reply, (user) => {
        request.user = user;
        useReceiptDraft(request, reply, instance)
      })
    }
  )

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
          return reply.error('Access')
        }
        request.user = user;

        if (request.validationError) {
          return reply.validation(request.validationError.message);
        }
        request.headers['accept-service'] = request.body.service;
        request.body.created_from = 'office';
        let receipt_no = request.body.receipt_no
        receipt_no = await instance.getReceiptNumber(instance, user.organization, receipt_no);
        request.body.receipt_no = receipt_no;
        request.body = [request.body];
        return receiptCreateGroup(request, reply, instance);
      })
    }
  )

  instance.post(
    '/admin-receipt/set-client',
    { version: "1.0.0" },
    (request, reply) => {
      instance.authorization(request, reply, async (user) => {
        if (!user) {
          return reply.error('Access')
        }
        request.user = user;
        receiptSetClient(request, reply, instance);
      })
    }
  )

  instance.get(
    '/desktop-receipt/find',
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
            "Accept-version": { type: 'string' },
            "Accept-user": { type: 'string', enum: ['bos', 'admin', 'employee'] },
            "Authorization": { type: 'string' },
            "Accept-id": { type: 'string' },
          },
        },
        querystring: {
          type: "object",
          additionalProperties: false,
          properties: {
            receipt_no: { type: 'string', default: '' },
            limit: { type: 'number', minimum: 3, maximum: 50 },
            page: { type: 'number', minimum: 1, },
          },
        }
      }
    },
    (request, reply) => {
      instance.authorization(request, reply, async (user) => {
        if (!user) {
          return reply.error('Access')
        }
        request.user = user;

        findReceipt(request, reply, instance);
      })
    })

  next();
});
