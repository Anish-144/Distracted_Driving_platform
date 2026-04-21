import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex w-60 flex-col min-h-screen bg-gray-50 border-r border-gray-200">
      {/* Branding */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-gray-200 bg-white">
        <div className="w-8 h-8 rounded-md bg-brand-600 flex items-center justify-center shadow-sm">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-bold text-gray-900 text-sm">SafeDrive AI</p>
          <p className="text-xs text-gray-500">Training Platform</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 space-y-1 bg-gray-50">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-3 mb-3">
          Navigation
        </p>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <div
                id={`sidebar-${item.label.toLowerCase()}`}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors duration-150 cursor-pointer border',
                  isActive 
                    ? 'text-brand-700 bg-brand-50 border-brand-200 font-medium shadow-sm' 
                    : 'text-gray-600 border-transparent hover:bg-gray-100 hover:text-gray-900'
                )}
              >
                <item.icon className={clsx("w-4 h-4 flex-shrink-0", isActive ? "text-brand-600" : "text-gray-400")} />
                <span>{item.label}</span>
                {item.label === 'Simulation' && (
                  <span className="ml-auto badge-success text-[10px] px-1.5 py-0.5 border-brand-200 bg-white shadow-sm">Go</span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Bottom: Week Progress */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-600">Week 1 Progress</span>
            <span className="text-xs text-brand-600 font-semibold">Foundation</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
            <div className="bg-brand-500 h-1.5 rounded-full" style={{ width: '20%' }} />
          </div>
          <p className="text-xs text-gray-400 mt-2">Apr 7–13 • 5 weeks total</p>
        </div>
      </div>
    </aside>
  );
}
