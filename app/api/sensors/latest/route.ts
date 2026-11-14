import { NextResponse } from 'next/server';

import { getPumpCommandAt, getStore, setZonePump } from '@/lib/server/store';
import { ZONE_GROUP_IDS, fetchPumpStatus } from '@/lib/server/nodered';
import { ensureMqttBridge } from '@/lib/server/mqttBridge';
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

/** GET /api/sensors/latest — ค่าล่าสุดของค่าอากาศและ 5 แปลง */
export async function GET() {
  // ฟังสถานะปั๊มจริงจาก MQTT (pump/control/groupX) — เริ่มครั้งแรกที่มีคนเรียก API
  ensureMqttBridge();

  await syncPumpStatus();

  const { weather, waterTank, zones, updatedAt } = getStore();

  // สถานะปั๊มแบบ group_id (ตรงกับที่ Node-RED ใช้) สำหรับฝั่งที่อ้าง group เป็นหลัก
  const pumpStatus: Record<string, boolean> = {};

  for (const zone of zones) {
    pumpStatus[ZONE_GROUP_IDS[zone.id]] = zone.pumpOn;
  }

  return NextResponse.json(
    {
      weather,
      // ชื่อตามสเปก Node-RED + ก้อนข้อมูลเต็มของถัง
      tankWaterLevelPercent: waterTank.levelPercent,
      tankWaterLevel: waterTank.levelPercent,
      waterTank,
      pumpStatus,
      zones,
      updatedAt,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
