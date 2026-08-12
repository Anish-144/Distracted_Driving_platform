import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Car, BookOpen, BarChart2, Settings,
  Microscope, Users, PieChart, MessageSquare, Shield,
} from 'lucide-react';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import { useAppSelector } from '@/store';

const secondaryNav = [
  { label: 'Settings', href: '/settings', icon: Settings },
];

type NavItemType = { label: string; href: string; icon: any; badge?: string };

function NavItem({ item, isActive }: { item: NavItemType; isActive: boolean }) {
  return (
    <Link href={item.href}>
      <div
        id={`sidebar-${item.label.toLowerCase()}`}
        className={clsx(
          'relative flex items-center gap-3 px-3 py-2 text-sm font-medium',
          'transition-all duration-150 cursor-pointer select-none',
        )}
        style={{
          borderRadius: '4px',
          background: isActive ? 'var(--color-primary)' : 'transparent',
          color: isActive ? 'var(--color-primary-text)' : 'var(--text-secondary)',
          fontFamily: 'Space Grotesk, sans-serif',
        }}
        onMouseEnter={(e) => {
          if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)';
          if (!isActive) (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
        }}
        onMouseLeave={(e) => {
          if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent';
          if (!isActive) (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
        }}
      >
        <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="flex-1 truncate text-[13px]">{item.label}</span>
        {item.badge && (
          <span
            className="inline-flex items-center px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide"
            style={{
              background: isActive ? 'rgba(26,24,20,0.15)' : 'var(--color-primary)',
              color: isActive ? '#1A1814' : '#1A1814',
              borderRadius: '3px',
            }}
          >
            {item.badge}
          </span>
        )}
      </div>
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAppSelector((state) => state.auth);

  const primaryNav: NavItemType[] = user?.is_admin
    ? [
        { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
        { label: 'Users',     href: '/admin/users',     icon: Users },
        { label: 'Analytics', href: '/admin/analytics', icon: PieChart },
        { label: 'Feedback',  href: '/admin/feedback',  icon: MessageSquare },
        { label: 'Research',  href: '/admin/research',  icon: Microscope },
      ]
    : [
        { label: 'Dashboard',  href: '/dashboard',          icon: LayoutDashboard },
        { label: 'Simulation', href: '/simulation',          icon: Car,      badge: 'GO' },
        { label: 'Lessons',    href: '/lessons',             icon: BookOpen },
        { label: 'Progress',   href: '/dashboard/progress',  icon: BarChart2 },
        { label: 'Research',   href: '/dashboard/research',  icon: Microscope },
      ];

  return (
    <aside
      className="hidden lg:flex flex-col h-screen flex-shrink-0 relative z-30"
      style={{
        width: 'var(--sidebar-width)',
        background: 'var(--bg-panel)',
        borderRight: '1px solid var(--border-subtle)',
      }}
    >
      <div className="flex flex-col h-full">

        {/* ── Brand ────────────────────────────────────────────────── */}
        <div
          className="h-14 flex items-center px-5 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-6 h-6 flex items-center justify-center flex-shrink-0"
              style={{ background: '#C8FF00', borderRadius: '3px' }}
            >
              <Shield className="w-3.5 h-3.5" style={{ color: '#1A1814' }} />
            </div>
            <span
              className="font-bold text-[13px] tracking-tight"
              style={{ color: 'var(--text-primary)', fontFamily: 'Space Grotesk, sans-serif' }}
            >
              SAFEDRIVE
            </span>
          </div>
        </div>

        {/* ── Navigation ───────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-0.5">
          <p className="label-caps px-3 mb-2">Menu</p>

          {primaryNav.map((item) => (
            <NavItem key={item.href} item={item} isActive={pathname === item.href} />
          ))}

          <div
            className="my-4 mx-0 h-px"
            style={{ background: 'var(--border-subtle)' }}
          />

          <p className="label-caps px-3 mb-2">Account</p>
          {secondaryNav.map((item) => (
            <NavItem key={item.href} item={item} isActive={pathname === item.href} />
          ))}
        </div>

        {/* ── Footer ───────────────────────────────────────────────── */}
        <div
          className="flex-shrink-0 px-5 py-4"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          <p
            className="text-[10px] font-medium tracking-[0.06em] uppercase"
            style={{ color: 'var(--text-muted)' }}
          >
            Shreya Dixit Foundation
          </p>
        </div>
      </div>
    </aside>
  );
}
