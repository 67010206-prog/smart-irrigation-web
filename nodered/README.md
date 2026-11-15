# Node-RED: Valve Bridge Flow

ไฟล์ `valve-control-flow.json` คือ flow ตัวอย่าง (import ได้ทันที) สำหรับ
**รับคำสั่งที่มี `valve_id`** จากเว็บ และ **รายงาน `valveStatus` กลับ**

## Mapping ที่ใช้ (ตรงกับ node `Map Zone to Valve` ของคุณ)

| sensor group | zone | targetGroup (hardware) | valveId |
|---|---|---|---|
| group2 | herb | group2 | 2 |
| group5 | rice | group3 | 3 |
| group3 | sunnhemp | group4 | 4 |
| group1 | sunflower | group4 | 4 |
| group4 | potted | group4 | 4 |

สถานะจริงมี 3 วาล์ว: group2/valve2, group3/valve3, group4/valve4
→ sunnhemp, sunflower, potted อ่านสถานะร่วมจาก group4/valve4

## วิธีติดตั้ง

1. Node-RED → เมนู ☰ → **Import** → เลือกไฟล์ `valve-control-flow.json` → Import
2. เปิด node **MQTT broker** (ชื่อ `AgriFlow Broker`) ใส่ username/password ของ broker
   `13.212.181.250:1883`
3. แก้ URL ใน 3 node HTTP Request ถ้าโดเมนเว็บไม่ใช่ `https://smart-irrigation-web-beta.vercel.app`
   - `GET /api/control/pump/pending`
   - `POST /api/sensors/telemetry`
   - `POST /api/control/pump/ack`
4. Deploy
5. ฝั่งเว็บ (Vercel → Environment Variables) เปลี่ยน endpoint ที่เว็บยิงตรงมา Node-RED:

   ```
   NODERED_PUMP_URL=http://13.212.181.250:1880/api/irrigation/valve
   ```

   > flow นี้ใช้พาธ `/api/irrigation/valve` เพื่อไม่ชนกับ `/api/irrigation/pump` เดิม
   > ถ้าไม่ตั้ง env นี้ เว็บจะยิงไป `/api/irrigation/pump` (flow เก่า) ซึ่งไม่มี `valve_id`

## ส่วนประกอบของ flow

| ส่วน | อ่าน/เขียน | หน้าที่ |
|---|---|---|
| ① `POST /api/irrigation/valve` | รับ `{group_id, request, valve_id, zone, commandId}` | ตรวจ mapping → เก็บสถานะ → ตอบ 200 → ส่ง MQTT → รายงานสถานะ → ack |
| ② `GET /api/control/pump/pending` (ทุก 1 วิ) | ดึงคำสั่งที่ค้างในเว็บ | ส่ง MQTT `pump/request/<group>` → ack |
| ③ `Format Valve Status` (ทุก 5 วิ) | `flow.valveStates` | POST `valveStatus` + `pumpStatus` ไปเว็บ |

## MQTT ที่ flow นี้ใช้

```
topic: pump/request/<sensor group>      (group1..group5)
payload: { request: true|false, valveId: 2|3|4, targetGroup, zone }
```

Topic นี้คือ topic ที่ node **`Map Zone to Valve`** ของคุณอ่านอยู่แล้ว
(มันจะแปลงเป็น hardware group + valve ต่อให้)

## การเก็บสถานะ

`flow.set('valveStates', { group2: { 2: true }, group4: { 4: false }, ... })`
key ชั้นนอก = hardware group, ชั้นใน = valveId → boolean

ถ้าฮาร์ดแวร์มี topic สถานะจริง (เช่น `pump/control/groupX` หรือ `pump/status/...`)
ให้เพิ่ม node **mqtt in** ต่อเข้าฟังก์ชันที่เขียน `flow.valveStates` แล้วปล่อยให้
`Format Valve Status` ส่งต่อ — สถานะบนเว็บจะตรงกับฮาร์ดแวร์จริง

## ทดสอบเร็ว ๆ

```bash
# 1) สั่งเปิดวาล์ว 2 (herb) ผ่าน flow
curl -X POST http://13.212.181.250:1880/api/irrigation/valve \
  -H "Content-Type: application/json" \
  -d '{"group_id":"group2","request":true,"valve_id":2,"zone":"herb"}'

# 2) ดูว่าเว็บรับสถานะแล้ว
curl https://smart-irrigation-web-beta.vercel.app/api/sensors/latest
# ควรเห็น "valveStatus": { "herb": { "groupId":"group2", "valves": { "2": true } } }

# 3) สั่งปิด
curl -X POST http://13.212.181.250:1880/api/irrigation/valve \
  -H "Content-Type: application/json" \
  -d '{"group_id":"group2","request":false,"valve_id":2,"zone":"herb"}'
```
