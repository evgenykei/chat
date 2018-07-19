const CryptoJS   = require('crypto-js'),
      _ = require('underscore');

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

        $("#main-chat-screen").hide();

        if (!(window.File && window.FileReader && window.FileList && window.Blob)) {
          ("#connect-status").append("<li>Warning: file uploads not supported in functions browser.</li>");
        }

        functions.mobileChecking(navigator.userAgent || navigator.vendor || window.opera);
    },

    /* 
     *
     * Print message to chat window
     * 
     */

    postChat: function(message, mentionStatus) {
        $("#msgs").append(message);
        $("#msgs").append("<div class=\"clearfix\"></div>");
        $(window).scrollTop($(window).scrollTop() + 5000);

        //handle the options for the window being in and out of focus
        if (($('input[name=config-audio]:checked').val() == "1" && !document.hasFocus()) || mentionStatus) {
            config.notify.play();
        }  
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
        var panel = $("#buttonPanel");
        panel.empty();

        var inRow = 0;
        buttons.reduce(function(buttons) {
            buttons.slice(0, 3).forEach(function(button, i, arr) {
                var cell = $("<div class=\"pb-2\">");

                if (arr.length !== 1){
                    if (i == 0) cell.addClass("pr-sm-1")
                    else if (i == arr.length - 1) cell.addClass("pl-sm-1");
                    else cell.addClass("pr-sm-1 pl-sm-1");
                }
            
                if (arr.length === 3) cell.addClass("col-sm-4");
                else if (arr.length === 2) cell.addClass("col-sm-6");
                else cell.addClass("col-sm-12");
            
                $('<button id="' + button.action + '" class="menu-button btn btn-primary btn-block">' + button.title + '</button>').appendTo(cell);
                cell.appendTo(panel);
            });
            return buttons.slice(3);
        }, buttons);
    },

    /* 
     *
     * Decrypt string using password
     * 
     */

    decryptOrFail: function(str, password) {
        var encoded = CryptoJS.Rabbit.decrypt(str, password);
        return encoded.toString(CryptoJS.enc.Utf8);
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
        $("#main-chat-screen").show();
    },

    /* 
     *
     * Hide chat screen and show auth screen
     * 
     */

    showLogin: function() {  
        $("#main-chat-screen").hide();
        $("#login-screen").show();
    },

    /* 
     *
     * Check if device is mobile
     * 
     */
    mobileChecking: function(a) {
        if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))); 
            config.isMobile = true;
    },

    /* 
     *
     * Event handlers
     * 
     */

    sendJoinReq: function(socket, tryCode){
        if (tryCode === "" || tryCode.length < 4) {
            functions.postConnectStatus("<li>Please verify your phone number</li>");
        } 
        else {
            functions.postConnectStatus("<li>Sending join request</li>");
            config.code = tryCode;
            socket.emit("joinReq", tryCode.toString());
        }
    },

    sendVerificationCode: function(socket, type) {
        var phoneNumber = $("#phone").val();

        if (!phoneNumber.match(/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/im)){
            functions.postConnectStatus("<li>Please enter a valid mobile phone number.</li>");
        	return;
        }
    
        functions.postConnectStatus("<li>Sending verification request</li>");
        socket.emit("verifyReq", phoneNumber.toString(), type.toString());      
    },

    sendButtonAction: function(socket, action) {
        $("#buttonPanel").empty();
        socket.emit('buttonAction', action);
    },

    sendChatMessage: function(socket) {
        var msg = $("#msg").val();
        var encrypted = null;

        if (msg !== "") {
            encrypted = CryptoJS.Rabbit.encrypt(msg, config.password);
            socket.emit("textSend", encrypted.toString());
        }

        $("#msg").val("");

        //if they're mobile, close the keyboard
        if (config.isMobile) $("#msg").blur();
    },

    notificationCheck: function() {
        if (document.hasFocus()) config.missedNotifications = 0;
        if (config.missedNotifications > 0) document.title = "(" + config.missedNotifications + " new) " + appName;
        else document.title = config.appName;
    },

    logout: function() {
        localStorage.removeItem('session');
        location.reload();
    }
}