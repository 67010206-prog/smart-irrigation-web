import type { ReactNode } from 'react';
import {
  AlertTriangle,
  CloudSun,
  Droplets,
  Gauge,
  RefreshCw,
  Sun,
  SunMedium,
  ThermometerSun,
  Wind,
} from 'lucide-react';

import WaterTankCard from './WaterTank';
import WaterBalance from './WaterBalance';
import PumpPauseAlert from './PumpPauseAlert';

import type {
  PumpAlert,
  WaterTank,
  Weather,
  Zone,
  ZoneId,
  ZoneValues,
} from '../lib/types/iot';
import { getZoneConfig } from '../lib/zoneConfig';

interface ControlProps {
  weather: Weather;
  waterTank: WaterTank | null;
  zones: Zone[];
  busyZone: ZoneId | null;
  onTogglePump: (zoneId: ZoneId, scope?: 'valve') => void;
  /** คำเตือนตอนสั่งปิดวาล์วที่แปลงอื่นยังใช้อยู่ */
  valveWarning?: { title: string; detail: string } | null;
  onDismissValveWarning?: () => void;
  lastUpdated: Date;
  deviceOnline: boolean;
  /** สถานะพักรดน้ำรอเติมน้ำจาก Pump Logic Engine */
  pumpAlert?: PumpAlert | null;
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
  scope,
}: {
  zoneId: ZoneId;
  zones: Zone[];
  busyZone: ZoneId | null;
  onTogglePump: (zoneId: ZoneId, scope?: 'valve') => void;
  scope?: 'valve';
}) {
  const on = isPumpOn(zones, zoneId);
  const busy = busyZone === zoneId;

  return (
    <button
      type="button"
      className={`pump-state-button ${on ? 'is-on' : ''}`}
      aria-pressed={on}
      disabled={busy}
      onClick={() => onTogglePump(zoneId, scope)}
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
  scope,
  wide = false,
  children,
}: {
  index: number;
  title: string;
  subtitle: string;
  zoneId: ZoneId;
  zones: Zone[];
  busyZone: ZoneId | null;
  onTogglePump: (zoneId: ZoneId, scope?: 'valve') => void;
  /** สั่งในนามของวาล์วทั้งตัว (แปลงที่ใช้วาล์วร่วมกัน) */
  scope?: 'valve';
  wide?: boolean;
  children: ReactNode;
}) {
  const { groupId, valveId } = getZoneConfig(zoneId);

  return (
    <article className={`panel plant-card ${wide ? 'plant-wide' : ''}`}>
      <div className="plant-card-head">
        <span className="plant-index">{index}</span>
        <div>
          <h2>{title}</h2>
          <span>{subtitle}</span>
          <span className="plant-valve">
            Valve {valveId} · {groupId}
          </span>
        </div>
      </div>

      <div className="plant-values">{children}</div>

      <PumpButton
        zoneId={zoneId}
        zones={zones}
        busyZone={busyZone}
        onTogglePump={onTogglePump}
        scope={scope}
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
  valveWarning,
  onDismissValveWarning,
  lastUpdated,
  deviceOnline,
  pumpAlert = null,
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

      {/* แจ้งเตือนเมื่อปั๊มพักรดน้ำรอน้ำ (พร้อมเวลาที่เหลือ) */}
      <PumpPauseAlert alert={pumpAlert} />

      {valveWarning && (
        <div className="notice-banner" role="alert">
          <div className="notice-icon">
            <AlertTriangle size={15} />
          </div>
          <div>
            <strong>{valveWarning.title}</strong>
            <span>{valveWarning.detail}</span>
          </div>
          {onDismissValveWarning && (
            <button
              type="button"
              className="outline-button"
              style={{ marginLeft: 'auto' }}
              onClick={onDismissValveWarning}
            >
              ปิดข้อความ
            </button>
          )}
        </div>
      )}

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

      {/* แถวสถานีอากาศ: ความกดอากาศ / แสง / ลม / รังสีดวงอาทิตย์ */}
      <div className="sensor-strip sensor-strip-4">
        <article className="metric-card">
          <div className="metric-top">
            <div className="metric-icon green">
              <Gauge size={19} strokeWidth={2} />
            </div>
          </div>
          <div className="metric-title">ความกดอากาศ</div>
          <div className="metric-value">
            {fmt(weather.pressureHpa ?? null)}
            <span>hPa</span>
          </div>
          <div className="metric-note">จากสถานีอากาศ</div>
        </article>

        <article className="metric-card">
          <div className="metric-top">
            <div className="metric-icon orange">
              <Sun size={19} strokeWidth={2} />
            </div>
          </div>
          <div className="metric-title">ความเข้มแสง</div>
          <div className="metric-value">
            {fmt(weather.lightLux ?? null, 0)}
            <span>lux</span>
          </div>
          <div className="metric-note">ความสว่างที่วัดได้</div>
        </article>

        <article className="metric-card">
          <div className="metric-top">
            <div className="metric-icon blue">
              <Wind size={19} strokeWidth={2} />
            </div>
          </div>
          <div className="metric-title">ความเร็วลม</div>
          <div className="metric-value">
            {fmt(weather.windMs ?? null)}
            <span>m/s</span>
          </div>
          <div className="metric-note">ที่ระดับใบพัดวัดลม</div>
        </article>

        <article className="metric-card">
          <div className="metric-top">
            <div className="metric-icon violet">
              <SunMedium size={19} strokeWidth={2} />
            </div>
          </div>
          <div className="metric-title">รังสีดวงอาทิตย์</div>
          <div className="metric-value">
            {fmt(weather.solarRadiationWm2 ?? null, 0)}
            <span>W/m²</span>
          </div>
          <div className="metric-note">ใช้คำนวณ ETo</div>
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

        {/* 3 แปลงที่ใช้วาล์ว 4 ร่วมกัน → การ์ดเดียว ปุ่มเดียว */}
        <ZoneCard
          index={3}
          title="แปลงดอกไม้รวม (Valve 4)"
          subtitle="ปอเทือง · ทานตะวัน · ไม้กระถาง — ใช้วาล์ว 4 ตัวเดียวกัน"
          zoneId="sunnhemp"
          zones={zones}
          busyZone={busyZone}
          onTogglePump={onTogglePump}
          scope="valve"
          wide
        >
          <ValueCard
            label="อุณหภูมิดิน · ปอเทือง"
            value={fmt(getValue(zones, 'sunnhemp', 'soilTempC'))}
            unit="°C"
          />
          <ValueCard
            label="ความชื้น · ปอเทือง"
            value={fmt(getValue(zones, 'sunnhemp', 'soilHumidity'))}
            unit="%"
          />
          <ValueCard
            label="ความชื้นในดิน · ทานตะวัน"
            value={fmt(getValue(zones, 'sunflower', 'soilMoisturePercent'))}
            unit="%"
          />
          <ValueCard
            label="ความชื้นในดิน · ไม้กระถาง"
            value={fmt(getValue(zones, 'potted', 'soilWaterKpa'))}
            unit="kPa"
          />
        </ZoneCard>
      </div>

      {/* งบน้ำรายแปลง (ท้าย Dashboard) */}
      <WaterBalance
        etoMmPerDay={weather.etoMmPerDay}
        rainfallMm={weather.rainfallMm ?? null}
      />

      <div className="page-footnote">
        AgriFlow Dashboard <span>·</span> Prototype สำหรับพัฒนาและทดสอบระบบ IoT
      </div>
    </div>
  );
}
