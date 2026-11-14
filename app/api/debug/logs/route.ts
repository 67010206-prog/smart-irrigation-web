import { NextResponse } from 'next/server';

import { clearDebugEvents, getDebugEvents } from '@/lib/server/debugLog';

export const dynamic = 'force-dynamic';

/**
 * GET /api/debug/logs?limit=50
 * ดู log ล่าสุดที่ API รับเข้ามา (telemetry / คำสั่งปั๊ม / สถานะจาก Node-RED)
 *
 * DELETE /api/debug/logs
 * ล้าง log ทั้งหมด
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get('limit') ?? 50);

  const events = getDebugEvents(Number.isFinite(limit) ? limit : 50);

  return NextResponse.json(
    { count: events.length, events },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function DELETE() {
  clearDebugEvents();

  return NextResponse.json({ ok: true, message: 'ล้าง debug log แล้ว' });
}
