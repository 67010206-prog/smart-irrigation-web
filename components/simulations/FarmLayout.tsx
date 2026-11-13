import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Droplets, Gauge, RotateCcw, Waves } from 'lucide-react';

const zones = [
  {
    id: 'zone1',
    name: 'โซน 1: ไม้ดอก',
    system: 'น้ำหยด 12 เส้น · 1,604 หัว',
    demand: 40,
    color: '#e2a23b',
    fill: '#fdf3e2',
    plot: { x: 46, y: 150, w: 168, h: 118 },
  },
  {
    id: 'zone2',
    name: 'โซน 2: นาข้าว กข43',
    system: 'เทปน้ำพุ่ง 6 แนว · 3,996 รู',
    demand: 959.04,
    color: '#3f9e6a',
    fill: '#e6f4eb',
    plot: { x: 246, y: 116, w: 190, h: 152 },
  },
  {
    id: 'zone3',
    name: 'โซน 3: ไม้ยืนต้น',
    system: 'GyroNet SRD · 59 หัว',
    demand: 39.33,
    color: '#7a9e3f',
    fill: '#eef4e0',
    plot: { x: 468, y: 152, w: 162, h: 116 },
  },
];

type ZoneId = (typeof zones)[number]['id'];

const PUMP_MAX_FLOW = 500;

/** สื่อการสอน: ผังแปลง 3 โซน + วาล์วโซลีนอยด์ + ค่าชลศาสตร์จากปั๊ม */
export default function FarmLayout() {
  const [pumpOn, setPumpOn] = useState(true);
  const [valves, setValves] = useState<Record<ZoneId, boolean>>({
    zone1: true,
    zone2: false,
    zone3: true,
  });

  const openZones = zones.filter((zone) => valves[zone.id]);
  const totalFlow = pumpOn ? openZones.reduce((sum, zone) => sum + zone.demand, 0) : 0;
  const overCapacity = totalFlow > PUMP_MAX_FLOW;
  const pressure = !pumpOn ? 0 : totalFlow === 0 ? 2.35 : Math.max(0.3, 2.35 - totalFlow / 500);
  const head = pressure * 10.2;

  const toggleValve = (id: ZoneId) => setValves((current) => ({ ...current, [id]: !current[id] }));

  const alert = overCapacity
    ? {
        tone: 'danger',
        title: 'อัตราการไหลเกินความสามารถของปั๊ม',
        text: `รวม ${totalFlow.toFixed(2)} L/min แต่ปั๊มรับได้สูงสุด ${PUMP_MAX_FLOW} L/min — แรงดันจะตกและปลายสายน้ำไม่พอ ต้องเปิดทีละโซนหรือแบ่งรอบให้น้ำ`,
      }
    : !pumpOn && openZones.length > 0
      ? {
          tone: 'warn',
          title: 'วาล์วเปิดอยู่แต่ปั๊มปิด',
          text: 'น้ำไม่ไหลเพราะไม่มีแรงดัน ควรเปิดปั๊มก่อนหรือปิดวาล์วที่ไม่ได้ใช้',
        }
      : openZones.length === 0
        ? {
            tone: 'warn',
            title: 'ไม่มีโซนที่เปิดน้ำ',
            text: 'ปั๊มกำลังทำงานแต่ไม่มีจุดจ่ายน้ำ ถ้าปั๊มทำงานนานในสภาวะนี้จะร้อนและสึกหรอ',
          }
        : {
            tone: 'ok',
            title: 'ระบบทำงานอยู่ในช่วงปกติ',
            text: 'ควรเปิดทีละโซนเพื่อรักษาแรงดันให้สม่ำเสมอตลอดสายท่อ',
          };

  return (
    <div className="sim-wrap">
      <p className="sim-lead">
        ผังแปลงตัวอย่างพื้นที่รวม 1,152.88 ตร.ม. (0.72 ไร่) ใช้ปั๊ม WCM-1505T ขนาด 2 HP
        (150–500 L/min) จ่ายน้ำผ่านวาล์วโซลีนอยด์แยก 3 โซน
        — ลองสลับวาล์วแล้วดูว่าแรงดันกับอัตราการไหลเปลี่ยนอย่างไร
      </p>

      <svg className="sim-svg" viewBox="0 0 690 360" role="img" aria-label="ผังแปลงเกษตร 3 โซนกับปั๊มและวาล์วน้ำ">
        <rect x="20" y="90" width="650" height="230" rx="16" fill="#f4f7f2" stroke="#e3ebe0" />

        {zones.map((zone) => {
          const open = valves[zone.id] && pumpOn;
          return (
            <g key={zone.id}>
              <rect
                x={zone.plot.x}
                y={zone.plot.y}
                width={zone.plot.w}
                height={zone.plot.h}
                rx="12"
                fill={open ? zone.fill : '#f0f2ee'}
                stroke={open ? zone.color : '#dfe5dc'}
                strokeWidth={open ? 2.5 : 1.5}
                strokeDasharray={open ? undefined : '6 5'}
              />
              <text x={zone.plot.x + 12} y={zone.plot.y + 24} className="tch-plot-title">
                {zone.name}
              </text>
              <text x={zone.plot.x + 12} y={zone.plot.y + 40} className="tch-plot-sub">
                {zone.system}
              </text>
              <text x={zone.plot.x + 12} y={zone.plot.y + zone.plot.h - 12} className="tch-plot-q">
                {open ? `Q = ${zone.demand} L/min` : 'ปิดวาล์ว'}
              </text>

              {open &&
                [0.34, 0.52, 0.7].map((ratio, index) => (
                  <g key={index} transform={`translate(${zone.plot.x + zone.plot.w * ratio}, ${zone.plot.y + 62})`}>
                    <path d="M0 18 V0" stroke={zone.color} strokeWidth="2" />
                    <circle cx="0" cy="24" r="4" fill="#3b8fd9" className="tch-drop" style={{ animationDelay: `${index * 0.4}s` }} />
                  </g>
                ))}
            </g>
          );
        })}

        {/* ปั๊ม + ท่อเมน */}
        <rect x="44" y="292" width="86" height="20" rx="5" fill="#dfe7e2" />
        <rect x="44" y="270" width="86" height="24" rx="6" className={pumpOn ? 'tch-pump on' : 'tch-pump'} />
        <text x="87" y="286" textAnchor="middle" className="tch-plot-q">
          {pumpOn ? 'PUMP ON' : 'PUMP OFF'}
        </text>

        <path d="M132 282 H660" className="tch-pipe" />
        <path d="M132 282 H660" className={`tch-pipe-flow ${totalFlow > 0 && !overCapacity ? 'on' : ''}`} />

        {zones.map((zone) => {
          const valveX = zone.plot.x + zone.plot.w / 2;
          return (
            <g key={`valve-${zone.id}`}>
              <path d={`M${valveX} 282 V${zone.plot.y + zone.plot.h}`} className="tch-pipe" />
              <path
                d={`M${valveX} 282 V${zone.plot.y + zone.plot.h}`}
                className={`tch-pipe-flow ${valves[zone.id] && pumpOn ? 'on' : ''}`}
              />
              <circle
                cx={valveX}
                cy={302}
                r="11"
                fill={valves[zone.id] ? zone.color : '#ffffff'}
                stroke={zone.color}
                strokeWidth="2.5"
              />
              <circle cx={valveX} cy={302} r="3.5" fill={valves[zone.id] ? '#ffffff' : zone.color} />
            </g>
          );
        })}
      </svg>

      <div className="tch-metrics">
        <div className="sim-metric">
          <span>อัตราการไหลรวม (Q)</span>
          <strong>
            {totalFlow.toFixed(2)} <em>L/min</em>
          </strong>
        </div>
        <div className="sim-metric">
          <span>แรงดันใช้งาน (Head)</span>
          <strong>
            {pressure.toFixed(2)} <em>bar</em>
          </strong>
        </div>
        <div className="sim-metric">
          <span>เฮดรวม</span>
          <strong>
            {head.toFixed(1)} <em>m</em>
          </strong>
        </div>
        <div className="sim-metric">
          <span>โซนที่เปิดน้ำ</span>
          <strong>
            {openZones.length} <em>/ 3</em>
          </strong>
        </div>
      </div>

      <div className="tch-valves">
        {zones.map((zone) => (
          <button
            key={zone.id}
            className={`tch-valve ${valves[zone.id] ? 'on' : ''}`}
            onClick={() => toggleValve(zone.id)}
            aria-pressed={valves[zone.id]}
          >
            <span className="tch-valve-dot" style={{ background: valves[zone.id] ? zone.color : '#cfd8d2' }} />
            <span className="tch-valve-text">
              <strong>{zone.name}</strong>
              <small>{zone.demand} L/min</small>
            </span>
            <span className={`tch-switch ${valves[zone.id] ? 'on' : ''}`} aria-hidden="true" />
          </button>
        ))}
      </div>

      <div className="tch-controls">
        <button className="tch-btn primary" onClick={() => setPumpOn((value) => !value)}>
          {pumpOn ? 'ปิดปั๊ม' : 'เปิดปั๊ม'}
        </button>
        <button className="tch-btn" onClick={() => setValves({ zone1: true, zone2: false, zone3: false })}>
          <RotateCcw size={14} /> เปิดโซน 1 เท่านั้น
        </button>
        <button className="tch-btn" onClick={() => setValves({ zone1: false, zone2: true, zone3: false })}>
          <Waves size={14} /> เปิดโซนข้าว
        </button>
      </div>

      <div className={`sim-status ${alert.tone}`}>
        {alert.tone === 'ok' ? <CheckCircle2 size={17} /> : <AlertTriangle size={17} />}
        <div>
          <strong>{alert.title}</strong>
          <span>{alert.text}</span>
        </div>
      </div>

      <div className="tch-hint-row">
        <span>
          <Droplets size={13} /> โซนข้าวใช้ 959.04 L/min เกินกำลังปั๊ม 500 L/min
          จึงต้องแบ่งรอบหรือจ่ายเป็นช่วง
        </span>
        <span>
          <Gauge size={13} /> แรงดันใช้ชดเชยความสูงและแรงเสียดทานในท่อ
        </span>
      </div>

      <p className="sim-note">
        ตัวเลขแรงดันในแบบจำลองนี้คำนวณแบบง่ายเพื่อให้เห็นแนวโน้ม (เปิดหลายโซน = แรงดันตก)
        ไม่ใช่ผลคำนวณชลศาสตร์จากแบบก่อสร้างจริง
      </p>
    </div>
  );
}
