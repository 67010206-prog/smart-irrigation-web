import {
  AlertTriangle,
  Cable,
  CheckCircle2,
  CloudSun,
  Cpu,
  Droplets,
  GitBranch,
  Lightbulb,
  RadioTower,
  ShieldCheck,
  Sprout,
} from 'lucide-react';

/** ฮาร์ดแวร์ของ AgriFlow (ย่อ ไม่ซ้ำกับคู่มือวิทยาศาสตร์ดินและน้ำ) */
export function Hardware() {
  return (
    <>
      <p className="article-lead">
        ฮาร์ดแวร์คือส่วนที่ตรวจวัดสภาพแวดล้อมและลงมือให้น้ำจริง
        ส่วนหลักการทางดินและน้ำดูได้ในกลุ่ม “วิทยาศาสตร์ดินและน้ำ”
      </p>

      <div className="hardware-list">
        <div>
          <div className="hardware-icon">
            <Cpu />
          </div>
          <div>
            <strong>ESP32</strong>
            <span>ไมโครคอนโทรลเลอร์ เชื่อม Wi-Fi อ่านเซนเซอร์ และสั่งรีเลย์</span>
          </div>
        </div>

        <div>
          <div className="hardware-icon">
            <Sprout />
          </div>
          <div>
            <strong>Soil Moisture Sensor</strong>
            <span>วัดความชื้นในดิน ต้องสอบเทียบกับดินจริงก่อนใช้งาน</span>
          </div>
        </div>

        <div>
          <div className="hardware-icon">
            <CloudSun />
          </div>
          <div>
            <strong>Temperature / Humidity Sensor</strong>
            <span>วัดอุณหภูมิและความชื้นสัมพัทธ์ของอากาศ</span>
          </div>
        </div>

        <div>
          <div className="hardware-icon">
            <Droplets />
          </div>
          <div>
            <strong>Relay + ปั๊มน้ำ</strong>
            <span>วงจรขับโหลดสำหรับเปิด–ปิดปั๊มตามคำสั่งของ ESP32</span>
          </div>
        </div>
      </div>

      <div className="doc-callout">
        <Lightbulb />
        <div>
          <strong>เรื่องการสอบเทียบ</strong>
          <span>
            ค่าจากเซนเซอร์ความชื้นดินไม่ใช่เปอร์เซ็นต์ความชื้นเชิงปริมาตรโดยตรง
            ต้องหาสมการแปลงค่าและเทียบกับน้ำหนักดินแห้งของแปลงจริง
          </span>
        </div>
      </div>
    </>
  );
}

/** การสื่อสาร MQTT */
export function Communication() {
  return (
    <>
      <p className="article-lead">
        MQTT เป็นโปรโตคอลแบบ Publish / Subscribe เหมาะกับอุปกรณ์ IoT
        ที่ส่งข้อมูลขนาดเล็กเป็นระยะ
      </p>

      <h3>Topic ที่แนะนำ</h3>
      <div className="topic-table">
        <div>
          <code>farm/field01/telemetry</code>
          <span>ESP32 ส่งค่าจากเซนเซอร์</span>
        </div>
        <div>
          <code>farm/field01/cmd</code>
          <span>Backend ส่งคำสั่งไปยัง ESP32</span>
        </div>
        <div>
          <code>farm/field01/status</code>
          <span>ESP32 รายงานสถานะอุปกรณ์</span>
        </div>
      </div>

      <h3>ตัวอย่างข้อมูลที่โปรเจกต์นี้รับ</h3>
      <pre className="code-sample">{`{
  "temperature": 29.5,
  "humidity": 70,
  "etoMmPerDay": 4.2,
  "zones": {
    "herb": { "soilWaterKpa": 32.5 },
    "sunflower": { "soilMoisturePercent": 41 }
  }
}`}</pre>
      <p>
        ส่งเข้า <code>POST /api/sensors/telemetry</code> แล้วหน้าเว็บจะดึงค่าใหม่ภายใน 10 วินาที
      </p>

      <div className="doc-callout warning">
        <AlertTriangle />
        <div>
          <strong>ความปลอดภัยของข้อมูล</strong>
          <span>
            อย่าใส่รหัสผ่าน MQTT หรือ Secret Key ไว้ใน Frontend ให้เก็บไว้ใน Backend
            และใช้การเชื่อมต่อที่ยืนยันตัวตน
          </span>
        </div>
      </div>
    </>
  );
}

/** ตรรกะการควบคุมปั๊ม */
export function ControlLogic() {
  return (
    <>
      <p className="article-lead">
        หน้าเว็บมีปุ่มเปิด–ปิดปั๊มแยก 5 แปลง แต่ในระบบจริง ESP32 ควรเป็นผู้สั่งรีเลย์
        โดยใช้ค่าจากเซนเซอร์เป็นเงื่อนไข ป้องกันปัญหาสื่อสารขาดหาย
      </p>

      <div className="mode-doc-grid">
        <div>
          <div className="mode-doc-icon manual">
            <Cable />
          </div>
          <h3>Manual (สั่งเอง)</h3>
          <p>
            ผู้ใช้กดเปิด–ปิดปั๊มจากหน้า Control เหมาะกับการทดสอบระบบ
            หรือให้น้ำเสริมตามความต้องการ
          </p>
        </div>

        <div>
          <div className="mode-doc-icon auto">
            <GitBranch />
          </div>
          <h3>Auto (ตามเงื่อนไข)</h3>
          <p>
            อุปกรณ์เทียบค่าความชื้นกับเกณฑ์ เช่น เปิดเมื่อความชื้นต่ำกว่า 40%
            และปิดเมื่อสูงกว่า 55% (hysteresis)
          </p>
        </div>
      </div>

      <h3>ลำดับการทำงานที่ปลอดภัย</h3>
      <ol>
        <li>อ่านค่าความชื้นดิน</li>
        <li>ตรวจว่าค่าอยู่ในช่วงที่เชื่อถือได้หรือไม่</li>
        <li>เทียบกับเกณฑ์เปิด–ปิด (ใช้ค่าต่างกันเพื่อกันปั๊มกระพริบ)</li>
        <li>สั่งรีเลย์เมื่อเข้าเงื่อนไข แล้วรายงานสถานะกลับ</li>
        <li>ปิดปั๊มอัตโนมัติเมื่อไม่ได้รับข้อมูลเกินเวลาที่กำหนด</li>
      </ol>

      <div className="doc-callout">
        <Lightbulb />
        <div>
          <strong>ทำไมต้องมี Hysteresis</strong>
          <span>
            ถ้าใช้เกณฑ์เดียวทั้งเปิดและปิด ปั๊มจะเปิด–ปิดถี่เมื่อค่าความชื้นแกว่งใกล้เกณฑ์
            ทำให้ปั๊มสึกหรอและสิ้นเปลืองไฟ
          </span>
        </div>
      </div>
    </>
  );
}

/** การทดสอบและความปลอดภัย */
export function Safety() {
  return (
    <>
      <p className="article-lead">
        ก่อนต่อปั๊มน้ำจริง ควรทดสอบทีละส่วนและออกแบบระบบป้องกันความเสียหาย
      </p>

      <h3>รายการตรวจสอบก่อนใช้งาน</h3>
      <div className="checklist-doc">
        <div>
          <CheckCircle2 />
          <span>ตรวจแรงดันและกระแสของปั๊มให้เหมาะกับแหล่งจ่ายไฟ</span>
        </div>
        <div>
          <CheckCircle2 />
          <span>เลือก Relay หรือ MOSFET driver ที่รองรับโหลดได้จริง</span>
        </div>
        <div>
          <CheckCircle2 />
          <span>แยกวงจรไฟเลี้ยงปั๊มออกจากวงจร ESP32 ตามการออกแบบที่เหมาะสม</span>
        </div>
        <div>
          <CheckCircle2 />
          <span>เพิ่มเงื่อนไขปิดปั๊มเมื่อเซนเซอร์ผิดปกติหรือสื่อสารขาดหาย</span>
        </div>
        <div>
          <CheckCircle2 />
          <span>ทดสอบปุ่ม Manual และเงื่อนไข Auto โดยยังไม่ต่อปั๊มจริง</span>
        </div>
      </div>

      <div className="doc-callout warning">
        <AlertTriangle />
        <div>
          <strong>คำเตือน</strong>
          <span>
            ห้ามต่อปั๊ม 12V เข้าขา GPIO ของ ESP32 โดยตรง ต้องใช้อุปกรณ์ขับโหลดที่เหมาะสม
            และตรวจสอบการป้องกันกระแสย้อนจากมอเตอร์
          </span>
        </div>
      </div>

      <div className="sim-status ok">
        <ShieldCheck size={17} />
        <div>
          <strong>หลักคิดเรื่องความปลอดภัยของน้ำ</strong>
          <span>
            ออกแบบให้ “ล้มเหลวแล้วปลอดภัย” — ถ้าข้อมูลขาด ให้ปิดปั๊มไว้ก่อน
            ดีกว่าเดาแล้วปล่อยน้ำทิ้งทั้งคืน
          </span>
        </div>
      </div>

      <div className="doc-callout">
        <RadioTower />
        <div>
          <strong>ทดสอบก่อนติดตั้งจริง</strong>
          <span>
            ใช้ Postman ยิงค่าจำลองเข้า <code>/api/sensors/telemetry</code>
            แล้วดูว่าหน้าเว็บแสดงค่าถูกต้อง ก่อนนำไปผูกกับอุปกรณ์จริง
          </span>
        </div>
      </div>
    </>
  );
}
