const siofu = require('socketio-file-upload');

function initialize(socket) {
    var uploader = new siofu();
    uploader.dir = './upload';
    uploader.maxFileSize = 10485760;
    uploader.listen(socket);

    uploader.on('start', function(event) {
        if (!socket.isAuth()) return uploader.abort(event.file.id, socket);
        if (!socket.get('uploadTill') || Math.floor(Date.now() / 1000) >= socket.get('uploadTill')) {
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
        if (event.file.success === true) socket.sendChatData({ type: 'text', value: 'File is successfully uploaded' });
    });

    uploader.on('error', function(event) {
        socket.sendChatData({ type: 'text', value: 'Uploading failed: ' + event.error.message });
    });
}

module.exports.initialize = initialize