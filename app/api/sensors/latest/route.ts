import { NextResponse } from 'next/server';

import { getStore } from '@/lib/server/store';

export const dynamic = 'force-dynamic';

/** GET /api/sensors/latest — ค่าล่าสุดของค่าอากาศและ 5 แปลง */
export async function GET() {
  const { weather, zones, updatedAt } = getStore();

  return NextResponse.json(
    { weather, zones, updatedAt },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
