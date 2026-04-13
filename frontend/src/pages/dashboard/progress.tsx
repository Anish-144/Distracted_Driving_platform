import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '@/store';
import { fetchProgressData } from '@/store/progressSlice';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { BarChart2, AlertCircle } from 'lucide-react';

export default function ProgressPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const { stats, isLoading } = useAppSelector((state) => state.progress);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/auth/login');
    } else {
      dispatch(fetchProgressData());
    }
  }, [isAuthenticated, router, dispatch]);

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-900">
        <div className="w-10 h-10 rounded-full border-4 border-brand-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Progress — SafeDrive AI</title>
      </Head>

      <div className="min-h-screen bg-surface-900 flex">
        <Sidebar />

        <div className="flex-1 flex flex-col min-h-screen">
          <Navbar />

          <main className="flex-1 p-6 lg:p-8">
            <div className="flex items-center gap-3 mb-8">
              <BarChart2 className="w-8 h-8 text-brand-400" />
              <h1 className="text-3xl font-bold text-white">Your Progress</h1>
            </div>

            {isLoading ? (
              <div className="text-gray-400 text-sm">Loading progress data...</div>
            ) : (
              <div className="card glass relative overflow-hidden border-brand-800/50 mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <AlertCircle className="w-6 h-6 text-brand-400" />
                  <h2 className="text-lg font-bold text-white">Detailed Progress Metrics</h2>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed mb-4">
                  You have completed <strong>{stats?.total_sessions || 0}</strong> sessions. Your current driver profile is classified as <span className="text-brand-400 font-semibold">{stats?.driver_type || 'Unknown'}</span>.
                </p>
                <div className="flex items-center justify-between border-t border-surface-600/50 pt-4 mt-2">
                    <div className="text-center">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Avg Score</p>
                        <p className="text-2xl font-bold text-white">{stats?.avg_score || 0}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Improvement</p>
                        <p className="text-2xl font-bold text-white">{(stats?.improvement_rate || 0) > 0 ? '+' : ''}{stats?.improvement_rate || 0}</p>
                    </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  );
}
