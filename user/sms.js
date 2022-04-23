const fp = require('fastify-plugin');
const { default: axios } = require('axios');
const sms_axios = require('axios')

async function sendViaPlayMobile(instance, phone_number, otp) {
  const sms_id = await instance.CounterModel.getValue('invan_sms');
  const data = {
    messages: [
      {
        recipient: `${phone_number}`,
        'message-id': `invan${sms_id}`,
        sms: {
          originator: "3700",
          content: {
            text: `${otp} — код для входа на invan. Никому не говорите код!`
          }
        }
      }
    ]
  }
  const username = process.env.PLAY_MOBILE_USERNAME;
  const password = process.env.PLAY_MOBILE_PASSWORD;
  const token = Buffer.from(`${username}:${password}`, 'utf8').toString('base64');

  const headers = { headers: { Authorization: 'Basic ' + token } }
  return await sms_axios.post(process.env.PLAY_MOBILE_URL, data, headers);
}

module.exports = fp((instance, _, next) => {

  instance.decorate('sending_sms_code', async (phone_number, sms_code, user = 'user', organization = {}) => {
    console.log(sms_code);
    const time = parseInt((new Date().getTime()) / 1000)
    const data = {
      utime: time,
      username: "aktivcargo",
      service: {
        service: 1
      },
      message: {
        smsid: 102,
        phone: `${phone_number}`,
        text: `InVan uchun maxfiy kod: ${sms_code}`
      }
    }

    try {
      const URL = `https://api.telegram.org/bot${process.env.BOT_TOKEN}`
        + `/sendMessage?chat_id=${process.env.SMSCHANNEL}&parse_mode=html&text=${tgText}`

      const tgText = `<b>${sms_code}</b> is Sms code of ${phone_number} ${user}\n\nOrganization: ${organization.name}`
      await axios.get(URL, {}).catch(err => { })
      phone_number = phone_number.replace('+', '')
      await sendViaPlayMobile(instance, phone_number, sms_code);
      await axios.post(`https://confirmation.tiinco.uz/send_sms`, {
        phone_number: phone_number,
        sms_code: sms_code,
        organization_name: organization.name ? organization.name : '',
      })
        .catch(err => { })
    }
    catch (error) {
      console.log(error)
    }


    // to telegram bot

    try {
      delete axios.defaults.headers.common['Accept-Version'];
      await axios.post(
        process.env.SEND_MESSAGE_WITH_BOT_URL,
        {
          phone_number: phone_number,
          message: `Maxfiy kod: ${sms_code}`
        }, {});
    } catch (error) {
      console.log(error.message)
      try {
        const res = await axios.post(
          'http://78.47.65.151:3007/send/message',
          {
            phone_number: phone_number,
            message: `Maxfiy kod: ${sms_code}`
          }, {});
        if (res) {
          console.log('Done')
        }
      } catch (error) {
        console.log(error.message)
      }
    }
  })
  instance.decorate('sending_sms_code_success', async (user = {}, organization = {}) => {

    var our_numbers = []

    const tgText = `<b>Success login</b>\nPhone: ${user.phone_number} \nName: ${user.name}\n\n${organization.name}`
    if (our_numbers.includes(user.phone_number) == false) {
      try {

        // try {
        await axios.get(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage?chat_id=${process.env.SMSCHANNEL}&parse_mode=html&text=${tgText}`, {})
        // } catch (error) { }
        // phone_number = phone_number.replace('+', '')
        // await sendViaPlayMobile(instance, phone_number, sms_code);
      }
      catch (error) {
        console.log(error)
      }
    }
    else {
      try {
        await axios.get(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage?chat_id=${process.env.SMSCHANNEL}&parse_mode=html&text=${tgText}`, {})
      } catch (error) { }
    }
  })
  next()
})
