import type {
  WaterTank,
  Weather,
  Zone,
  ZoneId,
  ZoneValues,
} from '../types/iot';

import { ZONE_VALVE_IDS } from '../zoneConfig';

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

// ยังไม่ได้รับค่าจากเซนเซอร์ → null (ไม่แต่งค่าเริ่มต้นขึ้นเอง)
// ค่าที่รับมาจะค้างอยู่จนกว่าจะมีค่าใหม่มาแทน
const initialWeather: Weather = {
  temperatureC: null,
  humidity: null,
  etoMmPerDay: null,
};

const initialWaterTank: WaterTank = {
  levelPercent: null,
};

// ค่าเริ่มต้นของ 5 แปลง (แก้ตัวเลขที่แสดงบนหน้าเว็บได้ที่นี่)
// ค่าในแปลงเว้นว่างไว้ก่อน — จะแสดง "--" จนกว่า Node-RED จะส่งค่าจริงมา
const initialZones: Zone[] = [
  {
    id: 'herb',
    name: 'ไม้ล้มลุก',
    pumpOn: false,
    values: {},
    valveId: ZONE_VALVE_IDS.herb,
  },
  {
    id: 'rice',
    name: 'นาข้าว',
    pumpOn: false,
    values: {},
    valveId: ZONE_VALVE_IDS.rice,
  },
  {
    id: 'sunnhemp',
    name: 'ปอเทือง',
    pumpOn: false,
    values: {},
    valveId: ZONE_VALVE_IDS.sunnhemp,
  },
  {
    id: 'sunflower',
    name: 'ทานตะวัน',
    pumpOn: false,
    values: {},
    valveId: ZONE_VALVE_IDS.sunflower,
  },
  {
    id: 'potted',
    name: 'ไม้กระถาง',
    pumpOn: false,
    values: {},
    valveId: ZONE_VALVE_IDS.potted,
  },
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

  for (const zone of store.zones) {
    if (typeof zone.valveId !== 'number') zone.valveId = ZONE_VALVE_IDS[zone.id];
  }

  return store;
}

/** อัปเดตค่าอากาศ (ส่งเฉพาะค่าที่เปลี่ยน) */
export function updateWeather(patch: Partial<Weather>): Weather {
  const store = getStore();

  // merge เฉพาะฟิลด์ที่ส่งมา → ค่าที่เคยได้รับค้างอยู่จนกว่าจะมีค่าใหม่ทับ
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

/**
 * อัปเดตสถานะวาล์วของแปลง (จาก valveStatus ที่ Node-RED ส่งมา)
 * pumpOn ของแปลงจะอิงวาล์วตัวหลักของแปลงนั้น (zone.valveId)
 */
export function updateZoneValves(
  id: ZoneId,
  valves: Record<string, boolean>
): Zone | undefined {
  const store = getStore();
  const zone = store.zones.find((item) => item.id === id);

  if (!zone) return undefined;

  zone.valves = { ...zone.valves, ...valves };

  const mainValve = String(zone.valveId ?? ZONE_VALVE_IDS[id]);
  const mainState = zone.valves[mainValve];

  if (typeof mainState === 'boolean') {
    zone.pumpOn = mainState;
  }

  store.updatedAt = new Date().toISOString();

  return zone;
}

/** เวลาที่สั่งปั๊มล่าสุดของแต่ละแปลง */
export function getPumpCommandAt(): Partial<Record<ZoneId, number>> {
  return getStore().pumpCommandAt ?? {};
}
