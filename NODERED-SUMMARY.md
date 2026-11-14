# สรุปการทำงาน Node-RED ↔ AgriFlow

> เอกสารนี้สรุปจาก **flow จริงที่รันอยู่บน `http://13.212.181.250:1880`** (อ่านผ่าน Node-RED Admin API เมื่อ 14 พ.ย. 2026)
> จำนวน: **3 tab / 90 โหนด** — `Flow 1` (ว่าง), `Flow 2` (ใช้งานหลัก), `Flow 3` (ทดสอบ)

Repository เว็บ: <https://github.com/67010206-prog/smart-irrigation-web>
เว็บที่ deploy: <https://smart-irrigation-web-beta.vercel.app>

---

## 1. ภาพรวมสถาปัตยกรรม

```
┌──────────── ESP32 / เซนเซอร์ ────────────┐
│ node1..node5 : sensors/<node>/data       │   ← ข้อมูลดิน/อากาศของ 5 แปลง
│ node6        : sensors/node6/water_level │   ← ระดับน้ำในถัง (%)
└───────────────────┬──────────────────────┘
                    │ MQTT (broker localhost:1883)
                    ▼
┌──────────────── Node-RED (13.212.181.250:1880) ────────────────┐
│  MQTT IN ──► Pump Logic Engine ──► MQTT OUT pump/control/groupX │  สั่งรีเลย์จริง
│      │            └─► Gauge "Tank water level" (Dashboard /ui)  │
│      │            └─► Format Tank Level for API                 │
│      └─► Format Sensor Data for AgriFlow ──► HTTP POST ──┐      │
└──────────────────────────────────────────────────────────┼──────┘
                                                           ▼
                                        ┌──────── AgriFlow (Next.js / Vercel) ────────┐
                                        │ POST /api/sensors/telemetry  (รับค่า)       │
                                        │ GET  /api/sensors/latest     (Dashboard ดึง)│
                                        │ POST /api/control/pump       (เว็บสั่งปั๊ม) │
                                        └─────────────────────────────────────────────┘
                                                           │
                        POST http://13.212.181.250:1880/api/irrigation/pump
                                                           ▼
                                            HTTP IN → Function → MQTT OUT
```

**ทิศทางข้อมูล 2 ทาง**

| ทิศทาง | เส้นทาง |
|---|---|
| Sensor → Web | MQTT → Node-RED Function → `POST /api/sensors/telemetry` → Dashboard (poll ทุก 10 วินาที) |
| Web → Pump | หน้าเว็บ → `POST /api/control/pump` → Node-RED `POST /api/irrigation/pump` → MQTT `pump/request/groupX` → Pump Logic Engine → MQTT `pump/control/groupX` |

---

## 2. API ทั้งหมดของ Node-RED (HTTP IN)

| Method | Path | ใช้ทำอะไร | ปลายทาง |
|---|---|---|---|
| `POST` | `/api/irrigation/pump` | รับคำสั่งเปิด–ปิดปั๊มรายกลุ่ม (ใช้โดยเว็บ AgriFlow) | Function `For http to mqtt` → MQTT `pump/request/groupX` |
| `POST` | `/api/irrigation/control` | ทางเข้าเดิมสำหรับส่งข้อมูลเซนเซอร์เข้าระบบ (simulate) | Function `For http to mqtt` → MQTT `sensors/<group_id>/data` |
| `GET` | `/users` | endpoint ทดสอบ: อ่านไฟล์ JSON แล้วตอบกลับ | file in → json → http response (**ตัวอย่าง/ไม่ได้ใช้จริง**) |

### 2.1 `POST /api/irrigation/pump` — คำสั่งเปิด–ปิดปั๊ม

**Request**

```json
{ "group_id": "group2", "request": true }
```

- `group_id` รับ `group1..group5` หรือ `1..5` (เติม `group` ให้อัตโนมัติ)
- `request` รับ `true/false`, `1/0`, `"true"`, `"ON"`, `"open"`
- ถ้าส่ง `group_id` ไม่มา → function ตอบ `null` (ไม่มีอะไรถูก publish) แต่ **HTTP ยังตอบ 200** (response node ต่อจาก http in โดยตรง)

**ผลลัพธ์ภายใน**: publish MQTT `pump/request/groupX` payload `{ "request": true }`

**Mapping กับ 5 แปลงในหน้าเว็บ**

| แปลง (zone) | group_id |
|---|---|
| ทานตะวัน `sunflower` | `group1` |
| ไม้ล้มลุก `herb` | `group2` |
| ปอเทือง `sunnhemp` | `group3` |
| ไม้กระถาง `potted` | `group4` |
| นาข้าว `rice` | `group5` |

### 2.2 `POST /api/irrigation/control` — ป้อนข้อมูลเซนเซอร์เข้าระบบ

```json
{ "group_id": "node2", "temperature": 30, "humidity": 60 }
```

แปลงเป็น MQTT topic `sensors/node2/data` (ใช้ทดสอบแทนการต่อ MQTT จริง)

> ⚠️ endpoint นี้เป็นฝั่ง **ขาเข้า** ของ Node-RED ไม่ใช่ของเว็บ — และไม่มี auth ใด ๆ ใครเข้าถึง IP ได้ก็ยิงได้

---

## 3. MQTT Topics

| Topic | ทิศทาง | ผู้ส่ง | ผู้รับ | ความหมาย |
|---|---|---|---|---|
| `sensors/node1..node5/data` | IN | ESP32 | Node-RED | ข้อมูลดิน/อากาศรายแปลง |
| `sensors/node6/water_level` | IN | ESP32 | Node-RED | ระดับน้ำในถัง (%) |
| `sensors/+/data` | IN (wildcard) | – | Node-RED | รับทั้ง node1–5 ในเส้นเดียว |
| `pump/request/group1..5` | IN + OUT | เว็บ/Node-RED (loop กลับเข้าเอง) | Pump Logic Engine | คำขอเปิด–ปิดรายกลุ่ม |
| `pump/request/+` | IN (wildcard) | – | Pump Logic Engine | รับคำขอทุกกลุ่ม |
| `pump/control/group1..5` | OUT | Pump Logic Engine | รีเลย์/ESP32 | คำสั่งจริง (ผ่านเงื่อนไข safety แล้ว) |
| `pump/control/status` | OUT | `function 3` (legacy) | – | สถานะสรุปแบบเก่า |

Broker: `localhost:1883` (ไม่มี TLS/รหัสผ่านใน config) — ถ้า ESP32 อยู่นอกเครื่องต้องเปิด auth

---

## 4. โหนดสำคัญใน `Flow 2`

| โหนด | ชนิด | หน้าที่ |
|---|---|---|
| `Pump Logic Engine` | function (92 บรรทัด) | สมองหลัก: จำ `requests` + `waterLevel` ใน context, เช็ก safety, ส่งออก 4 ขา |
| `Format Tank Level for API` | function | แปลงเป็น `{ waterTank: { levelPercent } }` |
| `Format Sensor Data for AgriFlow` | function (148 บรรทัด) | map `node1..5` → zone ของเว็บ + แปลงชื่อฟิลด์ให้ตรงกับ API |
| `For chart` | function | แยกข้อมูลตาม node ไปยัง ui_chart 5 ตัว |
| `For http to mqtt` (2 ตัว) | function | แปลง HTTP body → MQTT topic |
| `For db` | function | สร้าง SQL `INSERT INTO sensor_data (temperature, humidity)` |
| `delay` | delay | rate limit **1 ข้อความ / 5 วินาที**, drop intermediate (ก่อนยิง API ถังน้ำ) |
| `function 3` | function (legacy) | ตรรกะปั๊มเวอร์ชันเก่า (ยังต่อ mqtt out `pump/control/status`) |

### 4.1 `Pump Logic Engine` — 4 ขาออก

```
ขา 1 → change (payload = payload.water_level) → ui_gauge "Tank water level"
     → Format Tank Level for API → delay → HTTP POST /api/sensors/telemetry
ขา 2 → ui_text "Pump status"
ขา 3 → mqtt out (msg.topic) = pump/control/group1..5  (array 5 ข้อความ)
ขา 4 → debug "debug 1"
```

เงื่อนไขภายใน: `isWaterSufficient = waterLevel >= 15` → ถ้าน้ำไม่พอ ทุกกลุ่มจะถูกสั่งปิด (`shouldOpen = false`)

### 4.2 Dashboard ในตัว Node-RED (`/ui`)

- Tab **Monitoring**
  - group "Sensor Data (group 1-5)": `ui_chart` 5 ตัว
  - group "Pump control & tank status (group 6)": `ui_gauge` (Tank water level 0–100 %) + `ui_text` (Pump status)

---

## 5. Payload ที่วิ่งเข้า AgriFlow

### 5.1 ข้อมูลเซนเซอร์ (`Format Sensor Data for AgriFlow`)

```json
{
  "temperature": 29.5,
  "humidity": 70,
  "etoMmPerDay": 4.2,
  "zones": { "herb": { "soilWaterKpa": 32.5 } }
}
```

Mapping node → zone ที่ flow ใช้: `node1=sunflower, node2=herb, node3=sunnhemp, node4=potted, node5=rice`
แปลงชื่อฟิลด์ที่รองรับ: `moisture`/`soilMoisturePercent`, `soil_metric_potential_kpa`/`soil_matric_potential_kpa`/`soilWaterKpa`, `soil_temperature`/`soilTempC`, `soil_humidity`/`soilHumidity`, `eto_mm_per_hour`/`etoMmPerHour`, และ `et0_mm` ÷ `hours_count`

### 5.2 ระดับน้ำในถัง (`Format Tank Level for API`)

```json
{ "waterTank": { "levelPercent": 75 } }
```

### 5.3 ฝั่งเว็บรับได้ (ตรวจแล้วในโปรเจกต์นี้)

`POST /api/sensors/telemetry` รับได้ทุกชื่อ: `tankWaterLevelPercent` (ชื่อหลัก), `tankWaterLevel`, `waterTankPercent`, `waterTank.levelPercent`
และรับ payload รูปแบบ snapshot เต็ม (`weather` + `waterTank` + `zones` แบบ array) ได้ด้วย

---

## 6. API ฝั่งเว็บ AgriFlow (อ้างอิง)

| Method | Path | body / ค่าที่ได้ |
|---|---|---|
| `GET` | `/api/sensors/latest` | `{ weather, tankWaterLevelPercent, tankWaterLevel, waterTank, zones[], updatedAt }` |
| `POST` | `/api/sensors/telemetry` | `{ temperature, humidity, etoMmPerDay, tankWaterLevelPercent, zones }` (ทุกฟิลด์ไม่บังคับ) |
| `POST` | `/api/control/pump` | `{ zone, state }` → forward ไป Node-RED `{ group_id, request }` |

`POST /api/control/pump` ตอบ **502** ถ้า Node-RED ไม่ตอบภายใน 8 วินาที และจะไม่เปลี่ยนสถานะบนหน้าจอ

---

## 7. ปัญหาที่พบ (ยังไม่ได้แก้)

| # | เรื่อง | รายละเอียด |
|---|---|---|
| 1 | **threshold ไม่ตรงกัน** | `Pump Logic Engine` ใช้ `>= 15` แต่ข้อความ UI เขียน "น้ำต่ำกว่า 20%" และ `function 3` ใช้ `>= 20` |
| 2 | **`function 3` ซ้ำซ้อน** | ตรรกะปั๊มเวอร์ชันเก่า ยัง publish `pump/control/status` และอ่าน `msg.payload.level` (แต่ Pump Logic ส่ง `water_level`) → ค่า `NaN` |
| 3 | **`For db` ไม่ได้ต่อสาย** | ฟังก์ชันสร้าง SQL แต่ไม่มีสายไป `postgresql` node และ `postgresql` node มี query `SELECT * FROM ` (ไม่ระบุตาราง) |
| 4 | **SQL ต่อสตริงตรง ๆ** | `INSERT ... VALUES (${temp}, ${hum})` เสี่ยง SQL injection / พังถ้าค่าเป็น `NaN` |
| 5 | **กลุ่มที่ 5 ไม่มี mqtt out เฉพาะ** | โหนด `pump/request/group1..4` มีแยก แต่ group5 ใช้ตัว generic (`msg.topic`) — ทำงานได้แต่ไม่สม่ำเสมอ |
| 6 | **endpoint ไม่มี auth** | `/api/irrigation/pump` และ `/control` เปิดให้ใครก็ยิงได้ (ไม่มีการเช็ก token) |
| 7 | **Vercel ยังเป็นโค้ดเก่า** | ต้อง merge PR แล้ว redeploy ก่อนที่ `waterTank` จะแสดงบนเว็บจริง |
| 8 | **ข้อมูลอยู่ใน memory** | เว็บเก็บค่าใน RAM → Vercel cold start แล้วระดับน้ำกลับเป็นค่า seed จนกว่า Node-RED จะยิงรอบใหม่ (แนะนำให้อ่านจาก PostgreSQL แทน) |
| 9 | **Flow 1 ว่าง / sim injects ค้าง** | มี inject "Simu http …" หลายตัวยิงไป endpoint ของตัวเอง (ผลไม่ต่อสาย) อาจกดทดสอบผิดตัวได้ |

---

## 8. ทดสอบเร็ว ๆ ด้วย curl

```bash
# 1) สั่งเปิดปั๊มไม้กระถาง (group4)
curl -X POST http://13.212.181.250:1880/api/irrigation/pump \
  -H "Content-Type: application/json" \
  -d '{"group_id":"group4","request":true}'

# 2) ส่งข้อมูลเซนเซอร์เข้า Node-RED (จะถูกส่งต่อไปเว็บด้วย)
curl -X POST http://13.212.181.250:1880/api/irrigation/control \
  -H "Content-Type: application/json" \
  -d '{"group_id":"node2","temperature":30,"humidity":60}'

# 3) ยิงระดับน้ำเข้าถังตรงไปที่เว็บ
curl -X POST https://smart-irrigation-web-beta.vercel.app/api/sensors/telemetry \
  -H "Content-Type: application/json" \
  -d '{"tankWaterLevelPercent":75}'

# 4) ดูค่าที่เว็บถืออยู่
curl https://smart-irrigation-web-beta.vercel.app/api/sensors/latest
```

> Node-RED Admin API (ต้องมี token):
> ```bash
> TOKEN=$(curl -s -X POST http://13.212.181.250:1880/auth/token \
>   -d "client_id=node-red-admin&grant_type=password&scope=*&username=<user>&password=<pass>" \
>   | jq -r .access_token)
> curl -s -H "Authorization: Bearer $TOKEN" http://13.212.181.250:1880/flows
> ```
> อย่าเก็บรหัสผ่านไว้ในไฟล์นี้หรือใน repo

---

## 9. สรุปสั้น

- Node-RED ทำหน้าที่ **ประตู MQTT + ตรรกะ safety** ส่วนเว็บทำหน้าที่ **แสดงผล + รับคำสั่งจากผู้ใช้**
- เว็บคุยกับ Node-RED ผ่าน **2 endpoint เดิม** (`/api/irrigation/pump` สำหรับสั่ง, `/api/sensors/telemetry` สำหรับส่งค่า) — ไม่ต้องสร้าง endpoint ใหม่
- สายถังน้ำ (`node6 → waterTank.levelPercent → API`) **ต่อครบแล้ว** เหลือแค่ deploy เว็บเวอร์ชันใหม่และเก็บค่าลงฐานข้อมูลถาวร
