
const fp = require('fastify-plugin')

module.exports = fp((instance, _, next) => {

    instance.decorate('calculate_category_count', async (category, service_id) => {
        const categories = [category._id].concat(await instance.get_child_category(category._id))
        const count = await instance.goodsSales.countDocuments({
            category: {
                $in: categories
            },
            item_type: 'item',
            services: {
                $elemMatch: {
                    service: {
                        $eq: service_id
                    },
                    available: {
                        $eq: true
                    }
                }
            }
        })
        try {
            category = category.toObject()
        }
        catch(error) {
        instance.send_Error('to Object', error.message)
        }
        category.count = count
        return category
    })

    instance.decorate('get_root', async (id, organization, count = 0) => {
        if (count > 6) {
            return id
        }
        try {
            const category = await instance.CategoryGoods.findOne({ _id: id })

            if (!category) {
                try {
                    const other_category = await instance.CategoryGoods.findOne({ organization: organization, is_other: true })
                    if (!other_category) {
                        return id
                    }
                    return other_category._id
                } catch (error) {
                    return id
                }
            }

            if (category.type == 'top') {
                return category._id
            }

            return await instance.get_root(category.type, organization, ++count)

        } catch (error) {
            return id
        }
    })
    next()
})
