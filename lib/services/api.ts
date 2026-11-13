import type {
  FarmSnapshot,
  TelemetryPayload,
  ZoneId,
} from '../types/iot';

/**
 * API Client ของหน้าเว็บ
 * ค่าเริ่มต้น = same-origin (/api/...) แต่เปลี่ยนได้ด้วย NEXT_PUBLIC_API_BASE_URL
 */

let customApiBaseUrl = '';

export const setCustomApiBaseUrl = (url: string) => {
  customApiBaseUrl = url.trim().replace(/\/+$/, '');
};

export const getApiBaseUrl = (): string => {
  return customApiBaseUrl || '';
};

/** อ่านค่า base URL จาก env ตอนแอปเริ่มทำงาน */
export const initApiBaseUrl = (): void => {
  setCustomApiBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL ?? '');
};

initApiBaseUrl();

/** GET /api/sensors/latest — ค่าล่าสุดของอากาศและ 5 แปลง */
export async function fetchLatestSensors(): Promise<FarmSnapshot | null> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/sensors/latest`, {
      cache: 'no-store',
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    return (await res.json()) as FarmSnapshot;
  } catch (err) {
    console.warn('[API Service] Failed to fetch latest sensors:', err);
    return null;
  }
}

/** POST /api/sensors/telemetry — ส่งค่าจากอุปกรณ์ */
export async function pushSensorTelemetry(
  payload: TelemetryPayload
): Promise<boolean> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/sensors/telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    return res.ok;
  } catch (err) {
    console.error('[API Service] Failed to push telemetry:', err);
    return false;
  }
}

/** POST /api/control/pump — เปิด–ปิดปั๊มของแปลง */
export async function setZonePumpState(
  zone: ZoneId,
  state: boolean
): Promise<boolean> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/control/pump`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ zone, state, source: 'web' }),
    });

    return res.ok;
  } catch (err) {
    console.error('[API Service] Failed to set zone pump:', err);
    return false;
  }
}
