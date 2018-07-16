/*
 *
 * Functions
 *
 *
*/

function showChat() {
  $("#login-screen").hide();
  $("#main-chat-screen").show();
}

function showLogin() {  
  $("#main-chat-screen").hide();
  $("#login-screen").show();
}

function sendJoinReq(tryCode){
  if (tryCode === "" || tryCode.length < 4) {
    $("#connect-status").append("<li>Please verify your phone number</li>");
  } 
  else {
    $("#connect-status").append("<li>Sending join request</li>");
    code = tryCode;
    socket.emit("joinReq", tryCode.toString());
  }
}

function sendVerificationCode(_phone, type) {
  if (!_phone.match(/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/im)){
    $("#connect-status").append("<li>Please enter a valid mobile phone number.</li>");
	  return;
  }
   
  if (type === 'sms') {
	  $("#codeDiv").val('');
	  $("#codeDiv").removeClass('hidden');
  }
  else if (type === 'call') $("#codeDiv").addClass('hidden');
	
  $("#connect-status").append("<li>Sending verification request</li>");
  socket.emit("verifyReq", _phone.toString(), type.toString());      
}

//attempt to decrypt the given data with the given password, or return a failure string
function decryptOrFail(data, password) {
    var encoded = CryptoJS.Rabbit.decrypt(data, password);
    return encoded.toString(CryptoJS.enc.Utf8);
}

function getHTMLStamp() {
  let date = new Date();
  let stamp = [
    date.getHours().toString(),
    date.getMinutes().toString(), 
    date.getSeconds().toString()
  ].map((part) => part.length == 1 ? '0' + part : part).join(':');

  return "<span class=\"message-timestamp\">" + stamp + " </span>";
}

function postChat(message, mentionStatus) {
  $("#msgs").append(message);
  $("#msgs").append("<div class=\"clearfix\"></div>");
  $(window).scrollTop($(window).scrollTop() + 5000);

  //handle the options for the window being in and out of focus
  if ((playOnBackground && !document.hasFocus()) || mentionStatus) {
    notify.play();
  }  
}

//query the url for the given parameter; used in case of a link to the room
var urlParam = (function(a) {
  if (a == "") return {};
  var b = {};
  for (var i = 0; i < a.length; ++i) {
    var p=a[i].split('=', 2);
    if (p.length == 1)
      b[p[0]] = "";
    else
      b[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
  }
  return b;
})(window.location.search.substr(1).split('&'));

//sanitize from non-alphanumberic characters
function convertToAlphanum(string) {
  return string.replace(/\W/g, '');
}

//sanitize from non-HTML safe characters
function sanitizeToHTMLSafe(string) {
  return _.escape(string);
}

// chats and updates while the window is blurred
function notificationCheck() {
  if (document.hasFocus()) {
    missedNotifications = 0;
  }

  if (missedNotifications > 0) {
    document.title = "(" + missedNotifications + " new) FreeStep";
  } 
  else {
    document.title = "FreeStep";
  }
}

function typingTimeout() {
  typing = false;
  socket.emit("typing", false);
}

/*
 *
 * Variable defs
 *
 *
*/

//vars for messaging
var password = phone = code = null;

//connection string
var socket = io.connect("127.0.0.1:3000");

//try to restore session
let session = localStorage.getItem('session');
try {
  session = CryptoJS.enc.Base64.parse(session).toString(CryptoJS.enc.Utf8).split('.');
  phone = session[0];
  code = session[1];
  socket.emit('restoreSession', phone, code);
}
catch(error) {
  showLogin();
  localStorage.removeItem('session');
}

//uploader config
var uploader = new SocketIOFileUpload(socket);
uploader.listenOnDrop(document.getElementById("main-body"));
uploader.listenOnInput(document.getElementById("file-select"));

//config vars
var configFile = playOnBackground = true;

//message unique id
var messageCount = 0;

//customMode disables the front panel paragraphs
var customMode = 0;

//set the name and byline of the app
var appName = "FreeStep";
var appByline = "Open source, private chat goodness.<br />Built with node.js/socket.io/Bootstrap.";

/*
 *
 * Config options
 *
 */

$('#config-timestamps').change(function () {
  $('.message-timestamp').toggle();
});

$('#config-files').change(function () {
  configFile = $('#config-files').is(':checked');
});

$('input[name=config-audio]:radio').change(function () {
  //ghetto conversion to bool
  playOnBackground = ($('input[name=config-audio]:checked').val() == "1");
});

$('#config-imglink').change(function () {
  $('.img-download-link').toggle();
});

//mobile checking
var isMobile = false;
(function (a) {
  if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) isMobile = true
})(navigator.userAgent || navigator.vendor || window.opera);

//typing vars
var typing = false;
var stopTimeout = undefined;

//alert sound
var notify = new Audio('notify.wav');

//page blur handling
var missedNotifications = 0;

$(document).ready(function () {
  //start watching for missed notifications
  setInterval(notificationCheck, 200);

  //all forms are handled, never actually submitted
  $("form").submit(function (event) {
    event.preventDefault();
  });

  //prep for login display - set paragraphs and titles
  if (customMode){
    $("#paragraph-block").hide();
  }

  $(".app-title-box").html(appName);

  $(".app-byline-box").html(appByline);

  //curtains up! hide the main screen and focus on the name box when appropriate
  $("#main-chat-screen").hide();

  //check file upload support
  if (!(window.File && window.FileReader && window.FileList && window.Blob)) {
    ("#connect-status").append("<li>Warning: file uploads not supported in this browser.</li>");
  }
  
  //sms verification hook
  $("#verifySms" ).click(function() {
	  sendVerificationCode($("#phone").val(), 'sms');
  });
  
  //call verification hook
  $("#verifyCall").click(function() {
	  sendVerificationCode($("#phone").val(), 'call');
  });

  //form submit hook - they want to join
  $("#nameForm").submit(function () {
    sendJoinReq($("#code").val());
  });

  //Logout button hook
  $("#logout" ).click(function() {
    localStorage.removeItem('session');
	  location.reload();
  });

  //menu buttons hooks
  $("#showMenu" ).click(function() {
	  socket.emit('buttonAction', 'root_action');
  });

  $(document).on('click', '.menu-button', function(event) {
    socket.emit('buttonAction', event.target.id);
  });

  /*
   *
   * Connection operations
   *
   */

  socket.on("verifyConfirm", function(message, _phone, code) {
    $("#connect-status").append("<li><strong>" + message + "</strong></li>");
    phone = _phone;
	  $("#code").val(code);
  });
   
  socket.on("verifyFail", function(failure) {
	  $("#connect-status").append("<li><strong>Verification request denied: " + failure + "</strong></li>");
  });
   
  socket.on("joinConfirm", function () {
    //we've recieved request approval
    $("#connect-status").append("<li>Join request approved!</li>");

    /* Focus the message box, unless you're mobile, it which case blur
    * everything that might have focus so your keyboard collapses and
    * you can see the full room layout and options, especially the menu.
    */
    if (!isMobile) {
      $("#msg").focus()
    }
    else {
      $("#phone").blur();
      $("#code").blur();
    }

    //check mobile, and, if mobile, expose the image link config option and file chooser for upload, and hide the drag/drop message
    if (isMobile) {
      $('#config-imglink-container').removeClass("hidden");
      $('#file-select').removeClass("hidden");
      $('#file-drag-message').addClass("hidden");
    }

    //finally, expose the main room
    password = CryptoJS.SHA1(phone + "." + code).toString();

    //save session
    localStorage.setItem('session', CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(phone + "." + code)));

    showChat();
  });

  //oops. They done goofed.
  socket.on("joinFail", function (failure) {
    $("#connect-status").append("<li><strong>Join request denied: " + failure + "</strong></li>");
  });

  /*
   *
   * Uploading operations
   *
   */

  uploader.addEventListener("start", function(data){
    postChat("<div class=\"status-message\">Uploading file... Please wait.</div>");
  });

  /*
   *
   * Chat operations
   *
   */

  //send a message
  $("#chatForm").submit(function () {
    //load vars
    var msg = $("#msg").val();
    var encrypted = null;

    if (msg !== "") {
      //if we have something to send, crypt and send it.
      encrypted = CryptoJS.Rabbit.encrypt(msg, password);
      socket.emit("textSend", encrypted.toString());
    }

    //clear the message bar after send
    $("#msg").val("");

    //if they're mobile, close the keyboard
    if (isMobile) {
      $("#msg").blur();
    }
  });

  //get a chat message
  socket.on("chat", function (payload) {
    var msg;
    try {
      msg = decryptOrFail(payload.value, password);
    }
    catch (err) {
      payload.type = 'text';
      msg = "Unable to decrypt: " + payload.value;
    }

    //msg core is used later in message construction
    var msgCore, msgOwner = null;

    //regex to match URLS
    var matchPattern = /(\b(((https?|ftp):\/\/)|magnet:)[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim;

    /*
     * Message Core Assembly
     * Some parts of the message are always the same
     * (layout, alignment, etc) - so we build a core,
     * which contains (most of the) unique parts,
     * so actually sending it is relatively simple.
     */

    if (payload.type === 'text') {
      msgCore = sanitizeToHTMLSafe(msg).replace(matchPattern, '<a href="$1" target="_blank">$1</a>');
    }
    else if (payload.type === 'image') {
      if (configFile)
        msgCore = "<img src=\"" + msg + "\"><span class=\"img-download-link\" style=\"display: none;\"><br /><a target=\"_blank\" href=\"" + msg + "\">View/Download Image</a>";
      else 
        msgCore = "<span class=\"text-danger\">Image blocked by configuration</span>";
    }
    else if (payload.type === 'menu') {
      msgCore = '';

      JSON.parse(msg).forEach(function(button) {
        msgCore += '<button id="' + button.action + '" class="menu-button btn-space btn-primary btn">' + button.title + '</button>';
      });
    }
    else if (payload.type === 'upload') {
      msgCore = 'Server requests file(s) to upload. You have ' + msg + ' seconds.';
    }

    //post the message
    if (phone === payload.from) msgOwner = "my-message";
    else {
      msgOwner = "their-message";
      if (payload.type === 'menu') msgOwner += " menu";
      if (msgCore.indexOf(phone) > -1) msgOwner += " mentioned";
    }

    postChat("<div class=\"message " + msgOwner + "\" id=\"message-" + messageCount + "\"><span class=\"message-metadata\"><span class=\"message-name\">" + payload.from + "</span><br />" + getHTMLStamp() + "</strong></span><span class=\"message-body\"> " + msgCore + "</span></div>", (msgCore.indexOf(phone) > -1));
    messageCount++;
  });

  //get a status update
  socket.on("update", function (msg) {
    //post the sanitized message
    postChat("<div class=\"status-message\">" + sanitizeToHTMLSafe(msg) + "</div>");
  });

  socket.on("rateLimit", function (msg) {
    postChat("<div class=\"status-message text-warning\">Please wait before doing that again.</div>");
  });

  socket.on('wrongSession', function() {
    localStorage.removeItem('session');
    showLogin();
  });

  /*
   *
   * Typing operations
   * These are kind of tricky. Essentially, if the user types,
   * emit that the user is typing, and alert the server that
   * they've stopped (the alert to be sent 250ms from now). If
   * they keep typing, don't send any more alerts that they're
   * typing, and keep pushing back the "stopped" emission.
   *
   */

  $("#msg").keypress(function (e) {
    if (e.which === 13) return;
    if (!typing) {
      socket.emit("typing", true);
      typing = true;
      clearTimeout(stopTimeout);
      stopTimeout = setTimeout(typingTimeout, 250);
    }
    else{
      clearTimeout(stopTimeout);
      stopTimeout = setTimeout(typingTimeout, 250);
    }
  });

  //Recieving a typing status update; update css
  socket.on("typing", function (data) {
    if (data.isTyping === true) $("#typing-" + convertToAlphanum(data.from)).removeClass("hidden");
    else $("#typing-" + convertToAlphanum(data.from)).addClass("hidden");
  });

  /*
   *
   * User operations
   *
   */

  //reload when we get disconnected
  socket.on("disconnect", function () {
    location.reload();
  });

});
