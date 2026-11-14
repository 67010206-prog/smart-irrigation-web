import type {
  WaterTank,
  Weather,
  Zone,
  ZoneId,
  ZoneValues,
} from '../types/iot';

/**
 * ที่เก็บข้อมูลฝั่ง server (in-memory)
 * มีของแค่ 2 อย่าง: ค่าอากาศ + 5 แปลง
 * รีสตาร์ท server = กลับไปค่าเริ่มต้น
 */

interface FarmStore {
  weather: Weather;
  waterTank: WaterTank;
  zones: Zone[];
  updatedAt: string;
  /** เวลาที่สั่งปั๊มล่าสุดของแต่ละแปลง (ใช้กันสถานะจาก Node-RED ย้อนกลับมาทับ) */
  pumpCommandAt: Partial<Record<ZoneId, number>>;
}

// ค่าเริ่มต้นของการ์ดแถวบน
const initialWeather: Weather = {
  temperatureC: 29.5,
  humidity: 70,
  etoMmPerDay: 4.2,
};

// ค่าเริ่มต้นของถังน้ำหลัก (แก้ตัวเลขที่แสดงบนหน้าเว็บได้ที่นี่)
const initialWaterTank: WaterTank = {
  levelPercent: 65,
};

// ค่าเริ่มต้นของ 5 แปลง (แก้ตัวเลขที่แสดงบนหน้าเว็บได้ที่นี่)
const initialZones: Zone[] = [
  { id: 'herb', name: 'ไม้ล้มลุก', pumpOn: false, values: { soilWaterKpa: 32.5 } },
  { id: 'rice', name: 'นาข้าว', pumpOn: false, values: { etoMmPerHour: 0.42 } },
  {
    id: 'sunnhemp',
    name: 'ปอเทือง',
    pumpOn: false,
    values: { soilTempC: 26.8, soilHumidity: 58.5 },
  },
  { id: 'sunflower', name: 'ทานตะวัน', pumpOn: false, values: { soilMoisturePercent: 41 } },
  { id: 'potted', name: 'ไม้กระถาง', pumpOn: false, values: { soilWaterKpa: 18.4 } },
];

// เก็บไว้ที่ globalThis เพื่อไม่ให้ค่าหายตอน Next.js โหลดโมดูลใหม่ (dev)
const globalStore = globalThis as unknown as { farmStore?: FarmStore };

function createStore(): FarmStore {
  return {
    weather: { ...initialWeather },
    waterTank: { ...initialWaterTank },
    zones: initialZones.map((zone) => ({ ...zone, values: { ...zone.values } })),
    updatedAt: new Date().toISOString(),
    pumpCommandAt: {},
  };
}

/** ดึงข้อมูลทั้งหมด (สร้างค่าเริ่มต้นให้ถ้ายังไม่มี) */
export function getStore(): FarmStore {
  if (!globalStore.farmStore) {
    globalStore.farmStore = createStore();
  }

  const store = globalStore.farmStore;

  // กันกรณี store ถูกสร้างจากโค้ดเวอร์ชันก่อนหน้า (dev hot reload) แล้วยังไม่มีฟิลด์ใหม่
  if (!store.waterTank) store.waterTank = { ...initialWaterTank };
  if (!store.pumpCommandAt) store.pumpCommandAt = {};

  return store;
}

/** อัปเดตค่าอากาศ (ส่งเฉพาะค่าที่เปลี่ยน) */
export function updateWeather(patch: Partial<Weather>): Weather {
  const store = getStore();

  store.weather = { ...store.weather, ...patch };
  store.updatedAt = new Date().toISOString();

  return store.weather;
}

/** อัปเดตระดับน้ำในถังหลัก */
export function updateWaterTank(patch: Partial<WaterTank>): WaterTank {
  const store = getStore();

  store.waterTank = { ...store.waterTank, ...patch };
  store.updatedAt = new Date().toISOString();

  return store.waterTank;
}

/** อัปเดตค่าของแปลงตาม id (ส่งเฉพาะค่าที่เปลี่ยน) */
export function updateZoneValues(
  id: ZoneId,
  values: ZoneValues
): Zone | undefined {
  const store = getStore();
  const zone = store.zones.find((item) => item.id === id);

  if (!zone) return undefined;

  zone.values = { ...zone.values, ...values };
  store.updatedAt = new Date().toISOString();

  return zone;
}

/**
 * เปิด–ปิดปั๊มของแปลง
 * source = 'local' คือผู้ใช้สั่งจากหน้าเว็บ (จะบันทึกเวลาไว้กันสถานะเก่าทับ)
 * source = 'remote' คือค่าที่อ่านมาจาก Node-RED
 */
export function setZonePump(
  id: ZoneId,
  on: boolean,
  source: 'local' | 'remote' = 'local'
): Zone | undefined {
  const store = getStore();
  const zone = store.zones.find((item) => item.id === id);

  if (!zone) return undefined;

  if (source === 'local') {
    store.pumpCommandAt[id] = Date.now();
  }

  // ค่าไม่เปลี่ยน = ไม่ต้องขยับ updatedAt (กัน updatedAt ใหม่ทุกครั้งที่ poll)
  if (zone.pumpOn === on) return zone;

  zone.pumpOn = on;
  store.updatedAt = new Date().toISOString();

  return zone;
}

/** เวลาที่สั่งปั๊มล่าสุดของแต่ละแปลง */
export function getPumpCommandAt(): Partial<Record<ZoneId, number>> {
  return getStore().pumpCommandAt ?? {};
}
