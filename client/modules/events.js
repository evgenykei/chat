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

    $(document).on('click', '.show-menu', function(event) {
        if ($("#buttonPanel").children().length == 0) functions.sendButtonAction(socket, { action: 'main_menu' });
        else functions.sendButtonAction(socket, null);
    });

    $(document).on('click', '.menu-button', function(event) {
        functions.sendButtonAction(socket, { target: $(event.target).closest(".message").attr('id'), action: event.target.id }); 
    });

    $(document).on('click', '.file-download', function(event) { functions.downloadFile(socket, event.target.id); });

    $(document).on('click', '.datepicker-show', function(event) {
        $('#calendar-modal').modal('toggle'); 
    });

    $(document).on('change', '.file-select', function() {
        var files = $(this).get(0).files;
        Object.keys(files).forEach(function(key) {
            functions.sendFile(socket, files[key]);
        });
        $('.file-select').val('');
    });

    $(document).on('drag dragstart dragend dragover dragenter dragleave drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
    }).on('dragover', function(e) {
        $('.message-type-upload').find('.message-body').addClass("highlight");
    }).on('dragend dragleave dragend drop', function(e) {
        $('.message-type-upload').find('.message-body').removeClass("highlight");
    }).on('drop', '.message-type-upload', function(e) {
        var files = e.originalEvent.dataTransfer.files;
        Object.keys(files).forEach(function(key) {
            functions.sendFile(socket, files[key]);
        });
    })

    $("#chatForm").submit(function() { functions.sendChatMessage(socket); });

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
