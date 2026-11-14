import { NextResponse } from 'next/server';

import { takePendingCommands } from '@/lib/server/commandQueue';
import { logEvent } from '@/lib/server/debugLog';

export const dynamic = 'force-dynamic';

/**
 * GET /api/control/pump/pending
 *
 * ให้ Node-RED มาดึงคำสั่งที่ยังไม่ได้ทำ (poll ทุก 1 วินาที)
 * รูปแบบที่ตอบกลับ:
 * { "ok": true, "commands": [ { "commandId": "cmd_ab12cd34", "zone": "herb",
 *   "group_id": "group2", "state": true, "createdAt": "..." } ] }
 *
 * หลัง Node-RED สั่งงานเสร็จ ให้ POST /api/control/pump/ack { commandId }
 * ถ้าไม่ ack ภายใน 8 วินาที คำสั่งจะถูกส่งซ้ำ (สูงสุด 3 ครั้ง)
 */
export async function GET() {
  const commands = takePendingCommands();

  if (commands.length > 0) {
    logEvent('pump.pending', `Node-RED ดึงคำสั่ง ${commands.length} รายการ`, {
      commands: commands.map((item) => ({
        commandId: item.commandId,
        zone: item.zone,
        group_id: item.group_id,
        state: item.state,
        attempts: item.attempts,
      })),
    });
  }

  return NextResponse.json(
    {
      ok: true,
      commands: commands.map((item) => ({
        commandId: item.commandId,
        zone: item.zone,
        group_id: item.group_id,
        state: item.state,
        createdAt: item.createdAt,
      })),
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
