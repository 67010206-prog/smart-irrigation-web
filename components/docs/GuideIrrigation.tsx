import { AlertTriangle, Droplets, Lightbulb, Ruler } from 'lucide-react';

/** คู่มือบทที่ 4: เทคโนโลยีการให้น้ำและ Fertigation */
export function IrrigationTech() {
  return (
    <>
      <p className="article-lead">
        ระบบการให้น้ำแบ่งได้หลายแบบตามวิธีส่งน้ำและประสิทธิภาพ
        ตัวเลขประสิทธิภาพคือสัดส่วนน้ำที่พืชได้รับจริงเทียบกับน้ำที่สูบออกมา
      </p>

      <h3>4.1 ประเภทระบบให้น้ำ</h3>
      <table className="doc-table">
        <thead>
          <tr>
            <th>ระบบ</th>
            <th>หลักการ</th>
            <th>ประสิทธิภาพ</th>
            <th>ข้อจำกัด</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>ท่วมแปลง / ร่อง (Surface, Furrow)</td>
            <td>ปล่อยน้ำไหลตามความลาดชันของแปลง</td>
            <td>50 – 60%</td>
            <td>ต้นทุนต่ำ แต่ระเหยและซึมลึกสูง</td>
          </tr>
          <tr>
            <td>ฉีดฝอย (Sprinkler)</td>
            <td>พ่นน้ำเป็นเม็ดฝนจากหัวฉีด</td>
            <td>70 – 80%</td>
            <td>เหมาะกับพืชไร่ แต่ลมแรงทำให้น้ำฟุ้งหาย</td>
          </tr>
          <tr>
            <td>น้ำหยด (Drip)</td>
            <td>จ่ายน้ำทีละหยดตรงเขตราก</td>
            <td>มากกว่า 90 – 95%</td>
            <td>ประหยัดที่สุด แต่อุดตันง่ายถ้ากรองไม่ดี</td>
          </tr>
        </tbody>
      </table>

      <h3>4.2 อุปกรณ์ในระบบท่อ</h3>
      <div className="hardware-list">
        <div>
          <div className="hardware-icon">
            <Droplets />
          </div>
          <div>
            <strong>ปั๊มน้ำ (Pump)</strong>
            <span>สร้างแรงดันให้ระบบ</span>
          </div>
        </div>
        <div>
          <div className="hardware-icon">
            <Ruler />
          </div>
          <div>
            <strong>ชุดกรอง (Filter)</strong>
            <span>ป้องกันหัวหยดอุดตัน</span>
          </div>
        </div>
        <div>
          <div className="hardware-icon">
            <Droplets />
          </div>
          <div>
            <strong>วาล์วควบคุม</strong>
            <span>แยกโซนให้น้ำตามแปลง</span>
          </div>
        </div>
        <div>
          <div className="hardware-icon">
            <Lightbulb />
          </div>
          <div>
            <strong>ท่อเวนจูรี (Venturi)</strong>
            <span>ดูดปุ๋ยเหลวเข้าสายน้ำด้วยสุญญากาศ</span>
          </div>
        </div>
      </div>

      <h3>เฟอร์ติเกชัน (Fertigation) ทำงานอย่างไร</h3>
      <p>
        เฟอร์ติเกชันคือการผสมปุ๋ยที่ละลายน้ำได้แล้วจ่ายไปพร้อมสายน้ำ
        โดยใช้ท่อเวนจูรีเป็นตัวดูดสารละลายจากถังปุ๋ยเข้าสู่ท่อหลัก
      </p>
      <ol>
        <li>น้ำไหลผ่านท่อที่ถูกบีบให้แคบลง ทำให้ความเร็วน้ำสูงขึ้น</li>
        <li>ตามหลักกลศาสตร์ของไหล ความดันบริเวณนั้นลดต่ำลงจนเกิดสุญญากาศ</li>
        <li>สุญญากาศดูดสารละลายปุ๋ยจากถังขึ้นมาผสมกับน้ำในท่อทันที</li>
        <li>น้ำผสมปุ๋ยไหลไปตามท่อน้ำหยดสู่เขตราก</li>
      </ol>

      <div className="doc-callout">
        <Lightbulb />
        <div>
          <strong>เทียบให้เห็นภาพ</strong>
          <span>
            หลักการเดียวกับปืนพ่นสีที่ใช้ลมดูดเนื้อสีขึ้นมาผสม — ไม่ต้องใช้ปั๊มไฟฟ้าเพิ่ม
          </span>
        </div>
      </div>

      <div className="doc-callout warning">
        <AlertTriangle />
        <div>
          <strong>ข้อควรระวัง</strong>
          <span>
            ปุ๋ยเข้มข้นอาจกัดกร่อนท่อและทำให้หัวหยดอุดตัน ควรล้างท่อด้วยน้ำสะอาดหลังจ่ายปุ๋ยทุกครั้ง
          </span>
        </div>
      </div>
    </>
  );
}

/** คู่มือ: โจทย์ตัวอย่างคำนวณทีละขั้น */
export function WorkedExample() {
  return (
    <>
      <p className="article-lead">
        ตัวอย่างจริงจากแปลงอ้อย จังหวัดสุพรรณบุรี — คำนวณตั้งแต่ปริมาณน้ำในเขตราก
        ไปจนถึงรอบเวรการให้น้ำและปริมาตรน้ำต่อไร่
      </p>

      <h3>ข้อมูลสนาม</h3>
      <table className="doc-table">
        <thead>
          <tr>
            <th>ค่า</th>
            <th>ค่าที่วัดได้</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>น้ำที่เป็นประโยชน์ของดินร่วน (AW)</td>
            <td>1.40 mm ต่อความลึกดิน 1 cm</td>
          </tr>
          <tr>
            <td>ความลึกเขตรากอ้อย</td>
            <td>100 cm (1 m)</td>
          </tr>
          <tr>
            <td>การใช้น้ำของอ้อยระยะย่างปล้อง (ETc)</td>
            <td>4.2 mm/วัน</td>
          </tr>
          <tr>
            <td>จุดวิกฤตที่ยอมให้ความชื้นลดลง (CP)</td>
            <td>50% ของน้ำที่เป็นประโยชน์</td>
          </tr>
        </tbody>
      </table>

      <h3>ขั้นตอนการคำนวณ</h3>
      <div className="doc-steps">
        <div>
          <strong>ขั้นที่ 1: น้ำที่เป็นประโยชน์ทั้งหมดในเขตราก</strong>
          <span>
            AW = 1.40 mm/cm × 100 cm = <strong>140 mm</strong>
          </span>
        </div>

        <div>
          <strong>ขั้นที่ 2: น้ำที่ยอมให้พืชใช้ก่อนถึงจุดวิกฤต (RAW)</strong>
          <span>
            RAW = 140 mm × 0.50 = <strong>70 mm</strong>
          </span>
        </div>

        <div>
          <strong>ขั้นที่ 3: รอบเวรการให้น้ำ</strong>
          <span>
            รอบเวร = RAW ÷ ETc = 70 mm ÷ 4.2 mm/วัน = 16.67 วัน
            → <strong>ปัดลงเป็น 16 วัน</strong> (กฎวิศวกรรม: ห้ามปัดขึ้น
            เพราะจะทำให้พืชขาดน้ำก่อนถึงรอบถัดไป)
          </span>
        </div>

        <div>
          <strong>ขั้นที่ 4: ปริมาตรน้ำต่อพื้นที่ 1 ไร่</strong>
          <span>
            น้ำหนา 1 mm บนพื้นที่ 1 ไร่ (1,600 ตร.ม.) = 1,600 ลิตร
            <br />
            70 mm × 1,600 ลิตร/mm = <strong>112,000 ลิตร/ไร่</strong> ={' '}
            <strong>112 ลูกบาศก์เมตร/ไร่</strong>
          </span>
        </div>
      </div>

      <div className="sim-status ok">
        <Droplets size={17} />
        <div>
          <strong>สรุปคำตอบ</strong>
          <span>
            แปลงนี้ควรให้น้ำทุก 16 วัน ครั้งละประมาณ 70 mm หรือ 112 ลบ.ม. ต่อไร่
            เพื่อเติมน้ำกลับไปถึงระดับความจุสนาม
          </span>
        </div>
      </div>

      <div className="doc-callout">
        <Lightbulb />
        <div>
          <strong>ทำไมต้องปัดลง</strong>
          <span>
            16.67 วันหมายถึงพืชจะถึงจุดวิกฤตก่อนครบ 17 วัน หากเลื่อนไปรดวันที่ 17
            พืชจะเริ่มเครียดและให้ผลผลิตลดลง
          </span>
        </div>
      </div>
    </>
  );
}
