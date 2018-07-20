module.exports = function() {

    const Utf8      = require('crypto-js/enc-utf8'),
          Base64    = require('crypto-js/enc-base64'),
          SHA1      = require('crypto-js/sha1');

    const functions = require('./functions'),
          config    = require('./config');

    
    const socket = io.connect();
    
    module.exports.socket = socket;

    /* 
     *
     * Trying to restore session
     * 
     */

    var session = localStorage.getItem('session');
    try {
        session = Base64.parse(session).toString(Utf8).split('.');
        config.phone = session[0];
        config.code = session[1];
        socket.emit('restoreSession', config.phone, config.code);
    }
    catch(error) {
        functions.showLogin();
        localStorage.removeItem('session');
    }

    /* 
     *
     * Initialize socket.io uploader
     * 
     */

    var uploader = new SocketIOFileUpload(socket);
    uploader.listenOnDrop(document.getElementById("main-body"));
    uploader.listenOnInput(document.getElementById("file-select"));

    uploader.addEventListener("start", function(data){
        functions.printText("<div class=\"status-message\">Uploading file... Please wait.</div>");
    });


    /* 
     *
     * Verification
     * 
     */

    socket.on("verifyConfirm", function(message, type, _phone, code) {
        if (type === 'sms') {
            $("#code").val('');
            $("#code").show();
        }
        else if (type === 'call') $("#code").hide();
    
        $("#join").show();

        functions.postConnectStatus("<li><strong>" + message + "</strong></li>");
        config.phone = _phone;
    	$("#code").val(code);
    });
    
    socket.on("verifyFail", function(failure) {
        functions.postConnectStatus("<li><strong>Verification request denied: " + failure + "</strong></li>");
    });

    /* 
     *
     * Joining
     * 
     */

    socket.on("joinConfirm", function () {
        /* Focus the message box, unless you're mobile, it which case blur
        * everything that might have focus so your keyboard collapses and
        * you can see the full room layout and options, especially the menu.
        */
        if (config.isMobile) {
            $("#phone").blur();
            $("#code").blur();
        }
        else $("#msg").focus()

        //save crypto password
        config.password = SHA1(config.phone + "." + config.code).toString();

        //save session
        localStorage.setItem('session', Base64.stringify(Utf8.parse(config.phone + "." + config.code)));

        functions.showChat();
    });

    socket.on("joinFail", function (failure) {
        functions.postConnectStatus("<li><strong>Join request denied: " + failure + "</strong></li>");
    });

    /* 
     *
     * Chatting
     * 
     */

    socket.on("chat", function (payload) {
        var msg;
        try {
            msg = functions.decryptOrFail(payload.value, config.password);
        }
        catch (err) {
            payload.type = 'text';
            msg = "Unable to decrypt: " + payload.value;
        }

        //regex to match URLS
        var matchPattern = /(\b(((https?|ftp):\/\/)|magnet:)[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim;

        if (payload.type === 'text') {
            msg = functions.sanitizeToHTMLSafe(msg).replace(matchPattern, '<a href="$1" target="_blank">$1</a>');
            functions.postChat(payload.type, msg, payload.from);
        }

        /*
        else if (payload.type === 'image') {
            if ($('#config-receive-imgs').is(':checked'))
                msgCore = "<img src=\"" + msg + "\"><span class=\"img-download-link\" style=\"display: none;\"><br /><a target=\"_blank\" href=\"" + msg + "\">View/Download Image</a>";
            else 
                msgCore = "<span class=\"text-danger\">Image blocked by configuration</span>";
        }*/

        else if (payload.type === 'menu') {
            functions.buildMenu(JSON.parse(msg));
        }

        else if (payload.type === 'chart') {
            var canvasId = "message-" + config.messageCount + "-canvas";
            functions.postChat(payload.type, "<canvas id=\"" + canvasId + "\" width=\"400\" height=\"400\"></canvas>", payload.from);
            functions.buildChart(canvasId);
        }

        else if (payload.type === 'upload') {
            functions.postChat(payload.type, 'Server requests file(s) to upload. You have ' + msg + ' seconds.', payload.from);
        }
        
    });

    /* 
     *
     * Connection operations
     * 
     */

    socket.on('wrongSession', function() {
        localStorage.removeItem('session');
        functions.showLogin();
    });

    //reload when we get disconnected
    socket.on("disconnect", function () {
        location.reload();
    });

    return socket;
}