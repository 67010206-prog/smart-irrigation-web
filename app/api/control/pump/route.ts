import { NextResponse } from 'next/server';

import { getStore, setZonePump } from '@/lib/server/store';
import { ZONE_GROUP_IDS, forwardPumpCommand } from '@/lib/server/nodered';
import { ensureMqttBridge, getMqttStatus } from '@/lib/server/mqttBridge';
import {
  enqueuePumpCommand,
  finishCommand,
} from '@/lib/server/commandQueue';
import { logEvent } from '@/lib/server/debugLog';

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
 * GET /api/control/pump
 * อ่านสถานะปั๊มของทุกแปลง (พร้อม group_id) จาก store ที่อัปเดตด้วย MQTT
 *
 * GET /api/control/pump?zone=herb
 * อ่านเฉพาะแปลงเดียว
 */
export async function GET(request: Request) {
  ensureMqttBridge();

  const { searchParams } = new URL(request.url);
  const zoneParam = searchParams.get('zone');

  if (zoneParam && !ZONE_IDS.includes(zoneParam as ZoneId)) {
    return NextResponse.json(
      { error: 'zone ต้องเป็นหนึ่งใน: herb, rice, sunnhemp, sunflower, potted' },
      { status: 400 }
    );
  }

  const zones = getStore().zones;

  const data = zones.map((zone) => ({
    zone: zone.id,
    name: zone.name,
    group_id: ZONE_GROUP_IDS[zone.id],
    pumpOn: zone.pumpOn,
    state: zone.pumpOn ? 'ON' : 'OFF',
  }));

  const mqtt = getMqttStatus();

  if (zoneParam) {
    const found = data.find((item) => item.zone === zoneParam);

    return NextResponse.json(
      { ok: true, ...found, mqtt },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }

  return NextResponse.json(
    { ok: true, zones: data, mqtt },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

/**
 * POST /api/control/pump
 * เปิด–ปิดปั๊มของแปลง: { "zone": "herb", "state": true }
 *
 * ขั้นตอน: แปลง zone → group_id แล้ว forward ไป Node-RED
 * ถ้า Node-RED ไม่รับคำสั่ง จะไม่เปลี่ยนสถานะใน store (หน้าเว็บจะไม่ขึ้นว่าสำเร็จ)
 */
export async function POST(request: Request) {
  ensureMqttBridge();

  let body: { zone?: unknown; state?: unknown };

  try {
    body = (await request.json()) as { zone?: unknown; state?: unknown };
  } catch {
    logEvent('pump.reject', 'body ไม่ใช่ JSON ที่ถูกต้อง');

    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!ZONE_IDS.includes(body.zone as ZoneId)) {
    logEvent('pump.reject', 'zone ไม่ถูกต้อง', body);

    return NextResponse.json(
      { error: 'zone ต้องเป็นหนึ่งใน: herb, rice, sunnhemp, sunflower, potted' },
      { status: 400 }
    );
  }

  if (typeof body.state !== 'boolean') {
    logEvent('pump.reject', 'state ไม่ใช่ boolean', body);

    return NextResponse.json(
      { error: 'state ต้องเป็น true หรือ false' },
      { status: 400 }
    );
  }

  const zoneId = body.zone as ZoneId;
  const groupId = ZONE_GROUP_IDS[zoneId];

  // ทุกคำสั่งถูกบันทึกในคิวก่อน → ถ้าส่งตรงไม่สำเร็จ Node-RED ยังมารับได้
  const command = enqueuePumpCommand(zoneId, body.state);

  logEvent('pump.command', `สั่ง ${zoneId} = ${body.state ? 'ON' : 'OFF'}`, {
    zone: zoneId,
    state: body.state,
    group_id: groupId,
    commandId: command.commandId,
  });

  const forwarded = await forwardPumpCommand(zoneId, body.state);

  if (!forwarded.ok) {
    logEvent('pump.error', forwarded.error, { zone: zoneId, group_id: groupId });

    // คำสั่งยังค้างอยู่ในคิว (status = pending) ให้ Node-RED มาดึงผ่าน
    // GET /api/control/pump/pending แล้วค่อย ack กลับมา
    return NextResponse.json(
      {
        ok: false,
        error: forwarded.error,
        queued: true,
        command: {
          commandId: command.commandId,
          zone: command.zone,
          group_id: command.group_id,
          state: command.state,
          status: command.status,
        },
        forwarded: { group_id: groupId, request: body.state },
      },
      { status: 502 }
    );
  }

  logEvent('pump.ok', 'Node-RED รับคำสั่งแล้ว', { zone: zoneId, group_id: groupId });

  // ส่งตรงสำเร็จ = ไม่ต้องให้ Node-RED ดึงซ้ำ
  finishCommand(command.commandId, 'done', 'ส่งตรงไป Node-RED สำเร็จ');

  const zone = setZonePump(zoneId, body.state, 'local');

  return NextResponse.json({
    ok: true,
    zone,
    command: {
      commandId: command.commandId,
      zone: command.zone,
      group_id: command.group_id,
      state: command.state,
      status: 'done' as const,
    },
    forwarded: { group_id: groupId, request: body.state },
  });
}
