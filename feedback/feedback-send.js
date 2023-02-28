
const cronJob = require('node-cron');
const axios = require('axios');

const sendFeedback = async function(instance) {
    try {
        if(!process.env.BOT_TOKEN) {
            return
        }
        const feedbacks = await instance.desktopFeedback.find({send_to_channel: {$ne: true}}).sort({updatedAt: 1}).limit(2);
        for(const f of feedbacks) {
            try {
                try {
                    await axios.get(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage?chat_id=${process.env.FEEDBACKGROUP}&text=Created At: ${instance.date_ddmmyy_hhmm(f.createdAt+3*60*60*1000)}\nDevice Info: ${f.device_info}\n\nComment: ${f.comment}`, {})
                }
                catch(error) {}
                
                await axios.get(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendDocument?chat_id=${process.env.FEEDBACKGROUP}&document=http://api.r.invan.uz/static/${f.file_path}`, {})
                
                await instance.desktopFeedback.updateOne(
                    { _id: f._id },
                    {
                        $set: {
                            send_to_channel: true
                        }
                    }
                );
            } catch (error) {}
            
            await instance.desktopFeedback.updateOne(
                { _id: f._id },
                {
                    $set: {
                        updatedAt: new Date().getTime()
                    }
                }
            );
        }
    } catch (error) {
        instance.log.error(error.message)
    }
}

module.exports = ((instance, _, next) => {

    const cronString = '*/50 * * * * *';
    if(!cronJob.validate(cronString)) {
        instance.log.error('Invalid CRON_TIME is specified:', cronString);
        process.exit(1);
    }

    cronJob.schedule(cronString, () => {
        sendFeedback(instance)
    })

    next()
})
