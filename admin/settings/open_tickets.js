module.exports = (instance, options, next) => {

  async function update_table(t) {
    await instance.Tables.updateOne({
      _id: t._id
    }, {
      $set: t
    }, (err) => {
      instance.send_Error('updating table', JSON.stringify(err))
    })
  }

  // update tables
  function update_tables(request, reply, admin) {
    var service = request.body.service
    for (let i = 0; i < request.body.tickets.length; i++) {
      request.body.tickets[i].position = i
    }
    var tables = request.body.tickets
    if (tables.length == 0) {
      instance.Tables.deleteMany({
        organization: admin.organization,
        service: service
      }, (err) => {
        reply.ok()
        if (err) {
          instance.send_Error('deleting tables', JSON.stringify(err))
        }
      })
    }
    else {
      instance.Tables.find({
        organization: admin.organization,
        service: request.body.service
      }, (err, tables) => {
        var tableObj = {}
        for (var t of tables) {
          tableObj[t._id] = true
        }
        var delete_tables = []
        var update_tables = []
        var create_tables = []
        for (var t of request.body.tickets) {
          if (tableObj[t._id]) {
            update_tables.push(t)
            tableObj[t._id] = false
          }
          else {
            t.organization = admin.organization
            t.service = request.body.service
            create_tables.push(t)
          }
        }
        for (var t of tables) {
          if (tableObj[t._id]) {
            delete_tables.push(t._id)
          }
        }
        instance.Tables.deleteMany({
          _id: {
            $in: delete_tables
          }
        }, (err) => {
          if (err) {
            instance.send_Error('deleting tables', JSON.stringify(err))
          }
          instance.Tables.insertMany(create_tables, (err) => {
            if (err) {
              instance.send_Error('creating tables', JSON.stringify(err))
            }
            for (var t of update_tables) {
              update_table(t)
            }
            instance.Tables.find({
              organization: admin.organization,
              service: request.body.service
            }, (err, tables) => {
              reply.ok(tables)
              if (err) {
                instance.send_Error('finding tables', JSON.stringify(err))
              }
            }).sort({ position: 1 })
          })
        })
      })
    }
  }

  instance.post('/table/update_group', options.version, (request, reply) => {

    instance.oauth_admin(request, reply, (admin) => {
      update_tables(request, reply, admin)
    })
  })

  next()
}