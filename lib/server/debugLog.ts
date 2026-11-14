/**
 * Debug log ฝั่ง server (in-memory ring buffer)
 * ใช้ดูว่ามีอะไรวิ่งเข้ามาที่ API บ้าง โดยไม่ต้องแก้ฝั่ง Node-RED
 * - เก็บล่าสุด MAX_EVENTS รายการ (รีสตาร์ท server = ล้าง)
 * - ดูได้ที่ GET /api/debug/logs และใน terminal ที่รัน server
 */

export interface DebugEvent {
  id: number;
  at: string;
  kind: string;
  message: string;
  data?: unknown;
}

const MAX_EVENTS = 60;
const MAX_JSON_CHARS = 1200;

interface DebugStore {
  seq: number;
  events: DebugEvent[];
}

// เก็บที่ globalThis เพื่อไม่ให้ log หายตอน Next.js โหลดโมดูลใหม่ (dev)
const globalStore = globalThis as unknown as { agriflowDebug?: DebugStore };

function getDebugStore(): DebugStore {
  if (!globalStore.agriflowDebug) {
    globalStore.agriflowDebug = { seq: 0, events: [] };
  }

  return globalStore.agriflowDebug;
}

/** ตัดข้อมูลยาว ๆ ไม่ให้ log บวม */
function trimData(data: unknown): unknown {
  if (data === undefined) return undefined;

  try {
    const json = JSON.stringify(data);

    if (json.length > MAX_JSON_CHARS) {
      return { _truncated: true, _length: json.length, preview: json.slice(0, MAX_JSON_CHARS) };
    }

    return data;
  } catch {
    return { _unserializable: String(data) };
  }
}

/** บันทึก 1 เหตุการณ์ (ลง buffer + console ของ server) */
export function logEvent(kind: string, message: string, data?: unknown): DebugEvent {
  const store = getDebugStore();

  store.seq += 1;

  const event: DebugEvent = {
    id: store.seq,
    at: new Date().toISOString(),
    kind,
    message,
    data: trimData(data),
  };

  store.events.push(event);

  if (store.events.length > MAX_EVENTS) {
    store.events.splice(0, store.events.length - MAX_EVENTS);
  }

  // console นี้จะไปโผล่ใน terminal (dev) หรือ Vercel → Deployments → Logs
  console.log(`[agriflow:${kind}] ${message}`, event.data === undefined ? '' : event.data);

  return event;
}

/** ดึง log ล่าสุด (ใหม่สุดอยู่ท้าย) */
export function getDebugEvents(limit = MAX_EVENTS): DebugEvent[] {
  const store = getDebugStore();
  const size = Math.max(1, Math.min(MAX_EVENTS, Math.trunc(limit) || MAX_EVENTS));

  return store.events.slice(-size);
}

/** ล้าง log */
export function clearDebugEvents(): void {
  const store = getDebugStore();

  store.events = [];
  store.seq = 0;
}
