# AgriFlow — Smart Irrigation Dashboard

เว็บแอปต้นแบบสำหรับระบบให้น้ำอัจฉริยะ พัฒนาด้วย **Next.js (App Router) + TypeScript**
หน้าเว็บดึงค่าจริงจาก backend ภายในโปรเจกต์ทุก 10 วินาที (ปรับได้ที่ `POLL_INTERVAL_MS` ใน `components/Dashboard.tsx`)

- **Control** — แถวบนแสดงอุณหภูมิ / ความชื้นรวม / ETo และการ์ดของ 5 แปลง พร้อมปุ่มเปิด–ปิดปั๊มแต่ละแปลง
- **Docs & Learning** — คู่มือและองค์ความรู้เรื่องระบบ ฮาร์ดแวร์ MQTT หลักการควบคุม
- **Data Storage** — ตรวจสอบ/ค้นหาข้อมูลย้อนหลัง และ Export CSV

> ค่าที่แสดงมาจาก backend (`/api/sensors/latest`) ซึ่งเก็บค่าล่าสุดไว้ในหน่วยความจำ
> อุปกรณ์ (ESP32) หรือ Postman ส่งค่าเข้ามาผ่าน `POST /api/sensors/telemetry`

## 5 แปลง (zone)

| id | ชื่อแปลง | ค่าที่วัด (zone values) | หน่วย |
|---|---|---|---|
| `herb` | ไม้ยืนต้น | `soilWaterKpa` | kPa |
| `rice` | นาข้าว | `etoMmPerHour` | mm/ชั่วโมง |
| `sunnhemp` | แปลงดอกไม้ · ปอเทือง | `soilTempC`, `soilHumidity` | °C, % |
| `sunflower` | แปลงดอกไม้ · ทานตะวัน | `soilMoisturePercent` | % (1–100) |
| `potted` | แปลงดอกไม้ · ไม้กระถาง | `soilWaterKpa` | kPa |

ค่าอากาศ (ใช้กับการ์ดแถวบนทุกแปลง): `temperatureC` (°C), `humidity` (%), `etoMmPerDay` (mm/วัน)

---

## วิธีเปิดใช้งาน

```bash
npm install
npm run dev
```

เปิด `http://localhost:3000` (ถ้าพอร์ต 3000 ไม่ว่าง Next จะเลือกพอร์ตอื่น ดูบรรทัด `Local:` ใน terminal)

Build สำหรับ production

```bash
npm run build
npm start
```

---

## งาน → ต้องยิง API เส้นไหน

| งานที่อยากทำ | Method + Endpoint | body |
|---|---|---|
| ดูค่าล่าสุดทั้งหมด (อากาศ + 5 แปลง + สถานะปั๊ม) | `GET /api/sensors/latest` | – |
| ส่งค่าจากเซนเซอร์/ESP32 (ทั้งหมด) | `POST /api/sensors/telemetry` | `{ temperature, humidity, etoMmPerDay, zones: {...} }` |
| ส่งค่าแค่แปลงเดียว | `POST /api/sensors/telemetry` | `{ "zones": { "herb": { "soilWaterKpa": 30 } } }` |
| เปิด–ปิดปั๊มของแปลง | `POST /api/control/pump` | `{ "zone": "herb", "state": true }` |
| ส่งระดับน้ำในถัง (Node-RED / MQTT node6) | `POST /api/sensors/telemetry` | `{ "tankWaterLevelPercent": 75 }` |
| ตรวจว่าระบบรับค่าจริงไหม | `GET /api/sensors/latest` แล้วดู `updatedAt` | – |

> ทุก endpoint ใช้ base URL เดียวกัน: `http://localhost:3000` (หรือ IP เครื่องในวง LAN เมื่อเรียกจาก ESP32)

---

## 1) GET /api/sensors/latest — ดูค่าล่าสุด

```bash
curl http://localhost:3000/api/sensors/latest
```

ตัวอย่างผลลัพธ์

```json
{
  "weather": { "temperatureC": 29.5, "humidity": 70, "etoMmPerDay": 4.2 },
  "tankWaterLevel": 75,
  "waterTank": { "levelPercent": 75 },
  "zones": [
    { "id": "herb", "name": "ไม้ล้มลุก", "pumpOn": false, "values": { "soilWaterKpa": 32.5 } },
    { "id": "rice", "name": "นาข้าว", "pumpOn": false, "values": { "etoMmPerHour": 0.42 } },
    { "id": "sunnhemp", "name": "ปอเทือง", "pumpOn": false, "values": { "soilTempC": 26.8, "soilHumidity": 58.5 } },
    { "id": "sunflower", "name": "ทานตะวัน", "pumpOn": false, "values": { "soilMoisturePercent": 41 } },
    { "id": "potted", "name": "ไม้กระถาง", "pumpOn": false, "values": { "soilWaterKpa": 18.4 } }
  ],
  "updatedAt": "2026-11-13T10:04:32.548Z"
}
```

- `updatedAt` = เวลาที่ข้อมูลถูกแก้ล่าสุด (ใช้เช็กว่าค่าที่เห็นเป็นของใหม่จริง)
- ตั้ง `Cache-Control: no-store` ให้แล้ว จึงได้ค่าใหม่ทุกครั้ง

---

## 2) POST /api/sensors/telemetry — ส่งค่าจากเซนเซอร์ / ESP32

```bash
curl -X POST http://localhost:3000/api/sensors/telemetry \
  -H "Content-Type: application/json" \
  -d '{
    "temperature": 29.5,
    "humidity": 70,
    "etoMmPerDay": 4.2,
    "zones": {
      "herb": { "soilWaterKpa": 32.5 },
      "rice": { "etoMmPerHour": 0.42 },
      "sunnhemp": { "soilTempC": 26.8, "soilHumidity": 58.5 },
      "sunflower": { "soilMoisturePercent": 41 },
      "potted": { "soilWaterKpa": 18.4 }
    }
  }'
```

ผลลัพธ์เมื่อสำเร็จ (ส่งค่าที่บันทึกแล้วกลับมาด้วย)

```json
{
  "ok": true,
  "weather": { "temperatureC": 29.5, "humidity": 70, "etoMmPerDay": 4.2 },
  "zones": [ ... ],
  "updatedAt": "2026-11-13T10:04:38.010Z"
}
```

**กติกาการส่ง**

- ทุกฟิลด์ **ไม่บังคับ** — ส่งเฉพาะค่าที่มีก็ได้ ค่าที่ไม่ส่งจะคงค่าเดิม
- ค่าที่ไม่ใช่ตัวเลขจะถูกข้าม (ไม่ทำให้ทั้ง request พัง)
- `humidity` ต้องอยู่ระหว่าง `0–100` ไม่งั้นได้ `400`
- `tankWaterLevelPercent` (ระดับน้ำในถัง `%`) ต้องอยู่ระหว่าง `0–100` ไม่งั้นได้ `400`
  — รับชื่ออื่นได้ด้วย: `tankWaterLevel`, `waterTankPercent` หรือ `waterTank: { levelPercent }`
- `POST` รับ payload รูปแบบเดียวกับ response ของ `GET /api/sensors/latest` ได้เลย
  คือ `{ weather: { temperatureC, humidity, etoMmPerDay }, waterTank: { levelPercent }, zones: [{ id, values }] }`
- `zones` ที่ไม่รู้จัก (เช่น `corn`) จะถูกข้าม
- `soilMoisturePercent` ควรอยู่ `1–100`

**ตัวอย่างการส่งทีละแปลง** (ใช้บ่อยตอนต่อเซนเซอร์ทีละตัว)

```bash
# ไม้ล้มลุก: ความชื้นในดิน kPa
curl -X POST http://localhost:3000/api/sensors/telemetry \
  -H "Content-Type: application/json" \
  -d '{"zones":{"herb":{"soilWaterKpa":28.6}}}'

# นาข้าว: ETo mm/ชั่วโมง
curl -X POST http://localhost:3000/api/sensors/telemetry \
  -H "Content-Type: application/json" \
  -d '{"zones":{"rice":{"etoMmPerHour":0.36}}}'

# ปอเทือง: อุณหภูมิดิน + ความชื้น
curl -X POST http://localhost:3000/api/sensors/telemetry \
  -H "Content-Type: application/json" \
  -d '{"zones":{"sunnhemp":{"soilTempC":27.9,"soilHumidity":60.1}}}'

# ทานตะวัน: ความชื้นในดิน %
curl -X POST http://localhost:3000/api/sensors/telemetry \
  -H "Content-Type: application/json" \
  -d '{"zones":{"sunflower":{"soilMoisturePercent":36}}}'

# ไม้กระถาง: ความชื้นในดิน kPa
curl -X POST http://localhost:3000/api/sensors/telemetry \
  -H "Content-Type: application/json" \
  -d '{"zones":{"potted":{"soilWaterKpa":14.2}}}'
```

---

## 3) POST /api/control/pump — เปิด–ปิดปั๊มของแปลง

```bash
# เปิดปั๊มนาข้าว
curl -X POST http://localhost:3000/api/control/pump \
  -H "Content-Type: application/json" \
  -d '{"zone":"rice","state":true}'

# ปิด
curl -X POST http://localhost:3000/api/control/pump \
  -H "Content-Type: application/json" \
  -d '{"zone":"rice","state":false}'
```

ผลลัพธ์

```json
{ "ok": true, "zone": { "id": "rice", "name": "นาข้าว", "pumpOn": true, "values": { "etoMmPerHour": 0.36 } } }
```

**ข้อผิดพลาดที่พบบ่อย**

| สาเหตุ | สถานะ | ข้อความ |
|---|---|---|
| `zone` ผิด/ไม่ส่ง | 400 | `zone ต้องเป็นหนึ่งใน: herb, rice, sunnhemp, sunflower, potted` |
| `state` ไม่ใช่ boolean | 400 | `state ต้องเป็น true หรือ false` |
| JSON ผิดรูปแบบ | 400 | `Invalid JSON body` |

---

## ทดสอบด้วย Postman

1. **New → HTTP Request**
2. Method: `POST`
3. URL: `http://localhost:3000/api/sensors/telemetry`
4. แท็บ **Headers**: `Content-Type` = `application/json`
5. แท็บ **Body** → **raw** → **JSON** แล้วใส่ body ตามตัวอย่างด้านบน
6. กด **Send** → ต้องได้ `"ok": true`

หมายเหตุ: Postman ยิงจากเครื่อง server เองจึงไม่ติด CORS แต่ถ้าเรียกจากเบราว์เซอร์คนละโดเมนต้องเพิ่ม CORS header

---

## ตัวอย่าง ESP32 (Arduino)

```cpp
#include <WiFi.h>
#include <HTTPClient.h>

const char* ssid = "ชื่อWiFi";
const char* pass = "รหัสWiFi";
const char* api  = "http://192.168.1.50:3000/api/sensors/telemetry"; // IP เครื่องที่รัน server

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, pass);
  while (WiFi.status() != WL_CONNECTED) delay(500);
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(api);
    http.addHeader("Content-Type", "application/json");

    String body = "{\"temperature\":" + String(อ่านอุณหภูมิ)
                + ",\"humidity\":" + String(อ่านความชื้นอากาศ)
                + ",\"etoMmPerDay\":" + String(อ่านETo)
                + ",\"zones\":{\"herb\":{\"soilWaterKpa\":" + String(อ่านค่าดิน)
                + "}}}";

    Serial.println(http.POST(body)); // 200 = สำเร็จ
    http.end();
  }
  delay(10000); // ตรงกับรอบ polling ของหน้าเว็บ
}
```

> ESP32 ต้องเรียก `http://<LAN IP ของเครื่อง>:3000` ไม่ใช่ `localhost`
> และมีสคริปต์ฝั่งอุปกรณ์อ่านสถานะปั๊มด้วย `GET /api/sensors/latest` → `zones[].pumpOn` เพื่อสั่งรีเลย์จริง

---

## โครงสร้างโปรเจค

```text
smart-irrigation-web/
├── app/
│   ├── api/
│   │   ├── control/pump/route.ts        # POST เปิด–ปิดปั๊มรายแปลง
│   │   └── sensors/
│   │       ├── latest/route.ts          # GET ค่าล่าสุด
│   │       └── telemetry/route.ts       # POST รับค่าจากอุปกรณ์
│   ├── globals.css
│   ├── zones.css
│   ├── layout.tsx
│   └── page.tsx
├── components/                          # Dashboard, Control, Docs, DataStorage, Sidebar, Topbar
├── lib/
│   ├── server/store.ts                  # ที่เก็บค่า 5 แปลง + อากาศ (in-memory)
│   ├── services/api.ts                  # API client ที่หน้าเว็บเรียกใช้
│   └── types/iot.ts                     # ชนิดข้อมูลที่ใช้ร่วมกัน
├── next-env.d.ts
├── package.json
├── tsconfig.json
└── README.md
```

---

## ชี้หน้าเว็บไปยัง API ภายนอก

สร้าง `.env.local` แล้วกำหนด

```bash
NEXT_PUBLIC_API_BASE_URL=https://api.example.com
```

- ค่านี้จะถูกส่งเข้า `setCustomApiBaseUrl()` อัตโนมัติเมื่อแอปเริ่มทำงาน (ตัด `/` ท้ายให้)
- ถ้าไม่ตั้งค่า จะใช้ same-origin (`/api/...`) ตามเดิม
- ต้องรีสตาร์ท dev server หลังแก้ค่า และ build ใหม่เมื่อ deploy
- ปลายทางต้องตอบรูปแบบ `{ weather, zones, updatedAt }` และรับ `POST /api/control/pump` แบบ `{ zone, state }` เหมือนกัน

---

## Layout ของ Dashboard (หน้า Control)

หน้า Control เป็น Single Dashboard มี Container กลาง แบ่งเป็น 4 Sections

| Section | เนื้อหา |
|---|---|
| **A · Environmental Monitoring** | Metric cards 2 แถว: อุณหภูมิ / ความชื้นสัมพัทธ์ / ETo และ ความกดอากาศ / รังสีดวงอาทิตย์ / ความเร็วลม / VPD (สถานะ ปกติ–เตือน, สีและ icon แยกประเภท) |
| **B · Environmental Data Visualization** | กราฟ Time-series เต็มความกว้าง เลือก parameter ได้ 7 ตัว เลือกช่วง 1H / 6H / 24H / 7D และ Hover ดู Tooltip |
| **C · Crop Monitoring** | 2 การ์ดบน (ไม้ยืนต้น, นาข้าว) + 1 การ์ดกว้างด้านล่าง (แปลงดอกไม้) พร้อมภาพพืชและปุ่มเปิด–ปิดปั๊มกลางการ์ด |
| **D · Water Resources & Irrigation** | ระดับน้ำในถังหลัก, สถานะวาล์วรายแปลง และงบน้ำรายวัน |

VPD คำนวณจากสมการ FAO-56

```text
e_s(T) = 0.6108 × exp(17.27T / (T + 237.3))
VPD    = e_s(T) × (1 − RH/100)
```

---

## Firebase Realtime Database (Backend)

ข้อมูลถูกเก็บที่ Firebase Realtime Database ก่อน แล้ว API ของเว็บอ่านมาส่งให้หน้าเว็บแสดงผล

```text
ESP32 / Node-RED ──POST /api/sensors/telemetry──▶ in-memory store
                                                       │
                                                       ├─▶ /agriflow/latest          (snapshot ล่าสุด)
                                                       └─▶ /agriflow/history/<ts>   (จุดข้อมูลย้อนหลัง)

เว็บ ──GET /api/sensors/latest───────────────▶ snapshot ล่าสุด
     └─GET /api/sensors/latest?range=24h────▶ snapshot + history[]
```

**ตั้งค่า** (`.env.local` หรือ Vercel Environment Variables)

```bash
FIREBASE_DATABASE_URL=https://<project>-default-rtdb.<region>.firebasedatabase.app
FIREBASE_DATABASE_SECRET=<database secret>   # ถ้า Rules ไม่ได้เปิดให้อ่าน/เขียน
FIREBASE_DB_ROOT=agriflow                    # ทางเลือก
```

- ใช้ REST API (`fetch`) ไม่ต้องติดตั้ง SDK และไม่ต้องใช้ service account file
- ถ้าไม่ได้ตั้ง `FIREBASE_DATABASE_URL` ระบบจะทำงานด้วย in-memory (หรือ Redis/KV ถ้าตั้งไว้) เหมือนเดิม
- ทุกครั้งที่ telemetry เข้ามา ระบบจะบันทึก snapshot ล่าสุดและจุดข้อมูลย้อนหลัง (รวมค่าที่อยู่ในนาทีเดียวกันเป็นจุดเดียว) เก็บย้อนหลัง 7 วัน
- ทุกครั้งที่เขียนจุดใหม่ ระบบจะลบจุดที่เก่ากว่า 7 วันออกจาก `/agriflow/history` อัตโนมัติ (`pruneHistory` — อ่านด้วย `orderBy="$key"` + `endAt` แล้วลบด้วย `PATCH` ค่า `null`)
- History อ่านด้วย `orderBy="$key"` + `startAt` จึงไม่ต้องเพิ่ม index rule
- หน้าเว็บดึงค่าล่าสุดทุก 10 วินาที และกราฟรีเฟรชทุก 30 วินาที
- แนะนำ Rules สำหรับ prototype:

```json
{
  "rules": {
    "agriflow": {
      ".read": true,
      ".write": true
    }
  }
}
```

> Rules ด้านบนเปิดสาธารณะ เหมาะกับการทดสอบเท่านั้น — production ควรปิด write แล้วให้ backend เป็นผู้เขียนด้วย credential

---

## หมายเหตุ

- ค่าเริ่มต้นถูก seed ไว้ที่ `lib/server/store.ts` เพื่อให้หน้าเว็บแสดงผลได้ทันที
- ข้อมูลอยู่ในหน่วยความจำของ process → **รีสตาร์ท server = กลับไปค่าเริ่มต้น** ถ้าต้องการเก็บถาวรให้เปลี่ยนไปใช้ฐานข้อมูล
- หน้าเว็บดึงค่าใหม่ทุก 10 วินาที ค่าที่ POST เข้าไปจึงจะขึ้นหน้าจอภายในรอบถัดไป
- **ข้อควรระวัง:** ห้ามใส่ MQTT username/password หรือ API key ไว้ใน Frontend ให้ Backend เป็นตัวกลาง และให้ ESP32 มี logic ความปลอดภัย เช่น ปิดปั๊มเมื่อค่าผิดปกติหรือการสื่อสารขาดหาย
