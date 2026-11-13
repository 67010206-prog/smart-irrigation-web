import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Droplets, Filter, Gauge, Pause, Play, RotateCcw } from 'lucide-react';

const pipeline = [
  {
    name: 'แหล่งน้ำ',
    detail: 'จุดเริ่มต้นของน้ำในระบบ',
    note: 'สระ บ่อ หรือคลองส่งน้ำ — ระดับน้ำต้องพอให้ปั๊มดูดได้ตลอดเวลา',
  },
  {
    name: 'เครื่องสูบน้ำ',
    detail: 'สร้างแรงดันให้ระบบ',
    note: 'ปั๊มดูดน้ำจากแหล่งน้ำแล้วดันเข้าท่อหลัก (ไม่ควรเดินปั๊มตอนท่อปิดสนิท)',
  },
  {
    name: 'เครื่องกรอง',
    detail: 'ดักสิ่งสกปรกก่อนเข้าหัวปล่อยน้ำ',
    note: 'กรองเศษทรายและตะกอน ป้องกันหัวน้ำหยดอุดตัน',
  },
  {
    name: 'ประตูน้ำ / วาล์ว',
    detail: 'ควบคุมการเปิด–ปิดแต่ละโซน',
    note: 'เปิดทีละโซนเพื่อรักษาแรงดันให้สม่ำเสมอ',
  },
  {
    name: 'ท่อเมน',
    detail: 'ท่อหลักจากปั๊มเข้าสู่แปลง',
    note: 'ขนาดท่อเล็กเกินไปจะทำให้แรงดันตกปลายสาย',
  },
  {
    name: 'ท่อเมนย่อย',
    detail: 'แยกน้ำเข้าพื้นที่แต่ละส่วน',
    note: 'จ่ายน้ำจากท่อเมนไปยังแนวปลูกแต่ละแปลง',
  },
  {
    name: 'ท่อย่อย',
    detail: 'ท่อตามแนวร่องหรือแนวต้นพืช',
    note: 'วางขนานแถวพืช ต่อจากท่อเมนย่อย',
  },
  {
    name: 'หัวปล่อยน้ำ',
    detail: 'จุดที่น้ำออกถึงเขตราก',
    note: 'หัวน้ำหยดหรือหัวฉีดฝอย จ่ายน้ำตรงจุดที่รากเข้าถึง',
  },
];

const soilTypes = [
  { id: 'sand', label: 'ทรายหยาบ', range: '10–30 centibars', from: 10, to: 30 },
  { id: 'most', label: 'ดินส่วนใหญ่', range: '30–60 centibars', from: 30, to: 60 },
  { id: 'clay', label: 'ดินเหนียวหนัก', range: '60–100 centibars', from: 60, to: 100 },
];

function PipelineScene() {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => setStep((current) => (current + 1) % pipeline.length), 2400);
    return () => clearInterval(timer);
  }, [playing]);

  const active = pipeline[step];

  return (
    <div className="tch-scene">
      <svg className="sim-svg" viewBox="0 0 740 250" role="img" aria-label="แผนผังเส้นทางน้ำจากแหล่งน้ำถึงหัวปล่อยน้ำ">
        <path d="M60 140 H690" className="tch-pipe" />
        <path d="M60 140 H690" className={`tch-pipe-flow ${playing ? 'on' : ''}`} />

        {[60, 150, 240, 330, 420, 510, 600, 690].map((x, index) => (
          <g key={x} className={`tch-node ${index === step ? 'active' : ''}`}>
            <circle cx={x} cy={140} r={17} />
            <text x={x} y={145} className="tch-node-num">
              {index + 1}
            </text>
            <text x={x} y={120} className="tch-node-label" textAnchor="middle">
              {pipeline[index].name}
            </text>
          </g>
        ))}

        <g className="tch-plant">
          <path d="M690 140 V96" stroke="#3b6d11" strokeWidth="4" strokeLinecap="round" />
          <path d="M690 112 Q666 98 652 108 M690 100 Q712 86 726 96" stroke="#3b6d11" strokeWidth="4" fill="none" strokeLinecap="round" />
          <text x="690" y="172" textAnchor="middle" className="tch-node-label">
            ถึงรากพืช
          </text>
        </g>
      </svg>

      <div className="tch-controls">
        <button className="tch-btn" onClick={() => setStep((s) => (s + pipeline.length - 1) % pipeline.length)}>
          ◀ ก่อนหน้า
        </button>
        <button className="tch-btn primary" onClick={() => setPlaying((p) => !p)}>
          {playing ? <Pause size={14} /> : <Play size={14} />}
          {playing ? 'หยุด' : 'เล่นต่อ'}
        </button>
        <button className="tch-btn" onClick={() => setStep((s) => (s + 1) % pipeline.length)}>
          ถัดไป ▶
        </button>
      </div>

      <div className="tch-caption">
        <strong>
          {step + 1}. {active.name}
        </strong>
        <p>{active.detail}</p>
        <span>{active.note}</span>
      </div>
    </div>
  );
}

function TensiometerScene() {
  const [dry, setDry] = useState(5);
  const [soil, setSoil] = useState('most');
  const [auto, setAuto] = useState(false);

  useEffect(() => {
    if (!auto) return;
    const timer = setInterval(() => {
      setDry((value) => {
        if (value >= 100) {
          setAuto(false);
          return 100;
        }
        return value + 1;
      });
    }, 140);
    return () => clearInterval(timer);
  }, [auto]);

  const selected = soilTypes.find((item) => item.id === soil) ?? soilTypes[1];
  const inRange = dry >= selected.from && dry <= selected.to;

  const status =
    dry <= 10
      ? 'ดินอิ่มน้ำ — มีน้ำมากเกินพอ อาจขาดอากาศในดิน'
      : dry <= 30
        ? 'ดินชื้นเพียงพอ — ยังไม่จำเป็นต้องให้น้ำ'
        : dry <= 60
          ? 'ช่วงที่เหมาะกับการให้น้ำของดินส่วนใหญ่'
          : dry <= 100
            ? 'ดินเริ่มแห้ง — เหมาะกับดินเหนียวหนัก'
            : 'ดินแห้งมาก ควรรีบให้น้ำ';

  const needle = 40 + dry * 5.2;

  return (
    <div className="tch-scene">
      <svg className="sim-svg" viewBox="0 0 700 190" role="img" aria-label="มาตรวัดความชื้นดินแบบเทนซิโอมิเตอร์">
        <rect x="40" y="70" width="620" height="26" rx="13" fill="#eff3f0" />
        <rect x="40" y="70" width="62" height="26" rx="13" fill="#2457a6" />
        <rect x="102" y="70" width="124" height="26" fill="#6fb6e8" />
        <rect x="226" y="70" width="186" height="26" fill="#58b36c" />
        <rect x="412" y="70" width="248" height="26" fill="#d9a43e" />

        <rect
          x={40 + selected.from * 6.2}
          y="62"
          width={(selected.to - selected.from) * 6.2}
          height="42"
          rx="6"
          fill="none"
          stroke="#23865f"
          strokeWidth="2.5"
          strokeDasharray="5 4"
        />

        <g transform={`translate(${needle},0)`}>
          <path d="M0 44 L-8 58 L8 58 Z" fill="#2b4136" />
          <line x1="0" y1="58" x2="0" y2="70" stroke="#2b4136" strokeWidth="3" />
        </g>

        {[
          { value: 0, label: '0' },
          { value: 10, label: '10' },
          { value: 30, label: '30' },
          { value: 60, label: '60' },
          { value: 100, label: '100' },
        ].map((tick) => (
          <text key={tick.value} x={40 + tick.value * 6.2} y="118" textAnchor="middle" className="tch-node-label">
            {tick.label}
          </text>
        ))}

        <text x="350" y="145" textAnchor="middle" className="tch-node-label">
          ค่าที่อ่านได้จากเกจ (centibars) — ซ้ายเปียก · ขวาแห้ง
        </text>
        <text x="350" y="32" textAnchor="middle" className="tch-node-title">
          {dry} centibars {inRange ? '· อยู่ในช่วงที่ควรให้น้ำ' : ''}
        </text>
      </svg>

      <div className="sim-controls">
        <label className="sim-range-row">
          <span>ความแห้งของดิน (ค่าที่เกจอ่านได้)</span>
          <strong>{dry}</strong>
          <input type="range" min={0} max={100} value={dry} onChange={(event) => setDry(Number(event.target.value))} />
        </label>

        <div className="tch-chip-row">
          <span className="tch-chip-label">ชนิดดิน:</span>
          {soilTypes.map((item) => (
            <button
              key={item.id}
              className={`tch-chip ${soil === item.id ? 'on' : ''}`}
              onClick={() => setSoil(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="tch-controls">
          <button className="tch-btn primary" onClick={() => setAuto((value) => !value)}>
            {auto ? <Pause size={14} /> : <Play size={14} />}
            {auto ? 'หยุดให้ดินแห้ง' : 'ให้ดินแห้งลงเรื่อยๆ'}
          </button>
          <button className="tch-btn" onClick={() => { setDry(3); setAuto(false); }}>
            <Droplets size={14} /> ให้น้ำ
          </button>
          <span className="tch-hint">ช่วงให้น้ำของ {selected.label}: {selected.range}</span>
        </div>
      </div>

      <div className={`sim-status ${inRange ? 'ok' : dry > 100 ? 'danger' : 'warn'}`}>
        <Gauge size={17} />
        <div>
          <strong>{status}</strong>
          <span>
            เกจอ่านค่าความตึงของน้ำในดิน: ตัวเลขน้อย = ดินเปียก ตัวเลขมาก = ดินแห้ง
            จึงต้องเทียบกับชนิดดินเพราะดินทรายกับดินเหนียวให้น้ำที่ค่าต่างกัน
          </span>
        </div>
      </div>
    </div>
  );
}

function PumpSwitchScene() {
  const [demand, setDemand] = useState(10);
  const [pumpOn, setPumpOn] = useState(true);
  const [abnormal, setAbnormal] = useState(false);

  const pressure = !pumpOn ? 0 : abnormal ? 0.4 : Math.max(0.4, 2.6 - (demand - 4) * 0.055);
  const flowOk = !abnormal && pressure > 0.8;

  const status = abnormal
    ? 'ตรวจพบการไหลผิดปกติ — โฟลว์สวิตช์ส่งสัญญาณให้ระบบควบคุมหยุดปั๊ม'
    : !pumpOn
      ? 'ปั๊มหยุดทำงาน — ไม่มีแรงดันในระบบ'
      : pressure < 1.2
        ? 'แรงดันตกต่ำ ปั๊มทำงานหนักแต่ปลายสายน้ำไม่พอ'
        : 'แรงดันอยู่ในช่วงทำงานปกติ';

  return (
    <div className="tch-scene">
      <svg className="sim-svg" viewBox="0 0 700 210" role="img" aria-label="ปั๊มน้ำ เพรสเซอร์สวิตช์ โฟลว์สวิตช์ และแท่งแรงดัน">
        <rect x="40" y="120" width="110" height="56" rx="10" className={pumpOn && !abnormal ? 'tch-pump on' : 'tch-pump'} />
        <text x="95" y="153" textAnchor="middle" className="tch-node-label">
          ปั๊มน้ำ
        </text>

        <path d="M150 148 H250" className="tch-pipe" />
        <path d="M150 148 H250" className={`tch-pipe-flow ${pumpOn && flowOk ? 'on' : ''}`} />

        <circle cx="290" cy="148" r="26" className="tch-node" />
        <text x="290" y="153" textAnchor="middle" className="tch-node-num">
          PS
        </text>
        <text x="290" y="196" textAnchor="middle" className="tch-node-label">
          เพรสเซอร์สวิตช์
        </text>

        <path d="M316 148 H400" className="tch-pipe" />
        <path d="M316 148 H400" className={`tch-pipe-flow ${pumpOn && flowOk ? 'on' : ''}`} />

        <circle cx="440" cy="148" r="26" className={abnormal ? 'tch-node danger' : 'tch-node'} />
        <text x="440" y="153" textAnchor="middle" className="tch-node-num">
          FS
        </text>
        <text x="440" y="196" textAnchor="middle" className="tch-node-label">
          โฟลว์สวิตช์
        </text>

        <path d="M466 148 H610" className="tch-pipe" />

        <g>
          <rect x="600" y="52" width="18" height="140" rx="9" fill="#eff3f0" />
          <rect
            x="600"
            y={192 - (pressure / 3) * 140}
            width="18"
            height={(pressure / 3) * 140}
            rx="9"
            fill={pressure < 1.2 ? '#d9a43e' : '#3b8fd9'}
          />
          <text x="635" y="60" className="tch-node-label">แรงดัน</text>
          <text x="635" y="78" className="tch-node-title">{pressure.toFixed(2)} bar</text>
          <text x="635" y="94" className="tch-node-label">≈ {(pressure * 10.2).toFixed(1)} m</text>
        </g>
      </svg>

      <div className="sim-controls">
        <label className="sim-range-row">
          <span>อัตราการใช้น้ำของหัวปล่อยน้ำ</span>
          <strong>{demand} L/min</strong>
          <input type="range" min={4} max={28} value={demand} onChange={(event) => setDemand(Number(event.target.value))} />
        </label>

        <div className="tch-controls">
          <button className="tch-btn primary" onClick={() => setPumpOn((value) => !value)}>
            {pumpOn ? <Pause size={14} /> : <Play size={14} />}
            {pumpOn ? 'ปิดปั๊ม' : 'เปิดปั๊ม'}
          </button>
          <button className="tch-btn" onClick={() => setAbnormal((value) => !value)}>
            {abnormal ? <RotateCcw size={14} /> : <AlertTriangle size={14} />}
            {abnormal ? 'กลับสู่สภาวะปกติ' : 'จำลองการไหลผิดปกติ'}
          </button>
        </div>
      </div>

      <div className={`sim-status ${abnormal || pressure < 1.2 ? 'danger' : flowOk ? 'ok' : 'warn'}`}>
        {abnormal || pressure < 1.2 ? <AlertTriangle size={17} /> : <CheckCircle2 size={17} />}
        <div>
          <strong>{status}</strong>
          <span>
            เพรสเซอร์สวิตช์สั่งปั๊มเมื่อแรงดันลดถึงค่าต่ำสุด และหยุดเมื่อถึงค่าสูงสุด ·
            โฟลว์สวิตช์เฝ้าการไหลและแจ้งระบบควบคุมเมื่อการไหลผิดปกติ
          </span>
        </div>
      </div>
    </div>
  );
}

function FilterScene() {
  const [dirt, setDirt] = useState(14);
  const [phase, setPhase] = useState<'filter' | 'backwash' | 'rinse'>('filter');
  const [running, setRunning] = useState(true);

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      setDirt((value) => {
        if (phase !== 'filter') return value;
        const next = value + 2;
        if (next >= 100) {
          setPhase('backwash');
          return 100;
        }
        return next;
      });
    }, 260);
    return () => clearInterval(timer);
  }, [running, phase]);

  useEffect(() => {
    if (phase === 'filter') return;
    const delay = phase === 'backwash' ? 1700 : 1500;
    const timer = setTimeout(() => {
      if (phase === 'backwash') {
        setPhase('rinse');
      } else {
        setPhase('filter');
        setDirt(0);
      }
    }, delay);
    return () => clearTimeout(timer);
  }, [phase]);

  const deltaP = (0.2 + (dirt / 100) * 1.1).toFixed(2);
  const step = phase === 'filter' ? 0 : phase === 'backwash' ? 1 : 2;

  return (
    <div className="tch-scene">
      <svg className="sim-svg" viewBox="0 0 700 220" role="img" aria-label="เครื่องกรองเกษตรและขั้นตอนการล้างย้อนกลับ">
        <rect x="240" y="46" width="150" height="130" rx="12" fill="#f7faf8" stroke="#c9d7cd" strokeWidth="2" />
        <rect x="252" y="58" width="126" height="106" rx="8" fill="#eef4ef" />
        <rect x="258" y={158 - (dirt / 100) * 96} width="114" height={(dirt / 100) * 96} rx="6" fill={phase === 'filter' ? '#c79b6b' : '#8fc9ae'} opacity="0.85" />
        <circle cx="315" cy="112" r="7" fill="#d96a5f" />

        <path d="M120 96 H240" className="tch-pipe" />
        <path d="M120 96 H240" className={`tch-pipe-flow ${phase === 'filter' && running ? 'on' : ''}`} />
        <path d="M390 120 H500" className={`tch-pipe-flow ${phase === 'filter' && running ? 'on' : ''}`} />
        <path d="M390 120 H500" className="tch-pipe" />
        <path d="M520 150 V190 H300" className={`tch-pipe-flow ${phase !== 'filter' ? 'reverse' : ''}`} />
        <path d="M520 150 V190 H300" className="tch-pipe" />

        <text x="150" y="86" className="tch-node-label">น้ำเข้า</text>
        <text x="410" y="110" className="tch-node-label">น้ำที่กรองแล้ว</text>
        <text x="352" y="205" textAnchor="middle" className="tch-node-label">
          น้ำทิ้งจากการล้าง
        </text>

        <text x="315" y="192" textAnchor="middle" className="tch-node-title">
          ΔP = {deltaP} bar
        </text>
      </svg>

      <div className="tch-chip-row">
        {['กรองปกติ', 'ล้างย้อนกลับ', 'ล้างเร็ว'].map((label, index) => (
          <span key={label} className={`tch-chip ${step === index ? 'on' : ''}`}>
            {index + 1}. {label}
          </span>
        ))}
      </div>

      <div className="sim-controls">
        <label className="sim-range-row">
          <span>สิ่งสกปรกที่สะสมในไส้กรอง</span>
          <strong>{Math.round(dirt)}%</strong>
          <input type="range" min={0} max={100} value={dirt} onChange={(event) => { setDirt(Number(event.target.value)); setPhase('filter'); }} />
        </label>

        <div className="tch-controls">
          <button className="tch-btn primary" onClick={() => setRunning((value) => !value)}>
            {running ? <Pause size={14} /> : <Play size={14} />}
            {running ? 'หยุด' : 'เล่นต่อ'}
          </button>
          <button className="tch-btn" onClick={() => { setDirt(0); setPhase('filter'); }}>
            <RotateCcw size={14} /> เริ่มใหม่
          </button>
          <button className="tch-btn" onClick={() => setDirt(98)}>
            <Filter size={14} /> เร่งให้สกปรก
          </button>
        </div>
      </div>

      <div className={`sim-status ${phase === 'filter' ? (dirt > 80 ? 'warn' : 'ok') : 'neutral'}`}>
        <Filter size={17} />
        <div>
          <strong>
            {phase === 'filter'
              ? dirt > 80
                ? 'ความดันต่างสูงขึ้นเรื่อยๆ ใกล้ถึงจุดสั่งล้าง'
                : 'กำลังกรองตามปกติ'
              : phase === 'backwash'
                ? 'ล้างย้อนกลับ: น้ำไหลย้อนทิศเพื่อชะล้างสิ่งสกปรกออก'
                : 'ล้างเร็ว: จัดเรียงตัวกลางกรองให้เข้าที่ก่อนกลับไปกรองปกติ'}
          </strong>
          <span>
            เมื่อความดันต่าง (ΔP) ถึงค่าที่ตั้งไว้ ตัวบ่งชี้ความดันจะส่งสัญญาณให้หน่วยควบคุม
            สั่งล้างย้อนกลับอัตโนมัติ
          </span>
        </div>
      </div>
    </div>
  );
}

const scenes = [
  { id: 'pipeline', label: 'ภาพรวมระบบ', hint: 'น้ำเดินทางจากแหล่งน้ำถึงต้นพืช', element: <PipelineScene /> },
  { id: 'tension', label: 'เครื่องวัดความชื้นดิน', hint: 'Tensiometer บอกว่าเมื่อไรควรให้น้ำ', element: <TensiometerScene /> },
  { id: 'pump', label: 'ปั๊มสั่งงานด้วยแรงดัน', hint: 'Pressure switch และ Flow switch', element: <PumpSwitchScene /> },
  { id: 'filter', label: 'เครื่องกรองล้างกลับ', hint: 'ล้างตัวเองโดยอัตโนมัติ', element: <FilterScene /> },
];

/** สื่อการสอน: เส้นทางน้ำ 4 ฉาก (ภาพรวม · Tensiometer · สวิตช์แรงดัน · เครื่องกรองล้างกลับ) */
export default function IrrigationJourney() {
  const [active, setActive] = useState('pipeline');
  const current = scenes.find((scene) => scene.id === active) ?? scenes[0];

  return (
    <div className="sim-wrap">
      <p className="sim-lead">
        ทัศนศึกษา 4 ฉากในระบบให้น้ำจริง ตั้งแต่เส้นทางของน้ำจนถึงอุปกรณ์ที่ตัดสินใจแทนเรา
        — กดแท็บเพื่อสลับฉาก แล้วลองปรับตัวเลขในแต่ละฉาก
      </p>

      <div className="tch-tabs" role="tablist" aria-label="เลือกฉาก">
        {scenes.map((scene) => (
          <button
            key={scene.id}
            role="tab"
            aria-selected={active === scene.id}
            className={`tch-tab ${active === scene.id ? 'on' : ''}`}
            onClick={() => setActive(scene.id)}
          >
            <strong>{scene.label}</strong>
            <small>{scene.hint}</small>
          </button>
        ))}
      </div>

      {current.element}

      <p className="sim-note">
        สื่อนี้สร้างจากชุดสไลด์ “ระบบชลประทานเบื้องต้น” (ระบบชลประทาน EP2) —
        แบบจำลองย่อมใช้ตัวเลขประกอบเพื่อให้เห็นภาพ ไม่ใช่ค่าที่ตั้งจากโรงงานจริง
      </p>
    </div>
  );
}
