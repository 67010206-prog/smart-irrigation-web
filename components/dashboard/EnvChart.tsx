'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, PointerEvent } from 'react';
import { Activity, RefreshCw } from 'lucide-react';

import SectionHeader from './SectionHeader';
import {
  HISTORY_RANGE_OPTIONS,
  historyRangeMs,
} from '../../lib/history';
import { fetchSensorHistory } from '../../lib/services/api';

import type { HistoryPoint, HistoryRange } from '../../lib/types/iot';

type ParamKey =
  | 'temperatureC'
  | 'humidity'
  | 'etoMmPerDay'
  | 'pressureHpa'
  | 'solarRadiationWm2'
  | 'windMs'
  | 'vpdKpa';

interface ParamDefinition {
  key: ParamKey;
  label: string;
  short: string;
  unit: string;
  color: string;
  digits: number;
}

const PARAMS: ParamDefinition[] = [
  {
    key: 'temperatureC',
    label: 'อุณหภูมิ',
    short: 'อุณหภูมิ',
    unit: '°C',
    color: '#e28a3b',
    digits: 1,
  },
  {
    key: 'humidity',
    label: 'ความชื้นสัมพัทธ์',
    short: 'ความชื้น',
    unit: '%',
    color: '#4d93d6',
    digits: 1,
  },
  {
    key: 'vpdKpa',
    label: 'VPD',
    short: 'VPD',
    unit: 'kPa',
    color: '#8b76d1',
    digits: 2,
  },
  {
    key: 'etoMmPerDay',
    label: 'ETo',
    short: 'ETo',
    unit: 'mm/วัน',
    color: '#2f9a6d',
    digits: 2,
  },
  {
    key: 'solarRadiationWm2',
    label: 'รังสีดวงอาทิตย์',
    short: 'รังสี',
    unit: 'W/m²',
    color: '#cfa022',
    digits: 0,
  },
  {
    key: 'pressureHpa',
    label: 'ความกดอากาศ',
    short: 'ความกด',
    unit: 'hPa',
    color: '#5d7ec9',
    digits: 1,
  },
  {
    key: 'windMs',
    label: 'ความเร็วลม',
    short: 'ลม',
    unit: 'm/s',
    color: '#3aa0a8',
    digits: 1,
  },
];

const REFRESH_MS = 30000;

function axisTime(ts: number, range: HistoryRange): string {
  const date = new Date(ts);

  if (range === '7d') {
    return date.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
    });
  }

  return date.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function tooltipTime(ts: number): string {
  return new Date(ts).toLocaleString('th-TH', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Section B — Environmental Data Visualization
 * กราฟ Time-series แนวนอนเต็มความกว้าง + เลือก parameter และช่วงเวลาได้
 */
export default function EnvChart() {
  const [range, setRange] = useState<HistoryRange>('24h');
  const [paramKey, setParamKey] = useState<ParamKey>('temperatureC');
  const [points, setPoints] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [hover, setHover] = useState<number | null>(null);

  const param =
    PARAMS.find((item) => item.key === paramKey) ?? PARAMS[0];

  // โหลดข้อมูล 7 วันครั้งเดียว แล้วกรองตามช่วงที่เลือก (เปลี่ยนช่วง = ไม่ต้องยิง API ใหม่)
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const data = await fetchSensorHistory('7d');

      if (cancelled) return;

      setPoints(data);
      setLoading(false);
    };

    void load();

    const timer = window.setInterval(() => void load(), REFRESH_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    setHover(null);
  }, [range, paramKey]);

  const series = useMemo(() => {
    const since = Date.now() - historyRangeMs(range);
    const list: Array<{ ts: number; value: number }> = [];

    for (const point of points) {
      if (point.ts < since) continue;

      const value = point[param.key];

      if (typeof value === 'number' && Number.isFinite(value)) {
        list.push({ ts: point.ts, value });
      }
    }

    return list.sort((a, b) => a.ts - b.ts);
  }, [points, range, param]);

  const bounds = useMemo(() => {
    if (series.length === 0) return { min: 0, max: 1 };

    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;

    for (const point of series) {
      min = Math.min(min, point.value);
      max = Math.max(max, point.value);
    }

    if (min === max) {
      const pad = Math.abs(min) * 0.1 || 1;

      return { min: min - pad, max: max + pad };
    }

    const pad = (max - min) * 0.12;

    return { min: min - pad, max: max + pad };
  }, [series]);

  const coords = useMemo(
    () =>
      series.map((point, index) => ({
        x: series.length === 1 ? 50 : (index / (series.length - 1)) * 100,
        y:
          100 -
          ((point.value - bounds.min) / (bounds.max - bounds.min)) * 100,
      })),
    [series, bounds]
  );

  const linePath = coords
    .map((coord, index) => `${index === 0 ? 'M' : 'L'} ${coord.x} ${coord.y}`)
    .join(' ');

  const areaPath =
    coords.length > 1
      ? `M ${coords[0].x} 100 ${coords
          .map((coord) => `L ${coord.x} ${coord.y}`)
          .join(' ')} L ${coords[coords.length - 1].x} 100 Z`
      : '';

  const yTicks = [0, 1, 2, 3].map(
    (index) => bounds.max - ((bounds.max - bounds.min) / 3) * index
  );

  const xLabels = useMemo(() => {
    if (series.length === 0) return [];

    const first = series[0].ts;
    const last = series[series.length - 1].ts;

    return Array.from({ length: 5 }, (_, index) =>
      axisTime(first + ((last - first) * index) / 4, range)
    );
  }, [series, range]);

  const latest = series.length > 0 ? series[series.length - 1].value : null;
  const lowest =
    series.length > 0 ? Math.min(...series.map((item) => item.value)) : null;
  const highest =
    series.length > 0 ? Math.max(...series.map((item) => item.value)) : null;

  const hoverPoint = hover !== null ? series[hover] : null;
  const hoverCoord = hover !== null ? coords[hover] : null;

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (series.length === 0) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(
      1,
      Math.max(0, (event.clientX - rect.left) / rect.width)
    );

    setHover(Math.round(ratio * (series.length - 1)));
  };

  return (
    <section className="dash-section" aria-labelledby="env-chart">
      <SectionHeader
        eyebrow="Section B · Environmental Data Visualization"
        title="แนวโน้มข้อมูลสภาพแวดล้อม"
        description="เลือก parameter และช่วงเวลาเพื่อดูข้อมูลย้อนหลัง — ชี้ที่กราฟเพื่อดูค่าของแต่ละจุด"
      >
        <div className="range-group" role="group" aria-label="ช่วงเวลา">
          {HISTORY_RANGE_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              className={`range-btn ${range === option.key ? 'is-active' : ''}`}
              aria-pressed={range === option.key}
              onClick={() => setRange(option.key)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </SectionHeader>

      <div className="chart-card">
        <div className="param-row" role="group" aria-label="เลือก parameter">
          {PARAMS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`param-pill ${paramKey === item.key ? 'is-active' : ''}`}
              style={{ '--param': item.color } as CSSProperties}
              aria-pressed={paramKey === item.key}
              onClick={() => setParamKey(item.key)}
            >
              <i />
              {item.short}
            </button>
          ))}
        </div>

        <div className="chart-readout">
          <div className="chart-readout-main">
            <span>{param.label}</span>
            <strong style={{ color: param.color }}>
              {latest === null ? '--' : latest.toFixed(param.digits)}
              <em>{param.unit}</em>
            </strong>
          </div>

          <div className="chart-stats">
            <span>
              ต่ำสุด{' '}
              <b>{lowest === null ? '--' : lowest.toFixed(param.digits)}</b>
            </span>
            <span>
              สูงสุด{' '}
              <b>{highest === null ? '--' : highest.toFixed(param.digits)}</b>
            </span>
            <span>
              จุดข้อมูล <b>{series.length}</b>
            </span>
          </div>

          <div className="chart-live">
            <RefreshCw size={12} />
            อัปเดตทุก {REFRESH_MS / 1000} วินาที
          </div>
        </div>

        <div className="chart-frame">
          <div className="chart-y-axis" aria-hidden="true">
            {yTicks.map((tick, index) => (
              <span key={index}>{tick.toFixed(param.digits)}</span>
            ))}
          </div>

          <div
            className="chart-plot"
            onPointerMove={handlePointerMove}
            onPointerLeave={() => setHover(null)}
          >
            <svg
              className="chart-svg"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              role="img"
              aria-label={`กราฟ ${param.label} ย้อนหลัง ${range}`}
            >
              <defs>
                <linearGradient id="chartAreaFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={param.color} stopOpacity="0.22" />
                  <stop offset="100%" stopColor={param.color} stopOpacity="0" />
                </linearGradient>
              </defs>

              {[0, 33.333, 66.666, 100].map((y) => (
                <line
                  key={y}
                  x1="0"
                  x2="100"
                  y1={y}
                  y2={y}
                  className="chart-grid-line"
                  vectorEffect="non-scaling-stroke"
                />
              ))}

              {areaPath ? <path d={areaPath} fill="url(#chartAreaFill)" /> : null}

              {linePath ? (
                <path
                  d={linePath}
                  fill="none"
                  stroke={param.color}
                  strokeWidth={2.4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              ) : null}
            </svg>

            {series.length === 1 && coords[0] ? (
              <span
                className="chart-single-dot"
                style={{
                  left: `${coords[0].x}%`,
                  top: `${coords[0].y}%`,
                  background: param.color,
                }}
              />
            ) : null}

            {hoverPoint && hoverCoord ? (
              <>
                <span
                  className="chart-crosshair"
                  style={{ left: `${hoverCoord.x}%` }}
                />
                <span
                  className="chart-hover-dot"
                  style={{
                    left: `${hoverCoord.x}%`,
                    top: `${hoverCoord.y}%`,
                    background: param.color,
                  }}
                />
                <div
                  className="chart-tooltip"
                  style={{
                    left: `${Math.min(88, Math.max(12, hoverCoord.x))}%`,
                    top: `${hoverCoord.y}%`,
                  }}
                >
                  <span>{tooltipTime(hoverPoint.ts)}</span>
                  <strong>
                    {hoverPoint.value.toFixed(param.digits)}
                    <em>{param.unit}</em>
                  </strong>
                </div>
              </>
            ) : null}

            {loading && series.length === 0 ? (
              <div className="chart-empty">
                <Activity size={18} />
                กำลังโหลดข้อมูลย้อนหลัง…
              </div>
            ) : null}

            {!loading && series.length === 0 ? (
              <div className="chart-empty">
                <Activity size={18} />
                <strong>ยังไม่มีข้อมูลในช่วงนี้</strong>
                <span>
                  ส่งค่าจากเซนเซอร์เข้าที่ POST /api/sensors/telemetry
                  แล้วกราฟจะเริ่มสะสมข้อมูล
                </span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="chart-x-axis" aria-hidden="true">
          {xLabels.map((label, index) => (
            <span key={index}>{label}</span>
          ))}
        </div>
      </div>

      <h2 id="env-chart" className="sr-only">
        กราฟข้อมูลสภาพแวดล้อม
      </h2>
    </section>
  );
}
