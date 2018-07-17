const fs            = require('fs'),
      util          = require('util'),
      config        = require('config'),
      readFileAsync = util.promisify(fs.readFile);

const timeForUploading = config.get('Timers.timeForUploading');

module.exports = {

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
            value: await readFileAsync('./files/file1.txt', 'utf8')
        };
    },

    button2_action: async function(socket) {
        return {
            type: 'text',
            value: await readFileAsync('./files/file2.txt', 'utf8')
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
            value: await readFileAsync('./files/file3_1.txt', 'utf8')
        };
    },

    button3_2_action: async function(socket) {
        return {
            type: 'text',
            value: await readFileAsync('./files/file3_2.txt', 'utf8')
        };
    },

    button3_3_action: async function(socket) {
        socket.setTimeout('uploadTill', timeForUploading);
        return {
            type: 'upload',
            value: timeForUploading
        };
    }

}