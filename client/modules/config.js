module.exports = config = {
    appName: "SAPbot",
    ioPort: "3000",

    password: null,
    phone: null,
    code: null,

    messageCount: 0,
    customMode: 0,
    missedNotifications: 0,

    installPWAEvent: null,

    notify: new Audio('sounds/notify.wav'),

    isMobile: false
}