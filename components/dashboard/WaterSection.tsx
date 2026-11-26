import { Droplets, Power } from 'lucide-react';

import SectionHeader from './SectionHeader';
import WaterTankCard from '../WaterTank';
import WaterBalance from '../WaterBalance';

import type { WaterTank, Zone } from '../../lib/types/iot';

interface WaterSectionProps {
  waterTank: WaterTank | null;
  zones: Zone[];
  etoMmPerDay: number | null;
  rainfallMm: number | null;
}

/**
 * Section D — Water Resources & Irrigation
 * ระดับน้ำในถัง + สรุปการจ่ายน้ำรายแปลง + งบน้ำ
 */
export default function WaterSection({
  waterTank,
  zones,
  etoMmPerDay,
  rainfallMm,
}: WaterSectionProps) {
  const activeZones = zones.filter((zone) => zone.pumpOn).length;

  return (
    <section className="dash-section" aria-labelledby="water-resources">
      <SectionHeader
        eyebrow="Section D · Water Resources & Irrigation"
        title="ทรัพยากรน้ำและการจ่ายน้ำ"
        description="ปริมาณน้ำสำรองในถังหลัก สถานะวาล์วของทุกแปลง และงบน้ำรายวัน"
      >
        <div className={`dash-live ${activeZones > 0 ? 'is-online' : ''}`}>
          <i />
          {activeZones > 0 ? `${activeZones} แปลงกำลังรดน้ำ` : 'ไม่มีปั๊มทำงาน'}
        </div>
      </SectionHeader>

      <div className="water-grid">
        <WaterTankCard levelPercent={waterTank?.levelPercent ?? null} />

        <article className="panel water-status">
          <div className="water-status-head">
            <div>
              <span className="dash-eyebrow">IRRIGATION STATUS</span>
              <h3>สถานะการจ่ายน้ำ</h3>
            </div>

            <span className={`water-count ${activeZones > 0 ? 'is-on' : ''}`}>
              <Power size={13} />
              {activeZones}/{zones.length}
            </span>
          </div>

          <ul className="water-zone-list">
            {zones.map((zone) => (
              <li key={zone.id}>
                <span className={`water-dot ${zone.pumpOn ? 'is-on' : ''}`} />

                <div className="water-zone-copy">
                  <strong>{zone.name}</strong>
                  <span>Valve {zone.valveId ?? '-'}</span>
                </div>

                <span
                  className={`water-state ${zone.pumpOn ? 'is-on' : ''}`}
                >
                  {zone.pumpOn ? 'ON' : 'OFF'}
                </span>
              </li>
            ))}
          </ul>

          <p className="water-note">
            <Droplets size={13} />
            แปลงที่ใช้วาล์ว 4 ร่วมกันจะเปิด–ปิดพร้อมกันเพื่อไม่ให้ตัดน้ำแปลงอื่น
          </p>
        </article>
      </div>

      <WaterBalance etoMmPerDay={etoMmPerDay} rainfallMm={rainfallMm} />

      <h2 id="water-resources" className="sr-only">
        ทรัพยากรน้ำและการจ่ายน้ำ
      </h2>
    </section>
  );
}
