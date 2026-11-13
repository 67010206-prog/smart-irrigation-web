import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Droplets } from 'lucide-react';

// ค่าอ้างอิงของดิน (ปรับได้ตามชนิดดินจริง)
const FIELD_CAPACITY = 80; // ความจุสนาม (%)
const WILTING_POINT = 25; // จุดเหี่ยวเฉาถาวร (%)

/** ภาพจำลอง: ดินคือถังเก็บน้ำของพืช */
export default function SoilWaterTank() {
  const [moisture, setMoisture] = useState(55);

  // น้ำที่พืชใช้ได้ = ช่วงระหว่างจุดเหี่ยวเฉาถาวรถึงความจุสนาม
  const available = Math.round(
    ((moisture - WILTING_POINT) / (FIELD_CAPACITY - WILTING_POINT)) * 100
  );
  const usable = Math.max(0, Math.min(100, available));

  const status =
    moisture < WILTING_POINT
      ? {
          tone: 'danger',
          title: 'ต่ำกว่าจุดเหี่ยวเฉาถาวร',
          detail: 'พืชดูดน้ำจากดินไม่ได้แล้ว รดน้ำก็ไม่ฟื้น ต้องให้น้ำก่อนถึงจุดนี้',
        }
      : moisture < 40
        ? {
            tone: 'warn',
            title: 'ขาดน้ำ',
            detail: 'น้ำที่พืชใช้ได้เหลือน้อย ควรให้น้ำก่อนดินแห้งถึงจุดเหี่ยวเฉา',
          }
        : moisture <= FIELD_CAPACITY
          ? {
              tone: 'ok',
              title: 'ความชื้นเหมาะสม',
              detail: 'อยู่ในช่วงที่พืชดูดน้ำไปใช้ได้เต็มที่',
            }
          : {
              tone: 'warn',
              title: 'อิ่มน้ำเกินความจุสนาม',
              detail: 'น้ำส่วนเกินจะไหลซึมลึกลงดินหรือระบายออก และอาจทำให้รากขาดอากาศ',
            };

  return (
    <div className="sim-wrap">
      <p className="sim-lead">
        ดินเปรียบได้กับถังเก็บน้ำของพืช — เลื่อนแถบเพื่อดูว่าระดับน้ำในดินส่งผลต่อพืชอย่างไร
      </p>

      <div className="sim-tank-row">
        <div className="sim-tank" aria-hidden="true">
          <div
            className="sim-tank-fill"
            style={{ height: `${Math.max(0, Math.min(100, moisture))}%` }}
          />

          <span
            className="sim-tank-marker"
            style={{ bottom: `${FIELD_CAPACITY}%` }}
          >
            <em>ความจุสนาม {FIELD_CAPACITY}%</em>
          </span>

          <span
            className="sim-tank-marker danger"
            style={{ bottom: `${WILTING_POINT}%` }}
          >
            <em>จุดเหี่ยวเฉาถาวร {WILTING_POINT}%</em>
          </span>
        </div>

        <div className="sim-readout">
          <div className="sim-metrics">
            <div className="sim-metric">
              <span>ความชื้นในดิน</span>
              <strong>
                {moisture}
                <em>%</em>
              </strong>
            </div>

            <div className="sim-metric">
              <span>น้ำที่พืชใช้ได้</span>
              <strong>
                {usable}
                <em>%</em>
              </strong>
            </div>
          </div>

          <div className={`sim-status ${status.tone}`}>
            {status.tone === 'ok' ? (
              <CheckCircle2 size={17} />
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

      <label className="sim-range-row" htmlFor="soil-moisture">
        <span>
          <Droplets size={14} /> ระดับน้ำในดิน
        </span>
        <strong>{moisture}%</strong>
        <input
          id="soil-moisture"
          type="range"
          min="0"
          max="100"
          value={moisture}
          onChange={(event) => setMoisture(Number(event.target.value))}
        />
      </label>

      <p className="sim-note">
        จุดเหี่ยวเฉาถาวร (permanent wilting point) คือระดับที่พืชดูดน้ำไม่ได้อีกแล้ว
        ส่วนความจุสนาม (field capacity) คือระดับน้ำสูงสุดที่ดินอุ้มไว้ได้หลังน้ำซึมจนหยุด
        — ช่วงระหว่างสองค่านี้คือ “น้ำที่พืชใช้ได้” ซึ่งควรใช้กำหนดเกณฑ์เปิด–ปิดปั๊ม
      </p>
    </div>
  );
}
