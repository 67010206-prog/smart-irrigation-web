import type { ZoneId } from './types/iot';

/**
 * Mapping กลางของทุกแปลง — ใช้ได้ทั้งฝั่ง server และ client
 * (ห้าม import อะไรที่ผูกกับ Node/server ในไฟล์นี้)
 */

/** แปลง (zone) → group_id ของ Node-RED */
export const ZONE_GROUP_IDS: Record<ZoneId, string> = {
  herb: 'group2',
  rice: 'group5',
  sunnhemp: 'group3',
  sunflower: 'group1',
  potted: 'group4',
};

/** แปลง (zone) → หมายเลขวาล์ว (valveId) */
export const ZONE_VALVE_IDS: Record<ZoneId, number> = {
  herb: 2,
  rice: 3,
  sunnhemp: 4,
  sunflower: 4,
  potted: 4,
};

export interface ZoneConfig {
  groupId: string;
  valveId: number;
}

/** ค่าคอนฟิกของแปลงเดียว */
export function getZoneConfig(zone: ZoneId): ZoneConfig {
  return { groupId: ZONE_GROUP_IDS[zone], valveId: ZONE_VALVE_IDS[zone] };
}

/** group_id → zone (คืน undefined ถ้าไม่รู้จัก) */
export function zoneFromGroup(groupId: string): ZoneId | undefined {
  const target = groupId.trim().toLowerCase();

  return (Object.keys(ZONE_GROUP_IDS) as ZoneId[]).find(
    (zone) => ZONE_GROUP_IDS[zone].toLowerCase() === target
  );
}
