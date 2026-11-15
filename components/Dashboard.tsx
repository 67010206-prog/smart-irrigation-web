'use client';

import { useEffect, useRef, useState } from 'react';

import Sidebar from './Sidebar';
import Topbar from './Topbar';
import Control from './Control';
import Docs from './Docs';
import DataStorage from './DataStorage';
import DebugLog from './DebugLog';

import { fetchLatestSensors, setZonePumpState } from '../lib/services/api';

import type {
  PageKey,
  PumpLog,
  SensorPoint,
  WaterTank,
  Weather,
  Zone,
  ZoneId,
} from '../lib/types/iot';

// ดึงข้อมูลจาก backend เป็นรอบ (แก้ตัวเลขนี้ถ้าต้องการถี่ขึ้น/ห่างขึ้น)
const POLL_INTERVAL_MS = 10000;

// ยังไม่ได้รับค่า → null (แสดง "--" ไม่ใช่ 0)
const EMPTY_WEATHER: Weather = {
  temperatureC: null,
  humidity: null,
  etoMmPerDay: null,
  pressureHpa: null,
  lightLux: null,
  windMs: null,
  solarRadiationWm2: null,
};

function readPumpLogs(): PumpLog[] {
  if (typeof window === 'undefined') return [];

  try {
    const saved = localStorage.getItem('agriflow-pump-logs');

    if (!saved) return [];

    const parsed = JSON.parse(saved) as Array<{
      id: number;
      status: 'ON' | 'OFF';
      startedAt: string;
      stoppedAt: string | null;
      durationSeconds: number | null;
    }>;

    return parsed.map((log) => ({
      ...log,
      startedAt: new Date(log.startedAt),
      stoppedAt: log.stoppedAt ? new Date(log.stoppedAt) : null,
    }));
  } catch (error) {
    console.error('ไม่สามารถโหลดประวัติปั๊มน้ำได้:', error);

    return [];
  }
}

export default function Dashboard() {
  const [page, setPage] = useState<PageKey>('control');
  const [collapsed, setCollapsed] = useState(false);

  // ค่าเวลาขึ้นกับจังหวะที่ render จึงเริ่มวาดหลัง mount เพื่อกัน hydration mismatch
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // ==============================
  // ข้อมูลจาก API
  // ==============================

  const [weather, setWeather] = useState<Weather>(EMPTY_WEATHER);
  const [waterTank, setWaterTank] = useState<WaterTank | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [busyZone, setBusyZone] = useState<ZoneId | null>(null);
  // คำเตือนเมื่อสั่งปิดวาล์วที่แปลงอื่นยังใช้อยู่
  const [valveWarning, setValveWarning] = useState<{
    title: string;
    detail: string;
  } | null>(null);

  const [history, setHistory] = useState<SensorPoint[]>([]);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [deviceOnline, setDeviceOnline] = useState(false);

  // ==============================
  // ประวัติปั๊มน้ำ (เก็บใน localStorage)
  // ==============================

  const [pumpOn, setPumpOn] = useState(false);
  const [pumpLogs, setPumpLogs] = useState<PumpLog[]>(readPumpLogs);

  const previousPumpOn = useRef(pumpOn);
  const activePumpLogId = useRef<number | null>(
    pumpLogs.find((log) => log.stoppedAt === null)?.id ?? null
  );

  useEffect(() => {
    try {
      localStorage.setItem('agriflow-pump-logs', JSON.stringify(pumpLogs));
    } catch (error) {
      console.error('ไม่สามารถบันทึกประวัติปั๊มน้ำได้:', error);
    }
  }, [pumpLogs]);

  // ==============================
  // ดึงข้อมูลทุก POLL_INTERVAL_MS
  // ==============================

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    const poll = async () => {
      const snapshot = await fetchLatestSensors();

      if (cancelled) return;

      // เชื่อมต่อไม่ได้ ให้คงค่าเดิมแล้วลองใหม่รอบถัดไป
      if (!snapshot) {
        setDeviceOnline(false);
        timer = window.setTimeout(poll, POLL_INTERVAL_MS);
        return;
      }

      setDeviceOnline(true);
      setWeather(snapshot.weather);
      setWaterTank(snapshot.waterTank ?? null);
      setZones(snapshot.zones);
      setPumpOn(snapshot.zones.some((zone) => zone.pumpOn));

      const parsedTime = new Date(snapshot.updatedAt);
      const now = Number.isNaN(parsedTime.getTime())
        ? new Date()
        : parsedTime;

      setLastUpdated(now);

      // บันทึกประวัติ (ข้ามรอบที่ค่าไม่เปลี่ยน / ข้ามถ้ายังไม่เคยได้รับค่าจริง)
      const { temperatureC, humidity, etoMmPerDay } = snapshot.weather;

      if (
        temperatureC !== null &&
        humidity !== null &&
        etoMmPerDay !== null
      ) {
        setHistory((current) => {
          const last = current[current.length - 1];

          if (
            last &&
            last.temperature === temperatureC &&
            last.humidity === humidity &&
            last.etoMmPerDay === etoMmPerDay
          ) {
            return current;
          }

          return [
            ...current.slice(-29),
            {
              timestamp: now,
              time: now.toLocaleTimeString('th-TH', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              }),
              temperature: temperatureC,
              humidity,
              etoMmPerDay,
            },
          ];
        });
      }

      timer = window.setTimeout(poll, POLL_INTERVAL_MS);
    };

    void poll();

    return () => {
      cancelled = true;

      if (timer) window.clearTimeout(timer);
    };
  }, []);

  // ==============================
  // บันทึกประวัติเมื่อสถานะปั๊มเปลี่ยน
  // ==============================

  useEffect(() => {
    if (previousPumpOn.current === pumpOn) return;

    const now = new Date();

    if (pumpOn) {
      const id = now.getTime();

      activePumpLogId.current = id;

      setPumpLogs((current) =>
        [
          {
            id,
            status: 'ON' as const,
            startedAt: now,
            stoppedAt: null,
            durationSeconds: null,
          },
          ...current,
        ].slice(0, 200)
      );
    } else {
      const id = activePumpLogId.current;

      if (id !== null) {
        setPumpLogs((current) =>
          current.map((log) =>
            log.id === id
              ? {
                  ...log,
                  stoppedAt: now,
                  durationSeconds: Math.round(
                    (now.getTime() - new Date(log.startedAt).getTime()) /
                      1000
                  ),
                }
              : log
          )
        );
      }

      activePumpLogId.current = null;
    }

    previousPumpOn.current = pumpOn;
  }, [pumpOn]);

  // ==============================
  // เปิด–ปิดปั๊มของแปลง
  // ==============================

  const toggleZonePump = async (zoneId: ZoneId) => {
    if (busyZone) return;

    const zone = zones.find((item) => item.id === zoneId);

    if (!zone) return;

    const nextState = !zone.pumpOn;

    setBusyZone(zoneId);

    const result = await setZonePumpState(zoneId, nextState);

    if (result.blocked && result.conflict) {
      // วาล์วเดียวกันยังมีแปลงอื่นใช้อยู่ → ไม่ปิดให้ พร้อมบอกว่าใครถืออยู่
      const names = result.conflict.heldBy
        .map((holder) => holder.name)
        .join(', ');

      setValveWarning({
        title: `ปิดไม่ได้ — Valve ${result.conflict.valveId} ยังถูกใช้งานอยู่`,
        detail: `${names} ยังต้องการน้ำอยู่ — ปิดที่แปลงนั้นก่อนแล้วจึงปิดวาล์วนี้`,
      });
    } else if (result.ok && result.zones) {
      setValveWarning(null);

      // API คืนทุกแปลงที่ใช้วาล์วร่วมกัน → การ์ดทุกใบอัปเดตพร้อมกัน
      const byId = new Map(result.zones.map((item) => [item.id, item]));

      setZones((current) =>
        current.map((item) => {
          const next = byId.get(item.id);

          return next
            ? { ...item, pumpOn: next.pumpOn, valves: next.valves }
            : item;
        })
      );
    } else if (result.error) {
      setValveWarning({ title: 'สั่งงานไม่สำเร็จ', detail: result.error });
    }

    setBusyZone(null);
  };

  // ==============================
  // แสดงผลหน้าเว็บไซต์
  // ==============================

  if (!mounted) {
    return (
      <div className="app-shell">
        <main className="main-area" />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar
        page={page}
        setPage={setPage}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />

      <main className={`main-area ${collapsed ? 'main-expanded' : ''}`}>
        <Topbar
          page={page}
          lastUpdated={lastUpdated}
          online={deviceOnline}
        />

        {page === 'control' ? (
          <Control
            weather={weather}
            waterTank={waterTank}
            zones={zones}
            busyZone={busyZone}
            onTogglePump={toggleZonePump}
            valveWarning={valveWarning}
            onDismissValveWarning={() => setValveWarning(null)}
            lastUpdated={lastUpdated}
            deviceOnline={deviceOnline}
          />
        ) : page === 'docs' ? (
          <Docs />
        ) : page === 'storage' ? (
          <DataStorage history={history} pumpLogs={pumpLogs} />
        ) : page === 'debug' ? (
          <DebugLog />
        ) : null}
      </main>
    </div>
  );
}
