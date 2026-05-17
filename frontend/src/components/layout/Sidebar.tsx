import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Car,
  BookOpen,
  BarChart2,
  Settings,
  ShieldCheck,
  Zap,
  Microscope,
} from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

const navItems = [
  { label: 'Dashboard',  href: '/dashboard',          icon: LayoutDashboard },
  { label: 'Simulation', href: '/simulation',          icon: Car },
  { label: 'Lessons',    href: '/lessons',             icon: BookOpen },
  { label: 'Progress',   href: '/dashboard/progress',  icon: BarChart2 },
  { label: 'Research',   href: '/dashboard/research',  icon: Microscope },
  { label: 'Settings',   href: '/settings',            icon: Settings },
];

const navVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05, delayChildren: 0.15 } },
};

const itemVariants = {
  hidden:   { opacity: 0, x: -12 },
  visible:  { opacity: 1, x: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex w-64 flex-col min-h-screen relative z-30 flex-shrink-0">
      {/* Glass panel */}
      <div
        className="flex flex-col h-full"
        style={{
          background: 'rgba(255,255,255,0.82)',
          backdropFilter: 'blur(24px) saturate(1.8)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.8)',
          borderRight: '1px solid rgba(0,0,0,0.07)',
          boxShadow: '1px 0 0 0 rgba(0,0,0,0.04)',
        }}
      >
        {/* Branding */}
        <motion.div
          className="h-16 flex items-center gap-3 px-5 border-b border-black/[0.06] flex-shrink-0"
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <motion.div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #059669, #0891b2)' }}
            animate={{ boxShadow: ['0 0 0px rgba(5,150,105,0.3)', '0 0 20px rgba(5,150,105,0.4)', '0 0 0px rgba(5,150,105,0.3)'] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ShieldCheck className="w-5 h-5 text-white" />
          </motion.div>
          <div>
            <p className="font-bold text-gray-900 text-sm tracking-tight">SafeDrive AI</p>
            <p className="text-[11px] text-gray-400 font-medium">Training Platform</p>
          </div>
        </motion.div>

        {/* Nav */}
        <motion.nav
          className="flex-1 px-3 py-6 space-y-0.5 overflow-y-auto"
          variants={navVariants}
          initial={false}
          animate="visible"
        >
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.14em] px-3 mb-3">
            Navigation
          </p>

          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <motion.div key={item.href} variants={itemVariants}>
                <Link href={item.href}>
                  <div
                    id={`sidebar-${item.label.toLowerCase()}`}
                    className={clsx(
                      'relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium cursor-pointer group',
                      'transition-all duration-300',
                      isActive
                        ? 'text-brand-700 bg-brand-50/80'
                        : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100/80'
                    )}
                    style={isActive ? {
                      boxShadow: '0 0 0 1px rgba(5,150,105,0.15), 0 1px 4px rgba(5,150,105,0.08)'
                    } : undefined}
                  >
                    {/* Active indicator bar */}
                    <AnimatePresence>
                      {isActive && (
                        <motion.div
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[60%] rounded-r-full"
                          style={{ background: 'linear-gradient(180deg, #059669, #0891b2)' }}
                          layoutId="sidebar-indicator"
                          initial={{ scaleY: 0, opacity: 0 }}
                          animate={{ scaleY: 1, opacity: 1 }}
                          exit={{ scaleY: 0, opacity: 0 }}
                          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                        />
                      )}
                    </AnimatePresence>

                    <item.icon
                      className={clsx(
                        'w-4 h-4 flex-shrink-0 transition-colors duration-200',
                        isActive ? 'text-brand-600' : 'text-gray-400 group-hover:text-gray-600'
                      )}
                    />
                    <span className="flex-1">{item.label}</span>

                    {item.label === 'Simulation' && (
                      <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-brand-100 text-brand-700 border border-brand-200">
                        Go
                      </span>
                    )}
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.nav>

      </div>
    </aside>
  );
}
