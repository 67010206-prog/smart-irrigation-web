import type { ReactNode } from 'react';
import {
  CloudSun,
  Droplets,
  RefreshCw,
  ThermometerSun,
} from 'lucide-react';

import WaterTankCard from './WaterTank';

import type { WaterTank, Zone, ZoneId, ZoneValues } from '../lib/types/iot';

interface ControlProps {
  weather: {
    temperatureC: number;
    humidity: number;
    etoMmPerDay: number;
  };
  waterTank: WaterTank | null;
  zones: Zone[];
  busyZone: ZoneId | null;
  onTogglePump: (zoneId: ZoneId) => void;
  lastUpdated: Date;
  deviceOnline: boolean;
}

/** อ่านค่าของแปลง (คืน null ถ้าไม่มีค่า) */
function getValue(
  zones: Zone[],
  id: ZoneId,
  key: keyof ZoneValues
): number | null {
  const value = zones.find((zone) => zone.id === id)?.values[key];

  return typeof value === 'number' ? value : null;
}

function isPumpOn(zones: Zone[], id: ZoneId): boolean {
  return zones.find((zone) => zone.id === id)?.pumpOn === true;
}

function fmt(value: number | null, digits = 1): string {
  return value === null ? '--' : value.toFixed(digits);
}

function ValueCard({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div className="value-card">
      <span className="value-label">{label}</span>
      <span className="value-number">
        {value}
        <span className="value-unit">{unit}</span>
      </span>
    </div>
  );
}

function PumpButton({
  zoneId,
  zones,
  busyZone,
  onTogglePump,
}: {
  zoneId: ZoneId;
  zones: Zone[];
  busyZone: ZoneId | null;
  onTogglePump: (zoneId: ZoneId) => void;
}) {
  const on = isPumpOn(zones, zoneId);
  const busy = busyZone === zoneId;

  return (
    <button
      type="button"
      className={`pump-state-button ${on ? 'is-on' : ''}`}
      aria-pressed={on}
      disabled={busy}
      onClick={() => onTogglePump(zoneId)}
      title="กดเพื่อเปิด–ปิดปั๊มน้ำ"
    >
      <span className="pump-state-dot" />
      {busy ? '...' : on ? 'ON' : 'OFF'}
      <span className="pump-state-caption">ปั๊มน้ำ</span>
    </button>
  );
}

function ZoneCard({
  index,
  title,
  subtitle,
  zoneId,
  zones,
  busyZone,
  onTogglePump,
  wide = false,
  children,
}: {
  index: number;
  title: string;
  subtitle: string;
  zoneId: ZoneId;
  zones: Zone[];
  busyZone: ZoneId | null;
  onTogglePump: (zoneId: ZoneId) => void;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <article className={`panel plant-card ${wide ? 'plant-wide' : ''}`}>
      <div className="plant-card-head">
        <span className="plant-index">{index}</span>
        <div>
          <h2>{title}</h2>
          <span>{subtitle}</span>
        </div>
      </div>

      <div className="plant-values">{children}</div>

      <PumpButton
        zoneId={zoneId}
        zones={zones}
        busyZone={busyZone}
        onTogglePump={onTogglePump}
      />
    </article>
  );
}

export default function Control({
  weather,
  waterTank,
  zones,
  busyZone,
  onTogglePump,
  lastUpdated,
  deviceOnline,
}: ControlProps) {
  const updatedLabel = lastUpdated.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <div className="page-content control-page">
      {/* ส่วนหัว */}
      <div className="page-heading-row">
        <div>
          <div className="eyebrow">OVERVIEW / MONITORING</div>
          <h1>ภาพรวมระบบ</h1>
          <p>ติดตามสภาพแวดล้อมและสถานะปั๊มน้ำของแต่ละแปลงพืช</p>
        </div>

        <div className="heading-right">
          <div className="updated-label">
            <RefreshCw size={14} />
            <span>อัปเดตล่าสุด {updatedLabel}</span>
          </div>

          <button
            className="outline-button"
            onClick={() => window.location.reload()}
          >
            <RefreshCw size={15} /> รีเฟรช
          </button>
        </div>
      </div>

      {/* แถวบน: อุณหภูมิ / ความชื้นรวม / ETo */}
      <div className="sensor-strip">
        <article className="metric-card">
          <div className="metric-top">
            <div className="metric-icon orange">
              <ThermometerSun size={19} strokeWidth={2} />
            </div>
          </div>
          <div className="metric-title">อุณหภูมิ</div>
          <div className="metric-value">
            {fmt(weather.temperatureC)}
            <span>°C</span>
          </div>
          <div className="metric-note">อุณหภูมิอากาศ</div>
        </article>

        <article className="metric-card">
          <div className="metric-top">
            <div className="metric-icon blue">
              <Droplets size={19} strokeWidth={2} />
            </div>
          </div>
          <div className="metric-title">ความชื้นรวม</div>
          <div className="metric-value">
            {fmt(weather.humidity)}
            <span>%</span>
          </div>
          <div className="metric-note">ความชื้นสัมพัทธ์</div>
        </article>

        <article className="metric-card">
          <div className="metric-top">
            <div className="metric-icon violet">
              <CloudSun size={19} strokeWidth={2} />
            </div>
          </div>
          <div className="metric-title">ETo</div>
          <div className="metric-value">
            {fmt(weather.etoMmPerDay)}
            <span>mm/วัน</span>
          </div>
          <div className="metric-note">ค่าการคายระเหยอ้างอิง</div>
        </article>
      </div>

      {/* ถังน้ำหลัก */}
      <WaterTankCard levelPercent={waterTank?.levelPercent ?? null} />

      {/* สถานะแปลงพืช */}
      <div className="plant-zones-heading">
        <div>
          <h2>สถานะแปลงพืช</h2>
          <p>ค่าที่วัดได้และสถานะปั๊มน้ำของแต่ละแปลง</p>
        </div>

        <div className="live-label">
          <span className="live-dot" /> {deviceOnline ? 'LIVE API' : 'OFFLINE'}
        </div>
      </div>

      <div className="plant-grid">
        <ZoneCard
          index={1}
          title="ไม้ล้มลุก"
          subtitle="Herbaceous · Soil water potential"
          zoneId="herb"
          zones={zones}
          busyZone={busyZone}
          onTogglePump={onTogglePump}
        >
          <ValueCard
            label="ความชื้นในดิน"
            value={fmt(getValue(zones, 'herb', 'soilWaterKpa'))}
            unit="kPa"
          />
        </ZoneCard>

        <ZoneCard
          index={2}
          title="นาข้าว"
          subtitle="Rice field · Reference evapotranspiration"
          zoneId="rice"
          zones={zones}
          busyZone={busyZone}
          onTogglePump={onTogglePump}
        >
          <ValueCard
            label="ETo"
            value={fmt(getValue(zones, 'rice', 'etoMmPerHour'), 2)}
            unit="mm/ชั่วโมง"
          />
        </ZoneCard>

        <ZoneCard
          index={3}
          title="ปอเทือง"
          subtitle="Sunn hemp · Soil temperature & humidity"
          zoneId="sunnhemp"
          zones={zones}
          busyZone={busyZone}
          onTogglePump={onTogglePump}
        >
          <ValueCard
            label="อุณหภูมิในดิน"
            value={fmt(getValue(zones, 'sunnhemp', 'soilTempC'))}
            unit="°C"
          />
          <ValueCard
            label="ความชื้น (Humidity)"
            value={fmt(getValue(zones, 'sunnhemp', 'soilHumidity'))}
            unit="%"
          />
        </ZoneCard>

        <ZoneCard
          index={4}
          title="ทานตะวัน"
          subtitle="Sunflower · Soil moisture"
          zoneId="sunflower"
          zones={zones}
          busyZone={busyZone}
          onTogglePump={onTogglePump}
        >
          <ValueCard
            label="ความชื้นในดิน"
            value={fmt(getValue(zones, 'sunflower', 'soilMoisturePercent'))}
            unit="%"
          />
        </ZoneCard>
      </div>

      {/* แปลงที่ 5 (การ์ดกว้าง) */}
      <ZoneCard
        index={5}
        title="ไม้กระถาง"
        subtitle="Potted plant · Soil water potential"
        zoneId="potted"
        zones={zones}
        busyZone={busyZone}
        onTogglePump={onTogglePump}
        wide
      >
        <ValueCard
          label="ความชื้นในดิน"
          value={fmt(getValue(zones, 'potted', 'soilWaterKpa'))}
          unit="kPa"
        />
      </ZoneCard>

      <div className="page-footnote">
        AgriFlow Dashboard <span>·</span> Prototype สำหรับพัฒนาและทดสอบระบบ IoT
      </div>
    </div>
  );
}
