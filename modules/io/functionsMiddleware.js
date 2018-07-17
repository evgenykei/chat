const config = require('config'),
      cryptojs = require('crypto-js');

const sessionLife = config.get('Timers.sessionLife');

var socket_data = {};
var socket_intervals = {};
var socket_sessions = {};

module.exports = function (socket, next) {

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
    }

    next();
}