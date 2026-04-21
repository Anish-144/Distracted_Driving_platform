import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { useAppSelector } from '@/store';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Settings, User, Shield, Bell } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/auth/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 rounded-full border-4 border-brand-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Settings — SafeDrive AI</title>
        <meta name="description" content="Manage your SafeDrive AI account settings and preferences." />
      </Head>

      <div className="min-h-screen bg-gray-50 flex font-sans text-gray-900">
        <Sidebar />

        <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
          <Navbar />

          <main className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-1.5 bg-brand-50 border border-brand-100 rounded-md">
                 <Settings className="w-5 h-5 text-brand-600" />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Settings</h1>
            </div>

            <div className="max-w-2xl space-y-6">
              {/* Account Info */}
              <div className="bg-white border border-gray-200 rounded-lg p-6 lg:p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-5 border-b border-gray-100 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center">
                    <User className="w-5 h-5 text-brand-600" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900 tracking-tight">Account Information</h2>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Full Name</label>
                    <p className="text-gray-900 font-medium">{user.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Email Address</label>
                    <p className="text-gray-900">{user.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Driver Profile</label>
                    <p className="text-brand-600 font-semibold capitalize">
                      {user.profile_type === 'unknown' ? 'Not assessed yet — complete a simulation' : user.profile_type.replace('_', ' ')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Privacy */}
              <div className="bg-white border border-gray-200 rounded-lg p-6 lg:p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-5 border-b border-gray-100 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-brand-600" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900 tracking-tight">Privacy & Safety</h2>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed max-w-lg">
                  Your session data and behavioral analysis are stored securely and used only to personalize
                  your training experience. No data is shared with third parties.
                </p>
              </div>

              {/* Notifications */}
              <div className="bg-white border border-gray-200 rounded-lg p-6 lg:p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-5 border-b border-gray-100 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center">
                    <Bell className="w-5 h-5 text-brand-600" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900 tracking-tight">Notifications</h2>
                </div>
                <p className="text-sm text-gray-600 max-w-lg">
                  Notification preferences will be available in a future update.
                </p>
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
