# จัดกลุ่ม Node-RED — อะไรทำงานร่วมกัน / ควรแยกอย่างไร

> วิเคราะห์จาก flow จริงบน `13.212.181.250:1880` โดยคำนวณ **connected components** (โหนดที่ต่อถึงกันด้วยสาย)
> ผลลัพธ์: **19 กลุ่มการทำงาน** (16 กลุ่มที่มีสายครบ + 2 โหนดลอย + 1 กลุ่ม demo) รวม 90 โหนด

---

## ส่วนที่ 1 — กลุ่มที่ทำงานร่วมกันจริง (ตามสายในปัจจุบัน)

| # | กลุ่ม | โหนด | ทางเข้า | ทางออก |
|---|---|---|---|---|
| 1 | **Sensor → AgriFlow API + กราฟ UI** | 16 | `mqtt in sensors/+/data` | `POST …/api/sensors/telemetry`, ui_chart ×5 |
| 2 | **Tank + Pump Logic + Gauge** | 12 | `mqtt in sensors/node6/water_level`, `mqtt in pump/request/+` | `POST …/api/sensors/telemetry`, ui_gauge, ui_text, mqtt out |
| 3 | **Legacy pump logic (`function 3`)** | 5 | inject ×2 | mqtt out `pump/control/status` |
| 4 | **HTTP `/api/irrigation/control`** | 4 | `http in POST /api/irrigation/control` | mqtt out `sensors/<group_id>/data` |
| 5 | **HTTP `/api/irrigation/pump`** | 4 | `http in POST /api/irrigation/pump` | mqtt out `pump/request/groupX` |
| 6 | **Demo `/users`** | 4 | `http in GET /users` | http response |
| 7–10 | **Inject ทดสอบ pump/request group1–4** | 3 × 4 | inject ×2 ต่อกลุ่ม | mqtt out `pump/request/groupN` |
| 11–14 | **Inject ทดสอบ "Simu http pump 3/4/5"** | 3 × 4 | inject ×2 | http request ไป `/api/irrigation/pump` |
| 15–16 | **Inject ทดสอบ "Simu http / http 2"** | 2 × 2 | inject | http request ไป `/api/irrigation/control` |
| 17 | **Demo file writer (Flow 3)** | 2 | inject | file out |
| 18–19 | **ลอย ไม่ได้ต่อ** | 1 + 1 | – | `function For db`, `postgresql` |

### จุดเชื่อมที่ทำให้แยกยาก (สำคัญ)

**`Pump Logic Engine` [567e194386f82f13]** เป็นโหนดเดียวที่รวม 3 เรื่องไว้ด้วยกัน:

1. รับ **ระดับน้ำ** (`sensors/node6/water_level`) → เก็บใน `context.waterLevel`
2. รับ **คำขอเปิดปั๊ม** (`pump/request/+`) → เก็บใน `context.requests`
3. ปล่อย 4 ขา: Gauge/ถังน้ำ · UI Text · MQTT สั่งปั๊ม · Debug

และ **`mqtt in sensors/+/data` [6a60003c79e4ec40]** ถูกใช้ร่วมกันโดย 2 ปลายทาง (กราฟ UI และ API) → ถ้าจะแยกเป็นคนละ tab ต้องใช้ `link out`/`link in` หรือประกาศ `mqtt in` ซ้ำอีกตัว (MQTT อนุญาตให้มี subscriber หลายตัวที่ topic เดียวกัน)

---

## ส่วนที่ 2 — โครงสร้างที่แนะนำ (แยกเป็น 6 tab)

```
┌──────────────────────────────────────────────────────────────────┐
│ 1: SENSOR → API          mqtt sensors/+/data                     │
│                          → Format Sensor Data for AgriFlow        │
│                          → HTTP POST /api/sensors/telemetry      │
│                          → debug "Debug Agriflow"                │
├──────────────────────────────────────────────────────────────────┤
│ 2: SENSOR → UI           mqtt sensors/+/data (ประกาศซ้ำ)         │
│                          → For chart → change ×5 → ui_chart ×5    │
│                          → debug "debug 4"                       │
├──────────────────────────────────────────────────────────────────┤
│ 3: PUMP CONTROL          http in POST /api/irrigation/pump       │
│                          → http response 200                     │
│                          → For http to mqtt                      │
│                          → mqtt out  pump/request/groupX         │
│                          mqtt in  pump/request/+                 │
│                          → Pump Logic Engine                     │
│                          → mqtt out pump/control/group1..5       │
│                          → ui_text "Pump status"                 │
│                          → debug "debug 1"                       │
├──────────────────────────────────────────────────────────────────┤
│ 4: TANK LEVEL            mqtt sensors/node6/water_level          │
│                          → change → ui_gauge "Tank water level"  │
│                          → Format Tank Level for API             │
│                          → delay (1/5s, drop)                    │
│                          → HTTP POST /api/sensors/telemetry      │
│                          → debug "debug 2"                       │
├──────────────────────────────────────────────────────────────────┤
│ 5: DATABASE              (ตอนนี้ยังไม่ต่อสาย — ต้องต่อก่อน)       │
│                          mqtt sensors/+/data → For db            │
│                          → postgresql INSERT                     │
├──────────────────────────────────────────────────────────────────┤
│ 6: TEST / SIMULATOR      inject Simu http*, pump/request/groupN  │
│                          + function 3 (legacy) — ควรลบทิ้ง         │
└──────────────────────────────────────────────────────────────────┘
```

### รายละเอียดโหนดต่อ tab

**Tab 1 — SENSOR → API**

| โหนด | id |
|---|---|
| mqtt in `sensors/+/data` | `6a60003c79e4ec40` |
| function `Format Sensor Data for AgriFlow` | `d4be94bad7eef153` |
| http request `POST AgriFlow Telemetry API` | `1fadb6876b826d15` |
| debug `Debug Agriflow` | `168a489584b3433f` |

**Tab 2 — SENSOR → UI (Dashboard `/ui`)**

| โหนด | id |
|---|---|
| mqtt in `sensors/+/data` *(ประกาศใหม่)* | `6a60003c79e4ec40` |
| function `For chart` | `6476311df7d50237` |
| change `Group1` | `a81c3e5e83034ba7` |
| change | `bb6ad15af43efbbb` |
| change | `213e4b121366b9f7` |
| change | `930926aad32dc193` |
| change | `fc9c2b26724590e9` |
| ui_chart | `ba4b07ff45628e10` |
| ui_chart | `78c8ebd8435bf8c0` |
| ui_chart | `2c5027fb138c3c6c` |
| ui_chart | `bd04bf0cdb951dd4` |
| ui_chart | `c3fe1429782f6cc6` |
| debug `debug 4` | `390adac0ecc07505` |

**Tab 3 — PUMP CONTROL**

| โหนด | id |
|---|---|
| http in `POST /api/irrigation/pump` | `5c580c5711b325b6` |
| http response | `b82d84aa2e033eed` |
| function `For http to mqtt` | `274071df754d4929` |
| mqtt out *(msg.topic)* | `e381b728ceefb421` |
| mqtt in `pump/request/+` | `cde952d37a9ad1ec` |
| function `Pump Logic Engine` | `567e194386f82f13` |
| mqtt out *(msg.topic)* → `pump/control/groupX` | `e651f5cf86ada64d` |
| ui_text `Pump status` | `d26e6f5d55cb3c89` |
| debug `debug 1` | `356d483870c72f9b` |

**Tab 4 — TANK LEVEL**

| โหนด | id |
|---|---|
| mqtt in `sensors/node6/water_level` | `cbc16e52777a1a12` |
| change (payload = `payload.water_level`) | `3171b551ac69df72` |
| ui_gauge `Tank water level` | `33ecfe77023b14eb` |
| function `Format Tank Level for API` | `4b1b03fdb021095b` |
| delay (rate 1/5s, drop intermediate) | `a62f2549af4678a2` |
| http request `POST …/api/sensors/telemetry` | `07ec7ed800e1834f` |
| debug `debug 2` | `a2e957852075d87c` |

> ⚠️ ตอนนี้ Gauge รับค่าจาก **ขา 1 ของ Pump Logic Engine** ไม่ได้มาจาก `mqtt in node6` โดยตรง
> ถ้าย้ายไป tab นี้ตามลำดับ ให้ต่อ Gauge จาก `change` ที่รับ `mqtt in node6` แทน (ค่าเดียวกัน) หรือใช้ `link out` จาก Pump Logic Engine

**Tab 5 — DATABASE (ยังไม่สมบูรณ์)**

| โหนด | id | สถานะ |
|---|---|---|
| function `For db` | `f7954da6fa5a4682` | ลอย ไม่ได้ต่อ |
| postgresql | `eedea898ef902159` | query เป็น `SELECT * FROM` (ไม่ระบุตาราง) |
| postgresqlConfig | `99959e24d98a60cc` | `localhost:5432` db `sensordb` |

งานที่ต้องทำก่อนใช้งาน: เพิ่ม `mqtt in sensors/+/data` → `For db` → `postgresql` (เปลี่ยนเป็น `INSERT` แบบ parameterized) → และเพิ่มคอลัมน์ `water_level` ถ้าจะเก็บระดับน้ำด้วย

**Tab 6 — TEST / SIMULATOR (ย้ายออกไปให้พ้นสายจริง)**

| กลุ่ม | โหนด |
|---|---|
| `Simu http` / `Simu http 2` | `fa2644dc15d1f516`, `1152e99925ade0d5` → http request `2422d885209fb7bf`, `dbf1cdd431cc932b` |
| `Simu http pump` / `3` / `4` / `5` | `f96f3ad1d34d6846`, `8d84149b0433c420`, `1d5cc0f733a114b4`, `dd42e05f8c272ff4`, `8a6e52f757d2bea2`, `183662dad93c8e61`, `1b7c15dece4f2f77`, `64c0b570861b197d` → http request `8637fdfa3ae1cace`, `1765ca790fb59890`, `3a856516a0d39c42`, `545ce001dfd7aff6` |
| inject `pump/request/group1..4` | `278a35fbadd148a4`, `2be60cb961a2d518`, `d2988afec4a194ad`, `56fe4e6d28e9d79b`, `5df86e6cf137322c`, `d962a8f99d68fd97`, `8616c40ef5f56c5c`, `c328546b3942158f` → mqtt out `9bbc7f819a27d630`, `e716959069aff8df`, `dd2a6c6b61086b76`, `b7d8719f4a5c14d1` |
| **legacy** `function 3` | `6c0517070057e001` + inject `29a4a8be62f8287e`, `299361bd80b194f7` + mqtt out `26056a41098a6309` + debug `b20da238d9abedce` |

**ย้าย `/users` demo** (`http in` `1720b402c3c05fd1`, `file in` `b3a69641579774d8`, `json` `6e45c0025503a45c`, `http response` `3d8b6a167b2191bc`) ไป tab `9-DEMO` แยกเป็นเอกเทศ

---

## ส่วนที่ 3 — อะไร "ต้องอยู่ด้วยกัน" (ห้ามแยก)

| ของคู่กัน | เหตุผล |
|---|---|
| `http in /api/irrigation/pump` + `http response` | ถ้าแยก จะไม่มีอะไรตอบ client → ฝั่งเว็บจะ timeout (Next.js ตอบ 502) |
| `mqtt in pump/request/+` + `Pump Logic Engine` | logic อ่าน `context.requests` จาก topic นี้โดยตรง |
| `Pump Logic Engine` + `mqtt out pump/control/*` | ขา 3 คืน array 5 ข้อความ ต้องมี mqtt out ที่ใช้ `msg.topic` |
| `Format Tank Level for API` + `delay` + `http request` | delay ต้องอยู่ก่อนยิง API เพื่อ rate limit |
| `For db` + `postgresql` | ยังไม่ได้ต่อ — ถ้าแยกไปแล้วต้องต่อสายให้ครบใน tab 5 |

## ของที่ "ไม่ต้องอยู่ด้วยกัน" (แยกได้เลย)

- กราฟ UI (`For chart` + change + ui_chart) — ไม่เกี่ยวกับ API เลย
- inject ทดสอบทั้งหมด — ไม่มีผลกับการทำงานจริง ยกเว้นตอนกดเอง
- `function 3` และ mqtt out `pump/control/status` — เป็น logic ซ้ำซ้อนของ Pump Logic Engine
- `/users` demo และ file writer

---

## ส่วนที่ 4 — ขั้นตอนแยกจริงในหน้า Editor (ทำอย่างปลอดภัย)

1. **สำรองก่อนเสมอ** — เมนู ☰ → Export → ทั้งหมด → ดาวน์โหลด `flows.json`
2. ลากโหนดจัดเป็น **group** ก่อน (Ctrl+A เลือกช่วง → Group) เพื่อทดสอบโดยไม่เปลี่ยนโครงสร้าง
3. แยก tab: เพิ่ม tab ใหม่ แล้ว **copy/paste** โหนดไป (ไม่ต้องตัด) — ตรวจว่าไม่มีสายค้าง (เส้นประ)
4. โหนดที่ถูกใช้ร่วม (เช่น `mqtt in sensors/+/data`) ให้ **ประกาศซ้ำใน tab ใหม่** หรือใช้ `link out`/`link in`
5. กด Deploy แล้วตรวจว่า: `GET /api/sensors/latest` ยังได้ค่าใหม่, กดเปิด/ปิดปั๊มจากหน้าเว็บได้, Gauge ยังขยับ
6. ถ้าผิดพลาด: ☰ → Import → วาง `flows.json` ที่สำรองไว้ → Deploy

> แนะนำตั้งชื่อ tab ให้ตรงกับตัวเลข: `1-Sensor-API`, `2-Sensor-UI`, `3-Pump-Control`, `4-Tank-Level`, `5-Database`, `6-Test`, `9-Demo`
