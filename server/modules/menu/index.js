const fs            = require('fs'),
      util          = require('util'),
      url           = require('url'),
      path          = require('path'),
      config        = require('config'),      
      superagent    = require('superagent'),
      mime          = require('mime-types'),
      quagga        = require('quagga').default,
      moment        = require('moment');
      
const existsAsync    = util.promisify(fs.exists),
      writeAsync     = util.promisify(fs.writeFile),
      readFileAsync  = util.promisify(fs.readFile);

const urls           = config.get('Urls'),
      barcodeReaders = config.get('Barcode.readers');

const menuFilePath = path.join(__dirname, 'menu.json'),
      menu         = [];

/*  
 *  Структура меню
 *  1. Аналитическая отчетность
 *      1.1. Отчет за неделю
 *      1.2. Отчет за месяц
 *  2. Сервисы сотрудника
 *      2.1. Сброс пароля
 *      2.2. Запрос количества дней отпуска
 *      2.3. Заявка на отпуск
 *  3. Обращение в службу поддержки
 *  4. Распознать баркод
 */   
async function readMenu(menu, actions) {
    try {
        let menuObject = JSON.parse(await readFileAsync(menuFilePath));
        let treeQueue = [menuObject], item;
        while (item = treeQueue.shift()) {
            if (!item.hasOwnProperty('id')) throw 'Menu item must have an id';

            let parsedItem = {
                class: item.class,
                action: item.id
            }

            if (item.hasOwnProperty('submenu')) {
                item.submenu.forEach((subitem) => treeQueue.push(subitem));

                parsedItem.submenu = item.submenu.map((subitem) => ({
                    class: subitem.class,
                    title: subitem.title,
                    action: subitem.id + ';' + item.id
                }));

                actions[item.id] = (backAction) => async (socket) => ({
                    type: 'menu',
                    value: backAction === undefined 
                        ? parsedItem.submenu 
                        : [{ title: 'menu.back', action: backAction }].concat(parsedItem.submenu)
                });
            }

            menu.push(parsedItem);
        }
    }
    catch (error) {
        console.log('Error during menu JSON reading: ' + error);
    }
}


//Template: function_name: (args) => async (socket) => function that returns { type, value }
const actions = {

    //1.1. Отчет за неделю
    weekly_report: (args) => async (socket) => ({
        type: 'chart',
        value: null
    }),

    //1.2. Отчет за неделю
    monthly_report: (args) => async (socket) => ({
        type: 'chart',
        value: null
    }),

    //2.1. Сброс пароля
    reset_password: (args) => async (socket) => {
        let result;

        try {
            let phone = socket.get('phone');
            if (!phone) throw 'user\'s phone undefined';

            let query = await superagent
                .get(url.resolve(urls.abapTransformer, urls.abapResetPasswordFunction))
                .query({ phone_number: phone });

            if (query.body.subrc === 0) result = { text: 'action.passwordResetCompleted', args: [ query.body.newpass ] };
            else throw 'bad request';
        }
        catch (err) {
            console.log('Error during password reset: ' + err);
            result = { text: 'action.passwordResetFailed' };
        }

        return { type: 'text', value: result }
    },

    //2.2. Запрос количества дней отпуска
    request_vacation_days: (args) => async (socket) => {
        const dateRegex = /^(0[1-9]|[12][0-9]|3[01]).(0[1-9]|1[012]).(19|20)\d\d$/;

        let timeForAction = socket.setChatHook(dateRegex, async (date) => {
            let result;
            try {
                let phone = socket.get('phone'), parsedDate = moment(date, 'DD.MM.YYYY');
                if (!phone) throw 'user\'s phone undefined';
                if (!parsedDate.isValid()) throw 'The entered date is not valid.';

                parsedDate = parsedDate.format('YYYYMMDD');

                let query = await superagent
                    .get(url.resolve(urls.abapTransformer, urls.abapDaysVacationFunction))
                    .query({ phone_number: phone, dateto: parsedDate });
    
                if (query.body.days) result = { text: 'action.vacationDaysCompleted', args: [ query.body.days ] };
                else throw 'bad request';
            }
            catch (err) {
                console.log('Error during vacation days requesting: ' + err);
                result = { text: 'action.vacationDaysFailed' };
            }

            socket.sendChatData({ type: 'text', value: result });
        });

        return {
            type: 'date',
            value: {
                format: 'dd.mm.yyyy',
                timer: timeForAction
            }
        }
    },

    //2.3. Заявка на отпуск
    request_vacation: (args) => async (socket) => {
        let filePath = path.join(config.get('Directories.upload'), 'test.txt');
        if (!await existsAsync(filePath)) await writeAsync(filePath, 'test');
        return {
            type: 'file',
            value: 'test.txt'
        }
    },

    //3. Обращение в службу поддержки
    contact_support: (args) => async (socket) => {
        let timeForAction = socket.subscribeToAction('upload', (file) => socket.sendChatData({ type: 'file', value: file.name, target: file.target }));

        return {
            type: 'upload',
            value: timeForAction
        };
    },

    //4. Распознать баркод
    read_barcode: (args) => async (socket) => {
        let timeForAction = socket.subscribeToAction('upload', async (file) => {
            try {
                let type = mime.lookup(file.path);
                if (type !== 'image/png' && type !== 'image/jpeg' && type !== 'image/gif') throw 'unsupported file format';

                //TODO: FIX MULTIPLE FILES UPLOADING CRASH
                quagga.decodeSingle({
                    src: file.path,
                    numOfWorkers: 0,
                    decoder: { readers: barcodeReaders },
                }, 
                function(result) {
                    if (result && result.codeResult) socket.sendChatMessage({ text: 'action.barcodeCompleted', args: [ result.codeResult.code ] }, file.target);
                    else socket.sendChatMessage({ text: 'action.barcodeNotDetected' }, file.target);
                });
            }
            catch (err) {
                console.log('Barcode read error: ' + err);
                socket.sendChatMessage({ text: 'action.barcodeFailed' }, file.target);
            }
        });

        return {
            type: 'barcode',
            value: timeForAction
        };
    }
}

module.exports = {

    initialize: async() => await readMenu(menu, actions),

    action: (action) => {
        let args = action.split(';');
        return actions[args[0]](args[1]);
    },

    getClassName: async (message) => {
        try {
            let query = await superagent
                .get(url.resolve(urls.classifier, '/api/predict/' + encodeURIComponent(message)));
            return query.text;
        }
        catch (err) {
            console.log("Error while getting class name: " + err);
            return 'unknown';
        }
    },

    menuByClass: (className) => {
        let foundMenu = menu.find((item) => item.class === className);
        if (!foundMenu) return null;
        return actions[foundMenu.action]();
    }

}