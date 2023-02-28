
const fs = require('fs')

module.exports = ((instance, _, next) => {

  instance.post(
    '/upload-feedback',
    { version: '1.1.0' },
    async (request, reply) => {
      try {
        const archive = request.raw.files['archive']
        const body = request.raw.body
        const path = new Date().getTime() + archive.md5 + archive.name
        var wstream = fs.createWriteStream('./static/' + path);
        wstream.write(archive.data)
        wstream.end()
        const { _id: id } = await new instance.desktopFeedback({
          file_path: path,
          comment: body.comment,
          device_info: body.device_info,
          createdAt: new Date().getTime()
        }).save()
        reply.ok({ id })
      } catch (error) {
        reply.error(error.message)
      }
      return reply;
    }
  );

  next()
})
