# Pump API — Website ↔ Node-RED

สรุปสัญญาการสื่อสารฝั่งเว็บ (Next.js) สำหรับให้ Node-RED ต่อได้โดยไม่ต้องแก้ API เดิม
ทุกเส้นทางอยู่บนโดเมนเดียวกับหน้าเว็บ และตอบ `Cache-Control: no-store`

| Method | Endpoint | ใครเรียก | หน้าที่ |
|---|---|---|---|
| GET | `/api/sensors/latest` | Website | อ่านค่าล่าสุด + `pumpStatus` |
| POST | `/api/sensors/telemetry` | Node-RED | ส่งระดับน้ำ + สถานะปั๊มกลับมา |
| POST | `/api/control/pump` | Website | สั่งปั๊ม (เข้าคิว + ส่งตรง) |
| GET | `/api/control/pump/pending` | Node-RED | ดึงคำสั่งที่ยังไม่ได้ทำ |
| POST | `/api/control/pump/ack` | Node-RED | แจ้งผลหลังทำคำสั่ง |

## 1. Website สั่งปั๊ม

```http
POST /api/control/pump
Content-Type: application/json

{ "zone": "herb", "state": true }
```

zone → group: `sunflower→group1`, `herb→group2`, `sunnhemp→group3`, `potted→group4`, `rice→group5`

ตอบกลับ (สำเร็จ):

```json
{
  "ok": true,
  "zone": { "id": "herb", "pumpOn": true, "...": "..." },
  "command": { "commandId": "cmd_2e53758b", "zone": "herb", "group_id": "group2", "state": true, "status": "done" },
  "forwarded": { "group_id": "group2", "request": true }
}
```

ตอบกลับ (ส่งตรงไม่สำเร็จ — คำสั่งยังรออยู่ให้ Node-RED มา polling):

```json
{
  "ok": false,
  "error": "ส่งคำสั่งไป Node-RED ไม่สำเร็จ: fetch failed",
  "queued": true,
  "command": { "commandId": "cmd_ebc9220d", "status": "pending", "...": "..." }
}
```

สถานะ HTTP = `502` แต่ **ไม่บันทึกว่าเปิด/ปิดในหน้าเว็บ** จนกว่า Node-RED จะทำจริง

## 2. Node-RED ดึงคำสั่ง

```http
GET /api/control/pump/pending
```

```json
{
  "ok": true,
  "commands": [
    { "commandId": "cmd_ebc9220d", "zone": "herb", "group_id": "group2", "state": true, "createdAt": "2026-11-14T16:22:53.263Z" }
  ]
}
```

- ดึงได้ครั้งละไม่เกิน 5 คำสั่ง
- คำสั่งที่ดึงไปแล้วจะไม่ถูกส่งซ้ำจนครบ **8 วินาที** (สูงสุด 3 ครั้ง แล้วหมดอายุ)
- ถ้าไม่มีคำสั่ง ตอบ `{"ok":true,"commands":[]}`

ตัวอย่าง Function แปลงเป็น MQTT (ต่อจาก HTTP Request):

```js
const cmd = msg.payload.commands?.[0];
if (!cmd) return null;

msg.topic = 'pump/request/' + cmd.group_id;
msg.payload = cmd.state;
msg.commandId = cmd.commandId;
return msg;
```

## 3. Node-RED แจ้งผล (ack)

```http
POST /api/control/pump/ack
Content-Type: application/json

{ "commandId": "cmd_ebc9220d", "ok": true }
```

- `ok: true` → ปิดคำสั่งเป็น `done` และเว็บใช้ค่านี้เป็นสถานะปั๊มล่าสุด
- `ok: false` + `error` → ปิดคำสั่งเป็น `failed` (ไม่แตะสถานะปั๊ม)
- ไม่พบ commandId → `404`, body ผิด → `400`

## 4. Node-RED รายงานสถานะ + ระดับน้ำ

```http
POST /api/sensors/telemetry
Content-Type: application/json

{
  "waterTank": { "levelPercent": 75 },
  "pumpStatus": {
    "group1": false, "group2": true, "group3": false, "group4": false, "group5": false
  }
}
```

รับได้หลายชื่อ (เรียงตามที่ใช้จริง):

| ข้อมูล | ชื่อที่รับ |
|---|---|
| ระดับน้ำ | `tankWaterLevelPercent`, `tankWaterLevel`, `waterTankPercent`, `waterLevel`, `waterTank.levelPercent` |
| สถานะปั๊ม | `pumpStatus`, `pumpStates`, `requests`, `runningGroups` (กลุ่มที่ไม่อยู่ในลิสต์ = ปิด) |

**สถานะปั๊มจาก Node-RED เป็นฝ่ายถูกเสมอ** — ถ้าส่ง `false` มา เว็บจะยกเลิก ON ที่ผู้ใช้กดไว้
ภายในรอบ poll 10 วินาที (ไม่ค้างสถานะเดิม)

Function ฝั่ง Node-RED สำหรับรวมสถานะ (ต่อจาก `Pump Logic Engine`):

```js
const states = flow.get('pumpStates') || {};

msg.headers = { 'Content-Type': 'application/json' };
msg.payload = {
  waterTank: { levelPercent: Number(msg.payload.water_level ?? 0) },
  pumpStatus: {
    group1: states.group1 === true,
    group2: states.group2 === true,
    group3: states.group3 === true,
    group4: states.group4 === true,
    group5: states.group5 === true
  }
};

return msg;
```

> ต้องยิง telemetry ทุกครั้งที่สถานะปั๊มเปลี่ยน (ไม่ใช่แค่ตอนระดับน้ำเปลี่ยน)
> เพื่อให้เว็บเห็น ON/OFF ล่าสุดเร็วที่สุด

## 5. สถานะฝั่งเว็บ

```http
GET /api/sensors/latest
```

```json
{
  "weather": { "temperatureC": 29.5, "humidity": 70, "etoMmPerDay": 4.2 },
  "tankWaterLevelPercent": 75,
  "tankWaterLevel": 75,
  "waterTank": { "levelPercent": 75 },
  "pumpStatus": { "group1": false, "group2": true, "group3": false, "group4": false, "group5": false },
  "zones": [{ "id": "herb", "pumpOn": true, "...": "..." }],
  "updatedAt": "2026-11-14T16:22:53.263Z"
}
```

## 6. ข้อควรรู้

- คิวคำสั่งอยู่ในหน่วยความจำ (สูงสุด 100 คำสั่ง) — serverless หลาย instance อาจมองไม่เห็นคิวเดียวกัน
- ถ้า Node-RED ยังใช้ HTTP Request ยิง `POST /api/irrigation/pump` ตรงอยู่แล้ว ไม่ต้องทำ polling ก็ได้
  เพราะเว็บปิดคำสั่งเป็น `done` ให้ทันทีที่ส่งตรงสำเร็จ (คำสั่งจะไม่ค้างในคิว)
- ตรวจทุกครั้งที่ `/api/debug/logs` — ชนิด event ที่เกี่ยวกับปั๊ม: `pump.command`, `pump.ok`, `pump.error`,
  `pump.pending`, `pump.ack`, `pump.state`
