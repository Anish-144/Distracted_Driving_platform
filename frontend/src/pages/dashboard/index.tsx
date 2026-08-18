import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';
import { useAppSelector, useAppDispatch } from '@/store';
import { fetchProgressData } from '@/store/progressSlice';
import { getLatestSession, LatestSessionData, isRequestCancelled as isSessionCancelled } from '@/api/sessions';
import AppShell from '@/components/layout/AppShell';
import { FadeUp } from '@/components/motion/ScrollReveal';
import {
  Clock, PlayCircle, Phone, MessageCircle, MapPin, 
  Brain, Target, CheckCircle2, Zap, Users, TrendingUp
} from 'lucide-react';

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.10em] mb-3" style={{ color: 'var(--text-muted)', fontFamily: 'Space Grotesk, sans-serif' }}>
      {children}
    </p>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isAuthenticated, user } = useAppSelector((s) => s.auth);
  const { stats, lessons, isLoading } = useAppSelector((s) => s.progress);
  const { score: reduxScore } = useAppSelector((s) => s.session);

  const [latestData, setLatestData] = useState<LatestSessionData | null>(null);
  const [isFetchingLatest, setIsFetchingLatest] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setIsFetchingLatest(true);
    getLatestSession(controller.signal)
      .then((res) => { setLatestData(res); })
      .catch((err) => {
        if (isSessionCancelled(err)) return;
      })
      .finally(() => { if (!controller.signal.aborted) setIsFetchingLatest(false); });
    return () => { controller.abort(); setIsFetchingLatest(false); };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/auth/login'); return; }
    dispatch(fetchProgressData()).unwrap().catch(() => {});
  }, [isAuthenticated, router, dispatch]);

  if (!isMounted) return null;
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-canvas)' }}>
        <div className="w-5 h-5 border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--text-primary)', borderTopColor: 'transparent', borderRadius: '50%' }} />
      </div>
    );
  }

  const hasSession = !!latestData?.id;
  const displayScore = hasSession ? latestData!.score : (reduxScore ?? stats?.avg_score ?? '—');
  const displayReaction = hasSession ? `${latestData!.avg_reaction_time}s` : '—';
  const firstName = user.name?.split(' ')[0] || 'User';

  return (
    <>
      <Head>
        <title>Dashboard — SafeDrive AI</title>
        <meta name="description" content="Track your driving behavior training and progress." />
      </Head>

      <AppShell>
        {/* ── Top Status Bar ─────────────────────────────── */}
        <FadeUp className="mb-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 py-4 px-6 rounded-2xl border border-white/10" style={{ background: 'var(--bg-card)' }}>
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-14 h-14 rounded-full border-2 object-cover flex items-center justify-center font-bold text-xl" style={{ borderColor: '#6C63FF', color: 'var(--text-primary)', background: 'var(--bg-surface)' }}>
                   {firstName[0]}
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border-2 border-background" style={{ background: '#C8FF00', boxShadow: '0 0 10px rgba(200,255,0,0.5)' }}>
                  <CheckCircle2 className="text-black w-3 h-3" />
                </div>
              </div>
              <div>
                <h2 className="font-bold text-lg" style={{ color: 'var(--text-primary)', fontFamily: 'Space Grotesk, sans-serif' }}>Driver Level: Level {(stats?.lessons_completed || 0) > 5 ? 5 : 4}</h2>
                <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--text-muted)' }}>Pro Navigator</p>
              </div>
            </div>
            
            <div className="rounded-2xl px-5 py-3 flex items-center gap-6 w-full md:w-auto" style={{ background: 'var(--bg-surface)' }}>
              <div className="flex flex-col gap-1 w-full md:w-48">
                <div className="flex justify-between items-center w-full">
                  <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--text-muted)' }}>XP Progress</span>
                  <span className="text-xs font-bold mono-data" style={{ color: 'var(--text-primary)' }}>1,450 / 2,000 XP</span>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-canvas)' }}>
                  <div className="h-full rounded-full w-[72%] relative" style={{ background: 'linear-gradient(to right, #6C63FF, #8B5CF6)' }}>
                    <div className="absolute inset-0 bg-white/20 w-full animate-pulse"></div>
                  </div>
                </div>
              </div>
              <div className="h-8 w-px hidden md:block" style={{ background: 'var(--border-subtle)' }}></div>
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" />
                <div className="flex flex-col">
                  <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{stats?.lesson_streak || 0}-Day</span>
                  <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--text-muted)' }}>Streak</span>
                </div>
              </div>
            </div>
          </div>
        </FadeUp>

        {/* ── Bento Hero Section ────────────────────────────────────────── */}
        <FadeUp delay={0.04} className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
          {/* Left Hero: Score */}
          <div className="lg:col-span-7 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden border border-white/10" style={{ background: 'var(--bg-card)' }}>
            <div className="w-48 h-48 relative flex-shrink-0">
               {/* SVG Circular Gauge */}
               <svg viewBox="0 0 36 36" className="w-full h-full drop-shadow-[0_0_15px_rgba(200,255,0,0.3)]">
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5" />
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#C8FF00" strokeWidth="2.5" strokeDasharray={`${displayScore === '—' ? 0 : displayScore}, 100`} />
               </svg>
               <div className="absolute inset-0 flex flex-col items-center justify-center">
                 <span className="font-black text-5xl tracking-tighter" style={{ color: 'var(--text-primary)' }}>{displayScore}</span>
                 <span className="text-[10px] uppercase tracking-widest mt-1 font-semibold" style={{ color: 'var(--text-muted)' }}>/ 100</span>
               </div>
            </div>
            <div className="flex flex-col gap-4 w-full z-10">
              <div>
                <h3 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)', fontFamily: 'Space Grotesk, sans-serif' }}>Safety Readiness</h3>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border" style={{ background: 'rgba(200,255,0,0.1)', borderColor: 'rgba(200,255,0,0.2)' }}>
                  <TrendingUp className="w-4 h-4 text-[#C8FF00]" />
                  <span className="text-xs font-semibold tracking-wide" style={{ color: '#C8FF00' }}>Top {stats?.percentile || 12}% among peers</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div className="rounded-xl p-3 border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                    <span className="text-[10px] uppercase font-semibold" style={{ color: 'var(--text-muted)' }}>Reaction Time</span>
                  </div>
                  <span className="text-lg font-bold mono-data" style={{ color: 'var(--text-primary)' }}>{displayReaction}</span>
                </div>
                <div className="rounded-xl p-3 border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                    <span className="text-[10px] uppercase font-semibold" style={{ color: 'var(--text-muted)' }}>Focus Rating</span>
                  </div>
                  <span className="text-lg font-bold mono-data" style={{ color: 'var(--text-primary)' }}>{stats?.lesson_completion_rate || 92}<span className="text-sm ml-1" style={{ color: 'var(--text-muted)' }}>%</span></span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Hero: Quick Launch */}
          <div className="lg:col-span-5 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between border border-white/10" style={{ background: 'linear-gradient(145deg, rgba(24,28,36,0.9) 0%, rgba(108,99,255,0.1) 100%)' }}>
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold leading-tight" style={{ color: 'var(--text-primary)', fontFamily: 'Space Grotesk, sans-serif' }}>Launch Next<br/>Drive Simulation</h3>
                <div className="p-2 rounded-xl" style={{ background: 'rgba(108,99,255,0.1)' }}>
                   <PlayCircle className="w-6 h-6" style={{ color: '#6C63FF' }} />
                </div>
              </div>
              <div className="space-y-3 mb-6">
                <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--text-muted)' }}>Focus Areas</p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 border rounded-full text-xs font-semibold flex items-center gap-1.5" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}>
                    <Users className="w-3.5 h-3.5 text-[#6C63FF]" /> Passenger Chatter
                  </span>
                  <span className="px-3 py-1 border rounded-full text-xs font-semibold flex items-center gap-1.5" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}>
                    <MessageCircle className="w-3.5 h-3.5 text-[#6C63FF]" /> Urgent Texts
                  </span>
                </div>
              </div>
            </div>
            <Link href="/simulation" className="relative z-10 w-full py-3.5 rounded-xl font-bold uppercase tracking-wider text-sm flex items-center justify-center gap-2 mt-auto transition-all hover:-translate-y-0.5" style={{ background: '#6C63FF', color: 'white', boxShadow: '0 4px 14px 0 rgba(108,99,255,0.39)' }}>
              <PlayCircle className="w-4 h-4" /> Start Session (5 mins)
            </Link>
          </div>
        </FadeUp>

        {/* ── Middle Grid ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2 flex flex-col gap-6">
             {/* Distraction Mastery Grid */}
             <FadeUp delay={0.08}>
               <div className="p-6 rounded-3xl border border-white/10" style={{ background: 'var(--bg-card)' }}>
                 <SectionLabel>Distraction Mastery</SectionLabel>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                   {[
                     { name: 'Passenger Talk', icon: Users, progress: 85, color: '#C8FF00' },
                     { name: 'Phone & Social', icon: Phone, progress: 60, color: '#6C63FF' },
                     { name: 'GPS & Audio', icon: MapPin, progress: 95, color: '#06B6D4' },
                     { name: 'Cognitive Load', icon: Brain, progress: 40, color: '#8B5CF6' },
                   ].map(m => (
                     <div key={m.name} className="p-4 rounded-2xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
                       <div className="flex justify-between items-center mb-3">
                         <div className="flex items-center gap-2">
                           <m.icon className="w-4 h-4" style={{ color: m.color }} />
                           <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{m.name}</span>
                         </div>
                         <span className="text-xs font-bold mono-data" style={{ color: 'var(--text-primary)' }}>{m.progress}%</span>
                       </div>
                       <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-canvas)' }}>
                         <div className="h-full rounded-full" style={{ width: `${m.progress}%`, background: m.color }} />
                       </div>
                     </div>
                   ))}
                 </div>
               </div>
             </FadeUp>
             
             {/* AI Coach */}
             <FadeUp delay={0.12}>
               <div className="p-6 rounded-3xl border border-white/10" style={{ background: 'var(--bg-card)' }}>
                 <SectionLabel>AI Coach Daily Insight</SectionLabel>
                 <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mt-4 p-5 rounded-2xl border relative overflow-hidden" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
                   <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#8B5CF6]"></div>
                   <div className="flex items-center gap-1 shrink-0">
                     {[1, 2, 3, 4, 5].map((i) => (
                       <div key={i} className="w-1 bg-[#8B5CF6] rounded-full animate-[bounce_1s_infinite_ease-in-out]" style={{ animationDelay: `${i * 0.1}s`, height: i%2===0 ? '30px' : '15px' }}></div>
                     ))}
                   </div>
                   <div>
                     <p className="text-sm italic mb-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                       {stats?.ai_feedback || "You tend to delay your braking when notifications pop up. Try keeping your eyes forward and let the AI handle the alerts."}
                     </p>
                     <p className="text-xs font-bold text-[#8B5CF6] uppercase tracking-wider">— DriveGuard AI Trainer</p>
                   </div>
                 </div>
               </div>
             </FadeUp>
          </div>
          
          {/* Right Column */}
          <div className="flex flex-col gap-6">
             <FadeUp delay={0.16}>
               <div className="p-6 rounded-3xl border border-white/10" style={{ background: 'var(--bg-card)' }}>
                 <SectionLabel>Achievements</SectionLabel>
                 <div className="flex flex-col gap-3 mt-4">
                   <div className="flex items-center gap-3 p-3 rounded-xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
                     <div className="w-10 h-10 rounded-full bg-[#6C63FF]/20 flex items-center justify-center shrink-0">
                       <Phone className="w-5 h-5 text-[#6C63FF]" />
                     </div>
                     <div className="min-w-0">
                       <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>Ghost Phone</p>
                       <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>Zero glances at notifications</p>
                     </div>
                   </div>
                   <div className="flex items-center gap-3 p-3 rounded-xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
                     <div className="w-10 h-10 rounded-full bg-[#C8FF00]/20 flex items-center justify-center shrink-0">
                       <Target className="w-5 h-5 text-[#C8FF00]" />
                     </div>
                     <div className="min-w-0">
                       <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>Focused Pilot</p>
                       <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>Fast reaction times</p>
                     </div>
                   </div>
                   <div className="flex items-center gap-3 p-3 rounded-xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
                     <div className="w-10 h-10 rounded-full bg-[#06B6D4]/20 flex items-center justify-center shrink-0">
                       <Brain className="w-5 h-5 text-[#06B6D4]" />
                     </div>
                     <div className="min-w-0">
                       <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>Zero Panic</p>
                       <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>Mastered high cognitive load</p>
                     </div>
                   </div>
                 </div>
               </div>
             </FadeUp>

             <FadeUp delay={0.2}>
               <div className="p-6 rounded-3xl border border-white/10" style={{ background: 'var(--bg-card)' }}>
                 <div className="flex items-center justify-between mb-3">
                   <SectionLabel>Recommended Lessons</SectionLabel>
                   <Link href="/lessons" className="text-[10px] font-semibold uppercase tracking-wide hover:underline" style={{ color: 'var(--text-muted)' }}>View all →</Link>
                 </div>
                 <div className="space-y-2 mt-4">
                   {isLoading && <><div className="h-12 skeleton rounded-xl" /><div className="h-12 skeleton opacity-60 rounded-xl" /></>}
                   {!isLoading && lessons.length === 0 && <p className="text-xs py-4 text-center" style={{ color: 'var(--text-secondary)' }}>Complete a session to unlock lessons.</p>}
                   {lessons.slice(0, 2).map((lesson) => (
                     <Link key={lesson.id} href="/lessons">
                       <div className="p-3 border transition-colors duration-100 cursor-pointer rounded-xl hover:border-white/20 mt-2" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
                         <div className="flex items-start justify-between gap-2 mb-0.5">
                           <h4 className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>{lesson.title}</h4>
                           <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 shrink-0 rounded-md" style={{ background: 'var(--bg-canvas)', color: 'var(--text-secondary)' }}>{lesson.difficulty}</span>
                         </div>
                         <p className="text-[11px] line-clamp-2 leading-relaxed mt-1" style={{ color: 'var(--text-muted)' }}>{lesson.description}</p>
                       </div>
                     </Link>
                   ))}
                 </div>
               </div>
             </FadeUp>
          </div>
        </div>
      </AppShell>
    </>
  );
}
