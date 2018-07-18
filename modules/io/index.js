const config         = require('config'),
      validatePhone  = require('libphonenumber-js');
      superagent     = require('superagent');
      
const smsAuth       = require('../smsRuAuth'),
      uploader      = require('./uploader'),
      buttonActions = require('../menu');

const callConfirmationCheckInterval = config.get('Timers.callConfirmationCheckInterval'),
      callConfirmationTimeout       = config.get('Timers.callConfirmationTimeout'),
      verificationDelay             = config.get('Timers.verificationDelay');

function onConnection(socket) {
    uploader.initialize(socket);

    //Verify phone number
    socket.on('verifyReq', async function onVerification(phone, type) {
        if (socket.isAuth()) return;
    
        //Delay for verification
        let delay = socket.timeoutLeft('verificationDelay');
        if (delay !== 0)
            return socket.emit('verifyFail', 'Too many verification requests. Try again in ' + delay + ' seconds');

        //Stop to checking call authentication
        socket.clearInterval('refresh_call');
    
        //Validate input
        phone = validatePhone.parseNumber(phone).phone;
        if (!phone) return socket.emit('verifyFail', 'Invalid phone number. You should enter country code, e.g \'+7..\'');
        if (type !== 'sms' && type !== 'call') return socket.emit('verifyFail', 'Wrong verification type');
        
        //Generate authentication code and save credentials
        let code = smsAuth.generateSMSCode();
        socket.set('phone', phone);
        socket.set('code', code);
                
        //Auth using SMS
        if (type === 'sms') {            
            if (smsAuth.sendSMSCode(phone, code)){ 
                socket.emit('verifyConfirm', 'Verification sms was sent', type, phone, null);
                socket.setTimeout('verificationDelay', verificationDelay);
            }
            else socket.emit('verifyFail', 'Server error');
        }
        
        //Auth using call
        else if (type === 'call') {
            let result = await smsAuth.registerCall(phone);
            if (!result) return socket.emit('verifyFail', 'Server error');

            socket.setTimeout('verificationDelay', verificationDelay);
    
            socket.setInterval('refresh_call', async function() {
                if (await smsAuth.checkCall(result.checkId) === false) return;
    
                socket.emit('verifyConfirm', 'Your phone number was verified. You can join now', type, phone, code);
                socket.clearInterval('refresh_call');                
            }, callConfirmationCheckInterval * 1000, callConfirmationTimeout * 1000);
    
            socket.emit('verifyConfirm', 'Call ' + result.prettyPhone + ' to verify', type, phone, null); 
        }
    });

    //Authenticate user using code
    socket.on('joinReq', async function onJoin(code) {
        if (socket.isAuth()) return;
    
        var phone = socket.get('phone');
        
        if (!phone) return socket.emit('joinFail', 'Your phone number wasn\'t confirmed');
        if (code !== socket.get('code')) return socket.emit('joinFail', 'Wrong confirmation code');
    
        //set socket password
        socket.auth(phone, code);

        //Confirm join
        socket.emit('joinConfirm');

        //send menu
        socket.sendChatData(await buttonActions['root_action'](socket));
    }); 

    //Emit chat message
    socket.on('textSend', function onTextSend(msg) {
        if (!socket.isAuth()) return;
    
        socket.emit('chat', { type: 'text', value: msg, from: socket.get('phone') });
    });

    //Emit user typing state
    socket.on('typing', function onTyping(isTyping) {
        if (!socket.isAuth()) return;
    
        socket.emit('typing', { isTyping: isTyping, from: socket.get('phone') });
    });

    //Execute button action
    socket.on('buttonAction', async function onButtonAction(buttonAction) {
        if (!socket.isAuth()) return;
    
        let result = await buttonActions[buttonAction](socket);
        if (result) socket.sendChatData(result);
    });

    //Try to restore session
    socket.on('restoreSession', socket.restoreSession);

    //Save session and destroy socket object
    socket.on('disconnect', function onDisconnect() {
        socket.saveSession();
        socket.destroy();
    });
}

module.exports.initialize = function(server) {
    let io = require('socket.io').listen(server);
    io.use(require('./functionsMiddleware'));

    io.sockets.on('connection', onConnection);
}