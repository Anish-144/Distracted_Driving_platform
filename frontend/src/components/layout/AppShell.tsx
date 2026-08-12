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
  maxWidth?: 'default' | 'wide';
}

export default function AppShell({ children, className = '', style, maxWidth = 'default' }: AppShellProps) {
  const contentMaxWidth = maxWidth === 'wide' ? 'max-w-7xl' : 'max-w-5xl';

  return (
    <div
      className={`h-screen overflow-hidden flex font-sans relative ${className}`}
      style={{ background: 'var(--bg-app-shell)', ...style }}
    >
      {/* Global ambient glow — subtle indigo orbs */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background:
            'radial-gradient(ellipse 40% 30% at 15% 10%, rgba(108,99,255,0.05) 0%, transparent 60%), ' +
            'radial-gradient(ellipse 30% 40% at 85% 80%, rgba(139,92,246,0.04) 0%, transparent 60%)',
        }}
      />

      {/* Sidebar */}
      <Sidebar />

      {/* Content column */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        <Navbar />
        <main className="flex-1 overflow-y-auto px-6 py-8 lg:px-10 lg:py-10">
          <div className={`${contentMaxWidth} mx-auto w-full`}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
