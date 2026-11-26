import { NextResponse } from 'next/server';

import {
  getHistory,
  getPumpCommandAt,
  getStore,
  setZonePump,
} from '@/lib/server/store';
import {
  ZONE_GROUP_IDS,
  ZONE_VALVE_IDS,
  fetchPumpStatus,
} from '@/lib/server/nodered';
import { ensureMqttBridge } from '@/lib/server/mqttBridge';
import {
  hydrateStore,
  readFirebaseHistory,
  syncFromFirebase,
} from '@/lib/server/persistence';
import { normalizeHistoryRange } from '@/lib/history';
import { logEvent } from '@/lib/server/debugLog';

import type { ZoneId } from '@/lib/types/iot';

export const dynamic = 'force-dynamic';

/**
 * หลังผู้ใช้สั่งปั๊มเอง กี่ ms ที่จะยังไม่รับสถานะ "เปิด" จาก Node-RED
 * (กันกรณีอุปกรณ์ยังไม่สลับรีเลย์ แล้ว poll รอบถัดไปดึงค่าเก่ามาทับ)
 * ส่วนสถานะ "ปิด" จาก Node-RED ใช้ทันทีเสมอ เพราะถือว่า Node-RED เป็นฝ่ายถูก
 */
const REMOTE_STATUS_GRACE_MS = 20000;

// ใช้ log เฉพาะตอนสถานะเปลี่ยน/ตอนอ่านไม่ได้ เพื่อไม่ให้ log ท่วมทุก 10 วินาที
let lastStatusFetchOk: boolean | null = null;

/** อ่านสถานะ ON/OFF จาก Node-RED แล้วปรับ pumpOn ใน store ให้ตรงของจริง */
async function syncPumpStatus(): Promise<void> {
  const result = await fetchPumpStatus();

  if (!result.ok) {
    if (lastStatusFetchOk !== false) {
      logEvent('nodered.status', 'อ่านสถานะจาก Node-RED ไม่ได้', {
        error: result.error,
      });
    }

    lastStatusFetchOk = false;

    return;
  }

  if (lastStatusFetchOk === false) {
    logEvent('nodered.status', 'อ่านสถานะจาก Node-RED ได้ปกติอีกครั้ง');
  }

  lastStatusFetchOk = true;

  const commandAt = getPumpCommandAt();
  const now = Date.now();
  const current = getStore().zones;
  const changes: Array<{ zone: ZoneId; on: boolean }> = [];
  const skipped: ZoneId[] = [];

  for (const [zone, on] of Object.entries(result.states) as [ZoneId, boolean][]) {
    const lastLocalCommand = commandAt[zone];

    // หน่วงเฉพาะข่าว "เปิด" — ข่าว "ปิด" จาก Node-RED ต้องชนะคำสั่งบนเว็บทันที
    if (
      on === true &&
      lastLocalCommand !== undefined &&
      now - lastLocalCommand < REMOTE_STATUS_GRACE_MS
    ) {
      skipped.push(zone);
      continue;
    }

    const before = current.find((item) => item.id === zone)?.pumpOn;

    if (before !== on) {
      setZonePump(zone, on, 'remote');
      changes.push({ zone, on });
    }
  }

  if (changes.length > 0) {
    logEvent('nodered.status', 'ซิงก์สถานะปั๊มจาก Node-RED', {
      states: result.states,
      changes,
      skippedInGrace: skipped.length ? skipped : undefined,
    });
  }
}

/**
 * GET /api/sensors/latest — ค่าล่าสุดของค่าอากาศและ 5 แปลง
 *
 * ?range=1h|6h|24h|7d → แนบข้อมูลย้อนหลังกลับมาด้วย (อ่านจาก Firebase ถ้าตั้งค่าไว้)
 */
export async function GET(request: Request) {
  // cold start → ดึงค่าล่าสุดที่เคยบันทึกไว้กลับมาก่อนตอบ
  await hydrateStore();

  // Firebase เป็นแหล่งข้อมูลกลาง → ให้ทุก instance เห็นค่าล่าสุดตรงกัน
  await syncFromFirebase();

  // ฟังสถานะปั๊มจริงจาก MQTT (pump/control/groupX) — เริ่มครั้งแรกที่มีคนเรียก API
  ensureMqttBridge();

  await syncPumpStatus();

  const params = new URL(request.url).searchParams;
  const rangeParam = params.get('range');
  const range = rangeParam ? normalizeHistoryRange(rangeParam) : null;
  const history = range
    ? ((await readFirebaseHistory(range)) ?? getHistory(range))
    : null;

  const { weather, waterTank, zones, updatedAt, pumpAlert } = getStore();

  // สถานะปั๊มแบบ group_id (ตรงกับที่ Node-RED ใช้) สำหรับฝั่งที่อ้าง group เป็นหลัก
  const pumpStatus: Record<string, boolean> = {};

  // สถานะวาล์วรายตัว: { zone: { groupId, valves: { "2": true } } }
  const valveStatus: Record<
    string,
    { groupId: string; valves: Record<string, boolean> }
  > = {};

  for (const zone of zones) {
    pumpStatus[ZONE_GROUP_IDS[zone.id]] = zone.pumpOn;

    const valveId = String(zone.valveId ?? ZONE_VALVE_IDS[zone.id]);

    valveStatus[zone.id] = {
      groupId: ZONE_GROUP_IDS[zone.id],
      valves: zone.valves ?? { [valveId]: zone.pumpOn },
    };
  }

  return NextResponse.json(
    {
      weather,
      // ชื่อตามสเปก Node-RED + ก้อนข้อมูลเต็มของถัง
      tankWaterLevelPercent: waterTank.levelPercent,
      tankWaterLevel: waterTank.levelPercent,
      waterTank,
      pumpStatus,
      valveStatus,
      // แจ้งเตือนเมื่อปั๊มพักรดน้ำรอเติมน้ำ (null = ไม่มี)
      pumpAlert: pumpAlert ?? null,
      zones,
      ...(range && history ? { historyRange: range, history } : {}),
      updatedAt,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
