/**
 * งบน้ำรายแปลง (Water Balance)
 *
 * สูตรที่ใช้ (ตามที่กำหนด)
 *   น้ำที่ต้องจ่าย (ลิตร/วัน) = ((ETo × Kc) - (น้ำฝน × 0.70)) × Area
 *   ETo  = ค่าจากสถานีอากาศ (FAO-56 Penman–Monteith รายชั่วโมง แล้วรวมเป็น mm/วัน)
 *   Kc   = สัมประสิทธิ์พืชของแต่ละแปลง (ค่าคงที่ต่อแปลง)
 *   น้ำฝน × 0.70 = น้ำฝนใช้การได้ (effective rainfall)
 *   Area = พื้นที่แปลง (ตร.ม.) · 1 mm บน 1 ตร.ม. = 1 ลิตร
 *
 * "พืชใช้น้ำได้" = ความจุน้ำในดิน (mm) = ค่าอุ้มน้ำของดิน (mm/cm) × ความลึกราก (cm)
 */

export type PlotId = 'woody' | 'field' | 'flower';

export interface PlotSpec {
  id: PlotId;
  name: string;
  /** พื้นที่แปลง (ตร.ม.) */
  areaM2: number;
  /** สัมประสิทธิ์พืชของแปลง (Kc) */
  kc: number;
  soil: string;
  /** ความสามารถในการอุ้มน้ำของดิน (มม./ซม.) */
  waterHoldingMmPerCm: number;
  /** ความลึกรากที่ใช้คิดความจุ (ซม.) */
  rootDepthCm: number;
  /** พืชที่ปลูก (แสดงผลเท่านั้น) */
  plants: string;
}

/** สัดส่วนน้ำฝนที่พืชใช้ได้ (effective rainfall) */
export const EFFECTIVE_RAIN_FACTOR = 0.7;

export const PLOTS: PlotSpec[] = [
  {
    id: 'woody',
    name: 'ไม้ยืนต้น',
    areaM2: 206.875,
    kc: 0.81,
    soil: 'ดินเหนียว',
    waterHoldingMmPerCm: 5.452401986,
    rootDepthCm: 166.11,
    plants:
      'จามจุรี · กระดุมใบเงิน · สะเดา · ศรีตรัง · ชมพูพันธุ์ทิพย์ · ดอกปีป · เหลืองปรีดียาธร · ตีนเป็ด · ฝรั่ง',
  },
  {
    id: 'field',
    name: 'นาข้าว',
    areaM2: 55 * 12,
    kc: 1.2,
    soil: 'ดินเหนียว',
    waterHoldingMmPerCm: 6.030439575,
    rootDepthCm: 35,
    plants: 'ข้าว กข43',
  },
  {
    id: 'flower',
    name: 'แปลงดอกไม้',
    areaM2: 10.4 * 40.09,
    kc: 1.15,
    soil: 'ดินเหนียว',
    waterHoldingMmPerCm: 6.664846393,
    rootDepthCm: 95,
    plants: 'ทานตะวัน · ปอเทือง',
  },
];

export interface PlotWaterBalance {
  plot: PlotSpec;
  /** ETo ที่ใช้คำนวณ (mm/วัน) — null = ยังไม่ได้รับค่าจากสถานี */
  etoMmPerDay: number | null;
  /** น้ำฝนที่ใช้คำนวณ (mm/วัน) */
  rainfallMm: number;
  /** น้ำฝนใช้การได้ = น้ำฝน × 0.70 */
  effectiveRainMm: number;
  /** ความจุน้ำในดินของแปลง (mm) = "พืชใช้น้ำได้" */
  capacityMm: number;
  /** ความจุของทั้งแปลง (ลิตร) */
  capacityLiters: number;
  /** ความต้องการน้ำของพืช (mm/วัน) = Kc × ETo */
  etcMmPerDay: number | null;
  /** น้ำที่ต้องจ่าย (ลิตร/วัน) — ไม่ติดลบ */
  waterLitersPerDay: number | null;
  /** น้ำที่ต้องจ่าย (mm/วัน) */
  waterMmPerDay: number | null;
}

/**
 * คำนวณงบน้ำของทุกแปลง
 * @param etoMmPerDay ETo จากสถานีอากาศ (mm/วัน) — null ถ้ายังไม่มีค่า
 * @param rainfallMm  น้ำฝนของวัน (mm)
 */
export function computeWaterBalance(
  etoMmPerDay: number | null,
  rainfallMm: number | null
): PlotWaterBalance[] {
  const eto =
    etoMmPerDay !== null && Number.isFinite(etoMmPerDay) && etoMmPerDay >= 0
      ? etoMmPerDay
      : null;

  const rain =
    rainfallMm !== null && Number.isFinite(rainfallMm) && rainfallMm > 0
      ? rainfallMm
      : 0;

  const effectiveRainMm = rain * EFFECTIVE_RAIN_FACTOR;

  return PLOTS.map((plot) => {
    const capacityMm = plot.waterHoldingMmPerCm * plot.rootDepthCm;
    const etcMmPerDay = eto === null ? null : eto * plot.kc;

    const waterMmPerDay =
      etcMmPerDay === null ? null : Math.max(0, etcMmPerDay - effectiveRainMm);

    return {
      plot,
      etoMmPerDay: eto,
      rainfallMm: rain,
      effectiveRainMm,
      capacityMm,
      capacityLiters: capacityMm * plot.areaM2,
      etcMmPerDay,
      waterMmPerDay,
      waterLitersPerDay:
        waterMmPerDay === null ? null : waterMmPerDay * plot.areaM2,
    };
  });
}
