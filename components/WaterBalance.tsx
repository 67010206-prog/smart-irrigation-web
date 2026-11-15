import { CloudRain, Droplets, Waves } from 'lucide-react';

import { EFFECTIVE_RAIN_FACTOR, computeWaterBalance } from '../lib/irrigationPlan';

function fmt(value: number | null, digits = 2): string {
  return value === null || !Number.isFinite(value) ? '--' : value.toFixed(digits);
}

function fmtInt(value: number | null): string {
  return value === null || !Number.isFinite(value)
    ? '--'
    : Math.round(value).toLocaleString('th-TH');
}

interface WaterBalanceProps {
  /** ETo จากสถานีอากาศ (mm/วัน) */
  etoMmPerDay: number | null;
  /** น้ำฝนของวัน (mm) */
  rainfallMm: number | null;
}

/**
 * งบน้ำรายแปลง — น้ำที่ต้องจ่าย = ((ETo × Kc) − (น้ำฝน × 0.70)) × Area
 * แสดงต่อท้ายหน้า Control (Dashboard)
 */
export default function WaterBalance({ etoMmPerDay, rainfallMm }: WaterBalanceProps) {
  const rows = computeWaterBalance(etoMmPerDay, rainfallMm);

  const totalLiters = rows.every((row) => row.waterLitersPerDay === null)
    ? null
    : rows.reduce((sum, row) => sum + (row.waterLitersPerDay ?? 0), 0);

  const effectiveRain = rows[0]?.effectiveRainMm ?? 0;

  return (
    <section className="water-balance">
      <div className="plant-zones-heading">
        <div>
          <h2>งบน้ำรายแปลง (Water Balance)</h2>
          <p>
            น้ำที่ต้องจ่าย = ((ETo × Kc) − (น้ำฝน × {EFFECTIVE_RAIN_FACTOR.toFixed(2)})) ×
            พื้นที่ · ETo จากสถานีอากาศ (FAO-56 Penman–Monteith)
          </p>
        </div>

        <div className="wb-badge">
          <Droplets size={14} />
          <span>รวม {fmtInt(totalLiters)} ลิตร/วัน</span>
        </div>
      </div>

      <div className="wb-stats">
        <div className="wb-stat">
          <span>ETo วันนี้ (สถานีอากาศ)</span>
          <strong>{fmt(etoMmPerDay)} mm/วัน</strong>
        </div>
        <div className="wb-stat">
          <span>
            <CloudRain size={13} /> น้ำฝนวันนี้
          </span>
          <strong>{fmt(rainfallMm, 1)} mm</strong>
        </div>
        <div className="wb-stat">
          <span>น้ำฝนใช้การได้ (×{EFFECTIVE_RAIN_FACTOR.toFixed(2)})</span>
          <strong>{fmt(effectiveRain, 2)} mm</strong>
        </div>
      </div>

      <div className="wb-scroll">
        <table className="wb-table">
          <thead>
            <tr>
              <th>แปลง</th>
              <th>Area (ตร.ม.)</th>
              <th>Kc</th>
              <th>พืชใช้น้ำได้ (mm)</th>
              <th>ETc = Kc × ETo (mm/วัน)</th>
              <th>น้ำที่ต้องจ่าย (ลิตร/วัน)</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr key={row.plot.id}>
                <td>
                  <strong>{row.plot.name}</strong>
                  <span className="wb-sub">
                    {row.plot.soil} · อุ้มน้ำ {row.plot.waterHoldingMmPerCm.toFixed(2)}{' '}
                    มม./ซม. × ราก {row.plot.rootDepthCm.toFixed(0)} ซม.
                  </span>
                  <span className="wb-sub">{row.plot.plants}</span>
                </td>
                <td>{row.plot.areaM2.toFixed(3)}</td>
                <td>{row.plot.kc.toFixed(2)}</td>
                <td>{fmt(row.capacityMm, 1)}</td>
                <td>{fmt(row.etcMmPerDay)}</td>
                <td>
                  <strong>{fmtInt(row.waterLitersPerDay)}</strong>
                  <span className="wb-sub">
                    {fmt(row.waterMmPerDay)} mm/วัน
                  </span>
                </td>
              </tr>
            ))}
          </tbody>

          <tfoot>
            <tr>
              <td>รวมทั้งระบบ</td>
              <td>{rows.reduce((sum, row) => sum + row.plot.areaM2, 0).toFixed(3)}</td>
              <td>—</td>
              <td>—</td>
              <td>—</td>
              <td>
                <strong>{fmtInt(totalLiters)}</strong>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="wb-note">
        <Waves size={14} />
        <span>
          ETo รับจาก <code>/api/sensors/telemetry</code> (ฟิลด์ <code>etoMmPerDay</code>) ·
          น้ำฝนรับจากฟิลด์ <code>rainfallMm</code> · พืชใช้น้ำได้ = ค่าอุ้มน้ำของดิน ×
          ความลึกราก · 1 มม. บนพื้นที่ 1 ตร.ม. = 1 ลิตร · ถ้า ETc น้อยกว่าน้ำฝนใช้การได้
          จะแสดง 0 ลิตร
        </span>
      </div>
    </section>
  );
}
