require('../node_modules/bootstrap/dist/js/bootstrap.min.js');
require('../node_modules/jquery/dist/jquery.min.js');

require('../node_modules/bootstrap/dist/css/bootstrap.min.css');
require('../node_modules/@fortawesome/fontawesome-free/css/all.min.css');


const initApp    = require('./modules/functions').appInitialize,
      initIo     = require('./modules/io'),
      initEvents = require('./modules/events');

$(document).ready(function() {
    initApp();

    var socket = initIo();
    initEvents(socket);
});
