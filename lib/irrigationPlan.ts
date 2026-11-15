/**
 * ข้อมูลพืช/แปลง สำหรับคำนวณความต้องการน้ำ (อ้างอิงตาราง Kc + ความลึกราก + ค่าอุ้มน้ำของดิน)
 *
 * สูตรที่ใช้ (ตามโปรแกรมคำนวณการใช้น้ำของพืช)
 *   ETo = Kp × Ep            (Kp = 0.75, Ep = ค่าการระเหยของกรุงเทพฯ รายเดือน)
 *   ETc = Kc × ETo           (ใช้ Kc ระยะ mid เป็นค่าหลัก)
 *   ความจุน้ำในดิน (mm) = ค่าอุ้มน้ำของดิน (mm/cm) × ความลึกราก (cm)
 *   ปริมาณน้ำ (ลิตร)    = ความลึกน้ำ (mm) × พื้นที่ (ตร.ม.)   [1 mm บน 1 ตร.ม. = 1 ลิตร]
 */

export type PlotId = 'woody' | 'field' | 'potted' | 'flower';

export interface PlantSpec {
  /** ชื่อไทยที่ใช้บนหน้าเว็บ */
  name: string;
  /** ชื่ออังกฤษ (ตามตารางต้นทาง) */
  nameEn: string;
  /** Kc ระยะกลาง (โตเต็มที่) — ใช้คำนวณหลัก */
  kcMid: number;
  /** ความลึกราก (ซม.) — ใช้ค่ากลางของช่วง */
  rootDepthCm: number;
}

export interface PlotSpec {
  id: PlotId;
  name: string;
  /** พื้นที่แปลง (ตร.ม.) */
  areaM2: number;
  soil: string;
  /** ความสามารถในการอุ้มน้ำของดิน (มม./ซม.) */
  waterHoldingMmPerCm: number;
  plants: PlantSpec[];
}

/** สัมประสิทธิ์ถาดระเหย (Kp) */
export const KP = 0.75;

/** Ep กรุงเทพมหานคร (mm/day) ม.ค. → ธ.ค. */
export const EP_MM_PER_DAY = [
  3.82, 4.93, 5.26, 4.74, 4.45, 4.27, 3.24, 3.65, 3.37, 3.37, 3.8, 3.76,
];

export const MONTH_NAMES_TH = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
];

export const PLOTS: PlotSpec[] = [
  {
    id: 'woody',
    name: 'แปลง 1 · ไม้ยืนต้น',
    areaM2: 206.875,
    soil: 'ดินเหนียว',
    waterHoldingMmPerCm: 5.452401986,
    plants: [
      { name: 'จามจุรี', nameEn: 'Rain tree', kcMid: 1.1, rootDepthCm: 200 },
      { name: 'กระดุมใบเงิน', nameEn: 'Silver button', kcMid: 0.7, rootDepthCm: 75 },
      { name: 'สะเดา', nameEn: 'Neem', kcMid: 0.7, rootDepthCm: 250 },
      { name: 'ศรีตรัง', nameEn: 'Jacaranda', kcMid: 0.95, rootDepthCm: 125 },
      {
        name: 'ชมพูพันธุ์ทิพย์',
        nameEn: 'Pink trumpet tree',
        kcMid: 1.1,
        rootDepthCm: 135,
      },
      { name: 'ดอกปีป', nameEn: 'Indian cork tree', kcMid: 0.95, rootDepthCm: 250 },
      {
        name: 'เหลืองปรีดียาธร',
        nameEn: 'Golden trumpet tree',
        kcMid: 1.1,
        rootDepthCm: 135,
      },
      { name: 'ตีนเป็ด', nameEn: 'Devil tree', kcMid: 0.7, rootDepthCm: 200 },
      { name: 'ฝรั่ง', nameEn: 'Guava', kcMid: 0.6, rootDepthCm: 125 },
    ],
  },
  {
    id: 'field',
    name: 'แปลง 2 · พืชไร่',
    areaM2: 666,
    soil: 'ดินเหนียว',
    waterHoldingMmPerCm: 6.030439575,
    plants: [{ name: 'ข้าว กข43', nameEn: 'RD43 rice', kcMid: 1.2, rootDepthCm: 35 }],
  },
  {
    id: 'potted',
    name: 'แปลง 3 · สวนไม้กระถาง',
    areaM2: 280,
    soil: 'ดินเหนียว',
    waterHoldingMmPerCm: 6.664846393,
    plants: [
      { name: 'ผกากรอง', nameEn: 'Lantana', kcMid: 0.85, rootDepthCm: 20 },
      { name: 'เข็ม', nameEn: 'Ixora', kcMid: 1.15, rootDepthCm: 45 },
      { name: 'พุดซ้อน', nameEn: 'Gardenia', kcMid: 1.15, rootDepthCm: 15 },
      { name: 'Forget me not', nameEn: 'Forget me not', kcMid: 1.0, rootDepthCm: 15 },
    ],
  },
  {
    id: 'flower',
    name: 'แปลง 4 · แปลงไม้ดอก',
    areaM2: 416.94,
    soil: 'ดินเหนียว',
    waterHoldingMmPerCm: 6.664846393,
    plants: [
      { name: 'ทานตะวัน', nameEn: 'Sunflower', kcMid: 1.15, rootDepthCm: 115 },
      { name: 'ปอเทือง', nameEn: 'Sunn hemp', kcMid: 1.15, rootDepthCm: 75 },
    ],
  },
];

export interface PlotWaterBalance {
  plot: PlotSpec;
  /** Kc ระยะกลางเฉลี่ยของพืชในแปลง */
  kcMid: number;
  /** ความลึกรากเฉลี่ย (ซม.) */
  rootDepthCm: number;
  /** ETo = Kp × Ep (mm/วัน) */
  etoMmPerDay: number;
  /** ETc = Kc × ETo (mm/วัน) */
  etcMmPerDay: number;
  /** น้ำที่แปลงอุ้มไว้ได้ (mm) */
  capacityMm: number;
  /** น้ำที่ต้องจ่ายต่อวัน (ลิตร) */
  waterLitersPerDay: number;
  /** ความจุน้ำของทั้งแปลง (ลิตร) */
  capacityLiters: number;
  /** น้ำที่อุ้มไว้ใช้ได้กี่วันถ้าไม่เติม */
  daysOfWater: number;
  plantNames: string;
}

/** คำนวณงบน้ำของทุกแปลง (เดือน 0-11) */
export function computeWaterBalance(monthIndex: number): PlotWaterBalance[] {
  const month = Math.min(11, Math.max(0, monthIndex));
  const etoMmPerDay = KP * EP_MM_PER_DAY[month];

  return PLOTS.map((plot) => {
    const count = plot.plants.length || 1;
    const kcMid =
      plot.plants.reduce((sum, plant) => sum + plant.kcMid, 0) / count;
    const rootDepthCm =
      plot.plants.reduce((sum, plant) => sum + plant.rootDepthCm, 0) / count;

    const etcMmPerDay = etoMmPerDay * kcMid;
    const capacityMm = plot.waterHoldingMmPerCm * rootDepthCm;

    return {
      plot,
      kcMid,
      rootDepthCm,
      etoMmPerDay,
      etcMmPerDay,
      capacityMm,
      waterLitersPerDay: etcMmPerDay * plot.areaM2,
      capacityLiters: capacityMm * plot.areaM2,
      daysOfWater: etcMmPerDay > 0 ? capacityMm / etcMmPerDay : 0,
      plantNames: plot.plants.map((plant) => plant.name).join(' · '),
    };
  });
}
