import type { ZoneId } from '../types/iot';

import { ZONE_GROUP_IDS } from './nodered';

/**
 * คิวคำสั่งปั๊ม (in-memory)
 * - Website POST /api/control/pump → เข้าคิวทันที
 * - ถ้า forward ตรงไป Node-RED สำเร็จ → ปิดคำสั่งเป็น done (ไม่ต้องส่งซ้ำ)
 * - ถ้า forward ไม่สำเร็จ → ค้างไว้ให้ Node-RED มา GET /api/control/pump/pending
 * - Node-RED ทำงานเสร็จแล้ว POST /api/control/pump/ack กลับมา
 */

export type PumpCommandStatus = 'pending' | 'done' | 'failed' | 'expired';

export interface PumpCommand {
  commandId: string;
  zone: ZoneId;
  group_id: string;
  state: boolean;
  createdAt: string;
  status: PumpCommandStatus;
  /** เวลาที่ Node-RED ดึงคำสั่งนี้ไป (null = ยังไม่เคยดึง) */
  deliveredAt: string | null;
  attempts: number;
  note?: string;
}

interface QueueState {
  commands: PumpCommand[];
}

/** เก็บล่าสุดกี่คำสั่ง (กันหน่วยความจำโต) */
const MAX_KEEP = 100;

/** ถ้า Node-RED ดึงไปแล้วไม่ ack ภายในกี่ ms จึงส่งซ้ำ */
const RETRY_AFTER_MS = 8000;

/** ส่งซ้ำได้สูงสุดกี่ครั้งก่อนถือว่าหมดอายุ */
const MAX_ATTEMPTS = 3;

const globalQueue = globalThis as unknown as {
  agriflowPumpQueue?: QueueState;
};

function getQueue(): QueueState {
  if (!globalQueue.agriflowPumpQueue) {
    globalQueue.agriflowPumpQueue = { commands: [] };
  }

  return globalQueue.agriflowPumpQueue;
}

function trim(): void {
  const queue = getQueue();

  if (queue.commands.length > MAX_KEEP) {
    queue.commands = queue.commands.slice(-MAX_KEEP);
  }
}

/** เพิ่มคำสั่งใหม่เข้าคิว */
export function enqueuePumpCommand(zone: ZoneId, state: boolean): PumpCommand {
  const command: PumpCommand = {
    commandId: `cmd_${crypto.randomUUID().slice(0, 8)}`,
    zone,
    group_id: ZONE_GROUP_IDS[zone],
    state,
    createdAt: new Date().toISOString(),
    status: 'pending',
    deliveredAt: null,
    attempts: 0,
  };

  getQueue().commands.push(command);
  trim();

  return command;
}

/** ปิดคำสั่ง (done/failed) พร้อมเหตุผลสั้น ๆ */
export function finishCommand(
  commandId: string,
  status: 'done' | 'failed',
  note?: string
): PumpCommand | undefined {
  const command = getQueue().commands.find(
    (item) => item.commandId === commandId
  );

  if (!command) return undefined;

  command.status = status;
  if (note) command.note = note;

  return command;
}

/**
 * คำสั่งที่ยังรอให้ Node-RED ทำ
 * - คืนได้ครั้งละไม่เกิน limit
 * - attempts++ และบันทึก deliveredAt เพื่อไม่ให้วนส่งรัว ๆ
 */
export function takePendingCommands(limit = 5): PumpCommand[] {
  const now = Date.now();
  const picked: PumpCommand[] = [];

  for (const command of getQueue().commands) {
    if (command.status !== 'pending') continue;

    const deliveredAt = command.deliveredAt
      ? new Date(command.deliveredAt).getTime()
      : null;

    if (deliveredAt !== null) {
      // ดึงไปแล้วแต่ยังไม่ ack — รอครบกำหนดแล้วค่อยส่งซ้ำ
      if (now - deliveredAt < RETRY_AFTER_MS) continue;

      if (command.attempts >= MAX_ATTEMPTS) {
        command.status = 'expired';
        command.note = 'Node-RED ไม่ ack ภายในเวลาที่กำหนด';
        continue;
      }
    }

    command.attempts += 1;
    command.deliveredAt = new Date(now).toISOString();

    picked.push({ ...command });

    if (picked.length >= limit) break;
  }

  return picked;
}

/** หาคำสั่งจาก commandId */
export function findCommand(commandId: string): PumpCommand | undefined {
  return getQueue().commands.find((item) => item.commandId === commandId);
}

/** ดูคำสั่งล่าสุด (ใช้ debug) */
export function getCommands(limit = 20): PumpCommand[] {
  return getQueue().commands.slice(-limit).reverse();
}
