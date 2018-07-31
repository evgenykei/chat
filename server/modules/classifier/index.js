const fs              = require('fs'),
      util            = require('util'),
      path            = require('path'),
      http            = require('http'),
      config          = require('config'),
      express         = require('express'),
      serveStatic     = require('serve-static'),
      bodyParser      = require('body-parser'),
      natural         = require('natural'),
      PorterStemmerRu = require.main.require('./node_modules/natural/lib/natural/stemmers/porter_stemmer_ru');

const fileExistsAsync         = util.promisify(fs.exists),
      writeFileAsync          = util.promisify(fs.writeFile),
      readFileAsync           = util.promisify(fs.readFile);

const trainingDataPath        = path.join(__dirname, 'training.json'),
      classifierPersistedPath = path.join(__dirname, 'classifier.json');

const trainingInterval = config.get("Timers.trainingInterval");

var classifier = new natural.BayesClassifier(PorterStemmerRu);
var knownTexts = [];

module.exports = functions = {

    initialize: async () => {
        try {
            let trainingFunc = async () => {
                let trainingData = JSON.parse(await readFileAsync(trainingDataPath));

                //Load known texts
                knownTexts = [];
                trainingData.map((doc) => knownTexts.push(doc.text.toLowerCase()));

                await functions.train(trainingData);
                await functions.save();
            };

            //Check training data and train
            if (await fileExistsAsync(trainingDataPath)) {
                trainingFunc();
                setInterval(trainingFunc, trainingInterval * 1000);
            }
            //Else load
            else if (await fileExistsAsync(classifierPersistedPath)) {
                await functions.load();
            }
        }
        catch (err) {
            console.log("Error during classifier initialization: " + err);
        }
    },

    /**
     * Trains classifier
     * 
     * @typedef {Object} TrainingElement
     * @property {string} class Class to which text belongs.
     * @property {string} text Text for training.
     * 
     * @param  {TrainingElement[]} trainingArr Array of training elements.
     * 
     * @return {Promise<void>} Promise to report of completion.
     */
    train: (trainingArr) => new Promise((resolve, reject) => {
        try {
            trainingArr.forEach((trainingEl) => classifier.addDocument(trainingEl.text, trainingEl.class));
            classifier.events.on('trainedWithDocument', (obj) => {
                if (obj.index + 1 == obj.total) resolve(obj);
            });
            classifier.train();
        }
        catch (err) {
            reject(err);
        }
    }),

    classify: async (text) => {
        let className;
        try {
            text = text.toLowerCase();

            className = classifier.classify(text);

            return className;
        }
        catch (err) {
            console.log("Error during classification: " + err);
            return false;
        }
        finally {
            if (!className) className = 'unknown';
            if (!knownTexts.includes(text)) 
                await functions.saveTrainerText(className, text);
        }
    },

    saveTrainerText: async (className, text) => {
        try {
            let trainingData;
            if (await fileExistsAsync(trainingDataPath))
                trainingData = JSON.parse(await readFileAsync(trainingDataPath));
            else trainingData = [];

            trainingData.push({ class: className, text: text, checked: false });
            await writeFileAsync(trainingDataPath, JSON.stringify(trainingData, null, 2));
            knownTexts.push(text);
            return true;
        }
        catch (err) {
            console.log("Error during classification save: " + err);
            return false;
        }
    },

    save: async () => {
        try {
            writeFileAsync(classifierPersistedPath, JSON.stringify(classifier));
            return true;
        }
        catch (err) {
            console.log("Error during classification save: " + err);
            return false;
        }
    },

    load: async () => {
        try {
            classifier = natural.BayesClassifier.restore(JSON.parse(await readFileAsync(classifierPersistedPath)));
            classifier.stemmer = PorterStemmerRu;
            return true;
        }
        catch (err) {
            console.log("Error during classification load: " + err);
            return false;
        }
    }

}

/***
*
* Web interface
*
***/ 
var interface = express();

interface.use(serveStatic(__dirname + '/interface'));
interface.use(bodyParser.json());

interface.get('/trainingData', async function(req, res) {
    if (await fileExistsAsync(trainingDataPath))
        res.sendFile(trainingDataPath);
    else res.send([]);
});

interface.post('/trainingData', async function(req, res) {
    try {
        await writeFileAsync(trainingDataPath, JSON.stringify(req.body, null, 2));
        res.sendStatus(200);
    }
    catch (err) {
        res.sendStatus(500);
        console.log(err);
    }
})

var interfaceServer = http.createServer(interface);
interfaceServer.listen(process.env.TRAINER_WEB_INTERFACE_PORT || 3002, 'localhost', function() {
    console.log('Classifier training web interface listening on localhost:' + interfaceServer.address().port);
});