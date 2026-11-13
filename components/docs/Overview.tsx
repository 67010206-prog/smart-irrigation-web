import { ChevronRight, Code2, Database, Lightbulb, Sprout } from 'lucide-react';

/** บทนำ: เริ่มต้นใช้งานระบบ */
export function Intro() {
  return (
    <>
      <p className="article-lead">
        AgriFlow เป็นเว็บแอปต้นแบบสำหรับติดตามความชื้นดิน สภาพอากาศ
        และควบคุมระบบให้น้ำ โดยออกแบบให้ใช้ได้ทั้งการตรวจสอบสถานะและการเรียนรู้หลักการของระบบ IoT
      </p>

      <div className="intro-highlight">
        <div className="intro-highlight-icon">
          <Sprout size={28} />
        </div>
        <div>
          <strong>เป้าหมายของโครงงาน</strong>
          <p>
            พัฒนาระบบให้น้ำที่ตรวจวัดข้อมูลจากเซนเซอร์ แสดงผลแบบเรียลไทม์
            และควบคุมปั๊มน้ำแยกตามแปลงพืชได้
          </p>
        </div>
      </div>

      <h3>ความสามารถหลักของเว็บไซต์</h3>
      <ul>
        <li>แสดงค่าอากาศ (อุณหภูมิ ความชื้น ETo) และค่าของพืช 5 แปลง</li>
        <li>เปิด–ปิดปั๊มน้ำของแต่ละแปลงจากหน้า Control</li>
        <li>บันทึกค่าล่าสุดไว้ที่ backend และดึงมาแสดงทุก 10 วินาที</li>
        <li>เก็บประวัติการเปิด–ปิดปั๊มน้ำและส่งออกข้อมูลเป็น CSV</li>
        <li>รวบรวมองค์ความรู้เรื่องดิน น้ำ และระบบชลประทานไว้ในหน้า Docs</li>
      </ul>

      <h3>5 แปลงที่ระบบดูแล</h3>
      <table className="doc-table">
        <thead>
          <tr>
            <th>แปลง</th>
            <th>ค่าที่วัด</th>
            <th>หน่วย</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>ไม้ล้มลุก</td>
            <td>ความชื้นในดิน (แรงดูดน้ำในดิน)</td>
            <td>kPa</td>
          </tr>
          <tr>
            <td>นาข้าว</td>
            <td>ETo ของแปลง</td>
            <td>mm/ชั่วโมง</td>
          </tr>
          <tr>
            <td>ปอเทือง</td>
            <td>อุณหภูมิในดิน, ความชื้นในดิน</td>
            <td>°C, %</td>
          </tr>
          <tr>
            <td>ทานตะวัน</td>
            <td>ความชื้นในดิน</td>
            <td>%</td>
          </tr>
          <tr>
            <td>ไม้กระถาง</td>
            <td>ความชื้นในดิน</td>
            <td>kPa</td>
          </tr>
        </tbody>
      </table>

      <div className="doc-callout">
        <Lightbulb />
        <div>
          <strong>สถานะปัจจุบัน: Prototype</strong>
          <span>
            หน้าเว็บเชื่อมต่อ backend (Next.js API) และดึงข้อมูลล่าสุดทุก 10 วินาที
            โดยรอรับค่าจริงจาก ESP32 ผ่าน <code>/api/sensors/telemetry</code>
          </span>
        </div>
      </div>
    </>
  );
}

/** บทเรียน: สถาปัตยกรรมระบบ */
export function Architecture() {
  return (
    <>
      <p className="article-lead">
        ระบบแบ่งออกเป็น 3 ชั้น ได้แก่ อุปกรณ์ภาคสนาม ระบบประมวลผล และหน้าเว็บ Dashboard
        เพื่อให้แยกหน้าที่และดูแลรักษาได้ง่าย
      </p>

      <div className="architecture-flow">
        <div className="architecture-step">
          <Sprout />
          <strong>1. Field devices</strong>
          <span>ESP32 และเซนเซอร์</span>
        </div>
        <ChevronRight />
        <div className="architecture-step">
          <Database />
          <strong>2. Backend</strong>
          <span>API และที่เก็บค่า</span>
        </div>
        <ChevronRight />
        <div className="architecture-step">
          <Code2 />
          <strong>3. Web app</strong>
          <span>Control และ Docs</span>
        </div>
      </div>

      <h3>หน้าที่ของแต่ละส่วน</h3>
      <ul>
        <li>
          <strong>ESP32:</strong> อ่านค่าเซนเซอร์ ประมวลผลเงื่อนไขเบื้องต้น
          และควบคุมรีเลย์ของปั๊ม
        </li>
        <li>
          <strong>Backend:</strong> ตรวจสอบข้อมูล เก็บค่าล่าสุดของแต่ละแปลง
          และให้หน้าเว็บดึงไปแสดง
        </li>
        <li>
          <strong>Frontend:</strong> แสดงค่าที่วัดได้ ส่งคำสั่งเปิด–ปิดปั๊ม
          และสรุปประวัติการทำงาน
        </li>
      </ul>

      <h3>เส้นทางข้อมูลในโปรเจกต์นี้</h3>
      <div className="topic-table">
        <div>
          <code>POST /api/sensors/telemetry</code>
          <span>ESP32 ส่งค่าอากาศ + ค่ารายแปลง</span>
        </div>
        <div>
          <code>GET /api/sensors/latest</code>
          <span>หน้าเว็บดึงค่าล่าสุดทุก 10 วินาที</span>
        </div>
        <div>
          <code>POST /api/control/pump</code>
          <span>หน้าเว็บสั่งเปิด–ปิดปั๊มรายแปลง</span>
        </div>
      </div>

      <div className="doc-callout">
        <Lightbulb />
        <div>
          <strong>ทำไมต้องแยกชั้น</strong>
          <span>
            อุปกรณ์ภาคสนามไม่ควรถือรหัสผ่านหรือกติกาทั้งหมดไว้ที่ตัวเครื่อง
            และหน้าเว็บไม่ควรคำนวณค่าที่ใช้ตัดสินใจเรื่องน้ำเอง
          </span>
        </div>
      </div>
    </>
  );
}
