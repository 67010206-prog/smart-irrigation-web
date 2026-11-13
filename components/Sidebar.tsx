
import {
  BookOpen,
  ChevronLeft,
  Leaf,
  LayoutDashboard,
  Waves,
  Database
} from 'lucide-react';

import type { PageKey } from '../lib/types/iot';

interface SidebarProps {
  page: PageKey;
  setPage: (page: PageKey) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export default function Sidebar({
  page,
  setPage,
  collapsed,
  setCollapsed
}: SidebarProps) {
  return (
    <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>

      {/* โลโก้และชื่อระบบ */}
      <div className="brand-row">
        <div className="brand-mark">
          <Leaf size={21} strokeWidth={2.4} />
        </div>

        {!collapsed && (
          <div className="brand-copy">
            <strong>AgriFlow</strong>
            <span>SMART IRRIGATION</span>
          </div>
        )}

        <button
          className="icon-button sidebar-collapse"
          onClick={() => setCollapsed(!collapsed)}
          aria-label="ย่อหรือขยายเมนู"
        >
          <ChevronLeft
            size={17}
            className={collapsed ? 'rotate-180' : ''}
          />
        </button>
      </div>

      {!collapsed && (
        <div className="nav-label">WORKSPACE</div>
      )}

      {/* เมนูหลัก */}
      <nav className="side-nav" aria-label="เมนูหลัก">

        {/* หน้า Control */}
        <button
          className={`nav-item ${page === 'control' ? 'active' : ''}`}
          onClick={() => setPage('control')}
          title="Control"
        >
          <LayoutDashboard size={19} />
          <span>Control</span>
        </button>

        {/* หน้า Docs & Learning */}
        <button
          className={`nav-item ${page === 'docs' ? 'active' : ''}`}
          onClick={() => setPage('docs')}
          title="Docs & Learning"
        >
          <BookOpen size={19} />
          <span>Docs & Learning</span>
        </button>

        {/* หน้า Data Storage */}
        <button
          className={`nav-item ${page === 'storage' ? 'active' : ''}`}
          onClick={() => setPage('storage')}
          title="Data Storage"
        >
          <Database size={19} />
          <span>Data Storage</span>
        </button>

      </nav>

      {/* ส่วนล่าง Sidebar */}
      <div className="sidebar-bottom">
        <div className="sidebar-help-icon">
          <Waves size={17} />
        </div>

        {!collapsed && (
          <div className="sidebar-help-copy">
            <strong>AgriFlow System</strong>
            <span>Prototype · v1.0.0</span>
          </div>
        )}
      </div>

    </aside>
  );
}
