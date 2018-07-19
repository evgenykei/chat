require('bootstrap');
require('../node_modules/bootstrap/dist/css/bootstrap.css')
require('../node_modules/font-awesome/css/font-awesome.min.css');
require('jquery');

const initApp    = require('./modules/functions').appInitialize,
      initIo     = require('./modules/io'),
      initEvents = require('./modules/events');

$(document).ready(function() {
    initApp();

    var socket = initIo();
    initEvents(socket);
});
