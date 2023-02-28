
const fp = require('fastify-plugin');
const mongoose = require('mongoose');

module.exports = fp((instance, _, next) => {

  const WorkgroupSchema = new mongoose.Schema({
    organization: String,
    position: Number,
    name: String,
    task_id: {
      type: mongoose.ObjectId,
      default: null,
    },
    is_warehouse: {
      type: Boolean,
      default: false
    },
    order_info: {
      type: Array,
      default: []
    },
    device_info: {
      type: Array,
      default: []
    },
    additional_info: {
      type: Array,
      default: []
    }
  })

  WorkgroupSchema.statics.getListSortedById = async function (ids) {
    try {
      const workgroups = await Workgroup.find({ _id: { $in: ids } });
      const workgroupMap = {}
      const ids2 = []
      for (const w of workgroups) {
        workgroupMap[w._id] = w
        ids2.push(w._id)
      }
      const sortedWorkgroups = []
      for (const id of ids) {
        sortedWorkgroups.push(workgroupMap[id]);
      }
      
      return sortedWorkgroups;
    }
    catch (error) {
      instance.lof.error(error.message)
      return []
    }
  }

  const Workgroup = mongoose.model('Workgroup', WorkgroupSchema)
  instance.decorate('Workgroup', Workgroup)

  next()
})
