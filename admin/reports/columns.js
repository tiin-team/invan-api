module.exports = ((instance, options, next) => {

  // summary
  // get table columns

  instance.get('/summary/columns/get', options.version, (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      instance.summaryTable.findOne({
        organization: admin.organization
      }, (err, column) => {
        if (column) {
          reply.ok(column)
        }
        else {
          reply.error('Not Found')
        }
      })
    })
  })

  // update columns

  instance.post('/summary/columns/update', options.version, (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      instance.summaryTable.updateOne({
        organization: admin.organization
      }, {
        $set: request.body
      }, (err) => {
        if (err) {
          reply.error('Error on updating')
          instance.send_Error('updating summary table', JSON.stringify(err))
        }
        else {
          reply.ok()
        }
      })
    })
  })

  // by item
  // get column
  instance.get('/item/columns/get', options.version, (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      instance.by_itemTable.findOne({
        organization: admin.organization
      }, (err, column) => {
        if (column) {
          reply.ok(column)
        }
        else {
          reply.error('Not Found')
        }
      })
    })
  })

  // update columns

  instance.post('/item/columns/update', options.version, (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      instance.by_itemTable.updateOne({
        organization: admin.organization
      }, {
        $set: request.body
      }, (err) => {
        if (err) {
          reply.error('Error on updating')
          instance.send_Error('updating summary table', JSON.stringify(err))
        }
        else {
          reply.ok()
        }
      })
    })
  })

  // by category
  // get column
  instance.get('/category/columns/get', options.version, (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      instance.by_categoryTable.findOne({
        organization: admin.organization
      }, (err, column) => {
        if (column) {
          reply.ok(column)
        }
        else {
          reply.error('Not Found')
        }
      })
    })
  })

  // update columns

  instance.post('/category/columns/update', options.version, (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      instance.by_categoryTable.updateOne({
        organization: admin.organization
      }, {
        $set: request.body
      }, (err) => {
        if (err) {
          reply.error('Error on updating')
          instance.send_Error('updating summary table', JSON.stringify(err))
        }
        else {
          reply.ok()
        }
      })
    })
  })

  next()
})