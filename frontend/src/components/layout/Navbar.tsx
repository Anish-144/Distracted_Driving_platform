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
    <header className="h-16 px-6 flex items-center justify-between border-b border-gray-200 bg-white sticky top-0 z-40">
      {/* Left: Logo */}
      <Link href="/dashboard" className="flex items-center gap-2.5 no-underline">
        <div className="w-8 h-8 rounded-md bg-brand-600 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <span className="font-bold text-gray-900 text-sm hidden sm:block">SafeDrive AI</span>
      </Link>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* User menu */}
        <div className="relative">
          <button
            id="user-menu-btn"
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-md hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200"
          >
            <div className="w-8 h-8 rounded-full bg-brand-50 border border-brand-200 flex items-center justify-center text-sm font-semibold text-brand-700">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-gray-900 leading-none">{user?.name}</p>
              <p className="text-xs text-gray-500 leading-none mt-0.5 capitalize">
                {user?.profile_type === 'unknown' ? 'New Driver' : user?.profile_type}
              </p>
            </div>
          </button>

          {/* Dropdown */}
          {showDropdown && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden z-50 animate-fade-in">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
              <button className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 hover:text-brand-600 transition-colors">
                <User className="w-4 h-4" />
                Profile Settings
              </button>
              <button
                id="logout-btn"
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
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
