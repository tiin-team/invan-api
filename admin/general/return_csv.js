const fp = require('fastify-plugin');
const fs = require('fs');

module.exports = fp((instance, options, next) => {

  instance.decorate('send_csv', (array=[], name='', reply) => {
    const CSVString = array.join('\n');
    var file = new Date().getTime()+name+'_export.csv'
    fs.writeFile('./static/' + file, CSVString, (err) => {
      if (err) {
        instance.send_Error('writing to file', JSON.stringify(err))
      }
      reply.sendFile('./'+file, (err) => {
        if(err) {
          instance.send_Error('on sending file', JSON.stringify(err))
        }
      })
      setTimeout(() => {
        fs.unlink('./static/'+file, (err) => {
          if(err) {
            instance.send_Error('exported '+name+' file', JSON.stringify(err))
          }
        })
      }, 1000)
    });
  })

  instance.decorate('make_beauty_for_export', (request, reply, callback) => {
    request.headers = {
      'authorization': request.params.token,
      'accept-user': 'admin'
    }
    if(request.params.services){
      request.params.services = request.params.services.split('[').join('').split(']').join('').split('\'').join('').split('"').join('').split('`')
    }
    if(request.params.employees){
      request.params.employees = request.params.employees.split('[').join('').split(']').join('').split('\'').join('').split('"').join('').split('`')
    }
    if(request.params.reasons){
      request.params.reasons = request.params.reasons.split('[').join('').split(']').join('').split('\'').join('').split('"').join('').split('`')
    }
    if(request.params.categories){
      request.params.categories = request.params.categories.split('[').join('').split(']').join('').split('\'').join('').split('"').join('').split('`')
    }
    var services = []
    if(request.params.services){
      for(var s of request.params.services) {
        if(s != '') {
          services.push(s)
        }
      }
    }
    var employees = []
    if(request.params.employees){
      for(var s of request.params.employees) {
        if(s != '') {
          employees.push(s)
        }
      }
    }
    var reasons = []
    if(request.params.reasons){
      for(var s of request.params.reasons) {
        if(s != '') {
          reasons.push(s)
        }
      }
    }
    var categories = []
    if(request.params.categories){
      for(var s of request.params.categories) {
        if(s != '') {
          categories.push(s)
        }
      }
    }
    request.body = {
      services: services,
      employees: employees,
      reasons: reasons,
      categories: categories,
      custom: request.params.custom=='true',
      start: request.params.start,
      end: request.params.end
    }
    callback(request, reply)
  })

  next()
})