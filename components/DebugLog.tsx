'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Bug, Pause, Play, RefreshCw, Trash2 } from 'lucide-react';

interface DebugEvent {
  id: number;
  at: string;
  kind: string;
  message: string;
  data?: unknown;
}

// ดึง log ใหม่ทุก 2 วินาที (เรียลไทม์แบบพอเพียง ไม่ต้องใช้ WebSocket)
const POLL_MS = 2000;

/** สีของ badge ตามหมวด log */
function kindClass(kind: string): string {
  if (kind.startsWith('telemetry')) return 'dbg-kind telemetry';
  if (kind.startsWith('pump')) return 'dbg-kind pump';
  if (kind.startsWith('nodered')) return 'dbg-kind nodered';
  return 'dbg-kind other';
}

function timeText(iso: string): string {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) return '--:--:--';

  return date.toLocaleTimeString('th-TH', { hour12: false });
}

export default function DebugLog() {
  const [events, setEvents] = useState<DebugEvent[]>([]);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(true);
  const [filter, setFilter] = useState('all');
  const [busy, setBusy] = useState(false);

  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/debug/logs?limit=50', { cache: 'no-store' });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = (await res.json()) as { events?: DebugEvent[] };

      if (!mounted.current) return;

      setEvents(json.events ?? []);
      setLastFetch(new Date());
      setError(null);
    } catch (err) {
      if (!mounted.current) return;

      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  // poll แบบเรียลไทม์ (หยุดเมื่อกด Pause)
  useEffect(() => {
    if (!live) return;

    let timer: number | undefined;

    const tick = async () => {
      await load();

      if (!mounted.current || !live) return;

      timer = window.setTimeout(tick, POLL_MS);
    };

    void tick();

    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [live, load]);

  const clearLogs = async () => {
    setBusy(true);

    try {
      await fetch('/api/debug/logs', { method: 'DELETE' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (mounted.current) setBusy(false);
    }
  };

  const kinds = useMemo(
    () => ['all', ...Array.from(new Set(events.map((event) => event.kind)))],
    [events]
  );

  const visible = useMemo(
    () => (filter === 'all' ? events : events.filter((event) => event.kind === filter)),
    [events, filter]
  );

  const lastFetchText = lastFetch
    ? lastFetch.toLocaleTimeString('th-TH', { hour12: false })
    : '--:--:--';

  return (
    <div className="page-content dbg-page">
      <div className="page-heading-row">
        <div>
          <div className="eyebrow">DEVELOPER / BACKEND LOG</div>
          <h1>Debug Log</h1>
          <p>
            ดูข้อมูลที่ Node-RED / ESP32 ยิงเข้ามาที่ API และผลการทำงานฝั่งหลังบ้านแบบเรียลไทม์
          </p>
        </div>

        <div className="heading-right">
          <div className="updated-label">
            <RefreshCw size={14} />
            <span>อัปเดตล่าสุด {lastFetchText}</span>
          </div>

          <button
            type="button"
            className="outline-button"
            onClick={() => setLive((current) => !current)}
          >
            {live ? <Pause size={15} /> : <Play size={15} />}
            {live ? 'หยุดชั่วคราว' : 'เล่นต่อ'}
          </button>

          <button
            type="button"
            className="outline-button"
            onClick={() => void load()}
          >
            <RefreshCw size={15} /> รีเฟรช
          </button>

          <button
            type="button"
            className="outline-button dbg-clear"
            onClick={() => void clearLogs()}
            disabled={busy}
          >
            <Trash2 size={15} /> ล้าง log
          </button>
        </div>
      </div>

      {error && (
        <div className="notice-banner">
          <div className="notice-icon">
            <AlertTriangle size={15} />
          </div>
          <div>
            <strong>ดึง log ไม่สำเร็จ</strong>
            <span>{error} — ตรวจว่า server ยังรันอยู่</span>
          </div>
        </div>
      )}

      <div className="dbg-toolbar">
        <div className="dbg-kinds">
          {kinds.map((kind) => (
            <button
              key={kind}
              type="button"
              className={`dbg-filter ${filter === kind ? 'on' : ''}`}
              onClick={() => setFilter(kind)}
            >
              {kind === 'all' ? 'ทั้งหมด' : kind}
            </button>
          ))}
        </div>

        <div className="live-label">
          <span className="live-dot" /> {live ? `LIVE · ทุก ${POLL_MS / 1000} วินาที` : 'PAUSED'}
        </div>
      </div>

      <div className="panel dbg-panel">
        <div className="plant-card-head dbg-head">
          <span className="plant-index">
            <Bug size={14} />
          </span>
          <div>
            <h2>Events</h2>
            <span>
              {visible.length} / {events.length} รายการ (เก็บล่าสุด 60 รายการในหน่วยความจำ)
            </span>
          </div>
        </div>

        {visible.length === 0 ? (
          <p className="dbg-empty">
            ยังไม่มี log — ลองยิงค่าจาก Node-RED ที่ <code>/api/sensors/telemetry</code> หรือกดเปิด–ปิดปั๊มจากหน้า Control
          </p>
        ) : (
          <div className="dbg-list">
            {visible.map((event) => (
              <div className="dbg-row" key={event.id}>
                <span className="dbg-time">#{event.id} · {timeText(event.at)}</span>
                <span className={kindClass(event.kind)}>{event.kind}</span>
                <span className="dbg-msg">{event.message}</span>

                {event.data !== undefined && (
                  <details className="dbg-data">
                    <summary>payload</summary>
                    <pre>{JSON.stringify(event.data, null, 2)}</pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="page-footnote">
        AgriFlow Debug <span>·</span> log อยู่ในหน่วยความจำของ instance — รีสตาร์ท server แล้วจะถูกล้าง
      </div>
    </div>
  );
}
