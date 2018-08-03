const fs            = require('fs'),
      util          = require('util'),
      path          = require('path'),
      config        = require('config');

const readDirAsync  = util.promisify(fs.readdir),
      existsAsync   = util.promisify(fs.exists),
      readFileAsync = util.promisify(fs.readFile);

const localeDir     = config.get('Directories.locale'),
      defaultLocale = config.get('General.defaultLocale');

function initialize(socket) {

    socket.on('languageList', async function() {
        try {
            let files = await readDirAsync(localeDir);
            files = files.map((file) => path.basename(file, '.json'));
            socket.emit('languageList', files);
        }
        catch (error) {
            console.log("Error during reading locale directory: " + error);
        }
    });

    socket.on('language', async function(lang) {
        try {
            if (!lang) lang = defaultLocale;
            let langFile = await readFileAsync(path.join(localeDir, lang + '.json'));
            socket.emit('language', lang, JSON.parse(langFile));
        }
        catch (error) {
            console.log("Error during reading locale file: " + error);
        }
    });

}

module.exports.initialize = initialize;