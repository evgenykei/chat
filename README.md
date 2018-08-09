# SAPbot

## Установка

Склонируйте репозиторий

```bash
git clone https://github.com/evgenykei/chat.git
```

Установите зависимости и соберите скрипты для клиента

```bash
yarn install
yarn build
```

## Запуск

```bash
node index
```

или

```bash
yarn start
```

## Конфигурация

### Переменные окружения

Создайте файл *.env* в корневой директории. Он должен содержать следующие параметры:

```ini
# Порт, на котором будет работать сервер (HTTP или HTTPS)
PORT = 3001
# Порт, с которого будет перенаправляться HTTP траффик на HTTPS (если включено SSL_ENABLED)
SSL_REDIRECT_PORT = 3000

# Включить HTTPS
SSL_ENABLED = true

# Пути к SSL ключам
SSL_KEY_PATH = "./ssl/privkey.pem"
SSL_CERT_PATH = "./ssl/cert.pem"
SSL_CA_PATH = "./ssl/chain.pem"
```

### Настройки сервера

Конфигурация сервера расположена по пути */config/default.json*

Параметр | Описание
------------ | -------------
General.defaultLocale | язык по умолчанию, значение - название файла из директории локализации (по-умолчанию */locale/*)
SMSAuth.apiKey | API ключ сервиса sms.ru, необходимого для работы аутентификации
SMSAuth.smsText | текст СМС, отправляемого при аутентификации (необходимо наличие единственного %s alias-a)
Urls.abapTransformer | ссылка на API ABAP-функций (оканчивается на /fmcall/)
Urls.abapResetPasswordFunction | название ABAP-функции для сброса пароля пользователя
Urls.abapDaysVacationFunction | название ABAP-функции для запроса количества дней отпуска
Urls.classifier | ссылка на API классификации
Timers.sessionLife | время жизни сессии, в течение которой пользователь может переподключиться без аутентификации
Timers.callConfirmationCheckInterval | интервал времени для проверки статуса аутентификации по звонку (sms.ru)
Timers.callConfirmationTimeout | время, после которого аутентификационный звонок станет недействительным
Timers.verificationDelay | время, в течение которого невозможно повторно отправить аутентификационное СМС или звонок
Timers.timeForAction | время, в течение которого необходимо осуществить то или иное действие в чате (напр. загрузка файлов)
Files.unixFileMode | значение прав доступа в ОС Unix, с которым будут создаваться файлы при загрузке
Barcode.readers | список стандартов, применяемых для распознавания баркодов (возможные стандарты перечислены в самом конфигурационном файле)
Directories.files | путь к файлам сервера, используемых в функциональном меню
Directories.upload | путь к директории, куда будут загружаться клиентские файлы
Directories.locale | путь к файлам локализации

### Классификация и функции меню

За классификацию и структуру меню отвечает отдельный проект https://github.com/evgenykei/fasttext-classification.

Все функции меню расположены в */modules/menu/index.js*. Для их вызова пункт меню из *json*-файла должен иметь идентичный названию функции *id*. 

Например, функция *reset_password*:

**index.js**
```javascript
...
reset_password: (args) => async (socket) => {
    ...
}
...
```

**menu.json**
```json
...
"submenu": [
   {
      "id": "reset_password",
      "title": "menu.resetPassword"
   },
   ...
]
```




