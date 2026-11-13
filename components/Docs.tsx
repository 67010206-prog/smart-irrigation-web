import { useState } from 'react';
import { BookOpen, Cpu, Cable, Code2, GitBranch, Lightbulb, Search, ShieldCheck, Sprout, ChevronRight, CheckCircle2, AlertTriangle, RadioTower, Database, Droplets, CloudSun, Waves, Ruler } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import SoilWaterTank from './simulations/SoilWaterTank';
import LevelingInstrument from './simulations/LevelingInstrument';
import SugarcaneIrrigation from './simulations/SugarcaneIrrigation';

const articles = [
  { id: 'intro', label: 'เริ่มต้นใช้งาน', group: 'ภาพรวมระบบ', icon: BookOpen },
  { id: 'architecture', label: 'สถาปัตยกรรมระบบ', group: 'ภาพรวมระบบ', icon: GitBranch },
  { id: 'hardware', label: 'อุปกรณ์ฮาร์ดแวร์', group: 'การพัฒนา', icon: Cpu },
  { id: 'communication', label: 'การสื่อสาร MQTT', group: 'การพัฒนา', icon: RadioTower },
  { id: 'control', label: 'หลักการควบคุม Manual / Auto', group: 'การพัฒนา', icon: Code2 },
  { id: 'safety', label: 'การทดสอบและความปลอดภัย', group: 'การใช้งาน', icon: ShieldCheck },
  { id: 'sim-soil', label: 'ดินคือถังน้ำ (จำลอง)', group: 'สื่อการสอน', icon: Droplets },
  { id: 'sim-level', label: 'กล้องระดับ (จำลอง)', group: 'สื่อการสอน', icon: Ruler },
  { id: 'sim-sugarcane', label: 'น้ำหยดกับอ้อย (จำลอง)', group: 'สื่อการสอน', icon: Waves },
];

function ArticleContent({ id }: { id: string }) {
  if (id === 'architecture') return <>
    <p className="article-lead">ระบบแบ่งออกเป็น 3 ชั้น ได้แก่ อุปกรณ์ภาคสนาม ระบบประมวลผล และหน้าเว็บ Dashboard เพื่อให้แยกหน้าที่และดูแลรักษาได้ง่าย</p>
    <div className="architecture-flow"><div className="architecture-step"><Sprout /><strong>1. Field devices</strong><span>ESP32 และเซนเซอร์</span></div><ChevronRight /><div className="architecture-step"><Database /><strong>2. Backend</strong><span>MQTT และฐานข้อมูล</span></div><ChevronRight /><div className="architecture-step"><Code2 /><strong>3. Web app</strong><span>Control และ Docs</span></div></div>
    <h3>หน้าที่ของแต่ละส่วน</h3><ul><li><strong>ESP32:</strong> อ่านค่าเซนเซอร์ ประมวลผลเงื่อนไขเบื้องต้น และควบคุมรีเลย์</li><li><strong>MQTT Broker:</strong> เป็นตัวกลางรับส่งข้อความระหว่างอุปกรณ์กับ Backend</li><li><strong>Backend:</strong> ตรวจสอบข้อมูล บันทึกค่าที่ได้รับ และส่งข้อมูลไปยังหน้าเว็บ</li><li><strong>Frontend:</strong> แสดงกราฟ สถานะ และส่วนควบคุมให้ผู้ใช้งาน</li></ul>
  </>;
  if (id === 'hardware') return <>
    <p className="article-lead">อุปกรณ์ฮาร์ดแวร์คือส่วนที่ทำหน้าที่ตรวจวัดสภาพแวดล้อมและลงมือทำงานจริงในพื้นที่เพาะปลูก</p>
    <div className="hardware-list"><div><div className="hardware-icon"><Cpu /></div><div><strong>ESP32</strong><span>ไมโครคอนโทรลเลอร์ เชื่อมต่อ Wi-Fi และอ่านค่าจากเซนเซอร์</span></div></div><div><div className="hardware-icon"><Sprout /></div><div><strong>Soil Moisture Sensor</strong><span>ตรวจวัดความชื้นในดิน ควรสอบเทียบกับลักษณะดินจริงก่อนนำไปใช้งาน</span></div></div><div><div className="hardware-icon"><CloudSun /></div><div><strong>Temperature / Humidity Sensor</strong><span>วัดอุณหภูมิและความชื้นสัมพัทธ์ของอากาศ</span></div></div><div><div className="hardware-icon"><Droplets /></div><div><strong>Relay + DC Pump</strong><span>วงจรขับโหลดสำหรับสั่งเปิด–ปิดปั๊มน้ำตามคำสั่งจาก ESP32</span></div></div></div>
    <div className="doc-callout"><Lightbulb /><div><strong>ข้อควรจำ</strong><span>ค่าเซนเซอร์ความชื้นดินไม่ใช่เปอร์เซ็นต์ความชื้นเชิงปริมาตรโดยตรงเสมอไป ต้องสอบเทียบและกำหนดสมการแปลงค่าตามเซนเซอร์และดินที่ใช้งาน</span></div></div>
  </>;
  if (id === 'communication') return <>
    <p className="article-lead">MQTT เป็นโปรโตคอลรับส่งข้อความแบบ Publish / Subscribe เหมาะกับอุปกรณ์ IoT ที่ต้องส่งข้อมูลขนาดเล็กเป็นระยะ</p>
    <h3>Topic ที่แนะนำ</h3><div className="topic-table"><div><code>farm/field01/telemetry</code><span>ESP32 ส่งค่าจากเซนเซอร์</span></div><div><code>farm/field01/cmd</code><span>Backend ส่งคำสั่งไปยัง ESP32</span></div><div><code>farm/field01/status</code><span>ESP32 รายงานสถานะอุปกรณ์</span></div></div>
    <h3>ตัวอย่างข้อมูล JSON</h3><pre className="code-sample">{`{
  "deviceId": "farm-01",
  "soilMoisture": 45.5,
  "temperature": 29.5,
  "humidity": 70,
  "pumpState": "OFF",
  "mode": "AUTO"
}`}</pre>
    <div className="doc-callout warning"><AlertTriangle /><div><strong>ความปลอดภัยของข้อมูล</strong><span>อย่าใส่รหัสผ่าน MQTT หรือ Secret Key ไว้ใน Frontend ให้เก็บไว้ใน Backend และใช้การเชื่อมต่อที่มีการยืนยันตัวตน</span></div></div>
  </>;
  if (id === 'control') return <>
    <p className="article-lead">ระบบมี 2 โหมด โดยควรให้ ESP32 เป็นผู้ควบคุมปั๊มจริง ส่วนหน้าเว็บมีหน้าที่ส่งคำสั่งและแสดงผลสถานะ</p>
    <div className="mode-doc-grid"><div><div className="mode-doc-icon manual"><PowerIcon /></div><h3>Manual Mode</h3><p>ผู้ใช้งานกดเปิดหรือปิดปั๊มจากหน้า Dashboard โดยตรง เหมาะสำหรับทดสอบระบบหรือให้น้ำตามความต้องการ</p></div><div><div className="mode-doc-icon auto"><GitBranch /></div><h3>Auto Mode</h3><p>ESP32 เปรียบเทียบค่าความชื้นดินกับค่ากำหนด เช่น ต่ำกว่า 35% ให้เปิดปั๊ม และปิดเมื่อความชื้นสูงถึงเกณฑ์ที่ตั้งไว้</p></div></div>
    <h3>ตัวอย่างลำดับการทำงาน Auto</h3><ol><li>อ่านค่าความชื้นดินจากเซนเซอร์</li><li>ตรวจสอบว่าเซนเซอร์อ่านค่าได้ปกติหรือไม่</li><li>เปรียบเทียบค่ากับ Threshold ที่กำหนด</li><li>สั่ง Relay ให้ปั๊มทำงานเมื่อดินแห้ง</li><li>ตรวจสอบเงื่อนไขหยุดปั๊มและส่งสถานะกลับ Dashboard</li></ol>
    <div className="doc-callout"><Lightbulb /><div><strong>แนะนำให้ใช้ Hysteresis</strong><span>กำหนดจุดเปิดและจุดปิดต่างกัน เช่น เปิดเมื่อความชื้นต่ำกว่า 35% และปิดเมื่อสูงกว่า 45% เพื่อป้องกันปั๊มเปิด–ปิดถี่เกินไป</span></div></div>
  </>;
  if (id === 'sim-soil') return <>
    <p className="article-lead">ลองเลื่อนระดับน้ำในดินเพื่อดูว่าพืชยังดูดน้ำได้หรือไม่ และดูช่วง “น้ำที่พืชใช้ได้” ซึ่งควรใช้เป็นเกณฑ์สั่งปั๊ม</p>
    <SoilWaterTank />
    <div className="doc-callout"><Lightbulb /><div><strong>นำไปใช้กับระบบจริง</strong><span>ตั้งเกณฑ์เปิดปั๊มเมื่อความชื้นเข้าใกล้จุดเหี่ยวเฉาถาวร และหยุดเมื่อถึงความจุสนาม จะลดการรดน้ำเกินความจำเป็น</span></div></div>
  </>;
  if (id === 'sim-level') return <>
    <p className="article-lead">ปรับค่าไม้หลังและไม้หน้า แล้วดูว่าความต่างระดับ (ΔH) เปลี่ยนอย่างไร</p>
    <LevelingInstrument />
    <div className="doc-callout"><Lightbulb /><div><strong>เกี่ยวกับแปลงของคุณ</strong><span>พื้นที่ที่ไม่เรียบทำให้น้ำไหลไปกองที่จุดต่ำ ควรปรับระดับก่อนติดตั้งน้ำหยด หรือแบ่งโซนตามความสูงของพื้นที่</span></div></div>
  </>;
  if (id === 'sim-sugarcane') return <>
    <p className="article-lead">ดูการทำงานของน้ำหยดและความต้องการน้ำในแต่ละระยะการเติบโตของอ้อย</p>
    <SugarcaneIrrigation />
  </>;
  if (id === 'safety') return <>
    <p className="article-lead">ก่อนต่อปั๊มน้ำจริง ควรทดสอบการทำงานทีละส่วนและออกแบบระบบป้องกันความเสียหาย</p>
    <h3>รายการตรวจสอบก่อนใช้งาน</h3><div className="checklist-doc"><div><CheckCircle2 /><span>ตรวจสอบแรงดันและกระแสของปั๊มให้เหมาะกับแหล่งจ่ายไฟ</span></div><div><CheckCircle2 /><span>เลือก Relay หรือ MOSFET Driver ที่รองรับโหลดได้จริง</span></div><div><CheckCircle2 /><span>แยกวงจรไฟเลี้ยงปั๊มออกจากวงจร ESP32 ตามการออกแบบที่เหมาะสม</span></div><div><CheckCircle2 /><span>เพิ่มเงื่อนไขปิดปั๊มเมื่อเซนเซอร์ผิดปกติหรือสื่อสารขาดหาย</span></div><div><CheckCircle2 /><span>ทดสอบปุ่ม Manual และเงื่อนไข Auto โดยยังไม่ต่อปั๊มจริงก่อน</span></div></div>
    <div className="doc-callout warning"><AlertTriangle /><div><strong>คำเตือน</strong><span>ห้ามต่อปั๊ม 12V เข้าขา GPIO ของ ESP32 โดยตรง ต้องใช้อุปกรณ์ขับโหลดที่เหมาะสม และตรวจสอบการป้องกันกระแสย้อนจากมอเตอร์</span></div></div>
  </>;
  return <>
    <p className="article-lead">AgriFlow เป็นเว็บแอปต้นแบบสำหรับติดตามความชื้นดิน สภาพอากาศ และควบคุมระบบให้น้ำ โดยออกแบบให้ใช้ได้ทั้งการตรวจสอบสถานะและการเรียนรู้หลักการของระบบ IoT</p>
    <div className="intro-highlight"><div className="intro-highlight-icon"><Sprout size={28} /></div><div><strong>เป้าหมายของโครงงาน</strong><p>พัฒนาระบบให้น้ำที่สามารถตรวจวัดข้อมูลจากเซนเซอร์ แสดงผลแบบ Real-time และควบคุมการทำงานของปั๊มน้ำได้ทั้งแบบ Manual และ Auto</p></div></div>
    <h3>ความสามารถหลักของเว็บไซต์</h3><ul><li>แสดงข้อมูลความชื้นดิน อุณหภูมิ และความชื้นสัมพัทธ์</li><li>แสดงกราฟแนวโน้มข้อมูลเซนเซอร์ตามช่วงเวลา</li><li>ควบคุมปั๊มน้ำและตรวจสอบสถานะการทำงาน</li><li>รวบรวมองค์ความรู้ วงจร และคู่มือการใช้งานไว้ในหน้า Docs</li></ul>
    <div className="doc-callout"><Lightbulb /><div><strong>สถานะปัจจุบัน: Prototype</strong><span>หน้าเว็บเชื่อมต่อกับ backend (Next.js API) และดึงข้อมูลล่าสุดทุก 10 วินาที โดยรอรับค่าจริงจาก ESP32 ผ่าน /api/sensors/telemetry</span></div></div>
  </>;
}

function PowerIcon() { return <Cable />; }
function ArticleIconBox({ icon: Icon }: { icon: LucideIcon }) {
  return <div className="article-title-icon"><Icon size={22} /></div>;
}

export default function Docs() {
  const [active, setActive] = useState('intro');
  const [query, setQuery] = useState('');
  const selected = articles.find((article) => article.id === active) ?? articles[0];
  const filtered = articles.filter((article) => article.label.toLowerCase().includes(query.toLowerCase()));
  const groups = [...new Set(filtered.map((article) => article.group))];

  return (
    <div className="page-content docs-page">
      <div className="page-heading-row docs-heading"><div><div className="eyebrow">KNOWLEDGE BASE / LEARNING</div><h1>Docs & Learning</h1><p>คลังความรู้ คู่มือ และองค์ประกอบที่ใช้ในการพัฒนาโครงงาน</p></div><div className="docs-count"><BookOpen size={18} /><div><strong>09</strong><span>บทเรียน</span></div></div></div>
      <div className="docs-layout">
        <aside className="docs-sidebar">
          <div className="docs-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาบทเรียน..." /></div>
          {groups.length === 0 && <p className="empty-search">ไม่พบบทเรียนที่ค้นหา</p>}
          {groups.map((group) => <div className="docs-nav-group" key={group}><div className="docs-nav-label">{group}</div>{filtered.filter((article) => article.group === group).map((article) => { const Icon = article.icon; return <button key={article.id} className={`docs-nav-item ${active === article.id ? 'selected' : ''}`} onClick={() => setActive(article.id)}><Icon size={16} /><span>{article.label}</span><ChevronRight size={14} className="docs-chevron" /></button>; })}</div>)}
          <div className="docs-progress"><div className="progress-title"><span>การเรียนรู้</span><strong>เริ่มต้น</strong></div><div className="progress-track"><span style={{ width: '16.6%' }} /></div><small>เลือกอ่านบทเรียนเพื่อทำความเข้าใจระบบ</small></div>
        </aside>
        <article className="docs-article">
          <div className="article-topline"><div className="article-category">{selected.group}</div><span>คู่มือโครงงาน · AgriFlow</span></div>
          <div className="article-title-row"><div><h2>{selected.label}</h2><p>ทำความเข้าใจหลักการและแนวทางการพัฒนาระบบให้น้ำอัจฉริยะ</p></div><ArticleIconBox icon={selected.icon} /></div>
          <div className="article-rule" />
          <div className="article-body"><ArticleContent id={active} /></div>
          <div className="article-bottom"><span><BookOpen size={14} /> AgriFlow Learning Center</span><span>Prototype Documentation</span></div>
        </article>
      </div>
    </div>
  );
}
