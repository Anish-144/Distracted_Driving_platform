/**
 * AppShell — unified layout wrapper used by every authenticated page.
 *
 * Provides:
 *  - Sidebar (left, fixed width via --sidebar-width CSS variable)
 *  - Navbar  (top, sticky within the content column)
 *  - Page content area with isolated scroll, standardised padding / max-width
 *
 * Props:
 *  - maxWidth: 'default' (max-w-5xl) | 'wide' (max-w-7xl) — for report/research pages
 */
import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

interface AppShellProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  maxWidth?: 'default' | 'wide' | 'full';
}

export default function AppShell({ children, className = '', style, maxWidth = 'default' }: AppShellProps) {
  let contentMaxWidth = 'max-w-7xl 2xl:max-w-[1600px]';
  if (maxWidth === 'wide') {
    contentMaxWidth = 'max-w-[1720px]';
  } else if (maxWidth === 'full') {
    contentMaxWidth = 'max-w-full';
  }

  return (
    <div
      className={`h-screen overflow-hidden flex bg-app-shell font-sans ${className}`}
      style={style}
    >
      {/* Sidebar: fixed-height, self-contained scroll */}
      <Sidebar />

      {/* Content column: flex col, takes remaining width, scrolls independently */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Navbar sticks to the top of this column, not the full page */}
        <Navbar />
        <main className="flex-1 overflow-y-auto px-6 py-6 lg:px-10 lg:py-8">
          <div className={`${contentMaxWidth} mx-auto w-full`}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
