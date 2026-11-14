import { NextResponse } from 'next/server';

import { finishCommand, findCommand } from '@/lib/server/commandQueue';
import { setZonePump } from '@/lib/server/store';
import { logEvent } from '@/lib/server/debugLog';

export const dynamic = 'force-dynamic';

/**
 * POST /api/control/pump/ack
 * Node-RED แจ้งผลหลังรับ/ทำงานตามคำสั่งแล้ว
 *
 * body: { "commandId": "cmd_ab12cd34", "ok": true, "error": "..." }
 * - ok = true  (ค่าเริ่มต้น) → ปิดคำสั่งเป็น done และอัปเดตสถานะปั๊มในเว็บ
 * - ok = false → ปิดคำสั่งเป็น failed (ไม่แตะสถานะปั๊ม)
 */
export async function POST(request: Request) {
  let body: { commandId?: unknown; ok?: unknown; error?: unknown };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    logEvent('pump.reject', 'ack: body ไม่ใช่ JSON ที่ถูกต้อง');

    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (typeof body.commandId !== 'string' || body.commandId.trim() === '') {
    logEvent('pump.reject', 'ack: ไม่มี commandId');

    return NextResponse.json(
      { error: 'ต้องส่ง commandId เป็น string' },
      { status: 400 }
    );
  }

  const commandId = body.commandId.trim();
  const command = findCommand(commandId);

  if (!command) {
    return NextResponse.json(
      { error: `ไม่พบคำสั่ง ${commandId}` },
      { status: 404 }
    );
  }

  const ok = body.ok !== false;

  if (!ok) {
    const note =
      typeof body.error === 'string' && body.error.trim() !== ''
        ? body.error.trim()
        : 'Node-RED แจ้งว่าทำคำสั่งไม่สำเร็จ';

    finishCommand(commandId, 'failed', note);
    logEvent('pump.ack', `Node-RED ทำคำสั่งไม่สำเร็จ: ${command.zone}`, {
      commandId,
      zone: command.zone,
      group_id: command.group_id,
      error: note,
    });

    return NextResponse.json({
      ok: false,
      command: { commandId, status: 'failed' as const, note },
    });
  }

  finishCommand(commandId, 'done', 'ack จาก Node-RED');

  // Node-RED ทำจริงแล้ว → ใช้ค่านั้นเป็นสถานะล่าสุดของเว็บ
  const zone = setZonePump(command.zone, command.state, 'remote');

  logEvent(
    'pump.ack',
    `Node-RED ack: ${command.zone} = ${command.state ? 'ON' : 'OFF'}`,
    {
      commandId,
      zone: command.zone,
      group_id: command.group_id,
      state: command.state,
    }
  );

  return NextResponse.json({
    ok: true,
    command: { commandId, status: 'done' as const },
    zone,
  });
}
