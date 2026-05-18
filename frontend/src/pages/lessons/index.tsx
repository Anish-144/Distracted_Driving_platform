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
  Award, BarChart3, X
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

// Seeded static lesson details mapping for premium view
const STATIC_LESSON_DETAILS: Record<string, {
  why_received: string;
  behavioral_weakness: string;
  ai_coaching: string;
  psychology: string;
  exercises: string[];
  drills: string[];
  improvement_goal: string;
}> = {
  'Impulse Control While Driving': {
    why_received: 'Recommended to help you manage rapid reaction triggers and notification-based impulses.',
    behavioral_weakness: 'Tendency to immediately react to incoming sounds and visual notifications, taking focus away from the road.',
    ai_coaching: 'When a distraction alert occurs, force a 3-second mental pause before making any decision. Count 1-2-3 silently.',
    psychology: 'Classical conditioning builds automatic stimulus-response bonds. By inserting a conscious delay, you transition from reflex-based reaction to conscious decision making.',
    exercises: [
      'Consciously count to three when you hear a phone chime in the simulator.',
      'Practice scanning the horizon immediately after ignoring a phone notification.',
      'List your top three notification triggers and pre-commit to ignoring them.'
    ],
    drills: ['Rapid Multi-Event Overlap', 'Silent Mode Challenge'],
    improvement_goal: 'Reduce sub-2 second reaction triggers by 50% over your next 3 sessions.',
  },
  'Managing Digital Distractions': {
    why_received: 'Recommended to build cognitive focus resilience and resist the draw of smart devices.',
    behavioral_weakness: 'Attention capture by smartphone alerts (WhatsApp, phone calls, navigation prompts).',
    ai_coaching: 'Minimize interaction times by pre-deciding. If you choose to ignore, do so instantly and entirely. Half-ignoring is the highest risk state.',
    psychology: 'Variable ratio schedules of reinforcement make phone notifications highly addictive. Creating strict physical and mental boundaries prevents cognitive capture.',
    exercises: [
      'Activate Do Not Disturb on your phone before starting your next simulation.',
      'Practice scanning your mirrors every 5 seconds to actively anchor your visual attention.',
      'Acknowledge the urge to look, then consciously double-down on road focus.'
    ],
    drills: ['Multi-distraction Filtering', 'Ambient Noise Challenges'],
    improvement_goal: 'Maintain a safe decision rate above 85% in all high-density distraction zones.',
  },
  'Peripheral Vision Mastery': {
    why_received: 'Assigned as an advanced mastery module to enhance spatial and situational awareness.',
    behavioral_weakness: 'Tunnel vision under stressful driving conditions, leading to late reactions to peripheral hazards.',
    ai_coaching: 'Soft-focus your vision. Keep your primary focus centered, but actively monitor the edges of your screen using your peripheral field.',
    psychology: 'Stress narrows the visual field (cognitive tunneling). Broadening spatial awareness reduces stress-induced performance drops and speeds up hazard recognition.',
    exercises: [
      'Focus on the center lane but note when side-street hazards first appear without looking directly at them.',
      'Use the 5-second mirror sweep to actively reset visual posture.',
      'Practice high-hazard anticipation in busy intersections.'
    ],
    drills: ['Expert Pressure Scenarios', 'Night Driving Simulators'],
    improvement_goal: 'Reduce peripheral hazard response times to under 1.8 seconds.',
  },
  'The 2-Second Rule': {
    why_received: 'Seeded foundational curriculum to establish safe following distances and reaction buffers.',
    behavioral_weakness: 'Tailgating or insufficient reaction buffers behind lead vehicles.',
    ai_coaching: 'Pick a stationary object on the side of the road. When the car in front passes it, you should not reach that object for at least 2 full seconds.',
    psychology: 'Human perception-reaction time averages 1.5 seconds. A 2-second buffer provides the necessary physical gap to accommodate delayed recognition and physical braking.',
    exercises: [
      'Actively track a landmark in the simulation and count the seconds between the lead car and you.',
      'Double the buffer distance during rain or low-light scenarios.',
      'Practice deceleration without immediate hard braking.'
    ],
    drills: ['Standard Beginner Mode', 'Guided Tutorial Modules'],
    improvement_goal: 'Maintain a safe 2-second buffer distance 100% of the time across your next 2 sessions.',
  }
};

function getRiskLevel(driverType: string): { label: string; bg: string; text: string } {
  switch (driverType?.toLowerCase()) {
    case 'impulsive':
    case 'distracted':
      return { label: 'High Risk', bg: 'bg-red-50 text-red-700 border-red-100', text: 'text-red-700' };
    case 'hesitant':
    case 'inconsistent':
      return { label: 'Medium Risk', bg: 'bg-amber-50 text-amber-700 border-amber-100', text: 'text-amber-700' };
    case 'safe':
      return { label: 'Low Risk', bg: 'bg-emerald-50 text-emerald-700 border-emerald-100', text: 'text-emerald-700' };
    default:
      return { label: 'Medium Risk', bg: 'bg-gray-50 text-gray-700 border-gray-100', text: 'text-gray-700' };
  }
}

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

interface SelectedLessonState {
  id: string;
  title: string;
  why_received: string;
  behavioral_weakness: string;
  ai_coaching: string;
  psychology: string;
  exercises: string[];
  drills: string[];
  improvement_goal: string;
  difficulty: string;
  completed: boolean;
  isAI: boolean;
  recommended_focus?: string;
}

interface LessonDetailModalProps {
  lesson: SelectedLessonState | null;
  onClose: () => void;
  onComplete: () => Promise<void>;
  completing: boolean;
}

function LessonDetailModal({ lesson, onClose, onComplete, completing }: LessonDetailModalProps) {
  if (!lesson) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto flex flex-col animate-scale-up">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-start justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border bg-violet-50 text-violet-700 border-violet-200">
              {lesson.isAI ? 'AI Personalized' : 'Curriculum Module'}
            </span>
            <h2 className="text-xl font-bold text-gray-900 mt-2">{lesson.title}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          {/* Why received */}
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Why you received this</h3>
            <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 border border-gray-100 rounded-2xl p-4">
              {lesson.why_received}
            </p>
          </div>

          {/* Behavioral target */}
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Behavioral Weakness Explanation</h3>
            <p className="text-sm text-gray-700 leading-relaxed font-semibold">
              {lesson.behavioral_weakness}
            </p>
          </div>

          {/* AI Coaching */}
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">AI-Generated Coaching</h3>
            <p className="text-sm text-violet-800 bg-violet-50/50 border border-violet-100 rounded-2xl p-4 leading-relaxed italic">
              &quot;{lesson.ai_coaching}&quot;
            </p>
          </div>

          {/* Psychology */}
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Driving Psychology Explanation</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              {lesson.psychology}
            </p>
          </div>

          {/* Exercises */}
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Recommended Exercises</h3>
            <ul className="space-y-2.5">
              {lesson.exercises.map((ex, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-gray-600">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span>{ex}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Drills */}
          {lesson.drills.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Simulation Drills</h3>
              <div className="flex flex-wrap gap-2">
                {lesson.drills.map((mode, i) => (
                  <span key={i} className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-xl px-3.5 py-1.5 font-semibold">
                    {mode}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Focus target */}
          {lesson.recommended_focus && (
            <div className="bg-amber-50/30 border border-amber-100 rounded-2xl p-4">
              <h3 className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Brain className="w-3.5 h-3.5" /> Next Session Focus
              </h3>
              <p className="text-sm text-amber-800 leading-relaxed">
                {lesson.recommended_focus}
              </p>
            </div>
          )}

          {/* Improvement Goal */}
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center gap-4">
            <TrendingUp className="w-6 h-6 text-emerald-600 shrink-0" />
            <div>
              <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-0.5">Estimated Improvement Goal</p>
              <p className="text-sm font-bold text-gray-800">{lesson.improvement_goal}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between gap-4">
          <div className="text-xs text-gray-400">
            Difficulty: <strong className="text-gray-600">{lesson.difficulty}</strong>
          </div>
          <div className="flex items-center gap-2">
            {lesson.completed ? (
              <span className="flex items-center gap-1.5 text-sm font-bold text-emerald-600">
                <CheckCircle2 className="w-4 h-4" /> Lesson Completed
              </span>
            ) : (
              <button
                onClick={onComplete}
                disabled={completing}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors disabled:opacity-50"
              >
                {completing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                {completing ? 'Saving...' : 'Mark Completed'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AILessonCard({ lesson, index, onOpen }: { lesson: AILesson; index: number; onOpen: (l: AILesson) => void }) {
  const [completing, setCompleting] = useState(false);
  const dispatch = useAppDispatch();
  const colors = DRIVER_COLORS[lesson.driver_type] || DRIVER_COLORS.unknown;
  const DriverIcon = DRIVER_ICONS[lesson.driver_type] || Target;
  const risk = getRiskLevel(lesson.driver_type);

  const handleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setCompleting(true);
    await dispatch(completeLesson({ lessonId: lesson.id, score: 100 }));
    setCompleting(false);
    toast.success('Lesson marked complete!');
  };

  return (
    <FadeUp delay={0.1 + index * 0.06}>
      <div 
        onClick={() => onOpen(lesson)}
        className={`${CARD} ${lesson.completed ? 'opacity-75' : 'hover:-translate-y-0.5 hover:shadow-md'} overflow-hidden cursor-pointer`}
      >
        {/* Card Header */}
        <div className={`${colors.bg} border-b ${colors.border} p-5`}>
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colors.badge} border`}>
                <DriverIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 className={`text-base font-bold ${colors.text} leading-tight`}>{lesson.title}</h3>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {lesson.session_id && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-violet-100 text-violet-700 border border-violet-200 rounded px-1.5 py-0.5">
                      <Zap className="w-2.5 h-2.5" /> Session-Specific
                    </span>
                  )}
                  <span className={`inline-flex items-center text-[9px] font-bold border rounded px-1.5 py-0.5 capitalize ${colors.badge}`}>
                    {lesson.driver_type} Protocol
                  </span>
                  <span className={`inline-flex items-center text-[9px] font-bold border rounded px-1.5 py-0.5 ${risk.bg}`}>
                    {risk.label}
                  </span>
                </div>
              </div>
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

          {/* AI generated reasoning preview */}
          {lesson.generated_reason && (
            <div className="mt-3 bg-white/70 backdrop-blur-sm border border-gray-200/50 rounded-xl p-3 text-xs text-gray-600">
              <span className="font-semibold text-gray-700">Reason:</span> {lesson.generated_reason}
            </div>
          )}

          <div className="flex items-center justify-between mt-3">
            <ProviderBadge provider={lesson.ai_provider} />
            <span className="text-[10px] text-gray-400">
              {new Date(lesson.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
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

        {/* Card Footer */}
        <div className="px-5 py-3 flex items-center justify-between bg-gray-50/50">
          <span className="flex items-center gap-1 text-sm text-violet-600 font-semibold hover:text-violet-700 transition-colors">
            View Details <ChevronRight className="w-4 h-4 ml-0.5" />
          </span>
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
  const [selectedLesson, setSelectedLesson] = useState<SelectedLessonState | null>(null);
  const [completing, setCompleting] = useState(false);
  const [completedStaticIds, setCompletedStaticIds] = useState<string[]>([]);

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    if (!isAuthenticated && isMounted) {
      router.replace('/auth/login');
    } else if (isAuthenticated && isMounted) {
      dispatch(fetchProgressData());
    }
  }, [isAuthenticated, router, dispatch, isMounted]);

  useEffect(() => {
    try {
      const ids = JSON.parse(localStorage.getItem('completed_static_lessons') || '[]');
      setCompletedStaticIds(ids);
    } catch {}
  }, [selectedLesson]);

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

  // Filter latest AI session-specific lesson
  const latestSessionSpecificLesson = activeAILessons.find(l => l.session_id);
  const otherActiveLessons = activeAILessons.filter(l => l.id !== latestSessionSpecificLesson?.id);

  const handleOpenStaticLesson = (lesson: any) => {
    const details = STATIC_LESSON_DETAILS[lesson.title] || {
      why_received: 'Recommended for general driving safety training.',
      behavioral_weakness: 'General driving focus and situational awareness.',
      ai_coaching: 'Maintain a safe, alert posture and resist digital interruptions.',
      psychology: 'Cognitive load management is key to safe operational control.',
      exercises: ['Review standard safety rules', 'Practice mindful scanning'],
      drills: ['Standard randomized mode'],
      improvement_goal: 'Improve overall safe decision consistency.',
    };

    const isCompleted = completedStaticIds.includes(lesson.id);

    setSelectedLesson({
      id: lesson.id,
      title: lesson.title,
      why_received: details.why_received,
      behavioral_weakness: details.behavioral_weakness,
      ai_coaching: details.ai_coaching,
      psychology: details.psychology,
      exercises: details.exercises,
      drills: details.drills,
      improvement_goal: details.improvement_goal,
      difficulty: lesson.difficulty,
      completed: isCompleted,
      isAI: false,
    });
  };

  const handleOpenAILesson = (lesson: AILesson) => {
    setSelectedLesson({
      id: lesson.id,
      title: lesson.title,
      why_received: lesson.generated_reason || 'Generated based on your recent driving session mistakes.',
      behavioral_weakness: lesson.behavioral_target,
      ai_coaching: lesson.ai_coaching_advice,
      psychology: lesson.why_it_matters,
      exercises: lesson.exercises,
      drills: lesson.simulation_modes,
      improvement_goal: lesson.improvement_goal,
      difficulty: lesson.difficulty,
      completed: lesson.completed,
      isAI: true,
      recommended_focus: lesson.recommended_focus || undefined
    });
  };

  const handleCompleteFromModal = async () => {
    if (!selectedLesson) return;
    setCompleting(true);
    if (selectedLesson.isAI) {
      await dispatch(completeLesson({ lessonId: selectedLesson.id, score: 100 }));
      setSelectedLesson(prev => prev ? { ...prev, completed: true } : null);
      toast.success('AI Lesson completed successfully!');
    } else {
      try {
        const completedStatics = JSON.parse(localStorage.getItem('completed_static_lessons') || '[]');
        if (!completedStatics.includes(selectedLesson.id)) {
          completedStatics.push(selectedLesson.id);
          localStorage.setItem('completed_static_lessons', JSON.stringify(completedStatics));
        }
        setSelectedLesson(prev => prev ? { ...prev, completed: true } : null);
        toast.success('Curriculum module completed successfully!');
      } catch (err) {
        toast.error('Failed to complete lesson.');
      }
    }
    setCompleting(false);
  };

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

                {/* Behavior Improvement Path */}
                {latestSessionSpecificLesson && (
                  <FadeUp delay={0.12}>
                    <div className={`${CARD} p-6 border-violet-200 bg-violet-50/20 mb-6`}>
                      <p className={LABEL + ' mb-3 text-violet-600 flex items-center gap-1.5'}>
                        <TrendingUp className="w-3.5 h-3.5" /> Behavior Improvement Path
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                        <div className="p-4 rounded-xl bg-red-50 border border-red-100 md:col-span-2">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-red-500 mb-1 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Session Mistake
                          </p>
                          <p className="text-xs font-semibold text-gray-700">
                            {latestSessionSpecificLesson.generated_reason || 'Detected trigger-response anomalies'}
                          </p>
                        </div>
                        <div className="flex justify-center md:rotate-0 rotate-90 md:col-span-1">
                          <ChevronRight className="w-5 h-5 text-violet-400" />
                        </div>
                        <div className="p-4 rounded-xl bg-violet-50 border border-violet-100 md:col-span-2">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-violet-500 mb-1 flex items-center gap-1">
                            <Target className="w-3 h-3" /> Recommended Lesson & Target Goal
                          </p>
                          <p className="text-xs font-bold text-gray-800 mb-1">{latestSessionSpecificLesson.title}</p>
                          <p className="text-xs text-violet-700 font-semibold">{latestSessionSpecificLesson.improvement_goal}</p>
                        </div>
                      </div>
                    </div>
                  </FadeUp>
                )}

                {/* Generated From Your Last Session (Feature Card) */}
                {latestSessionSpecificLesson && (
                  <div>
                    <FadeUp delay={0.14}>
                      <div className="flex items-center gap-2 mb-4">
                        <Sparkles className="w-4 h-4 text-violet-500" />
                        <h2 className="text-lg font-bold text-gray-900">Generated From Your Last Session</h2>
                        <span className="text-[10px] bg-red-100 text-red-700 border border-red-200 rounded-full px-2.5 py-0.5 font-bold uppercase tracking-wider animate-pulse">Correction Required</span>
                      </div>
                    </FadeUp>
                    <div className="max-w-2xl">
                      <AILessonCard lesson={latestSessionSpecificLesson} index={0} onOpen={handleOpenAILesson} />
                    </div>
                  </div>
                )}

                {/* Active lessons */}
                {otherActiveLessons.length > 0 && (
                  <div>
                    <FadeUp delay={0.15}>
                      <div className="flex items-center gap-2 mb-4">
                        <Star className="w-4 h-4 text-amber-500" />
                        <h2 className="text-lg font-bold text-gray-900">Your Personalized Plan</h2>
                        <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5 font-semibold">{otherActiveLessons.length} active</span>
                      </div>
                    </FadeUp>
                    <div className="grid gap-5 md:grid-cols-2">
                      {otherActiveLessons.map((lesson, i) => (
                        <AILessonCard key={lesson.id} lesson={lesson} index={i} onOpen={handleOpenAILesson} />
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
                        <AILessonCard key={lesson.id} lesson={lesson} index={i} onOpen={handleOpenAILesson} />
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
                      {lessons.map((lesson, idx) => {
                        const isCompleted = completedStaticIds.includes(lesson.id);
                        return (
                          <FadeUp key={lesson.id} delay={0.15 + idx * 0.05}>
                            <div 
                              onClick={() => handleOpenStaticLesson(lesson)}
                              className={`${CARD} p-6 flex flex-col justify-between h-full group cursor-pointer border-emerald-100 bg-emerald-50/30 hover:-translate-y-0.5 hover:shadow-md`}
                            >
                              <div>
                                <div className="flex items-start justify-between gap-3 mb-2">
                                  <h4 className="text-base font-bold text-gray-900 group-hover:text-emerald-700 transition-colors leading-snug">{lesson.title}</h4>
                                  <div className="flex gap-1.5 shrink-0">
                                    {isCompleted && (
                                      <span className="text-[10px] uppercase font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md border border-emerald-200 flex items-center gap-1">
                                        <CheckCircle2 className="w-2.5 h-2.5" /> Done
                                      </span>
                                    )}
                                    <span className="text-[10px] uppercase font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md border border-emerald-200">{lesson.difficulty}</span>
                                  </div>
                                </div>
                                <p className="text-sm text-gray-500 leading-relaxed mb-4">{lesson.description}</p>
                              </div>
                              <div className="flex items-center text-sm font-semibold text-emerald-600 group-hover:text-emerald-700 transition-colors">
                                <PlayCircle className="w-4 h-4 mr-1.5" /> Start Lesson
                              </div>
                            </div>
                          </FadeUp>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* All lessons */}
                <div>
                  <FadeUp delay={0.2}>
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Browse All Modules</h2>
                  </FadeUp>
                  <div className="grid gap-5 md:grid-cols-2">
                    {allLessons.map((lesson, idx) => {
                      const isCompleted = completedStaticIds.includes(lesson.id);
                      return (
                        <FadeUp key={lesson.id} delay={0.25 + idx * 0.05}>
                          <div 
                            onClick={() => handleOpenStaticLesson(lesson)}
                            className={`${CARD} p-6 flex flex-col justify-between h-full group cursor-pointer hover:-translate-y-0.5 hover:shadow-md`}
                          >
                            <div>
                              <div className="flex items-start justify-between gap-3 mb-2">
                                <h4 className="text-base font-bold text-gray-900 group-hover:text-emerald-700 transition-colors leading-snug">{lesson.title}</h4>
                                <div className="flex gap-1.5 shrink-0">
                                  {isCompleted && (
                                    <span className="text-[10px] uppercase font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md border border-emerald-200 flex items-center gap-1">
                                      <CheckCircle2 className="w-2.5 h-2.5" /> Done
                                    </span>
                                  )}
                                  <span className="text-[10px] uppercase font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded-md border border-gray-200">{lesson.difficulty}</span>
                                </div>
                              </div>
                              <p className="text-sm text-gray-500 leading-relaxed mb-4">{lesson.description}</p>
                            </div>
                            <div className="flex items-center text-sm font-medium text-gray-400 group-hover:text-emerald-600 transition-colors">
                              View Details <ChevronRight className="w-4 h-4 ml-1" />
                            </div>
                          </div>
                        </FadeUp>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Immersive Lesson Detail Modal */}
        <LessonDetailModal 
          lesson={selectedLesson}
          onClose={() => setSelectedLesson(null)}
          onComplete={handleCompleteFromModal}
          completing={completing}
        />
      </AppShell>
    </>
  );
}
