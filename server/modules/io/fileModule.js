const fs            = require('fs'),
      util          = require('util'),
      path          = require('path'),
      config        = require('config'),
      mime          = require('mime-types'),
      ss            = require('socket.io-stream'),
      miss          = require('mississippi'),
      siofu         = require('socketio-file-upload');

const existsAsync    = util.promisify(fs.exists),
      readFileAsync  = util.promisify(fs.readFile),
      openFileAsync  = util.promisify(fs.open),
      closeFileAsync = util.promisify(fs.close);

const fileDir      = config.get('Directories.upload');
      unixMode     = config.get('Files.unixFileMode');
      maxFileSize  = config.get('Files.maxFileSize');
      maxSizeError = (name) => ({ text: 'error.fileIsTooBig', args: [ name, (maxFileSize / 1048576).toFixed(2) ] });

/**
 * Private function to find name for an uploaded file.
 * @param  {String} name The name requested by the client
 * @return {String} The name given by the server
 */
async function findFileName(name) {
    try {
        name = name.replace(/[\/\?<>\\:\*\|":]|[\x00-\x1f\x80-\x9f]|^\.+$/g, "_");

        let extname = path.extname(name), 
            number  = 1;

        let originalName = path.basename(name, extname);
        while (await existsAsync(path.join(fileDir, name)) === true)
            name = originalName + '-' + number++ + extname;
        
        let fd = await openFileAsync(path.join(fileDir, name), 'w', parseInt(unixMode, 8));
        await closeFileAsync(fd);

        return name;
    }
    catch (err) {
        console.log("Uploading file error: " + err);
        return null;
    }
}

function initialize(socket) {

    /*
     *
     * Uploading
     * Encryption chain: (Client: Buffer > HEX string > Encrypted HEX string) > (Server: Backwards)
     * 
     */
    ss(socket).on('uploadFile', async function(data) {
        try {
            //Check for uploading permission
            if (!socket.isAuth()) return;
            if (socket.checkAction('upload') === false) {
                socket.sendChatMessage({ text: 'error.uploadingNotAllowed' }, data.target);
                return;
            }

            //Validate file data
            data.name = socket.decrypt(data.name);
            data.size = parseInt(socket.decrypt(data.size));
            if (!data.stream || !data.name || !data.size) throw "corrupted packet";
            if (data.size > maxFileSize) throw maxSizeError(data.name);
            let filename = await findFileName(data.name);
            if (filename == null) throw "cannot create file";

            //Configure streams
            let size = 0, decryptedChunk;
            let receive = data.stream;
            let decrypt = miss.through(
                (chunk, enc, cb) => {
                    try {
                        decryptedChunk = Buffer.from(socket.decrypt(chunk.toString()), 'hex');
                        size += decryptedChunk.length;
                        if (size > maxFileSize) throw maxSizeError(data.name);
                        cb(null, decryptedChunk);
                    }
                    catch (error) {
                        console.log("Uploading file error: " + error.text || error);
                        socket.sendChatMessage({ text: 'error.uploadingFailed', args: error }, data.target);
                    }
                },
                (cb) => cb(null, '')
            );
            let write = fs.createWriteStream(path.join(fileDir, filename));

            //Pipe streams
            miss.pipe(receive, decrypt, write, function(err) {
                try {
                    if (err) {
                        receive.end(); decrypt.end(); write.end();
                        throw err;
                    }
                    socket.triggerAction('upload', { name: filename, path: path.join(fileDir, filename), target: data.target });
                }
                catch (error) {
                    console.log("Uploading file error: " + error.text || error);
                    socket.sendChatMessage({ text: 'error.uploadingFailed', args: error }, data.target);
                }
            });
        }
        catch (error) {
            console.log("Uploading file error: " + error.text || error);
            socket.sendChatMessage({ text: 'error.uploadingFailed', args: error }, data.target);
        }
    });

    /*
     *
     * Downloading
     * 
     */


    socket.on('downloadFile', async function(filename) {
        try {
            //parse input
            filename = socket.decrypt(filename);
            if (!filename) return;

            //check file existence
            let filePath = path.join(fileDir, filename);
            if (!await existsAsync(filePath)) return socket.sendChatMessage({ text: 'error.fileNotFound' });

            //configure streams
            let read = fs.createReadStream(filePath);
            let send = ss.createStream();
            let encrypt = miss.through(
                (chunk, enc, cb) => {
                    cb(null, socket.encrypt(chunk.toString('hex')));
                },
                (cb) => cb(null, '')
            );

            //send stream and additional data
            let mimeType = mime.contentType(filePath);
            if (!mimeType) mimeType = 'text/plain;charset=utf-8';
            ss(socket).emit('downloadFile', send, socket.encrypt(JSON.stringify({ 
                filename: filename, 
                mime: mimeType
            })));

            //pipe streams
            miss.pipe(read, encrypt, send);
        }
        catch (err) {
            console.log("Error during user file download: " + err);
            return socket.sendChatMessage({ text: 'error.downloadServerError' });
        }
    });
}

module.exports.initialize = initialize