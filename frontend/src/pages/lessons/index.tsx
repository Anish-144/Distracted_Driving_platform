import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAppSelector, useAppDispatch } from '@/store';
import { fetchProgressData, generateNewAILesson, completeLesson, retakeLesson } from '@/store/progressSlice';
import AppShell from '@/components/layout/AppShell';
import { FadeUp } from '@/components/motion/ScrollReveal';
import {
  BookOpen, ChevronRight, PlayCircle, Star, Sparkles,
  Brain, Target, Zap, CheckCircle2, RefreshCw, Clock,
  TrendingUp, Shield, AlertTriangle, X, RotateCcw, Award, BarChart3
} from 'lucide-react';
import { AILesson } from '@/api/lessons';

// ── Design tokens ──────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.10em] mb-3" style={{ color: 'var(--text-muted)', fontFamily: 'Space Grotesk, sans-serif' }}>
      {children}
    </p>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ProviderBadge({ provider }: { provider: string }) {
  if (provider === 'fallback') return (
    <span className="text-[10px] text-muted font-medium">Offline coaching</span>
  );
  const label = provider.includes('gemini') ? 'Gemini AI' : provider.includes('gpt') ? 'GPT-4o' : provider.includes('deepseek') ? 'DeepSeek AI' : provider;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded" style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}>
      <Sparkles className="w-2.5 h-2.5" /> {label}
    </span>
  );
}

interface SelectedLessonState {
  id: string;
  title: string;
  why_received: string;
  lesson_category: string;
  behavioral_diagnosis: string;
  psychological_interpretation: string;
  real_world_risk_impact: string;
  cognitive_coaching_narrative: string;
  scenario_replay_analysis: string;
  behavioral_exercises: string[];
  mental_conditioning_techniques: string[];
  attention_reinforcement_tasks: string[];
  future_risk_projection: string;
  personalized_improvement_strategy: string;
  difficulty: string;
  completed: boolean;
  isAI: boolean;
  recommended_focus?: string;
}

interface LessonDetailModalProps {
  lesson: SelectedLessonState | null;
  onClose: () => void;
  onComplete: () => Promise<void>;
  onRetake: () => Promise<void>;
  completing: boolean;
}

function LessonDetailModal({ lesson, onClose, onComplete, onRetake, completing }: LessonDetailModalProps) {
  if (!lesson) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col relative animate-scale-up" style={{ background: 'var(--bg-base)', border: '1px solid var(--border-strong)', borderRadius: '4px' }}>
        {/* Header */}
        <div className="p-6 md:p-8 border-b shrink-0 flex items-start justify-between gap-4" style={{ borderColor: 'var(--border-strong)', background: 'var(--bg-canvas)' }}>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded" style={{ background: '#1A1814', color: '#F0EDE6' }}>
                {lesson.isAI ? 'Cognitive Intervention' : 'Curriculum Module'}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-strong)', color: 'var(--text-primary)' }}>
                {lesson.lesson_category}
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold uppercase tracking-tight mb-2" style={{ color: 'var(--text-primary)', fontFamily: 'Space Grotesk, sans-serif' }}>{lesson.title}</h2>
            <p className="text-sm leading-relaxed max-w-2xl" style={{ color: 'var(--text-secondary)' }}>{lesson.why_received}</p>
          </div>
          <button onClick={onClose} className="p-2 transition-colors hover:opacity-70" style={{ color: 'var(--text-primary)' }}>
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8 flex-1 overflow-y-auto space-y-6" style={{ background: 'var(--bg-card)' }}>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              <div className="p-5 border rounded" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
                <h3 className="text-[10px] font-bold uppercase tracking-wider mb-2 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                  <Target className="w-3.5 h-3.5" /> Behavioral Diagnosis
                </h3>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-primary)' }}>{lesson.behavioral_diagnosis}</p>
              </div>

              <div className="p-5 border rounded" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
                <h3 className="text-[10px] font-bold uppercase tracking-wider mb-2 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                  <Brain className="w-3.5 h-3.5" /> Psychological Interpretation
                </h3>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{lesson.psychological_interpretation}</p>
              </div>

              <div className="p-5 border-l-4 rounded" style={{ background: 'var(--bg-surface-raised)', borderColor: '#C8FF00', borderLeftColor: '#C8FF00', borderTop: '1px solid var(--border-subtle)', borderRight: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
                <h3 className="text-[10px] font-bold uppercase tracking-wider mb-2 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <Sparkles className="w-3.5 h-3.5" /> Cognitive Coaching Narrative
                </h3>
                <p className="text-xs leading-relaxed italic font-medium" style={{ color: 'var(--text-primary)' }}>
                  &quot;{lesson.cognitive_coaching_narrative}&quot;
                </p>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div className="p-5 border rounded" style={{ background: 'var(--bg-canvas)', borderColor: 'var(--border-subtle)' }}>
                <h3 className="text-[10px] font-bold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: '#8B2020' }}>
                  <AlertTriangle className="w-3.5 h-3.5" /> Risk Assessment
                </h3>
                <div className="space-y-3">
                  <div>
                    <h4 className="text-[9px] font-bold uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>Real-World Impact</h4>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--text-primary)' }}>{lesson.real_world_risk_impact}</p>
                  </div>
                  <div className="h-px w-full" style={{ background: 'var(--border-subtle)' }} />
                  <div>
                    <h4 className="text-[9px] font-bold uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>Future Projection</h4>
                    <p className="text-xs leading-relaxed font-semibold" style={{ color: '#8B2020' }}>{lesson.future_risk_projection}</p>
                  </div>
                </div>
              </div>

              <div className="p-5 border rounded" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
                <h3 className="text-[10px] font-bold uppercase tracking-wider mb-2 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                  <PlayCircle className="w-3.5 h-3.5" /> Scenario Replay Analysis
                </h3>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{lesson.scenario_replay_analysis}</p>
              </div>

              <div className="p-5 border rounded" style={{ background: 'var(--bg-surface-raised)', borderColor: 'var(--border-strong)' }}>
                <h3 className="text-[10px] font-bold uppercase tracking-wider mb-2 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <TrendingUp className="w-3.5 h-3.5" /> Intervention Strategy
                </h3>
                <p className="text-xs leading-relaxed font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
                  {lesson.personalized_improvement_strategy}
                </p>
                {lesson.recommended_focus && (
                  <div className="p-3 border rounded" style={{ background: 'var(--bg-canvas)', borderColor: 'var(--border-subtle)' }}>
                    <h4 className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Target Focus</h4>
                    <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-primary)' }}>{lesson.recommended_focus}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t" style={{ borderColor: 'var(--border-strong)' }}>
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Behavioral Exercises</h3>
              <ul className="space-y-2">
                {lesson.behavioral_exercises.map((ex, i) => (
                  <li key={i} className="flex items-start gap-2 text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    <span className="w-1 h-1 bg-black mt-1.5 shrink-0 rounded-full" />
                    <span>{ex}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Mental Conditioning</h3>
              <ul className="space-y-2">
                {lesson.mental_conditioning_techniques.map((ex, i) => (
                  <li key={i} className="flex items-start gap-2 text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    <span className="w-1 h-1 bg-black mt-1.5 shrink-0 rounded-full" />
                    <span>{ex}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Reinforcement Tasks</h3>
              <ul className="space-y-2">
                {lesson.attention_reinforcement_tasks.map((ex, i) => (
                  <li key={i} className="flex items-start gap-2 text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    <span className="w-1 h-1 bg-black mt-1.5 shrink-0 rounded-full" />
                    <span>{ex}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t shrink-0 flex items-center justify-between gap-4" style={{ borderColor: 'var(--border-strong)', background: 'var(--bg-canvas)' }}>
          <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Difficulty: <span style={{ color: 'var(--text-primary)' }}>{lesson.difficulty}</span>
          </div>
          <div className="flex items-center gap-3">
            {lesson.completed ? (
              <button
                onClick={onRetake}
                disabled={completing}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border rounded disabled:opacity-50 transition-colors"
                style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-strong)', color: 'var(--text-primary)' }}
              >
                {completing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                {completing ? 'Logging...' : 'Log Review'}
              </button>
            ) : (
              <button
                onClick={onComplete}
                disabled={completing}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-2 rounded disabled:opacity-50 transition-colors"
                style={{ background: '#1A1814', color: '#C8FF00' }}
              >
                {completing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                {completing ? 'Committing...' : 'Mark Completed'}
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
  
  const simSource = lesson.simulation_source || (
    lesson.title.toLowerCase().includes('phone') || lesson.title.toLowerCase().includes('call') ? 'Phone Call Simulation' :
    lesson.title.toLowerCase().includes('gps') || lesson.title.toLowerCase().includes('route') ? 'GPS Rerouting' :
    lesson.title.toLowerCase().includes('passenger') || lesson.title.toLowerCase().includes('social') ? 'Passenger Pressure Test' :
    lesson.title.toLowerCase().includes('traffic') || lesson.title.toLowerCase().includes('multi') ? 'Multi-Distraction Scenario' :
    'Standard Driving Simulation'
  );

  const mistakeTrigger = lesson.mistake_trigger || 'Baseline Drift Detected';
  const riskLevel = lesson.risk_level || (lesson.reaction_time_target <= 2.2 ? 'High Risk' : lesson.reaction_time_target <= 3.0 ? 'Medium Risk' : 'Low Risk');

  const handleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setCompleting(true);
    try {
      await dispatch(completeLesson(lesson.id)).unwrap();
      toast.success('Lesson marked complete!');
    } catch (err: any) {
      toast.error(err || 'Failed to complete lesson.');
    } finally {
      setCompleting(false);
    }
  };

  return (
    <FadeUp delay={0.1 + index * 0.06}>
      <div 
        onClick={() => onOpen(lesson)}
        className={`relative overflow-hidden cursor-pointer border rounded-md transition-all duration-200 group ${lesson.completed ? 'opacity-70' : 'hover:-translate-y-0.5'}`}
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-card)' }}
      >
        <div className="p-5 border-b" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}>
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h3 className="text-base font-bold uppercase tracking-tight leading-snug mb-2" style={{ color: 'var(--text-primary)', fontFamily: 'Space Grotesk, sans-serif' }}>{lesson.title}</h3>
              <div className="flex flex-wrap gap-1.5">
                <span className="inline-flex items-center text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border" style={{ background: 'var(--bg-canvas)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}>
                  {lesson.driver_type} Protocol
                </span>
                <span className="inline-flex items-center text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border" style={{ background: 'var(--bg-canvas)', borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}>
                  {simSource}
                </span>
                <span className="inline-flex items-center text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border" style={{ background: 'var(--bg-canvas)', borderColor: 'var(--border-subtle)', color: '#8B2020' }}>
                  {riskLevel}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {lesson.completed && (
                <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded" style={{ background: '#1A1814', color: '#F0EDE6' }}>
                  <CheckCircle2 className="w-3 h-3" /> Done
                </span>
              )}
              <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border" style={{ background: 'var(--bg-canvas)', borderColor: 'var(--border-strong)', color: 'var(--text-primary)' }}>
                {lesson.difficulty}
              </span>
            </div>
          </div>
          
          <p className="text-[11px] leading-relaxed font-medium mt-1" style={{ color: 'var(--text-secondary)' }}>{lesson.behavioral_diagnosis}</p>
          
          <div className="flex items-center justify-between mt-4 pt-4 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
            <ProviderBadge provider={lesson.ai_provider} />
            <span className="text-[10px] font-bold uppercase mono-data" style={{ color: 'var(--text-muted)' }}>
              {new Date(lesson.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
        </div>

        <div className="p-4 border-b" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface-raised)' }}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Brain className="w-3.5 h-3.5" style={{ color: 'var(--text-primary)' }} />
            <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Cognitive Coaching</span>
          </div>
          <p className="text-[11px] leading-relaxed italic" style={{ color: 'var(--text-secondary)' }}>&quot;{lesson.cognitive_coaching_narrative}&quot;</p>
        </div>

        <div className="px-5 py-3 flex items-center justify-between" style={{ background: 'var(--bg-surface)' }}>
          <span className="text-[10px] font-bold uppercase tracking-wider group-hover:underline" style={{ color: 'var(--text-primary)' }}>
            View Details
          </span>
          {!lesson.completed ? (
            <button
              onClick={handleComplete}
              disabled={completing}
              className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider disabled:opacity-50 hover:opacity-70 transition-opacity"
              style={{ color: 'var(--text-primary)' }}
            >
              {completing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              {completing ? 'Saving...' : 'Mark Complete'}
            </button>
          ) : (
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              <RotateCcw className="w-3.5 h-3.5" /> Retake Lesson
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
  const { lessons, aiLessons, isLoading, isGenerating, generateError } = useAppSelector((state) => state.progress);
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
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <div className="w-5 h-5 border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--text-primary)', borderTopColor: 'transparent', borderRadius: '50%' }} />
      </div>
    );
  }

  const activeAILessons = aiLessons.filter(l => !l.completed);
  const completedAILessons = aiLessons.filter(l => l.completed);
  const completionRate = aiLessons.length > 0 ? Math.round((completedAILessons.length / aiLessons.length) * 100) : 0;
  const latestSessionSpecificLesson = activeAILessons.find(l => l.session_id);
  const otherActiveLessons = activeAILessons.filter(l => l.id !== latestSessionSpecificLesson?.id);
  const allAILessonsCompleted = aiLessons.length > 0 && activeAILessons.length === 0;

  const activeStaticLessons = lessons.filter(l => !completedStaticIds.includes(l.id));
  const completedStaticLessons = lessons.filter(l => completedStaticIds.includes(l.id));

  const handleOpenStaticLesson = (lesson: any) => {
    const isCompleted = completedStaticIds.includes(lesson.id);
    setSelectedLesson({
      id: lesson.id,
      title: lesson.title,
      why_received: 'Recommended for general driving safety training.',
      lesson_category: "Curriculum Baseline",
      behavioral_diagnosis: 'General driving focus and situational awareness.',
      psychological_interpretation: 'Cognitive load management is key to safe operational control.',
      real_world_risk_impact: "Basic safety hazard introduced by improper behavioral response.",
      cognitive_coaching_narrative: 'Maintain a safe, alert posture and resist digital interruptions.',
      scenario_replay_analysis: "Standard curriculum module unassociated with a specific session.",
      behavioral_exercises: ['Review standard safety rules', 'Practice mindful scanning'],
      mental_conditioning_techniques: [],
      attention_reinforcement_tasks: [],
      future_risk_projection: "Continued poor habits increase statistical collision probability.",
      personalized_improvement_strategy: 'Improve overall safe decision consistency.',
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
      lesson_category: lesson.lesson_category || "Behavioral Intervention",
      behavioral_diagnosis: lesson.behavioral_diagnosis,
      psychological_interpretation: lesson.psychological_interpretation,
      real_world_risk_impact: lesson.real_world_risk_impact,
      cognitive_coaching_narrative: lesson.cognitive_coaching_narrative,
      scenario_replay_analysis: lesson.scenario_replay_analysis,
      behavioral_exercises: lesson.behavioral_exercises,
      mental_conditioning_techniques: lesson.mental_conditioning_techniques,
      attention_reinforcement_tasks: lesson.attention_reinforcement_tasks,
      future_risk_projection: lesson.future_risk_projection,
      personalized_improvement_strategy: lesson.personalized_improvement_strategy,
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
      try {
        await dispatch(completeLesson(selectedLesson.id)).unwrap();
        setSelectedLesson(prev => prev ? { ...prev, completed: true } : null);
        toast.success('AI Lesson completed successfully!');
      } catch (err: any) {
        toast.error(err || 'Failed to complete AI lesson.');
      }
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

  const handleRetakeFromModal = async () => {
    if (!selectedLesson) return;
    setCompleting(true);
    if (selectedLesson.isAI) {
      try {
        await dispatch(retakeLesson(selectedLesson.id)).unwrap();
        toast.success('Review logged successfully!');
        setSelectedLesson(null);
      } catch (err: any) {
        toast.error(err || 'Failed to log review.');
      }
    } else {
      toast.success('Curriculum module review logged!');
      setSelectedLesson(null);
    }
    setCompleting(false);
  };

  return (
    <>
      <Head>
        <title>Lessons — SafeDrive AI</title>
        <meta name="description" content="AI-powered personalized behavioral training lessons for SafeDrive AI." />
      </Head>

      <AppShell maxWidth="wide">
        <div className="max-w-6xl mx-auto pb-12">
          {/* Page header */}
          <FadeUp className="mb-8">
            <SectionLabel>Behavioral Training Center</SectionLabel>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded flex items-center justify-center shrink-0" style={{ background: '#C8FF00' }}>
                  <BookOpen className="w-5 h-5" style={{ color: '#1A1814' }} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold uppercase tracking-tight" style={{ color: 'var(--text-primary)', fontFamily: 'Space Grotesk, sans-serif' }}>Training Modules</h1>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>AI-personalized to your behavioral profile</p>
                </div>
              </div>

              {/* Stats bar */}
              {aiLessons.length > 0 && (
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-xl font-bold mono-data" style={{ color: 'var(--text-primary)' }}>{aiLessons.length}</p>
                    <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Total Lessons</p>
                  </div>
                  <div className="w-px h-8" style={{ background: 'var(--border-subtle)' }} />
                  <div className="text-center">
                    <p className="text-xl font-bold mono-data" style={{ color: 'var(--text-primary)' }}>{completedAILessons.length}</p>
                    <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Completed</p>
                  </div>
                  <div className="w-px h-8" style={{ background: 'var(--border-subtle)' }} />
                  <div className="text-center">
                    <p className="text-xl font-bold mono-data" style={{ color: 'var(--text-primary)' }}>{completionRate}%</p>
                    <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Progress</p>
                  </div>
                </div>
              )}
            </div>
          </FadeUp>

          {/* Tabs */}
          <FadeUp delay={0.05} className="mb-8">
            <div className="flex items-center gap-1 p-1 rounded w-fit border" style={{ background: 'var(--bg-canvas)', borderColor: 'var(--border-subtle)' }}>
              <button
                onClick={() => setActiveTab('ai')}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors rounded"
                style={{ background: activeTab === 'ai' ? 'var(--bg-surface)' : 'transparent', color: activeTab === 'ai' ? 'var(--text-primary)' : 'var(--text-muted)' }}
              >
                <Sparkles className="w-3.5 h-3.5" /> AI Lessons
              </button>
              <button
                onClick={() => setActiveTab('library')}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors rounded"
                style={{ background: activeTab === 'library' ? 'var(--bg-surface)' : 'transparent', color: activeTab === 'library' ? 'var(--text-primary)' : 'var(--text-muted)' }}
              >
                <BookOpen className="w-3.5 h-3.5" /> Library
              </button>
            </div>
          </FadeUp>

          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-52 rounded animate-pulse" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)' }} />
              ))}
            </div>
          ) : (
            <>
              {/* ── AI LESSONS TAB ──────────────────────────────────────────────── */}
              {activeTab === 'ai' && (
                <div className="space-y-8">
                  {/* Generate button */}
                  <FadeUp delay={0.1}>
                    <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border rounded" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-card)' }}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 flex items-center justify-center shrink-0 border" style={{ background: 'var(--bg-canvas)', borderColor: 'var(--border-strong)', borderRadius: '4px' }}>
                          <Sparkles className="w-4 h-4" style={{ color: 'var(--text-primary)' }} />
                        </div>
                        <div>
                          <p className="text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--text-primary)' }}>Generate New AI Lesson</p>
                          <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>Based on your latest behavioral data and driver profile</p>
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
                        className="px-4 py-2 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 rounded disabled:opacity-50 transition-colors"
                        style={{ background: '#1A1814', color: '#C8FF00' }}
                      >
                        {isGenerating ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Generating...</> : <><Sparkles className="w-3.5 h-3.5" /> Generate</>}
                      </button>
                    </div>
                    {generateError && (
                      <div className="mt-4 p-4 border rounded" style={{ background: 'var(--bg-canvas)', borderColor: '#8B2020' }}>
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="w-4 h-4 mt-0.5" style={{ color: '#8B2020' }} />
                          <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: '#8B2020' }}>Generation Failed</h4>
                            <p className="text-[11px] mt-1" style={{ color: 'var(--text-primary)' }}>{generateError}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </FadeUp>

                  {/* Generated From Your Last Session */}
                  {latestSessionSpecificLesson && (
                    <div>
                      <FadeUp delay={0.14}>
                        <div className="flex items-center gap-3 mb-4">
                          <h2 className="text-base font-bold uppercase tracking-tight" style={{ color: 'var(--text-primary)' }}>Immediate Review</h2>
                          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border" style={{ background: 'var(--bg-canvas)', borderColor: '#8B2020', color: '#8B2020' }}>Correction Required</span>
                        </div>
                      </FadeUp>
                      <div className="grid gap-4 md:grid-cols-2">
                        <AILessonCard lesson={latestSessionSpecificLesson} index={0} onOpen={handleOpenAILesson} />
                      </div>
                    </div>
                  )}

                  {/* Active lessons */}
                  {otherActiveLessons.length > 0 && (
                    <div>
                      <FadeUp delay={0.15}>
                        <div className="flex items-center gap-3 mb-4">
                          <h2 className="text-base font-bold uppercase tracking-tight" style={{ color: 'var(--text-primary)' }}>Your Personalized Plan</h2>
                          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border" style={{ background: 'var(--bg-canvas)', borderColor: 'var(--border-strong)', color: 'var(--text-primary)' }}>{otherActiveLessons.length} active</span>
                        </div>
                      </FadeUp>
                      <div className="grid gap-4 md:grid-cols-2">
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
                        <div className="flex items-center gap-3 mb-4">
                          <h2 className="text-base font-bold uppercase tracking-tight" style={{ color: 'var(--text-primary)' }}>Completed</h2>
                          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border" style={{ background: 'var(--bg-canvas)', borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}>{completedAILessons.length}</span>
                        </div>
                      </FadeUp>
                      <div className="grid gap-4 md:grid-cols-2">
                        {completedAILessons.map((lesson, i) => (
                          <AILessonCard key={lesson.id} lesson={lesson} index={i} onOpen={handleOpenAILesson} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Empty state */}
                  {aiLessons.length === 0 && !isGenerating && (
                    <FadeUp delay={0.2}>
                      <div className="p-10 border rounded text-center" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-card)' }}>
                        <Brain className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                        <h3 className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-primary)' }}>Your personalized curriculum awaits</h3>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Click "Generate" above to create your first targeted AI lesson based on your behavioral data.</p>
                      </div>
                    </FadeUp>
                  )}
                </div>
              )}

              {/* ── LIBRARY TAB ─────────────────────────────────────────────────── */}
              {activeTab === 'library' && (
                <div className="space-y-10">
                  <div>
                    <FadeUp delay={0.1}>
                      <h2 className="text-base font-bold uppercase tracking-tight mb-4" style={{ color: 'var(--text-primary)' }}>Recommended for You</h2>
                    </FadeUp>
                    {activeStaticLessons.length === 0 ? (
                      <FadeUp delay={0.15}>
                        <div className="p-6 border rounded text-center" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-card)' }}>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>All recommended lessons have been completed.</p>
                        </div>
                      </FadeUp>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {activeStaticLessons.map((lesson, idx) => (
                          <FadeUp key={lesson.id} delay={0.15 + idx * 0.05}>
                            <div 
                              onClick={() => handleOpenStaticLesson(lesson)}
                              className="p-5 flex flex-col justify-between h-full cursor-pointer transition-transform hover:-translate-y-0.5 border rounded"
                              style={{ background: 'var(--bg-card)', borderColor: 'var(--border-card)' }}
                            >
                              <div>
                                <div className="flex items-start justify-between gap-3 mb-2">
                                  <h4 className="text-sm font-bold uppercase tracking-wide leading-snug" style={{ color: 'var(--text-primary)' }}>{lesson.title}</h4>
                                  <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border shrink-0" style={{ background: 'var(--bg-canvas)', borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}>{lesson.difficulty}</span>
                                </div>
                                <p className="text-[11px] leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>{lesson.description}</p>
                              </div>
                              <div className="flex items-center text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
                                <PlayCircle className="w-3.5 h-3.5 mr-1.5" /> Start Lesson
                              </div>
                            </div>
                          </FadeUp>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          <LessonDetailModal 
            lesson={selectedLesson}
            onClose={() => setSelectedLesson(null)}
            onComplete={handleCompleteFromModal}
            onRetake={handleRetakeFromModal}
            completing={completing}
          />
        </div>
      </AppShell>
    </>
  );
}
