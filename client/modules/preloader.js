const functions  = require('./functions'),
      config     = require('./config');

module.exports = function(completed) {
    const socket = io.connect();

    //Load languages        
    socket.emit('languageList');

    socket.on('languageList', function(languages) {
        $('#langSelector').empty();
        languages.forEach(function(lang){
            $('#langSelector').append('<option>' + lang + '</option>');
        })
        functions.requestLanguage(socket, localStorage.getItem('lang'));
    });

    socket.on('language', function(name, language) {
        localStorage.setItem('lang', name);
        $('#langSelector').val(name);
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

        socket.off('languageList');
        socket.off('language');
        completed(socket);
    });
}