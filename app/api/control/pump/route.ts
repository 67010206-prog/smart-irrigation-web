import { NextResponse } from 'next/server';

import { setZonePump } from '@/lib/server/store';
import { ZONE_GROUP_IDS, forwardPumpCommand } from '@/lib/server/nodered';

import type { ZoneId } from '@/lib/types/iot';

export const dynamic = 'force-dynamic';

const ZONE_IDS: ZoneId[] = [
  'herb',
  'rice',
  'sunnhemp',
  'sunflower',
  'potted',
];

/**
 * POST /api/control/pump
 * เปิด–ปิดปั๊มของแปลง: { "zone": "herb", "state": true }
 *
 * ขั้นตอน: แปลง zone → group_id แล้ว forward ไป Node-RED
 * ถ้า Node-RED ไม่รับคำสั่ง จะไม่เปลี่ยนสถานะใน store (หน้าเว็บจะไม่ขึ้นว่าสำเร็จ)
 */
export async function POST(request: Request) {
  let body: { zone?: unknown; state?: unknown };

  try {
    body = (await request.json()) as { zone?: unknown; state?: unknown };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!ZONE_IDS.includes(body.zone as ZoneId)) {
    return NextResponse.json(
      { error: 'zone ต้องเป็นหนึ่งใน: herb, rice, sunnhemp, sunflower, potted' },
      { status: 400 }
    );
  }

  if (typeof body.state !== 'boolean') {
    return NextResponse.json(
      { error: 'state ต้องเป็น true หรือ false' },
      { status: 400 }
    );
  }

  const zoneId = body.zone as ZoneId;
  const groupId = ZONE_GROUP_IDS[zoneId];

  const forwarded = await forwardPumpCommand(zoneId, body.state);

  if (!forwarded.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: forwarded.error,
        forwarded: { group_id: groupId, request: body.state },
      },
      { status: 502 }
    );
  }

  const zone = setZonePump(zoneId, body.state, 'local');

  return NextResponse.json({
    ok: true,
    zone,
    forwarded: { group_id: groupId, request: body.state },
  });
}
