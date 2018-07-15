const SMSruAPIKey = '4DD5D7BE-1EDE-CB36-A534-8BC34DDD994B';
const sessionLifetimeSeconds = 30;

var express = require('express'),
    http    = require('http'),
    https   = require('https'),
    fs      = require('fs');

var methodOverride = require('method-override');
var compression    = require('compression');
var serveStatic    = require('serve-static');
var bodyParser     = require('body-parser');
var SMSru          = require('sms_ru');
var validatePhone  = require('libphonenumber-js');
var superagent     = require('superagent');
var siofu          = require('socketio-file-upload');
var cryptojs       = require('crypto-js');

var { promisify }  = require('util');
var readAsync      = promisify(fs.readFile);

var app = express();
var server;
var enable_ssl = false;
var sms = new SMSru(SMSruAPIKey);

/***
 *
 * This is for HTTP redirecting to HTTPS - if you're running this as HTTP, delete below until the closing comment block
 *
 ***/ 
if (enable_ssl === true) {
var httpapp = express();

// set up a route to redirect http to https
httpapp.get('*',function(req,res){  
    res.redirect('https://freestep.net')
})

// have it listen on 80
httpapp.listen(80);

/***
 *
 * This is for HTTP redirecting to HTTPS - if you're running this as HTTP, delete above until the opening comment block
 *
 ***/ 

var privateKey = fs.readFileSync('ssl/server.key').toString();
var certificate = fs.readFileSync('ssl/freestep_net.crt').toString();
var ca = fs.readFileSync('ssl/COMODO.ca-bundle').toString();

var sslOptions = {
    key: fs.readFileSync('ssl/server.key'),
    cert: fs.readFileSync('ssl/freestep_net.crt'),
    ca: fs.readFileSync('ssl/COMODO.ca-bundle')
};
server = https.createServer(sslOptions, app);
} else {
   server = http.createServer(app);
}

var io = require('socket.io').listen(server);

app.set('port', process.env.OPENSHIFT_NODEJS_PORT || 3000);
app.set('ipaddr', process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended : false }));
app.use(methodOverride());
app.use(compression());
app.use(serveStatic(__dirname + '/public'));
app.use('/components', serveStatic(__dirname + '/node_modules/@bower_components'));
app.use(siofu.router);

app.get('/', function (req, res) {
    res.render('index.html');
});

server.listen(app.get('port'), app.get('ipaddr'), function () {
    console.log('Express server listening on ' + app.get('ipaddr') + ':' + app.get('port'));
});


//Button menu
var buttonActions = {

    root_action: function(socket) {
        return {
            type: 'menu',
            value: [
                {
                    title: 'Button 1',
                    action: 'button1_action'
                },
                {
                    title: 'Button 2',
                    action: 'button2_action'
                },
                {
                    title: 'Button 3',
                    action: 'button3_action'
                }
            ]
        }
    },

    button1_action: async function(socket) {
        return {
            type: 'text',
            value: await readAsync('./files/file1.txt', 'utf8')
        };
    },

    button2_action: async function(socket) {
        return {
            type: 'text',
            value: await readAsync('./files/file2.txt', 'utf8')
        };
    },

    button3_action: function(socket) {
        return {
            type: 'menu',
            value: [
                {
                    title: 'Back',
                    action: 'root_action'
                },
                {
                    title: 'Button 3.1',
                    action: 'button3_1_action' 
                },
                {
                    title: 'Button 3.2',
                    action: 'button3_2_action'
                },
                {
                    title: 'Button 3.3 - UPLOAD',
                    action: 'button3_3_action'
                },
            ]
        }
    },

    button3_1_action: async function(socket) {
        return {
            type: 'text',
            value: await readAsync('./files/file3_1.txt', 'utf8')
        };
    },

    button3_2_action: async function(socket) {
        return {
            type: 'text',
            value: await readAsync('./files/file3_2.txt', 'utf8')
        };
    },

    button3_3_action: async function(socket) {
        return {
            type: 'upload',
            value: null
        };
    }

}

// Handles Socket Data Storage in Memory
// Looking for persistent/Redis support? See below
// https://github.com/socialtables/socket.io-store
//
// Example Data
// socket_data = {
//   '9evVFCugeYJWs6wFAAAA' : {
//     'nickname' : 'bob',
//     'roomIn'   : 'main'
//   }
//   '9evVFCugeYJWs6wFAAAA' : {
//     'nickname' : 'bob',
//     'roomIn'   : 'main'
//   }
// };
var socket_data = {};
var socket_intervals = {};
var socket_sessions = {};
io.use(function (socket, next) {

    socket_data[socket.id] = {};
    socket_intervals[socket.id] = {};

    socket.get = function (key) {
       return socket_data[socket.id][key];
    };

    socket.set = function (key, value) {
       socket_data[socket.id][key] = value;
    };

    socket.setInterval = function (key, func, interval, life) {
        socket.clearInterval(key);
        socket_intervals[socket.id][key] = setInterval(func, interval);
        if (life) setTimeout(() => socket.clearInterval(key), life);
    };

    socket.clearInterval = function(key) {
        if (!socket_intervals[socket.id]) return;
        let interval = socket_intervals[socket.id][key];
        if (interval) {
            clearInterval(interval);
            delete socket_intervals[socket.id][key];
        }
    };

    socket.destroy = function() {
        for (let interval in socket_intervals[socket.id])
            socket.clearInterval(interval);
        delete socket_intervals[socket.id];
        delete socket_data[socket.id];
    }

    socket.auth = function(phone, code) {
        socket.set('phone', phone);
        socket.set('code', code);
        socket.set('password', cryptojs.SHA1(phone + '.' + code).toString());
    };

    socket.isAuth = function() {
        return socket.get('password') !== undefined;
    }

    next();
});

io.sockets.on('connection', function (socket) {

    //Socket functions
    function sendChatData(data) {
        if (data.type === 'menu') data.value = JSON.stringify(data.value);
        if (!data.from) data.from = 'Server';

        data.value = cryptojs.Rabbit.encrypt(data.value, socket.get('password')).toString();
        socket.emit('chat', data);
    }

    //Uploading config
    var uploader = new siofu();
    uploader.dir = './upload';
    uploader.maxFileSize = 10485760;
    uploader.listen(socket);

    uploader.on('start', function(event) {
        if (!socket.isAuth()) return uploader.abort(event.file.id, socket);
        /*
         * there could be some verification, for example
         */

        /*
        if (/\.exe$/.test(event.file.name)) {
            uploader.abort(event.file.id, socket);
        }*/
    });

    uploader.on('saved', function(event) {
        if (event.file.success === true) sendChatData({ type: 'text', value: 'File is successfully uploaded' });
    });

    uploader.on('error', function(event) {
        sendChatData({ type: 'text', value: 'Upload failed: ' + event.error.message });
    });

    //Verification request
    socket.on('verifyReq', async function(phone, type) {
        if (socket.isAuth()) return;

        phone = validatePhone.parseNumber(phone).phone;
        if (!phone) return socket.emit('verifyFail', 'Invalid phone number. You should enter country code, e.g \'+7..\'');
        if (type !== 'sms' && type !== 'call') return socket.emit('verifyFail', 'Wrong verification type');
        
        var code = Math.floor(Math.random() * (9999 + 1)).toString();
        code = '0'.repeat(4 - code.length) + code;
        
        socket.set('phone', phone)
        socket.set('code', code)
        
        if (type === 'sms') {
	        socket.clearInterval('refresh_call');

            sms.sms_send({
                to: phone,
                text: 'FreeStep verification code: ' + code
            }, function(e){
                socket.emit('verifyConfirm', 'Verification sms was sent', phone, null);
            });
        }
        else if (type === 'call'){
            var res = (await superagent.get('https://sms.ru/callcheck/add')
                .query({ api_id: SMSruAPIKey, phone: phone, json: 1 })).body;

            if (res.status === 'ERROR') return socket.emit('verifyFail', 'Server error');

            socket.setInterval('refresh_call', async function() { 
                if((await superagent.get('https://sms.ru/callcheck/status').query({ api_id: SMSruAPIKey, check_id: res.check_id, json: 1 })).body.check_status === 401) {
                    socket.emit('verifyConfirm', 'Your phone number was verified. You can join now', phone, code);
                    socket.clearInterval('refresh_call');
                }
	     	}, 10000, 300000)
            
            socket.emit('verifyConfirm', 'Call ' + res.call_phone_pretty + ' to verify', phone, null); 
        }
        else {
            socket.emit('verifyFail', 'Wrong verification type'); 
        }
    });

    //Connection request
    socket.on('joinReq', async function (code) {
        if (socket.isAuth()) return;

	    var phone = socket.get('phone');
        
        if (!phone) return socket.emit('joinFail', 'Your phone number wasn\'t confirmed');
	    if (code !== socket.get('code')) return socket.emit('joinFail', 'Wrong confirmation code');

        //set socket password
        socket.auth(phone, code);

        socket.emit('joinConfirm');
    });

    //Emits chat
    socket.on('textSend', function (msg) {
        if (!socket.isAuth()) return;

        socket.emit('chat', { type: 'text', value: msg, from: socket.get('phone') });
    });

    //Emits typing
    socket.on('typing', function (isTyping) {
        if (!socket.isAuth()) return;

        socket.emit('typing', { isTyping: isTyping, from: socket.get('phone') });
    });

    //Execute button action
    socket.on('buttonAction', async function(buttonAction) {
        if (!socket.isAuth()) return;

        let result = await buttonActions[buttonAction](socket);
        if (result) sendChatData(result);
    });

    //Restore session
    socket.on('restoreSession', function(phone, code) {
        if (!socket_sessions[phone] || socket_sessions[phone] !== code) return socket.emit('wrongSession');

        socket.auth(phone, code);
        socket.emit('joinConfirm');
    })

    //User disconnected
    socket.on('disconnect', function () {
        //set session
        let phone = socket.get('phone');
        if (phone) {
            socket_sessions[phone] = socket.get('code');
            setTimeout(function() {
                delete socket_sessions[phone];
            }, sessionLifetimeSeconds * 1000);
        }

        socket.destroy();
    });

});
