
const fp = require('fastify-plugin');
const mongoose = require('mongoose');

module.exports = fp((instance, _, next) => {

  const itemUsedQuantity = {
    quantity: Number,
    comment: String,
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users'
    }
  }

  const itemsType = {
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'goodssales'
    },
    is_track_stock: {
      type: Boolean,
      default: false
    },
    product_name: String,
    quantity: {
      type: Number
    },
    cost: {
      type: Number,
      default: 0
    },
    used_quantity: {
      type: Number,
      default: 0
    },
    used_quantities: {
      type: itemUsedQuantity,
      _id: false,
      default: []
    },
    production_item: {
      type: Number,
      default: 0
    },
    mix: {
      type: Number,
      default: 0
    },
    comment: {
      type: String,
      default: ''
    },
    workgroups: {
      type: Array,
      default: []
    },
    residue: {
      type: Number,
      default: 0
    },
    created_from: {
      type: String,
      enum: ['user', 'admin'],
      default: 'admin'
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users'
    },
    item_to_be_used: {
      type: Number
    }
  }

  const employeeType = {
    workgroup_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'workgroups'
    },
    workgroup_name: String,
    employee_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users'
    },
    employee_name: String,
    state: {
      type: String,
      enum: ['doing', 'done']
    },
    device_name: String,
    chooseanTime: Number,
    finishTime: Number
  }

  const joinedEmployee = {
    workgroup_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'workgroups'
    },
    workgroup_name: String,
    employee_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users'
    },
    employee_name: String,
    quantity: {
      type: Number,
      default: 0
    },
    date: Number
  }

  const workgroupPosition = {
    workgroup_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'workgroups'
    },
    position_index: {
      type: Number
    }
  }

  const WorkgroupOrderSchema = new mongoose.Schema({
    order_number: String,
    title: String,
    comment: String,
    info: Object,
    organization: String,
    service: String,
    service_name: String,
    item_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'goodssales'
    },
    item_name: {
      type: String
    },
    workgroups: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'workgroups'
    }],
    workgroup_positions: {
      default: [],
      type: workgroupPosition,
      _id: false,
    },
    current_workgroup: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'workgroups'
    },
    state: {
      type: String,
      enum: [
        'draft',
        'pending', 'in_progress',
        'completed', 'rejected',
        'cancelled',
        'complete_confirmed'
      ]
    },
    priority: {
      type: String,
      enum: [
        'urgent', 'normal', 'low'
      ]
    },
    employees: {
      type: employeeType,
      _id: false,
      default: []
    },
    joined_employees: {
      default: [],
      _id: false,
      type: joinedEmployee
    },
    current_employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users'
    },
    current_employee_name: {
      type: String,
      default: ''
    },
    is_waste: {
      type: Boolean,
      default: false
    },
    total_cost: {
      type: Number
    },
    additional_cost: {
      type: Number,
      default: 0
    },
    items: {
      type: itemsType,
      _id: false,
      default: []
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users'
    },
    createdByName: String,
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users'
    },
    rejectedByName: String,
    in_stock: {
      type: Number,
      default: 0
    },
    workgroup_type: {
      type: String,
    },
    total_actual_cost: Number,
    total_production_cost: Number,
    createdAt: Number,
    updatedAt: Number,
    order_item_count: Number,
    tech_map_id: String,
    tech_map_name: String
  })

  WorkgroupOrderSchema.statics.saveWorkgroupOrder = async function (data) {
    try {
      data.employees = [];
      data.workgroup_type = 'not_order';
      data.createdAt = new Date().getTime();
      data.updatedAt = new Date().getTime();
      const countWorkgroupOrder = await this.countDocuments({ organization: data.organization });
      const workgroup_order_number = 'WG' + ('000000' + (countWorkgroupOrder + 1)).slice(-6);
      data.order_number = workgroup_order_number;
      let total_cost = 0;
      for (const itm of data.items) {
        total_cost += itm.quantity * itm.cost
      }
      data.total_cost = total_cost
      return await new this(data).save();
    } catch (error) {
      instance.log.error(error.message)
      throw new Error(error.message)
    }
  }

  WorkgroupOrderSchema.statics.acceptWorkgroupOrder = async function (workgroupOrder, user) {
    // workgroupOrder.state = 'in_progress';
    workgroupOrder.employees = workgroupOrder.employees.concat(
      [{
        workgroup_id: user.workgroup_id,
        workgroup_name: user.workgroup_name,
        employee_id: user._id,
        employee_name: user.name,
        state: 'doing',
        chooseanTime: new Date().getTime()
      }]
    );
    // workgroupOrder.current_employee = user._id;
    // workgroupOrder.current_employee_name = user.name;
    workgroupOrder.updatedAt = new Date().getTime();
    await workgroupOrder.save()
    await instance.WorkgroupOrder.setLastState(workgroupOrder._id);
    return await workgroupOrder.save()
  }

  WorkgroupOrderSchema.statics.useWorkgroupOrderItem = async function (workgroupOrder, items) {
    let is_waste = false;
    for (const index in items) {
      let used_quantity = 0;
      let residue = 0;
      for (const itm_quantity of items[index].used_quantities) {
        used_quantity += itm_quantity.quantity ? itm_quantity.quantity : 0;
        residue += itm_quantity.residue ? itm_quantity.residue : 0
      }
      if (used_quantity > items[index].quantity) {
        is_waste = true
      }
      items[index].used_quantity = used_quantity;
      items[index].residue = residue;
      if (used_quantity && typeof items[index].residue == typeof 5) {
        items[index].production_item = used_quantity - items[index].residue;
      }
      workgroupOrder.items[index] = items[index];
    }

    workgroupOrder.is_waste = is_waste;
    workgroupOrder.updatedAt = new Date().getTime();
    const id = workgroupOrder._id + '';
    delete workgroupOrder._id
    return await WorkgroupOrder.updateOne({ _id: id }, { $set: workgroupOrder })
  }

  WorkgroupOrderSchema.statics.completeWorkgroupOrder = async function (workgroupOrder, user) {
    // workgroupOrder.current_employee = null;
    // workgroupOrder.current_employee_name = null;
    // const employee_index = workgroupOrder.employees.length - 1;
    // const workgroups_length = workgroupOrder.workgroups.length;
    // workgroupOrder.employees[employee_index].state = 'done';
    // workgroupOrder.employees[employee_index].finishTime = new Date().getTime();
    for (const inde in workgroupOrder.employees) {
      if (workgroupOrder.employees[inde].state != 'done' && workgroupOrder.employees[inde].employee_id + '' == user._id + '') {
        workgroupOrder.employees[inde].state = 'done';
        workgroupOrder.employees[inde].finishTime = new Date().getTime();
      }
    }

    workgroupOrder.updatedAt = new Date().getTime();
    // workgroupOrder.state = employee_index + 1 < workgroups_length ? 'pending' : 'completed';
    // workgroupOrder.current_workgroup = employee_index + 1 < workgroups_length ? workgroupOrder.workgroups[employee_index + 1] : null;
    const id = workgroupOrder._id
    delete workgroupOrder._id;
    if (!workgroupOrder.current_workgroup) {
      await WorkgroupOrder.updateOne({ _id: id }, { $unset: { current_workgroup: 1 } })
      delete workgroupOrder.current_workgroup
    }
    await WorkgroupOrder.updateOne({ _id: id }, { $set: workgroupOrder })

    await instance.WorkgroupOrder.setLastState(id);
    return { edited: true };
  }

  WorkgroupOrderSchema.statics.getWorkgroupOrderList = async function (params, user) {
    let current_workgroup = params.workgroup_id;
    const { limit, page } = params;
    try {
      current_workgroup = mongoose.Types.ObjectId(current_workgroup);
    } catch (error) { }
    if (current_workgroup == 'undefined') {
      current_workgroup = undefined
    }
    let query = {
      workgroups: current_workgroup,
      state: {
        $nin: ['complete_confirmed', 'draft', 'completed', 'rejected', 'cancelled']
      }
    }

    if (!current_workgroup) {
      query = {
        state: {
          $in: ['complete_confirmed', 'draft', 'completed', 'rejected', 'cancelled']
        }
      }
    }

    const matchWorkgroupOrder = {
      $match: {
        organization: user.organization,
        ...query
      }
    }
    const sortWorkgroupOrder = {
      $sort: {
        createdAt: -1
      }
    }
    const skipWorkgroupOrder = {
      $skip: limit * (page - 1)
    }
    const limitWorkgroupOrder = {
      $limit: limit
    }
    const projectWorkgroupOrder = {
      $project: {
        is_waste: 1,
        client_id: 1,
        title: 1,
        comment: 1,
        priority: 1,
        client_name: 1,
        current_workgroup: 1,
        state: 1,
        createdAt: 1,
        updatedAt: 1,
        order_number: 1,
        current_employee: 1,
        current_employee_name: 1,
        order_item_count: 1
      }
    }
    return await WorkgroupOrder.aggregate([
      matchWorkgroupOrder,
      sortWorkgroupOrder,
      skipWorkgroupOrder,
      limitWorkgroupOrder,
      projectWorkgroupOrder
    ]).allowDiskUse(true).exec();
  }

  WorkgroupOrderSchema.statics.editStateWorkgroupOrder = async function (workgroupOrder, user, state) {

    workgroupOrder.updatedAt = new Date().getTime()
    workgroupOrder.state = state;
    workgroupOrder.rejectedBy = user._id;
    workgroupOrder.rejectedByName = user.name;
    if (state == 'rejected') {
      await WorkgroupOrder.updateOne(
        { _id: workgroupOrder._id },
        { $unset: { current_workgroup: 1 } }
      )
      delete workgroupOrder.current_workgroup
    }
    else if (state == 'pending') {
      await WorkgroupOrder.updateOne(
        { _id: workgroupOrder._id },
        { $set: { current_workgroup: workgroupOrder.workgroups[0] } }
      )
    }
    else {
      workgroupOrder.state = 'cancelled';
      await WorkgroupOrder.updateOne(
        { _id: workgroupOrder._id },
        { $set: { state: 'cancelled' } }
      )
      delete workgroupOrder.current_workgroup
    }

    await workgroupOrder.save();
    await instance.WorkgroupOrder.setLastState(workgroupOrder._id);
    return await workgroupOrder.save();
  }

  WorkgroupOrderSchema.statics.setStockWorkgroupOrder = async function (workgroupOrder, stock) {
    if (!workgroupOrder.stock) {
      workgroupOrder.stock = 0;
    }
    workgroupOrder.stock = workgroupOrder.stock + stock;
    workgroupOrder.updatedAt = new Date().getTime()
    return await workgroupOrder.save();
  }

  WorkgroupOrderSchema.statics.setLastState = async (id) => {
    try {
      const w_order = await instance.WorkgroupOrder.findById(id);
      if (!w_order) {
        console.log('w_order not found')
        return;
      }

      const workgroups = await instance.Workgroup.find({ _id: { $in: w_order.workgroups } });
      if (workgroups.length != w_order.workgroups.length) {
        const w_ids = []
        for (const w of workgroups) {
          w_ids.push(w._id)
        }
        w_order.workgroups = w_ids
      }
      const default_states = [
        'draft', 'completed', 'rejected', 'cancelled', 'complete_confirmed'
      ]
      if (default_states.includes(w_order.state)) {
        console.log(`w_order state -> ${w_order.state}`)
        return
      }
      if (w_order.employees.length == 0) {
        w_order.state = 'pending'
      }
      else if (w_order.employees.length < w_order.workgroups.length) {
        w_order.state = 'in_progress'
      }
      else {
        let state = 'completed';
        for (const e of w_order.employees) {
          if (e.state == 'doing') {
            state = 'in_progress'
          }
        }
        w_order.state = state
      }
      const result = await instance.WorkgroupOrder.updateOne(
        { _id: w_order._id },
        {
          $set: {
            state: w_order.state,
            workgroups: w_order.workgroups
          }
        }
      )
      console.log(`w_order state -> ${w_order.state}`)
      console.log(result)
    } catch (error) {
      console.log(error.message)
    }
  }

  WorkgroupOrderSchema.statics.orderReport = async (body, user) => {
    const {
      start_time, end_time,
      limit, page, tab
    } = body;

    const query = {
      organization: user.organization,
      createdAt: {
        $gte: start_time,
        $lte: end_time
      }
    }

    query.state = tab == 0 ? 'complete_confirmed' : 'completed';

    const countOrders = await instance.WorkgroupOrder.countDocuments(query)
    const total_confirm_complete = await instance.WorkgroupOrder.countDocuments({ ...query, state: 'complete_confirmed' })
    const total_completed = await instance.WorkgroupOrder.countDocuments({ ...query, state: 'completed' })
    const $match = {
      $match: query
    }
    const $sort = {
      $sort: {
        _id: -1
      }
    }
    const $skip = {
      $skip: limit * (page - 1)
    }
    const $limit = {
      $limit: limit
    }
    const $project = {
      $project: {
        order_number: 1,
        priority: 1,
        createdAt: 1,
        comment: 1,
        state: 1,
      }
    }
    const orders = await instance.WorkgroupOrder.aggregate([
      $match,
      $sort,
      $skip,
      $limit,
      $project
    ]).allowDiskUse(true).exec();

    return {
      total: countOrders,
      data: orders,
      total_confirm_complete,
      total_completed,
    }

  }

  WorkgroupOrderSchema.statics.eachOrderReport = async (body, user) => {
    const {
      start_time, end_time,
      limit, page, workgroup_id
    } = body;

    const workgroup = await instance.Workgroup.findById(workgroup_id);
    if (!workgroup) throw { message: 'Workgroup not found' }

    const query = {
      organization: user.organization,
      createdAt: {
        $gte: start_time,
        $lte: end_time
      },
      state: { $in: ['complete_confirmed', 'completed'] },
      workgroups: workgroup._id
    }

    const $match = {
      $match: query
    }

    const $sort = {
      $sort: {
        createdAt: 1
      }
    }

    const dateDiffer = 24 * 60 * 60 * 1000;
    const $project = {
      $project: {
        unique: {
          $floor: {
            $divide: [
              { $max: [0, "$createdAt"] },
              dateDiffer
            ]
          }
        },
        total_actual_cost: 1,
        total_production_cost: 1,
        createdAt: 1
      }
    }

    const $group = {
      $group: {
        _id: "$unique",
        date: {
          $first: "$createdAt"
        },
        createdAt: {
          $first: "$createdAt"
        },
        total_actual_cost_sum: {
          $sum: "$total_actual_cost"
        },
        total_production_cost_sum: {
          $sum: "$total_production_cost"
        },
        count: {
          $sum: 1
        }
      }
    }

    const $skip = {
      $skip: limit * (page - 1)
    }

    const $limit = {
      $limit: limit
    }

    const $countTotal = {
      $group: {
        _id: null,
        total_actual_cost_sum: {
          $sum: '$total_actual_cost_sum'
        },
        total_production_cost_sum: {
          $sum: "$total_production_cost_sum"
        },
        total_count: {
          $sum: "$count"
        }
      }
    }

    let total = await instance.WorkgroupOrder.aggregate([
      $match,
      $sort,
      $project,
      $group,
      $countTotal
    ]).allowDiskUse(true).exec();
    total = total.length == 0 ? { total_actual_cost_sum: 0, total_production_cost_sum: 0, total_count: 0 } : total[0];

    let result = await instance.WorkgroupOrder.aggregate([
      $match,
      $sort,
      $project,
      $group,
      $sort,
      $skip,
      $limit
    ]).allowDiskUse(true).exec();

    return {
      data: result,
      total_actual_cost_sum: total.total_actual_cost_sum,
      total_production_cost_sum: total.total_production_cost_sum,
      total_count: total.total_count
    }

  }

  const WorkgroupOrder = mongoose.model('WorkgroupOrder', WorkgroupOrderSchema)
  instance.decorate('WorkgroupOrder', WorkgroupOrder)

  next()
})
