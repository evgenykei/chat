const config = require('config'),
      util   = require('util');

const sendSMSAddress      = 'https://sms.ru/sms/send',
      registerCallAddress = 'https://sms.ru/callcheck/add',
      checkCallAddress    = 'https://sms.ru/callcheck/status';

const APIKey  = config.get('SMSAuth.apiKey'),
      SMSText = config.get('SMSAuth.smsText');

/**
 * Generates four-digit random authentication SMS code.
 * 
 * @return {string} Authentication SMS code.
 */
function generateSMSCode() {
    let code = Math.floor(Math.random() * (9999 + 1)).toString();
    return '0'.repeat(4 - code.length) + code;
}

/**
 * Sends SMS authentication code to specified number.
 * 
 * @param  {string} phoneNumber Phone number to request SMS with authentication code.
 * @param  {string} SMSCode Authentication SMS code.
 * 
 * @return {boolean} Indicates whether the SMS was sent.
 */
async function sendSMSCode(phoneNumber, SMSCode) {    
    try {
        let query = await superagent
            .get(sendSMSAddress)
            .query({ api_id: APIKey, to: phoneNumber, msg: util.format(SMSText, SMSCode), json: 1 });

        if (query.body.status === 'OK') return true;
        else {
            throw new Error(query.body.status_text);
        }
    }
    catch(err) {
        console.log('SMS.ru API ERROR: ' + err.message);
        return false;
    }
}

/**
 * Registers authentication call request.
 * 
 * @typedef {Object} Result
 * @property {string} checkId Identification number of call request.
 * @property {string} prettyPhone Prettified phone number.
 * 
 * @param  {string} phoneNumber Phone number to authenticate via call.
 * 
 * @return {?Result} Prettified phone number or null in case of error.
 */
async function registerCall(phoneNumber) {
    try {
        let query = await superagent
            .get(registerCallAddress)
            .query({ api_id: APIKey, phone: phoneNumber, json: 1 });

        if (query.body.status === 'OK') return {
            checkId: query.body.check_id,
            prettyPhone: query.body.call_phone_pretty
        };
        else throw new Error(query.body.status_text);
    }
    catch(err) {
        console.log('SMS.ru API ERROR: ' + err.message);
        return null;
    }
}

/**
 * Checks authentication call request status.
 * 
 * @param  {string} checkId Identification number of call request.
 * 
 * @return {boolean} Indicates whether the call request was confirmed.
 */
async function checkCall(checkId) {
    try {
        let query = await superagent
            .get(checkCallAddress)
            .query({ api_id: APIKey, check_id: checkId, json: 1 });

        if (query.body.status !== 'OK') throw new Error(query.body.status_text);
        if (query.body.check_status === 401) return true;
        else throw new Error(query.body.check_status_text);
    }
    catch(err) {
        return false;
    }
}

module.exports = {
    generateSMSCode,
    sendSMSCode,
    registerCall,
    checkCall
}