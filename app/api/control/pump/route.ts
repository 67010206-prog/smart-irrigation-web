import { NextResponse } from 'next/server';

import {
  getStore,
  getValveHolders,
  reconcileSharedValves,
  setValveGroupIntent,
  setZonePump,
} from '@/lib/server/store';
import {
  ZONE_GROUP_IDS,
  ZONE_VALVE_IDS,
  forwardPumpCommand,
  getZoneConfig,
} from '@/lib/server/nodered';
import { ensureMqttBridge, getMqttStatus } from '@/lib/server/mqttBridge';
import { hydrateStore, persistStore } from '@/lib/server/persistence';
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
  // cold start → ค่าสถานะล่าสุดที่เคยบันทึกไว้
  await hydrateStore();

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
    scope?: unknown;
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
  const { valveId } = getZoneConfig(zoneId);

  // scope = "valve" คือสั่งในนามของ “วาล์วทั้งตัว” (UI รวมแปลงที่ใช้ valve ร่วมกันเป็นหน่วยเดียว)
  const valveScope = body.scope === 'valve';

  // ปิดวาล์วที่แปลงอื่นยังใช้อยู่ไม่ได้ — จะตัดน้ำเขาโดยไม่ตั้งใจ
  // (ถ้าสั่งมาในนามของวาล์วทั้งตัว ผู้ใช้ตั้งใจคุมทั้งหน่วยอยู่แล้ว)
  if (state === false && !valveScope) {
    const holders = getValveHolders(zoneId);

    if (holders.length > 0) {
      const heldBy = holders.map((item) => ({ zone: item.id, name: item.name }));
      const names = heldBy.map((item) => item.name).join(', ');

      logEvent(
        'pump.blocked',
        'ปิดวาล์วไม่ได้ — แปลงอื่นยังใช้วาล์วเดียวกัน',
        { zone: zoneId, valve_id: valveId, heldBy }
      );

      return NextResponse.json(
        {
          ok: false,
          blocked: true,
          code: 'VALVE_IN_USE',
          error: `ปิดไม่ได้: วาล์ว ${valveId} ยังถูกใช้โดย ${names}`,
          zone: zoneId,
          valveId,
          heldBy,
        },
        { status: 409 }
      );
    }
  }

  // ทุกคำสั่งถูกบันทึกในคิวก่อน → ถ้าส่งตรงไม่สำเร็จ Node-RED ยังมารับได้
  const command = enqueuePumpCommand(zoneId, state);

  logEvent('pump.command', `สั่ง ${zoneId} = ${state ? 'ON' : 'OFF'}`, {
    zone: zoneId,
    state,
    group_id: groupId,
    valve_id: valveId,
    commandId: command.commandId,
  });

  const forwarded = await forwardPumpCommand(zoneId, state, {
    commandId: command.commandId,
  });

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

  setZonePump(zoneId, state, 'local');

  if (valveScope) {
    setValveGroupIntent(zoneId, state);
  }

  // วาล์วตัวเดียวรดหลายแปลง → การ์ดทุกใบที่แชร์วาล์วขึ้นสถานะตรงกัน
  const sharedZones = reconcileSharedValves();
  const zone = sharedZones.find((item) => item.id === zoneId) ?? null;

  // สถานะหลังสั่งต้องอยู่รอด cold start ด้วย
  persistStore();

  return NextResponse.json({
    ok: true,
    zone,
    sharedZones,
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
