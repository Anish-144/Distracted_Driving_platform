import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAppSelector, useAppDispatch } from '@/store';
import { logout } from '@/store/authSlice';
import toast from 'react-hot-toast';
import { ShieldCheck, LogOut, User, Bell } from 'lucide-react';
import { useState } from 'react';

export default function Navbar() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { user } = useAppSelector((state) => state.auth);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLogout = () => {
    dispatch(logout());
    toast.success('Logged out successfully.');
    router.push('/auth/login');
  };

  return (
    <header className="h-16 px-6 flex items-center justify-between border-b border-surface-600/50 bg-surface-800/50 backdrop-blur-sm sticky top-0 z-40">
      {/* Left: Logo */}
      <Link href="/dashboard" className="flex items-center gap-2.5 no-underline">
        <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <span className="font-bold text-white text-sm hidden sm:block">SafeDrive AI</span>
      </Link>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Notifications (placeholder) */}
        <button className="btn-ghost p-2 relative" title="Notifications">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-500 rounded-full" />
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            id="user-menu-btn"
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-surface-600 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center text-sm font-semibold text-white">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-white leading-none">{user?.name}</p>
              <p className="text-xs text-gray-400 leading-none mt-0.5 capitalize">
                {user?.profile_type === 'unknown' ? 'New Driver' : user?.profile_type}
              </p>
            </div>
          </button>

          {/* Dropdown */}
          {showDropdown && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-surface-700 border border-surface-500 rounded-xl shadow-card overflow-hidden z-50 animate-fade-in">
              <div className="px-4 py-3 border-b border-surface-600">
                <p className="text-sm font-medium text-white">{user?.name}</p>
                <p className="text-xs text-gray-400 truncate">{user?.email}</p>
              </div>
              <button className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-gray-300 hover:bg-surface-600 hover:text-white transition-colors">
                <User className="w-4 h-4" />
                Profile Settings
              </button>
              <button
                id="logout-btn"
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
