const config = require('config'),
      cryptojs = require('crypto-js');

const sessionLife = config.get('Timers.sessionLife');

var socket_data = {};
var socket_intervals = {};
var socket_timeouts = {};
var socket_sessions = {};

module.exports = function (socket, next) {

    socket_data[socket.id] = {};
    socket_intervals[socket.id] = {};
    socket_timeouts[socket.id] = {};

    socket.get = function (key) {
       return socket_data[socket.id][key];
    };

    socket.set = function (key, value) {
       socket_data[socket.id][key] = value;
    };

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

    socket.setTimeout = function(key, time) {
        socket_timeouts[socket.id][key] = Math.floor(Date.now() / 1000) + time;
    };

    socket.checkTimeout = function(key) {
        if (!socket_timeouts[socket.id][key]) return false;
        return Math.floor(Date.now() / 1000) < socket_timeouts[socket.id][key];
    };

    socket.timeoutLeft = function(key) {
        if (socket.checkTimeout(key) === false) return 0;
        return socket_timeouts[socket.id][key] - Math.floor(Date.now() / 1000);
    };

    socket.destroy = function() {
        for (let interval in socket_intervals[socket.id])
            socket.clearInterval(interval);

            
        delete socket_data[socket.id];
        delete socket_intervals[socket.id];
        delete socket_timeouts[socket.id];
    };

    socket.auth = function(phone, code) {
        socket.set('phone', phone);
        socket.set('code', code);
        socket.set('password', cryptojs.SHA1(phone + '.' + code).toString());
    };

    socket.isAuth = function() {
        return socket.get('password') !== undefined;
    };

    socket.sendChatData = function(data) {
        if (data.type === 'menu') data.value = JSON.stringify(data.value);
        if (!data.from) data.from = 'Server';

        data.value = cryptojs.Rabbit.encrypt(data.value.toString(), socket.get('password')).toString();
        socket.emit('chat', data);
    };

    socket.saveSession = function() {
        let phone = socket.get('phone');
        if (phone) {
            socket_sessions[phone] = socket.get('code');
            setTimeout(function() {
                delete socket_sessions[phone];
            }, sessionLife * 1000);
        }
    };

    socket.restoreSession = function(phone, code) {
        if (!socket_sessions[phone] || socket_sessions[phone] !== code) return socket.emit('wrongSession');

        socket.auth(phone, code);
        socket.emit('joinConfirm');
    };

    next();
}