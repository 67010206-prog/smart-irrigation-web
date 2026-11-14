import type { ZoneId } from '../types/iot';

/**
 * ตัวเชื่อมกับ Node-RED
 * - คำสั่ง: POST { group_id, request }
 * - สถานะ: GET { "group1": "ON", "group2": "OFF", ... }
 */

/** แปลง (zone) → group_id ของ Node-RED */
export const ZONE_GROUP_IDS: Record<ZoneId, string> = {
  herb: 'group2',
  rice: 'group5',
  sunnhemp: 'group3',
  sunflower: 'group1',
  potted: 'group4',
};

/** group_id → แปลง (zone) */
const GROUP_ZONE_IDS: Record<string, ZoneId> = Object.fromEntries(
  (Object.entries(ZONE_GROUP_IDS) as [ZoneId, string][]).map(([zone, group]) => [
    group.toLowerCase(),
    zone,
  ])
);

const DEFAULT_NODE_RED_BASE_URL = 'http://13.212.181.250:1880';

const COMMAND_TIMEOUT_MS = 8000;
const STATUS_TIMEOUT_MS = 2500;

function getNodeRedBaseUrl(): string {
  return (
    process.env.NODERED_BASE_URL?.trim() || DEFAULT_NODE_RED_BASE_URL
  ).replace(/\/+$/, '');
}

/** ปลายทางรับคำสั่งเปิด–ปิดปั๊ม */
export function getNodeRedPumpUrl(): string {
  return (
    process.env.NODERED_PUMP_URL?.trim() ||
    `${getNodeRedBaseUrl()}/api/irrigation/pump`
  ).replace(/\/+$/, '');
}

/** ปลายทางอ่านสถานะปั๊มทุก group */
export function getNodeRedStatusUrl(): string {
  return (
    process.env.NODERED_STATUS_URL?.trim() ||
    `${getNodeRedBaseUrl()}/api/irrigation/status`
  ).replace(/\/+$/, '');
}

/** ส่งคำสั่งไป Node-RED: { "group_id": "group2", "request": true } */
export async function forwardPumpCommand(
  zone: ZoneId,
  state: boolean,
  timeoutMs: number = COMMAND_TIMEOUT_MS
): Promise<{ ok: true } | { ok: false; error: string }> {
  const url = getNodeRedPumpUrl();
  const groupId = ZONE_GROUP_IDS[zone];

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group_id: groupId, request: state }),
      cache: 'no-store',
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!res.ok) {
      return { ok: false, error: `Node-RED ตอบกลับ HTTP ${res.status}` };
    }

    return { ok: true };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);

    console.error('[nodered] forward command failed:', url, reason);

    return { ok: false, error: `ส่งคำสั่งไป Node-RED ไม่สำเร็จ: ${reason}` };
  }
}

/** แปลงค่า ON/OFF (หลายรูปแบบ) เป็น boolean */
function parseOnOff(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;

  if (typeof value === 'number') {
    if (value === 1) return true;
    if (value === 0) return false;
    return null;
  }

  if (typeof value === 'string') {
    const text = value.trim().toLowerCase();

    if (['on', 'true', '1', 'open', 'opened'].includes(text)) return true;
    if (['off', 'false', '0', 'close', 'closed'].includes(text)) return false;
    return null;
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;

    // รองรับ { request: true } / { state: "ON" } / { status: "off" }
    for (const key of ['request', 'state', 'status', 'pumpOn', 'value']) {
      if (key in record) {
        const parsed = parseOnOff(record[key]);
        if (parsed !== null) return parsed;
      }
    }
  }

  return null;
}

/**
 * แปลง payload สถานะจาก Node-RED เป็น map ของแปลง
 * รองรับ { "group1": "ON", ... } และ array [{ group_id, request }]
 */
export function parsePumpStatus(
  payload: unknown
): Partial<Record<ZoneId, boolean>> {
  const result: Partial<Record<ZoneId, boolean>> = {};

  const addEntry = (rawKey: unknown, rawValue: unknown) => {
    if (typeof rawKey !== 'string') return;

    const zone = GROUP_ZONE_IDS[rawKey.trim().toLowerCase()];
    if (!zone) return;

    const parsed = parseOnOff(rawValue);
    if (parsed === null) return;

    result[zone] = parsed;
  };

  if (Array.isArray(payload)) {
    for (const item of payload) {
      if (item && typeof item === 'object') {
        const record = item as Record<string, unknown>;
        const key = record.group_id ?? record.group ?? record.id;

        addEntry(key, record);
      }
    }

    return result;
  }

  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;

    // เผื่อ Node-RED ห่อข้อมูลไว้ใน groups / status
    const container =
      (record.groups as unknown) ??
      (record.status as unknown) ??
      (record.zones as unknown) ??
      record;

    if (Array.isArray(container)) {
      return parsePumpStatus(container);
    }

    if (container && typeof container === 'object') {
      for (const [key, value] of Object.entries(
        container as Record<string, unknown>
      )) {
        addEntry(key, value);
      }
    }
  }

  return result;
}

/** อ่านสถานะปั๊มทุกแปลงจาก Node-RED */
export async function fetchPumpStatus(
  timeoutMs: number = STATUS_TIMEOUT_MS
): Promise<
  | { ok: true; states: Partial<Record<ZoneId, boolean>> }
  | { ok: false; error: string }
> {
  const url = getNodeRedStatusUrl();

  try {
    const res = await fetch(url, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!res.ok) {
      return { ok: false, error: `อ่านสถานะไม่สำเร็จ: HTTP ${res.status}` };
    }

    const states = parsePumpStatus((await res.json()) as unknown);

    return { ok: true, states };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);

    console.warn('[nodered] fetch pump status failed:', url, reason);

    return { ok: false, error: `อ่านสถานะจาก Node-RED ไม่สำเร็จ: ${reason}` };
  }
}
