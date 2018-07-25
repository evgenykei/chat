module.exports = function() {

    const Utf8       = require('crypto-js/enc-utf8'),
          Base64     = require('crypto-js/enc-base64'),
          SHA1       = require('crypto-js/sha1'),
          downloadjs = require("../lib/download");

    const functions  = require('./functions'),
          config     = require('./config');

    
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
        functions.printChatStatus("Uploading file... Please wait.");
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

    socket.on("chat", function (data) {
        var type, msg, from;
        try {
            var decrypted = JSON.parse(functions.decrypt(data));
            type = decrypted.type;
            msg = decrypted.value;
            from = decrypted.from;
        }
        catch (err) {
            type = 'text';
            msg = "Unable to decrypt: " + data;
            from = "Server";
        }

        //regex to match URLS
        var matchPattern = /(\b(((https?|ftp):\/\/)|magnet:)[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim;

        if (type === 'text') {
            msg = functions.sanitizeToHTMLSafe(msg).replace(matchPattern, '<a href="$1" target="_blank">$1</a>');
            functions.postChat(type, msg, from);
        }

        /*
        else if (type === 'image') {
            if ($('#config-receive-imgs').is(':checked'))
                msgCore = "<img src=\"" + msg + "\"><span class=\"img-download-link\" style=\"display: none;\"><br /><a target=\"_blank\" href=\"" + msg + "\">View/Download Image</a>";
            else 
                msgCore = "<span class=\"text-danger\">Image blocked by configuration</span>";
        }*/

        else if (type === 'menu') {
            functions.buildMenu(msg);
        }

        else if (type === 'chart') {
            var canvasId = "message-" + config.messageCount + "-canvas";
            functions.postChat(type, "<canvas id=\"" + canvasId + "\" width=\"auto\" height=\"auto\"></canvas>", from);
            functions.buildChart(canvasId);
        }

        else if (type === 'file') {
            functions.postChat(type, 
                "<div id=" + msg + " class=\"btn file-download\"> \
                    <span class=\"mr-2 fa-stack fa\"> \
                        <i class=\"far fa-circle fa-stack-2x\"></i> \
                        <i class=\"fa fa-arrow-down fa-stack-1x\"></i> \
                    </span> \
                    " + msg + " \
                </div>" 
            , from);
        }

        else if (type === 'upload') {
            functions.postChat(type, 'Server requests file(s) to upload. You have ' + msg + ' seconds.', from);
        }
        
    });

    /* 
     *
     * File operations
     * 
     */

    socket.on('downloadFile', function(data) {
        try {
            data = JSON.parse(functions.decrypt(data));
            if (!data.base64 || !data.filename || !data.mimeType) throw "Wrong payload";
            downloadjs(data.base64, data.filename, data.mimeType);
        }
        catch (err) {
            functions.printChatStatus("An error occured during decrypting file.");
        }        
    })

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