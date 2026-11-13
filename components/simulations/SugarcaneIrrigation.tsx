const stages = [
  { name: 'งอก', need: 1, note: 'น้ำน้อยแต่บ่อย' },
  { name: 'แตกกอ', need: 2, note: 'เพิ่มน้ำ' },
  { name: 'ย่างปล้อง', need: 4, note: 'ต้องการมากสุด' },
  { name: 'สุกแก่', need: 0, note: 'หยุดก่อนเก็บเกี่ยว' },
];

/** ภาพจำลอง: น้ำหยดซึมถึงราก + ความต้องการน้ำในแต่ละระยะการเติบโตของอ้อย */
export default function SugarcaneIrrigation() {
  return (
    <div className="sim-wrap">
      <p className="sim-lead">
        ระบบน้ำหยดปล่อยน้ำทีละจุดใต้ต้น ทำให้น้ำซึมลงเฉพาะรอบราก
        แทนที่จะปล่อยท่วมทั้งแปลง — ประหยัดน้ำและลดวัชพืช
      </p>

      <svg
        className="sim-svg"
        viewBox="0 0 550 340"
        role="img"
        aria-label="น้ำหยดซึมลงดินถึงรากอ้อย"
      >
        {/* ดิน */}
        <rect x="20" y="190" width="510" height="140" fill="#7a5c3e" />
        <g fill="#5e452c">
          <circle cx="50" cy="230" r="6" />
          <circle cx="200" cy="295" r="7" />
          <circle cx="350" cy="315" r="6" />
          <circle cx="495" cy="245" r="7" />
        </g>

        {/* ดินเปียกใต้ต้นแต่ละต้น */}
        {[120, 275, 430].map((x) => (
          <g key={x} transform={`translate(${x},190)`}>
            <path
              className="sim-wet"
              d="M-75 0 A75 60 0 0 0 75 0 Z"
              fill="#3b8fd9"
            />
          </g>
        ))}

        {/* เทปน้ำหยด */}
        <rect x="20" y="137" width="510" height="6" rx="3" fill="#444441" />
        {[138, 293, 448].map((x) => (
          <rect key={x} x={x} y="143" width="12" height="7" rx="2" fill="#2c2c2a" />
        ))}

        {/* หยดน้ำ */}
        <g fill="#3b8fd9">
          {[
            { x: 144, delay: '0s' },
            { x: 144, delay: '.7s' },
            { x: 299, delay: '.2s' },
            { x: 299, delay: '.9s' },
            { x: 454, delay: '.4s' },
            { x: 454, delay: '1.1s' },
          ].map((drop, index) => (
            <ellipse
              key={index}
              className="sim-fall"
              cx={drop.x}
              cy="156"
              rx="3.5"
              ry="5"
              style={{ animationDelay: drop.delay }}
            />
          ))}
        </g>

        {/* ต้นอ้อย + ราก */}
        {[
          { x: 120, delay: '0s' },
          { x: 275, delay: '-1s' },
          { x: 430, delay: '-2s' },
        ].map((plant) => (
          <g key={plant.x} transform={`translate(${plant.x},190)`}>
            <path
              d="M0 0 Q-20 30 -42 46 M0 0 V52 M0 0 Q20 30 40 48"
              stroke="#e6d9c3"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
            <g
              className="sim-sway"
              style={{ animationDelay: plant.delay }}
              fill="none"
              strokeLinecap="round"
            >
              <path d="M0 0 V-95" stroke="#97c459" strokeWidth="6" />
              <path
                d="M0 -70 Q-35 -95 -55 -70 M0 -85 Q35 -115 58 -90 M0 -55 Q30 -75 48 -55 M0 -95 Q-10 -115 -2 -125"
                stroke="#3b6d11"
                strokeWidth="5"
              />
            </g>
          </g>
        ))}

        <text x="30" y="128" fontSize="12" fill="#888780">
          เทปน้ำหยด
        </text>
        <text x="275" y="322" textAnchor="middle" fontSize="12" fill="#f1efe8">
          น้ำซึมเฉพาะรอบรากพืช ไม่เสียน้ำทั้งแปลง
        </text>
      </svg>

      <h4 className="sim-subtitle">ความต้องการน้ำในแต่ละระยะ</h4>
      <p className="sim-lead">
        จำนวนหยดน้ำคือระดับความต้องการน้ำ — ระยะย่างปล้องต้องการน้ำมากที่สุด
        ส่วนระยะสุกแก่ควรลดหรือหยุดน้ำเพื่อเพิ่มความหวานก่อนเก็บเกี่ยว
      </p>

      <div className="sim-stages">
        {stages.map((stage) => (
          <div className="sim-stage" key={stage.name}>
            <strong>{stage.name}</strong>
            <div className="sim-drops" aria-hidden="true">
              {Array.from({ length: stage.need }).map((_, index) => (
                <span key={index} className="sim-drop" />
              ))}
              {stage.need === 0 && <span className="sim-drop-none">หยุดน้ำ</span>}
            </div>
            <span>{stage.note}</span>
          </div>
        ))}
      </div>

      <p className="sim-note">
        ในระบบจริงสามารถผูก “ระยะการเติบโต” กับเกณฑ์น้ำในดินของแต่ละแปลง
        แล้วให้ backend สั่งปั๊มตามค่าที่อ่านได้ แทนการให้น้ำตามเวลาเพียงอย่างเดียว
      </p>
    </div>
  );
}
