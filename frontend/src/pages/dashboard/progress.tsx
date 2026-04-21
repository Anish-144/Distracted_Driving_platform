import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useAppSelector, useAppDispatch } from '@/store';
import { fetchProgressData } from '@/store/progressSlice';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { BarChart2, AlertCircle, Target, TrendingUp, TrendingDown, Clock, MoveRight } from 'lucide-react';

interface TimelineEntry {
  percentile: number;
  timestamp: number;
}

export default function ProgressPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const { stats, isLoading } = useAppSelector((state) => state.progress);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('sd_percentile_history');
        if (stored) {
            let parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
                // Enforce strict schema validation and strip corrupted segments
                parsed = parsed.filter(item => 
                    item !== null && 
                    typeof item === 'object' && 
                    typeof item.percentile === 'number' && 
                    typeof item.timestamp === 'number' &&
                    !isNaN(item.percentile) &&
                    !isNaN(item.timestamp)
                );
                setTimeline(parsed);
            }
        }
      } catch (e) {
          console.error("Progress timeline storage corrupted. Initiating sanitization.");
          setTimeline([]);
          localStorage.removeItem('sd_percentile_history');
      }
    }
  }, []);

  const firstScore = timeline.length > 0 ? timeline[0].percentile : 0;
  const lastScore = timeline.length > 0 ? timeline[timeline.length - 1].percentile : 0;
  const overallDelta = lastScore - firstScore;

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/auth/login');
    } else {
      dispatch(fetchProgressData());
    }
  }, [isAuthenticated, router, dispatch]);

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
        <title>Progress — SafeDrive AI</title>
      </Head>

      <div className="min-h-screen bg-gray-50 flex font-sans text-gray-900">
        <Sidebar />

        <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
          <Navbar />

          <main className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-1.5 bg-brand-50 border border-brand-100 rounded-md">
                 <BarChart2 className="w-5 h-5 text-brand-600" />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Your Progress</h1>
            </div>

            {isLoading ? (
              <div className="text-gray-400 text-sm">Loading progress data...</div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg p-6 lg:p-8 relative overflow-hidden mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-1.5 bg-brand-50 border border-brand-100 rounded-md">
                    <AlertCircle className="w-4 h-4 text-brand-600" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900 tracking-tight">Detailed Progress Metrics</h2>
                </div>
                <p className="text-gray-600 text-sm leading-relaxed mb-4">
                  You have completed <strong>{stats?.total_sessions || 0}</strong> sessions. Your current driver profile is classified as <span className="text-brand-600 font-semibold">{stats?.driver_type || 'Unknown'}</span>.
                </p>
                <div className="flex items-center justify-between border-t border-gray-100 pt-6 mt-4">
                    <div className="text-center">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Avg Score</p>
                        <p className="text-2xl font-semibold text-gray-900 tracking-tight">{stats?.avg_score || 0}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Improvement</p>
                        <p className="text-2xl font-semibold text-gray-900 tracking-tight">{(stats?.improvement_rate || 0) > 0 ? '+' : ''}{stats?.improvement_rate || 0}</p>
                    </div>
                </div>
              </div>
            )}
            
            {/* Progress Timeline Section */}
            {!isLoading && timeline.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-6 lg:p-8 relative overflow-hidden">
                 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                       <div className="p-1.5 bg-brand-50 border border-brand-100 rounded-md flex-shrink-0">
                         <Target className="w-4 h-4 text-brand-600" />
                       </div>
                       <h2 className="text-lg font-semibold text-gray-900 tracking-tight">Progress Timeline</h2>
                    </div>
                    
                    {timeline.length > 1 && (
                       <div className={`px-2.5 py-1 text-xs font-semibold rounded-md flex items-center self-start sm:self-auto gap-1.5 ${overallDelta >= 0 ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                         {overallDelta >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                         {overallDelta > 15 ? 'Incredible improvement' : overallDelta > 5 ? 'Great progress' : overallDelta > 0 ? 'Steady improvement' : overallDelta === 0 ? 'Consistent trends' : 'Declining performance'} by {Math.abs(overallDelta)}% over last {timeline.length} sessions
                       </div>
                    )}
                 </div>
                 
                 {timeline.length < 2 ? (
                    <div className="text-center py-10 bg-gray-50 border border-gray-100 rounded-lg">
                       <Clock className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                       <p className="text-sm font-medium text-gray-900">Need more data</p>
                       <p className="text-xs text-gray-500 mt-1">Complete at least 2 simulation sessions to visualize your progress timeline.</p>
                       <button onClick={() => router.push('/simulation')} className="mt-4 px-4 py-2 bg-white border border-gray-200 rounded-md text-sm font-medium text-brand-600 hover:bg-gray-50 transition-colors shadow-sm inline-flex items-center gap-2">
                          <Target className="w-4 h-4" /> Start Simulation
                       </button>
                    </div>
                 ) : (
                    <div className="flex flex-col gap-3">
                      {[...timeline].reverse().map((entry, reverseIdx) => {
                         const originalIdx = timeline.length - 1 - reverseIdx;
                         const score = entry.percentile;
                         const prevScore = originalIdx > 0 ? timeline[originalIdx - 1].percentile : score;
                         const diff = score - prevScore;
                         const dateStr = new Date(entry.timestamp).toLocaleString(undefined, { 
                             month: 'short', 
                             day: 'numeric', 
                             hour: 'numeric', 
                             minute: '2-digit',
                             hour12: true 
                         });
                         
                         return (
                           <div key={originalIdx} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all rounded-lg gap-3 sm:gap-0">
                             <div className="flex items-center gap-4">
                                <span className="text-sm font-semibold text-gray-400 w-8">#{originalIdx + 1}</span>
                                <div className="flex flex-col">
                                   <span className="text-sm font-medium text-gray-900">Rank: <strong className="text-brand-600 ml-1">{score}%</strong></span>
                                   <span className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5"><Clock className="w-3 h-3" /> {dateStr}</span>
                                </div>
                             </div>
                             <div className="flex items-center self-start sm:self-auto gap-3">
                               {originalIdx > 0 && diff !== 0 ? (
                                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 ${diff > 0 ? 'text-green-700 bg-green-100 border border-green-200' : 'text-red-700 bg-red-100 border border-red-200'}`}>
                                    {diff > 0 ? '↑' : '↓'} {Math.abs(diff)}%
                                  </span>
                               ) : (
                                  <span className="text-xs font-semibold text-gray-500 bg-gray-100 border border-gray-200 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                                    <MoveRight className="w-3 h-3 text-gray-400" /> steady
                                  </span>
                               )}
                             </div>
                           </div>
                         )
                      })}
                    </div>
                 )}
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  );
}
