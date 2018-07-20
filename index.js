const config         = require('config'),
      express        = require('express'),
      http           = require('http'),
      https          = require('https'),      
      compression    = require('compression'),
      serveStatic    = require('serve-static'),
      bodyParser     = require('body-parser'),
      methodOverride = require('method-override');
      siofu          = require('socketio-file-upload');

//Loading environment variables
require('dotenv').config()

const ioModule = require('./server/modules/io');

var app = express();
var server;

/***
 *
 * HTTP or HTTPS server configuration
 *
 ***/ 
if (process.env.SSL_ENABLED === true) {

    //express instance for redirecting to HTTPS
    var httpapp = express();

    express().get('*', function(req,res) {  
        res.redirect(process.env.HOST);
    })
    
    httpapp.listen(80);

    //setting HTTPS instance
    server = https.createServer({
        key: fs.readFileSync(process.env.SSL_KEY_PATH),
        cert: fs.readFileSync(process.env.SSL_CERT_PATH),
        ca: fs.readFileSync(process.env.SSL_CA_PATH)
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
app.use('/webfonts', serveStatic(__dirname + '/node_modules/@fortawesome/fontawesome-free/webfonts'));
app.use(siofu.router);

//load modules
ioModule.initialize(server);

server.listen(process.env.PORT || 3000, function () {
    console.log('Express server listening on port ' + server.address().port);
});