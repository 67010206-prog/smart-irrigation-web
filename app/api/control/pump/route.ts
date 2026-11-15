import { NextResponse } from 'next/server';

import { getStore, setZonePump } from '@/lib/server/store';
import {
  ZONE_GROUP_IDS,
  ZONE_VALVE_IDS,
  forwardPumpCommand,
  getZoneConfig,
} from '@/lib/server/nodered';
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

  let body: {
    zone?: unknown;
    state?: unknown;
    command?: unknown;
    valveId?: unknown;
  };

  try {
    body = (await request.json()) as typeof body;
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

  // รับได้ทั้ง state: boolean และ command: "ON" | "OFF"
  let state: boolean | null =
    typeof body.state === 'boolean' ? body.state : null;

  if (state === null && typeof body.command === 'string') {
    const command = body.command.trim().toUpperCase();

    if (command === 'ON') state = true;
    if (command === 'OFF') state = false;
  }

  if (state === null) {
    logEvent('pump.reject', 'state/command ไม่ถูกต้อง', body);

    return NextResponse.json(
      { error: 'ต้องส่ง state: true/false หรือ command: "ON"/"OFF"' },
      { status: 400 }
    );
  }

  const zoneId = body.zone as ZoneId;

  // ถ้าส่ง valveId มาด้วย ต้องตรงกับ mapping ไม่งั้นไม่ส่งคำสั่งต่อ (กันสั่งผิดวาล์ว)
  if (body.valveId !== undefined) {
    const expected = ZONE_VALVE_IDS[zoneId];
    const received = Number(body.valveId);

    if (!Number.isFinite(received) || received !== expected) {
      logEvent('pump.reject', 'valveId ไม่ตรงกับ mapping', {
        zone: zoneId,
        received: body.valveId,
        expected,
      });

      return NextResponse.json(
        {
          error: `valveId ของ ${zoneId} ต้องเป็น ${expected}`,
          zone: zoneId,
          expectedValveId: expected,
        },
        { status: 400 }
      );
    }
  }
  const groupId = ZONE_GROUP_IDS[zoneId];

  // ทุกคำสั่งถูกบันทึกในคิวก่อน → ถ้าส่งตรงไม่สำเร็จ Node-RED ยังมารับได้
  const command = enqueuePumpCommand(zoneId, state);
  const { valveId } = getZoneConfig(zoneId);

  logEvent('pump.command', `สั่ง ${zoneId} = ${state ? 'ON' : 'OFF'}`, {
    zone: zoneId,
    state,
    group_id: groupId,
    valve_id: valveId,
    commandId: command.commandId,
  });

  const forwarded = await forwardPumpCommand(zoneId, state);

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
        forwarded: { group_id: groupId, request: state, valve_id: valveId },
      },
      { status: 502 }
    );
  }

  logEvent('pump.ok', 'Node-RED รับคำสั่งแล้ว', { zone: zoneId, group_id: groupId });

  // ส่งตรงสำเร็จ = ไม่ต้องให้ Node-RED ดึงซ้ำ
  finishCommand(command.commandId, 'done', 'ส่งตรงไป Node-RED สำเร็จ');

  const zone = setZonePump(zoneId, state, 'local');

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
    forwarded: { group_id: groupId, request: state, valve_id: valveId },
  });
}
