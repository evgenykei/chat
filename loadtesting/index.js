require('dotenv').config()

const miss = require('mississippi'),
      ss   = require('socket.io-stream'),      
      cryptojs = require('crypto-js');

const writeFileAsync = require('util').promisify(require('fs').writeFile);

const engine = require('./engine')({
    url: 'http://localhost:'+ (process.env.PORT || 3000),
    requestTimeout: 30,
    debug: true
});


/*
 *
 * TEST PHASES
 * 
 */

const phases = [
    { 'users': 100, 'seconds': 30 },
    { 'users': 300, 'seconds': 60 },
    { 'users': 500, 'seconds': 90 },
    { 'users': 1000, 'seconds': 120 },
]

/*
 *
 * TEST SCENES
 * 
 */

//Scene 1: подключение, отправка последовательно текстовых Сообщений «привет», «какие команды есть»
const scene1 = (socket, phase, scene, user) => new Promise(async (resolve, reject) => {
    let prefix = `[phase ${phase} scene ${scene}, user ${user}]`;
    engine.log(`${prefix} connected to the server`);

    let phone = '+79009000000', code, password, result;

    try {
        //getting sms code
        result = await engine.ioRequest(socket, 'verifyReq', { phone: phone, type: 'sms' }, 'verifyConfirm');
        phone = result.phone;
        code = result.code;
        password = cryptojs.SHA1(phone + '.' + code).toString();
        engine.log(`${prefix} requested verification`);

        //pause
        await engine.sleep(2000);

        //sending sms code
        await engine.ioRequest(socket, 'joinReq', code, 'joinConfirm');
        engine.log(`${prefix} verification confirmed`);

        //pause
        await engine.sleep(2000);

        //sending message 1
        await engine.ioRequest(socket, 'textSend', engine.encryptText('привет', password), 'chat');
        engine.log(`${prefix} sent text 'привет'`);

        //pause
        await engine.sleep(2000);

        //sending message 2
        await engine.ioRequest(socket, 'textSend', engine.encryptText('какие команды есть', password), 'chat');
        engine.log(`${prefix} sent text 'какие команды есть'`);

        //pause
        await engine.sleep(2000);

        //end
        resolve(`${prefix} successfully finished`);
    }
    catch (err) {
        reject(`${prefix} ended with error: ${err}`);
    }
});

//Scene 2: подключение, вызов пункта сброс пароля через меню
const scene2 = (socket, phase, scene, user) => new Promise(async (resolve, reject) => {
    let prefix = `[phase ${phase} scene ${scene}, user ${user}]`;
    engine.log(`${prefix} connected to the server`);

    let phone = '+79009000000', code, password, result;

    try {
        //getting sms code
        result = await engine.ioRequest(socket, 'verifyReq', { phone: phone, type: 'sms' }, 'verifyConfirm');
        phone = result.phone;
        code = result.code;
        password = cryptojs.SHA1(phone + '.' + code).toString();
        engine.log(`${prefix} requested verification`);

        //pause
        await engine.sleep(2000);

        //sending sms code
        await engine.ioRequest(socket, 'joinReq', code, 'joinConfirm');
        engine.log(`${prefix} verification confirmed`);

        //pause
        await engine.sleep(2000);

        //sending menu request
        await engine.ioRequest(socket, 'buttonAction', engine.encryptText('reset_password', password), 'chat');
        engine.log(`${prefix} requested menu function 'reset_password'`);

        //pause
        await engine.sleep(2000);

        //end
        resolve(`${prefix} successfully finished`);
    }
    catch (err) {
        reject(`${prefix} ended with error: ${err}`);
        socket.disconnect();
    }
});

//Scene 3: подключение, отправка файла размером 1 мгб
const scene3 = (socket, phase, scene, user) => new Promise(async (resolve, reject) => {
    let prefix = `[phase ${phase} scene ${scene}, user ${user}]`;
    engine.log(`${prefix} connected to the server`);

    let phone = '+79009000000', code, password, result;

    try {
        //getting sms code
        result = await engine.ioRequest(socket, 'verifyReq', { phone: phone, type: 'sms' }, 'verifyConfirm');
        phone = result.phone;
        code = result.code;
        password = cryptojs.SHA1(phone + '.' + code).toString();
        engine.log(`${prefix} requested verification`);

        //pause
        await engine.sleep(2000);

        //sending sms code
        await engine.ioRequest(socket, 'joinReq', code, 'joinConfirm');
        engine.log(`${prefix} verification confirmed`);

        //pause
        await engine.sleep(2000);

        //requesting upload
        await engine.ioRequest(socket, 'buttonAction', engine.encryptText('contact_support', password), 'chat');

        //pause
        await engine.sleep(2000);

        //sending 1mb file
        let read = engine.streamFromString(engine.generateRandomData(1024 * 1024));
        let encrypt = miss.through(
            (chunk, enc, cb) => {
                cb(null, engine.encryptText(chunk.toString('hex'), password));
            },
            (cb) => cb(null, '')
        )
        let send = ss.createStream();

        miss.pipe(read, encrypt, send);
        await engine.ioRequest(socket, 'uploadFile', { stream: send, name: engine.encryptText('fortest.txt', password), size: engine.encryptText('1048576', password) }, 'chat', ss(socket));
        engine.log(`${prefix} file uploaded`);

        //pause
        await engine.sleep(2000);

        //end
        resolve(`${prefix} successfully finished`);
    }
    catch (err) {
        reject(`${prefix} ended with error: ${err}`);
        socket.disconnect();
    }
});

/*
 *
 * RUN TESTS
 * 
 */

(async () => {
    let statistics = await engine.run(phases, [ scene1, scene2, scene3 ]);
    await writeFileAsync('statistics.json', JSON.stringify(statistics, null, 2));
    console.log('Finished!');
})();