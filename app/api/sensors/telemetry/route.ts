import { NextResponse } from 'next/server';

import {
  getStore,
  updateWaterTank,
  updateWeather,
  updateZoneValues,
} from '@/lib/server/store';

import type { ZoneId, ZoneValues } from '@/lib/types/iot';

export const dynamic = 'force-dynamic';

const ZONE_IDS: ZoneId[] = [
  'herb',
  'rice',
  'sunnhemp',
  'sunflower',
  'potted',
];

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
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // 1) ค่าอากาศ
  const temperature = toNumber(body.temperature);
  const humidity = toNumber(body.humidity);
  const etoMmPerDay = toNumber(body.etoMmPerDay);

  if (humidity !== null && (humidity < 0 || humidity > 100)) {
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

  // 2) ระดับน้ำในถังหลัก (ส่งได้ทั้ง waterTankPercent และ waterTank.levelPercent)
  const waterTankRecord =
    body.waterTank && typeof body.waterTank === 'object'
      ? (body.waterTank as Record<string, unknown>)
      : null;

  const waterTankPercent = toNumber(
    body.waterTankPercent ?? waterTankRecord?.levelPercent
  );

  if (
    waterTankPercent !== null &&
    (waterTankPercent < 0 || waterTankPercent > 100)
  ) {
    return NextResponse.json(
      { error: 'waterTankPercent ต้องอยู่ระหว่าง 0-100' },
      { status: 400 }
    );
  }

  if (waterTankPercent !== null) {
    updateWaterTank({ levelPercent: waterTankPercent });
  }

  // 3) ค่าของแต่ละแปลง (ไม่ส่งมาก็ได้)
  const zones = body.zones as
    | Partial<Record<ZoneId, Record<string, unknown>>>
    | undefined;

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

  const {
    weather,
    waterTank,
    zones: updatedZones,
    updatedAt,
  } = getStore();

  return NextResponse.json({
    ok: true,
    weather,
    waterTank,
    zones: updatedZones,
    updatedAt,
  });
}
