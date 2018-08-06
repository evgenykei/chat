module.exports = function(socket) {

    const Utf8       = require('crypto-js/enc-utf8'),
          Base64     = require('crypto-js/enc-base64'),
          SHA1       = require('crypto-js/sha1'),
          downloadjs = require("../lib/download"),
          miss       = require('mississippi'),
          ss         = require('socket.io-stream');

    const functions  = require('./functions'),
          config     = require('./config');

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
     * Verification
     * 
     */

    socket.on("verifyConfirm", function(langObj, type, _phone, code) {
        let message = functions.langFormat(langObj);

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
    
    socket.on("verifyFail", function(langObj) {
        let message = functions.langFormat(langObj)
        functions.postConnectStatus("<li><strong>" + functions.format(config.lang['status.verificationDenied'], message) + "</strong></li>");
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

    socket.on("joinFail", function (langObj) {
        let message = functions.langFormat(langObj)
        functions.postConnectStatus("<li><strong>" + functions.format(config.lang['status.joinDenied'], message) + "</strong></li>");
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
            msg = functions.format(config.lang['status.uploadNotSupported'], data);
            from = "Server";
        }

        //regex to match URLS
        var matchPattern = /(\b(((https?|ftp):\/\/)|magnet:)[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim;

        if (type === 'text') {
            if (from === 'Server') msg = functions.langFormat(msg);
            msg = functions.sanitizeToHTMLSafe(msg).replace(matchPattern, '<a href="$1" target="_blank">$1</a>');
            functions.postChat(type, msg, from);
        }

        //////TEMPORARY
        else if (type === 'class'){
            msg = functions.sanitizeToHTMLSafe(msg).replace(matchPattern, '<a href="$1" target="_blank">$1</a>');
            functions.postChat(type, msg, from);
        }
        /////

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
                "<div id=\"" + msg + "\" class=\"btn file-download\"> \
                    <span class=\"mr-2 fa-stack fa\"> \
                        <i class=\"far fa-circle fa-stack-2x\"></i> \
                        <i class=\"fa fa-arrow-down fa-stack-1x\"></i> \
                    </span> \
                    " + msg + " \
                </div>" 
            , from);
        }

        else if (type === 'upload') {
            functions.postChat(type, functions.format(config.lang['message.uploadFile'], msg), from);
        }

        else if (type === 'barcode') {
            functions.postChat(type, functions.format(config.lang['message.uploadBarcode'], msg), from);
        }

        else if (type === 'date') {
            functions.buildDatepicker(socket, msg.format, msg.timer);
            functions.postChat(type, functions.format(config.lang['message.enterDate'], msg.format), from);
        }
        
    });

    /* 
     *
     * Languages operations
     * 
     */

    socket.on('language', function(name, language) {
        localStorage.setItem('lang', name);
        config.lang = language;

        $('#phone').attr('placeholder', language['auth.phone']);
        $('#phoneLabel').text(language['auth.phone']);
        $('#verifySMS').text(language['auth.verifySMS']);
        $('#verifyCall').text(language['auth.verifyCall']);
        $('#code').attr('placeholder', language['auth.code']);
        $('#codeLabel').text(language['auth.code']);
        $('#join').text(language['auth.signIn']);
        $('#lang').text(language['auth.lang']);
        $('#pwa-banner-title').text(language['pwa.title']);
        $('#pwa-banner-install').text(language['pwa.install']);
        $('#msg').attr('placeholder', language['interface.chatInput']);
    });

    /* 
     *
     * File operations
     * 
     */

    ss(socket).on('downloadFile', function(receive, data) {
        try {
            //parse input
            data = JSON.parse(functions.decrypt(data));
            if (!receive || !data.filename || !data.mime) throw "Wrong payload";
            
            //configure streams
            let decrypt = miss.through(
                function (chunk, enc, cb) {
                    cb(null, Buffer.from(functions.decrypt(chunk.toString()), 'hex'));
                },
                function (cb) { cb(null, ''); }
            );
            let concat = miss.concat(function(buffer) {
                downloadjs(buffer, data.filename, data.mime);
            });

            //pipe streams
            miss.pipe(receive, decrypt, concat);
        }
        catch (err) {
            functions.printChatStatus(config.lang['error.fileDecryption']);
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