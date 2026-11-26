import type { HistoryRange } from './types/iot';

/** ตัวเลือกช่วงเวลาของกราฟ (ใช้ร่วมกันทั้ง API และ UI) */
export const HISTORY_RANGE_OPTIONS: Array<{
  key: HistoryRange;
  label: string;
  ms: number;
}> = [
  { key: '1h', label: '1H', ms: 60 * 60 * 1000 },
  { key: '6h', label: '6H', ms: 6 * 60 * 60 * 1000 },
  { key: '24h', label: '24H', ms: 24 * 60 * 60 * 1000 },
  { key: '7d', label: '7D', ms: 7 * 24 * 60 * 60 * 1000 },
];

/** เก็บข้อมูลย้อนหลังสูงสุด 7 วัน */
export const HISTORY_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

/** รวมค่าที่ส่งเข้ามาในนาทีเดียวกันเป็นจุดเดียว (ลดจำนวนจุดที่ต้องเก็บ) */
export const HISTORY_BUCKET_MS = 60 * 1000;

export function historyRangeMs(range: HistoryRange): number {
  return (
    HISTORY_RANGE_OPTIONS.find((option) => option.key === range)?.ms ??
    HISTORY_RANGE_OPTIONS[2].ms
  );
}

/** อ่านค่า range จาก query string — ค่าที่ไม่รู้จักถือเป็น 24H */
export function normalizeHistoryRange(
  value: string | null | undefined
): HistoryRange {
  const key = (value ?? '').trim().toLowerCase();

  return (
    HISTORY_RANGE_OPTIONS.find((option) => option.key === key)?.key ?? '24h'
  );
}
