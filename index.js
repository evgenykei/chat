const config         = require('config'),
      express        = require('express'),
      http           = require('http'),
      https          = require('https'),      
      compression    = require('compression'),
      serveStatic    = require('serve-static'),
      bodyParser     = require('body-parser'),
      methodOverride = require('method-override');
      siofu          = require('socketio-file-upload');

const ioModule = require('./server/modules/io');

var app = express();
var server;

/***
 *
 * HTTP or HTTPS server configuration
 *
 ***/ 
if (process.env.ssl_enabled === true) {

    //express instance for redirecting to HTTPS
    var httpapp = express();

    express().get('*', function(req,res) {  
        res.redirect(process.env.host);
    })
    
    httpapp.listen(80);

    //setting HTTPS instance
    server = https.createServer({
        key: fs.readFileSync(process.env.ssl_key_path),
        cert: fs.readFileSync(process.env.ssl_cert_path),
        ca: fs.readFileSync(process.env.ssl_ca_path)
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

server.listen(process.env.port || 3000, function () {
    console.log('Express server listening on port ' + server.address().port);
});