import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAppSelector, useAppDispatch } from '@/store';
import { fetchProgressData, generateNewAILesson, completeLesson } from '@/store/progressSlice';
import AppShell from '@/components/layout/AppShell';
import { FadeUp } from '@/components/motion/ScrollReveal';
import {
  BookOpen, ChevronRight, PlayCircle, Star, Sparkles,
  Brain, Target, Zap, CheckCircle2, RefreshCw, Clock,
  TrendingUp, Shield, AlertTriangle, ChevronDown, ChevronUp,
  Award, BarChart3
} from 'lucide-react';
import { AILesson } from '@/api/lessons';

// ── Design tokens ──────────────────────────────────────────────────────────────
const CARD = 'bg-white rounded-2xl border border-gray-200/70 shadow-sm transition-all duration-300';
const LABEL = 'text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400';

const DRIVER_COLORS: Record<string, { bg: string; text: string; border: string; badge: string }> = {
  impulsive:    { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',    badge: 'bg-red-100 text-red-700 border-red-200' },
  distracted:   { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  badge: 'bg-amber-100 text-amber-700 border-amber-200' },
  hesitant:     { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   badge: 'bg-blue-100 text-blue-700 border-blue-200' },
  inconsistent: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', badge: 'bg-purple-100 text-purple-700 border-purple-200' },
  safe:         { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  unknown:      { bg: 'bg-gray-50',   text: 'text-gray-700',   border: 'border-gray-200',   badge: 'bg-gray-100 text-gray-700 border-gray-200' },
};

const DIFFICULTY_COLORS: Record<string, string> = {
  Beginner:     'bg-emerald-100 text-emerald-700 border-emerald-200',
  Intermediate: 'bg-amber-100 text-amber-700 border-amber-200',
  Advanced:     'bg-red-100 text-red-700 border-red-200',
};

const DRIVER_ICONS: Record<string, typeof Zap> = {
  impulsive:    Zap,
  distracted:   Brain,
  hesitant:     Clock,
  inconsistent: BarChart3,
  safe:         Shield,
  unknown:      Target,
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function ProviderBadge({ provider }: { provider: string }) {
  if (provider === 'fallback') return (
    <span className="text-[10px] text-gray-400 font-medium">Offline coaching</span>
  );
  const label = provider.includes('gemini') ? 'Gemini AI' : provider.includes('gpt') ? 'GPT-4o' : provider.includes('deepseek') ? 'DeepSeek AI' : provider;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-violet-600 bg-violet-50 border border-violet-200 rounded-md px-2 py-0.5">
      <Sparkles className="w-2.5 h-2.5" /> {label}
    </span>
  );
}

function MetricBar({ label, value, target, unit = '' }: { label: string; value: number; target: number; unit?: string }) {
  const pct = Math.min(100, Math.round((value / target) * 100));
  const color = pct >= 90 ? '#10b981' : pct >= 65 ? '#f59e0b' : '#ef4444';
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-gray-500">{label}</span>
        <span className="text-xs font-semibold text-gray-700">Target: {target}{unit}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function AILessonCard({ lesson, index }: { lesson: AILesson; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const [completing, setCompleting] = useState(false);
  const dispatch = useAppDispatch();
  const colors = DRIVER_COLORS[lesson.driver_type] || DRIVER_COLORS.unknown;
  const DriverIcon = DRIVER_ICONS[lesson.driver_type] || Target;

  const handleComplete = async () => {
    setCompleting(true);
    await dispatch(completeLesson({ lessonId: lesson.id, score: 100 }));
    setCompleting(false);
  };

  return (
    <FadeUp delay={0.1 + index * 0.06}>
      <div className={`${CARD} ${lesson.completed ? 'opacity-75' : 'hover:-translate-y-0.5 hover:shadow-md'} overflow-hidden`}>
        {/* Card Header */}
        <div className={`${colors.bg} border-b ${colors.border} p-5`}>
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colors.badge} border`}>
                <DriverIcon className="w-4 h-4" />
              </div>
              <h3 className={`text-base font-bold ${colors.text} leading-tight`}>{lesson.title}</h3>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {lesson.completed && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-md px-2 py-0.5">
                  <CheckCircle2 className="w-3 h-3" /> Done
                </span>
              )}
              <span className={`text-[10px] font-bold border rounded-md px-2 py-0.5 ${DIFFICULTY_COLORS[lesson.difficulty] || DIFFICULTY_COLORS['Intermediate']}`}>
                {lesson.difficulty}
              </span>
            </div>
          </div>

          {/* Behavioral target */}
          <p className="text-sm text-gray-600 leading-relaxed">{lesson.behavioral_target}</p>

          <div className="flex items-center justify-between mt-3">
            <ProviderBadge provider={lesson.ai_provider} />
            <span className="text-[10px] text-gray-400">
              {new Date(lesson.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </span>
          </div>
        </div>

        {/* AI Coaching Block */}
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-1.5 mb-2">
            <Brain className="w-3.5 h-3.5 text-violet-500" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-violet-600">AI Coaching Advice</span>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed italic">&quot;{lesson.ai_coaching_advice}&quot;</p>
        </div>

        {/* Expandable deep content */}
        {expanded && (
          <div className="p-5 space-y-5 border-b border-gray-100">
            {/* Why it matters */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600">Why It Matters</span>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">{lesson.why_it_matters}</p>
            </div>

            {/* Exercises */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Target className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Recommended Exercises</span>
              </div>
              <ul className="space-y-2">
                {lesson.exercises.map((ex, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                    {ex}
                  </li>
                ))}
              </ul>
            </div>

            {/* Personalized insight */}
            <div className="bg-violet-50 border border-violet-100 rounded-xl p-4">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Sparkles className="w-3.5 h-3.5 text-violet-500" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-violet-600">Personalized Insight</span>
              </div>
              <p className="text-sm text-violet-800 leading-relaxed">{lesson.personalized_insight}</p>
            </div>

            {/* Improvement goal */}
            <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-4 border border-gray-100">
              <TrendingUp className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">Improvement Goal</p>
                <p className="text-sm font-semibold text-gray-800">{lesson.improvement_goal}</p>
              </div>
            </div>

            {/* Focus metrics */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3">Focus Metrics</p>
              <div className="space-y-3">
                <MetricBar label="Reaction Time Target" value={lesson.reaction_time_target} target={5} unit="s" />
                <MetricBar label="Distraction Tolerance" value={lesson.distraction_tolerance_target * 100} target={100} unit="%" />
              </div>
            </div>

            {/* Simulation modes */}
            {lesson.simulation_modes.length > 0 && (
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">Recommended Simulation Modes</p>
                <div className="flex flex-wrap gap-2">
                  {lesson.simulation_modes.map((mode, i) => (
                    <span key={i} className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-lg px-3 py-1 font-medium">
                      {mode}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Card Footer */}
        <div className="px-5 py-3 flex items-center justify-between">
          <button
            onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 font-medium transition-colors"
          >
            {expanded ? <><ChevronUp className="w-4 h-4" /> Show less</> : <><ChevronDown className="w-4 h-4" /> See full lesson</>}
          </button>
          {!lesson.completed ? (
            <button
              onClick={handleComplete}
              disabled={completing}
              className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors disabled:opacity-50"
            >
              {completing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              {completing ? 'Saving...' : 'Mark Complete'}
            </button>
          ) : (
            <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-500">
              <Award className="w-4 h-4" />
              {lesson.completion_score != null ? `${lesson.completion_score}% score` : 'Completed'}
            </div>
          )}
        </div>
      </div>
    </FadeUp>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function LessonsPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const { lessons, allLessons, aiLessons, isLoading, isGenerating } = useAppSelector((state) => state.progress);
  const [isMounted, setIsMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'ai' | 'library'>('ai');

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

  const activeAILessons = aiLessons.filter(l => !l.completed);
  const completedAILessons = aiLessons.filter(l => l.completed);
  const completionRate = aiLessons.length > 0
    ? Math.round((completedAILessons.length / aiLessons.length) * 100)
    : 0;

  return (
    <>
      <Head>
        <title>Lessons — SafeDrive AI</title>
        <meta name="description" content="AI-powered personalized behavioral training lessons for SafeDrive AI." />
      </Head>

      <AppShell>
        {/* Page header */}
        <FadeUp className="mb-8">
          <p className={`${LABEL} text-emerald-600 mb-1`}>Behavioral Training Center</p>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#ecfdf5', border: '1px solid #d1fae5' }}>
                <BookOpen className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">Training Modules</h1>
                <p className="text-sm text-gray-500 mt-0.5">AI-personalized to your behavioral profile</p>
              </div>
            </div>

            {/* Stats bar */}
            {aiLessons.length > 0 && (
              <div className="flex items-center gap-4 text-sm">
                <div className="text-center">
                  <p className="text-xl font-bold text-gray-900">{aiLessons.length}</p>
                  <p className="text-xs text-gray-400">Total Lessons</p>
                </div>
                <div className="w-px h-8 bg-gray-200" />
                <div className="text-center">
                  <p className="text-xl font-bold text-emerald-600">{completedAILessons.length}</p>
                  <p className="text-xs text-gray-400">Completed</p>
                </div>
                <div className="w-px h-8 bg-gray-200" />
                <div className="text-center">
                  <p className="text-xl font-bold text-violet-600">{completionRate}%</p>
                  <p className="text-xs text-gray-400">Progress</p>
                </div>
              </div>
            )}
          </div>
        </FadeUp>

        {/* Tabs */}
        <FadeUp delay={0.05} className="mb-6">
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab('ai')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                activeTab === 'ai'
                  ? 'bg-white text-violet-700 shadow-sm border border-violet-100'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" /> AI Lessons
            </button>
            <button
              onClick={() => setActiveTab('library')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                activeTab === 'library'
                  ? 'bg-white text-emerald-700 shadow-sm border border-emerald-100'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" /> Lesson Library
            </button>
          </div>
        </FadeUp>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-52 bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* ── AI LESSONS TAB ──────────────────────────────────────────────── */}
            {activeTab === 'ai' && (
              <div className="space-y-8">
                {/* Generate button */}
                <FadeUp delay={0.1}>
                  <div className={`${CARD} p-5 flex items-center justify-between gap-4`} style={{ background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)', borderColor: '#ddd6fe' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-bold text-violet-900">Generate New AI Lesson</p>
                        <p className="text-xs text-violet-600 mt-0.5">Based on your latest behavioral data and driver profile</p>
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          await dispatch(generateNewAILesson()).unwrap();
                          toast.success('AI Lesson generated successfully!');
                        } catch (err: any) {
                          toast.error(err || 'Failed to generate lesson.');
                        }
                      }}
                      disabled={isGenerating}
                      className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-60 flex-shrink-0"
                    >
                      {isGenerating ? (
                        <><RefreshCw className="w-4 h-4 animate-spin" /> Generating...</>
                      ) : (
                        <><Sparkles className="w-4 h-4" /> Generate</>
                      )}
                    </button>
                  </div>
                </FadeUp>

                {/* Active lessons */}
                {activeAILessons.length > 0 && (
                  <div>
                    <FadeUp delay={0.15}>
                      <div className="flex items-center gap-2 mb-4">
                        <Star className="w-4 h-4 text-amber-500" />
                        <h2 className="text-lg font-bold text-gray-900">Your Personalized Plan</h2>
                        <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5 font-semibold">{activeAILessons.length} active</span>
                      </div>
                    </FadeUp>
                    <div className="grid gap-5 md:grid-cols-2">
                      {activeAILessons.map((lesson, i) => (
                        <AILessonCard key={lesson.id} lesson={lesson} index={i} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Completed lessons */}
                {completedAILessons.length > 0 && (
                  <div>
                    <FadeUp>
                      <div className="flex items-center gap-2 mb-4">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <h2 className="text-lg font-bold text-gray-900">Completed</h2>
                        <span className="text-xs bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-full px-2 py-0.5 font-semibold">{completedAILessons.length}</span>
                      </div>
                    </FadeUp>
                    <div className="grid gap-5 md:grid-cols-2">
                      {completedAILessons.map((lesson, i) => (
                        <AILessonCard key={lesson.id} lesson={lesson} index={i} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty state */}
                {aiLessons.length === 0 && !isGenerating && (
                  <FadeUp delay={0.2}>
                    <div className={`${CARD} p-10 text-center`}>
                      <div className="w-14 h-14 rounded-2xl bg-violet-100 flex items-center justify-center mx-auto mb-4">
                        <Brain className="w-7 h-7 text-violet-500" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">No AI lessons yet</h3>
                      <p className="text-sm text-gray-500 max-w-sm mx-auto mb-6">
                        Click &quot;Generate&quot; above to get your first personalized AI lesson plan based on your behavioral data.
                      </p>
                    </div>
                  </FadeUp>
                )}
              </div>
            )}

            {/* ── LIBRARY TAB ─────────────────────────────────────────────────── */}
            {activeTab === 'library' && (
              <div className="space-y-10">
                {/* Recommended */}
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
                        <FadeUp key={lesson.id} delay={0.15 + idx * 0.05}>
                          <div className={`${CARD} p-6 flex flex-col justify-between h-full group cursor-pointer border-emerald-100 bg-emerald-50/30 hover:-translate-y-0.5 hover:shadow-md`}>
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

                {/* All lessons */}
                <div>
                  <FadeUp delay={0.2}>
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Browse All Modules</h2>
                  </FadeUp>
                  <div className="grid gap-5 md:grid-cols-2">
                    {allLessons.map((lesson, idx) => (
                      <FadeUp key={lesson.id} delay={0.25 + idx * 0.05}>
                        <div className={`${CARD} p-6 flex flex-col justify-between h-full group cursor-pointer hover:-translate-y-0.5 hover:shadow-md`}>
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
          </>
        )}
      </AppShell>
    </>
  );
}
