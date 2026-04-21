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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 rounded-full border-4 border-brand-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Lessons — SafeDrive AI</title>
      </Head>

      <div className="min-h-screen bg-gray-50 flex font-sans text-gray-900">
        <Sidebar />

        <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
          <Navbar />

          <main className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-1.5 bg-brand-50 border border-brand-100 rounded-md">
                 <BookOpen className="w-5 h-5 text-brand-600" />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Learning Center</h1>
            </div>

            {isLoading ? (
              <div className="text-gray-400 text-sm">Loading lessons...</div>
            ) : (
              <div className="grid gap-8">
                {/* Recommended Lessons */}
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">Top Recommendations for You</h2>
                  {lessons.length === 0 ? (
                    <p className="text-gray-500 text-sm bg-white border border-gray-200 rounded-lg p-5">No specific recommendations. Explore all lessons below.</p>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                       {lessons.map((lesson) => (
                        <div key={lesson.id} className="bg-white border border-gray-200 rounded-lg p-5 relative overflow-hidden flex items-center justify-between group cursor-pointer hover:border-gray-300 hover:shadow-sm transition-all text-left">
                          <div className="absolute top-0 left-0 w-1 h-full bg-brand-500 group-hover:w-1.5 transition-all" />
                          <div className="pl-3">
                             <div className="flex items-start justify-between gap-2 mb-1.5">
                                <h4 className="text-sm font-semibold text-gray-900 group-hover:text-brand-700 transition-colors leading-snug">{lesson.title}</h4>
                                <span className="text-[10px] uppercase font-medium bg-brand-50 text-brand-700 border border-brand-100 px-1.5 py-0.5 rounded shrink-0">{lesson.difficulty}</span>
                             </div>
                             <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{lesson.description}</p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-brand-600 ml-4 flex-shrink-0 transition-colors" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* All Lessons */}
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">Browse All Lessons</h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    {allLessons.map((lesson) => (
                       <div key={lesson.id} className="bg-gray-50 border border-gray-200 rounded-lg p-5 flex flex-col justify-between group cursor-pointer hover:bg-white hover:border-gray-300 hover:shadow-sm transition-all text-left">
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <h4 className="text-sm font-semibold text-gray-900 group-hover:text-brand-700 transition-colors leading-snug">{lesson.title}</h4>
                            <span className="text-[10px] uppercase font-medium bg-white text-gray-500 border border-gray-200 px-1.5 py-0.5 rounded shrink-0">{lesson.difficulty}</span>
                          </div>
                          <div className="flex items-end justify-between mt-1">
                             <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed pr-4">{lesson.description}</p>
                             <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-brand-600 flex-shrink-0 transition-colors" />
                          </div>
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
