const config   = require('config'),
      cryptojs = require('crypto-js');

const buttonActions = require('../menu');

const sessionLife      = config.get('Timers.sessionLife'),
      timeForUploading = config.get('Timers.timeForUploading'),
      configMessages   = config.get('Messages');

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
        socket_timeouts[socket.id][key] = Math.floor(Date.now() / 1000) + time;
        if (func) setTimeout(func, time * 1000);
    };

    socket.checkTimeout = function(key) {
        if (!socket_timeouts[socket.id][key]) return false;
        return Math.floor(Date.now() / 1000) < socket_timeouts[socket.id][key];
    };

    socket.timeoutLeft = function(key) {
        if (socket.checkTimeout(key) === false) return 0;
        return socket_timeouts[socket.id][key] - Math.floor(Date.now() / 1000);
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
            
        delete socket_data[socket.id];
        delete socket_intervals[socket.id];
        delete socket_timeouts[socket.id];
    };

    /*
     *
     * uploading handlers
     * 
     */

    socket.subscribeToUpload = function(callback) {
        socket.setTimeout('uploadTill', timeForUploading, () => socket.set('uploadCallback', null));
        socket.set('uploadCallback', callback);
        return timeForUploading;
    };

    socket.uploadAction = function(filename) {
        let action = socket.get('uploadCallback');
        if (action) action(filename);
    }

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
        if (!data.value) data.value = "";
        if (!data.from) data.from = 'Server';

        let encrypted = socket.encrypt(JSON.stringify(data));
        if (encrypted) socket.emit('chat', encrypted);
    };

    socket.sendChatMessage = function(text) {
        if (!text) return;
        socket.sendChatData({ type: 'text', value: text });
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
        socket.sendChatData({ type: 'text', value: configMessages.welcome });
    };

    next();
}