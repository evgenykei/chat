const fs            = require('fs'),
      util          = require('util'),
      config        = require('config'),
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
        type: 'text',
        value: await readFileAsync('./server/files/weekly_report.txt', 'utf8')
    }),

    //1.2. Отчет за неделю
    monthly_report: async (socket) => ({
        type: 'text',
        value: await readFileAsync('./server/files/monthly_report.txt', 'utf8')
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
        value: await readFileAsync('./server/files/reset_password.txt', 'utf8')
    }),

    //2.2. Запрос количества дней отпуска
    request_vacation_days: async (socket) => ({
        type: 'text',
        value: await readFileAsync('./server/files/request_vacation_days.txt', 'utf8')
    }),

    //2.3. Заявка на отпуск
    request_vacation: async (socket) => ({
        type: 'text',
        value: await readFileAsync('./server/files/request_vacation.txt', 'utf8')
    }),    

    //3. Обращение в службу поддержки
    contact_support: async (socket) => ({
        type: 'text',
        value: await readFileAsync('./server/files/contact_support.txt', 'utf8')
    }),  

    /*//Uploading example
    button3_3_action: async function(socket) {
        socket.setTimeout('uploadTill', timeForUploading);
        return {
            type: 'upload',
            value: timeForUploading
        };
    }*/

}