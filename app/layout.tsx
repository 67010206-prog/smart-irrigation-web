import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import './globals.css';
import './zones.css';
import './simulations.css';
import './docs.css';
import './teaching.css';
import './docs-type.css';
import './debug.css';

export const metadata: Metadata = {
  title: 'Smart Irrigation | ระบบให้น้ำอัจฉริยะ',
  description:
    'Smart Irrigation Dashboard - ระบบติดตามความชื้นดินและควบคุมปั๊มน้ำอัจฉริยะ',
};

export const viewport: Viewport = {
  themeColor: '#f5f7f4',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
