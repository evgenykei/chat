const Rabbit = require('crypto-js/rabbit'),
      Utf8   = require('crypto-js/enc-utf8'),
      Chart  = require('chart.js'),
      _      = require('underscore'),
      miss   = require('mississippi'),
      ss     = require('socket.io-stream');

const config = require('./config');

module.exports = functions = {

    /* 
     *
     * Print message to chat window
     * 
     */

    appInitialize: function() {
        $("form").submit(function(event) {
          event.preventDefault();
        });

        $(".app-title-box").html(config.appName);

        $("#chat-screen").hide();

        if (!(window.File && window.FileReader && window.FileList && window.Blob)) {
          ("#connect-status").append("<li>" + config.lang['status.uploadNotSupported'] + "</li>");
        }

        functions.mobileChecking(navigator.userAgent || navigator.vendor || window.opera);

        //PWA install event
        window.addEventListener('beforeinstallprompt', (e) => {
            // Prevent Chrome 67 and earlier from automatically showing the prompt
            e.preventDefault();
            // Stash the event so it can be triggered later.
            config.installPWAEvent = e;
            $("#pwa-banner").show();
        });

        //Registering service worker
        if ('serviceWorker' in navigator) {
            let register = function() {
                navigator.serviceWorker.register('/sw.js').then(function(registration) {
                    // Registration was successful
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                }, function(err) {
                    // registration failed :(
                    console.log('ServiceWorker registration failed: ', err);
                });
            };

            document.readyState == 'complete' ? register() : window.addEventListener('load', register);
        }
    },

    /*
     *
     * Prepare chat message
     * 
     */
    
    prepareChatMessage: function (socket, data, decrypted, history = true) {
        var type, msg, from, target, id;
        try {
            decrypted = decrypted || JSON.parse(functions.decrypt(data));
            type = decrypted.type;
            msg = decrypted.value;
            from = decrypted.from;
            target = decrypted.target;
        }
        catch (err) {
            type = 'text';
            msg = functions.format(config.lang['status.uploadNotSupported'], data);
            from = "Server";
        }

        if (type === 'text') {
            if (from === 'Server') msg = functions.langFormat(msg);
            id = functions.postChat(type, msg, from, target);
        }

        //////TEMPORARY
        else if (type === 'class'){
            id = functions.postChat(type, msg, from, target);
        }
        /////

        /*
        else if (type === 'image') {
            if ($('#config-receive-imgs').is(':checked'))
                msgCore = "<img src=\"" + msg + "\"><span class=\"img-download-link\" style=\"display: none;\"><br /><a target=\"_blank\" href=\"" + msg + "\">View/Download Image</a>";
            else 
                msgCore = "<span class=\"text-danger\">Image blocked by configuration</span>";
        }*/

        else if (type === 'welcome') {
            msg.args = '<span class="show-menu input-group-text btn btn-outline-info text-button"><i class="fa fa-bars"></i></span>';
            id = functions.postChat(type, functions.langFormat(msg), from, target);
        }

        else if (type === 'menu') {
            var menu = functions.buildMenu(msg);
            id = functions.postChat(type, menu.prop('outerHTML'), from, target);
        }

        else if (type === 'chart') {
            var canvasId = "message-" + config.messageCount + "-canvas";
            id = functions.postChat(type, "<canvas id=\"" + canvasId + "\"></canvas>", from, target);
            functions.buildChart(canvasId);
        }

        else if (type === 'file') {
            id = functions.postChat(type, 
                "<div id=\"" + msg + "\" class=\"btn file-download\"> \
                    <span class=\"mr-2 fa-stack fa\"> \
                        <i class=\"far fa-circle fa-stack-2x\"></i> \
                        <i class=\"fa fa-arrow-down fa-stack-1x\"></i> \
                    </span> \
                    " + msg + " \
                </div>" 
            , from, target);
        }

        else if (type === 'upload') {
            $('.message-type-upload').remove();

            var seconds = parseInt(msg);
            id = functions.postChat(type, functions.format(
                config.lang['message.uploadFile'], 
                '<span class="upload-timer">' + seconds + '</span>',
                '<label class="input-group-text btn btn-outline-info text-button"> \
                    <i class="fa fa-paperclip"></i> \
                    <input type="file" class="d-none file-select" multiple/> \
                </label>'
            ), from, target);
            var time = $('#' + id).find('.upload-timer');

            var interval = setInterval(function() {
                time.text(--seconds);
                if (seconds <= 0) {
                    clearInterval(interval);
                    $('#' + id).remove();
                }
            }, 1000);
        }

        else if (type === 'barcode') {
            id = functions.postChat(type, functions.format(config.lang['message.uploadBarcode'], msg), from, target);
        }

        else if (type === 'date') {
            const datepickerButton = 
                '<span ' +
                    'class="datepicker-show input-group-text btn btn-outline-info"' +
                    'style="display:inline-block;padding:0.2rem 0.5rem;margin:0.2rem;">' +
                    '<i class="fa fa-calendar"></i>' +
                '</span>';
            functions.buildDatepicker(socket, msg.format, msg.timer);
            id = functions.postChat(type, functions.format(config.lang['message.enterDate'], msg.format, datepickerButton), from, target);
        }
        
        //Save message to history
        if (history) target ? functions.updateMessageHistory(id, decrypted) : functions.addMessageHistory(id, decrypted);

        return id;
    },

    /* 
     *
     * Print message to chat window
     * 
     */

    postChat: function(type, message, from, target) {
        var text, classes, mentioned;

        //Create message body
        var body;
        if (type === 'menu') body = "<div class=\"message-body pl-3 pb-1 rounded\" style=\"float:none;\">" + message + "</div>";
        else body = "<div class=\"message-body p-3 rounded border\">" + message + "</div>";

        //Add avatars
        if (from === "Server") body = 
            "<div class=\"message-avatar\"> \
                <span class=\"fa-stack fa-lg\"> \
                    <i class=\"far fa-circle fa-stack-2x\"></i> \
                    <i class=\"fa fa-robot fa-stack-1x\"></i> \
                </span> \
            </div> \
            " + body + " \
            <div class=\"empty-column\"></div>";
        else body = 
            "<div class=\"empty-column\"></div> \
            " + body + " \
            <div class=\"message-avatar\"> \
                <span class=\"fa-stack fa-lg\"> \
                    <i class=\"far fa-circle fa-stack-2x\"></i> \
                    <i class=\"fa fa-user-tie fa-stack-1x\"></i> \
                </span> \
            </div>";

        //Find or create message        
        if (target) {
            var id = target;
            target = $("#" + target);
            target.removeClassPrefix('message-type-')
            target.addClass('message-type-' + type);
            target.empty();
            target.append(body);       
            return id;
        }
        else {
            var id = "message-" + config.messageCount;
            if (from !== 'Server') classes = "my-message";
            else {
                classes = "their-message message-type-" + type;
                mentioned = message.indexOf(config.phone) > -1;
                if (mentioned) classes += " mentioned";
            }

            text = $("<div class=\"message " + classes + "\" id=\"" + id + "\"></div>")
            text.append(body);
            this.printText(text, mentioned);
            return id;
        }
    },

    /* 
     *
     * Print text to chat
     * 
     */

    printText: function(text, mentionStatus) {
        $("#msgs").append(text);
        $("#msgs").append("<div class=\"clearfix\"></div>");
        $("#conversation").scrollTop($("#conversation").scrollTop() + 5000);

        //handle the options for the window being in and out of focus
        if (($('input[name=config-audio]:checked').val() == "1" && !document.hasFocus()) || mentionStatus) {
            config.notify.play();
        }
        
        config.messageCount++;
    },

    /* 
     *
     * Print chat status message
     * 
     */

    printChatStatus: function(text) {
        functions.printText(
            "<div class=\"message\"> \
                <div class=\"empty-column\"> \
                </div><div class=\"status-message\">"  + text + "</div> \
                <div class=\"empty-column\"></div> \
            </div>"
        );
    },

    /* 
     *
     * Print connection status at auth window
     * 
     */

    postConnectStatus: function(html) {
        $("#connect-status").empty();
        $("#connect-status").append(html);
    },

    /* 
     *
     * Build HTML for button menu
     * 
     */

    buildMenu: function(buttons) {
        var panel = $("<div class='row'></div>");

        var inRow = 0;
        buttons.reduce(function(buttons) {
            buttons.slice(0, 3).forEach(function(button, i, arr) {
                var cell = $("<div class=\"mt-1 mt-md-2\">");

                if (arr.length !== 1){
                    if (i == 0) cell.addClass("pr-md-1")
                    else if (i == arr.length - 1) cell.addClass("pl-md-1");
                    else cell.addClass("pr-md-1 pl-md-1");
                }
            
                if (arr.length === 3) cell.addClass("col-md-4");
                else if (arr.length === 2) cell.addClass("col-md-6");
                else cell.addClass("col-md-12");
            
                $('<button id="' + button.action + '" class="menu-button btn btn-outline-success btn-block h-100">' + config.lang[button.title] + '</button>').appendTo(cell);
                cell.appendTo(panel);
            });
            return buttons.slice(3);
        }, buttons);

        return panel;
    },

    /* 
     *
     * Open datepicker
     * 
     */

    buildDatepicker: function(socket, dateFormat, timer) {      
        $('#datepicker').datepicker().data('datepicker').destroy();
        $('#datepicker').datepicker({
            minDate: new Date(),
            dateFormat: dateFormat,
            onSelect: function(formattedDate) {
                socket.emit('textSend', functions.encrypt(formattedDate));
                $('#calendar-modal').modal('toggle')
            }
        })
        $('#datepicker').css("padding", '0');
        $('.datepicker').css("width", "100%");
        $('.datepicker').css("border", "0");
        $('.datepicker').addClass('mb-3');
    },

    /* 
     *
     * Build HTML for chart
     * 
     */

    buildChart: function(elementId, data) {
        data = [];
        for (var i = 0; i < 6; i++)
            data[i] = Math.random() * (20 - 1) + 1;

        var ch = new Chart($("#" + elementId)[0].getContext("2d"), {
            responsive:true,
            maintainAspectRatio: true,
            type: 'bar',
            data: {
                labels: ["Red", "Blue", "Yellow", "Green", "Purple", "Orange"],
                datasets: [{
                    label: '# of Votes',
                    data: data,
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.2)',
                        'rgba(54, 162, 235, 0.2)',
                        'rgba(255, 206, 86, 0.2)',
                        'rgba(75, 192, 192, 0.2)',
                        'rgba(153, 102, 255, 0.2)',
                        'rgba(255, 159, 64, 0.2)'
                    ],
                    borderColor: [
                        'rgba(255,99,132,1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(153, 102, 255, 1)',
                        'rgba(255, 159, 64, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                scales: {
                    yAxes: [{
                        ticks: {
                            beginAtZero:true
                        }
                    }]
                }
            }
        });
    },

    /*
     *
     * Encrypt string using password
     * 
     */

    encrypt: function(data) {
        if (typeof data === 'object') data = JSON.stringify(data);
        return Rabbit.encrypt(data, config.password).toString();
    },

    /* 
     *
     * Decrypt string using password
     * 
     */

    decrypt: function(str) {
        return Rabbit.decrypt(str, config.password).toString(Utf8);
    },

    /* 
     *
     * Returns timestamp in HH:MM:SS format
     * 
     */

    getTimeStamp: function() {
        var date = new Date();
        return [
            date.getHours().toString(),
            date.getMinutes().toString(), 
            date.getSeconds().toString()
        ].map(function(part) { return part.length == 1 ? '0' + part : part }).join(':');
    },

    /* 
     *
     * Sanitize from non-alphanumeric characters
     * 
     */

    convertToAlphanum: function(string) {
        return string.replace(/\W/g, '');
    },

    /* 
     *
     * Sanitize from non-HTML safe characters
     * 
     */

    sanitizeToHTMLSafe: function(string) {
        return _.escape(string);
    },

    /* 
     *
     * Hide auth screen and show chat screen
     * 
     */

    showChat: function() {
        $("#login-screen").hide();
        $("#chat-screen").show();
    },

    /* 
     *
     * Hide chat screen and show auth screen
     * 
     */

    showLogin: function() {  
        $("#chat-screen").hide();
        $("#login-screen").show();
    },

    /* 
     *
     * Check if device is mobile
     * 
     */

    mobileChecking: function(a) {
        if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|ipad|iris|kindle|Android|Silk|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(navigator.userAgent) 
        || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4)))
            config.isMobile = true;
    },

    /*
     *
     * Message history functions
     * 
     */

    parseHistoryMessageType: function(type) {
        const typeToIgnore = ['welcome', 'upload'];
        if (typeToIgnore.indexOf(type) !== -1) return false;
        else return true;
    },

    addMessageHistory: function (id, msg) {
        if (!functions.parseHistoryMessageType(msg.type)) return;
        var history = localStorage.getItem('history');
        history = history ? JSON.parse(atob(history)) : [];
        if (history.length >= config.historySize) history.shift();
        msg.id = id;
        history.push(msg);
        localStorage.setItem('history', btoa(JSON.stringify(history)));
    },

    updateMessageHistory: function (id, msg) {
        var history = localStorage.getItem('history');
        if (!history) return;
        history = JSON.parse(atob(history));
        var foundIndex = history.findIndex(function(obj) { return obj.id === id; });
        if (foundIndex === -1) return;
        if (functions.parseHistoryMessageType(msg.type)) {
            history[foundIndex].type = msg.type;
            history[foundIndex].value = msg.value;
            history[foundIndex].from = msg.from;
        }
        else history.splice(foundIndex, 1);
        localStorage.setItem('history', btoa(JSON.stringify(history)));
    },

    printMessageHistory: function(socket) {
        var history = localStorage.getItem('history');
        if (!history) return;
        history = JSON.parse(atob(history));

        history.forEach(function(msg) {
            msg.id = functions.prepareChatMessage(socket, null, msg, false);
        });
        localStorage.setItem('history', btoa(JSON.stringify(history)));
    },

    /* 
     *
     * Event handlers
     * 
     */

    sendJoinReq: function(socket, tryCode) {
        if (tryCode === "" || tryCode.length < 4) {
            functions.postConnectStatus("<li>" + config.lang['status.verifyPhone'] + "</li>");
        } 
        else {
            functions.postConnectStatus("<li>" + config.lang['status.joinRequest'] + "</li>");
            config.code = tryCode;
            socket.emit("joinReq", tryCode.toString());
        }
    },

    sendVerificationCode: function(socket, type) {
        var phoneNumber = $("#phone").val();
        
        functions.postConnectStatus("<li>" + config.lang['status.verificationSending'] + "</li>");
        socket.emit("verifyReq", { phone: phoneNumber.toString(), type: type.toString() });      
    },

    sendButtonAction: function(socket, action) {
        $("#buttonPanel").empty();
        $(".show-menu").removeClass("active");
        if (action) socket.emit('buttonAction', functions.encrypt(action));
    },

    sendChatMessage: function(socket) {
        var msg = $("#msg").val();
        var encrypted = null;

        if (msg !== "") {
            socket.emit('textSend', functions.encrypt(msg));
        }

        $("#msg").val("");

        //if they're mobile, close the keyboard
        if (config.isMobile) $("#msg").blur();
    },

    sendFile: function(socket, file) {
        let messageId = functions.postChat('text', config.lang['status.uploadingFile'], 'Server');

        let read = ss.createBlobReadStream(file);
        let send = ss.createStream();
        let encrypt = miss.through(
            (chunk, enc, cb) => {
                cb(null, functions.encrypt(chunk.toString('hex')));
            },
            (cb) => cb(null, '')
        )

        ss(socket).emit('uploadFile', { 
            stream: send, 
            name: functions.encrypt(file.name), 
            size: functions.encrypt(file.size.toString()),
            target: messageId
        });

        miss.pipe(read, encrypt, send);
    },

    downloadFile: function (socket, filename) {
        socket.emit('downloadFile', functions.encrypt(filename));
    },

    notificationCheck: function() {
        if (document.hasFocus()) config.missedNotifications = 0;
        if (config.missedNotifications > 0) document.title = "(" + config.missedNotifications + " new) " + appName;
        else document.title = config.appName;
    },

    requestLanguage: function(socket, lang) {
        socket.emit('language', lang);
    },

    logout: function() {
        localStorage.removeItem('session');
        location.reload();
    },

    pwaInstall: function() {
        $("#pwa-banner").hide();
        config.installPWAEvent.prompt();

        // Wait for the user to respond to the prompt
        config.installPWAEvent.userChoice.then((choiceResult) => {
            config.installPWAEvent = null;
        });
    },

    //Helpers
    langFormat: function(obj) {
        if (obj.args && !Array.isArray(obj.args) && typeof obj.args === 'object') {
            obj.args = functions.langFormat(obj.args);
        }
        return functions.format(config.lang[obj.text], obj.args);
    },

    format: function (str, ...arguments) {
        if (arguments.length) {
            var t = typeof arguments[0];
            var key;
            var args = ("string" === t || "number" === t) ?
                Array.prototype.slice.call(arguments)
                : arguments[0];

            for (key in args) {
                str = str.replace(new RegExp("\\{" + key + "\\}", "gi"), args[key]);
            }
        }
        return str;
    }
}

$.fn.removeClassPrefix = function(prefix) {
    this.each(function(i, el) {
        var classes = el.className.split(" ").filter(function(c) {
            return c.lastIndexOf(prefix, 0) !== 0;
        });
        el.className = $.trim(classes.join(" "));
    });
    return this;
};