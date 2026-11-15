import { exportSnapshot, hasLiveData, importSnapshot } from './store';

/**
 * เก็บ snapshot ของ store ลง key-value store ภายนอก (Redis แบบ REST)
 * รองรับทั้ง Vercel KV และ Upstash โดยใช้ fetch ล้วน (ไม่ต้องติดตั้ง SDK)
 *
 *   KV_REST_API_URL / KV_REST_API_TOKEN              (Vercel KV)
 *   UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN (Upstash)
 *
 * ถ้าไม่ได้ตั้งค่า → ใช้ in-memory เหมือนเดิม (เว็บยังทำงานปกติ แต่ค่าจะหายตอน cold start)
 */

const rawUrl = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL ?? '';
const token =
  process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN ?? '';

const baseUrl = rawUrl.replace(/\/+$/, '');
const stateKey = process.env.AGRIFLOW_STATE_KEY ?? 'agriflow:state:v1';

/** true = มีที่เก็บถาวรพร้อมใช้ */
export const persistenceEnabled = Boolean(baseUrl && token);

const requestTimeoutMs = 4000;

function headers(): Record<string, string> {
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
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), requestTimeoutMs);

        const response = await fetch(`${baseUrl}/get/${encodeURIComponent(stateKey)}`, {
          headers: headers(),
          cache: 'no-store',
          signal: controller.signal,
        });

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

/** เขียน snapshot ลงที่เก็บถาวร (fire-and-forget — ไม่หน่วง response) */
export function persistStore(): void {
  if (!persistenceEnabled) return;
  if (!hasLiveData()) return;

  const body = JSON.stringify(exportSnapshot());

  void (async () => {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), requestTimeoutMs);

      await fetch(`${baseUrl}/set/${encodeURIComponent(stateKey)}`, {
        method: 'POST',
        headers: { ...headers(), 'Content-Type': 'text/plain' },
        body,
        cache: 'no-store',
        signal: controller.signal,
      });

      clearTimeout(timer);
    } catch {
      // เขียนไม่ได้ก็ไม่เป็นไร — ค่ายังอยู่ใน memory ของ instance นี้
    }
  })();
}
