import { NextResponse } from 'next/server';

import { logEvent } from '@/lib/server/debugLog';

import {
  getStore,
  setZonePump,
  updateWaterTank,
  updateWeather,
  updateZoneValues,
} from '@/lib/server/store';

import { parsePumpStatus } from '@/lib/server/nodered';

import type { ZoneId, ZoneValues } from '@/lib/types/iot';

export const dynamic = 'force-dynamic';

const ZONE_IDS: ZoneId[] = [
  'herb',
  'rice',
  'sunnhemp',
  'sunflower',
  'potted',
];

/**
 * รวม zones ที่ส่งมาเป็น map { zoneId: values }
 * รองรับ 2 รูปแบบ:
 *  1) object: { "herb": { "soilWaterKpa": 30 } }
 *  2) array : [{ "id": "herb", "values": { "soilWaterKpa": 30 } }]  (แบบ snapshot)
 */
function normalizeZones(
  raw: unknown
): Partial<Record<ZoneId, Record<string, unknown>>> | undefined {
  if (!raw || typeof raw !== 'object') return undefined;

  if (Array.isArray(raw)) {
    const map: Partial<Record<ZoneId, Record<string, unknown>>> = {};

    for (const item of raw) {
      if (!item || typeof item !== 'object') continue;

      const record = item as Record<string, unknown>;
      const id = record.id ?? record.zone ?? record.zoneId;

      if (typeof id !== 'string') continue;

      const values =
        record.values && typeof record.values === 'object'
          ? (record.values as Record<string, unknown>)
          : record;

      map[id as ZoneId] = values;
    }

    return map;
  }

  return raw as Partial<Record<ZoneId, Record<string, unknown>>>;
}

/** แปลงค่าเป็น number (คืน null ถ้าไม่ใช่ตัวเลข) */
function toNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

/**
 * POST /api/sensors/telemetry
 * ตัวอย่าง body:
 * {
 *   "temperature": 29.5,
 *   "humidity": 70,
 *   "etoMmPerDay": 4.2,
 *   "zones": {
 *     "herb": { "soilWaterKpa": 32.5 },
 *     "rice": { "etoMmPerHour": 0.42 },
 *     "sunnhemp": { "soilTempC": 26.8, "soilHumidity": 58.5 },
 *     "sunflower": { "soilMoisturePercent": 41 },
 *     "potted": { "soilWaterKpa": 18.4 }
 *   }
 * }
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    logEvent('telemetry.reject', 'body ไม่ใช่ JSON ที่ถูกต้อง');

    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // log ทุกครั้งที่ Node-RED/ESP32 ยิงเข้ามา (ดูได้ที่ /api/debug/logs)
  logEvent('telemetry.in', 'POST /api/sensors/telemetry', {
    source: request.headers.get('user-agent') ?? '-',
    body,
  });

  // 1) ค่าอากาศ — รับได้ทั้งแบบแบน และแบบก้อน weather (ตาม response ของ /api/sensors/latest)
  const weatherRecord =
    body.weather && typeof body.weather === 'object'
      ? (body.weather as Record<string, unknown>)
      : null;

  const temperature = toNumber(
    body.temperature ?? weatherRecord?.temperatureC
  );
  const humidity = toNumber(body.humidity ?? weatherRecord?.humidity);
  const etoMmPerDay = toNumber(
    body.etoMmPerDay ?? weatherRecord?.etoMmPerDay
  );

  if (humidity !== null && (humidity < 0 || humidity > 100)) {
    logEvent('telemetry.reject', `humidity นอกช่วง: ${humidity}`);

    return NextResponse.json(
      { error: 'humidity ต้องอยู่ระหว่าง 0-100' },
      { status: 400 }
    );
  }

  updateWeather({
    ...(temperature !== null ? { temperatureC: temperature } : {}),
    ...(humidity !== null ? { humidity } : {}),
    ...(etoMmPerDay !== null ? { etoMmPerDay } : {}),
  });

  // 2) ระดับน้ำในถังหลัก
  // รับได้หลายชื่อ: tankWaterLevelPercent (สเปก Node-RED ล่าสุด), tankWaterLevel,
  // waterTankPercent และ waterTank.levelPercent
  const waterTankRecord =
    body.waterTank && typeof body.waterTank === 'object'
      ? (body.waterTank as Record<string, unknown>)
      : null;

  const waterTankPercent = toNumber(
    body.tankWaterLevelPercent ??
      body.tankWaterLevel ??
      body.waterTankPercent ??
      // payload สถานะของ flow Node-RED ใช้ชื่อ waterLevel
      body.waterLevel ??
      waterTankRecord?.levelPercent
  );

  if (
    waterTankPercent !== null &&
    (waterTankPercent < 0 || waterTankPercent > 100)
  ) {
    logEvent('telemetry.reject', `tankWaterLevel นอกช่วง: ${waterTankPercent}`);

    return NextResponse.json(
      {
        error:
          'tankWaterLevelPercent ต้องอยู่ระหว่าง 0-100 (รับ tankWaterLevel / waterTankPercent ได้ด้วย)',
      },
      { status: 400 }
    );
  }

  if (waterTankPercent !== null) {
    updateWaterTank({ levelPercent: waterTankPercent });
  }

  // 3) ค่าของแต่ละแปลง (ไม่ส่งมาก็ได้ — รับได้ทั้ง object และ array)
  const zones = normalizeZones(body.zones);

  for (const id of ZONE_IDS) {
    const received = zones?.[id];

    if (!received) continue;

    const values: ZoneValues = {};

    const soilWaterKpa = toNumber(received.soilWaterKpa);
    if (soilWaterKpa !== null) values.soilWaterKpa = soilWaterKpa;

    const etoMmPerHour = toNumber(received.etoMmPerHour);
    if (etoMmPerHour !== null) values.etoMmPerHour = etoMmPerHour;

    const soilTempC = toNumber(received.soilTempC);
    if (soilTempC !== null) values.soilTempC = soilTempC;

    const soilHumidity = toNumber(received.soilHumidity);
    if (soilHumidity !== null) values.soilHumidity = soilHumidity;

    const soilMoisturePercent = toNumber(received.soilMoisturePercent);
    if (soilMoisturePercent !== null) {
      values.soilMoisturePercent = soilMoisturePercent;
    }

    updateZoneValues(id, values);
  }

  // 4) สถานะปั๊มจริงจาก Node-RED (pumpStates / requests / runningGroups)
  //    Node-RED เป็นฝ่ายถูก: ถ้าส่ง false มา = ยกเลิกสถานะที่กดไว้บนเว็บทันที
  const pumpStates = parsePumpStatus(body);
  const switched: Array<{ zone: ZoneId; on: boolean }> = [];

  for (const [zone, on] of Object.entries(pumpStates) as [ZoneId, boolean][]) {
    const before = getStore().zones.find((item) => item.id === zone)?.pumpOn;

    if (before === on) continue;

    setZonePump(zone, on, 'remote');
    switched.push({ zone, on });
  }

  if (switched.length > 0) {
    logEvent('pump.state', 'ปรับสถานะปั๊มตาม Node-RED', { switched });
  }

  const {
    weather,
    waterTank,
    zones: updatedZones,
    updatedAt,
  } = getStore();

  logEvent('telemetry.applied', 'อัปเดตค่าลง store แล้ว', {
    temperatureC: weather.temperatureC,
    humidity: weather.humidity,
    etoMmPerDay: weather.etoMmPerDay,
    tankWaterLevel: waterTank.levelPercent,
    zones: zones ? Object.keys(zones) : [],
  });

  return NextResponse.json({
    ok: true,
    weather,
    tankWaterLevelPercent: waterTank.levelPercent,
    tankWaterLevel: waterTank.levelPercent,
    waterTank,
    zones: updatedZones,
    updatedAt,
  });
}
