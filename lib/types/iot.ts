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
}

/** ค่าอากาศ + ETo (การ์ดแถวบน) */
export interface Weather {
  temperatureC: number;
  humidity: number;
  etoMmPerDay: number;
}

/** ถังน้ำหลักของระบบ */
export interface WaterTank {
  levelPercent: number; // ระดับน้ำในถัง (%)
}

/** ข้อมูลที่ GET /api/sensors/latest ตอบกลับ */
export interface FarmSnapshot {
  weather: Weather;
  zones: Zone[];
  waterTank: WaterTank;
  updatedAt: string;
}

/** body ที่ POST /api/sensors/telemetry รับ (ส่งเฉพาะค่าที่มีก็ได้) */
export interface TelemetryPayload {
  temperature?: number;
  humidity?: number;
  etoMmPerDay?: number;
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
export type PageKey = 'control' | 'docs' | 'storage';
