// ===== ชนิดข้อมูลหลักของระบบ AgriFlow =====

/** รหัสของ 5 แปลง (zone) */
export type ZoneId = 'herb' | 'rice' | 'sunnhemp' | 'sunflower' | 'potted';

/** ค่าที่วัดได้ของแปลง — มีเฉพาะค่าที่แปลงนั้นวัดจริง */
export interface ZoneValues {
  soilWaterKpa?: number; // ความชื้นในดิน (kPa)
  etoMmPerHour?: number; // ETo (mm/ชั่วโมง)
  soilTempC?: number; // อุณหภูมิในดิน (°C)
  soilHumidity?: number; // ความชื้นในดิน (%)
  soilMoisturePercent?: number; // ความชื้นในดิน (%)
}

/** ข้อมูลของแปลงหนึ่งแปลง */
export interface Zone {
  id: ZoneId;
  name: string;
  pumpOn: boolean;
  values: ZoneValues;
  /** หมายเลขวาล์วของแปลง (ตาม ZONE_VALVE_IDS) */
  valveId?: number;
  /** สถานะวาล์วแต่ละตัวจาก Node-RED เช่น { "2": true } */
  valves?: Record<string, boolean>;
}

/** สถานะวาล์วของแปลง ตามรูปแบบที่ Node-RED ส่งมา */
export interface ValveStatusEntry {
  groupId: string;
  valves: Record<string, boolean>;
}

/**
 * ค่าอากาศ + ETo (การ์ดแถวบน)
 * null = ยังไม่เคยได้รับค่านี้ — ไม่แต่งค่าขึ้นเอง แล้วค้างค่าล่าสุดไว้จนกว่าจะมีค่าใหม่มา
 */
export interface Weather {
  temperatureC: number | null;
  humidity: number | null;
  etoMmPerDay: number | null;
  /** ความกดอากาศ (hPa) — จากสถานีอากาศ S700 */
  pressureHpa?: number | null;
  /** ความเข้มแสง (lux) */
  lightLux?: number | null;
  /** ความเร็วลม (m/s) ที่ระดับใบพัด */
  windMs?: number | null;
  /** รังสีแสงอาทิตย์ (W/m²) */
  solarRadiationWm2?: number | null;
  /** น้ำฝนของวัน (mm) — ใช้หาน้ำฝนใช้การได้ */
  rainfallMm?: number | null;
}

/** ถังน้ำหลักของระบบ (null = ยังไม่เคยได้รับค่า) */
export interface WaterTank {
  levelPercent: number | null; // ระดับน้ำในถัง (%)
}

/** ข้อมูลที่ GET /api/sensors/latest ตอบกลับ */
export interface FarmSnapshot {
  weather: Weather;
  zones: Zone[];
  waterTank: WaterTank;
  /** สถานะวาล์วแยกตามแปลง */
  valveStatus?: Partial<Record<ZoneId, ValveStatusEntry>>;
  /** สถานะปั๊มตาม group_id */
  pumpStatus?: Record<string, boolean>;
  updatedAt: string;
}

/** body ที่ POST /api/sensors/telemetry รับ (ส่งเฉพาะค่าที่มีก็ได้) */
export interface TelemetryPayload {
  temperature?: number;
  humidity?: number;
  etoMmPerDay?: number;
  pressure?: number;
  light?: number;
  wind_speed?: number;
  solar_radiation?: number;
  zones?: Partial<Record<ZoneId, ZoneValues>>;
}

/** หนึ่งจุดข้อมูลสำหรับกราฟ/ตารางประวัติ */
export interface SensorPoint {
  timestamp: Date;
  time: string;
  temperature: number;
  humidity: number;
  etoMmPerDay: number;
}

/** ประวัติการเปิด–ปิดปั๊มน้ำ */
export interface PumpLog {
  id: number;
  status: 'ON' | 'OFF';
  startedAt: Date;
  stoppedAt: Date | null;
  durationSeconds: number | null;
}

/** หน้าที่แสดงใน Sidebar */
export type PageKey = 'control' | 'docs' | 'storage' | 'debug';
