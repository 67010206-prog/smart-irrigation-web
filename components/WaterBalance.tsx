import { Droplets, Waves } from 'lucide-react';

import {
  KP,
  MONTH_NAMES_TH,
  computeWaterBalance,
} from '../lib/irrigationPlan';

function fmt(value: number, digits = 1): string {
  return Number.isFinite(value) ? value.toFixed(digits) : '--';
}

function fmtInt(value: number): string {
  return Number.isFinite(value)
    ? Math.round(value).toLocaleString('th-TH')
    : '--';
}

/**
 * งบน้ำรายแปลง — ETo = Kp × Ep, ETc = Kc × ETo, ปริมาณน้ำ = mm × พื้นที่
 * แสดงต่อท้ายหน้า Control (Dashboard)
 */
export default function WaterBalance() {
  const monthIndex = new Date().getMonth();
  const rows = computeWaterBalance(monthIndex);

  const totals = rows.reduce(
    (acc, row) => ({
      area: acc.area + row.plot.areaM2,
      water: acc.water + row.waterLitersPerDay,
      capacity: acc.capacity + row.capacityLiters,
    }),
    { area: 0, water: 0, capacity: 0 }
  );

  return (
    <section className="water-balance">
      <div className="plant-zones-heading">
        <div>
          <h2>งบน้ำรายแปลง (Water Balance)</h2>
          <p>
            ความต้องการน้ำของพืชแต่ละแปลง เทียบกับความจุน้ำที่ดินอุ้มไว้ได้ ·
            เดือน{MONTH_NAMES_TH[monthIndex]}
          </p>
        </div>

        <div className="wb-badge">
          <Droplets size={14} />
          <span>
            รวม {fmtInt(totals.water)} ลิตร/วัน
          </span>
        </div>
      </div>

      <div className="wb-scroll">
        <table className="wb-table">
          <thead>
            <tr>
              <th>แปลง</th>
              <th>พื้นที่ (ตร.ม.)</th>
              <th>พืชที่ปลูก (Kc ระยะ mid)</th>
              <th>ETo (mm/วัน)</th>
              <th>ETc (mm/วัน)</th>
              <th>ความจุน้ำในดิน (mm)</th>
              <th>น้ำที่ต้องจ่าย (ลิตร/วัน)</th>
              <th>ความจุทั้งแปลง (ลิตร)</th>
              <th>น้ำพอใช้ (วัน)</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr key={row.plot.id}>
                <td>
                  <strong>{row.plot.name}</strong>
                  <span className="wb-sub">
                    {row.plot.soil} · อุ้มน้ำ {fmt(row.plot.waterHoldingMmPerCm, 2)}{' '}
                    มม./ซม. · รากเฉลี่ย {fmt(row.rootDepthCm, 0)} ซม.
                  </span>
                </td>
                <td>{fmt(row.plot.areaM2, 2)}</td>
                <td>
                  <span className="wb-plants">{row.plantNames}</span>
                  <span className="wb-sub">Kc เฉลี่ย {fmt(row.kcMid, 2)}</span>
                </td>
                <td>{fmt(row.etoMmPerDay, 2)}</td>
                <td>{fmt(row.etcMmPerDay, 2)}</td>
                <td>{fmt(row.capacityMm, 1)}</td>
                <td>
                  <strong>{fmtInt(row.waterLitersPerDay)}</strong>
                </td>
                <td>
                  <strong>{fmtInt(row.capacityLiters)}</strong>
                </td>
                <td>{fmt(row.daysOfWater, 1)}</td>
              </tr>
            ))}
          </tbody>

          <tfoot>
            <tr>
              <td>รวมทั้งระบบ</td>
              <td>{fmt(totals.area, 2)}</td>
              <td>—</td>
              <td>—</td>
              <td>—</td>
              <td>—</td>
              <td>
                <strong>{fmtInt(totals.water)}</strong>
              </td>
              <td>
                <strong>{fmtInt(totals.capacity)}</strong>
              </td>
              <td>—</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="wb-note">
        <Waves size={14} />
        <span>
          ETo = Kp × Ep (Kp = {KP.toFixed(2)}, Ep กรุงเทพฯ รายเดือน) · ETc = Kc ×
          ETo · ความจุน้ำในดิน = ค่าอุ้มน้ำ × ความลึกราก · 1 มม. บนพื้นที่ 1 ตร.ม. = 1
          ลิตร · Kc ที่ใช้เป็นค่าเฉลี่ยระยะ mid ของพืชในแปลง
        </span>
      </div>
    </section>
  );
}
