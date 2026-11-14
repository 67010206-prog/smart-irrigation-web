import { NextResponse } from 'next/server';

import { getPumpCommandAt, getStore, setZonePump } from '@/lib/server/store';
import { fetchPumpStatus } from '@/lib/server/nodered';

import type { ZoneId } from '@/lib/types/iot';

export const dynamic = 'force-dynamic';

/**
 * หลังผู้ใช้สั่งปั๊มเอง กี่ ms ที่จะยังไม่รับสถานะจาก Node-RED
 * (กันกรณีอุปกรณ์ยังไม่สลับรีเลย์ แล้ว poll รอบถัดไปดึงค่าเก่ามาทับ)
 */
const REMOTE_STATUS_GRACE_MS = 20000;

/** อ่านสถานะ ON/OFF จาก Node-RED แล้วปรับ pumpOn ใน store ให้ตรงของจริง */
async function syncPumpStatus(): Promise<void> {
  const result = await fetchPumpStatus();

  if (!result.ok) return;

  const commandAt = getPumpCommandAt();
  const now = Date.now();

  for (const [zone, on] of Object.entries(result.states) as [ZoneId, boolean][]) {
    const lastLocalCommand = commandAt[zone];

    if (lastLocalCommand !== undefined && now - lastLocalCommand < REMOTE_STATUS_GRACE_MS) {
      continue;
    }

    setZonePump(zone, on, 'remote');
  }
}

/** GET /api/sensors/latest — ค่าล่าสุดของค่าอากาศและ 5 แปลง */
export async function GET() {
  await syncPumpStatus();

  const { weather, waterTank, zones, updatedAt } = getStore();

  return NextResponse.json(
    {
      weather,
      // ชื่อหลักตามสเปก Node-RED + ก้อนข้อมูลเต็มของถัง
      tankWaterLevel: waterTank.levelPercent,
      waterTank,
      zones,
      updatedAt,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
