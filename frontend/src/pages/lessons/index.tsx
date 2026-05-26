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
const CARD = 'card relative transition-all duration-300';
const LABEL = 'text-[11px] font-bold uppercase tracking-[0.12em] text-muted';

const DRIVER_COLORS: Record<string, { bg: string; text: string; border: string; badge: string }> = {
 impulsive: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', badge: 'bg-red-500/20 text-red-400 border-red-500/30' },
 distracted: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
 hesitant: { bg: 'bg-secondary', text: 'text-primary', border: 'border-subtle', badge: 'bg-purple-500/20 text-primary border-subtle' },
 inconsistent: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
 safe: { bg: 'bg-brand-500/10', text: 'text-brand-400', border: 'border-brand-500/20', badge: 'bg-brand-500/20 text-brand-400 border-brand-500/30' },
 unknown: { bg: 'bg-secondary', text: 'text-muted', border: 'border-subtle', badge: 'bg-tertiary text-muted border-subtle' },
};

const DIFFICULTY_COLORS: Record<string, string> = {
 Beginner: 'bg-brand-500/20 text-brand-400 border-brand-500/30',
 Intermediate: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
 Advanced: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const DRIVER_ICONS: Record<string, typeof Zap> = {
 impulsive: Zap,
 distracted: Brain,
 hesitant: Clock,
 inconsistent: BarChart3,
 safe: Shield,
 unknown: Target,
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
 <span className="text-[10px] text-muted font-medium">Offline coaching</span>
 );
 const label = provider.includes('gemini') ? 'Gemini AI' : provider.includes('gpt') ? 'GPT-4o' : provider.includes('deepseek') ? 'DeepSeek AI' : provider;
 return (
 <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary bg-secondary border border-subtle rounded-md px-2 py-0.5">
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
 <span className="text-xs text-muted">{label}</span>
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
 completing: boolean;
}

function LessonDetailModal({ lesson, onClose, onComplete, completing }: LessonDetailModalProps) {
 if (!lesson) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="bg-gray-950 rounded-3xl border border-gray-800 shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto flex flex-col animate-scale-up text-gray-200" style={{ boxShadow: '0 0 50px -10px rgba(139, 92, 246, 0.15)' }}>
        {/* Header - Dossier Style */}
        <div className="p-8 border-b border-gray-800/60 flex items-start justify-between gap-4 bg-gradient-to-r from-gray-900 to-gray-950">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] px-2.5 py-1 rounded-sm border border-violet-500/30 bg-violet-500/10 text-violet-400">
                {lesson.isAI ? 'Cognitive Intervention Module' : 'Curriculum Module'}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] px-2.5 py-1 rounded-sm border border-blue-500/30 bg-blue-500/10 text-blue-400">
                {lesson.lesson_category}
              </span>
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">{lesson.title}</h2>
            <p className="text-sm text-gray-400 max-w-2xl">{lesson.why_received}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-800 text-gray-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 flex-1 overflow-y-auto space-y-8 bg-gray-950 relative">
          {/* Subtle Grid Background */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
            {/* Left Column: Diagnostics & Coaching */}
            <div className="space-y-6">
              {/* Behavioral Diagnosis */}
              <div className="bg-gray-900/50 border border-gray-800/80 rounded-2xl p-6">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Target className="w-4 h-4 text-emerald-400" /> Behavioral Diagnosis
                </h3>
                <p className="text-sm text-gray-300 leading-relaxed font-medium">
                  {lesson.behavioral_diagnosis}
                </p>
              </div>

              {/* Psychological Interpretation */}
              <div className="bg-gray-900/50 border border-gray-800/80 rounded-2xl p-6">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Brain className="w-4 h-4 text-violet-400" /> Psychological Interpretation
                </h3>
                <p className="text-sm text-gray-300 leading-relaxed">
                  {lesson.psychological_interpretation}
                </p>
              </div>

              {/* AI Coaching Narrative */}
              <div className="bg-violet-900/10 border border-violet-500/20 rounded-2xl p-6">
                <h3 className="text-xs font-bold text-violet-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-violet-400" /> Cognitive Coaching Narrative
                </h3>
                <p className="text-sm text-violet-200 leading-relaxed italic border-l-2 border-violet-500/50 pl-4">
                  &quot;{lesson.cognitive_coaching_narrative}&quot;
                </p>
              </div>
            </div>

            {/* Right Column: Risks & Actions */}
            <div className="space-y-6">
              {/* Risk Impact & Projection */}
              <div className="bg-red-900/10 border border-red-500/20 rounded-2xl p-6">
                <h3 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400" /> Risk Assessment
                </h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Real-World Impact</h4>
                    <p className="text-sm text-gray-300 leading-relaxed">{lesson.real_world_risk_impact}</p>
                  </div>
                  <div className="h-px bg-red-500/10 w-full" />
                  <div>
                    <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Future Projection</h4>
                    <p className="text-sm text-red-300/80 leading-relaxed font-medium">{lesson.future_risk_projection}</p>
                  </div>
                </div>
              </div>

              {/* Scenario Replay Analysis */}
              <div className="bg-gray-900/50 border border-gray-800/80 rounded-2xl p-6">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <PlayCircle className="w-4 h-4 text-blue-400" /> Scenario Replay Analysis
                </h3>
                <p className="text-sm text-gray-300 leading-relaxed">
                  {lesson.scenario_replay_analysis}
                </p>
              </div>

              {/* Strategy & Focus */}
              <div className="bg-emerald-900/10 border border-emerald-500/20 rounded-2xl p-6">
                <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" /> Intervention Strategy
                </h3>
                <p className="text-sm text-emerald-100/90 leading-relaxed font-medium mb-4">
                  {lesson.personalized_improvement_strategy}
                </p>
                {lesson.recommended_focus && (
                  <div className="bg-gray-950/50 rounded-lg p-3 border border-emerald-500/10">
                    <h4 className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-1">Target Focus</h4>
                    <p className="text-xs text-gray-300">{lesson.recommended_focus}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Section: Exercises & Tasks */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10 pt-4 border-t border-gray-800/60">
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Behavioral Exercises</h3>
              <ul className="space-y-3">
                {lesson.behavioral_exercises.map((ex, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-gray-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                    <span>{ex}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Mental Conditioning</h3>
              <ul className="space-y-3">
                {lesson.mental_conditioning_techniques.map((ex, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-gray-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 shrink-0" />
                    <span>{ex}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Reinforcement Tasks</h3>
              <ul className="space-y-3">
                {lesson.attention_reinforcement_tasks.map((ex, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-gray-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                    <span>{ex}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-800/60 bg-gray-900/50 flex items-center justify-between gap-4 rounded-b-3xl">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-widest">
            Difficulty: <span className="text-white">{lesson.difficulty}</span>
          </div>
          <div className="flex items-center gap-3">
            {lesson.completed ? (
              <span className="flex items-center gap-1.5 text-sm font-bold text-emerald-400 bg-emerald-900/20 px-4 py-2 rounded-xl border border-emerald-500/20">
                <CheckCircle2 className="w-4 h-4" /> Dossier Completed
              </span>
            ) : (
              <button
                onClick={onComplete}
                disabled={completing}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-gray-950 text-sm font-bold px-6 py-2.5 rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50"
              >
                {completing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                {completing ? 'Committing...' : 'Mark Module Completed'}
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
 
 // Resolve badges safely with frontend fallbacks for full backward compatibility
 const simSource = lesson.simulation_source || (
 lesson.title.toLowerCase().includes('phone') || lesson.title.toLowerCase().includes('call') ? 'Phone Call Simulation' :
 lesson.title.toLowerCase().includes('gps') || lesson.title.toLowerCase().includes('route') ? 'GPS Rerouting' :
 lesson.title.toLowerCase().includes('passenger') || lesson.title.toLowerCase().includes('social') ? 'Passenger Pressure Test' :
 lesson.title.toLowerCase().includes('traffic') || lesson.title.toLowerCase().includes('multi') ? 'Multi-Distraction Scenario' :
 'Standard Driving Simulation'
 );

 const mistakeTrigger = lesson.mistake_trigger || (
 lesson.driver_type === 'impulsive' ? 'Fast Reaction' :
 lesson.driver_type === 'distracted' ? 'Unsafe Interaction' :
 lesson.driver_type === 'hesitant' ? 'Hesitation Detected' :
 'Baseline Drift Detected'
 );

 const riskLevel = lesson.risk_level || (
 lesson.reaction_time_target <= 2.2 ? 'High Risk' :
 lesson.reaction_time_target <= 3.0 ? 'Medium Risk' :
 'Low Risk'
 );

 const scenarioIcon = (source: string) => {
 switch (source) {
 case 'Phone Call Simulation': return '📞';
 case 'GPS Rerouting': return '🗺️';
 case 'Passenger Pressure Test': return '🧑🤝🧑';
 case 'Multi-Distraction Scenario': return '🚦';
 default: return '🚗';
 }
 };

 const getRiskBadgeStyles = (level: string) => {
 switch (level) {
 case 'High Risk': return 'bg-red-500/10 text-red-400 border-red-500/20';
 case 'Medium Risk': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
 case 'Low Risk': return 'bg-brand-500/10 text-brand-400 border-brand-500/20';
 default: return 'bg-secondary text-muted border-subtle';
 }
 };

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
 className={`${CARD} ${lesson.completed ? 'opacity-75' : 'hover:-translate-y-1 hover: hover:'} overflow-hidden cursor-pointer border-t-4 ${colors.border} transition-all duration-300`}
 >
 {/* Card Header */}
 <div className={`bg-secondary border-b border-subtle p-5`}>
 <div className="flex items-start justify-between gap-3 mb-3">
 <div className="flex items-center gap-3 min-w-0">
 <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 bg-secondary border border-subtle text-2xl`}>
 {scenarioIcon(simSource)}
 </div>
 <div>
 <h3 className={`text-base font-bold text-white leading-tight`}>{lesson.title}</h3>
 
 {/* 4 Required Badges */}
 <div className="flex flex-wrap gap-1.5 mt-2">
 <span className={`inline-flex items-center text-[9px] font-bold border rounded px-1.5 py-0.5 capitalize ${colors.badge}`}>
 <DriverIcon className="w-2.5 h-2.5 mr-1" /> {lesson.driver_type} Protocol
 </span>
 <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-secondary text-primary border border-subtle rounded px-1.5 py-0.5">
 {simSource}
 </span>
 <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded px-1.5 py-0.5">
 Trigger: {mistakeTrigger}
 </span>
 <span className={`inline-flex items-center text-[9px] font-bold border rounded px-1.5 py-0.5 ${getRiskBadgeStyles(riskLevel)}`}>
 {riskLevel}
 </span>
 </div>
 </div>
 </div>
 <div className="flex items-center gap-2 flex-shrink-0">
 {lesson.completed && (
 <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-brand-500/10 text-brand-400 border border-brand-500/20 rounded-md px-2 py-0.5">
 <CheckCircle2 className="w-3 h-3" /> Done
 </span>
 )}
 <span className={`text-[10px] font-bold border rounded-md px-2 py-0.5 ${DIFFICULTY_COLORS[lesson.difficulty] || DIFFICULTY_COLORS['Intermediate']}`}>
 {lesson.difficulty}
 </span>
 </div>
 </div>

  {/* Behavioral target */}
  <p className="text-sm text-secondary leading-relaxed font-medium mt-1">{lesson.behavioral_diagnosis}</p>

 {/* AI generated reasoning preview */}
 {lesson.generated_reason && (
 <div className="mt-3 bg-secondary border border-subtle rounded-xl p-3 text-xs text-secondary ">
 <span className="font-bold text-white">💡 Context:</span> {lesson.generated_reason}
 </div>
 )}

 <div className="flex items-center justify-between mt-3">
 <ProviderBadge provider={lesson.ai_provider} />
 <span className="text-[10px] text-muted font-medium">
 {new Date(lesson.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
 </span>
 </div>
 </div>

  {/* AI Coaching Block */}
  <div className="p-5 border-b border-subtle bg-secondary">
    <div className="flex items-center gap-1.5 mb-2">
      <Brain className="w-3.5 h-3.5 text-primary" />
      <span className="text-[11px] font-bold uppercase tracking-wider text-primary">Cognitive Coaching</span>
    </div>
    <p className="text-sm text-secondary leading-relaxed italic font-medium">&quot;{lesson.cognitive_coaching_narrative}&quot;</p>
  </div>

 {/* Card Footer */}
 <div className="px-5 py-3 flex items-center justify-between bg-black/20">
 <span className="flex items-center gap-1 text-sm text-brand-400 font-bold hover:text-brand-300 transition-colors">
 View Details <ChevronRight className="w-4 h-4 ml-0.5 animate-pulse" />
 </span>
 {!lesson.completed ? (
 <button
 onClick={handleComplete}
 disabled={completing}
 className="flex items-center gap-1.5 text-sm font-bold text-brand-400 hover:text-brand-300 transition-colors disabled:opacity-50"
 >
 {completing ? (
 <RefreshCw className="w-4 h-4 animate-spin" />
 ) : (
 <CheckCircle2 className="w-4 h-4" />
 )}
 {completing ? 'Saving...' : 'Mark Complete'}
 </button>
 ) : (
 <div className="flex items-center gap-1.5 text-sm font-semibold text-brand-400">
 <Award className="w-4 h-4 text-brand-500" />
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
 <div className="min-h-screen flex items-center justify-center bg-transparent">
 <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
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
      lesson_category: "Curriculum Baseline",
      behavioral_diagnosis: details.behavioral_weakness,
      psychological_interpretation: details.psychology,
      real_world_risk_impact: "Basic safety hazard introduced by improper behavioral response.",
      cognitive_coaching_narrative: details.ai_coaching,
      scenario_replay_analysis: "Standard curriculum module unassociated with a specific session.",
      behavioral_exercises: details.exercises,
      mental_conditioning_techniques: [],
      attention_reinforcement_tasks: [],
      future_risk_projection: "Continued poor habits increase statistical collision probability.",
      personalized_improvement_strategy: details.improvement_goal,
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
 <p className="label-caps mb-1">Behavioral Training Center</p>
 <div className="flex items-start justify-between gap-4 flex-wrap">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-brand-500/10 border border-brand-500/20">
 <BookOpen className="w-5 h-5 text-brand-400" />
 </div>
 <div>
 <h1 className="text-2xl font-bold tracking-tight text-white">Training Modules</h1>
 <p className="text-sm text-muted mt-0.5">AI-personalized to your behavioral profile</p>
 </div>
 </div>

 {/* Stats bar */}
 {aiLessons.length > 0 && (
 <div className="flex items-center gap-4 text-sm">
 <div className="text-center">
 <p className="text-xl font-bold text-white">{aiLessons.length}</p>
 <p className="text-xs text-muted">Total Lessons</p>
 </div>
 <div className="w-px h-8 bg-tertiary" />
 <div className="text-center">
 <p className="text-xl font-bold text-brand-400">{completedAILessons.length}</p>
 <p className="text-xs text-muted">Completed</p>
 </div>
 <div className="w-px h-8 bg-tertiary" />
 <div className="text-center">
 <p className="text-xl font-bold text-primary">{completionRate}%</p>
 <p className="text-xs text-muted">Progress</p>
 </div>
 </div>
 )}
 </div>
 </FadeUp>

 {/* Tabs */}
 <FadeUp delay={0.05} className="mb-6">
 <div className="flex items-center gap-1 bg-secondary p-1 rounded-xl w-fit border border-subtle">
 <button
 onClick={() => setActiveTab('ai')}
 className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
 activeTab === 'ai'
 ? 'bg-purple-500/20 text-primary border border-subtle'
 : 'text-muted hover:text-gray-200 hover:bg-secondary'
 }`}
 >
 <Sparkles className="w-3.5 h-3.5" /> AI Lessons
 </button>
 <button
 onClick={() => setActiveTab('library')}
 className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
 activeTab === 'library'
 ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
 : 'text-muted hover:text-gray-200 hover:bg-secondary'
 }`}
 >
 <BookOpen className="w-3.5 h-3.5" /> Lesson Library
 </button>
 </div>
 </FadeUp>

 {isLoading ? (
 <div className="grid gap-4 md:grid-cols-2">
 {[...Array(4)].map((_, i) => (
 <div key={i} className="h-52 bg-secondary border border-subtle rounded-2xl animate-pulse" />
 ))}
 </div>
 ) : (
 <>
 {/* ── AI LESSONS TAB ──────────────────────────────────────────────── */}
 {activeTab === 'ai' && (
 <div className="space-y-8">
 {/* Generate button */}
 <FadeUp delay={0.1}>
 <div className={`${CARD} p-5 flex items-center justify-between gap-4 bg-secondary border border-subtle`}>
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
 <Sparkles className="w-5 h-5 text-white" />
 </div>
 <div>
 <p className="font-bold text-white">Generate New AI Lesson</p>
 <p className="text-xs text-primary mt-0.5">Based on your latest behavioral data and driver profile</p>
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
 className="flex items-center gap-2 bg-primary hover:bg-purple-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-60 flex-shrink-0 shadow-purple-500/20"
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
                    <div className={`${CARD} p-6 border-subtle bg-primary/5 mb-6`}>
                      <p className="label-caps mb-3 text-primary flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5" /> Behavior Improvement Path
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 md:col-span-2">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-red-400 mb-1 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Session Mistake
                          </p>
                          <p className="text-xs font-semibold text-secondary">
                            {latestSessionSpecificLesson.generated_reason || 'Detected trigger-response anomalies'}
                          </p>
                        </div>
                        <div className="flex justify-center md:rotate-0 rotate-90 md:col-span-1">
                          <ChevronRight className="w-5 h-5 text-primary" />
                        </div>
                        <div className="p-4 rounded-xl bg-secondary border border-subtle md:col-span-2">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1 flex items-center gap-1">
                            <Target className="w-3 h-3" /> Recommended Lesson & Target Goal
                          </p>
                          <p className="text-xs font-bold text-white mb-1">{latestSessionSpecificLesson.title}</p>
                          <p className="text-xs text-primary font-semibold">{latestSessionSpecificLesson.personalized_improvement_strategy}</p>
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
 <Sparkles className="w-4 h-4 text-primary" />
 <h2 className="text-lg font-bold text-white">Generated From Your Last Session</h2>
 <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 rounded-full px-2.5 py-0.5 font-bold uppercase tracking-wider animate-pulse">Correction Required</span>
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
 <Star className="w-4 h-4 text-amber-400" />
 <h2 className="text-lg font-bold text-white">Your Personalized Plan</h2>
 <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full px-2 py-0.5 font-semibold">{otherActiveLessons.length} active</span>
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
 <CheckCircle2 className="w-4 h-4 text-brand-400" />
 <h2 className="text-lg font-bold text-white">Completed</h2>
 <span className="text-xs bg-brand-500/10 text-brand-400 border border-brand-500/20 rounded-full px-2 py-0.5 font-semibold">{completedAILessons.length}</span>
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
 <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4 border border-subtle">
 <Brain className="w-7 h-7 text-primary" />
 </div>
 <h3 className="text-lg font-bold text-white mb-2">No AI lessons yet</h3>
 <p className="text-sm text-muted max-w-sm mx-auto mb-6">
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
 <Star className="w-4 h-4 text-amber-400" />
 <h2 className="text-lg font-bold text-white">Recommended for You</h2>
 </div>
 </FadeUp>

 {lessons.length === 0 ? (
 <FadeUp delay={0.15}>
 <p className="text-muted text-sm bg-secondary border border-subtle rounded-2xl p-6 ">
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
 className={`${CARD} p-6 flex flex-col justify-between h-full group cursor-pointer border-brand-500/20 bg-brand-500/5 hover:-translate-y-0.5 hover: hover:`}
 >
 <div>
 <div className="flex items-start justify-between gap-3 mb-2">
 <h4 className="text-base font-bold text-white group-hover:text-brand-400 transition-colors leading-snug">{lesson.title}</h4>
 <div className="flex gap-1.5 shrink-0">
 {isCompleted && (
 <span className="text-[10px] uppercase font-bold bg-brand-500/10 text-brand-400 px-2 py-1 rounded-md border border-brand-500/20 flex items-center gap-1">
 <CheckCircle2 className="w-2.5 h-2.5" /> Done
 </span>
 )}
 <span className="text-[10px] uppercase font-bold bg-brand-500/10 text-brand-400 px-2 py-1 rounded-md border border-brand-500/20">{lesson.difficulty}</span>
 </div>
 </div>
 <p className="text-sm text-muted leading-relaxed mb-4">{lesson.description}</p>
 </div>
 <div className="flex items-center text-sm font-semibold text-brand-400 group-hover:text-brand-300 transition-colors">
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
 <h2 className="text-lg font-bold text-white mb-4">Browse All Modules</h2>
 </FadeUp>
 <div className="grid gap-5 md:grid-cols-2">
 {allLessons.map((lesson, idx) => {
 const isCompleted = completedStaticIds.includes(lesson.id);
 return (
 <FadeUp key={lesson.id} delay={0.25 + idx * 0.05}>
 <div 
 onClick={() => handleOpenStaticLesson(lesson)}
 className={`${CARD} p-6 flex flex-col justify-between h-full group cursor-pointer hover:-translate-y-0.5 hover:`}
 >
 <div>
 <div className="flex items-start justify-between gap-3 mb-2">
 <h4 className="text-base font-bold text-white group-hover:text-brand-400 transition-colors leading-snug">{lesson.title}</h4>
 <div className="flex gap-1.5 shrink-0">
 {isCompleted && (
 <span className="text-[10px] uppercase font-bold bg-brand-500/10 text-brand-400 px-2 py-1 rounded-md border border-brand-500/20 flex items-center gap-1">
 <CheckCircle2 className="w-2.5 h-2.5" /> Done
 </span>
 )}
 <span className="text-[10px] uppercase font-bold bg-tertiary text-muted px-2 py-1 rounded-md border border-subtle">{lesson.difficulty}</span>
 </div>
 </div>
 <p className="text-sm text-muted leading-relaxed mb-4">{lesson.description}</p>
 </div>
 <div className="flex items-center text-sm font-medium text-muted group-hover:text-brand-400 transition-colors">
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
