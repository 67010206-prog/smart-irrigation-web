/**
 * ค่าความดันไออิ่มตัว (saturation vapour pressure) ตามสมการ FAO-56
 *
 *   e_s(T) = 0.6108 × exp( 17.27 × T / (T + 237.3) )   [kPa]
 *
 * ใช้ทั้งฝั่ง server (บันทึก history) และฝั่งเว็บ (การ์ด VPD) เพื่อให้ค่าตรงกัน
 */
export function saturationVaporPressure(temperatureC: number): number {
  return 0.6108 * Math.exp((17.27 * temperatureC) / (temperatureC + 237.3));
}

/**
 * VPD = e_s(T) − e_a = e_s(T) × (1 − RH/100)   [kPa]
 * คืน null ถ้ายังไม่มีค่าอุณหภูมิหรือความชื้น
 */
export function vaporPressureDeficit(
  temperatureC: number | null | undefined,
  humidity: number | null | undefined
): number | null {
  if (typeof temperatureC !== 'number' || !Number.isFinite(temperatureC)) {
    return null;
  }

  if (typeof humidity !== 'number' || !Number.isFinite(humidity)) {
    return null;
  }

  const rh = Math.min(100, Math.max(0, humidity));

  return saturationVaporPressure(temperatureC) * (1 - rh / 100);
}
