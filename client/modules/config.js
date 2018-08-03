module.exports = config = {
    appName: "SAPbot",

    password: null,
    phone: null,
    code: null,
    lang: null,

    messageCount: 0,
    customMode: 0,
    missedNotifications: 0,

    installPWAEvent: null,

    notify: new Audio('sounds/notify.wav'),

    isMobile: false
}