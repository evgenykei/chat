require('../node_modules/bootstrap/dist/js/bootstrap.min.js');
require('../node_modules/jquery/dist/jquery.min.js');
require('../node_modules/air-datepicker/dist/js/datepicker.min.js');

require('../node_modules/bootstrap/dist/css/bootstrap.min.css');
require('../node_modules/@fortawesome/fontawesome-free/css/all.min.css');
require('../node_modules/air-datepicker/dist/css/datepicker.min.css');


const preloading = require('./modules/preloader'),
      initApp    = require('./modules/functions').appInitialize,
      initIo     = require('./modules/io'),
      initEvents = require('./modules/events');

$(document).ready(function() {
    preloading(function(socket) {
        initIo(socket);
        initApp(socket);
        initEvents(socket);
    });
});