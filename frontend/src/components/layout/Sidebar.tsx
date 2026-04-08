import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  LayoutDashboard,
  Car,
  BookOpen,
  BarChart2,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import clsx from 'clsx';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Simulation', href: '/simulation', icon: Car },
  { label: 'Lessons', href: '/lessons', icon: BookOpen },
  { label: 'Progress', href: '/dashboard/progress', icon: BarChart2 },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export default function Sidebar() {
  const { pathname } = useRouter();

  return (
    <aside className="hidden lg:flex w-60 flex-col min-h-screen bg-surface-800/50 border-r border-surface-600/50 backdrop-blur-sm">
      {/* Branding */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-surface-600/50">
        <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-bold text-white text-sm">SafeDrive AI</p>
          <p className="text-xs text-gray-500">Training Platform</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 space-y-1">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-3">
          Navigation
        </p>
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link key={item.href} href={item.href}>
              <div
                id={`sidebar-${item.label.toLowerCase()}`}
                className={clsx('nav-link', isActive && 'active')}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">{item.label}</span>
                {item.label === 'Simulation' && (
                  <span className="ml-auto badge-success text-xs px-1.5">Go</span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Bottom: Week Progress */}
      <div className="p-4 border-t border-surface-600/50">
        <div className="glass rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-300">Week 1 Progress</span>
            <span className="text-xs text-brand-400 font-semibold">Foundation</span>
          </div>
          <div className="w-full bg-surface-500 rounded-full h-1.5">
            <div className="bg-brand-500 h-1.5 rounded-full" style={{ width: '20%' }} />
          </div>
          <p className="text-xs text-gray-500 mt-1.5">Apr 7–13 • 5 weeks total</p>
        </div>
      </div>
    </aside>
  );
}
