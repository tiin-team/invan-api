module.exports = (instance, options, next) => {
    const version = { version: '1.0.0' };
    // get top categories 
    instance.get('/items/draggable/list_of_top_categories', version, (request, reply) => {
        instance.oauth_admin(request, reply, (admin) => {
            instance.goodsCategory.find({ organization: admin.organization, type: 'top' }, (_, categories) => {
                if (!categories) {
                    categories = []
                }
                reply.ok(categories)
            })
        })
    })

    // get categories list

    function return_subs(array, item, i) {
        item.name = item.name.split('')
        if ([item.name[0], item.name[1], item.name[2]].join('') !== '-->') {
            item.name = item.name.join('')
            array.push(item)
            return array
        }
        else {
            item.name.shift()
            item.name.shift()
            item.name.shift()
            item.name = item.name.join('')
            return return_subs(array[array.length - 1].children, item, i)
        }
    }

    const list_of_categories = (request, reply, admin) => {
        const limit = parseInt(request.params.limit)
        let valid = false
        if (!request.params.page) {
            valid = true
        }
        const page = parseInt(request.params.page)
        let query = {
            __v: 0,
            parent_categories: 0
        }
        const get_query = {
            organization: admin.organization
        }
        get_query.type = 'top'
        if (valid) {
            query = {
                name: 1,
                type: 1,
                position: 1,
                item_tree: 1,
                categories: 1,
                color: 1,
                children: 1,
                parent: 1
            }
        }

        instance.goodsCategory.find(
            get_query,
            // {
            //   $lookup: {
            //     from: 'goodssales',
            //     localField: '_id',
            //     foreignField: 'category_id',
            //     as: 'goods'
            //   },
            // },
            // {
            //   $lookup: {
            //     from: 'services',
            //     localField: '_id',
            //     foreignField: 'category_id',
            //     as: 'children'
            //   },
            // },
            query, (err, categories) => {
                if (err || categories == null) {
                    categories = []
                }
                // for (let i = 0; i < categories.length; i++) {
                //   if (categories[i].item_tree) {
                //     categories[i].children = []
                //   }
                //   else {
                //     delete categories[i].children
                //   }
                // }
                for (let i = 0; i < categories.length; i++) {
                    try {
                        categories[i] = categories[i].toObject()
                    } catch (error) { }
                    if (categories[i].item_tree) {
                        categories[i].children = []
                    }
                }
                var total = categories.length
                var cats = categories
                var answer = []
                var catObj = {}
                // for(let i=0; i<cats.length; i++) {
                //   catObj[cats[i]._id] = cats[i].name
                // }
                // for(let i=0; i<cats.length; i++) {
                //   if(cats[i].type != 'top') {
                //     cats[i].parent = catObj[cats[i].type]
                //   }
                //   else {
                //     cats[i].parent = 'Top'
                //   }
                //   var prob = "";
                //   if(cats[i].position == undefined) {
                //     cats[i].position = '0'
                //   }
                //   for(let t=0; t<(cats[i].position.length-1); t++) {
                //     prob = prob + "-->";
                //   }
                //   cats[i].name = prob + cats[i].name;
                //   return_subs(answer, cats[i], i)
                // }
                if (page) {
                    total = answer.length
                    answer = answer.splice(limit * (page - 1), limit)
                    // for (let i = 0; i < answer.length; i++) {
                    //   if (answer[i].goods)
                    //     answer[i].count = answer[i].goods.length
                    //   delete answer[i].goods
                    // }
                    reply.ok({
                        total: total,
                        page: Math.ceil(total / limit),
                        data: answer
                    })
                }
                else {
                    reply.ok(categories)
                }
            })
    }

    instance.get('/items/draggable/list_of_categories/:limit/:page', version, (request, reply) => {
        instance.oauth_admin(request, reply, (admin) => {
            list_of_categories(request, reply, admin)
        })
    })

    instance.get('/items/draggable/list_of_categories', version, (request, reply) => {
        instance.oauth_admin(request, reply, (admin) => {
            list_of_categories(request, reply, admin)
        })
    })

    // get sub categories

    const get_sub_category = (request, reply, admin) => {
        instance.goodsCategory.find({
            organization: admin.organization,
            type: request.params.id
        }, (_, cats) => {
            if (cats == null) {
                cats = []
            }
            for (let i = 0; i < cats.length; i++) {
                try {
                    cats[i] = cats[i].toObject()
                }
                catch (error) {
                    instance.send_Error('to Object', error.message)
                }
                if (cats[i].item_tree) {
                    cats[i].children = []
                }
                else {
                    delete cats[i].children
                }
            }
            reply.ok(cats)
        })
    }

    instance.get('/items/draggable/get/sub_categories/:id', options.version, (request, reply) => {
        instance.oauth_admin(request, reply, (admin) => {
            get_sub_category(request, reply, admin)
        })
    })

    // create category

    function get_next(str) {
        var s = '';
        for (let i = 0; i < str.length - 1; i++) {
            s = s + str[i];
        }
        s = s + String.fromCharCode(str[str.length - 1].charCodeAt() + 1)
        return s
    }

    const create_category = (request, reply, admin) => {
        var name = request.body.name
        if (name) {
            instance.goodsCategory.findOne({
                organization: admin.organization,
                name: name
            }, (err, categ) => {
                if (err || categ == null) {
                    var catModel = instance.goodsCategory(Object.assign({
                        organization: admin.organization
                    }, request.body))

                    catModel.save(async () => {
                        try {
                            await instance.goodsCategory.updateOne({
                                _id: catModel.type
                            }, {
                                $set: {
                                    item_tree: true
                                }
                            })
                        } catch (err) { }
                        reply.ok()
                        instance.push_to_organization(103, admin.organization)
                    })
                    /*
                      instance.goodsCategory.find({
                        organization: admin.organization,
                        type: catModel.type
                      }, (_, sub_cats) => {
                        if (sub_cats == null) {
                          sub_cats = []
                        }
                        instance.goodsCategory.findOne({
                          _id: catModel.type
                        }, (_, sub_cat) => {
                          if (sub_cat) {
                            if (sub_cats.length == 0) {
                              sub_cats.push({
                                position: sub_cat.position + '0'
                              })
                            }
                            // sub_cat.parent_categories.push({
                            //   category_id: instance.ObjectId(sub_cat._id),
                            //   category_name: sub_cat.name,
                            // })
                            // catModel.parent_categories = sub_cat.parent_categories
                            catModel.position = get_next(sub_cats[sub_cats.length - 1].position)
                          }
                          else {
                            if (sub_cats.length > 0) {
                              catModel.position = get_next(sub_cats[sub_cats.length - 1].position)
                            }
                          }
                          catModel.save((err) => {
                            if (err) {
                              reply.error('Error on saving')
                            }
                            else {
                              reply.ok()
                              instance.push_to_organization(103, admin.organization)
                              instance.check_sub_category(catModel._id, catModel.type)
                              if (sub_cat) {
                                instance.goodsCategory.updateOne({
                                  _id: sub_cat._id
                                }, {
                                  $set: {
                                    item_tree: true
                                  }
                                }, (err) => {
                                  if (err) {
                                    instance.send_Error('sub update', JSON.stringify(err))
                                  }
                                })
                              }
                            }
                          })
                        })
                      }).sort({
                        position: 1
                      })
                      */
                }
                else {
                    // instance.goodsCategory.updateOne({
                    //   _id: categ._id
                    // }, {
                    //   $set: request.body
                    // }, () => {

                    // })
                    reply.send({
                        statusCode: 411,
                        message: 'category Allready exist'
                    })
                }
            })
        }
        else {
            reply.error('Error on saving')
        }
    }

    instance.post('/items/draggable/list_of_categories/create', version, (request, reply) => {
        instance.oauth_admin(request, reply, (admin) => {
            create_category(request, reply, admin)
        })
    })

    const moderator_list_of_categories = (request, reply, admin) => {
        const $match = {
            organization: admin.organization,
            type: 'top',
        }
        const $project = {
            name: 1,
            type: 1,
            position: 1,
            draggable_position: 1,
            item_tree: 1,
            categories: 1,
            color: 1,
            children: 1,
            image: 1,
            parent: 1,
            type: 1,
            // __v: 0,
            // parent_categories: 0
        }
        const $lookup = {
            from: 'goodscategories',
            let: { id: { $toString: "$_id" } },
            pipeline: [
                {
                    $match: {
                        // "$type": "$$id"
                        $expr: { $eq: ["$type", "$$id"] }
                    }
                },
                // {
                //     $project: {
                //         _id: 1,
                //         name: 1,
                //         draggable_position: 1,
                //         image: 1,
                //     }
                // }
            ],
            as: 'children'
            // localField: '_id',
            // foreignField: 'type',
        }

        instance.goodsCategory.aggregate(
            [
                { $match: $match },
                { $lookup: $lookup },
                { $project: $project },
                { $sort: { draggable_position: -1 } }
            ],
            /**
             * 
             * @param {Error} err 
             * @param {any[]} categories 
             */
            (err, categories) => {
                // console.log(err, categories);
                if (err || categories == null) {
                    categories = []
                }

                const realStaticApi = 'https://pos.in1.uz/api/static/'

                reply.ok(categories.map(category => ({
                    ...category,
                    image: category.image
                        .replace('http://api.invan.uz/static/', realStaticApi)
                        .replace('https://api.invan.uz/static/', realStaticApi)
                        .replace('http://pos.in1.uz/api/static/', realStaticApi)
                        .replace('http://pos.inone.uz/api/static/', realStaticApi)
                        .replace('https://pos.inone.uz/api/static/', realStaticApi)
                })))
                // {
                //     success: true,
                //     total: categories.length,
                //     data: categories
                // })
            }
        )
    }

    const moderator_list_of_categories_update = async (request, reply, admin) => {
        const body = request.body;

        for (const cat of body) {
            if (cat._id)
                await instance.goodsCategory.findByIdAndUpdate(
                    cat._id,
                    { $set: { draggable_position: cat.draggable_position } }
                )
                    .catch(err => { })
        }

        return moderator_list_of_categories(request, reply, admin)
    }

    instance.get('/moderator/items/draggable/list_of_categories', { version: '2.0.0' }, (request, reply) => {
        instance.oauth_admin(request, reply, (admin) => {
            moderator_list_of_categories(request, reply, admin)
        })
    })
    instance.put('/moderator/items/draggable/list_of_categories/update', { version: '2.0.0' }, (request, reply) => {
        instance.oauth_admin(request, reply, (admin) => {
            moderator_list_of_categories_update(request, reply, admin)
        })
    })
    next()
}