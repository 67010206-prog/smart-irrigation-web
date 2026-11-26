import type {
  HistoryPoint,
  PumpAlert,
  WaterTank,
  Weather,
  Zone,
} from '../types/iot';

import { logEvent } from './debugLog';
import { persistStore } from './persistence';
import { appendHistoryPoint, exportSnapshot, importSnapshot } from './store';

/**
 * ดึง snapshot จาก API ต้นทาง (ค่าเริ่มต้น = deployment ที่รับ telemetry จาก Node-RED)
 * มาเก็บที่ Firebase ก่อน แล้วหน้าเว็บอ่านค่าจาก Firebase
 *
 * เหตุผล: เซนเซอร์แต่ละตัวส่งค่าไม่พร้อมกัน บางรอบค่าบางตัวยังเป็น null
 * → ใช้ค่าล่าสุดที่เคยได้รับแทนช่องว่าง เพื่อไม่ให้การ์ด/กราฟขาดค่าทุกครั้ง
 * ที่เซนเซอร์ตัวหนึ่งยังไม่ส่ง (ค่าที่หายจะไม่ถูกเขียนทับด้วย null)
 *
 * ตั้งค่า
 *   AGRIFLOW_SOURCE_URL=https://smart-irrigation-web-beta.vercel.app
 *   AGRIFLOW_SOURCE_SYNC_MS=60000            (อย่างน้อย 5000)
 *   AGRIFLOW_SOURCE_URL= (ค่าว่าง)            → ปิดการดึงข้อมูล
 */

const DEFAULT_SOURCE_URL = 'https://smart-irrigation-web-beta.vercel.app';

const rawSourceUrl = process.env.AGRIFLOW_SOURCE_URL;

const sourceBase = (
  rawSourceUrl === undefined ? DEFAULT_SOURCE_URL : rawSourceUrl
)
  .trim()
  .replace(/\/+$/, '');

const syncIntervalMs = Math.max(
  5000,
  Number(process.env.AGRIFLOW_SOURCE_SYNC_MS ?? 60000) || 60000
);

const requestTimeoutMs = 4000;

/** true = เปิดการดึงข้อมูลจาก API ต้นทาง */
export const remoteSourceEnabled = sourceBase.length > 0;

const WEATHER_KEYS = [
  'temperatureC',
  'humidity',
  'etoMmPerDay',
  'pressureHpa',
  'lightLux',
  'windMs',
  'solarRadiationWm2',
  'rainfallMm',
] as const;

const ZONE_VALUE_KEYS = [
  'soilWaterKpa',
  'etoMmPerHour',
  'soilTempC',
  'soilHumidity',
  'soilMoisturePercent',
] as const;

interface RemoteLatest {
  weather?: unknown;
  waterTank?: unknown;
  tankWaterLevelPercent?: unknown;
  zones?: unknown;
  pumpAlert?: unknown;
  updatedAt?: unknown;
}

let lastSyncAt = 0;
let inFlight: Promise<boolean> | null = null;
let lastError: string | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * รวมค่าจาก API ต้นทางเข้ากับ snapshot ปัจจุบัน
 * - ค่าที่เป็นตัวเลขจากต้นทางชนะ
 * - ค่าที่ต้นทางไม่ส่ง (null/undefined) คงค่าล่าสุดเดิมไว้
 * - สถานะปั๊ม/วาล์ว (pumpOn, valves, valveIntent) ไม่ถูกแก้จากต้นทาง
 */
function mergeSnapshot(remote: RemoteLatest) {
  const current = exportSnapshot();

  const remoteWeather = isRecord(remote.weather) ? remote.weather : {};
  const weather: Weather = { ...current.weather };

  for (const key of WEATHER_KEYS) {
    const value = finiteNumber(remoteWeather[key]);

    if (value !== null) weather[key] = value;
  }

  const remoteTank = isRecord(remote.waterTank) ? remote.waterTank : {};
  const tankLevel =
    finiteNumber(remoteTank.levelPercent) ??
    finiteNumber(remote.tankWaterLevelPercent);

  const waterTank: WaterTank = {
    ...current.waterTank,
    ...(tankLevel !== null ? { levelPercent: tankLevel } : {}),
  };

  const zones: Zone[] = current.zones;

  if (Array.isArray(remote.zones)) {
    for (const entry of remote.zones) {
      if (!isRecord(entry) || typeof entry.id !== 'string') continue;

      const zone = zones.find((item) => item.id === entry.id);

      if (!zone) continue;

      const values = isRecord(entry.values) ? entry.values : {};

      for (const key of ZONE_VALUE_KEYS) {
        const value = finiteNumber(values[key]);

        if (value !== null) zone.values[key] = value;
      }
    }
  }

  let pumpAlert: PumpAlert | null = current.pumpAlert;

  if (remote.pumpAlert === null) {
    pumpAlert = null;
  } else if (isRecord(remote.pumpAlert)) {
    pumpAlert = {
      ...(current.pumpAlert ?? {}),
      ...remote.pumpAlert,
    } as unknown as PumpAlert;
  }

  const remoteUpdatedAt =
    typeof remote.updatedAt === 'string' &&
    Number.isFinite(Date.parse(remote.updatedAt))
      ? remote.updatedAt
      : new Date().toISOString();

  return {
    ...current,
    savedAt: new Date().toISOString(),
    updatedAt: remoteUpdatedAt,
    weather,
    waterTank,
    zones,
    pumpAlert,
  };
}

/**
 * ดึงค่าล่าสุดจาก API ต้นทาง → เติมช่องว่างด้วยค่าล่าสุด → เขียนลง Firebase
 *
 * เรียกจาก GET /api/sensors/latest (หน้าจอ poll ทุก 10 วินาที) จึงทำงาน
 * ไม่เกิน 1 ครั้งต่อ syncIntervalMs ต่อ instance และข้ามตัวเองถ้า origin ตรงกัน
 * คืน true เมื่อดึงและบันทึกสำเร็จ
 */
export async function syncFromRemoteSource(
  currentOrigin?: string
): Promise<boolean> {
  if (!remoteSourceEnabled) return false;

  // กันเรียกตัวเองวน (ตอน deploy เป็นตัวเดียวกับต้นทาง)
  if (currentOrigin && currentOrigin.replace(/\/+$/, '') === sourceBase) {
    return false;
  }

  if (inFlight) return inFlight;
  if (Date.now() - lastSyncAt < syncIntervalMs) return false;

  lastSyncAt = Date.now();

  inFlight = (async () => {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), requestTimeoutMs);

      let response: Response;

      try {
        response = await fetch(`${sourceBase}/api/sensors/latest`, {
          cache: 'no-store',
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const remote = (await response.json()) as RemoteLatest;

      if (!importSnapshot(mergeSnapshot(remote))) return false;

      // เขียน Firebase ก่อน (latest + จุดย้อนหลัง) แล้วหน้าเว็บจะอ่านค่าที่เติมครบแล้ว
      const point: HistoryPoint = appendHistoryPoint();

      await persistStore(point);

      if (lastError !== null) {
        logEvent('source.sync', 'ดึงข้อมูลจาก API ต้นทางได้อีกครั้ง', {
          source: sourceBase,
        });
        lastError = null;
      }

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      // log เฉพาะตอนที่ยังไม่เคยแจ้ง error นี้ (กัน log ท่วมทุกนาที)
      if (lastError !== message) {
        logEvent('source.sync', 'ดึงข้อมูลจาก API ต้นทางไม่สำเร็จ', {
          source: sourceBase,
          error: message,
        });
        lastError = message;
      }

      return false;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}
