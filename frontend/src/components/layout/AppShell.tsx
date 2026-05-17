/**
 * AppShell — unified layout wrapper used by every authenticated page.
 *
 * Provides:
 *  - Sidebar (left, fixed width)
 *  - Navbar  (top, sticky)
 *  - Page content area with standardised padding / max-width
 *
 * Design tokens baked in (matching the reference screenshot):
 *  - bg: #f0fdf9 (very light mint)
 *  - sidebar: white, 240px wide, clean border-right
 *  - content: max-w-5xl, px-8 py-8
 */
import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

interface AppShellProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export default function AppShell({ children, className = '', style }: AppShellProps) {
  return (
    <div
      className={`min-h-screen flex font-sans text-gray-900 ${className}`}
      style={style || { background: '#f0fdf9' }}
    >
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />
        <main className="flex-1 px-6 py-8 lg:px-10 lg:py-10">
          <div className="max-w-5xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
