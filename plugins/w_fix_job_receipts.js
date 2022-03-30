
const cronJob = require('node-cron')

const startCron = async (instance) => {
  const cronString = '*/5 * * * * *';

  if (!cronJob.validate(cronString)) {
    instance.log.error('Invalid CRON_TIME is specified:', cronString);
    return
  }

  let receiptsCount = 0;

  cronJob.schedule(cronString, async () => {
    const recepits = await instance.Receipts.find({
      // organization: "5de900980d6a873b3db4e4d9"
      organization: "5f5614e866ac2076da3bd4bf",
      receipt_type: "debt"
    }).sort({ _id: -1 }).skip(receiptsCount).limit(15);
    
    console.log(receiptsCount)
    console.log(recepits.length)
    for (const r of recepits) {
      const sold_item_list = []
      for (const s of r.sold_item_list) {
        if(s.sold_item_type == 'pcs_item') {
          if(!s.count_by_type) {
            s.count_by_type = 1;
          }
          if(!s.reminder) {
            s.reminder = 0
          }
          if(!s.total_discount) {
            s.total_discount = 0
          }
          if(!s.paid_value) {
            s.paid_value = 0;
          }
          if(!s.paid_reminder) {
            s.paid_reminder = 0;
          }
          s.total_debt = (s.value + s.reminder / s.count_by_type) * s.price - s.total_discount;
          s.total_paid_debt = (s.paid_value + s.paid_reminder / s.count_by_type) * s.price;
        }
        else {
          s.total_debt = s.value * s.price - s.total_discount;
          s.total_paid_debt = s.paid_value * s.price;
        }
        sold_item_list.push(s);
      }
      try {
        await instance.Receipts.updateOne(
          { _id: r._id },
          {
            $set: {
              sold_item_list: sold_item_list
            }
          }
        )
        console.log('Updated...')
      } catch (error) {
        instance.log.error(error.message)
      }
    }
    receiptsCount += 5;
  })
}

module.exports = ((instance, _, next) => {

  // startCron(instance);

  next()
})
