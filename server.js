const SMSruAPIKey = 'API-KEY';

var express = require('express'),
    http    = require('http'),
    https   = require("https"),
    fs      = require('fs');

var methodOverride = require('method-override');
var compression    = require('compression');
var serveStatic    = require('serve-static');
var bodyParser     = require('body-parser');
var SMSru          = require('sms_ru');
var validatePhone  = require('libphonenumber-js');
var superagent     = require('superagent');
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

var io = require("socket.io").listen(server);

app.set('port', process.env.OPENSHIFT_NODEJS_PORT || 3000);
app.set('ipaddr', process.env.OPENSHIFT_NODEJS_IP || "127.0.0.1");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended : false }));
app.use(methodOverride());
app.use(compression());
app.use(serveStatic(__dirname + '/public'));
app.use('/components', serveStatic(__dirname + '/node_modules/@bower_components'));

//lets us get room memebers in socket.io >=1.0
function findClientsSocketByRoomId (roomId, callback) {
    // Old Way
    // var room = io.sockets.adapter.rooms[roomId];
    // if(room) {
    //    for(var id in room) {
    //       res.push(io.sockets.adapter.nsp.connected[id]);
    //    }
    // }
    // return res;

    var res = [];
    io.of('/').in(roomId).clients(function (error, clients) {
       if (error) { return callback(error); }
       clients.forEach(function (client) {
          // Gets the socket
          //io.sockets.sockets[client];
          res.push(client);
       });
       callback(undefined, res);
    });

}

app.get('/', function (req, res) {
    res.render('index.html');
});

server.listen(app.get('port'), app.get('ipaddr'), function () {
    console.log('Express server listening on ' + app.get('ipaddr') + ':' + app.get('port'));
});


//Button menu
var buttonMenu = [
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
];

var buttonActions = {
    button1_action: async function() {
        return {
            type: 'text',
            value: await readAsync('./files/file1.txt', 'utf8')
        };
    },
    button2_action: async function() {
        return {
            type: 'text',
            value: await readAsync('./files/file2.txt', 'utf8')
        };
    },
    button3_action: function() {
        return {
            type: 'menu',
            value: [
                {
                    title: 'Back',
                    action: 'button3_back_action'
                },
                {
                    title: 'Button 3.1',
                    action: 'button3_1_action' 
                },
                {
                    title: 'Button 3.2',
                    action: 'button3_2_action'
                },
            ]
        }
    },
    button3_back_action: function() {
        return {
            type: 'menu',
            value: buttonMenu
        };
    },
    button3_1_action: async function() {
        return {
            type: 'text',
            value: await readAsync('./files/file3_1.txt', 'utf8')
        };
    },
    button3_2_action: async function() {
        return {
            type: 'text',
            value: await readAsync('./files/file3_2.txt', 'utf8')
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
io.use(function (socket, next) {
    // Initialize
    socket_data[socket.id] = {};
    socket.get = function (key) {
       return socket_data[socket.id][key];
    };
    socket.set = function (key, value) {
       socket_data[socket.id][key] = value;
    };
    next();
});

io.sockets.on("connection", function (socket) {
    var lastImageSend = 0;
    var isRateLimited = 1;
    
    socket.on("verifyReq", async function(phone, type){
        phone = validatePhone.parseNumber(phone).phone;
        if (!phone) return socket.emit("verifyFail", "Invalid phone number. You should enter country code, e.g '+7..'");
        if (type !== 'sms' && type !== 'call') return socket.emit("verifyFail", "Wrong verification type");
        
        var code = Math.floor(Math.random() * (9999 + 1)).toString();
        code = '0'.repeat(4 - code.length) + code;
        
        socket.set('phone', phone)
        socket.set('code', code)
        
        if (type === 'sms') {
	        var interval = socket.get('refreshCall');
            if (interval) clearInterval(interval);

            sms.sms_send({
                to: phone,
                text: 'FreeStep verification code: ' + code
            }, function(e){
                socket.emit("verifyConfirm", "Verification sms was sent", phone, null);
            });
        }
        else if (type === 'call'){
            var res = (await superagent.get('https://sms.ru/callcheck/add')
                .query({ api_id: SMSruAPIKey, phone: phone, json: 1 })).body;

            if (res.status === 'ERROR') return socket.emit('verifyFail', 'Server error');

            var interval = socket.get('refreshCall');
            if (interval) clearInterval(interval);

            interval = setInterval(async function() { 
                if((await superagent.get('https://sms.ru/callcheck/status')
                .query({ api_id: SMSruAPIKey, check_id: res.check_id, json: 1 })).body.check_status === 401)
	     	        socket.emit("verifyConfirm", "Your phone number was verified. You can join now", phone, code); 
	     	}, 10000);
              
            setTimeout(function() { clearInterval(interval); }, 300000);
            socket.set('refreshCall', interval);
              
            socket.emit("verifyConfirm", "Call " + res.call_phone_pretty + " to verify", phone, null); 
        }
        else {
            socket.emit("verifyFail", "Wrong verification type"); 
        }
    });

    //emits newuser
    socket.on("joinReq", function (room, password, code) {
        var roomID = room;
	    var phone = socket.get('phone');
        var roomPassword = password;
        var allowJoin = 1;
        var denyReason = null;
        
        if (!phone) return socket.emit("joinFail", "Your phone number wasn't confirmed");
	    if (code !== socket.get('code')) return socket.emit("joinFail", "Wrong confirmation code");

        //get the client list and push it to the client
        findClientsSocketByRoomId(roomID, function (error, clientsInRoom) {           
            if (error) { throw error; }

            var clientsInRoomArray = [];
            var clientsInRoomArrayScrubbed = [];
            clientsInRoom.forEach(function (client) {
                clientsInRoomArray.push(io.sockets.sockets[client].get('phone'));
                /* the scrubbed one has the sanitized version as used in the username
                 * classes for typing, so we can check and avoid collisions.
                 */
                clientsInRoomArrayScrubbed.push(io.sockets.sockets[client].get('phone').replace(/\W/g, ''));
            });

            //check if the phone exists
            if(clientsInRoomArrayScrubbed.indexOf(phone.replace(/\W/g, '')) != -1) {
                denyReason = "User with this phone number is already in the room.";
                allowJoin = 0;
            }

            if (allowJoin) {
                //now in the room
                socket.join(roomID);
                socket.set('roomIn', roomID);

                //send the join confirmation to the client, alert the room, and push a user list
                socket.emit("joinConfirm");

	     	    //clear call refresh interval
	     	    var interval = socket.get('refreshCall');
                if (interval) clearInterval(interval);

                //send button menu
                socket.emit('buttonMenu', buttonMenu);

                //add them to the user list since they're now a member
                clientsInRoomArray.push(phone);
                io.sockets.in(roomID).emit("newUser", phone);
                socket.emit("userList", clientsInRoomArray);
            } 
            else {
                socket.emit("joinFail", denyReason);
            }
        });
    });

    //execute button action
    socket.on('buttonAction', async function(buttonAction) {
        var action = buttonActions[buttonAction];
        if (action) socket.emit('buttonAction', await action());
    });

    //emits goneuser
    socket.on('disconnect', function () {
        io.sockets.in(socket.get('roomIn')).emit("goneUser", socket.get('phone'));
	    var interval = socket.get('refreshCall');
        if (interval) clearInterval(interval);
        delete socket_data[socket.id];
    });

    //emits chat
    socket.on("textSend", function (msg) {
        //0 = text
        var type = 0;
        var phone = socket.get('phone');
        var data = [type, phone, msg];
        io.sockets.in(socket.get('roomIn')).emit("chat", data);
    });

     //lets admins un-ratelimit themselves for data
    socket.on("unRateLimit", function () {
        isRateLimited = 0;
    });

    //emits data
    socket.on("dataSend", function (msg) {
        var currTime = Date.now();
        if(((currTime - lastImageSend) < 5000) && isRateLimited) {
            //it's been less than five seconds; no data for you!
            socket.emit("rateLimit");
        } else {
            lastImageSend = currTime;
            //1 = image
            var type = 1;
            var phone = socket.get('phone');
            var data = [type, phone, msg];
            io.sockets.in(socket.get('roomIn')).emit("chat", data);
        }
    });

    //emits typing
    socket.on("typing", function (typing) {
        io.sockets.in(socket.get('roomIn')).emit("typing", [typing, socket.get('phone')]);
    });
});
