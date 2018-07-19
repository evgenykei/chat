module.exports = function() {

    const CryptoJS = require('crypto-js');

    const functions = require('./functions'),
          config    = require('./config');

    
    const socket = io.connect("http://127.0.0.1:" + config.ioPort);
    
    module.exports.socket = socket;

    /* 
     *
     * Trying to restore session
     * 
     */

    var session = localStorage.getItem('session');
    try {
        session = CryptoJS.enc.Base64.parse(session).toString(CryptoJS.enc.Utf8).split('.');
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
        functions.postChat("<div class=\"status-message\">Uploading file... Please wait.</div>");
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
        config.password = CryptoJS.SHA1(config.phone + "." + config.code).toString();

        //save session
        localStorage.setItem('session', CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(config.phone + "." + config.code)));

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

        //msg core is used later in message construction
        var msgCore, msgOwner = null;

        //regex to match URLS
        var matchPattern = /(\b(((https?|ftp):\/\/)|magnet:)[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim;

        if (payload.type === 'text') {
            msgCore = functions.sanitizeToHTMLSafe(msg).replace(matchPattern, '<a href="$1" target="_blank">$1</a>');
        }

        else if (payload.type === 'image') {
            if ($('#config-receive-imgs').is(':checked'))
                msgCore = "<img src=\"" + msg + "\"><span class=\"img-download-link\" style=\"display: none;\"><br /><a target=\"_blank\" href=\"" + msg + "\">View/Download Image</a>";
            else 
                msgCore = "<span class=\"text-danger\">Image blocked by configuration</span>";
        }

        else if (payload.type === 'menu') {
            functions.buildMenu(JSON.parse(msg));
            return;
        }

        else if (payload.type === 'upload') {
            msgCore = 'Server requests file(s) to upload. You have ' + msg + ' seconds.';
        }

        //post the message
        if (config.phone === payload.from) msgOwner = "my-message";
        else {
            msgOwner = "their-message";
            if (payload.type === 'menu') msgOwner += " menu";
            if (msgCore.indexOf(config.phone) > -1) msgOwner += " mentioned";
        }

        let message = $("<div class=\"message " + msgOwner + "\" id=\"message-" + config.messageCount + "\"></div>")
        if (payload.from === "Server") { 
            $("<span class=\"message-metadata fa-stack fa-lg\"><i class=\"far fa-circle fa-stack-2x\"></i><i class=\"fa fa-robot fa-stack-1x\"></i></span>").appendTo(message);
            $("<span class=\"message-body\"> " + msgCore + "</span>").appendTo(message);
        }
        else {
            $("<span class=\"message-body\"> " + msgCore + "</span>").appendTo(message);
            $("<span class=\"message-metadata fa-stack fa-lg\"><i class=\"far fa-circle fa-stack-2x\"></i><i class=\"fa fa-user-tie fa-stack-1x\"></i></span>").appendTo(message); 
        } 

        functions.postChat(message, (msgCore.indexOf(config.phone) > -1));
        config.messageCount++;
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