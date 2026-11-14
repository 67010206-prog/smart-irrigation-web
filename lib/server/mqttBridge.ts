import mqtt from 'mqtt';
import type { MqttClient } from 'mqtt';

import { setZonePump, getStore } from './store';
import { ZONE_GROUP_IDS } from './nodered';
import { logEvent } from './debugLog';

import type { ZoneId } from '../types/iot';

/**
 * MQTT bridge (ฝั่ง server) — ฟังสถานะปั๊มจริงจาก Node-RED
 *
 * Node-RED publish:
 *   pump/control/group1..group5 → true / false  ← สถานะจริงหลังผ่าน safety
 *
 * ใช้ env MQTT_URL (เช่น mqtt://13.212.181.250:1883) ถ้าไม่ตั้งจะใช้ค่าเริ่มต้น
 */

const DEFAULT_MQTT_URL = 'mqtt://13.212.181.250:1883';

const STATE_TOPIC = 'pump/control/+';

/** group1..5 → zone ของหน้าเว็บ */
const GROUP_ZONE_IDS: Record<string, ZoneId> = Object.fromEntries(
  (Object.entries(ZONE_GROUP_IDS) as [ZoneId, string][]).map(([zone, group]) => [
    group.toLowerCase(),
    zone,
  ])
);

export interface MqttStatus {
  enabled: boolean;
  url: string;
  connected: boolean;
  lastMessageAt: string | null;
  lastError: string | null;
}

interface BridgeState {
  client: MqttClient;
  connected: boolean;
  lastMessageAt: string | null;
  lastError: string | null;
}

const globalStore = globalThis as unknown as {
  agriflowMqtt?: BridgeState;
  agriflowMqttStarting?: boolean;
};

function getMqttUrl(): string {
  return (process.env.MQTT_URL?.trim() || DEFAULT_MQTT_URL).replace(/\/+$/, '');
}

/** ซ่อน username:password ใน URL ก่อนส่งออก API/log */
export function sanitizeUrl(url: string): string {
  return url.replace(/^(\w+:\/\/)[^@/]+@/, '$1***@');
}

/** บัญชี MQTT — ตั้งผ่าน MQTT_USERNAME / MQTT_PASSWORD หรือฝังใน MQTT_URL ก็ได้ */
function getCredentials(): { username?: string; password?: string } {
  const username = process.env.MQTT_USERNAME?.trim();
  const password = process.env.MQTT_PASSWORD?.trim();

  if (!username) return {};

  return { username, password };
}

/** แปลง payload MQTT (true/false, "ON"/"OFF", 1/0, {request:true}) เป็น boolean */
function parseState(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;

  if (typeof value === 'number') {
    if (value === 1) return true;
    if (value === 0) return false;
    return null;
  }

  if (typeof value === 'string') {
    const text = value.trim().toLowerCase();

    if (['on', 'true', '1', 'open', 'opened'].includes(text)) return true;
    if (['off', 'false', '0', 'close', 'closed'].includes(text)) return false;

    return null;
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;

    for (const key of ['request', 'state', 'status', 'pumpOn', 'value']) {
      if (key in record) {
        const parsed = parseState(record[key]);
        if (parsed !== null) return parsed;
      }
    }
  }

  return null;
}

/** เปิดการเชื่อมต่อ MQTT (เรียกซ้ำได้ ไม่สร้างซ้ำ) */
export function ensureMqttBridge(): void {
  if (globalStore.agriflowMqtt || globalStore.agriflowMqttStarting) return;

  globalStore.agriflowMqttStarting = true;

  const url = getMqttUrl();

  try {
    const client = mqtt.connect(url, {
      ...getCredentials(),
      reconnectPeriod: 5000,
      connectTimeout: 8000,
      clean: true,
      clientId: `agriflow-web-${Math.random().toString(16).slice(2, 10)}`,
    });

    const state: BridgeState = {
      client,
      connected: false,
      lastMessageAt: null,
      lastError: null,
    };

    globalStore.agriflowMqtt = state;

    client.on('connect', () => {
      state.connected = true;
      state.lastError = null;

      client.subscribe(STATE_TOPIC, { qos: 0 }, (err) => {
        if (err) state.lastError = err.message;
      });
    });

    client.on('reconnect', () => {
      state.connected = false;
    });

    client.on('offline', () => {
      state.connected = false;
    });

    client.on('close', () => {
      state.connected = false;
    });

    client.on('error', (err) => {
      state.lastError = err.message;
      state.connected = false;

      const isAuthError = /not authorized|bad username|not authorised/i.test(
        err.message
      );

      if (isAuthError) {
        // ไม่มีประโยชน์ที่จะลองซ้ำทุก 5 วินาที — หยุดเชื่อมต่อ แล้วรอแก้ env + รีสตาร์ท
        client.end(true);
      }
    });

    client.on('message', (topic, payload) => {
      const group = topic.split('/').pop()?.toLowerCase() ?? '';
      const zone = GROUP_ZONE_IDS[group];

      if (!zone) return;

      const raw = payload.toString();
      let parsed: boolean | null = null;

      try {
        parsed = parseState(JSON.parse(raw));
      } catch {
        parsed = parseState(raw);
      }

      if (parsed === null) return;

      state.lastMessageAt = new Date().toISOString();

      const before = getStore().zones.find((item) => item.id === zone)?.pumpOn;

      if (before === parsed) return; // ค่าไม่เปลี่ยน ไม่ต้อง log

      setZonePump(zone, parsed, 'remote');

      logEvent('pump.state', `สถานะจริงจาก Node-RED: ${zone} = ${parsed ? 'ON' : 'OFF'}`, {
        zone,
        group_id: group,
        topic,
        payload: raw.slice(0, 60),
      });
    });
  } catch {
    globalStore.agriflowMqttStarting = false;
  }
}

/** สถานะการเชื่อมต่อ MQTT (สำหรับ API/หน้า Debug) */
export function getMqttStatus(): MqttStatus {
  const state = globalStore.agriflowMqtt;

  return {
    enabled: Boolean(state),
    url: sanitizeUrl(getMqttUrl()),
    connected: state?.connected ?? false,
    lastMessageAt: state?.lastMessageAt ?? null,
    lastError: state?.lastError ?? null,
  };
}

/** ให้ ensureMqttBridge() เริ่มใหม่ได้หลังแก้ env (ใช้ตอน dev/reload) */
export function resetMqttBridge(): void {
  const state = globalStore.agriflowMqtt;

  state?.client.end(true);

  globalStore.agriflowMqtt = undefined;
  globalStore.agriflowMqttStarting = false;
}
