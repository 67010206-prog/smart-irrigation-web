import { useState } from 'react';
import { Ruler, TriangleAlert } from 'lucide-react';

// ค่าคงที่ของการวาด (พิกเซลต่อเมตร)
const SCALE = 55;
const GROUND_A_Y = 195;

/** ภาพจำลอง: หาความต่างระดับด้วยกล้องระดับ (leveling instrument) */
export default function LevelingInstrument() {
  const [backSight, setBackSight] = useState(1.25); // ไม้หลัง (จุด A)
  const [foreSight, setForeSight] = useState(1.05); // ไม้หน้า (จุด B)
  const [elevationA, setElevationA] = useState(100); // ระดับอ้างอิงจุด A (ม.)

  // ΔH = ไม้หลัง − ไม้หน้า
  const difference = backSight - foreSight;
  const elevationB = elevationA + difference;

  // ตำแหน่งเส้นสายตา (ค่าสูงคงที่ทั้งสองจุด — นี่คือหัวใจของกล้องระดับ)
  const lineOfSightY = GROUND_A_Y - backSight * SCALE;
  const groundBY = GROUND_A_Y - difference * SCALE;

  return (
    <div className="sim-wrap">
      <p className="sim-lead">
        กล้องระดับไม่ต้องตั้งให้ตรงจุดใดจุดหนึ่ง แต่เล็งเส้นสายตาเดียวกันไปที่ไม้ระดับทั้งสองต้น
        แล้วนำค่าที่อ่านได้มาหาความต่างระดับ
      </p>

      <svg
        className="sim-svg"
        viewBox="0 0 470 250"
        role="img"
        aria-label="ภาพจำลองการหาค่าระดับด้วยกล้องระดับ"
      >
        {/* ผิวดินสองฝั่ง */}
        <rect x="30" y={GROUND_A_Y} width="150" height="55" fill="#7a5c3e" />
        <rect x="290" y={groundBY} width="150" height={250 - groundBY} fill="#7a5c3e" />

        {/* เส้นสายตา */}
        <line
          x1="30"
          x2="440"
          y1={lineOfSightY}
          y2={lineOfSightY}
          stroke="#3b8fd9"
          strokeWidth="2"
          strokeDasharray="7 5"
        />
        <text x="34" y={lineOfSightY - 7} fill="#3b8fd9" fontSize="10">
          เส้นสายตา (ระดับเดียวกัน)
        </text>

        {/* ไม้ระดับ A */}
        <line
          x1="100"
          x2="100"
          y1={GROUND_A_Y}
          y2={lineOfSightY}
          stroke="#e24b4a"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <text x="108" y={lineOfSightY + 13} fontSize="10" fill="#a3564f">
          ไม้หลัง {backSight.toFixed(2)} ม.
        </text>

        {/* ไม้ระดับ B */}
        <line
          x1="360"
          x2="360"
          y1={groundBY}
          y2={lineOfSightY}
          stroke="#e24b4a"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <text x="268" y={lineOfSightY + 13} fontSize="10" fill="#a3564f">
          ไม้หน้า {foreSight.toFixed(2)} ม.
        </text>

        {/* กล้องระดับ */}
        <g stroke="#444441" strokeWidth="2" fill="none">
          <line x1="230" x2="205" y1="205" y2={GROUND_A_Y + 32} />
          <line x1="230" x2="255" y1="205" y2={GROUND_A_Y + 32} />
          <line x1="230" x2="230" y1="205" y2={GROUND_A_Y + 32} />
          <rect x="214" y="196" width="32" height="12" rx="3" fill="#444441" />
        </g>

        {/* จุด A / B */}
        <text x="100" y={GROUND_A_Y + 70} textAnchor="middle" fontSize="12" fill="#f0efec">
          A
        </text>
        <text x="360" y={groundBY + 70} textAnchor="middle" fontSize="12" fill="#f0efec">
          B
        </text>
      </svg>

      <div className="sim-controls">
        <label className="sim-range-row" htmlFor="back-sight">
          <span>
            <Ruler size={14} /> ไม้หลัง (จุด A)
          </span>
          <strong>{backSight.toFixed(2)} ม.</strong>
          <input
            id="back-sight"
            type="range"
            min="0.5"
            max="2.5"
            step="0.05"
            value={backSight}
            onChange={(event) => setBackSight(Number(event.target.value))}
          />
        </label>

        <label className="sim-range-row" htmlFor="fore-sight">
          <span>
            <Ruler size={14} /> ไม้หน้า (จุด B)
          </span>
          <strong>{foreSight.toFixed(2)} ม.</strong>
          <input
            id="fore-sight"
            type="range"
            min="0.5"
            max="2.5"
            step="0.05"
            value={foreSight}
            onChange={(event) => setForeSight(Number(event.target.value))}
          />
        </label>

        <label className="sim-range-row" htmlFor="elevation-a">
          <span>ระดับจุด A</span>
          <strong>{elevationA.toFixed(2)} ม.</strong>
          <input
            id="elevation-a"
            type="range"
            min="90"
            max="110"
            step="0.5"
            value={elevationA}
            onChange={(event) => setElevationA(Number(event.target.value))}
          />
        </label>
      </div>

      <div className="sim-metrics">
        <div className="sim-metric">
          <span>ΔH = ไม้หลัง − ไม้หน้า</span>
          <strong>
            {difference >= 0 ? '+' : ''}
            {difference.toFixed(2)}
            <em>ม.</em>
          </strong>
        </div>

        <div className="sim-metric">
          <span>ระดับจุด B</span>
          <strong>
            {elevationB.toFixed(2)}
            <em>ม.</em>
          </strong>
        </div>
      </div>

      <div className={`sim-status ${difference === 0 ? 'ok' : 'neutral'}`}>
        <TriangleAlert size={17} />
        <div>
          <strong>
            {difference > 0
              ? 'จุด B สูงกว่าจุด A'
              : difference < 0
                ? 'จุด B ต่ำกว่าจุด A'
                : 'จุด A และ B ระดับเดียวกัน'}
          </strong>
          <span>
            ระดับ B = ระดับ A + ΔH = {elevationA.toFixed(2)}{' '}
            {difference >= 0 ? '+' : '−'} {Math.abs(difference).toFixed(2)} ={' '}
            {elevationB.toFixed(2)} ม.
          </span>
        </div>
      </div>

      <p className="sim-note">
        ใช้หลักการนี้ปรับพื้นที่แปลงให้เรียบก่อนติดตั้งระบบน้ำหยด เพราะน้ำจะไหลไปกองที่จุดต่ำ
        ทำให้ต้นไม้ได้น้ำไม่เท่ากัน — ยิ่งค่าความต่างระดับมาก ยิ่งต้องแบ่งโซนหรือติดตั้งตัวปรับแรงดัน
      </p>
    </div>
  );
}
