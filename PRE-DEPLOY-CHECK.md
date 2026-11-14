# Pre-deploy Check — AgriFlow (Smart Irrigation Web)

ตรวจเมื่อ: 14 พ.ย. 2026 · ตรวจบน production build (`next build` + `next start`) ไม่ใช่ dev mode

## สรุปผล

| หัวข้อ | ผล |
|---|---|
| TypeScript (`tsc --noEmit`, strict) | ✅ ผ่าน ไม่มี error |
| Production build | ✅ ผ่าน (`/` 35.8 kB, First Load 123 kB) |
| หน้าเว็บ 4 หน้า (Control / Docs / Data Storage / Debug) | ✅ render ครบ ไม่มี console error |
| API 13 เส้นทาง/เคส | ✅ ถูกต้องตามสเปก |
| Secrets ใน repo | ✅ ไม่พบ (มีแค่ข้อความในเอกสาร) |
| Dependency audit | ⚠️ 2 advisories (critical: next, high: postcss) — แก้ต้องอัปเกรด Next เป็น major |
| สถานะการทำงานจริงกับ Node-RED | ⚠️ สั่งงานได้ แต่ **อ่านสถานะปั๊มยังไม่ได้** (รอ MQTT auth) |
| Persistent storage | ⚠️ ยังเป็น in-memory |
| Git | ⚠️ ยังไม่ commit, `main` behind origin 1 commit, protected branch |

**สรุป: build/deploy ทางเทคนิคได้ แต่ยังไม่ควรใช้ควบคุมปั๊มจริงจนกว่าจะแก้ 3 ข้อในหัวข้อ "ต้องทำก่อน deploy"**

---

## 1. สิ่งที่ทดสอบแล้ว

### 1.1 Build / type
```bash
npx tsc --noEmit      # exit 0
npm run build         # exit 0
```
Route ที่มี: `/`, `/_not-found`, `/api/control/pump`, `/api/debug/logs`, `/api/sensors/latest`, `/api/sensors/telemetry`

### 1.2 หน้าเว็บ (production build)
| หน้า | ผล |
|---|---|
| Control | h1 "ภาพรวมระบบ", การ์ด 5 แปลง, ถังน้ำ `0.65 × 3,000 L = 1,950 L` |
| Docs & Learning | h1 "Docs & Learning", 311 elements |
| Data Storage | h1 "คลังข้อมูลระบบ", 132 elements |
| Debug Log | h1 "Debug Log", แสดง event + filter + payload ได้ |

Network: asset ทุกไฟล์ 200, `/api/sensors/latest` 200 · Console: ไม่มี error

### 1.3 API
| เคส | ผลที่คาด | ผลจริง |
|---|---|---|
| `GET /api/sensors/latest` | 200 + shape ครบ | ✅ `weather, tankWaterLevelPercent, tankWaterLevel, waterTank, zones(5), updatedAt` + `Cache-Control: no-store` |
| `POST telemetry` แบบแบน | 200 | ✅ |
| `POST telemetry` แบบ snapshot (weather + waterTank + zones array) | 200 | ✅ |
| `POST telemetry` JSON ผิด | 400 | ✅ |
| `POST telemetry` humidity 150 | 400 | ✅ |
| `POST telemetry` tank 150 | 400 | ✅ |
| `POST telemetry` zone ไม่รู้จัก + ค่าไม่ใช่ตัวเลข | 200 แต่ไม่บันทึกค่านั้น | ✅ ค่าเดิมไม่เพี้ยน |
| `POST telemetry` body `{}` | 200 | ✅ |
| `GET /api/sensors/telemetry` | 405 | ✅ |
| `GET /api/control/pump` | 200 + mapping group | ✅ herb→group2, rice→group5, sunnhemp→group3, sunflower→group1, potted→group4 |
| `GET /api/control/pump?zone=herb` | 200 | ✅ |
| `GET /api/control/pump?zone=corn` | 400 | ✅ |
| `POST /api/control/pump` state `"on"` | 400 (ไม่ forward) | ✅ |
| `POST /api/control/pump` zone `corn` | 400 | ✅ |
| `GET/DELETE /api/debug/logs` | 200 | ✅ |
| path ที่ไม่มี | 404 | ✅ |

> หมายเหตุ: **ไม่ได้ยิงคำสั่งเปิด/ปิดปั๊มจริง** และไม่ได้ publish MQTT ไปที่ `pump/control/+` เพื่อไม่ให้อุปกรณ์ทำงานผิดพลาด

### 1.4 ข้อบกพร่องที่พบและแก้แล้วระหว่างตรวจ
1. **MQTT error เขียน log ซ้ำทุก 5 วินาที** (broker ปฏิเสธ auth) → **ลบ log ของ MQTT (`mqtt.*`) ออกทั้งหมด** ตามที่ต้องการ และหยุดลองเชื่อมซ้ำเมื่อ auth ผิด; สถานะ/ข้อผิดพลาดยังดูได้จาก `GET /api/control/pump` → `mqtt.lastError` (ตรวจแล้ว: debug log มีแต่ `nodered.status`, `mqtt.lastError` ยังรายงาน "Not authorized")
2. **`tsconfig.tsbuildinfo` ถูก track ใน git** (ไฟล์ build artifact) → เพิ่มใน `.gitignore` + `git rm --cached`
3. (ก่อนหน้านี้) store ที่ค้างจากโค้ดเวอร์ชันก่อนไม่มีฟิลด์ `waterTank` → เติมค่าเริ่มต้นใน `getStore()`

---

## 2. ต้องทำก่อน deploy

### 2.1 Environment variables บน Vercel (Settings → Environment Variables)
| ชื่อ | ค่า | จำเป็น |
|---|---|---|
| `NODERED_PUMP_URL` | `http://13.212.181.250:1880/api/irrigation/pump` | แนะนำ (มีค่า default ในโค้ด) |
| `NODERED_STATUS_URL` | `http://13.212.181.250:1880/api/irrigation/status` | ไม่มีก็ได้ (ตอนนี้ 404) |
| `MQTT_URL` | `mqtt://13.212.181.250:1883` | ถ้าจะอ่านสถานะปั๊ม |
| `MQTT_USERNAME` / `MQTT_PASSWORD` | บัญชี MQTT ของ broker | **จำเป็น** ถ้า broker มี auth (ตอนนี้ยังไม่มี) |
| `NEXT_PUBLIC_API_BASE_URL` | เว้นว่าง (ใช้ same-origin) | ไม่ต้องตั้ง |

> ห้ามใส่ค่าเหล่านี้ในไฟล์ที่ commit — `.env.local` ถูก gitignore ไว้แล้ว

### 2.2 Git
- [ ] commit งานที่ค้าง (22 ไฟล์)
- [ ] `git pull` / rebase กับ `origin/main` (main behind 1 = merge commit ของ PR #1)
- [ ] push เป็น branch ใหม่ + เปิด PR (main เป็น protected branch)
- [ ] merge แล้วให้ Vercel redeploy (โค้ดบน Vercel ตอนนี้ยังเก่ากว่ามาก — ยังไม่รู้จัก `waterTank`)

### 2.3 ก่อนใช้ควบคุมปั๊มจริง
- [ ] ใส่ `MQTT_USERNAME` / `MQTT_PASSWORD` แล้วตรวจ `GET /api/control/pump` → `mqtt.connected: true`
- [ ] เปิด/ปิดปั๊ม 1 แปลงจาก Node-RED แล้วดูว่าเว็บเปลี่ยนสถานะตาม (ภายใน 10 วินาที)

---

## 3. ความเสี่ยงที่ยังเปิดอยู่ (ยอมรับหรือแก้ก่อน)

| # | เรื่อง | ผลกระทบ | ทางแก้ |
|---|---|---|---|
| 1 | **Next.js 14.2.35 มี advisories** (critical: DoS/RSC, RCE บางตัว) `npm audit` แนะนำ Next 16.4.6 | ความเสี่ยงระดับ framework | อัปเกรด Next major (15/16) + React 19 — ต้องทดสอบใหม่ทั้งแอป |
| 2 | **ข้อมูลอยู่ใน memory** (`lib/server/store.ts`) | Vercel cold start/หลาย instance → ค่ากลับเป็น seed, ระดับน้ำหาย | ต่อ Postgres/Supabase หรือ KV |
| 3 | **MQTT บน serverless** | connection ถูกตัดระหว่าง invocation → สถานะไม่ไหล | ใช้ตัวรับ MQTT แยก หรือให้ Node-RED POST สถานะมาเว็บ |
| 4 | **`/api/debug/logs` เปิดสาธารณะ** ไม่มี auth | ใครรู้ URL ก็ดู log ได้ (ข้อมูลเซนเซอร์ + payload) | ใส่ token ผ่าน env หรือปิดบน production |
| 5 | **Node-RED endpoint ไม่มี auth + เป็น HTTP ธรรมดา** | ใครเข้าถึง IP ได้ก็สั่งปั๊มได้; ข้อมูลวิ่งแบบไม่เข้ารหัส | ใส่ API key ฝั่ง Node-RED, ใช้ HTTPS/VPN |
| 6 | **`GET /api/irrigation/status` ยัง 404** | ระบบ sync สถานะผ่าน HTTP ใช้ไม่ได้ (เหลือทาง MQTT) | สร้าง endpoint ฝั่ง Node-RED หรือพึ่ง MQTT |
| 7 | **`In`-memory debug log 60 รายการ** | log หายเมื่อรีสตาร์ท/สลับ instance | ยอมรับได้ถ้าใช้แค่ debug |
| 8 | โฟลเดอร์ `NODERED-SUMMARY.md` / `NODERED-GROUPS.md` มี IP และโครงสร้างระบบ | ข้อมูลภายในถูกเผยใน repo (ถ้า repo เป็น public) | ตรวจสิทธิ์ repo ก่อน push |

### หมายเหตุด้าน security ที่บรรเทาความเสี่ยง Next.js ในตอนนี้
แอปนี้**ไม่มี** `next/image`, Server Actions (`'use server'`), middleware, `rewrites/redirects` และไม่มี `next.config` — advisory หลายตัวจึงไม่ถูกTrigger แต่ **DoS ผ่าน RSC / cache** ยังเกี่ยวข้อง ควรอัปเกรดเมื่อมีเวลา

---

## 4. หลัง deploy ต้องตรวจอะไร

1. `GET https://<โดเมน>/api/sensors/latest` → 200 + `tankWaterLevelPercent` มีค่า
2. เปิดหน้าเว็บ → การ์ด 5 แปลง + ถังน้ำแสดงผล, ไม่มี error ใน console
3. `POST /api/sensors/telemetry {"tankWaterLevelPercent":50}` → หน้าเว็บเปลี่ยนภายใน 10 วินาที
4. หน้า Debug Log → เห็น `telemetry.in` / `pump.command`
5. `POST /api/control/pump {"zone":"potted","state":true}` → 200 + ตรวจที่ Node-RED ว่า `pump/request/group4 = true`
6. เปิดหน้า Debug Log → จะไม่เห็น event ของ MQTT แล้ว (มีแต่ telemetry / pump / nodered.status) ถ้าต้องการดูสถานะ MQTT ให้เรียก `GET /api/control/pump`
