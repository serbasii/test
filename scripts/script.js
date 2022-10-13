// Globals
var route_no = 77;
var direction = 1;
var startIndex = 0;
var endIndex = 4;
var data = [];
var MsgObj = null;
var busMarker = null;
var map = null;
var route = null;
var settings = null;
var interval = null;
var firstMsgFromWs = true;
var temp = null;
var isDev = null;

jQuery(function () {
  // get url parameters

  var params = getUrlVars();
  $.get({ url: "appsettings.json", cache: true })
    .done(function (res) {
      settings = res;
      isDev = settings.isDev;

      if (params["device"]) {
        deviceNo = params["device"]; // settings.deviceId = default value

        if (deviceNo.length < 10) {
          document.getElementById("select-search").value = "35" + deviceNo;
          LoadPlate();
          setInterval(() => {
            WatchBus();
          }, 500);
        }
        settings.deviceId = deviceNo;
      }

      $("#version").append("<span>" + "v " + settings.version + "</span>");

      if (settings.stomp.connectStomp === true) {
        connectStomp();
      } else {
        connectWS();
      }

      map = L.map("mapid", {
        zoomSnap: 0.2,
        maxZoom: settings.map.maxZoom,
        minZoom: settings.map.minZoom,
        // dragging: false,
        // scrollWheelZoom: 'center'
      }).setView([38.41885, 27.12872], 14); // default geographical center and zoom

      initMap();
      checkLocalStorageStatus();
    })
    .fail(function (err) {
      // console.log(err);
    });
});

//right click closed
document.addEventListener(
  "contextmenu",
  function (e) {
    e.preventDefault();
  },
  false
);

function checkLocalStorageStatus() {
  var locationMsgFromStorage = getLocalStorageObj("locationMsg");
  var exLocationMsgFromStorage = getLocalStorageObj("locationMsgEx");
  //Son iki location bilgisi storage'de tutuluyor. Page refresh edildiğinde hatno direction kontrol ediliyor daha sonra transition mesajı dikkate alınıyor.
  //Cihaz üzerinde belirli periyotlarla widgetlar refresh edildiği için global değerler ile takip edebilmek mümkün olmadığından bu yöntem kullanılmıştır.
  if (locationMsgFromStorage) {
    checkMessageType(locationMsgFromStorage);
  }
  if (locationMsgFromStorage && exLocationMsgFromStorage) {
    if (
      locationMsgFromStorage.hatno === exLocationMsgFromStorage.hatno &&
      locationMsgFromStorage.direction === exLocationMsgFromStorage.direction
    ) {
      var transitionMsgFromStorage = getLocalStorageObj("transitionMsg");
      if (transitionMsgFromStorage) {
        transitionMsgFromStorage.audioUrl = "";
        checkMessageType(transitionMsgFromStorage);
      }
    } else {
      removeLocalStorageObj("transitionMsg");
    }
  }
}

function decode(encoded) {
  var points = [];
  var index = 0,
    len = encoded.length;
  var lat = 0,
    lng = 0;
  while (index < len) {
    var b,
      shift = 0,
      result = 0;
    do {
      b = encoded.charAt(index++).charCodeAt(0) - 63; //finds ascii                                                                                    //and substract it by 63
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    var dlat = (result & 1) != 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;
    shift = 0;
    result = 0;
    do {
      b = encoded.charAt(index++).charCodeAt(0) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    var dlng = (result & 1) != 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;
    points.push({
      latitude: lat / 1e5,
      longitude: lng / 1e5,
    });
  }
  return points;
}

function connectStomp() {
  var url = settings.stomp.uriWs;
  var client = Stomp.client(url);
  client.debug = null;
  client.reconnect_delay = 5000;
  // console.log(client);

  var headers = {
    login: settings.stomp.login,
    passcode: settings.stomp.passcode,
  };

  client.connect(
    headers.login,
    headers.passcode,
    connectCallback,
    errorCallback
  );
  client.ws.onclose = function (err) {
    // console.log("ws closed");
    // console.log(err);
    client.disconnect();
    connectStomp();
  };
  function connectCallback() {
    var subscription = client.subscribe(
      "/topic/c2m.stream." + settings.deviceId,
      onMessage,
      {
        ack: "client",
      }
    );

    // console.log("connected");
  }

  function errorCallback(err) {
    connectStomp();
    // console.log(err);
  }

  function closeEventCallback(e) {
    connectStomp();
  }
}

//Getting Query String
function getUrlVars() {
  var vars = [],
    hash;
  var hashes = window.location.href
    .slice(window.location.href.indexOf("?") + 1)
    .split("&");
  for (var i = 0; i < hashes.length; i++) {
    hash = hashes[i].split("=");
    vars.push(hash[0]);
    vars[hash[0]] = hash[1];
  }
  return vars;
}

function connectWS() {
  var connected = false;
  var ws = new WebSocket(settings.websocket.ws);
  ws.onmessage = onMessage;

  ws.onclose = function () {
    // console.log("socket closed");
    ws = null;
    setTimeout(function () {
      connectWS();
    }, 5000);
  };

  ws.onopen = function () {
    // console.log("web socket connected...waiting for unreal to say hello.");
  };
}

var onMessage = function (msg) {
  $(".loading").css("display", "none");
  //STOMP must include body of message
  if (msg.body) {
    MsgObj = JSON.parse(msg.body.trim());
    if (isDev === true) console.log(MsgObj);
  } else {
    MsgObj = JSON.parse(msg.data.trim());
    // console.log(MsgObj);
  }

  if (MsgObj) {
    if (
      temp &&
      temp._type != "transition" &&
      temp._type == MsgObj._type &&
      temp.lat == MsgObj.lat &&
      temp.lon == MsgObj.lon &&
      temp.current_stop == MsgObj.current_stop &&
      temp.direction == MsgObj.direction &&
      temp.hatno == MsgObj.hatno &&
      temp.hatno == MsgObj.hatno
    ) {
      // console.log(
      //   "Gelen verinin type,lat,long,current_stop, driection ve hatno değerleri aynı olduğu için arayüz değişmedi."
      // );
      return;
    }
    //for default value control
    if (MsgObj.lat == 0 && MsgObj.lon == 0) {
      getDate();
      setPlate();
      setRouteName();
      return;
    }
    temp = MsgObj;
    checkMessageType(MsgObj);
  }
};

var checkMessageType = function (msg) {
  MsgObj = msg;
  var type = msg._type;
  // if (busMarker) map.removeLayer(busMarker);
  switch (type) {
    case "transition":
      setLocalStorageObj("transitionMsg", msg);

      // on dev environment
      if (isDev === true) {
        playAudio(msg.audioUrl.replace("10.0.25.22", "193.109.135.37"));
      } else {
        playAudio(msg.audioUrl); // on production
      }
      initStops();
      break;

    case "location":
      //Cihaz yeni açıldığında yada yenileme işlemi yapıldığında Websocket/Stomp'tan gelen ilk mesajı storage'e kaydediyoruz.
      checkFirstMessageFromWsWithStorageStatus(msg);

      getDate();
      getWeather();

      var newHat = msg["hatno"];
      var newDirection = msg["direction"];

      if (parseInt(newHat) != parseInt(route_no)) {
        route_no = newHat;
        initFeatures();
        if (busMarker) map.removeLayer(busMarker);
        busMarker = null;
      }
      if (parseInt(newDirection) != parseInt(direction)) {
        direction = newDirection;
        initFeatures();
        if (busMarker) map.removeLayer(busMarker);
        busMarker = null;
      }
      if (!getLocalStorageObj("transitionMsg")) {
        initStops();
      }

      setPlate();
      setRouteName();
      setRouteNo();
      moveBus([msg.lat, msg.lon]);
      map.setView([msg.lat, msg.lon], 16);
      break;

    default:
      break;
  }
};

var checkFirstMessageFromWsWithStorageStatus = function (msg) {
  if (firstMsgFromWs === true) {
    var exLocationMsg = getLocalStorageObj("locationMsg");
    if (exLocationMsg) {
      setLocalStorageObj("locationMsgEx", exLocationMsg); //Bir önceki location
      setLocalStorageObj("locationMsg", msg);
    } else {
      setLocalStorageObj("locationMsg", msg);
    }

    firstMsgFromWs = false;
  } else {
    var exLocationMsg = getLocalStorageObj("locationMsg");
    setLocalStorageObj("locationMsgEx", exLocationMsg); //Bir önceki location
    setLocalStorageObj("locationMsg", msg);
    if (
      exLocationMsg.hatno !== msg.hatno ||
      exLocationMsg.direction !== msg.direction
    ) {
      removeLocalStorageObj("transitionMsg");
      window.location.reload();
      //Hat_no veya direction değişmiş.Transition mesajını sil.
    }
  }
};

var moveBus = function (coords) {
  if (!busMarker) {
    busMarker = L.marker(coords, {
      zIndexOffset: 1000,
      icon: L.icon({
        iconUrl: settings.map.busIcon,
        shadowUrl: "",
        iconSize: [60, 60],
        color: "#AE2418",
      }),
    }).addTo(map);
  } else {
    busMarker.setLatLng(coords);
  }
};

var setStartFinishStops = function () {
  if (MsgObj) {
    // console.log(MsgObj);
    var curr = MsgObj.current_stop ? MsgObj.current_stop : MsgObj.current;

    // startIndex = data.findIndex(function(x) { return x[1] == curr+''});

    startIndex = data
      .map(function (item) {
        return item[1];
      })
      .indexOf(curr + "");

    // data.filter(function(x,i) {
    //     startIndex = i;
    //     return x[1] == curr + ''
    // });

    const last = data.length - 1;

    if (last - startIndex >= 4) {
      endIndex = startIndex + 4;
    } else {
      endIndex = last;
    }
  } else {
    startIndex = 0;
    endIndex = 4;
  }
};

var initStops = function () {
  setStartFinishStops();
  const strt = startIndex + 1;
  var listElem = $("#stop-list");
  listElem.html("");
  //// if (data[startIndex][3].length > 20) {
  //     data[startIndex][3] = data[startIndex][3].substring(0, 20) + "..."
  //     console.log(data[startIndex][3]);
  // } else {
  //     data[startIndex][3] = data[startIndex][3]
  // }
  var currentElem = $("#current-stop");
  var nextElem = $("#next-stop");
  var nextElemName = $("#next-stop-name");

  if (data.length == 0 || !startIndex || startIndex == -1) return;

  if (MsgObj) {
    nextElemName.text("SONRAKİ DURAK");
  } else {
    nextElemName.text("");
  }

  currentElem.text(data[startIndex][3]);
  if (startIndex != data.length - 1) nextElem.text(data[startIndex + 1][3]);
  else nextElem.text(" ");

  if (endIndex - startIndex == 4) {
    listElem.css({
      "justify-content": "flex-start",
    });
    $(".stops__top").css({
      opacity: "1",
    });
  } else {
    listElem.css({
      "justify-content": "flex-end",
    });
    $(".stops__top").css({
      opacity: "0",
    });
  }
  if (nextElem.text().length > 40) {
    nextElem.css({
      "font-size": "4rem",
    });
  } else {
    // nextElem.css({
    //     'font-size': '5rem'
    // })
  }
  if (MsgObj) {
    for (var index = strt; index <= endIndex; index++) {
      const stop = data[index];
      listElem.prepend(
        "" +
          '<div class="stop">' +
          '<h5 class="stop__name">' +
          stop[3] +
          "</h5>" +
          "</div>"
      );
    }

    //     var divs = '';
    //     listElem.empty().detach();

    // $.each(MsgObj, function(i, _) {
    //     divs += ''
    //          +'<div class="stop">'
    //           +'<img src="assets/stop_point.png" class="stop_point" style="display:none"/>'
    //          +'<h5 class="stop__name">'+stop[3]+'</h5>'
    //          +'</div>'
    // });
    //     listElem.append(divs);
  }
};

var setPlate = function () {
  if (MsgObj !== null) {
    $("#plate").text(MsgObj.plaka.toUpperCase());
  }
};

var setRouteName = function () {
  $("#route_name").text(MsgObj.hat);
};

var setRouteNo = function () {
  $("#route_no").text(MsgObj.hatno);
};

var playAudio = function (audioUrl) {
  // chrome://settings/content/sound

  if (audioUrl) {
    var audio = new Audio(audioUrl);
    audio.play();
  }
};

var initMap = function () {
  map.eachLayer(function (layer) {
    if (map.hasLayer(layer)) map.removeLayer(layer);
  });

  //path içinde tanımlı tiles varsa, xyz alacak
  if (settings.map.tilePath.indexOf("QTiles") > -1) {
    L.tileLayer(settings.map.tilePath, {
      // maxZoom: settings.map.maxZoom,
      // minZoom: settings.map.minZoom,
      // tms: false,
      // attribution: '.'
    }).addTo(map);
  } else {
    // yoksa large image alacak

    // https://products.aspose.app/gis/en/transformation/lat-long-to-mercator
    imageBounds = [
      [37.32645720728876, 25.039539330774858],
      [39.88243258305118, 29.666143075813917],
    ];
    //    imageBounds = [[37.69472041748014,25.362946685079564],[39.877451848429516,29.34273571252605]]; //110MB lik dosya içinde bbox
    var overlay = L.imageOverlay(settings.map.tilePath, imageBounds).addTo(map);
    map.fitBounds(imageBounds);
  }
};

var initFeatures = function () {
  map.eachLayer(function (layer) {
    if (map.hasLayer(layer)) map.removeLayer(layer);
  });

  //iki kere yükleme yapıyor.

  initMap();

  $.get({
    url: settings.map.routes,
    cache: true,
    dataType: "json",
    contentType: "application/json",
  })
    .done(function (result) {
      $("#route_no").text(route_no);

      route = L.Polyline.fromEncoded(
        result[route_no][direction == "0" ? 1 : 0],
        {
          //1.indis, 0.indis
          color: settings.map.routeColor,
          zIndexOffset: 2,
          weight: settings.map.routeWidth,
        }
      ).addTo(map);
      route["route_no"] = route_no;

      // console.log(route);
      route.bringToBack();
      if (MsgObj) {
        var bounds = route.getBounds();
        //map.fitBounds(bounds);
        // map.setView(bounds.getCenter(),16);
        map.flyToBounds(bounds);
      }
    })
    .fail(function (err) {
      // console.log(err);
    });

  $.get({
    url: settings.map.routes_stop,
    cache: true,
    dataType: "json",
    contentType: "application/json",
  })
    .done(function (result) {
      $("#route_name").text(result[route_no].name);

      data = result[route_no].routes[direction == "0" ? 1 : 0];

      //icons
      setTimeout(function () {
        for (var i = 0; i < data.length; i++) {
          const s = data[i];
          var latlngs = decode(s[2])[0];
          var stopMarker = L.marker([latlngs.latitude, latlngs.longitude], {
            icon: L.icon({
              iconUrl: settings.map.stopIcon,
              shadowUrl: "",
              zIndexOffset: 1000000,
              className: "station",
            }),
          }).addTo(map);

          //hover effect
          if (data[i][3].length > 20)
            stopMarker.bindTooltip(
              "<h2 class='hover_stop'>" +
                data[i][1] +
                "<br/>" +
                data[i][3].substring(0, 20) +
                "...</h2>"
            );
          else
            stopMarker.bindTooltip(
              "<h2 class='hover_stop'>" +
                data[i][1] +
                "<br/>" +
                data[i][3] +
                "</h2>"
            );
        }
      });
      //left side
      initStops();
    })
    .fail(function (err) {
      // console.log(err);
    });
};

var getDate = function () {
  $("#date").html("");
  if (MsgObj !== null) {
    var date = MsgObj.date;
    var date_clock = date.substring(11, 13);
    var date_blink = date.substring(13, 14);
    var date_min = date.substring(14, 16);

    // <div class="date__day" id="date__day">${date.Date}</div>
    $("#date").append(
      '<div class="date__clock" id="date__clock">' +
        date_clock +
        '<span class="blink">' +
        date_blink +
        "</span>" +
        date_min +
        "</div>"
    );
  }
};

var getTimeDefault = function () {
  $("#date").html("");

  const todayDateTime = new Date();
  var hours = todayDateTime.getHours();
  var min = todayDateTime.getMinutes();

  if (hours < 10) {
    hours = "0" + hours;
  }
  if (min < 10) {
    min = "0" + min;
  }

  $("#date").append(
    '<div class="date__clock" id="date__clock">' +
      hours +
      '<span class="blink">:</span>' +
      min +
      "</div>"
  );
};

var getWeather = function () {
  if (MsgObj !== null) {
    const item = MsgObj.weather;

    $("#weather").html("");

    $("#weather").append(
      "" +
        '<div class="weather__box" id="weather__box">' +
        '<img src="assets/weather/' +
        item.Icon +
        '.png" class="weather__icon" alt="" />' +
        "</div>" +
        '<div class="weather__text" id="weather__text">' +
        item.temp +
        "</div>"
    );
  }
};

var setLocalStorageObj = function (key, value) {
  var _val = getLocalStorageObj(key);
  if (_val) {
    localStorage.removeItem(key);
    localStorage.setItem(key, JSON.stringify(value));
  } else {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

var getLocalStorageObj = function (key) {
  var obj = localStorage.getItem(key);
  if (obj) {
    return JSON.parse(obj);
  }
  return null;
};
var removeLocalStorageObj = function (key) {
  localStorage.removeItem(key);
};

var isSelectFull = true;
var isButtonShow = false;

function arrowShow() {
  if (isDev === false) return;
  document.querySelector(".arrow").style.display = "block";
  if (isSelectFull) {
    LoadPlate();
    isSelectFull = false;
  }
}

function arrowHide() {
  document.querySelector(".arrow").style.display = "none";
}

var isMenuShow = false;
function menuShow() {
  if (!isMenuShow) {
    document.querySelector(".menu").style.display = "block";
    document.querySelector(".arrow").style.display = "block";
    document.querySelector(".arrow").style.left = "240px";
  } else {
    document.querySelector(".menu").style.display = "none";
    document.querySelector(".arrow").style.display = "none";
    document.querySelector(".arrow").style.left = "8%";
  }

  isMenuShow = !isMenuShow;
}

window.onkeyup = function (event) {
  if (event.keyCode === 27) {
    document.querySelector(".menu").style.display = "none";
    document.querySelector(".arrow").style.display = "none";
    document.querySelector(".arrow").style.left = "8%";
  }
};

function LoadPlate() {
  $.get({
    url: "data/config.json",
    cache: true,
    dataType: "json",
    contentType: "application/json",
  })
    .done(function (result) {
      //  var select= document.getElementById("plate-select");
      result.filter(function (bus) {
        $("#plate-select").append(
          "<option value='" +
            bus._id +
            "' data-value='" +
            bus.hostname +
            "'></option>"
        );
        // $("<option>").val(bus.hostname).text(bus._id)
        return;
      });
    })
    .fail(function (err) {
      // console.log(err);
    });
}

function WatchBus() {
  removeLocalStorageObj("locationMsg");
  removeLocalStorageObj("locationMsgEx");
  removeLocalStorageObj("transitionMsg");

  window.location.href =
    "/?device=" + getDataListSelectedOption("select-search", "plate-select");
}

function clearStorage() {
  removeLocalStorageObj("locationMsg");
  removeLocalStorageObj("locationMsgEx");
  removeLocalStorageObj("transitionMsg");
  window.location.href = "/";
}

function getDataListSelectedOption(txt_input, data_list_options) {
  var shownVal = document.getElementById(txt_input).value;
  var value2send = document.querySelector(
    "#" + data_list_options + " option[value='" + shownVal + "']"
  ).dataset.value;
  return value2send;
}

function printMousePos(event) {
  if (event.clientX > 230) {
    if (isMenuShow == true) menuShow();
  }
}

document.addEventListener("click", printMousePos);
