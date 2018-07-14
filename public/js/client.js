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

function sendJoinReq(tryCode){
  if (tryCode === "" || tryCode.length < 4) {
    $("#connect-status").append("<li>Please verify your phone number</li>");
  } 
  else {
    $("#connect-status").append("<li>Sending join request</li>");
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

function createMenu(buttonMenu) {
  var menu = $('#buttonMenu');
  menu.empty();

  buttonMenu.forEach(function(button) {
    menu.append('<button id="' + button.action + '" class="menu-button btn-space btn-primary btn">' + button.title + '</button>')
  });

  $(".menu-button").click(function(event) {
    socket.emit('buttonAction', event.target.id);
  });
}

function postChat(message) {
  $("#msgs").append(message);
  $("#msgs").append("<div class=\"clearfix\"></div>");
  $(window).scrollTop($(window).scrollTop() + 5000);
}

//sanitize from non-alphanumberic characters
function convertToAlphanum(string) {
  return string.replace(/\W/g, '');
}

//sanitize from non-HTML safe characters
function sanitizeToHTMLSafe(string) {
  return _.escape(string);
}


/*
 *
 * Variable defs
 *
 *
*/
//connection string
var socket = io.connect("127.0.0.1:3000");

//config vars
var configFile = playOnBackground = true;


//max size for the base64'd image in bytes (default 1 megabyte)
var maxUploadSize = 1000000;

//set the name and byline of the app
var appName = "FreeStep";
var appByline = "Open source, private chat goodness.<br />Built with node.js/socket.io/Bootstrap.";

/*
 *
 * Config options
 *
 */


//mobile checking
var isMobile = false;
(function (a) {
  if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) isMobile = true
})(navigator.userAgent || navigator.vendor || window.opera);

//alert sound
var notify = new Audio('notify.wav');


$(document).ready(function () {

  //all forms are handled, never actually submitted
  $("form").submit(function (event) {
    event.preventDefault();
  });

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
    $("#connect-status").append("<li>Setting room title...</li>");

    //finally, expose the main room
    showChat();
  });

  //oops. They done goofed.
  socket.on("joinFail", function (failure) {
    $("#connect-status").append("<li><strong>Join request denied: " + failure + "</strong></li>");
  });


  /*
   *
   * Chat operations
   *
   */

  socket.on('buttonAction', function(action) {
    if (action.type === 'text')
      postChat(action.value);
    else if (action.type === 'menu')
      createMenu(action.value);
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

  /*
   *
   * File upload -- http://www.html5rocks.com/en/tutorials/file/dndfiles/
   * handleFileDrop is a pretty standard upload script. More can be learned above.
   */

  /*function handleFileDrop(evt) {
    evt.stopPropagation();
    evt.preventDefault();

    //determine whether this is a drag/drop or a file selector input
    if (typeof evt.target.files == 'undefined') {
      var files = evt.dataTransfer.files; // FileList object.
    }
    else {
      var files = evt.target.files;
    }
    // files is a FileList of File objects. List some properties.
    // Loop through the FileList and render image files as thumbnails.
    for (var i = 0, f; f = files[i]; i++) {
      // only process image files.
      if (!f.type.match('image.*')) {
        postChat("<div class=\"status-message\">Please upload images only.</div>");
        continue;
      }

      var reader = new FileReader();

      // closure to capture the file information, encrypt, and send..
      reader.onload = (function (theFile) {
        return function (e) {
          //alert the user
          postChat("<div class=\"status-message\">Processing & encrypting image... Please wait.</div>");

          var image = e.target.result;

          //restrict to oneish megs (not super accurate because base64, but eh)
          if (image.length > maxUploadSize) {
            postChat("<div class=\"status-message\">Image too large.</div>");
          } 
          else {
            encrypted = CryptoJS.Rabbit.encrypt(image, password);
            socket.emit("dataSend", encrypted.toString());

            postChat("<div class=\"status-message\">Image sent. Distributing...</div>");
          }
        };
      })(f);

      // read in the image file as a data URL.
      reader.readAsDataURL(f);
      clearFileInput();
    }
  }


  function handleDragOver(evt) {
    evt.stopPropagation();
    evt.preventDefault();
    evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
  }

  // setup the  listeners.
  var dropZone = document.getElementById('main-body');
  var fileSelect = document.getElementById('file-select');
  dropZone.addEventListener('dragover', handleDragOver, false);
  dropZone.addEventListener('drop', handleFileDrop, false);
  fileSelect.addEventListener('change', handleFileDrop, false);*/
});
