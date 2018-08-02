const config         = require('config'),
      validatePhone  = require('libphonenumber-js');
      
const smsAuth        = require('../smsRuAuth'),
      fileModule     = require('./fileModule'),
      menuModule     = require('../menu'),
      classifier     = require('../classifier');

const callConfirmationCheckInterval = config.get('Timers.callConfirmationCheckInterval'),
      callConfirmationTimeout       = config.get('Timers.callConfirmationTimeout'),
      verificationDelay             = config.get('Timers.verificationDelay'),
      configMessages                = config.get('Messages');

function onConnection(socket) {
    fileModule.initialize(socket);

    //Verify phone number
    socket.on('verifyReq', async function(phone, type) {
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
            if (smsAuth.sendSMSCode(phone, code)) {
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
    socket.on('joinReq', async function(code) {
        if (socket.isAuth()) return;
    
        var phone = socket.get('phone');
        
        if (!phone) return socket.emit('joinFail', 'Your phone number wasn\'t confirmed');
        if (code !== socket.get('code')) return socket.emit('joinFail', 'Wrong confirmation code');
    
        //set socket password
        socket.auth(phone, code);

        //Confirm join
        socket.emit('joinConfirm');

        //send menu and welcome message
        socket.sendChatData({ type: 'text', value: configMessages.welcome });
    }); 

    //Emit chat message
    socket.on('textSend', async function(msg) {
        if (!socket.isAuth()) return;
    
        let decrypted = socket.decrypt(msg);
        if (decrypted) { 
            let className = await classifier.classify(decrypted);
            let classMenu = menuModule.menuByClass(className);

            socket.checkChatHook(decrypted);
            socket.sendChatData({ type: 'text', value: decrypted, from: socket.get('phone') });
            socket.sendChatData({ type: 'text', value: 'Message class: ' + className })
            if (classMenu) socket.sendChatData(await classMenu(socket));
        }
    });

    //Execute button action
    socket.on('buttonAction', async function(buttonAction) {
        if (!socket.isAuth()) return;

        buttonAction = socket.decrypt(buttonAction);
        if (!buttonAction || !menuModule.action(buttonAction)) return;

        let result = await menuModule.action(buttonAction)(socket);
        if (result) socket.sendChatData(result);
    });

    //Try to restore session
    socket.on('restoreSession', socket.restoreSession);

    //Save session and destroy socket object
    socket.on('disconnect', function() {
        socket.saveSession();
        socket.destroy();
    });
}

module.exports.initialize = async function(server) {
    //Initializing related modules
    await classifier.initialize();
    await menuModule.initialize();

    let io = require('socket.io').listen(server);
    io.use(require('./functionsMiddleware'));
    io.sockets.on('connection', onConnection);
}