import { NextResponse } from 'next/server';

import { setZonePump } from '@/lib/server/store';

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

  const zone = setZonePump(body.zone as ZoneId, body.state);

  return NextResponse.json({ ok: true, zone });
}
