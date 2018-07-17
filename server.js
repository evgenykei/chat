const config         = require('config'),
      express        = require('express'),
      http           = require('http'),
      https          = require('https'),      
      compression    = require('compression'),
      serveStatic    = require('serve-static'),
      bodyParser     = require('body-parser'),
      methodOverride = require('method-override');
      siofu          = require('socketio-file-upload');

const ioModule = require('./modules/io');

var app = express();
var server;
var enable_ssl = false;

/***
 *
 * HTTP or HTTPS server configuration
 *
 ***/ 
if (enable_ssl === true) {

    //express instance for redirecting to HTTPS
    var httpapp = express();

    express().get('*', function(req,res) {  
        res.redirect(config.get('Express.host'));
    })
    
    httpapp.listen(80);

    //setting HTTPS instance
    server = https.createServer({
        key: fs.readFileSync('ssl/ssl.key'),
        cert: fs.readFileSync('ssl/ssl.crt'),
        ca: fs.readFileSync('ssl/ssl.ca-bundle')
    }, app);
} 
else {
    server = http.createServer(app);
}

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended : false }));
app.use(methodOverride());
app.use(compression());
app.use(serveStatic(__dirname + '/public'));
app.use('/components', serveStatic(__dirname + '/node_modules/@bower_components'));
app.use(siofu.router);

//load modules
ioModule.initialize(server);

server.listen(process.env.PORT || config.get('Express.port'), function () {
    console.log('Express server listening on port ' + server.address().port);
});