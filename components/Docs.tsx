import { useState } from 'react';
import type { ReactElement } from 'react';
import {
  BookMarked,
  BookOpen,
  Cable,
  Calculator,
  ChevronRight,
  CloudRain,
  Cpu,
  Droplets,
  Layers,
  ListChecks,
  MapPin,
  Presentation,
  RadioTower,
  Ruler,
  Search,
  ShieldCheck,
  Sprout,
  Waves,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Architecture, Intro } from './docs/Overview';
import { ClimateET, GuideIntro } from './docs/GuideBasics';
import { SoilWater, WaterFlow } from './docs/GuideSoil';
import { IrrigationTech, WorkedExample } from './docs/GuideIrrigation';
import { Glossary, Quiz } from './docs/GuidePractice';
import { Communication, ControlLogic, Hardware, Safety } from './docs/System';

import SoilWaterTank from './simulations/SoilWaterTank';
import IrrigationJourney from './simulations/IrrigationJourney';
import FarmLayout from './simulations/FarmLayout';
import LevelingInstrument from './simulations/LevelingInstrument';
import SugarcaneIrrigation from './simulations/SugarcaneIrrigation';

interface DocArticle {
  id: string;
  label: string;
  group: string;
  icon: LucideIcon;
  Content: () => ReactElement;
}

const articles: DocArticle[] = [
  // ---------- ภาพรวมระบบ ----------
  { id: 'intro', label: 'เริ่มต้นใช้งาน', group: 'ภาพรวมระบบ', icon: BookOpen, Content: Intro },
  { id: 'architecture', label: 'สถาปัตยกรรมระบบ', group: 'ภาพรวมระบบ', icon: Layers, Content: Architecture },

  // ---------- วิทยาศาสตร์ดินและน้ำ ----------
  { id: 'guide-intro', label: 'ทำไมชลประทานจึงสำคัญ', group: 'วิทยาศาสตร์ดินและน้ำ', icon: Sprout, Content: GuideIntro },
  { id: 'climate-et', label: 'ภูมิอากาศและการคายระเหย', group: 'วิทยาศาสตร์ดินและน้ำ', icon: CloudRain, Content: ClimateET },
  { id: 'soil-water', label: 'ดินกับถังเก็บน้ำ', group: 'วิทยาศาสตร์ดินและน้ำ', icon: Droplets, Content: SoilWater },
  { id: 'water-flow', label: 'น้ำเข้าดินและ NIR', group: 'วิทยาศาสตร์ดินและน้ำ', icon: Waves, Content: WaterFlow },
  { id: 'irrigation-systems', label: 'ระบบให้น้ำและ Fertigation', group: 'วิทยาศาสตร์ดินและน้ำ', icon: Cable, Content: IrrigationTech },
  { id: 'worked-example', label: 'โจทย์คำนวณทีละขั้น', group: 'วิทยาศาสตร์ดินและน้ำ', icon: Calculator, Content: WorkedExample },
  { id: 'quiz', label: 'แบบฝึกหัดและเฉลย', group: 'วิทยาศาสตร์ดินและน้ำ', icon: ListChecks, Content: Quiz },
  { id: 'glossary', label: 'อภิธานศัพท์', group: 'วิทยาศาสตร์ดินและน้ำ', icon: BookMarked, Content: Glossary },

  // ---------- การพัฒนา ----------
  { id: 'hardware', label: 'ฮาร์ดแวร์ของ AgriFlow', group: 'การพัฒนา', icon: Cpu, Content: Hardware },
  { id: 'communication', label: 'การสื่อสาร MQTT', group: 'การพัฒนา', icon: RadioTower, Content: Communication },
  { id: 'control', label: 'ตรรกะการควบคุมปั๊ม', group: 'การพัฒนา', icon: Cable, Content: ControlLogic },

  // ---------- การใช้งาน ----------
  { id: 'safety', label: 'การทดสอบและความปลอดภัย', group: 'การใช้งาน', icon: ShieldCheck, Content: Safety },

  // ---------- สื่อการสอน ----------
  { id: 'sim-soil', label: 'ดินคือถังน้ำ (จำลอง)', group: 'สื่อการสอน', icon: Droplets, Content: SoilWaterTank },
  { id: 'sim-level', label: 'กล้องระดับ (จำลอง)', group: 'สื่อการสอน', icon: Ruler, Content: LevelingInstrument },
  { id: 'sim-sugarcane', label: 'น้ำหยดกับอ้อย (จำลอง)', group: 'สื่อการสอน', icon: Waves, Content: SugarcaneIrrigation },
  { id: 'sim-journey', label: 'เส้นทางน้ำ 4 ฉาก (จำลอง)', group: 'สื่อการสอน', icon: Presentation, Content: IrrigationJourney },
  { id: 'sim-farm', label: 'ผังแปลง 3 โซน (จำลอง)', group: 'สื่อการสอน', icon: MapPin, Content: FarmLayout },
];

function ArticleIconBox({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <div className="article-title-icon">
      <Icon size={22} />
    </div>
  );
}

export default function Docs() {
  const [active, setActive] = useState(articles[0].id);
  const [query, setQuery] = useState('');

  const selected = articles.find((article) => article.id === active) ?? articles[0];
  const filtered = articles.filter((article) =>
    article.label.toLowerCase().includes(query.toLowerCase())
  );
  const groups = [...new Set(filtered.map((article) => article.group))];

  const activeIndex = articles.findIndex((article) => article.id === selected.id);
  const progress = Math.round(((activeIndex + 1) / articles.length) * 100);

  const SelectedContent = selected.Content;

  return (
    <div className="page-content docs-page">
      <div className="page-heading-row docs-heading">
        <div>
          <div className="eyebrow">KNOWLEDGE BASE / LEARNING</div>
          <h1>Docs & Learning</h1>
          <p>คู่มือวิทยาศาสตร์ดินและน้ำ ระบบชลประทาน และคู่มือการใช้งาน AgriFlow</p>
        </div>

        <div className="docs-count">
          <BookOpen size={18} />
          <div>
            <strong>{String(articles.length).padStart(2, '0')}</strong>
            <span>บทเรียน</span>
          </div>
        </div>
      </div>

      <div className="docs-layout">
        <aside className="docs-sidebar">
          <div className="docs-search">
            <Search size={16} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ค้นหาบทเรียน..."
            />
          </div>

          {groups.length === 0 && <p className="empty-search">ไม่พบบทเรียนที่ค้นหา</p>}

          {groups.map((group) => (
            <div className="docs-nav-group" key={group}>
              <div className="docs-nav-label">{group}</div>

              {filtered
                .filter((article) => article.group === group)
                .map((article) => {
                  const Icon = article.icon;

                  return (
                    <button
                      key={article.id}
                      className={`docs-nav-item ${active === article.id ? 'selected' : ''}`}
                      onClick={() => setActive(article.id)}
                    >
                      <Icon size={16} />
                      <span>{article.label}</span>
                      <ChevronRight size={14} className="docs-chevron" />
                    </button>
                  );
                })}
            </div>
          ))}

          <div className="docs-progress">
            <div className="progress-title">
              <span>ความคืบหน้า</span>
              <strong>
                {activeIndex + 1}/{articles.length}
              </strong>
            </div>
            <div className="progress-track">
              <span style={{ width: `${progress}%` }} />
            </div>
            <small>เลือกอ่านบทเรียนเพื่อทำความเข้าใจระบบ</small>
          </div>
        </aside>

        <article className="docs-article">
          <div className="article-topline">
            <div className="article-category">{selected.group}</div>
            <span>คู่มือการเรียนรู้ · AgriFlow</span>
          </div>

          <div className="article-title-row">
            <div>
              <h2>{selected.label}</h2>
              <p>ทำความเข้าใจหลักการและแนวทางการพัฒนาระบบให้น้ำอัจฉริยะ</p>
            </div>
            <ArticleIconBox icon={selected.icon} />
          </div>

          <div className="article-rule" />

          <div className="article-body">
            <SelectedContent />
          </div>

          <div className="article-bottom">
            <span>
              <BookOpen size={14} /> AgriFlow Learning Center
            </span>
            <span>Prototype Documentation</span>
          </div>
        </article>
      </div>
    </div>
  );
}
