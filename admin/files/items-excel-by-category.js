
const fs = require("fs");
const json2xls = require("json2xls");

async function itemsCsvByCategory(request, reply, instance) {
    try {
        const { token } = request.params;
        const user = await instance.User.findOne({ admin_token: token });
        if (!user) {
            return reply.error('Access!')
        }

        if (user.ui_language && user.ui_language.value != undefined) {
            instance.i18n.setLocale(user.ui_language.value)
        }

        const { organization, category } = request.params;
        const categories = await instance.get_child_category(category);
        categories.push(category);
        const items = await instance.goodsSales.find({
            organization: organization,
            category: {
                $in: categories
            }
        });
        const items_excel_arr = [];
        for (const it of items) {
            items_excel_arr.push({
                [`${instance.i18n.__('sku')}`]: it.sku,
                [`${instance.i18n.__('name')}`]: it.name
            })
        }
        const xls = json2xls(items_excel_arr);
        const timeStamp = new Date().getTime();
        await fs.writeFileSync(`./static/items-${timeStamp}.xls`, xls, "binary");
        reply.sendFile(`./items-${timeStamp}.xls`);
        setTimeout(() => {
            fs.unlink(`./static/items-${timeStamp}.xls`, (err) => {
                if (err) {
                    instance.send_Error(
                        "exported file",
                        JSON.stringify(err)
                    );
                }
            });
        }, 2000);

    } catch (error) {
        reply.error(error.message)
    }
    return reply;
}

module.exports = ((instance, _, next) => {

    instance.get(
        '/item-by-category/excel/:token/:organization/:category/:name',
        (request, reply) => {
            return itemsCsvByCategory(request, reply, instance)
        }
    )

    next()
})
