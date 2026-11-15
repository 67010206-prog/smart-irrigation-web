import { NextResponse } from 'next/server';

import { logEvent } from '@/lib/server/debugLog';

import {
  getStore,
  reconcileSharedValves,
  setZonePump,
  updatePumpAlert,
  updateWaterTank,
  updateWeather,
  updateZoneValues,
  updateZoneValves,
} from '@/lib/server/store';

import { parsePumpStatus } from '@/lib/server/nodered';
import { persistStore } from '@/lib/server/persistence';

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

/** แปลงค่าเป็น boolean (คืน null ถ้าไม่รู้จัก) */
function toBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;

  if (typeof value === 'string') {
    const text = value.trim().toLowerCase();

    if (['on', 'true', '1', 'open', 'opened'].includes(text)) return true;
    if (['off', 'false', '0', 'close', 'closed'].includes(text)) return false;
  }

  return null;
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

  // ค่าจากสถานีอากาศ (S700) — ส่งมาแบบแบนหรือในก้อน weather ก็ได้
  const pressureHpa = toNumber(body.pressure ?? weatherRecord?.pressureHpa);
  const lightLux = toNumber(body.light ?? weatherRecord?.lightLux);
  const windMs = toNumber(
    body.wind_speed ?? body.windSpeed ?? weatherRecord?.windMs
  );
  const solarRadiationWm2 = toNumber(
    body.solar_radiation ??
      body.solarRadiation ??
      weatherRecord?.solarRadiationWm2
  );

  // ค่าที่อยู่นอกช่วงที่เป็นไปได้จริง → ข้ามเฉพาะค่านั้น (ไม่ล้มทั้ง payload)
  const acceptInRange = (
    value: number | null,
    min: number,
    max: number,
    field: string
  ): number | null => {
    if (value === null) return null;

    if (value < min || value > max) {
      logEvent(
        'telemetry.reject',
        `${field} นอกช่วง (${min}-${max}): ${value}`
      );

      return null;
    }

    return value;
  };

  // สถานี S700 ส่งความกดอากาศเป็น kPa (เช่น 101.27) → แปลงเป็น hPa (1012.7) ถ้าค่าต่ำกว่า 200
  const pressureNormalized =
    pressureHpa === null
      ? null
      : pressureHpa <= 200
        ? Math.round(pressureHpa * 10 * 10) / 10
        : pressureHpa;

  const pressure = acceptInRange(pressureNormalized, 300, 1100, 'pressure');

  // น้ำฝนของวัน (mm) — รับได้หลายชื่อ ใช้ค่านี้คำนวณน้ำฝนใช้การได้
  const rainfall = acceptInRange(
    toNumber(body.rainfallMm ?? body.rainfall ?? body.rain ?? weatherRecord?.rainfallMm),
    0,
    300,
    'rainfall'
  );
  const light = acceptInRange(lightLux, 0, 200000, 'light');
  const wind = acceptInRange(windMs, 0, 100, 'wind_speed');
  const solar = acceptInRange(
    solarRadiationWm2,
    0,
    1500,
    'solar_radiation'
  );

  updateWeather({
    ...(temperature !== null ? { temperatureC: temperature } : {}),
    ...(humidity !== null ? { humidity } : {}),
    ...(etoMmPerDay !== null ? { etoMmPerDay } : {}),
    ...(pressure !== null ? { pressureHpa: pressure } : {}),
    ...(light !== null ? { lightLux: light } : {}),
    ...(wind !== null ? { windMs: wind } : {}),
    ...(solar !== null ? { solarRadiationWm2: solar } : {}),
    ...(rainfall !== null ? { rainfallMm: rainfall } : {}),
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

  // 4) สถานะวาล์วรายตัว (valveStatus) — { zone: { groupId, valves: { "2": true } } }
  const valveStatusRaw =
    body.valveStatus && typeof body.valveStatus === 'object'
      ? (body.valveStatus as Record<string, unknown>)
      : null;

  const valveChanges: Array<{ zone: ZoneId; valves: Record<string, boolean> }> =
    [];

  for (const id of ZONE_IDS) {
    const entry = valveStatusRaw?.[id];

    if (!entry || typeof entry !== 'object') continue;

    const valvesRaw = (entry as Record<string, unknown>).valves;

    if (!valvesRaw || typeof valvesRaw !== 'object') continue;

    const valves: Record<string, boolean> = {};

    for (const [valveKey, rawValue] of Object.entries(
      valvesRaw as Record<string, unknown>
    )) {
      const parsed = toBoolean(rawValue);

      if (parsed !== null) valves[valveKey] = parsed;
    }

    if (Object.keys(valves).length === 0) continue;

    updateZoneValves(id, valves);
    valveChanges.push({ zone: id, valves });
  }

  if (valveChanges.length > 0) {
    logEvent('pump.valve', 'อัปเดตสถานะวาล์วจาก Node-RED', {
      valveChanges,
    });
  }

  // 5) สถานะปั๊มจริงจาก Node-RED (pumpStates / pumpStatus / requests / runningGroups)
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

  // 6) วาล์วที่แปลงใช้ร่วมกัน → การ์ดทุกใบที่แชร์วาล์วต้องขึ้นสถานะเดียวกัน
  const sharedZones = reconcileSharedValves();

  if (sharedZones.length > 0) {
    logEvent('pump.sharedValve', 'รวมสถานะวาล์วที่ใช้ร่วมกัน', {
      zones: sharedZones.map((zone) => ({
        zone: zone.id,
        valveId: zone.valveId,
        on: zone.pumpOn,
      })),
    });
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
    pressureHpa: weather.pressureHpa,
    lightLux: weather.lightLux,
    windMs: weather.windMs,
    solarRadiationWm2: weather.solarRadiationWm2,
    rainfallMm: weather.rainfallMm,
    tankWaterLevel: waterTank.levelPercent,
    zones: zones ? Object.keys(zones) : [],
    valves: valveChanges.length > 0 ? valveChanges : undefined,
  });

  // 6.4) สถานะ "พักรดน้ำรอเติมน้ำ" จาก Pump Logic Engine
  //     { pumpAlert: { pausedGroups: ["group5"], remainingByGroup: { group5: 4680 }, message, waterLevel, resumeThreshold } }
  const alertRaw =
    body.pumpAlert && typeof body.pumpAlert === 'object'
      ? (body.pumpAlert as Record<string, unknown>)
      : body.pumpState && typeof body.pumpState === 'object'
        ? (body.pumpState as Record<string, unknown>)
        : null;

  if (alertRaw) {
    const pausedGroups = Array.isArray(alertRaw.pausedGroups)
      ? alertRaw.pausedGroups.filter(
          (group): group is string => typeof group === 'string'
        )
      : [];

    const remainingByGroup: Record<string, number> = {};

    if (
      alertRaw.remainingByGroup &&
      typeof alertRaw.remainingByGroup === 'object'
    ) {
      for (const [group, value] of Object.entries(
        alertRaw.remainingByGroup as Record<string, unknown>
      )) {
        const seconds = toNumber(value);

        if (seconds !== null && seconds >= 0) {
          remainingByGroup[group] = seconds;
        }
      }
    }

    const remainingList = Object.values(remainingByGroup);
    const remainingSeconds =
      remainingList.length > 0
        ? Math.max(...remainingList)
        : (() => {
            const single = toNumber(alertRaw.remainingSeconds);

            return single !== null && single >= 0 ? single : null;
          })();

    updatePumpAlert({
      active: pausedGroups.length > 0,
      pausedGroups,
      remainingSeconds,
      remainingByGroup,
      message:
        typeof alertRaw.message === 'string' ? alertRaw.message : null,
      waterLevel: toNumber(alertRaw.waterLevel),
      resumeThreshold: toNumber(alertRaw.resumeThreshold),
      at: new Date().toISOString(),
    });

    logEvent('pump.alert', 'อัปเดตสถานะพักรดน้ำรอเติมน้ำ', {
      pausedGroups,
      remainingSeconds,
      waterLevel: toNumber(alertRaw.waterLevel),
    });
  }

  // 6.5) บันทึกค่าล่าสุดลงที่เก็บถาวร (ถ้าตั้งค่าไว้) → cold start ก็ยังมีข้อมูล
  persistStore();

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
