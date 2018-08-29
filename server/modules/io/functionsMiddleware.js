const config   = require('config'),
      cryptojs = require('crypto-js');

const buttonActions = require('../menu');

const sessionLife      = config.get('Timers.sessionLife'),
      timeForAction    = config.get('Timers.timeForAction');

var socket_data = {};
var socket_intervals = {};
var socket_timeouts = {};
var socket_sessions = {};

module.exports = function (socket, next) {

    socket_data[socket.id] = {};
    socket_intervals[socket.id] = {};
    socket_timeouts[socket.id] = {};

    /*
     *
     * get set extensions
     * 
     */

    socket.get = function (key) {
        return socket_data[socket.id][key];
    };

    socket.set = function (key, value) {
        socket_data[socket.id][key] = value;
    };

    /*
     *
     * timers extensions
     * 
     */

    socket.setInterval = function(key, func, interval, life) {
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

    socket.setTimeout = function(key, time, func) {
        socket.clearTimeout(key);
        socket_timeouts[socket.id][key] = {
            key: key,
            elapse: Math.floor(Date.now() / 1000) + time,
            object: func ? setTimeout(func, time * 1000) : null
        };
    };

    socket.clearTimeout = function(key) {
        if (!socket_timeouts[socket.id]) return;
        let timeout = socket_timeouts[socket.id][key];
        if (timeout) {
            if (timeout.object) clearTimeout(timeout.object);
            delete socket_timeouts[socket.id][key];
        }
    };

    socket.checkTimeout = function(key) {
        if (!socket_timeouts[socket.id][key]) return false;
        return Math.floor(Date.now() / 1000) < socket_timeouts[socket.id][key].elapse;
    };

    socket.timeoutLeft = function(key) {
        if (socket.checkTimeout(key) === false) return 0;
        return socket_timeouts[socket.id][key].elapse - Math.floor(Date.now() / 1000);
    };

    /*
     *
     * auth extensions
     * 
     */

    socket.auth = function(phone, code) {
        socket.set('phone', phone);
        socket.set('code', code);
        socket.set('password', cryptojs.SHA1(phone + '.' + code).toString());
    };

    socket.isAuth = function() {
        return socket.get('password') !== undefined;
    };

    socket.destroy = function() {
        for (let interval in socket_intervals[socket.id])
            socket.clearInterval(interval);
        for (let timeout in socket_timeouts[socket.id])
            socket.clearTimeout(timeout);
            
        delete socket_data[socket.id];
        delete socket_intervals[socket.id];
        delete socket_timeouts[socket.id];
    };

    /*
     *
     * Action handlers
     * 
     */

    socket.subscribeToAction = function(name, callback, elapsedCallback) {
        socket.setTimeout(name + '.actionTill', timeForAction, () => {
            socket.set(name + '.actionCallback', null);
            if (elapsedCallback) elapsedCallback();
        });
        socket.set(name + '.actionCallback', callback);
        return timeForAction;
    };

    socket.triggerAction = function(name, arg) {
        let action = socket.get(name + '.actionCallback');
        if (action) action(arg);
    };

    socket.checkAction = function(name) {
        return socket.checkTimeout(name + '.actionTill');
    }

    /*
     *
     * Chat hook
     * 
     */
    
    socket.setChatHook = function(regex, callback) {
        socket.set('chatHook', regex);
        return socket.subscribeToAction('chatHook', (text) => callback(text), () => socket.set('chatHook', null));
    },

    socket.checkChatHook = function(text) {
        let regex = socket.get('chatHook');
        if (regex && regex.test(text) === true) {
            socket.triggerAction('chatHook', text);
            return true;
        }
        return false;
    },

    /*
     *
     * encrypted messaging extensions
     * 
     */

    socket.encrypt = function(data) {
        try {
            return cryptojs.Rabbit.encrypt(data, socket.get('password')).toString();
        }
        catch (err) {
            console.log("Error during encryption: " + err);
            return null;
        }
    };

    socket.decrypt = function(encrypted) {
        try {
            return cryptojs.Rabbit.decrypt(encrypted, socket.get('password')).toString(cryptojs.enc.Utf8);
        }
        catch (err) {
            console.log("Error during decryption: " + err);
            return null;
        } 
    };

    socket.sendChatData = function(data) {
        if (!socket.connected) return;

        if (!data.value) data.value = "";
        if (!data.from) data.from = 'Server';

        let encrypted = socket.encrypt(JSON.stringify(data));
        if (encrypted) socket.emit('chat', encrypted);
    };

    socket.sendChatMessage = function(text, target) {
        if (!text) return;
        socket.sendChatData({ type: 'text', value: text, target });
    };

    /*
     *
     * session extensions
     * 
     */

    socket.saveSession = function() {
        let phone = socket.get('phone');
        if (phone) {
            socket_sessions[phone] = socket.get('code');
            setTimeout(function() {
                delete socket_sessions[phone];
            }, sessionLife * 1000);
        }
    };

    socket.restoreSession = async function(phone, code) {
        if (!socket_sessions[phone] || socket_sessions[phone] !== code) return socket.emit('wrongSession');

        socket.auth(phone, code);
        socket.emit('joinConfirm');

        //send menu and welcome message
        socket.sendChatData({ type: 'welcome', value: { text: 'message.welcome' }});
    };

    next();
}