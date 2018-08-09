const io       = require('socket.io-client'),
      miss     = require('mississippi'),
      cryptojs = require('crypto-js');

//Statistics
const statistics = {
    stat: {},
    delays: [],
    full: [],
    failed: []
};

//Functions
module.exports = (options) => ({

    log: (str) => {
        if (options.debug === true) console.log(str);
    },

    encryptText: (text, password) => cryptojs.Rabbit.encrypt(text, password).toString(),

    sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

    ioRequest: (socket, name, value, responseName, ssSocket) => new Promise((resolve, reject) => {
        let time1, time2;
        if (responseName) {
            let timeout = setTimeout(() => {
                statistics.failed.push({ from: name, to: responseName });
                reject(`waiting for response on channel '${responseName}' is timed out`);
            }, (options.requestTimeout || 60) * 1000);
            socket.on(responseName, function(data) {
                clearTimeout(timeout);
                socket.removeListener(responseName, this);

                time2 = process.hrtime(time1)[1] / 1e6;
                statistics.delays.push(time2);
                statistics.full.push({ from: name, to: responseName, delay: time2 });

                resolve(data);
            });
        }
        if (ssSocket) ssSocket.emit(name, value);
        else socket.emit(name, value);
        time1 = process.hrtime();
    }),

    generateRandomData: (size) => {
        let chars = 'abcdefghijklmnopqrstuvwxyz'.split(''), len = chars.length, random_data = [];
        while (size--) random_data.push(chars[Math.random()*len | 0]);
        return random_data.join('');
    },

    streamFromString: (string) => miss.from(function(size, next) {
        if (string.length <= 0) return next(null, null)
        let chunk = string.slice(0, size)
        string = string.slice(size)
        next(null, chunk)
    }),

    run: async (phases, scenes) => {
        for (let i = 0; i < phases.length; i++) {
            let newUserTimeout = phases[i].seconds / phases[i].users * 1000;
            console.log(`Phase ${i + 1} started. Running new user each ${phases[i].seconds / phases[i].users} seconds.`);
                
            let promises = [];
            for (let k = 0; k < phases[i].users; k++) promises.push(new Promise((resolve, reject) => setTimeout(async function() {
                for (let j = 0; j < scenes.length; j++) {
                    let socket;
                    try {
                        socket = await(new Promise((resolve, reject) => {
                            let socket = io.connect(options.url || 'localhost', {'force new connection': true});
                            socket.on('connect', () => resolve(socket));
                        }))
                        console.log(await scenes[j](socket, i + 1, j + 1, k + 1)); 
                    }
                    catch (err) { console.log(err); }
                    finally { socket.disconnect(); }
                }
                resolve();
            }, k * newUserTimeout)));
            await Promise.all(promises);
            console.log(`Phase ${i + 1} ended`);   
        }

        //Create statistics
        statistics.stat.min = Math.min.apply(null, statistics.delays);
        statistics.stat.max = Math.max.apply(null, statistics.delays);
        statistics.stat.med = median(statistics.delays);
        statistics.stat.p95 = percentile(statistics.delays, 0.95);
        statistics.stat.p99 = percentile(statistics.delays, 0.99);
        statistics.stat.failed = statistics.failed.length / (statistics.delays.length + statistics.failed.length);

        return statistics;
    }

});

//Helpers
function median(numbers) {
    var median = 0, numsLen = numbers.length;
    numbers.sort();
 
    if (numsLen % 2 === 0) median = (numbers[numsLen / 2 - 1] + numbers[numsLen / 2]) / 2;
    else median = numbers[(numsLen - 1) / 2];
 
    return median;
}

function percentile(arr, p) {
    if (arr.length === 0) return 0;
    if (typeof p !== 'number') throw new TypeError('p must be a number');
    if (p <= 0) return arr[0];
    if (p >= 1) return arr[arr.length - 1];
    
    arr.sort(function (a, b) { return a - b; });
    var index = (arr.length - 1) * p
        lower = Math.floor(index),
        upper = lower + 1,
        weight = index % 1;
    
    if (upper >= arr.length) return arr[lower];
    return arr[lower] * (1 - weight) + arr[upper] * weight;
}