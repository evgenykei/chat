const config         = require('config'),
      validatePhone  = require('libphonenumber-js');
      
const smsAuth        = require('../smsRuAuth'),
      fileModule     = require('./fileModule'),
      menuModule     = require('../menu'),
      langModule     = require('./langModule');

const callConfirmationCheckInterval = config.get('Timers.callConfirmationCheckInterval'),
      callConfirmationTimeout       = config.get('Timers.callConfirmationTimeout'),
      verificationDelay             = config.get('Timers.verificationDelay');

function onConnection(socket) {
    fileModule.initialize(socket);
    langModule.initialize(socket);

    //Verify phone number
    socket.on('verifyReq', async function(data) {
        let phone = data.phone, type = data.type;
        if (socket.isAuth()) return;
    
        //Delay for verification
        let delay = socket.timeoutLeft('verificationDelay');
        if (delay !== 0)
            return socket.emit('verifyFail', { text: 'status.verificationTooManyRequests', args: [ delay ] });

        //Stop checking call authentication
        socket.clearInterval('refresh_call');
    
        //Validate input
        phone = phone.toString();
        if (phone[0] !== '+') phone = '+' + phone;
        if (phone) phone = validatePhone.parseNumber(phone.toString()).phone;
        if (!phone) return socket.emit('verifyFail', { text: 'status.verificationInvalidPhone' });
        if (type !== 'sms' && type !== 'call') return socket.emit('verifyFail', { text: 'status.verificationWrongType' });
        
        //Generate authentication code and save credentials
        let code = smsAuth.generateSMSCode();
        socket.set('phone', phone);
        socket.set('code', code);
                
        //Auth using SMS
        if (type === 'sms') {            
            /*if (smsAuth.sendSMSCode(phone, code)) {
                socket.emit('verifyConfirm', { langObj: { text: 'status.verificationSMSSent' }, type: type, phone: phone, code: null });
                socket.setTimeout('verificationDelay', verificationDelay);
            }
            else socket.emit('verifyFail', { text: 'status.verificationServerError' });*/
            socket.emit('verifyConfirm', { langObj: { text: 'status.verificationSMSSent' }, type: type, phone: phone, code: code });
            socket.setTimeout('verificationDelay', verificationDelay);
        }
        
        //Auth using call
        else if (type === 'call') {
            let result = await smsAuth.registerCall(phone);
            if (!result) return socket.emit('verifyFail', { text: 'status.verificationServerError' });

            socket.setTimeout('verificationDelay', verificationDelay);
    
            socket.setInterval('refresh_call', async function() {
                if (await smsAuth.checkCall(result.checkId) === false) return;
    
                socket.emit('verifyConfirm', { langObj: { text: 'status.verificationCallConfirmed' }, type: type, phone: phone, code: code });
                socket.clearInterval('refresh_call');                
            }, callConfirmationCheckInterval * 1000, callConfirmationTimeout * 1000);
    
            socket.emit('verifyConfirm', { langObj: { text: 'status.verificationCall', args: [ result.prettyPhone ] }, type: type, phone: phone, code: null }); 
        }
    });

    //Authenticate user using code
    socket.on('joinReq', async function(code) {
        if (socket.isAuth()) return;
    
        var phone = socket.get('phone');
        
        if (!phone) return socket.emit('joinFail', { text: 'status.joinPhoneNotConfirmed' });
        if (code !== socket.get('code')) return socket.emit('joinFail', { text: 'status.joinWrongConfirmationCode' });
    
        //set socket password
        socket.auth(phone, code);

        //Confirm join
        socket.emit('joinConfirm');

        //send menu and welcome message
        socket.sendChatData({ type: 'text', value: { text: 'message.welcome' }});
    }); 

    //Emit chat message
    socket.on('textSend', async function(msg) {
        if (!socket.isAuth()) return;
    
        let decrypted = socket.decrypt(msg);
        if (decrypted) {
            socket.sendChatData({ type: 'text', value: decrypted, from: socket.get('phone') });

            //Check message hook
            if (socket.checkChatHook(decrypted) === true) return;

            //Classify message and call class menu
            let className = await menuModule.getClassName(decrypted);
            let classMenu = menuModule.menuByClass(className);

            ///TEMPORARY
            socket.sendChatData({ type: 'class', value: 'Message class: ' + className })
            ///
            
            if (classMenu) socket.sendChatData(await classMenu(socket));
        }
    });

    //Execute button action
    socket.on('buttonAction', async function(data) {
        try {
            if (!socket.isAuth()) return;

            data = JSON.parse(socket.decrypt(data));
            if (!data.action || !menuModule.action(data.action)) return;

            let result = await menuModule.action(data.action)(socket, data.target);
            result.target = data.target;
            if (result) socket.sendChatData(result);
        }
        catch (err) {
            console.log("Error during menu action: " + err);
        }
    });

    //Try to restore session
    socket.on('restoreSession', function(data) {
        socket.restoreSession(data.phone, data.code);
    });

    //Save session and destroy socket object
    socket.on('disconnect', function() {
        socket.saveSession();
        socket.destroy();
    });
}

module.exports.initialize = async function(server) {
    //Initializing related modules
    await menuModule.initialize();

    let io = require('socket.io').listen(server);
    io.use(require('./functionsMiddleware'));
    io.sockets.on('connection', onConnection);
}