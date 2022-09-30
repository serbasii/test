// Globals
var route_no = 77;
var direction = 1;
var startIndex = 0;
var endIndex = 4;
var data = [];
var stompMsgObj = null;
var busMarker = null;
var map = null;
var route = null;
var settings = null;
var interval = null;

jQuery(function () {
$('#test').css("display","none");
$.get({url:'appsettings.json',cache: true})
        .done(function (res) {
            settings = res;
            connectWS();
            
        }).fail(function (err) {
            console.log(err);
        });
    
    
});

function connectWS() {

    var connected = false;
    var ws = new WebSocket(settings.websocket.ws_current);
    ws.onmessage = onMessageWS;

    ws.onclose = function () {
        console.log("socket closed");
        ws = null;
        setTimeout(function () {
            connectWS();
        }, 5000)
    };


    ws.onopen = function () {
        console.log("web socket connected...waiting for unreal to say hello.");
    };
}

var onMessageWS = function (msg) {
    console.log(msg);
    if (msg.data) {
        clearInterval(interval);
        stompMsgObj = JSON.parse(msg.data.trim());
        var type = stompMsgObj._type;
         $(".current").text(stompMsgObj.current_txt);
         $('#test').css("display","inherit");
          $('#test').delay(10000).fadeOut();
        // $('#test').delay(10000).css("display","none");
        
        switch (type) {

            case "transition":
                playAudio(stompMsgObj.audioUrl);
                
                
                break;
        }
    }
};

var playAudio = function (audioUrl) {
    // chrome://settings/content/sound
    if (audioUrl) {
        var audio = new Audio(audioUrl);
        audio.play();
    }
}






