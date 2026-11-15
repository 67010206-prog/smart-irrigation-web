import type {
  FarmSnapshot,
  TelemetryPayload,
  Zone,
  ZoneId,
} from '../types/iot';

import { ZONE_VALVE_IDS } from '../zoneConfig';

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

/** แปลงที่ยังถือวาล์วนี้อยู่ (ส่งกลับมาตอนสั่งปิดไม่ได้) */
export interface ValveHolder {
  zone: ZoneId;
  name: string;
}

export interface PumpCommandResult {
  ok: boolean;
  /** แปลงที่สถานะเปลี่ยน (รวมแปลงอื่นที่ใช้วาล์วร่วมกัน) */
  zones?: Zone[];
  /** true = ถูกบล็อกเพราะแปลงอื่นยังใช้วาล์วเดียวกันอยู่ */
  blocked?: boolean;
  /** ข้อมูลวาล์วที่ถูกใช้อยู่ */
  conflict?: { valveId: number; heldBy: ValveHolder[] };
  error?: string;
}

/**
 * POST /api/control/pump — เปิด–ปิดปั๊มของแปลง
 * คืนผลลัพธ์พร้อมรายชื่อแปลงที่เปลี่ยน หรือข้อมูลแปลงที่ยังถือวาล์วอยู่
 */
export async function setZonePumpState(
  zone: ZoneId,
  state: boolean
): Promise<PumpCommandResult> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/control/pump`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // ส่ง group/valve ตาม mapping ให้ API ตรวจก่อน forward ไป Node-RED
      body: JSON.stringify({
        zone,
        state,
        command: state ? 'ON' : 'OFF',
        valveId: ZONE_VALVE_IDS[zone],
        source: 'web',
      }),
    });

    const data = (await res.json().catch(() => null)) as {
      error?: string;
      valveId?: number;
      heldBy?: ValveHolder[];
      zone?: Zone | null;
      sharedZones?: Zone[];
    } | null;

    if (res.status === 409 && data?.heldBy?.length) {
      return {
        ok: false,
        blocked: true,
        error: data.error ?? 'ปิดวาล์วไม่ได้ — แปลงอื่นยังใช้งานอยู่',
        conflict: {
          valveId: Number(data.valveId),
          heldBy: data.heldBy,
        },
      };
    }

    if (!res.ok) {
      return { ok: false, error: data?.error ?? `HTTP ${res.status}` };
    }

    const zones = data?.sharedZones?.length
      ? data.sharedZones
      : data?.zone
        ? [data.zone]
        : [];

    return { ok: zones.length > 0, zones };
  } catch (err) {
    console.error('[API Service] Failed to set zone pump:', err);

    return { ok: false, error: 'เชื่อมต่อ server ไม่ได้' };
  }
}
