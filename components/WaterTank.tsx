import { AlertTriangle, CheckCircle2, Droplets, Waves } from 'lucide-react';

// เกณฑ์ระดับน้ำในถัง (ปรับได้)
const LOW_LEVEL = 40; // ต่ำกว่า 40% = ควรเตรียมเติมน้ำ
const CRITICAL_LEVEL = 20; // ต่ำกว่า 20% = วิกฤต

// ความจุถังน้ำ (ลิตร) — ใช้คำนวณปริมาณน้ำคงเหลือจาก %
const TANK_CAPACITY_LITERS = 3000;

/** 0.65 → "0.65" | 1 → "1.00" */
function ratioText(level: number): string {
  return (level / 100).toFixed(2);
}

/** 1950 → "1,950" */
function litersText(liters: number): string {
  return Math.round(liters).toLocaleString('en-US');
}

interface WaterTankCardProps {
  levelPercent: number | null;
}

function buildStatus(level: number | null) {
  if (level === null) {
    return {
      tone: 'neutral' as const,
      label: 'ไม่มีข้อมูล',
      title: 'ยังไม่ได้รับค่าระดับน้ำในถัง',
      detail: 'ส่งค่าเข้ามาที่ /api/sensors/telemetry ด้วยฟิลด์ waterTankPercent',
    };
  }

  if (level < CRITICAL_LEVEL) {
    return {
      tone: 'danger' as const,
      label: 'วิกฤต',
      title: 'น้ำในถังใกล้หมด',
      detail: 'หยุดจ่ายน้ำชั่วคราวและเติมน้ำเขาถังก่อน ไม่งั้นปั๊มจะดูดอากาศเข้าไป',
    };
  }

  if (level < LOW_LEVEL) {
    return {
      tone: 'warn' as const,
      label: 'ต่ำ',
      title: 'น้ำในถังต่ำกว่าเกณฑ์',
      detail: 'เตรียมเติมน้ำ และหลีกเลี่ยงการเปิดปั๊มหลายแปลงพร้อมกัน',
    };
  }

  return {
    tone: 'ok' as const,
    label: 'ปกติ',
    title: 'ระดับน้ำในถังอยู่ในเกณฑ์',
    detail: 'น้ำสำรองเพียงพอต่อการจ่ายให้ทุกแปลงในรอบถัดไป',
  };
}

/** การ์ดถังน้ำหลัก — กราฟฟิกแบบเดียวกับถังในหน้า Docs */
export default function WaterTankCard({ levelPercent }: WaterTankCardProps) {
  const level =
    levelPercent === null || !Number.isFinite(levelPercent)
      ? null
      : Math.max(0, Math.min(100, levelPercent));

  const status = buildStatus(level);

  // 0.65 × 3,000 L = 1,950 L
  const liters = level === null ? null : (level / 100) * TANK_CAPACITY_LITERS;

  return (
    <article className="panel tank-panel">
      <div className="plant-card-head">
        <span className="plant-index">
          <Droplets size={14} />
        </span>

        <div>
          <h2>ถังน้ำหลัก</h2>
          <span>Water tank · ระดับน้ำสำรองสำหรับจ่ายให้ทุกแปลง</span>
        </div>

        <span className={`status-chip tank-chip status-${status.tone}`}>
          <span />
          {status.label}
        </span>
      </div>

      <div className="sim-tank-row tank-row">
        <div className="sim-tank tank-visual" aria-hidden="true">
          <div
            className="sim-tank-fill"
            style={{ height: `${level ?? 0}%` }}
          />

          <span
            className="sim-tank-marker"
            style={{ bottom: `${LOW_LEVEL}%` }}
          >
            <em>ระดับเตือน {LOW_LEVEL}%</em>
          </span>

          <span
            className="sim-tank-marker danger"
            style={{ bottom: `${CRITICAL_LEVEL}%` }}
          >
            <em>ระดับวิกฤต {CRITICAL_LEVEL}%</em>
          </span>
        </div>

        <div className="sim-readout">
          <div className="sim-metrics">
            <div className="sim-metric">
              <span>น้ำในถัง</span>
              <strong>
                {level === null ? '--' : Math.round(level)}
                <em>%</em>
              </strong>
            </div>

            <div className="sim-metric">
              <span>สถานะถัง</span>
              <strong>
                {status.label}
                <em>ปัจจุบัน</em>
              </strong>
            </div>
          </div>

          <div className={`sim-status ${status.tone === 'ok' ? '' : status.tone}`}>
            {status.tone === 'ok' ? (
              <CheckCircle2 size={17} />
            ) : status.tone === 'neutral' ? (
              <Waves size={17} />
            ) : (
              <AlertTriangle size={17} />
            )}
            <div>
              <strong>{status.title}</strong>
              <span>{status.detail}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ผลการคำนวณ: 0.65 × 3,000 L = 1,950 L */}
      <div className="tank-math">
        <span className="tank-math-label">
          <Waves size={13} /> น้ำคงเหลือในถัง
        </span>

        <span className="tank-math-formula">
          {level === null ? '--' : ratioText(level)} ×{' '}
          {TANK_CAPACITY_LITERS.toLocaleString('en-US')} L
        </span>

        <span className="tank-math-eq">=</span>

        <strong className="tank-math-result">
          {liters === null ? '--' : litersText(liters)} <em>L</em>
        </strong>
      </div>
    </article>
  );
}
