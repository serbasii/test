# Açılış Ekranı

![Image of Capture](assets/images/screen_open.png)

# Otobüs Ekran Çalışması

![Image of Capture](assets/images/screen.png)

## Send Message Details

```
AMQP/MQTT/STOMP/
+TOPICS=eshot/device_id

{
    "_type": "location",
    "weather": {
        "Icon": "03d",
        "temp": 26
    },
    "date": "12.09.2022 11:49:26",
    "lon": 26.9909544,
    "lat": 38.07550085,
    "direction": "0",
    "current_stop": 11119,
    "plaka": "P5759",
    "hat": "CUMAOVASI AKTARMA  - DOĞANBEY",
    "hatno": 776,
    "sofor": "",
    "data_date": "12.09.2022 11:49:26",
    "gpsNodeRedTime": 1662992074292,
    "m2cGPSSendTime": 1662992074294
}

```

```
AMQP/MQTT/STOMP/
+TOPICS=eshot/device_id/event

{
  "_type": "transition",
  "time": 1584816660,
  "current": "100005",
  "next": "100005",
  "audioUrl":"http://127.0.0.1:9000/subsequent/20151.mp3?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAIOSFODNN7EXAMPLE%2F20210202%2F%2Fs3%2Faws4_request&X-Amz-Date=20210202T150330Z&X-Amz-Expires=432000&X-Amz-SignedHeaders=host&X-Amz-Signature=afb96081d79c1553a2ae03b25512f4f4cd7d19abe553dd262dd4c1eae547577f"
}

```
