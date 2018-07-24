const fs    = require('fs'),
      util  = require('util'),
      path  = require('path'),
      mime  = require('mime-types'),
      siofu = require('socketio-file-upload');

const existsAsync   = util.promisify(fs.exists),
      readFileAsync = util.promisify(fs.readFile);      

function initialize(socket) {

    const fileDir = './server/upload';

    /*
     *
     * Uploading
     * 
     */

    var uploader = new siofu();
    uploader.dir = fileDir;
    uploader.maxFileSize = 10485760;
    uploader.listen(socket);

    uploader.on('start', function(event) {
        if (!socket.isAuth()) return uploader.abort(event.file.id, socket);
        if (socket.checkTimeout('uploadTill') === false) {
            socket.sendChatData({ type: 'text', value: 'Uploading is not allowed now' });
            return uploader.abort(event.file.id, socket);
        }

        /*
         * there could be some verification, for example
         */

        /*
        if (/\.exe$/.test(event.file.name)) {
            uploader.abort(event.file.id, socket);
        }*/
    });

    uploader.on('saved', function(event) {
        if (event.file.success === true) socket.sendChatData({ type: 'file', value: event.file.base + path.extname(event.file.name) });
    });

    uploader.on('error', function(event) {
        socket.sendChatData({ type: 'text', value: 'Uploading failed: ' + event.error.message });
    });

    /*
     *
     * Downloading
     * 
     */

    socket.on('downloadFile', async function(filename) {
        try {            
            filename = socket.decrypt(filename);
            if (!filename) return socket.sendChatMessage("Wrong file request.");

            let filePath = path.join(fileDir, filename);
            if (!await existsAsync(filePath)) return socket.sendChatMessage("File not found.");

            let mimeType = mime.lookup(filePath);
            let response = {
                base64: 'data:' + mimeType + ';base64,' + new Buffer(await readFileAsync(filePath)).toString('base64'),
                filename: filename,
                mimeType: mimeType
            };

            response = socket.encrypt(JSON.stringify(response));
            socket.emit('downloadFile', response);
        }
        catch (err) {
            console.log("Error during user file download: " + err);
            return socket.sendChatMessage("A server error occured during sending file.");
        }
    });
}

module.exports.initialize = initialize