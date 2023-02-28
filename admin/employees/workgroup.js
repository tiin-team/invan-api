
module.exports = ((instance, options, next) => {

  const get_workgroup = async (request, reply, admin) => {
    // instance.Workgroup.find({
    //   organization: admin.organization
    // }, (err, workgroups) => {
    //   reply.ok(workgroups)
    // }).sort({ position: 1 })
    try {
      const workgroups = await instance.Workgroup.aggregate([
        {
          $match: {
            organization: admin.organization
          }
        },
        {
          $lookup: {
            from: 'taskdones',
            localField: '_id',
            foreignField: 'executor_id',
            as: 'taskdones'
          }
        },
        {
          $sort: {
            position: 1
          }
        }
      ])
      for (const i in workgroups) {
        workgroups[i].bonus = 0

        if (workgroups[i].taskdones instanceof Array)
          for (const j in workgroups[i].taskdones) {
            workgroups[i].bonus += workgroups[i].taskdones[j].bonus
          }
        delete workgroups[i].taskdones
      }
      reply.ok(workgroups)
    } catch (error) {
      reply.error(error.message)
    }
  }

  instance.get('/workgroup/get', options.version, (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      get_workgroup(request, reply, admin)
    })
  })

  var update_group_workgroup = async (request, reply, admin) => {
    try {
      var create_workgroup = [], update_workgroup = [];
      const exist_ids = []
      for (let i = 0; i < request.body.length; i++) {
        request.body[i].position = i
        request.body[i].organization = admin.organization
        if (!request.body[i]._id) {
          create_workgroup.push(request.body[i])
        }
        else {
          exist_ids.push(request.body[i]._id)
          update_workgroup.push(request.body[i])
        }
      }
      // delete
      await instance.Workgroup.deleteMany({ organization: admin.organization, _id: { $nin: exist_ids } })
      // save
      for (let i = 0; i < create_workgroup.length; i++) {
        await instance.Workgroup(create_workgroup[i]).save()
      }
      // edit
      for (let i = 0; i < update_workgroup.length; i++) {
        await instance.Workgroup.updateOne({ _id: update_workgroup[i]._id }, { $set: update_workgroup[i] })
      }
      var workgroups = await instance.Workgroup.find({ organization: admin.organization }).sort({ position: 1 })
      return reply.ok(workgroups)
    }
    catch (error) {
      return reply.error(error.message)
    }
  }

  instance.post('/workgroup/update_group', {
    ...options.version,
    schema: {
      body: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['name'],
          properties: {
            name: { type: 'string', minLength: 1 },
            _id: { type: 'string' }
          }
        }
      }
    }
  }, (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      update_group_workgroup(request, reply, admin)
    })
  })

  // update workgroup 

  const updateWorkgroup = async (request, reply) => {
    try {
      const id = request.params.id
      const workgroup = await instance.Workgroup.findById(id).exec()
      if (!workgroup) {
        return reply.fourorfour('Workgroup')
      }
      const body = request.body;
      const task_id = request.body.task_id;

      if (task_id) {
        try {
          const task = await instance.Task.findById(task_id)
          if (!task) {
            return reply.fourorfour('Task')
          }
          request.body.task_id = task._id
        } catch (error) {}
      }

      if (!request.body.task_id) {
        delete request.body.task_id
      }
      await instance.Workgroup.updateOne({ _id: id }, { $set: body })
      reply.ok({ _id: id })
    } catch (error) {
      reply.error(error.message)
    }
  }

  const workgroupUpdateSchema = {
    schema: {
      body: {
        type: 'object',
        additionalProperties: false,
        required: ['name'],
        properties: {
          name: { type: 'string' },
          task_id: {
            type: 'string'
          },
          is_warehouse: { type: 'boolean' }
        }
      }
    },
    attachValidation: true
  }

  instance.post(
    '/workgroup/update/:id',
    {
      version: '1.0.0',
      ...workgroupUpdateSchema
    },
    (request, reply) => {
      if (request.validationError) {
        return reply.validation(request.validationError.message)
      }
      instance.oauth_admin(request, reply, (user) => {
        return updateWorkgroup(request, reply)
      })
    }
  )

  next()
})