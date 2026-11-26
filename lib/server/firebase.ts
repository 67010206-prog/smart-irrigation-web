import type { HistoryPoint, HistoryRange } from '../types/iot';
import { HISTORY_RETENTION_MS, historyRangeMs } from '../history';

/**
 * Firebase Realtime Database (REST)
 *
 * ใช้ REST แทน SDK → ไม่ต้องเพิ่ม dependency และทำงานได้ทั้ง Node runtime
 * และ serverless ของ Vercel
 *
 * ตัวแปร (ใน .env.local หรือ Vercel Environment Variables) — ไม่ต้องตั้งก็ได้
 *   FIREBASE_DATABASE_URL=https://<project>-default-rtdb.<region>.firebasedatabase.app
 *     (ค่าเริ่มต้น = bae-garden-default-rtdb.asia-southeast1.firebasedatabase.app;
 *      ตั้งเป็นค่าว่างเพื่อปิด Firebase แล้วกลับไปใช้ Redis/in-memory)
 *   FIREBASE_DATABASE_SECRET=<database secret>   (ถ้า Rules ไม่ได้เปิดให้เขียน)
 *   FIREBASE_DB_ROOT=agriflow                    (ทางเลือก)
 *
 * โครงสร้างข้อมูล
 *   /agriflow/latest            snapshot ล่าสุด (weather + zones + tank + pumpAlert)
 *   /agriflow/history/<ts>      จุดข้อมูลย้อนหลัง (คีย์ = epoch ms ของต้นนาที)
 */

/**
 * ค่าเริ่มต้น = Realtime Database ของโปรเจกต์นี้ (Rules เปิดเฉพาะโหนด /agriflow)
 * ไม่ใช่ความลับ — ตั้ง FIREBASE_DATABASE_URL= (ค่าว่าง) เพื่อปิดการใช้ Firebase
 */
const DEFAULT_DATABASE_URL =
  'https://bae-garden-default-rtdb.asia-southeast1.firebasedatabase.app';

const rawUrl = (
  process.env.FIREBASE_DATABASE_URL ??
  process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ??
  DEFAULT_DATABASE_URL
).trim();

const token = (
  process.env.FIREBASE_DATABASE_SECRET ??
  process.env.FIREBASE_ACCESS_TOKEN ??
  ''
).trim();

const rootPath = (process.env.FIREBASE_DB_ROOT ?? 'agriflow').replace(
  /^\/+|\/+$/g,
  ''
);

const baseUrl = rawUrl.replace(/\/+$/, '');
const requestTimeoutMs = 5000;

/** true = ตั้งค่า Firebase Realtime Database ไว้แล้ว */
export const firebaseEnabled = Boolean(baseUrl);

function endpoint(path: string, query: string[] = []): string {
  const clean = path.replace(/^\/+|\/+$/g, '');
  const url = `${baseUrl}/${rootPath}${clean ? `/${clean}` : ''}.json`;
  const parts = [...query];

  // database secret (legacy token) — ถ้า Rules เปิดสาธารณะอยู่แล้วไม่ต้องใส่
  if (token) parts.push(`auth=${encodeURIComponent(token)}`);

  return parts.length > 0 ? `${url}?${parts.join('&')}` : url;
}

async function request<T>(
  method: 'GET' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
  query: string[] = []
): Promise<T | null> {
  if (!baseUrl) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    const response = await fetch(endpoint(path, query), {
      method,
      cache: 'no-store',
      signal: controller.signal,
      ...(body === undefined
        ? {}
        : {
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          }),
    });

    if (!response.ok) return null;
    if (method === 'DELETE') return null;
    // PATCH ที่ลบ child ทั้งหมดจะได้ body เป็น null — ถือว่า ok ถ้า HTTP ผ่าน
    if (method === 'PATCH') return true as unknown as T;

    return (await response.json()) as T;
  } catch {
    // อ่าน/เขียนไม่ได้ = ให้ caller ใช้ in-memory ต่อ (ไม่ทำให้ API ล้ม)
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** เขียน snapshot ล่าสุดทับของเดิม */
export async function writeLatest(snapshot: unknown): Promise<boolean> {
  const result = await request<unknown>('PUT', 'latest', snapshot);

  return result !== null;
}

/** อ่าน snapshot ล่าสุด (null = ยังไม่มีข้อมูล/อ่านไม่ได้) */
export async function readLatest(): Promise<unknown | null> {
  return request<unknown>('GET', 'latest');
}

/** จำนวนจุดสูงสุดที่ดึง/ลบต่อรอบ (กัน payload ใหญ่ตอนเคลียร์ครั้งแรก) */
const PRUNE_BATCH_SIZE = 500;

/**
 * ลบจุดข้อมูลย้อนหลังที่เก่ากว่ากำหนด (ค่าเริ่มต้น = HISTORY_RETENTION_MS, 7 วัน)
 *
 * หมายเหตุ: shallow=true ใช้คู่กับ endAt ไม่ได้ (Firebase ตอบ 400) จึงอ่าน
 * แบบกรองฝั่งเซิร์ฟเวอร์ด้วย orderBy="$key" + endAt แล้วลบด้วย PATCH { "<ts>": null }
 * คืนจำนวนจุดที่ลบ
 */
export async function pruneHistory(
  cutoffMs: number = Date.now() - HISTORY_RETENTION_MS
): Promise<number> {
  const stale = await request<Record<string, unknown>>(
    'GET',
    'history',
    undefined,
    [
      `orderBy=${encodeURIComponent('"$key"')}`,
      `endAt=${encodeURIComponent(`"${cutoffMs}"`)}`,
      `limitToFirst=${PRUNE_BATCH_SIZE}`,
    ]
  );

  if (!stale || typeof stale !== 'object') return 0;

  const keys = Object.keys(stale);

  if (keys.length === 0) return 0;

  const patch: Record<string, null> = {};

  for (const key of keys) patch[key] = null;

  const ok = await request<unknown>('PATCH', 'history', patch);

  return ok === null ? 0 : keys.length;
}

/**
 * บันทึกจุดข้อมูลย้อนหลังหนึ่งจุด (คีย์ = เวลา → จุดเดิมในช่วงเวลาเดียวกันถูกทับ)
 * แล้วลบจุดที่เก่ากว่า 7 วันทิ้ง เพื่อไม่ให้ /history โตไม่จำกัด
 */
export async function writeHistoryPoint(point: HistoryPoint): Promise<boolean> {
  const result = await request<HistoryPoint>(
    'PUT',
    `history/${point.ts}`,
    point
  );

  if (result === null) return false;

  await pruneHistory();

  return true;
}

function isHistoryPoint(value: unknown): value is HistoryPoint {
  if (!value || typeof value !== 'object') return false;

  return typeof (value as HistoryPoint).ts === 'number';
}

/**
 * อ่านข้อมูลย้อนหลังตามช่วงเวลา
 * ใช้ orderBy="$key" + startAt → อ่านเฉพาะคีย์ที่ใหม่กว่าจุดเริ่มต้น
 */
export async function readHistory(
  range: HistoryRange
): Promise<HistoryPoint[]> {
  if (!baseUrl) return [];

  const since = Date.now() - historyRangeMs(range);

  const raw = await request<Record<string, unknown>>(
    'GET',
    'history',
    undefined,
    [
      `orderBy=${encodeURIComponent('"$key"')}`,
      `startAt=${encodeURIComponent(`"${since}"`)}`,
    ]
  );

  if (!raw || typeof raw !== 'object') return [];

  return Object.values(raw)
    .filter(isHistoryPoint)
    .map((point) => ({ ...point, ts: Number(point.ts) }))
    .sort((a, b) => a.ts - b.ts);
}
