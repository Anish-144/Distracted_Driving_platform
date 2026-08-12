import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useAppSelector, useAppDispatch } from '@/store';
import { logout } from '@/store/authSlice';
import toast from 'react-hot-toast';
import { LogOut, User, ChevronDown, ChevronRight, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ThemeToggle from '@/components/common/ThemeToggle';

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

  useEffect(() => {
    const mainEl = document.querySelector('main');
    if (!mainEl) return;
    const onScroll = () => setScrolled(mainEl.scrollTop > 8);
    mainEl.addEventListener('scroll', onScroll, { passive: true });
    return () => mainEl.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setShowDropdown(false); }, [pathname]);

  const handleLogout = () => {
    dispatch(logout());
    toast.success('Logged out.');
    router.push('/auth/login');
  };

  const userInitial = user?.name?.[0]?.toUpperCase() || 'U';

  return (
    <header
      className="h-14 px-6 flex items-center justify-between sticky top-0 z-40 flex-shrink-0 transition-all duration-200"
      style={{
        background: scrolled ? 'var(--bg-canvas)' : 'transparent',
        borderBottom: `1px solid ${scrolled ? 'var(--border-subtle)' : 'var(--border-subtle)'}`,
        fontFamily: 'Space Grotesk, sans-serif',
      }}
    >
      {/* Left: breadcrumb */}
      <div className="flex items-center gap-2">
        {pageMeta.breadcrumb?.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1.5">
            <span className="text-xs font-medium hidden sm:block" style={{ color: 'var(--text-muted)' }}>
              {crumb}
            </span>
            <ChevronRight className="w-3 h-3 hidden sm:block" style={{ color: 'var(--text-muted)' }} />
          </span>
        ))}
        <h1
          className="text-sm font-bold tracking-tight"
          style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}
        >
          {pageMeta.title}
        </h1>
      </div>

      {/* Right: controls */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <ThemeToggle />

        <div className="relative">
          <button
            id="user-menu-btn"
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 px-2.5 py-1.5 transition-all duration-150 focus:outline-none"
            style={{
              background: showDropdown ? 'var(--bg-hover)' : 'transparent',
              border: `1px solid ${showDropdown ? 'var(--border-card)' : 'transparent'}`,
              borderRadius: '4px',
            }}
          >
            {/* Avatar — chartreuse square */}
            <div
              className="w-6 h-6 flex items-center justify-center flex-shrink-0 text-[11px] font-bold"
              style={{
                background: '#C8FF00',
                color: '#1A1814',
                borderRadius: '3px',
              }}
            >
              {userInitial}
            </div>

            <div className="hidden sm:block text-left">
              <p className="text-[12px] font-semibold leading-none truncate max-w-[90px]" style={{ color: 'var(--text-primary)' }}>
                {user?.name}
              </p>
            </div>

            <ChevronDown
              className="w-3 h-3 flex-shrink-0 transition-transform duration-200"
              style={{
                color: 'var(--text-muted)',
                transform: showDropdown ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            />
          </button>

          {/* Dropdown */}
          <AnimatePresence>
            {showDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
                <motion.div
                  className="absolute right-0 top-full mt-1.5 w-48 z-50 overflow-hidden"
                  style={{
                    background: 'var(--bg-card-elevated)',
                    border: '1px solid var(--border-card)',
                    borderRadius: '4px',
                    boxShadow: '0 8px 24px rgba(26,24,20,0.10)',
                  }}
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                >
                  {/* User info */}
                  <div
                    className="px-4 py-3"
                    style={{ borderBottom: '1px solid var(--border-subtle)' }}
                  >
                    <p className="text-xs font-bold leading-none" style={{ color: 'var(--text-primary)' }}>{user?.name}</p>
                    <p className="text-[10px] truncate mt-1" style={{ color: 'var(--text-muted)' }}>{user?.email}</p>
                  </div>

                  {/* Actions */}
                  <div className="py-1">
                    {[
                      { href: '/settings', icon: User, label: 'Profile Settings' },
                      ...(user?.is_admin ? [{ href: '/admin/feedback', icon: Shield, label: 'Admin Feedback' }] : []),
                    ].map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setShowDropdown(false)}
                        className="w-full flex items-center gap-3 px-4 py-2 text-xs transition-colors duration-100"
                        style={{ color: 'var(--text-secondary)' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <item.icon className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
                        {item.label}
                      </Link>
                    ))}

                    <div className="my-1 mx-3 h-px" style={{ background: 'var(--border-subtle)' }} />

                    <button
                      id="logout-btn"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2 text-xs transition-colors duration-100"
                      style={{ color: 'var(--text-destructive)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <LogOut className="w-3 h-3" />
                      Sign Out
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
