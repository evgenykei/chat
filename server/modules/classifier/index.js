const fs              = require('fs'),
      util            = require('util'),
      path            = require('path'),
      natural         = require('natural'),
      PorterStemmerRu = require.main.require('./node_modules/natural/lib/natural/stemmers/porter_stemmer_ru');

const fileExistsAsync         = util.promisify(fs.exists),
      writeFileAsync          = util.promisify(fs.writeFile),
      readFileAsync           = util.promisify(fs.readFile);
    

const trainingDataPath        = path.join(__dirname, '/training.json'),
      classifierPersistedPath = path.join(__dirname, '/classifier.json');

var classifier  = new natural.BayesClassifier(PorterStemmerRu);

module.exports = functions = {

    initialize: async () => {
        try {
            //Check training data and train
            if (await fileExistsAsync(trainingDataPath)) {
                await functions.train(JSON.parse(await readFileAsync(trainingDataPath)));
                await functions.save();
            }
            //Else load
            else await functions.load();
        }
        catch (err) {
            console.log("Error during classifier initialization: " + err);
        }
    },

    /**
     * Trains classifier
     * 
     * @typedef {Object} TrainingElement
     * @property {string} text Text for training.
     * @property {string} class Class to which text belongs.
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


    classify: (text) => {
        try {
            return classifier.classify(text);
        }
        catch (err) {
            console.log("Error during classification: " + err);
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
            return true;
        }
        catch (err) {
            console.log("Error during classification load: " + err);
            return false;
        }
    }

}