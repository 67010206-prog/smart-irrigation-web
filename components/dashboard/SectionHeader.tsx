import type { ReactNode } from 'react';

interface SectionHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}

/** หัวข้อของแต่ละ Section ของ Dashboard */
export default function SectionHeader({
  eyebrow,
  title,
  description,
  children,
}: SectionHeaderProps) {
  return (
    <div className="dash-section-head">
      <div className="dash-section-copy">
        <span className="dash-eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>

      {children ? <div className="dash-section-actions">{children}</div> : null}
    </div>
  );
}
