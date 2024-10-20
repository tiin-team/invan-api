const fp = require("fastify-plugin");

module.exports = fp((instance, _, next) => {
  instance.decorate("get_child_category", async (id) => {
    try {
      const categories = await instance.goodsCategory.find({ type: id }).lean();
      if (categories.length == 0) {
        return [];
      }

      let answer = [];
      for (const cat of categories) {
        answer.push(cat._id + "");
      }
      for (const cat of categories) {
        answer = answer.concat(await instance.get_child_category(cat._id));
      }

      return answer;
    } catch (err) {
      return [];
    }
  });

  next();
});
