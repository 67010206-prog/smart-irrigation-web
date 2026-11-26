'use client';

import { useEffect, useMemo, useState } from 'react';
import { Clock, Droplets, PauseCircle } from 'lucide-react';

import type { PumpAlert } from '../lib/types/iot';
import { ZONE_GROUP_IDS } from '../lib/zoneConfig';

const GROUP_LABELS: Record<string, string> = {
  group1: 'แปลงดอกไม้',
  group2: 'แปลงไม้ยืนต้น',
  group3: 'แปลงดอกไม้',
  group4: 'แปลงดอกไม้',
  group5: 'แปลงนาข้าว',
};

/** ชื่อไทยของ group (ถ้าไม่รู้จักใช้รหัสเดิม) */
function groupLabel(group: string): string {
  const known = GROUP_LABELS[group];

  if (known) return known;

  const zone = (Object.keys(ZONE_GROUP_IDS) as Array<keyof typeof ZONE_GROUP_IDS>).find(
    (id) => ZONE_GROUP_IDS[id] === group
  );

  return zone ?? group;
}

/** วินาที → mm:ss หรือ h:mm:ss */
function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;

  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');

  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

/**
 * แจ้งเตือนบนหน้าเว็บเมื่อปั๊มเข้าสถานะ "พักรดน้ำรอเติมน้ำ"
 * พร้อมเวลาที่เหลือ (นับถอยหลังฝั่ง client จากค่าที่ Node-RED ส่งมา)
 */
export default function PumpPauseAlert({ alert }: { alert: PumpAlert | null }) {
  const active = alert?.active === true && (alert?.pausedGroups?.length ?? 0) > 0;

  // ยึดเวลาที่ได้รับแจ้งเป็นจุดเริ่มนับถอยหลัง
  const anchor = useMemo(
    () => ({
      base: alert?.remainingSeconds ?? null,
      at: alert?.at ? new Date(alert.at).getTime() : Date.now(),
    }),
    [alert]
  );

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;

    const timer = window.setInterval(() => setNow(Date.now()), 1000);

    return () => window.clearInterval(timer);
  }, [active]);

  if (!alert || !active) return null;

  const elapsedSeconds = Math.max(0, (now - anchor.at) / 1000);

  const remaining =
    anchor.base === null ? null : Math.max(0, anchor.base - elapsedSeconds);

  // หลาย group อาจเป็นแปลงเดียวกัน (วาล์ว 4 ร่วมกัน) → แสดงชื่อแปลงครั้งเดียว
  const groups = Array.from(new Set(alert.pausedGroups.map(groupLabel))).join(' · ');

  return (
    <div className="pump-alert" role="alert" aria-live="assertive">
      <div className="pump-alert-icon">
        <PauseCircle size={20} />
      </div>

      <div className="pump-alert-body">
        <strong>หยุดรดน้ำชั่วคราว — รอเติมน้ำในถัง</strong>

        <span className="pump-alert-detail">
          {groups}
          {alert.waterLevel !== null && (
            <>
              {' '}
              · น้ำปัจจุบัน <b>{alert.waterLevel.toFixed(0)}%</b>
            </>
          )}
          {alert.resumeThreshold !== null && (
            <> · จะรดต่อเมื่อน้ำเกิน {alert.resumeThreshold.toFixed(0)}%</>
          )}
        </span>

        {alert.message && <span className="pump-alert-message">{alert.message}</span>}
      </div>

      <div className="pump-alert-time">
        <span>
          <Clock size={13} /> เหลือเวลารด
        </span>
        <strong>{remaining === null ? '--:--' : formatClock(remaining)}</strong>
        <span className="pump-alert-hint">
          <Droplets size={12} /> ระบบจะรดต่อเองเมื่อน้ำถึงเกณฑ์
        </span>
      </div>
    </div>
  );
}
