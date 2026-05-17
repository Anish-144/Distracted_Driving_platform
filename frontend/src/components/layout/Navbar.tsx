import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useAppSelector, useAppDispatch } from '@/store';
import { logout } from '@/store/authSlice';
import toast from 'react-hot-toast';
import { ShieldCheck, LogOut, User, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { user } = useAppSelector((state) => state.auth);
  const [showDropdown, setShowDropdown] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Scroll-aware glass effect
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = () => {
    dispatch(logout());
    toast.success('Logged out successfully.');
    router.push('/auth/login');
  };

  const userInitial = user?.name?.[0]?.toUpperCase() || 'U';

  return (
    <motion.header
      className="h-16 px-6 flex items-center justify-between sticky top-0 z-40 flex-shrink-0"
      style={{
        background: scrolled
          ? 'rgba(249, 250, 251, 0.88)'
          : 'rgba(249, 250, 251, 0.6)',
        backdropFilter: scrolled ? 'blur(20px) saturate(1.8)' : 'blur(8px)',
        WebkitBackdropFilter: scrolled ? 'blur(20px) saturate(1.8)' : 'blur(8px)',
        borderBottom: scrolled
          ? '1px solid rgba(0,0,0,0.08)'
          : '1px solid rgba(0,0,0,0.04)',
        boxShadow: scrolled
          ? '0 1px 20px rgba(0,0,0,0.06)'
          : 'none',
        transition: 'background 0.4s cubic-bezier(0.16,1,0.3,1), backdrop-filter 0.4s, box-shadow 0.4s, border-color 0.4s',
      }}
      initial={false}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Left: Logo */}
      <Link href="/dashboard" className="flex items-center gap-2.5 no-underline group">
        <motion.div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #059669, #0891b2)' }}
          whileHover={{ scale: 1.08 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <ShieldCheck className="w-4.5 h-4.5 text-white" />
        </motion.div>
        <span className="font-bold text-gray-900 text-sm hidden sm:block tracking-tight
                         group-hover:text-brand-700 transition-colors duration-200">
          SafeDrive AI
        </span>
      </Link>

      {/* Right: User menu */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <motion.button
            id="user-menu-btn"
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-gray-100/80
                       transition-colors duration-200 border border-transparent hover:border-gray-200/60"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.15 }}
          >
            {/* Avatar */}
            <motion.div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white relative"
              style={{ background: 'linear-gradient(135deg, #059669, #0891b2)' }}
            >
              {/* Pulsing ring */}
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{ border: '2px solid rgba(5,150,105,0.4)' }}
                animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0, 0.6] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              />
              {userInitial}
            </motion.div>

            <div className="hidden sm:block text-left">
              <p className="text-sm font-semibold text-gray-900 leading-none">{user?.name}</p>
              <p className="text-[11px] text-gray-400 leading-none mt-0.5 capitalize">
                {user?.profile_type === 'unknown' ? 'New Driver' : user?.profile_type}
              </p>
            </div>
            <ChevronDown
              className="w-3.5 h-3.5 text-gray-400 transition-transform duration-200"
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
                  className="absolute right-0 top-full mt-2 w-52 rounded-2xl z-50 overflow-hidden"
                  style={{
                    background: 'rgba(255,255,255,0.95)',
                    backdropFilter: 'blur(20px) saturate(1.8)',
                    WebkitBackdropFilter: 'blur(20px) saturate(1.8)',
                    border: '1px solid rgba(0,0,0,0.08)',
                    boxShadow: '0 16px 48px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06)',
                  }}
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                >
                  {/* User info */}
                  <div className="px-4 py-3.5 border-b border-black/[0.06]">
                    <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{user?.email}</p>
                  </div>

                  {/* Actions */}
                  <div className="py-1">
                    <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700
                                       hover:bg-gray-50 hover:text-brand-600 transition-colors duration-150 group">
                      <User className="w-4 h-4 text-gray-400 group-hover:text-brand-500 transition-colors" />
                      Profile Settings
                    </button>
                    <button
                      id="logout-btn"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600
                                 hover:bg-red-50 transition-colors duration-150 group"
                    >
                      <LogOut className="w-4 h-4 text-red-400 transition-colors" />
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
