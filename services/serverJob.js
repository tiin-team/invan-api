
const cronJob = require('node-cron');
const axios = require('axios');
const os = require("os");

const sendNotify = async function (instance) {
    try {
        if (!process.env.BOT_TOKEN) {
            return
        }
        const used_memory = Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100;
        const freeRAM = Math.round(os.freemem() / 1024 / 1024 * 100) / 100;
        await axios.get(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage?chat_id=569942658&parse_mode=html&text=Used memory: ${used_memory} MB\nFree RAM: ${freeRAM} MB`, {})
        await axios.get(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage?chat_id=270852337&parse_mode=html&text=Working fine!`, {})
        instance.log.info(`Send`)
    } catch (error) {
        instance.log.error(error.message)
    }
}

module.exports = ((instance, _, next) => {

    // const cronString = '*/50 * * * * *';
    // if (!cronJob.validate(cronString)) {
    //     instance.log.error('Invalid CRON_TIME is specified:', cronString);
    //     process.exit(1);
    // }

    // cronJob.schedule(cronString, () => {
    //     sendNotify(instance)
    // })

    next()
})
