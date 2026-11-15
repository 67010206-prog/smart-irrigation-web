import { NextResponse } from 'next/server';

import { getStore, hasLiveData } from '@/lib/server/store';
import { hydrateStore, persistenceEnabled } from '@/lib/server/persistence';

export const dynamic = 'force-dynamic';

/**
 * GET /api/health — ให้ uptime monitor ยิงเช็คได้ (200 = เว็บทำงาน)
 * แสดงเวลาข้อมูลล่าสุดและสถานะที่เก็บถาวรด้วย
 */
export async function GET() {
  await hydrateStore();

  const { updatedAt } = getStore();

  return NextResponse.json(
    {
      ok: true,
      service: 'agriflow-web',
      hasData: hasLiveData(),
      persistence: persistenceEnabled ? 'redis-rest' : 'memory',
      updatedAt,
      time: new Date().toISOString(),
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
