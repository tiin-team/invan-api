const os = require("os");
const fp = require("fastify-plugin");
const stream = require("stream");

module.exports = fp((instance, _, next) => {
  async function insertLog(data) {
    // return await instance.logModel.insertMany([data]).catch((err) => {});
  }

  instance.addHook("preHandler", (req, rep, done) => {
    let error_occurred = false;

    // const logData = {
    //   id: req.id,
    //   ip: req.ip,
    //   requestOn: new Date(),
    //   requestPath: req.raw.url,
    //   requestMethod: req.raw.method,
    //   requestHeader: req.headers,
    //   requestQuery: req.query,
    //   requestBody: req.body,
    //   requestUser: req.user,
    //   cookies: req.cookies,
    //   signedCookies: req.signedCookies,
    //   acceptVersion: req.headers["accept-version"],
    //   acceptUser: req.headers["accept-user"],
    // };

    // const send = rep.send;

    // rep.send = (data) => {
    //   logData.requestUser = req.user;
    //   if (
    //     data instanceof stream.Duplex ||
    //     data instanceof stream.PassThrough ||
    //     data instanceof stream.Readable ||
    //     data instanceof stream.Stream ||
    //     data instanceof stream.Transform ||
    //     data instanceof stream.Writable
    //   ) {
    //     logData.responseBody = "file";
    //   } else {
    //     logData.responseBody = data;
    //   }

    //   logData.responseOn = new Date();
    //   // const { byteLength } = Buffer.from(logData);
    //   // if (byteLength <= 16777200) {
    //   //   insertLog(logData).catch();
    //   // }

    //   return send.call(rep, data);
    // };

    try {
      console.log(req.raw.url);
      req.come_time = new Date().getTime();
      const total_memory =
        Math.round((process.memoryUsage().heapTotal / 1024 / 1024) * 100) / 100;
      const used_memory =
        Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100;
      console.log("total_memory", total_memory);
      console.log("used_memory ", used_memory);
      console.log("Accept-Version: ", req.headers["accept-version"]);
      console.log("Accept-User: ", req.headers["accept-user"]);
      console.log("Authorization: ", req.headers["authorization"]);
      const totalRAM = Math.round((os.totalmem() / 1024 / 1024) * 100) / 100;
      console.log("totalRAM", totalRAM);
      const freeRAM = Math.round((os.freemem() / 1024 / 1024) * 100) / 100;
      console.log("freeRAM", freeRAM);
      if (freeRAM < 50) {
        error_occurred = true;
        return rep.status(500).send("Not enough memory");
      }
      return done();
    } catch (error) {
      console.log(error.message);
    }
    if (!error_occurred) {
      done();
    }
  });

  instance.addHook("onResponse", (req, rep, done) => {
    try {
      const time = new Date().getTime() - req.come_time;
      console.log(
        req.raw.url,
        `${Math.round(time / 1000)} s ${time % 1000} ms`,
      );
      return done();
    } catch (error) {
      console.log(error.message);
    }
    done();
  });

  next();
});
