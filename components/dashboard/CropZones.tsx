import { Power } from 'lucide-react';

import SectionHeader from './SectionHeader';

import type { Zone, ZoneId, ZoneValues } from '../../lib/types/iot';
import { getZoneConfig } from '../../lib/zoneConfig';

interface CropZonesProps {
  zones: Zone[];
  busyZone: ZoneId | null;
  onTogglePump: (zoneId: ZoneId, scope?: 'valve') => void;
  etoMmPerDay: number | null;
}

type CropTone = 'ok' | 'warn' | 'watering' | 'idle';

interface CropMetric {
  label: string;
  value: string;
  unit: string;
}

function getZone(zones: Zone[], id: ZoneId): Zone | undefined {
  return zones.find((zone) => zone.id === id);
}

function getValue(
  zones: Zone[],
  id: ZoneId,
  key: keyof ZoneValues
): number | null {
  const value = getZone(zones, id)?.values[key];

  return typeof value === 'number' ? value : null;
}

function fmt(value: number | null, digits = 1): string {
  return value === null ? '--' : value.toFixed(digits);
}

function anyPumpOn(zones: Zone[], ids: ZoneId[]): boolean {
  return ids.some((id) => getZone(zones, id)?.pumpOn === true);
}

function cropStatus(
  pumpOn: boolean,
  dry: boolean,
  hasData: boolean
): { tone: CropTone; label: string } {
  if (pumpOn) return { tone: 'watering', label: 'กำลังรดน้ำ' };
  if (!hasData) return { tone: 'idle', label: 'รอข้อมูล' };
  if (dry) return { tone: 'warn', label: 'ต้องการน้ำ' };

  return { tone: 'ok', label: 'ปกติ' };
}

function CropCard({
  badge,
  name,
  english,
  image,
  valveId,
  status,
  metrics,
  pumpOn,
  busy,
  wide = false,
  onToggle,
}: {
  badge: string;
  name: string;
  english: string;
  image: string;
  valveId: number;
  status: { tone: CropTone; label: string };
  metrics: CropMetric[];
  pumpOn: boolean;
  busy: boolean;
  wide?: boolean;
  onToggle: () => void;
}) {
  return (
    <article className={`crop-card ${wide ? 'crop-wide' : ''}`}>
      <div
        className="crop-photo"
        style={{ backgroundImage: `url(${image})` }}
        role="img"
        aria-label={name}
      >
        <span className="crop-badge">{badge}</span>
        <span className={`crop-status is-${status.tone}`}>
          <i />
          {status.label}
        </span>
      </div>

      <div className="crop-body">
        <div className="crop-head">
          <div>
            <h3>{name}</h3>
            <p>{english}</p>
          </div>
          <span className="crop-valve">Valve {valveId}</span>
        </div>

        <div className="crop-values">
          {metrics.map((metric) => (
            <div className="crop-metric" key={metric.label}>
              <span>{metric.label}</span>
              <strong>
                {metric.value}
                {metric.unit ? <em>{metric.unit}</em> : null}
              </strong>
            </div>
          ))}
        </div>

        <div className="crop-action">
          <button
            type="button"
            className={`crop-pump ${pumpOn ? 'is-on' : ''}`}
            aria-pressed={pumpOn}
            disabled={busy}
            onClick={onToggle}
          >
            <Power size={15} strokeWidth={2.2} />
            {busy ? 'กำลังสั่ง…' : pumpOn ? 'ปิดปั๊มน้ำ' : 'เปิดปั๊มน้ำ'}
          </button>
        </div>
      </div>
    </article>
  );
}

/**
 * Section C — Crop Monitoring
 * 2 การ์ดบน (ไม้ยืนต้น / นาข้าว) + 1 การ์ดกว้างด้านล่าง (แปลงดอกไม้)
 */
export default function CropZones({
  zones,
  busyZone,
  onTogglePump,
  etoMmPerDay,
}: CropZonesProps) {
  const soilKpa = getValue(zones, 'herb', 'soilWaterKpa');
  const riceEto = getValue(zones, 'rice', 'etoMmPerHour');
  const soilTemp = getValue(zones, 'sunnhemp', 'soilTempC');
  const soilHumidity = getValue(zones, 'sunnhemp', 'soilHumidity');
  const sunflowerMoisture = getValue(zones, 'sunflower', 'soilMoisturePercent');
  const pottedKpa = getValue(zones, 'potted', 'soilWaterKpa');

  const zoneOneOn = anyPumpOn(zones, ['herb']);
  const zoneTwoOn = anyPumpOn(zones, ['rice']);
  const zoneThreeOn = anyPumpOn(zones, ['sunnhemp', 'sunflower', 'potted']);

  const statusOne = cropStatus(zoneOneOn, (soilKpa ?? 0) > 60, soilKpa !== null);
  const statusTwo = cropStatus(zoneTwoOn, (riceEto ?? 0) > 0.6, riceEto !== null);
  const statusThree = cropStatus(
    zoneThreeOn,
    sunflowerMoisture !== null && sunflowerMoisture < 35,
    sunflowerMoisture !== null ||
      soilTemp !== null ||
      soilHumidity !== null ||
      pottedKpa !== null
  );

  return (
    <section className="dash-section" aria-labelledby="crop-monitoring">
      <SectionHeader
        eyebrow="Section C · Crop Monitoring"
        title="ติดตามสถานะแปลงพืช"
        description="ค่าความชื้น/อุณหภูมิดินและสถานะการให้น้ำของแต่ละแปลง"
      />

      <div className="crop-grid">
        <CropCard
          badge="Zone 1"
          name="ไม้ยืนต้น"
          english="Perennial orchard · ไม้อายุยืน"
          image="/images/zone-perennial.jpg"
          valveId={getZoneConfig('herb').valveId}
          status={statusOne}
          pumpOn={zoneOneOn}
          busy={busyZone === 'herb'}
          onToggle={() => onTogglePump('herb')}
          metrics={[
            {
              label: 'ความชื้นในดิน',
              value: fmt(soilKpa),
              unit: 'kPa',
            },
          ]}
        />

        <CropCard
          badge="Zone 2"
          name="นาข้าว"
          english="Rice paddy · แปลงข้าว"
          image="/images/zone-rice.jpg"
          valveId={getZoneConfig('rice').valveId}
          status={statusTwo}
          pumpOn={zoneTwoOn}
          busy={busyZone === 'rice'}
          onToggle={() => onTogglePump('rice')}
          metrics={[
            {
              label: 'ETo รายชั่วโมง',
              value: fmt(riceEto, 2),
              unit: 'mm/ชม.',
            },
            {
              label: 'ETo วันนี้',
              value: fmt(etoMmPerDay, 2),
              unit: 'mm/วัน',
            },
          ]}
        />

        <CropCard
          badge="Zone 3"
          name="แปลงดอกไม้"
          english="Flower garden · ปอเทือง / ทานตะวัน / ไม้กระถาง"
          image="/images/zone-flowers.jpg"
          valveId={getZoneConfig('sunnhemp').valveId}
          status={statusThree}
          pumpOn={zoneThreeOn}
          busy={busyZone === 'sunnhemp'}
          wide
          onToggle={() => onTogglePump('sunnhemp', 'valve')}
          metrics={[
            {
              label: 'อุณหภูมิดิน · ปอเทือง',
              value: fmt(soilTemp),
              unit: '°C',
            },
            {
              label: 'ความชื้นดิน · ปอเทือง',
              value: fmt(soilHumidity),
              unit: '%',
            },
            {
              label: 'ความชื้นดิน · ทานตะวัน',
              value: fmt(sunflowerMoisture),
              unit: '%',
            },
            {
              label: 'ความชื้นดิน · ไม้กระถาง',
              value: fmt(pottedKpa),
              unit: 'kPa',
            },
          ]}
        />
      </div>

      <h2 id="crop-monitoring" className="sr-only">
        ติดตามสถานะแปลงพืช
      </h2>
    </section>
  );
}
