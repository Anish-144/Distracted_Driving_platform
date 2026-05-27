import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useAppSelector, useAppDispatch } from '@/store';
import { logout } from '@/store/authSlice';
import toast from 'react-hot-toast';
import { LogOut, User, ChevronDown, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ThemeToggle from '@/components/common/ThemeToggle';
import clsx from 'clsx';

// Map route paths → human-readable page names + breadcrumb trails
const ROUTE_MAP: Record<string, { title: string; breadcrumb?: string[] }> = {
  '/dashboard':          { title: 'Dashboard' },
  '/simulation':         { title: 'Simulation', breadcrumb: ['Training'] },
  '/lessons':            { title: 'Lessons',    breadcrumb: ['Training'] },
  '/dashboard/progress': { title: 'Progress',   breadcrumb: ['Dashboard'] },
  '/dashboard/research': { title: 'Research',   breadcrumb: ['Dashboard'] },
  '/dashboard/report':   { title: 'Report',     breadcrumb: ['Dashboard'] },
  '/settings':           { title: 'Settings' },
  '/onboarding':         { title: 'Onboarding' },
};

function usePageMeta(pathname: string) {
  return ROUTE_MAP[pathname] ?? { title: 'SafeDrive AI' };
}

export default function Navbar() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = router.pathname;
  const { user } = useAppSelector((state) => state.auth);
  const [showDropdown, setShowDropdown] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const pageMeta = usePageMeta(pathname);

  // Scroll-aware glass effect on the content scroll container
  useEffect(() => {
    // Listen on the main scroll container rather than window
    const mainEl = document.querySelector('main');
    if (!mainEl) return;
    const onScroll = () => setScrolled(mainEl.scrollTop > 12);
    mainEl.addEventListener('scroll', onScroll, { passive: true });
    return () => mainEl.removeEventListener('scroll', onScroll);
  }, []);

  // Close dropdown on route change
  useEffect(() => {
    setShowDropdown(false);
  }, [pathname]);

  const handleLogout = () => {
    dispatch(logout());
    toast.success('Logged out successfully.');
    router.push('/auth/login');
  };

  const userInitial = user?.name?.[0]?.toUpperCase() || 'U';

  return (
    <motion.header
      className={clsx(
        'h-16 px-6 flex items-center justify-between sticky top-0 z-40 flex-shrink-0 transition-all duration-300',
        scrolled
          ? 'bg-app-shell/90 backdrop-blur-xl border-b border-subtle shadow-sm'
          : 'bg-transparent border-b border-transparent'
      )}
      initial={false}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Left: Contextual page title + breadcrumb */}
      <div className="flex items-center gap-2 min-w-0">
        {pageMeta.breadcrumb && pageMeta.breadcrumb.length > 0 && (
          <>
            {pageMeta.breadcrumb.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <span className="text-sm text-muted font-medium hidden sm:block truncate">{crumb}</span>
                <ChevronRight className="w-3.5 h-3.5 text-muted flex-shrink-0 hidden sm:block" />
              </span>
            ))}
          </>
        )}
        <h1 className="text-base font-bold text-primary tracking-tight truncate">
          {pageMeta.title}
        </h1>
      </div>

      {/* Right: Theme toggle + user menu */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <ThemeToggle />

        <div className="relative">
          <motion.button
            id="user-menu-btn"
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-secondary
                       transition-colors duration-200 border border-transparent hover:border-subtle"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.15 }}
          >
            {/* Avatar */}
            <motion.div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-overlay relative flex-shrink-0"
              style={{ background: 'var(--color-primary)' }}
            >
              {/* Pulsing ring */}
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{ border: '2px solid var(--color-primary-container)' }}
                animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              />
              {userInitial}
            </motion.div>

            <div className="hidden sm:block text-left min-w-0">
              <p className="text-sm font-semibold text-primary leading-none truncate max-w-[120px]">{user?.name}</p>
              <p className="text-[10px] text-muted leading-none mt-0.5 capitalize">
                {user?.profile_type === 'unknown' ? 'New Driver' : user?.profile_type}
              </p>
            </div>
            <ChevronDown
              className="w-3.5 h-3.5 text-muted transition-transform duration-200 flex-shrink-0"
              style={{ transform: showDropdown ? 'rotate(180deg)' : 'rotate(0deg)' }}
            />
          </motion.button>

          {/* Dropdown */}
          <AnimatePresence>
            {showDropdown && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowDropdown(false)}
                />
                <motion.div
                  className="absolute right-0 top-full mt-2 w-52 rounded-2xl z-50 overflow-hidden bg-primary/95 backdrop-blur-xl border border-subtle shadow-xl"
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                >
                  {/* User info */}
                  <div className="px-4 py-3.5 border-b border-subtle">
                    <p className="text-sm font-semibold text-primary leading-none">{user?.name}</p>
                    <p className="text-xs text-muted truncate mt-1">{user?.email}</p>
                  </div>

                  {/* Actions */}
                  <div className="py-1.5">
                    <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-secondary
                                       hover:bg-secondary hover:text-accent transition-colors duration-150 group">
                      <User className="w-4 h-4 text-muted group-hover:text-accent transition-colors flex-shrink-0" />
                      Profile Settings
                    </button>
                    <button
                      id="logout-btn"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-destructive
                                 hover:bg-red-500/10 transition-colors duration-150 group"
                    >
                      <LogOut className="w-4 h-4 flex-shrink-0" />
                      Sign Out
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.header>
  );
}
