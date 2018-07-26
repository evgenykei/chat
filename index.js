const config         = require('config'),
      fs             = require('fs'),
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

//Loading modules
const ioModule = require('./server/modules/io');

async function initialize() {

    var app = express();
    var server;
    
    /***
     *
     * HTTP or HTTPS server configuration
     *
     ***/ 
    if (process.env.SSL_ENABLED === 'true') {
    
        //express instance for redirecting to HTTPS
        var httpapp = express();
    
        httpapp.get('*', function(req,res) {  
            res.redirect('https://' + req.headers.host + req.url);
        })
        
        httpapp.listen(process.env.SSL_REDIRECT_PORT);
    
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
    await ioModule.initialize(server);

    server.listen(process.env.PORT || 3000, function () {
        console.log('SAPbot app listening on port ' + server.address().port);
    });

}

initialize();