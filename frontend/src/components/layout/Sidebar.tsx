import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Car,
  BookOpen,
  BarChart2,
  Settings,
  ShieldCheck,
  Microscope,
  Users,
  PieChart,
  MessageSquare
} from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppSelector } from '@/store';

const secondaryNav = [
  { label: 'Settings',   href: '/settings',            icon: Settings },
];

const navVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04, delayChildren: 0.1 } },
};

const itemVariants = {
  hidden:  { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

type NavItemType = {
  label: string;
  href: string;
  icon: any;
  badge?: string;
};

function NavItem({ item, isActive }: { item: NavItemType; isActive: boolean }) {
  return (
    <motion.div variants={itemVariants}>
      <Link href={item.href}>
        <div
          id={`sidebar-${item.label.toLowerCase()}`}
          className={clsx('nav-link group', isActive && 'active')}
        >
          {/* Active indicator bar */}
          <AnimatePresence>
            {isActive && (
              <motion.div
                className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-[60%] rounded-r-full bg-primary"
                layoutId="sidebar-indicator"
                initial={{ scaleY: 0, opacity: 0 }}
                animate={{ scaleY: 1, opacity: 1 }}
                exit={{ scaleY: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              />
            )}
          </AnimatePresence>

          <item.icon
            className={clsx(
              'w-4 h-4 flex-shrink-0 transition-colors duration-200',
              isActive ? 'text-primary' : 'text-muted group-hover:text-primary'
            )}
          />
          <span className="flex-1 truncate">{item.label}</span>

          {'badge' in item && item.badge && (
            <span className="badge-brand ml-auto text-[10px]">
              {item.badge}
            </span>
          )}
        </div>
      </Link>
    </motion.div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAppSelector((state) => state.auth);

  const primaryNav = user?.is_admin
    ? [
        { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
        { label: 'Users', href: '/admin/users', icon: Users },
        { label: 'Analytics', href: '/admin/analytics', icon: PieChart },
        { label: 'Feedback', href: '/admin/feedback', icon: MessageSquare },
        { label: 'Research', href: '/admin/research', icon: Microscope },
      ]
    : [
        { label: 'Dashboard',  href: '/dashboard',          icon: LayoutDashboard },
        { label: 'Simulation', href: '/simulation',          icon: Car },
        { label: 'Lessons',    href: '/lessons',             icon: BookOpen },
        { label: 'Progress',   href: '/dashboard/progress',  icon: BarChart2 },
        { label: 'Research',   href: '/dashboard/research',  icon: Microscope },
      ];

  return (
    <aside
      className="hidden lg:flex flex-col h-screen flex-shrink-0 relative z-30"
      style={{ width: 'var(--sidebar-width)' }}
    >
      {/* Glass panel: fills full height, no external overflow */}
      <div className="flex flex-col h-full bg-secondary border-r border-subtle">

        {/* Branding — fixed height matches Navbar */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-subtle flex-shrink-0">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 bg-tertiary border border-subtle"
          >
            <ShieldCheck className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-primary text-sm tracking-tight leading-none">SafeDrive AI</p>
            <p className="text-[10px] text-muted font-medium mt-0.5">Training Platform</p>
          </div>
        </div>

        {/* Primary nav — scrollable if content overflows */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-3 flex flex-col gap-0.5">
          <p className="label-caps px-3 mb-2">
            Navigation
          </p>
          <motion.nav
            variants={navVariants}
            initial={false}
            animate="visible"
            className="flex flex-col gap-0.5"
          >
            {primaryNav.map((item) => (
              <NavItem key={item.href} item={item} isActive={pathname === item.href} />
            ))}
          </motion.nav>

          {/* Visual separator before secondary nav */}
          <div className="my-3 mx-3 h-px bg-subtle opacity-60" />

          <p className="label-caps px-3 mb-2">
            Account
          </p>
          <motion.nav
            variants={navVariants}
            initial={false}
            animate="visible"
            className="flex flex-col gap-0.5"
          >
            {secondaryNav.map((item) => (
              <NavItem key={item.href} item={item} isActive={pathname === item.href} />
            ))}
          </motion.nav>
        </div>

        {/* Footer brand mark */}
        <div className="flex-shrink-0 px-5 py-4 border-t border-subtle">
          <p className="text-[10px] text-muted font-medium leading-snug">
            © 2025 Shreya Dixit Foundation
          </p>
        </div>
      </div>
    </aside>
  );
}
