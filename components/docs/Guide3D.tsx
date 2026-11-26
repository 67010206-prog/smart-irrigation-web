'use client';

/**
 * บทเรียน "พืช 3 มิติ" — เนื้อหาสื่อการสอนที่ผูกกับโมเดล Three.js และค่าจริงของแต่ละแปลง
 * ตัวเลขทั้งหมดอ่านจาก lib/irrigationPlan.ts ไม่ได้พิมพ์ซ้ำแบบมือ
 */

import { Boxes, Droplets, Info, Layers, Ruler, ShieldAlert } from 'lucide-react';

import PlotShowcase from '../three/PlotShowcase';
import { PLOTS, EFFECTIVE_RAIN_FACTOR } from '../../lib/irrigationPlan';

/** ตัวอย่างการคำนวณ: ETo 4.2 มม./วัน และไม่มีฝน */
const EXAMPLE_ETO = 4.2;

function num(value: number, digits = 2): string {
  return value.toLocaleString('th-TH', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

const EXAMPLE_ROWS = PLOTS.map((plot) => {
  const etc = EXAMPLE_ETO * plot.kc;
  const capacityMm = plot.waterHoldingMmPerCm * plot.rootDepthCm;

  return {
    plot,
    etc,
    capacityMm,
    liters: etc * plot.areaM2,
  };
});

const TOTAL_LITERS = EXAMPLE_ROWS.reduce((sum, row) => sum + row.liters, 0);

export default function Guide3D() {
  return (
    <>
      <p className="article-lead">
        บทเรียนนี้ใช้โมเดล 3 มิติของพืชแต่ละแปลงเป็นสื่อการสอน — ผู้เรียนเห็นรูปร่างของพืช
        แล้วต่อยอดไปสู่คำถามที่วัดได้จริง: พืชต้นนี้กินน้ำเท่าไร ดินเก็บน้ำได้แค่ไหน
        และระบบต้องจ่ายน้ำวันละกี่ลิตร
      </p>

      <div className="intro-highlight">
        <div className="intro-highlight-icon">
          <Boxes size={22} />
        </div>
        <div>
          <strong>ทำไมต้องเป็นโมเดลที่เขียนด้วยโค้ด</strong>
          <p>
            โมเดลทั้งสามสร้างจาก primitive, ribbon geometry และ InstancedMesh ในไฟล์{' '}
            <code>lib/three/plants.ts</code> — ไม่มีไฟล์ .glb/.obj ไม่มี texture รูปถ่าย
            จึงไม่มีพื้นหลังต้องลบ ไม่ต้องโหลด asset จากภายนอก และคืนหน่วยความจำทิ้งเมื่อออกจากหน้า
          </p>
        </div>
      </div>

      <h3>
        <Layers size={14} /> 1. โมเดล 3 มิติของแต่ละแปลง
      </h3>

      <p>
        รูปอ้างอิงที่ใช้มีสามแบบ: แปลงไม้ยืนต้น (ต้นไม้เรียงแถว), แปลงข้าว และแปลงไม้ดอกสีเหลือง
        แต่ละแบบถูกแปลงเป็น &quot;spec&quot; แล้วประกอบขึ้นใหม่จากชิ้นส่วนเรขาคณิต
        ตามลำดับเดียวกับแนวทาง img2threejs — blockout → structural → form → material → optimize
      </p>

      <PlotShowcase compact />

      <h3>
        <Ruler size={14} /> 2. อ่านตัวเลขบนการ์ดให้เป็น
      </h3>

      <div className="topic-table">
        {PLOTS.map((plot) => {
          const capacityMm = plot.waterHoldingMmPerCm * plot.rootDepthCm;

          return (
            <div key={plot.id}>
              <code>{plot.name}</code>
              <span>
                {num(plot.areaM2, 1)} ตร.ม. · Kc {plot.kc.toFixed(2)} · ความจุน้ำในดิน{' '}
                {num(capacityMm, 0)} มม. ({num((capacityMm * plot.areaM2) / 1000, 1)} ลบ.ม.)
              </span>
            </div>
          );
        })}
      </div>

      <p>
        <strong>ความจุน้ำในดิน</strong> = ค่าอุ้มน้ำของดิน (มม./ซม.) × ความลึกราก (ซม.)
        เป็นปริมาณน้ำที่ดินในบริเวณรากเก็บไว้ได้ทั้งหมด — ไม่ใช่ปริมาณที่ต้องจ่ายทุกวัน
        ระบบจะจ่ายเฉพาะส่วนที่พืชใช้ไปจริง (ETc) หักน้ำฝนใช้การได้
      </p>

      <h3>
        <Droplets size={14} /> 3. จากโมเดลสู่การคำนวณน้ำรายวัน
      </h3>

      <p>
        สูตรที่ระบบใช้คือ{' '}
        <strong>
          น้ำที่ต้องจ่าย (ลิตร/วัน) = ((ETo × Kc) − (น้ำฝน × {EFFECTIVE_RAIN_FACTOR.toFixed(2)})) × พื้นที่
        </strong>{' '}
        โดย ETo คือค่าการคายระเหยอ้างอิงจากสถานีอากาศ (FAO-56) และ Kc คือสัมประสิทธิ์พืชของแปลง
      </p>

      <div className="topic-table">
        {EXAMPLE_ROWS.map((row) => (
          <div key={row.plot.id}>
            <code>{row.plot.name}</code>
            <span>
              ETc = {row.plot.kc.toFixed(2)} × {num(EXAMPLE_ETO, 1)} = {num(row.etc)} มม./วัน →
              จ่าย {num(row.liters, 0)} ลิตร/วัน
            </span>
          </div>
        ))}
        <div>
          <code>รวมทั้งระบบ</code>
          <span>
            {num(TOTAL_LITERS, 0)} ลิตร/วัน (ตัวอย่างที่ ETo {num(EXAMPLE_ETO, 1)} มม./วัน
            และไม่มีฝน)
          </span>
        </div>
      </div>

      <div className="doc-callout">
        <Info size={16} />
        <div>
          <strong>1 มิลลิเมตร บนพื้นที่ 1 ตารางเมตร = 1 ลิตร</strong>
          <p>
            ตัวคูณนี้ทำให้แปลงมิลลิเมตรเป็นลิตรได้ตรง ๆ และเป็นเหตุผลว่าทำไมแปลงไม้ยืนต้น
            (พื้นที่ใหญ่ที่สุด) จึงใช้ตัวเลขลิตรสูงที่สุดเสมอ แม้ค่า ETc ต่อพื้นที่ต่ำกว่าแปลงข้าว
          </p>
        </div>
      </div>

      <h3>4. สอนอะไรได้จากโมเดลนี้</h3>

      <ul>
        <li>
          <strong>ส่วนของพืช:</strong> กอข้าวและรวง (แปลง 2), ลำต้น–กิ่ง–เรือนยอดของไม้ยืนต้น
          (แปลง 1), ใบกว้างและดอกจาน (แปลง 3) — ใช้ถามว่ารากกินน้ำจากชั้นดินลึกเท่าไร
        </li>
        <li>
          <strong>Kc ไม่ใช่ค่าคงที่ของพืชทุกชนิด:</strong> แปลงข้าว Kc 1.20 สูงกว่าแปลงไม้ยืนต้น
          0.81 เพราะข้าวเป็นพืชล้มลุกที่มีใบปกคลุมเต็มพื้นที่และมีผิวนาเปิดให้น้ำระเหย
        </li>
        <li>
          <strong>ดินคือถังพัก:</strong> ความจุน้ำในดินคือเพดานของน้ำที่เก็บได้ ถ้า ETc สูงต่อเนื่อง
          ระบบต้องเติมให้ทันก่อนดินหมด — ไม่งั้นพืชเริ่มเครียดน้ำก่อนถึงจุดเหี่ยวถาวร
        </li>
        <li>
          <strong>ผลของฝน:</strong> ฝน 10 มม. ใช้ได้จริง {10 * EFFECTIVE_RAIN_FACTOR} มม.
          ส่วนที่เหลือซึมลึกหรือไหลบ่า ระบบจึงหักแค่ 70%
        </li>
      </ul>

      <h3>5. จุดที่ต้องตรวจก่อนใช้สอนจริง</h3>

      <div className="checklist-doc">
        <div>
          <ShieldAlert size={15} />
          <span>
            แปลง 3 ระบุพืชว่า &quot;ทานตะวัน · ปอเทือง&quot; แต่ภาพอ้างอิงที่แนบมาเป็นดอกเล็กสีเหลือง
            ต่างชนิดกัน จึงยังไม่ยืนยันชนิดพืชจากภาพ — โมเดลใช้ชื่อกลาง ๆ ว่า
            &quot;ไม้ดอกเหลือง&quot; และยึดรายชื่อพืชตามข้อมูลในระบบ
          </span>
        </div>
        <div>
          <ShieldAlert size={15} />
          <span>
            Kc ของแปลงไม้ยืนต้น (0.81) และความลึกราก 166 ซม. ทำให้ความจุน้ำในดินสูงถึง ~905 มม.
            ควรยืนยันว่าเป็นความลึกของ &quot;รากที่ดูดน้ำจริง&quot; ไม่ใช่ความลึกหน้าดินทั้งชั้น
            ก่อนนำไปใช้เป็นตัวเลขสอน
          </span>
        </div>
        <div>
          <ShieldAlert size={15} />
          <span>
            ETo ที่สถานีวัดได้เป็นค่าอ้างอิงของพื้นหญ้า ต้องคูณ Kc ของพืชทุกครั้ง
            ห้ามใช้ ETo แทนความต้องการน้ำของพืชโดยตรง
          </span>
        </div>
        <div>
          <ShieldAlert size={15} />
          <span>
            โมเดล 3 มิติเป็นตัวแทนเชิงสัญลักษณ์ ไม่ได้จำลองจำนวนใบ ขนาดใบ หรือสัณฐานวิทยาจริง
            จึงใช้สอนหลักการได้ แต่ไม่ใช่เครื่องมือวัดขนาดพืช
          </span>
        </div>
      </div>
    </>
  );
}
