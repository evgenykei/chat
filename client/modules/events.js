module.exports = function(socket) {

    const functions = require('./functions');

    /* 
     *
     * Authentication window events
     * 
     */

    $("#verifySms" ).click(function() { functions.sendVerificationCode(socket, 'sms'); });

    $("#verifyCall").click(function() { functions.sendVerificationCode(socket, 'call'); });

    $("#join").click(function() { functions.sendJoinReq(socket, $("#code").val()); });

    /* 
     *
     * PWA banner events
     * 
     */

    $("#pwa-banner-install" ).click(function() { functions.pwaInstall(); });

    $("#pwa-banner-dismiss" ).click(function() { $("#pwa-banner").hide(); });

    /* 
     *
     * Chat window events
     * 
     */

    $("#showMenu" ).click(function() {
        if ($("#buttonPanel").children().length == 0) functions.sendButtonAction(socket, 'root_action');
        else functions.sendButtonAction(socket, null);
    });

    $(document).on('click', '.menu-button', function(event) { functions.sendButtonAction(socket, event.target.id); });

    $("#chatForm").submit(function() { functions.sendChatMessage(socket); });

    $("#logout" ).click(function() { functions.logout(); });

    /* 
     *
     * Chat configuration events
     * 
     */

    $('#config-timestamps').change(function() { $('.message-timestamp').toggle(); });

    $('#config-imglink').change(function() { $('.img-download-link').toggle(); });

    /* 
     *
     * Interval events
     * 
     */

    setInterval(functions.notificationCheck, 200);

}
