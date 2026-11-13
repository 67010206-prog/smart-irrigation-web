import { Bell, CircleHelp, Wifi } from 'lucide-react';

import type { PageKey } from '../lib/types/iot';

interface TopbarProps {
  page: PageKey;
  lastUpdated: Date;
  online: boolean;
}

export default function Topbar({ page, lastUpdated, online }: TopbarProps) {
  const isControl = page === 'control';
  return (
    <header className="topbar">
      <div className="breadcrumb"><span>AgriFlow</span><span className="crumb-slash">/</span><strong>{isControl ? 'Control Center' : 'Docs & Learning'}</strong></div>
      <div className="topbar-actions">
        <div className="demo-pill"><span className="pulse-dot" /> {online ? 'LIVE' : 'OFFLINE'}</div>
        <div className="connection-pill"><Wifi size={15} /><span>{online ? 'API connected' : 'API offline'}</span></div>
        <button className="icon-button top-icon" title="ช่วยเหลือ"><CircleHelp size={18} /></button>
        <button className="icon-button top-icon notification-button" title="การแจ้งเตือน"><Bell size={18} /><i /></button>
      </div>
    </header>
  );
}
