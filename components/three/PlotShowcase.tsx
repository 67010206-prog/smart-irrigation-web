'use client';

/**
 * PlotShowcase — แปลงพืช 3 แปลง พร้อมโมเดล 3 มิติของพืชแต่ละแปลง
 * ใช้ทั้งใน Dashboard (หน้า Control) และใน Docs & Learning
 */

import { Boxes } from 'lucide-react';

import PlantViewer from './PlantViewer';
import { PLOTS, type PlotId } from '../../lib/irrigationPlan';
import type { PlantVariant } from '../../lib/three/plants';

interface ModelInfo {
  variant: PlantVariant;
  plantName: string;
  latin: string;
  parts: string;
}

/**
 * จับคู่รูปอ้างอิง → แปลง
 * woody = แปลงไม้ยืนต้น (รูปต้นไม้เรียงแถว) · field = นาข้าว · flower = แปลงไม้ดอก
 */
const MODELS: Record<PlotId, ModelInfo> = {
  woody: {
    variant: 'rubber',
    plantName: 'ไม้ยืนต้น',
    latin: 'Hevea brasiliensis (แบบจำลอง)',
    parts: 'ลำต้น · กิ่ง · เรือนยอด',
  },
  field: {
    variant: 'rice',
    plantName: 'ข้าว กข43',
    latin: 'Oryza sativa',
    parts: 'กอข้าว · ใบ · รวง',
  },
  flower: {
    variant: 'flower',
    plantName: 'ไม้ดอกเหลือง',
    latin: 'Asteraceae (แบบจำลอง)',
    parts: 'ใบ · ก้าน · ดอกจาน',
  },
};

function fmt(value: number, digits = 1): string {
  return value.toLocaleString('th-TH', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

interface PlotShowcaseProps {
  /** ซ่อนส่วนหัวเมื่อฝังอยู่ในบทเรียน */
  compact?: boolean;
}

export default function PlotShowcase({ compact = false }: PlotShowcaseProps) {
  return (
    <section className="plot3d">
      {!compact && (
        <div className="plant-zones-heading">
          <div>
            <h2>แปลงพืช 3 มิติ</h2>
            <p>
              โมเดลพืชของแต่ละแปลง สร้างจาก geometry ในโค้ด (แนวทาง img2threejs) —
              ไม่โหลดไฟล์โมเดลหรือรูปพื้นหลัง
            </p>
          </div>

          <div className="plot3d-badge">
            <Boxes size={14} />
            <span>PROCEDURAL 3D</span>
          </div>
        </div>
      )}

      <div className="plot3d-grid">
        {PLOTS.map((plot, index) => {
          const model = MODELS[plot.id];
          const capacityMm = plot.waterHoldingMmPerCm * plot.rootDepthCm;

          return (
            <article className="plot3d-card" key={plot.id}>
              <PlantViewer
                variant={model.variant}
                label={`โมเดล 3 มิติ ${model.plantName} ของ${plot.name}`}
              />

              <div className="plot3d-body">
                <div className="plot3d-meta">
                  <span className="plot3d-index">{index + 1}</span>
                  <span className="plot3d-tag">แปลง 3D</span>
                </div>

                <h3>{plot.name}</h3>
                <p className="plot3d-plant">
                  {model.plantName} <span>· {model.parts}</span>
                </p>
                <p className="plot3d-latin">{model.latin}</p>

                <div className="plot3d-stats">
                  <div className="plot3d-stat">
                    <span>พื้นที่</span>
                    <strong>{fmt(plot.areaM2, 1)} ตร.ม.</strong>
                  </div>
                  <div className="plot3d-stat">
                    <span>Kc</span>
                    <strong>{plot.kc.toFixed(2)}</strong>
                  </div>
                  <div className="plot3d-stat">
                    <span>ความจุน้ำในดิน</span>
                    <strong>{fmt(capacityMm, 0)} มม.</strong>
                  </div>
                  <div className="plot3d-stat">
                    <span>ลึกราก</span>
                    <strong>{fmt(plot.rootDepthCm, 0)} ซม.</strong>
                  </div>
                </div>

                <p className="plot3d-plants">{plot.plants}</p>
              </div>
            </article>
          );
        })}
      </div>

      <p className="plot3d-footnote">
        โมเดลเป็นตัวแทนเชิงการศึกษา ไม่ได้จำลองสัณฐานวิทยาจริงของพืช —
        สร้างจาก primitive, ribbon geometry และ InstancedMesh เท่านั้น
      </p>
    </section>
  );
}
