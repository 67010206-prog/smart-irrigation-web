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
  /**
   * "ความตั้งใจ" ล่าสุดของแต่ละแปลงว่าเปิด/ปิดน้ำ
   * แยกจาก pumpOn เพราะแปลงหลายตัวใช้วาล์วเดียวกัน → pumpOn ที่แสดงต้องมาจากการรวม intent
   */
  valveIntent: Partial<Record<ZoneId, boolean>>;
}

// ยังไม่ได้รับค่าจากเซนเซอร์ → null (ไม่แต่งค่าเริ่มต้นขึ้นเอง)
// ค่าที่รับมาจะค้างอยู่จนกว่าจะมีค่าใหม่มาแทน
const initialWeather: Weather = {
  temperatureC: null,
  humidity: null,
  etoMmPerDay: null,
  pressureHpa: null,
  lightLux: null,
  windMs: null,
  solarRadiationWm2: null,
  rainfallMm: null,
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
    valveIntent: {},
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

  // เผื่อ store เก่ายังไม่มีฟิลด์สถานีอากาศที่เพิ่มใหม่
  store.weather = { ...initialWeather, ...store.weather };
  if (!store.pumpCommandAt) store.pumpCommandAt = {};
  if (!store.valveIntent) store.valveIntent = {};

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
 * รวมสถานะวาล์วที่แปลงหลายตัวใช้ร่วมกัน
 * วาล์วตัวเดียวรดได้หลายแปลง → เปิดถ้ามีอย่างน้อย 1 แปลงต้องการน้ำ (intent = true)
 * แล้วเขียนสถานะเดียวกันลงการ์ดทุกใบที่ใช้วาล์วนั้น
 */
export function reconcileSharedValves(): Zone[] {
  const store = getStore();
  const byValve = new Map<string, Zone[]>();

  for (const zone of store.zones) {
    const key = String(zone.valveId ?? ZONE_VALVE_IDS[zone.id]);
    const list = byValve.get(key) ?? [];

    list.push(zone);
    byValve.set(key, list);
  }

  const touched: Zone[] = [];

  for (const [key, group] of byValve) {
    // ยังไม่มีความตั้งใจของใครในวาล์วนี้ → ไม่ต้องคำนวณทับ
    if (!group.some((zone) => store.valveIntent[zone.id] !== undefined)) {
      continue;
    }

    const open = group.some((zone) => store.valveIntent[zone.id] === true);
    let changed = false;

    for (const zone of group) {
      zone.valves = { ...(zone.valves ?? {}), [key]: open };

      if (zone.pumpOn !== open) {
        zone.pumpOn = open;
        changed = true;
      }

      touched.push(zone);
    }

    if (changed) store.updatedAt = new Date().toISOString();
  }

  return touched;
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

  // ความตั้งใจของแปลงนี้คือค่าล่าสุดที่สั่ง/รายงานมา
  store.valveIntent[id] = on;

  // ค่าไม่เปลี่ยน = ไม่ต้องขยับ updatedAt (กัน updatedAt ใหม่ทุกครั้งที่ poll)
  if (zone.pumpOn === on) {
    reconcileSharedValves();

    return zone;
  }

  zone.pumpOn = on;
  store.updatedAt = new Date().toISOString();

  // วาล์วที่ใช้ร่วมกันต้องขึ้นตรงกันทุกใบ
  reconcileSharedValves();

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
    // ใช้เป็นความตั้งใจของแปลงนี้ ไม่ใช่เขียน pumpOn ตรง ๆ
    // (ไม่งั้นแปลงที่ใช้วาล์วร่วมกันจะทับสถานะกันไปมา)
    store.valveIntent[id] = mainState;
  }

  // วาล์วเดียว/วาล์วใช้ร่วม → pumpOn ของทุกแปลงในวาล์วเดียวกันมาจาก intent ชุดเดียวกัน
  reconcileSharedValves();
  store.updatedAt = new Date().toISOString();

  return zone;
}

/** แปลงทุกตัว (รวมตัวเอง) ที่ใช้ valve เดียวกับ zone นี้ */
export function zonesInSameValveGroup(zoneId: ZoneId): Zone[] {
  const store = getStore();
  const zone = store.zones.find((item) => item.id === zoneId);

  if (!zone) return [];

  const valveId = zone.valveId ?? ZONE_VALVE_IDS[zoneId];

  return store.zones.filter(
    (other) => (other.valveId ?? ZONE_VALVE_IDS[other.id]) === valveId
  );
}

/**
 * ตั้งความตั้งใจให้ทุกแปลงที่ใช้ valve เดียวกัน (คำสั่งระดับ “วาล์ว” ไม่ใช่รายแปลง)
 * ใช้เมื่อ UI รวมแปลงที่ใช้วาล์วร่วมกันเป็นหน่วยเดียวแล้ว
 */
export function setValveGroupIntent(zoneId: ZoneId, on: boolean): Zone[] {
  const store = getStore();
  const group = zonesInSameValveGroup(zoneId);

  for (const zone of group) {
    store.valveIntent[zone.id] = on;
  }

  reconcileSharedValves();

  return group;
}

/**
 * แปลงอื่นที่ยังใช้ “วาล์วเดียวกัน” และต้องการน้ำอยู่
 * ใช้บล็อกการปิดวาล์วที่จะตัดน้ำแปลงอื่น
 */
export function getValveHolders(zoneId: ZoneId): Zone[] {
  const store = getStore();
  const zone = store.zones.find((item) => item.id === zoneId);

  if (!zone) return [];

  const valveId = zone.valveId ?? ZONE_VALVE_IDS[zoneId];

  return store.zones.filter((other) => {
    if (other.id === zoneId) return false;

    const otherValve = other.valveId ?? ZONE_VALVE_IDS[other.id];

    if (otherValve !== valveId) return false;

    // ใช้ intent เท่านั้น — pumpOn ที่แสดงถูกรวมมาจากวาล์วเดียวกัน จึงไม่ใช่ “ความต้องการน้ำ” ของแปลงนั้น
    return store.valveIntent[other.id] === true;
  });
}

/** เวลาที่สั่งปั๊มล่าสุดของแต่ละแปลง */
export function getPumpCommandAt(): Partial<Record<ZoneId, number>> {
  return getStore().pumpCommandAt ?? {};
}

/** มีค่าจริงจากเซนเซอร์แล้วหรือยัง (ใช้ตัดสินว่าจะ hydrate/persist ไหม) */
export function hasLiveData(): boolean {
  const store = getStore();

  const weatherHasValue = Object.values(store.weather).some(
    (value) => typeof value === 'number' && Number.isFinite(value)
  );

  const tankHasValue =
    typeof store.waterTank.levelPercent === 'number' &&
    Number.isFinite(store.waterTank.levelPercent);

  const zoneHasValue = store.zones.some(
    (zone) => Object.keys(zone.values ?? {}).length > 0
  );

  return weatherHasValue || tankHasValue || zoneHasValue;
}

/** ก้อนข้อมูลที่บันทึกลงที่เก็บถาวร */
export interface StoreSnapshot {
  version: 1;
  savedAt: string;
  updatedAt: string;
  weather: Weather;
  waterTank: WaterTank;
  zones: Zone[];
  pumpCommandAt: Partial<Record<ZoneId, number>>;
  valveIntent: Partial<Record<ZoneId, boolean>>;
}

/** ดึงก้อนข้อมูลปัจจุบันไปบันทึก */
export function exportSnapshot(): StoreSnapshot {
  const store = getStore();

  return {
    version: 1,
    savedAt: new Date().toISOString(),
    updatedAt: store.updatedAt,
    weather: { ...store.weather },
    waterTank: { ...store.waterTank },
    zones: store.zones.map((zone) => ({
      ...zone,
      values: { ...(zone.values ?? {}) },
      valves: { ...(zone.valves ?? {}) },
    })),
    pumpCommandAt: { ...(store.pumpCommandAt ?? {}) },
    valveIntent: { ...(store.valveIntent ?? {}) },
  };
}

/**
 * คืนค่าจาก snapshot ที่เคยบันทึกไว้ (ใช้ตอน cold start)
 * คืน true ถ้าใช้ snapshot ได้
 */
export function importSnapshot(raw: unknown): boolean {
  if (!raw || typeof raw !== 'object') return false;

  const snapshot = raw as Partial<StoreSnapshot>;

  if (!snapshot.weather || typeof snapshot.weather !== 'object') return false;

  const store = getStore();

  store.weather = { ...initialWeather, ...snapshot.weather };

  if (snapshot.waterTank && typeof snapshot.waterTank === 'object') {
    store.waterTank = { ...initialWaterTank, ...snapshot.waterTank };
  }

  if (Array.isArray(snapshot.zones)) {
    for (const saved of snapshot.zones) {
      const zone = store.zones.find((item) => item.id === saved?.id);

      if (!zone) continue;

      zone.values = { ...(saved.values ?? {}) };
      zone.valves = { ...(saved.valves ?? {}) };

      if (typeof saved.pumpOn === 'boolean') zone.pumpOn = saved.pumpOn;
      if (typeof saved.valveId === 'number') zone.valveId = saved.valveId;
    }
  }

  if (snapshot.pumpCommandAt && typeof snapshot.pumpCommandAt === 'object') {
    store.pumpCommandAt = { ...snapshot.pumpCommandAt };
  }

  if (snapshot.valveIntent && typeof snapshot.valveIntent === 'object') {
    store.valveIntent = { ...snapshot.valveIntent };
  }

  if (typeof snapshot.updatedAt === 'string') store.updatedAt = snapshot.updatedAt;

  return true;
}
