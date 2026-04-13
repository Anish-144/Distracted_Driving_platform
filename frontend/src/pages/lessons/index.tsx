import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '@/store';
import { fetchProgressData } from '@/store/progressSlice';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { BookOpen, ChevronRight } from 'lucide-react';

export default function LessonsPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const { lessons, allLessons, isLoading } = useAppSelector((state) => state.progress);

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
        <title>Lessons — SafeDrive AI</title>
      </Head>

      <div className="min-h-screen bg-surface-900 flex">
        <Sidebar />

        <div className="flex-1 flex flex-col min-h-screen">
          <Navbar />

          <main className="flex-1 p-6 lg:p-8">
            <div className="flex items-center gap-3 mb-8">
              <BookOpen className="w-8 h-8 text-brand-400" />
              <h1 className="text-3xl font-bold text-white">Learning Center</h1>
            </div>

            {isLoading ? (
              <div className="text-gray-400 text-sm">Loading lessons...</div>
            ) : (
              <div className="grid gap-8">
                {/* Recommended Lessons */}
                <div>
                  <h2 className="text-xl font-semibold text-white mb-4 border-b border-surface-600/50 pb-2">Top Recommendations for You</h2>
                  {lessons.length === 0 ? (
                    <p className="text-gray-400 text-sm">No specific recommendations. Explore all lessons below.</p>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      {lessons.map((lesson) => (
                        <div key={lesson.id} className="card relative overflow-hidden flex items-center justify-between group cursor-pointer hover:bg-surface-600/50 transition-colors border border-brand-800/50">
                          <div className="absolute top-0 left-0 w-1 h-full bg-brand-400" />
                          <div className="pl-3">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="text-lg font-semibold text-gray-200">{lesson.title}</h4>
                              <span className="text-[10px] uppercase font-bold bg-brand-900/40 text-brand-400 px-2 py-0.5 rounded-full">{lesson.difficulty}</span>
                            </div>
                            <p className="text-sm text-gray-400 line-clamp-2">{lesson.description}</p>
                          </div>
                          <ChevronRight className="w-6 h-6 text-gray-500 group-hover:text-brand-400 ml-4 flex-shrink-0" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* All Lessons */}
                <div>
                  <h2 className="text-xl font-semibold text-white mb-4 border-b border-surface-600/50 pb-2">Browse All Lessons</h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    {allLessons.map((lesson) => (
                      <div key={lesson.id} className="card bg-surface-700/30 flex items-center justify-between group cursor-pointer hover:bg-surface-600/50 transition-colors border border-transparent hover:border-surface-500/30">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="text-md font-semibold text-gray-300">{lesson.title}</h4>
                            <span className="text-[10px] uppercase font-bold bg-surface-800 text-gray-400 px-2 py-0.5 rounded-full">{lesson.difficulty}</span>
                          </div>
                          <p className="text-sm text-gray-500 line-clamp-2">{lesson.description}</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-gray-400 ml-4 flex-shrink-0" />
                      </div>
                    ))}
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
