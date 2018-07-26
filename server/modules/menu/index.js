const fs            = require('fs'),
      util          = require('util'),
      path          = require('path'),
      config        = require('config');
      
const existsAsync   = util.promisify(fs.exists),
      writeAsync    = util.promisify(fs.writeFile),
      readFileAsync = util.promisify(fs.readFile);    

const timeForUploading = config.get('Timers.timeForUploading');

module.exports = {

    /*  Структура меню
        1. Аналитическая отчетность
            1.1. Отчет за неделю
            1.2. Отчет за месяц
        2. Сервисы сотрудника
            2.1. Сброс пароля
            2.2. Запрос количества дней отпуска
            2.3. Заявка на отпуск
        3. Обращение в службу поддержки
     */

    //Меню
    root_action: async (socket) => ({
        type: 'menu',
        value: [
            {
                title: 'Аналитическая отчетность',
                action: 'analytical_reports'
            },
            {
                title: 'Сервисы сотрудника',
                action: 'employee_services'
            },
            {
                title: 'Обращение в службу поддержки',
                action: 'contact_support'
            }
        ]
    }),

    //1. Аналитическая отчетность
    analytical_reports: async (socket) => ({
        type: 'menu',
        value: [
            {
                title: 'Назад',
                action: 'root_action'
            },
            {
                title: 'Отчет за неделю',
                action: 'weekly_report'
            },
            {
                title: 'Отчет за месяц',
                action: 'monthly_report'
            }
        ]
    }),

    //1.1. Отчет за неделю
    weekly_report: async (socket) => ({
        type: 'chart',
        value: null
    }),

    //1.2. Отчет за неделю
    monthly_report: async (socket) => ({
        type: 'chart',
        value: null
    }),

    //2. Сервисы сотрудника
    employee_services: async (socket) => ({
        type: 'menu',
        value: [
            {
                title: 'Назад',
                action: 'root_action'
            },
            {
                title: 'Сброс пароля',
                action: 'reset_password'
            },
            {
                title: 'Запрос количества дней отпуска',
                action: 'request_vacation_days'
            },
            {
                title: 'Заявка на отпуск',
                action: 'request_vacation'
            }
        ]
    }),

    //2.1. Сброс пароля
    reset_password: async (socket) => ({
        type: 'text',
        value: await (async() => {
            let filePath = path.join(config.get('Directories.files'), 'reset_password.txt');
            if (!await existsAsync(filePath)) await writeAsync(filePath, 'reset_password');
            return await readFileAsync(filePath, 'utf8');
        })()
    }),

    //2.2. Запрос количества дней отпуска
    request_vacation_days: async (socket) => ({
        type: 'text',
        value: await (async() => {
            let filePath = path.join(config.get('Directories.files'), 'request_vacation_days.txt');
            if (!await existsAsync(filePath)) await writeAsync(filePath, 'request_vacation_days');
            return await readFileAsync(filePath, 'utf8');
        })()
    }),

    //2.3. Заявка на отпуск
    request_vacation: async (socket) => {
        let filePath = path.join(config.get('Directories.upload'), 'test.txt');
        if (!await existsAsync(filePath)) await writeAsync(filePath, 'test');
        return {
            type: 'file',
            value: 'test.txt'
        }
    },

    //3. Обращение в службу поддержки
    contact_support: async (socket) => {
        socket.setTimeout('uploadTill', timeForUploading);
        return {
            type: 'upload',
            value: timeForUploading
        };
    },  

    /*//Uploading example
    button3_3_action: async function(socket) {
        socket.setTimeout('uploadTill', timeForUploading);
        return {
            type: 'upload',
            value: timeForUploading
        };
    }*/

}