import type { LucideIcon } from 'lucide-react';
import {
  CloudSun,
  Droplets,
  Gauge,
  Sun,
  ThermometerSun,
  Waves,
  Wind,
} from 'lucide-react';

import SectionHeader from './SectionHeader';
import { vaporPressureDeficit } from '../../lib/vpd';

import type { Weather } from '../../lib/types/iot';

type StatusTone = 'normal' | 'warn' | 'idle';

interface MetricDefinition {
  key: string;
  label: string;
  english: string;
  unit: string;
  digits: number;
  icon: LucideIcon;
  tone: 'orange' | 'blue' | 'green' | 'indigo' | 'amber' | 'cyan' | 'violet';
  /** ช่วงค่าปกติ [ต่ำสุด, สูงสุด] */
  normal: [number, number];
  value: number | null;
  note: string;
}

interface EnvMetricsProps {
  weather: Weather;
  updatedAt: Date;
  online: boolean;
}

function statusOf(value: number | null, [min, max]: [number, number]): StatusTone {
  if (value === null) return 'idle';

  return value >= min && value <= max ? 'normal' : 'warn';
}

const STATUS_LABEL: Record<StatusTone, string> = {
  normal: 'ปกติ',
  warn: 'เตือน',
  idle: 'รอข้อมูล',
};

function format(value: number | null, digits: number): string {
  if (value === null) return '--';

  return value.toFixed(digits);
}

function rangeText([min, max]: [number, number], unit: string): string {
  return `เกณฑ์ปกติ ${min}–${max} ${unit}`;
}

/**
 * Section A — Environmental Monitoring
 * แถว 1: อุณหภูมิ / ความชื้นสัมพัทธ์ / ETo
 * แถว 2: ความกดอากาศ / รังสีดวงอาทิตย์ / ความเร็วลม / VPD
 */
export default function EnvMetrics({
  weather,
  updatedAt,
  online,
}: EnvMetricsProps) {
  const vpd = vaporPressureDeficit(weather.temperatureC, weather.humidity);

  const rowOne: MetricDefinition[] = [
    {
      key: 'temperature',
      label: 'อุณหภูมิ',
      english: 'Temperature',
      unit: '°C',
      digits: 1,
      icon: ThermometerSun,
      tone: 'orange',
      normal: [15, 35],
      value: weather.temperatureC,
      note: 'อุณหภูมิอากาศในแปลง',
    },
    {
      key: 'humidity',
      label: 'ความชื้นสัมพัทธ์',
      english: 'Relative Humidity',
      unit: '%',
      digits: 1,
      icon: Droplets,
      tone: 'blue',
      normal: [40, 85],
      value: weather.humidity,
      note: 'ความชื้นของอากาศ',
    },
    {
      key: 'eto',
      label: 'ETo',
      english: 'Reference Evapotranspiration',
      unit: 'mm/วัน',
      digits: 2,
      icon: CloudSun,
      tone: 'green',
      normal: [0, 6],
      value: weather.etoMmPerDay,
      note: 'ค่าการคายระเหยอ้างอิง',
    },
  ];

  const rowTwo: MetricDefinition[] = [
    {
      key: 'pressure',
      label: 'ความกดอากาศ',
      english: 'Atmospheric Pressure',
      unit: 'hPa',
      digits: 1,
      icon: Gauge,
      tone: 'indigo',
      normal: [970, 1045],
      value: weather.pressureHpa ?? null,
      note: 'จากสถานีอากาศ',
    },
    {
      key: 'solar',
      label: 'รังสีดวงอาทิตย์',
      english: 'Solar Radiation',
      unit: 'W/m²',
      digits: 0,
      icon: Sun,
      tone: 'amber',
      normal: [0, 1100],
      value: weather.solarRadiationWm2 ?? null,
      note: 'ใช้คำนวณ ETo',
    },
    {
      key: 'wind',
      label: 'ความเร็วลม',
      english: 'Wind Speed',
      unit: 'm/s',
      digits: 1,
      icon: Wind,
      tone: 'cyan',
      normal: [0, 8],
      value: weather.windMs ?? null,
      note: 'ที่ระดับใบพัดวัดลม',
    },
    {
      key: 'vpd',
      label: 'VPD',
      english: 'Vapor Pressure Deficit',
      unit: 'kPa',
      digits: 2,
      icon: Waves,
      tone: 'violet',
      normal: [0.3, 1.8],
      value: vpd,
      note: 'คำนวณจากอุณหภูมิและความชื้น',
    },
  ];

  const updatedLabel = updatedAt.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const renderCard = (metric: MetricDefinition) => {
    const status = statusOf(metric.value, metric.normal);
    const Icon = metric.icon;

    return (
      <article
        key={metric.key}
        className={`env-card tone-${metric.tone} is-${status}`}
      >
        <div className="env-card-top">
          <span className="env-icon">
            <Icon size={19} strokeWidth={2} />
          </span>

          <span className={`env-status is-${status}`}>
            <i />
            {STATUS_LABEL[status]}
          </span>
        </div>

        <div className="env-card-label">
          <strong>{metric.label}</strong>
          <span>{metric.english}</span>
        </div>

        <div className="env-value">
          {format(metric.value, metric.digits)}
          <span>{metric.unit}</span>
        </div>

        <div className="env-foot">
          <span>{metric.note}</span>
          <span>{rangeText(metric.normal, metric.unit)}</span>
        </div>
      </article>
    );
  };

  return (
    <section className="dash-section" aria-labelledby="env-monitoring">
      <SectionHeader
        eyebrow="Section A · Environmental Monitoring"
        title="ข้อมูลสภาพแวดล้อมแบบเรียลไทม์"
        description="ค่าที่วัดได้จากสถานีอากาศและจุดวัดในแปลง — อัปเดตอัตโนมัติทุก 10 วินาที"
      >
        <div className={`dash-live ${online ? 'is-online' : ''}`}>
          <i />
          {online ? `LIVE · ${updatedLabel}` : 'OFFLINE'}
        </div>
      </SectionHeader>

      <div className="env-row env-row-3">{rowOne.map(renderCard)}</div>
      <div className="env-row env-row-4">{rowTwo.map(renderCard)}</div>

      <p className="env-formula">
        VPD = e<sub>s</sub>(T) × (1 − RH/100) โดย e<sub>s</sub>(T) = 0.6108 ×
        exp(17.27T / (T + 237.3))
      </p>

      <h2 id="env-monitoring" className="sr-only">
        ข้อมูลสภาพแวดล้อม
      </h2>
    </section>
  );
}
