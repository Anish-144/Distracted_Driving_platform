import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useAppSelector, useAppDispatch } from '@/store';
import { fetchProgressData } from '@/store/progressSlice';
import AppShell from '@/components/layout/AppShell';
import { FadeUp } from '@/components/motion/ScrollReveal';
import { BookOpen, ChevronRight, PlayCircle, Star } from 'lucide-react';

const CARD = 'bg-white rounded-2xl border border-gray-200/70 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200';
const LABEL = 'text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400';

export default function LessonsPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const { lessons, allLessons, isLoading } = useAppSelector((state) => state.progress);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    if (!isAuthenticated && isMounted) {
      router.replace('/auth/login');
    } else if (isAuthenticated && isMounted) {
      dispatch(fetchProgressData());
    }
  }, [isAuthenticated, router, dispatch, isMounted]);

  if (!isMounted) return null;
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f0fdf9' }}>
        <div className="w-8 h-8 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Lessons — SafeDrive AI</title>
      </Head>

      <AppShell>
        <FadeUp className="mb-8">
          <p className={`${LABEL} text-emerald-600 mb-1`}>Learning Center</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#ecfdf5', border: '1px solid #d1fae5' }}>
               <BookOpen className="w-5 h-5 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Training Modules</h1>
          </div>
          <p className="text-sm text-gray-500 mt-2">Explore personalized lessons to improve your driving behavior.</p>
        </FadeUp>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-10">
            {/* Recommended Lessons */}
            <div>
              <FadeUp delay={0.1}>
                <div className="flex items-center gap-2 mb-4">
                  <Star className="w-4 h-4 text-amber-500" />
                  <h2 className="text-lg font-bold text-gray-900">Recommended for You</h2>
                </div>
              </FadeUp>
              
              {lessons.length === 0 ? (
                <FadeUp delay={0.15}>
                  <p className="text-gray-500 text-sm bg-white border border-gray-200/70 rounded-2xl p-6 shadow-sm">
                    No specific recommendations at this time. Explore all lessons below.
                  </p>
                </FadeUp>
              ) : (
                <div className="grid gap-5 md:grid-cols-2">
                   {lessons.map((lesson, idx) => (
                    <FadeUp key={lesson.id} delay={0.15 + (idx * 0.05)}>
                      <div className={`${CARD} p-6 flex flex-col justify-between h-full group cursor-pointer border-emerald-100 bg-emerald-50/30`}>
                        <div>
                          <div className="flex items-start justify-between gap-3 mb-2">
                             <h4 className="text-base font-bold text-gray-900 group-hover:text-emerald-700 transition-colors leading-snug">{lesson.title}</h4>
                             <span className="text-[10px] uppercase font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md shrink-0 border border-emerald-200">{lesson.difficulty}</span>
                          </div>
                          <p className="text-sm text-gray-500 leading-relaxed mb-4">{lesson.description}</p>
                        </div>
                        <div className="flex items-center text-sm font-semibold text-emerald-600 group-hover:text-emerald-700 transition-colors">
                          <PlayCircle className="w-4 h-4 mr-1.5" /> Start Lesson
                        </div>
                      </div>
                    </FadeUp>
                  ))}
                </div>
              )}
            </div>

            {/* All Lessons */}
            <div>
              <FadeUp delay={0.2}>
                <h2 className="text-lg font-bold text-gray-900 mb-4">Browse All Modules</h2>
              </FadeUp>
              <div className="grid gap-5 md:grid-cols-2">
                {allLessons.map((lesson, idx) => (
                  <FadeUp key={lesson.id} delay={0.25 + (idx * 0.05)}>
                     <div className={`${CARD} p-6 flex flex-col justify-between h-full group cursor-pointer`}>
                        <div>
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <h4 className="text-base font-bold text-gray-900 group-hover:text-emerald-700 transition-colors leading-snug">{lesson.title}</h4>
                            <span className="text-[10px] uppercase font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded-md shrink-0 border border-gray-200">{lesson.difficulty}</span>
                          </div>
                          <p className="text-sm text-gray-500 leading-relaxed mb-4">{lesson.description}</p>
                        </div>
                        <div className="flex items-center text-sm font-medium text-gray-400 group-hover:text-emerald-600 transition-colors">
                           View Details <ChevronRight className="w-4 h-4 ml-1" />
                        </div>
                     </div>
                  </FadeUp>
                ))}
              </div>
            </div>
          </div>
        )}
      </AppShell>
    </>
  );
}
