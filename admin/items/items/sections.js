module.exports = (instance, _, next) => {
  var version = { version: '1.0.0' }

  // get categories list

  var list_of_sections = (request, reply, admin) => {
    instance.goodsSection.aggregate([
      {
        $match: {
          organization: admin.organization,
          is_other: false
        }
      },
      {
        $lookup: {
          from: 'goodscategories',
          localField: '_id',
          foreignField: 'section_id',
          as: 'categories'
        }
      }
    ], (err, sections) => {
      if (err || sections == null) {
        sections = []
      }
      var total = sections.length
      var limit = parseInt(request.params.limit)
      var page = parseInt(request.params.page)
      sections = sections.splice(limit * (page - 1), limit)
      for (let i = 0; i < sections.length; i++) {
        sections[i].count = sections[i].categories.length
        delete sections[i].categories
        delete sections[i].service
      }
      reply.ok({
        total: total,
        page: Math.ceil(total/limit),
        data: sections
      })
    })
  }

  instance.get('/items/list_of_sections/:limit/:page', version, (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      list_of_sections(request, reply, admin)
    })
  })

  // create section

  var create_section = (request, reply, admin) => {
    var name = request.body.name
    if(name)
      instance.goodsSection.find({
        organization: admin.organization,
        name: name
      }, (err,sectn) => {
        if(err || sectn == null) {
          var sectModel = instance.goodsSection(Object.assign({
                      organization: admin.organization
                    }, request.body))
          sectModel.save((err) => {
            if(err) {
              reply.error('Error on saving')
            }
            else {
              reply.ok()
              instance.push_to_organization(110, admin.organization)
            }
          })
        }
        else {
          reply.send({
            statusCode: 411,
            message: 'discount Allready exist'
          })
        }
      })
    else {
      reply.error('Error on saving')
    }
  }

  instance.post('/items/list_of_sections/create', version, (request, reply) => {
    instance.oauth_admin(request, reply, (admin) => {
      create_section(request, reply, admin)
    })
  })

  next()
}