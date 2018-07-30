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
      maxFileSize  = 10485760;
      maxSizeError = (name) => name + " file is too big. Max size: " + (maxFileSize / 1048576).toFixed(2) + " MB.";

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
        
        let fd = await openFileAsync(path.join(fileDir, name), 'w', unixMode);
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
    ss(socket).on('uploadFile', async function(receive, data) {
        try {
            //Check for uploading permission
            if (!socket.isAuth()) return;
            if (socket.checkTimeout('uploadTill') === false) {
                socket.sendChatData({ type: 'text', value: 'Uploading is not allowed now' });
                return;
            }

            //Validate file data
            data = JSON.parse(socket.decrypt(data));
            if (!receive || !data.name || !data.size) throw "corrupted packet";
            if (data.size > maxFileSize) throw maxSizeError(data.name);
            let filename = await findFileName(data.name);
            if (filename == null) throw "cannot create file";

            //Configure streams
            let size = 0, decryptedChunk;
            let decrypt = miss.through(
                (chunk, enc, cb) => {
                    decryptedChunk = Buffer.from(socket.decrypt(chunk.toString()), 'hex');
                    size += decryptedChunk.length;
                    if (size > maxFileSize) throw maxSizeError(data.name);
                    cb(null, decryptedChunk);
                },
                (cb) => cb(null, '')
            );
            let write = fs.createWriteStream(path.join(fileDir, filename));

            //Pipe streams
            miss.pipe(receive, decrypt, write, function(err) { 
                if (err) throw err;
                socket.sendChatData({ type: 'file', value: filename });
            });
        }
        catch (error) {
            console.log("Uploading file error: " + error);
            socket.sendChatData({ type: 'text', value: 'Uploading failed: ' + error });
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
            if (!filename) return socket.sendChatMessage("Wrong file request.");

            //check file existence
            let filePath = path.join(fileDir, filename);
            if (!await existsAsync(filePath)) return socket.sendChatMessage("File not found.");

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
            ss(socket).emit('downloadFile', send, socket.encrypt(JSON.stringify({ 
                filename: filename, 
                mime: mime.lookup(filePath) 
            })));

            //pipe streams
            miss.pipe(read, encrypt, send);
        }
        catch (err) {
            console.log("Error during user file download: " + err);
            return socket.sendChatMessage("A server error occured during sending file.");
        }
    });
}

module.exports.initialize = initialize