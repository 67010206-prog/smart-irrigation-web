import type { HistoryPoint, HistoryRange } from '../types/iot';

import {
  exportSnapshot,
  getStore,
  hasLiveData,
  importSnapshot,
} from './store';
import {
  firebaseEnabled,
  readHistory,
  readLatest,
  writeHistoryPoint,
  writeLatest,
} from './firebase';

/**
 * ที่เก็บข้อมูลถาวร — ลำดับความสำคัญ
 *
 * 1) Firebase Realtime Database (ถ้าตั้งค่า FIREBASE_DATABASE_URL)
 *    - /agriflow/latest          ค่าล่าสุด (ทุก instance อ่านค่าเดียวกัน)
 *    - /agriflow/history/<ts>    ข้อมูลย้อนหลังสำหรับกราฟ
 * 2) Vercel KV / Upstash Redis (ของเดิม — ยังใช้ได้ถ้าตั้งค่าไว้)
 * 3) in-memory (ค่าเริ่มต้น, ค่าหายเมื่อ cold start)
 */

const rawUrl =
  process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL ?? '';
const token =
  process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN ?? '';

const baseUrl = rawUrl.replace(/\/+$/, '');
const stateKey = process.env.AGRIFLOW_STATE_KEY ?? 'agriflow:state:v1';

const redisEnabled = Boolean(baseUrl && token);

/** true = มีที่เก็บถาวรพร้อมใช้ (Firebase หรือ Redis) */
export const persistenceEnabled = firebaseEnabled || redisEnabled;

export const persistenceMode = firebaseEnabled
  ? 'firebase'
  : redisEnabled
    ? 'redis'
    : 'memory';

const requestTimeoutMs = 4000;

function redisHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

/**
 * hydrate ครั้งเดียวต่อ process — เรียกก่อนอ่านค่าที่ API
 * คืน true ถ้าโหลด snapshot จากภายนอกสำเร็จ
 */
let hydration: Promise<boolean> | null = null;

export function hydrateStore(): Promise<boolean> {
  if (!persistenceEnabled) return Promise.resolve(false);

  // มีข้อมูลสดอยู่แล้ว (เช่น telemetry เพิ่งยิงเข้ามา) → ไม่ต้องทับด้วยค่าเก่า
  if (hasLiveData()) return Promise.resolve(false);

  if (!hydration) {
    hydration = (async () => {
      try {
        if (firebaseEnabled) {
          const remote = await readLatest();

          if (remote && importSnapshot(remote)) return true;
        }

        if (!redisEnabled) return false;

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), requestTimeoutMs);

        const response = await fetch(
          `${baseUrl}/get/${encodeURIComponent(stateKey)}`,
          {
            headers: redisHeaders(),
            cache: 'no-store',
            signal: controller.signal,
          }
        );

        clearTimeout(timer);

        if (!response.ok) return false;

        const payload = (await response.json()) as { result?: string | null };
        const raw = payload.result;

        if (!raw) return false;

        return importSnapshot(JSON.parse(raw));
      } catch {
        // อ่านไม่ได้ = ทำงานต่อด้วย in-memory (ไม่ทำให้ API ล้ม)
        return false;
      } finally {
        // ปล่อยให้รอบถัดไปลองใหม่ได้ ถ้ารอบนี้ไม่ได้อะไร
        hydration = null;
      }
    })();
  }

  return hydration;
}

// ==============================
// ค่าล่าสุดจาก Firebase (ให้ทุก instance เห็นตรงกัน)
// ==============================

let latestCache: { at: number; value: unknown } | null = null;

async function readRemoteLatest(ttlMs = 2000): Promise<unknown | null> {
  if (!firebaseEnabled) return null;

  if (latestCache && Date.now() - latestCache.at < ttlMs) {
    return latestCache.value;
  }

  const value = await readLatest();

  latestCache = { at: Date.now(), value };

  return value;
}

/**
 * ดึง snapshot ล่าสุดจาก Firebase มาใช้ ถ้าใหม่กว่าค่าในหน่วยความจำ
 * (กันการทับค่าที่เพิ่งสั่งปั๊มจากหน้านี้)
 */
export async function syncFromFirebase(): Promise<boolean> {
  const remote = await readRemoteLatest();

  if (!remote || typeof remote !== 'object') return false;

  const remoteUpdatedAt = (remote as { updatedAt?: unknown }).updatedAt;
  const localUpdatedAt = getStore().updatedAt;

  if (typeof remoteUpdatedAt === 'string') {
    const remoteTime = Date.parse(remoteUpdatedAt);
    const localTime = Date.parse(localUpdatedAt);

    if (
      Number.isFinite(remoteTime) &&
      Number.isFinite(localTime) &&
      remoteTime <= localTime
    ) {
      return false;
    }
  }

  return importSnapshot(remote);
}

/** ข้อมูลย้อนหลังจาก Firebase (null = ไม่ได้ตั้งค่า Firebase) */
export async function readFirebaseHistory(
  range: HistoryRange
): Promise<HistoryPoint[] | null> {
  if (!firebaseEnabled) return null;

  const points = await readHistory(range);

  return points.length > 0 ? points : null;
}

/** เขียน snapshot ล่าสุด + จุดข้อมูลย้อนหลังลงที่เก็บถาวร */
export async function persistStore(point?: HistoryPoint): Promise<void> {
  if (!persistenceEnabled) return;
  if (!hasLiveData()) return;

  if (firebaseEnabled) {
    // เคลียร์ cache เพื่อให้รอบถัดไปอ่านค่าที่เพิ่งเขียน
    latestCache = null;

    await writeLatest(exportSnapshot());

    if (point) await writeHistoryPoint(point);
  }

  if (!redisEnabled) return;

  const body = JSON.stringify(exportSnapshot());

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), requestTimeoutMs);

    await fetch(`${baseUrl}/set/${encodeURIComponent(stateKey)}`, {
      method: 'POST',
      headers: { ...redisHeaders(), 'Content-Type': 'text/plain' },
      body,
      cache: 'no-store',
      signal: controller.signal,
    });

    clearTimeout(timer);
  } catch {
    // เขียนไม่ได้ก็ไม่เป็นไร — ค่ายังอยู่ใน memory ของ instance นี้
  }
}
