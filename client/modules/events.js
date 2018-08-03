module.exports = function(socket) {

    const functions = require('./functions');

    /* 
     *
     * Authentication window events
     * 
     */

    $("#verifySMS" ).click(function() { functions.sendVerificationCode(socket, 'sms'); });

    $("#verifyCall").click(function() { functions.sendVerificationCode(socket, 'call'); });

    $("#join").click(function() { functions.sendJoinReq(socket, $("#code").val()); });

    $("#langSelector").change(function() { functions.requestLanguage(socket, this.value); });

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
        if ($("#buttonPanel").children().length == 0) functions.sendButtonAction(socket, 'main_menu');
        else functions.sendButtonAction(socket, null);
    });

    $(document).on('click', '.menu-button', function(event) { functions.sendButtonAction(socket, event.target.id); });

    $(document).on('click', '.file-download', function(event) { functions.downloadFile(socket, event.target.id); });

    $("#chatForm").submit(function() { functions.sendChatMessage(socket); });

    $("#logout" ).click(function() { functions.logout(); });
    
    $('#file-select').on('change', function(filename) {
        var files = $(this).get(0).files;
        Object.keys(files).forEach(function(key) {
            functions.sendFile(socket, files[key]);
        });
        $('#file-select').val('')
    });

    $("#main-body").on('drag dragstart dragend dragover dragenter dragleave drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
    }).on('drop', function(e) {
        var files = e.originalEvent.dataTransfer.files;
        Object.keys(files).forEach(function(key) {
            functions.sendFile(socket, files[key]);
        });
    });

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
