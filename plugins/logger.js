const os = require("os");
const fp = require("fastify-plugin");

module.exports = fp((instance, _, next) => {
  async function insertLog(data) {
    return await instance.logModel.insertMany([data]);
  }

  instance.addHook("preHandler", (req, rep, done) => {
    let error_occurred = false;

    const logData = {
      id: req.id,
      ip: req.ip,
      requestOn: new Date(),
      requestPath: req.raw.url,
      requestMethod: req.raw.method,
      requestHeader: req.headers,
      requestQuery: req.query,
      requestBody: req.body,
      requestUser: req.user,
      cookies: req.cookies,
      signedCookies: req.signedCookies,
      acceptVersion: req.headers["accept-version"],
      acceptUser: req.headers["accept-user"],
    };

    const send = rep.send;

    rep.send = (data) => {
      logData.requestUser = req.user;
      logData.responseBody = data;
      logData.responseOn = new Date();

      insertLog(logData).catch();

      return send.call(rep, data);
    };

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
