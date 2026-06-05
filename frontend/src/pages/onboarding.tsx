import Head from 'next/head';
import { useRouter } from 'next/router';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAppSelector, useAppDispatch } from '@/store';
import { updateProfile } from '@/api/user';
import { loginSuccess } from '@/store/authSlice';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import client from '@/api/client';
import {
 Brain, ChevronRight, Loader2, CheckCircle2, Sparkles,
 Activity, Zap, Shield, Clock, Target, Eye, Navigation, ArrowLeft,
 Bell, Users, AlertTriangle, BarChart2, Lock
} from 'lucide-react';
import ThemeToggle from '@/components/common/ThemeToggle';

// ── Types ─────────────────────────────────────────────────────────────────────

type OnboardingPhase = 'WELCOME' | 'SELF_REPORT' | 'CALIBRATION_INTRO' | 'CALIBRATION' | 'PROCESSING' | 'RESULT';

interface QuestionOption { value: string; text: string; }
interface Question { id: string; text: string; options: QuestionOption[]; }

interface CalibrationScenario {
 id: string; title: string; duration_ms: number;
 ui_type: string; instruction: string;
}

interface CalibrationEventPayload {
 scenario_id: string;
 first_response_ms: number;
 time_to_choice_ms: number;
 interaction_count: number;
 distraction_clicks: number;
 re_read_count: number;
 choice_made: string;
 abandoned: boolean;
 // Scenario-specific
 choice_changed?: boolean;
 followed_audio_authority?: boolean;
 followed_visual_rule?: boolean;
 primary_task_completed?: boolean;
 first_distraction_at_pulse?: number;
 yielded_at_escalation_level?: number;
 avg_response_speed_ms?: number;
 changed_decision_under_pressure?: boolean;
 chose_higher_risk_option?: boolean;
}

interface PersonalityProfileResponse {
 onboarding_profile_label: string;
 impulsiveness_score: number;
 attention_control_score: number;
 authority_compliance_score: number;
 behavioral_impulsiveness: number;
 behavioral_attention: number;
 behavioral_notification_fixation: number;
 behavioral_urgency_susceptibility: number;
 behavioral_authority_compliance: number;
 calibration_completed: boolean;
 calibration_confidence: number;
 overconfidence_index: number;
 mismatch_flags: string[];
}

// ── Profile Display Config ────────────────────────────────────────────────────

const PROFILE_DISPLAYS: Record<string, { label: string; gradient: string; description: string; icon: any; accent: string }> = {
 impulsive: {
 label: 'Impulse-Driven',
 gradient: ' text-secondary',
 accent: '#ef4444',
 description: 'Your behavioral patterns show rapid first responses with limited deliberation under pressure. Time constraints amplify this tendency significantly.',
 icon: Zap,
 },
 notification_distracted: {
 label: 'Notification-Anchored',
 gradient: ' text-secondary',
 accent: '#f59e0b',
 description: 'Behavioral signals indicate strong pull toward notification stimuli. Your attention shifts rapidly toward incoming information even during focused tasks.',
 icon: Bell,
 },
 distracted: {
 label: 'Attention Fragmenter',
 gradient: ' text-secondary',
 accent: '#eab308',
 description: 'Attention distributes across multiple competing inputs. Focus maintenance under simultaneous cognitive demands shows measurable degradation.',
 icon: Activity,
 },
 hesitant: {
 label: 'Pressure-Hesitant',
 gradient: ' text-secondary',
 accent: '#3b82f6',
 description: 'Calibration shows extended decision windows under authority pressure. You process carefully but delay commitment when social obligations conflict.',
 icon: Clock,
 },
 risk_seeking: {
 label: 'Risk-Oriented',
 gradient: ' text-secondary',
 accent: '#8b5cf6',
 description: 'Behavioral patterns indicate high tolerance for ambiguous outcomes. Instinct-based decisions under uncertainty are your dominant response mode.',
 icon: Target,
 },
 cautious: {
 label: 'Calibrated Controller',
 gradient: ' text-secondary',
 accent: '#10b981',
 description: 'Behavioral signals show consistent deliberation, low distraction susceptibility, and strong rule-following under social pressure.',
 icon: Shield,
 },
 emotionally_reactive: {
 label: 'Urgency-Reactive',
 gradient: ' text-secondary',
 accent: '#f43f5e',
 description: 'Behavioral evidence shows high urgency amplification. Social and time pressure cues significantly accelerate decision-making, sometimes prematurely.',
 icon: Brain,
 },
 authority_driven: {
 label: 'Authority-Compliant',
 gradient: ' text-secondary',
 accent: '#6366f1',
 description: 'Calibration shows consistent compliance with authority signals. Requests from person-like sources override independent judgment under pressure.',
 icon: Users,
 },
 balanced: {
 label: 'Adaptive Processor',
 gradient: ' text-secondary',
 accent: '#94a3b8',
 description: 'Behavioral signals show situational adaptability across pressure conditions. No single dominant vulnerability pattern detected.',
 icon: Brain,
 },
 unknown: {
 label: 'Calibrating...',
 gradient: ' text-secondary',
 accent: '#6b7280',
 description: 'Profile is being analyzed.',
 icon: Brain,
 },
};



// ── Welcome Phase ─────────────────────────────────────────────────────────────

function WelcomePhase({ onBegin }: { onBegin: () => void }) {
 return (
 <motion.div
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
 className="text-center space-y-8"
 >
 {/* Ambient orb */}
 <div className="relative mx-auto w-28 h-28">
 <div className="absolute inset-0 rounded-full blur-2xl opacity-10 bg-primary" />
 <div className="relative w-28 h-28 rounded-full flex items-center justify-center bg-secondary border border-subtle">
 <Brain className="w-14 h-14 text-on-primary" />
 </div>
 {/* Orbiting dots */}
 {[0, 1, 2].map(i => (
 <motion.div key={i} className="absolute w-2.5 h-2.5 rounded-full bg-violet-400"
 style={{ top: '50%', left: '50%', originX: 0, originY: 0 }}
 animate={{ rotate: [i * 120, i * 120 + 360] }}
 transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: 'linear' }}
 >
 <div className="w-2.5 h-2.5 rounded-full bg-violet-400"
 style={{ transform: `translateX(62px) translateY(-5px)` }} />
 </motion.div>
 ))}
 </div>

 <div>
 <motion.p
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 transition={{ delay: 0.3 }}
 className="text-xs font-bold uppercase tracking-[0.25em] mb-3"
 style={{ color: '#818cf8' }}
 >
 System Initialization
 </motion.p>
 <motion.h1
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.4, duration: 0.6 }}
 className="text-4xl font-extrabold text-primary tracking-tight leading-tight mb-4"
 >
 Behavioral<br />Calibration
 </motion.h1>
 <motion.p
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 transition={{ delay: 0.6 }}
 className="text-secondary text-sm leading-relaxed max-w-sm mx-auto"
 >
 Before your adaptive training begins, the system needs to calibrate your
 cognitive response patterns. This takes about 4–5 minutes.
 </motion.p>
 </div>

 {/* Feature pills */}
 <motion.div
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.8 }}
 className="flex flex-wrap gap-2 justify-center"
 >
 {[
 { icon: Zap, label: 'Response Analysis' },
 { icon: Eye, label: 'Pattern Detection' },
 { icon: BarChart2, label: 'Adaptive Profile' },
 { icon: Lock, label: 'Private & Secure' },
 ].map(({ icon: Icon, label }) => (
 <div key={label}
 className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-secondary border border-subtle"
 style={{ background: 'var(--bg-subtle)' }}
 >
 <Icon className="w-3 h-3" />
 {label}
 </div>
 ))}
 </motion.div>

 <motion.button
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 1.0 }}
 onClick={onBegin}
 className="w-full py-4 rounded-2xl font-bold text-on-primary text-base flex items-center justify-center gap-2.5 bg-secondary border border-subtle"
 whileHover={{ scale: 1.01 }}
 whileTap={{ scale: 0.98 }}
 >
 Begin Calibration <ChevronRight className="w-5 h-5" />
 </motion.button>

 <p className="text-center text-xs text-muted">
 Your behavioral data is used only to personalize your training experience.
 </p>
 </motion.div>
 );
}

// ── Self-Report Phase ─────────────────────────────────────────────────────────

function SelfReportPhase({
 questions,
 onComplete,
}: {
 questions: Question[];
 onComplete: (answers: { question_id: string; answer_value: string }[]) => void;
}) {
 const [currentStep, setCurrentStep] = useState(0);
 const [answers, setAnswers] = useState<{ question_id: string; answer_value: string }[]>([]);
 const [selectedOption, setSelectedOption] = useState<string | null>(null);
 const [stepStartTime, setStepStartTime] = useState(Date.now());

 const totalSteps = questions.length;
 const progress = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0;

 const handleAnswer = async (questionId: string, value: string) => {
 if (selectedOption) return;
 setSelectedOption(value);
 await new Promise(res => setTimeout(res, 250));

 const newAnswers = [...answers, { question_id: questionId, answer_value: value }];
 setAnswers(newAnswers);
 setSelectedOption(null);

 if (currentStep < totalSteps - 1) {
 setCurrentStep(s => s + 1);
 setStepStartTime(Date.now());
 } else {
 onComplete(newAnswers);
 }
 };

 const q = questions[currentStep];
 if (!q) return null;

 return (
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 className="space-y-5"
 >
 {/* Header */}
 <div className="text-center mb-2">
 <p className="text-xs font-bold uppercase tracking-widest text-violet-400 mb-1">
 Context Setup — {currentStep + 1} of {totalSteps}
 </p>
 <div className="h-0.5 bg-secondary rounded-full overflow-hidden">
 <motion.div
 className="h-full rounded-full bg-secondary border border-subtle"
 animate={{ width: `${progress}%` }}
 transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
 />
 </div>
 </div>

 {/* Question Card */}
 <AnimatePresence mode="wait">
 <motion.div
 key={currentStep}
 initial={{ opacity: 0, x: 24 }}
 animate={{ opacity: 1, x: 0 }}
 exit={{ opacity: 0, x: -24 }}
 transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
 >
 <div className="rounded-3xl border border-subtle p-7 mb-4"
 style={{ background: 'var(--bg-surface)' }}>
 {/* No dimension label shown — by design */}
 <h2 className="text-xl font-bold text-primary leading-relaxed mb-7">
 {q.text}
 </h2>
 <div className="space-y-3">
 {q.options.map((option, idx) => {
 const isSelected = selectedOption === option.value;
 return (
 <motion.button
 key={option.value}
 onClick={() => handleAnswer(q.id, option.value)}
 className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 flex items-center gap-4 group ${
 isSelected
 ? 'border-violet-500/60'
 : 'border-subtle hover:border-subtle-hover'
 }`}
 style={{
 background: isSelected
 ? 'rgba(109,40,217,0.15)'
 : 'var(--bg-subtle)',
 }}
 whileHover={{ x: 3 }}
 whileTap={{ scale: 0.98 }}
 >
 <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 transition-colors ${
 isSelected
 ? 'bg-violet-600 text-on-primary'
 : 'bg-tertiary2 text-muted group-hover:bg-tertiary2 group-hover:text-secondary'
 }`}>
 {isSelected ? <CheckCircle2 className="w-4 h-4" /> : String.fromCharCode(65 + idx)}
 </div>
 <span className={`text-sm leading-relaxed font-medium flex-1 transition-colors ${
 isSelected ? 'text-primary' : 'text-secondary group-hover:text-primary'
 }`}>
 {option.text}
 </span>
 <ChevronRight className={`w-4 h-4 flex-shrink-0 transition-all ${
 isSelected ? 'text-violet-400 translate-x-1' : 'text-muted group-hover:translate-x-1'
 }`} />
 </motion.button>
 );
 })}
 </div>
 </div>
 <p className="text-center text-xs text-muted">
 Choose the response that most accurately reflects how you typically behave.
 </p>
 </motion.div>
 </AnimatePresence>
 </motion.div>
 );
}

// ── Calibration Intro Phase ───────────────────────────────────────────────────

function CalibrationIntroPhase({ onBegin }: { onBegin: () => void }) {
 return (
 <motion.div
 initial={{ opacity: 0, scale: 0.97 }}
 animate={{ opacity: 1, scale: 1 }}
 transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
 className="space-y-6 text-center"
 >
 <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center bg-secondary border border-subtle">
 <Activity className="w-8 h-8 text-on-primary" />
 </div>
 <div>
 <p className="text-xs font-bold uppercase tracking-widest text-cyan-400 mb-2">Phase 2 of 2</p>
 <h2 className="text-2xl font-extrabold text-primary mb-3 tracking-tight">System Calibration</h2>
 <p className="text-secondary text-sm leading-relaxed max-w-sm mx-auto">
 You&apos;ll now interact with a series of short calibration environments.
 Each takes 15–40 seconds. Follow the on-screen instructions naturally.
 </p>
 </div>
 <div className="rounded-2xl border border-subtle p-4 text-left"
 style={{ background: 'var(--bg-subtle)' }}>
 <p className="text-xs font-bold uppercase tracking-widest text-cyan-500 mb-3">What to expect</p>
 <ul className="space-y-2">
 {[
 'Short interactive environments (15–40 seconds each)',
 'Follow on-screen instructions as you naturally would',
 'Some screens will have multiple elements — just respond normally',
 'There are no "correct" or "incorrect" responses',
 ].map(item => (
 <li key={item} className="flex items-start gap-2 text-xs text-secondary">
 <div className="w-1 h-1 rounded-full bg-cyan-500 mt-1.5 flex-shrink-0" />
 {item}
 </li>
 ))}
 </ul>
 </div>
 <motion.button
 onClick={onBegin}
 className="w-full py-4 rounded-2xl font-bold text-on-primary text-base flex items-center justify-center gap-2.5 bg-secondary border border-subtle"
 whileHover={{ scale: 1.01 }}
 whileTap={{ scale: 0.98 }}
 >
 Start Calibration <ChevronRight className="w-5 h-5" />
 </motion.button>
 </motion.div>
 );
}

// ── Behavioral Scenario Renderer ──────────────────────────────────────────────

function ScenarioRenderer({
 scenario,
 onComplete,
}: {
 scenario: CalibrationScenario;
 onComplete: (payload: CalibrationEventPayload) => void;
}) {
 const Component = SCENARIO_COMPONENTS[scenario.ui_type] || FallbackScenario;
 return (
 <Component
 scenarioId={scenario.id}
 title={scenario.title}
 instruction={scenario.instruction}
 durationMs={scenario.duration_ms}
 onComplete={onComplete}
 />
 );
}

interface ScenarioProps {
 scenarioId: string;
 title: string;
 instruction: string;
 durationMs: number;
 onComplete: (payload: CalibrationEventPayload) => void;
}

// ── S1: Navigation Interrupt ──────────────────────────────────────────────────

function NavigationSimScenario({ scenarioId, title, instruction, durationMs, onComplete }: ScenarioProps) {
 const startTime = useRef(Date.now());
 const firstResponseTime = useRef<number | null>(null);
 const distractionClicks = useRef(0);
 const interactionCount = useRef(0);

 const [notifVisible, setNotifVisible] = useState(false);
 const [notifDismissed, setNotifDismissed] = useState(false);
 const [routeConfirmed, setRouteConfirmed] = useState(false);

 useEffect(() => {
 const timer = setTimeout(() => setNotifVisible(true), 2500);
 return () => clearTimeout(timer);
 }, []);

 const handleNotifClick = () => {
 if (notifDismissed || routeConfirmed) return;
 interactionCount.current++;
 distractionClicks.current++;
 if (!firstResponseTime.current) firstResponseTime.current = Date.now() - startTime.current;
 setNotifDismissed(true);
 };

 const handleConfirmRoute = () => {
 if (routeConfirmed) return;
 interactionCount.current++;
 if (!firstResponseTime.current) firstResponseTime.current = Date.now() - startTime.current;
 setRouteConfirmed(true);
 setTimeout(() => {
 onComplete({
 scenario_id: scenarioId,
 first_response_ms: firstResponseTime.current ?? durationMs,
 time_to_choice_ms: Date.now() - startTime.current,
 interaction_count: interactionCount.current,
 distraction_clicks: distractionClicks.current,
 re_read_count: 0,
 choice_made: 'route_confirmed',
 abandoned: false,
 });
 }, 500);
 };

 return (
 <ScenarioShell title={title} instruction={instruction} scenarioId={scenarioId}>
 {/* Navigation UI */}
 <div className="rounded-2xl overflow-hidden border border-subtle"
 style={{ background: 'var(--bg-surface)', minHeight: 220 }}>
 {/* Map area */}
 <div className="relative p-4" style={{ minHeight: 160 }}>
 {/* Simulated road lines */}
 <div className="absolute inset-0 flex items-center justify-center opacity-20">
 <svg width="100%" height="100%" viewBox="0 0 300 160">
 <path d="M 150 160 L 150 80 L 200 40 L 260 40" stroke="#3b82f6" strokeWidth="3" fill="none" strokeDasharray="8,4" />
 <circle cx="200" cy="40" r="6" fill="#22c55e" />
 <circle cx="150" cy="140" r="8" fill="#3b82f6" />
 </svg>
 </div>
 {/* Route info */}
 <div className="relative z-10">
 <p className="text-xs text-muted mb-1">DESTINATION</p>
 <p className="text-sm font-bold text-primary">City Center — 2.3 km</p>
 <div className="mt-2 flex gap-2">
 <span className="text-xs text-emerald-400 font-medium">↑ Continue straight 400m</span>
 </div>
 </div>

 {/* Notification popup */}
 <AnimatePresence>
 {notifVisible && !notifDismissed && (
 <motion.button
 initial={{ opacity: 0, y: -10, scale: 0.95 }}
 animate={{ opacity: 1, y: 0, scale: 1 }}
 exit={{ opacity: 0, scale: 0.95 }}
 onClick={handleNotifClick}
 className="absolute top-2 right-2 rounded-xl border border-amber-500/40 p-2.5 text-left"
 style={{ background: 'rgba(245,158,11,0.15)', backdropFilter: 'blur(8px)', maxWidth: 160 }}
 >
 <div className="flex items-center gap-1.5 mb-0.5">
 <Bell className="w-3 h-3 text-amber-400" />
 <span className="text-[10px] font-bold text-amber-400">New Message</span>
 </div>
 <p className="text-[10px] text-secondary">Rahul: &quot;Are you close?&quot;</p>
 </motion.button>
 )}
 </AnimatePresence>
 </div>

 {/* Action bar */}
 <div className="border-t border-subtle p-3 flex gap-2">
 <motion.button
 onClick={handleConfirmRoute}
 disabled={routeConfirmed}
 className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
 routeConfirmed ? 'bg-emerald-600/40 text-emerald-400' : 'bg-secondary border border-subtle text-on-primary'
 }`}
 whileTap={{ scale: 0.97 }}
 >
 {routeConfirmed ? <span className="flex items-center justify-center gap-1.5"><CheckCircle2 className="w-4 h-4" />Route Confirmed</span> : 'Confirm Route'}
 </motion.button>
 </div>
 </div>
 </ScenarioShell>
 );
}

// ── S2: Countdown Clock ────────────────────────────────────────────────────────

function CountdownChoiceScenario({ scenarioId, title, instruction, durationMs, onComplete }: ScenarioProps) {
 const startTime = useRef(Date.now());
 const [timeLeft, setTimeLeft] = useState(Math.floor(durationMs / 1000));
 const [chosen, setChosen] = useState<string | null>(null);
 const [firstChoice, setFirstChoice] = useState<string | null>(null);

 const chosenRef = useRef(chosen);
 chosenRef.current = chosen;

 useEffect(() => {
 const interval = setInterval(() => {
 setTimeLeft(t => {
 if (t <= 1) {
 clearInterval(interval);
 if (!chosenRef.current) {
 onComplete({
 scenario_id: scenarioId,
 first_response_ms: durationMs,
 time_to_choice_ms: durationMs,
 interaction_count: 0,
 distraction_clicks: 0,
 re_read_count: 0,
 choice_made: 'timeout',
 abandoned: true,
 });
 }
 return 0;
 }
 return t - 1;
 });
 }, 1000);
 return () => clearInterval(interval);
 }, [durationMs, onComplete, scenarioId]);

 const handleChoice = (val: string, isRisk: boolean) => {
 if (chosen) {
 setChosen(val);
 return;
 }
 const elapsed = Date.now() - startTime.current;
 const isChanged = firstChoice !== null && firstChoice !== val;
 setChosen(val);
 if (!firstChoice) setFirstChoice(val);

 setTimeout(() => {
 onComplete({
 scenario_id: scenarioId,
 first_response_ms: elapsed,
 time_to_choice_ms: elapsed,
 interaction_count: isChanged ? 2 : 1,
 distraction_clicks: 0,
 re_read_count: 0,
 choice_made: val,
 abandoned: false,
 choice_changed: isChanged,
 chose_higher_risk_option: isRisk,
 });
 }, 500);
 };

 const urgencyColor = timeLeft <= 4 ? '#ef4444' : timeLeft <= 8 ? '#f59e0b' : '#60a5fa';
 const total = Math.floor(durationMs / 1000);
 const pct = (timeLeft / total) * 100;

 return (
 <ScenarioShell title={title} instruction={instruction} scenarioId={scenarioId}>
 {/* Timer */}
 <div className="mb-5">
 <div className="flex items-center justify-between mb-2">
 <span className="text-xs text-muted font-medium">Time remaining</span>
 <motion.span
 className="text-2xl font-black tabular-nums"
 style={{ color: urgencyColor }}
 animate={{ scale: timeLeft <= 4 ? [1, 1.1, 1] : 1 }}
 transition={{ duration: 0.3, repeat: timeLeft <= 4 ? Infinity : 0 }}
 >
 {timeLeft}s
 </motion.span>
 </div>
 <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-subtle)' }}>
 <motion.div
 className="h-full rounded-full transition-all"
 style={{ width: `${pct}%`, background: urgencyColor }}
 />
 </div>
 </div>

 {/* Decision */}
 <div className="rounded-2xl border border-subtle p-5 mb-4"
 style={{ background: 'var(--bg-surface)' }}>
 <p className="text-sm font-bold text-primary mb-4 leading-relaxed">
 A delivery route offers two options. Select the one that seems most appropriate:
 </p>
 <div className="space-y-3">
 {[
 { val: 'A', label: 'Standard route — 18 min, familiar roads', isRisk: false },
 { val: 'B', label: 'Alternate route — 12 min, unfamiliar area', isRisk: true },
 ].map(opt => (
 <motion.button
 key={opt.val}
 onClick={() => handleChoice(opt.val, opt.isRisk)}
 disabled={!!chosen}
 className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center gap-3 ${
 chosen === opt.val
 ? 'border-violet-500/60'
 : 'border-subtle hover:border-subtle-hover'
 }`}
 style={{ background: chosen === opt.val ? 'rgba(109,40,217,0.15)' : 'var(--bg-subtle)' }}
 whileTap={{ scale: 0.98 }}
 >
 <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0 ${
 chosen === opt.val ? 'bg-violet-600 text-on-primary' : 'bg-tertiary2 text-secondary'
 }`}>
 {chosen === opt.val ? <CheckCircle2 className="w-4 h-4" /> : opt.val}
 </div>
 <span className="text-sm text-secondary leading-snug">{opt.label}</span>
 </motion.button>
 ))}
 </div>
 </div>
 </ScenarioShell>
 );
}

// ── S3: Conflicting Authority ──────────────────────────────────────────────────

function ConflictResolutionScenario({ scenarioId, title, instruction, durationMs, onComplete }: ScenarioProps) {
 const startTime = useRef(Date.now());
 const interactions = useRef(0);
 const [showConflict, setShowConflict] = useState(false);
 const [chosen, setChosen] = useState<string | null>(null);

 useEffect(() => {
 setTimeout(() => setShowConflict(true), 3000);
 }, []);

 const handleChoice = (choice: 'audio' | 'visual') => {
 if (chosen) return;
 interactions.current++;
 setChosen(choice);
 const elapsed = Date.now() - startTime.current;
 setTimeout(() => {
 onComplete({
 scenario_id: scenarioId,
 first_response_ms: elapsed,
 time_to_choice_ms: elapsed,
 interaction_count: interactions.current,
 distraction_clicks: 0,
 re_read_count: 0,
 choice_made: choice,
 abandoned: false,
 followed_audio_authority: choice === 'audio',
 followed_visual_rule: choice === 'visual',
 });
 }, 600);
 };

 return (
 <ScenarioShell title={title} instruction={instruction} scenarioId={scenarioId}>
 <div className="space-y-4">
 {/* System rule card */}
 <div className="rounded-2xl border border-subtle p-4"
 style={{ background: 'var(--bg-surface)' }}>
 <div className="flex items-center gap-2 mb-3">
 <Shield className="w-4 h-4 text-blue-400" />
 <span className="text-xs font-bold uppercase tracking-widest text-blue-400">System Protocol</span>
 </div>
 <p className="text-sm text-secondary leading-relaxed">
 Standard procedure: <strong className="text-primary">submit final report by end of day</strong> before any additional tasks.
 </p>
 </div>

 {/* Conflict from audio authority */}
 <AnimatePresence>
 {showConflict && (
 <motion.div
 initial={{ opacity: 0, y: 8 }}
 animate={{ opacity: 1, y: 0 }}
 className="rounded-2xl border border-amber-500/30 p-4"
 style={{ background: 'rgba(245,158,11,0.08)' }}
 >
 <div className="flex items-center gap-2 mb-3">
 <Users className="w-4 h-4 text-amber-400" />
 <span className="text-xs font-bold uppercase tracking-widest text-amber-400">Manager Request</span>
 <span className="ml-auto text-[10px] text-amber-500 font-bold">URGENT</span>
 </div>
 <p className="text-sm text-secondary leading-relaxed mb-4">
 &quot;Can you help me with the client presentation first? It&apos;s more important right now — the report can wait.&quot;
 </p>

 {!chosen && (
 <div className="flex gap-2">
 <motion.button
 onClick={() => handleChoice('audio')}
 className="flex-1 py-2.5 rounded-xl text-xs font-bold text-on-primary"
 style={{ background: 'rgba(245,158,11,0.25)', border: '1px solid rgba(245,158,11,0.4)' }}
 whileTap={{ scale: 0.97 }}
 >
 Help with presentation
 </motion.button>
 <motion.button
 onClick={() => handleChoice('visual')}
 className="flex-1 py-2.5 rounded-xl text-xs font-bold text-on-primary"
 style={{ background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.35)' }}
 whileTap={{ scale: 0.97 }}
 >
 Complete report first
 </motion.button>
 </div>
 )}

 {chosen && (
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 className="flex items-center gap-2 text-sm text-emerald-400 font-medium"
 >
 <CheckCircle2 className="w-4 h-4" />
 Response recorded
 </motion.div>
 )}
 </motion.div>
 )}
 </AnimatePresence>

 {!showConflict && (
 <div className="text-center py-4">
 <Loader2 className="w-5 h-5 text-muted animate-spin mx-auto mb-2" />
 <p className="text-xs text-muted">Loading situation...</p>
 </div>
 )}
 </div>
 </ScenarioShell>
 );
}

// ── S4: Notification Temptation ────────────────────────────────────────────────

function DualTaskScenario({ scenarioId, title, instruction, durationMs, onComplete }: ScenarioProps) {
 const startTime = useRef(Date.now());
 const distractionClicks = useRef(0);
 const firstDistPulse = useRef(4);
 const [pulse, setPulse] = useState(0);
 const [taskProgress, setTaskProgress] = useState(0);
 const [taskDone, setTaskDone] = useState(false);
 const taskItems = ['Review document', 'Flag anomalies', 'Submit summary'];
 const [checked, setChecked] = useState<boolean[]>([false, false, false]);

 useEffect(() => {
 // Notification pulses at 5s, 12s, 20s
 const pulseTimers = [
 setTimeout(() => setPulse(1), 5000),
 setTimeout(() => setPulse(2), 12000),
 setTimeout(() => setPulse(3), 20000),
 setTimeout(() => setPulse(0), 23000),
 ];
 return () => pulseTimers.forEach(clearTimeout);
 }, []);

 const handleNotifClick = () => {
 distractionClicks.current++;
 if (firstDistPulse.current === 4) firstDistPulse.current = pulse;
 };

 const handleTaskCheck = (idx: number) => {
 const next = [...checked];
 next[idx] = !next[idx];
 setChecked(next);
 const doneCount = next.filter(Boolean).length;
 setTaskProgress(doneCount / taskItems.length);
 if (doneCount === taskItems.length) {
 setTaskDone(true);
 setTimeout(() => {
 onComplete({
 scenario_id: scenarioId,
 first_response_ms: Date.now() - startTime.current,
 time_to_choice_ms: Date.now() - startTime.current,
 interaction_count: next.filter(Boolean).length + distractionClicks.current,
 distraction_clicks: distractionClicks.current,
 re_read_count: 0,
 choice_made: 'task_completed',
 abandoned: false,
 primary_task_completed: true,
 first_distraction_at_pulse: firstDistPulse.current,
 });
 }, 600);
 }
 };

 return (
 <ScenarioShell title={title} instruction={instruction} scenarioId={scenarioId}>
 <div className="space-y-3">
 {/* Primary task */}
 <div className="rounded-2xl border border-subtle p-4"
 style={{ background: 'var(--bg-surface)' }}>
 <div className="flex items-center justify-between mb-3">
 <p className="text-xs font-bold uppercase tracking-widest text-secondary">Task Queue</p>
 <span className="text-xs text-emerald-400 font-bold">{Math.round(taskProgress * 100)}%</span>
 </div>
 <div className="h-1 bg-secondary rounded-full mb-4 overflow-hidden">
 <motion.div
 className="h-full rounded-full bg-emerald-500"
 animate={{ width: `${taskProgress * 100}%` }}
 transition={{ duration: 0.3 }}
 />
 </div>
 <div className="space-y-2">
 {taskItems.map((item, idx) => (
 <motion.button
 key={item}
 onClick={() => handleTaskCheck(idx)}
 disabled={taskDone}
 className={`w-full text-left p-3 rounded-xl border flex items-center gap-3 transition-all ${
 checked[idx] ? 'border-emerald-500/40' : 'border-subtle hover:border-subtle-hover'
 }`}
 style={{ background: checked[idx] ? 'rgba(16,185,129,0.1)' : 'var(--bg-subtle)' }}
 whileTap={{ scale: 0.98 }}
 >
 <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${
 checked[idx] ? 'bg-emerald-500 border-emerald-500' : 'border-secondary'
 }`}>
 {checked[idx] && <CheckCircle2 className="w-3.5 h-3.5 text-on-primary" />}
 </div>
 <span className={`text-sm ${checked[idx] ? 'text-muted line-through' : 'text-secondary'}`}>{item}</span>
 </motion.button>
 ))}
 </div>
 </div>

 {/* Notification badge */}
 <AnimatePresence>
 {pulse > 0 && (
 <motion.button
 key={pulse}
 initial={{ opacity: 0, scale: 0.9, x: 10 }}
 animate={{ opacity: 1, scale: 1, x: 0 }}
 exit={{ opacity: 0, scale: 0.9 }}
 onClick={handleNotifClick}
 className="w-full rounded-2xl border border-violet-500/30 p-3 text-left"
 style={{ background: 'rgba(109,40,217,0.12)' }}
 >
 <div className="flex items-center gap-2">
 <div className="relative">
 <Bell className="w-4 h-4 text-violet-400" />
 <motion.div
 className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500"
 animate={{ scale: [1, 1.4, 1] }}
 transition={{ duration: 0.6, repeat: Infinity }}
 />
 </div>
 <span className="text-xs font-bold text-violet-400">
 {pulse === 1 ? 'New message from Priya' : pulse === 2 ? 'Team update available' : 'Reminder: meeting in 5 min'}
 </span>
 </div>
 </motion.button>
 )}
 </AnimatePresence>
 </div>
 </ScenarioShell>
 );
}

// ── S5: Passenger Urgency ──────────────────────────────────────────────────────

function SocialPressureScenario({ scenarioId, title, instruction, durationMs, onComplete }: ScenarioProps) {
 const startTime = useRef(Date.now());
 const responseTimes = useRef<number[]>([]);
 const [escalation, setEscalation] = useState(0);
 const [yieldLevel, setYieldLevel] = useState(0);
 const [changedDecision, setChangedDecision] = useState(false);
 const [initialDecision, setInitialDecision] = useState<string | null>(null);
 const [done, setDone] = useState(false);

 const messages = [
 { level: 0, text: "Hey, can you check something for me quickly?" },
 { level: 1, text: "It'll only take a second, it's kind of important." },
 { level: 2, text: "Come on, I really need this right now — please?" },
 { level: 3, text: "You HAVE to check this. It's an emergency. Now!" },
 ];

 useEffect(() => {
 const timers = [
 setTimeout(() => setEscalation(1), 5000),
 setTimeout(() => setEscalation(2), 13000),
 setTimeout(() => setEscalation(3), 22000),
 ];
 return () => timers.forEach(clearTimeout);
 }, []);

 const handleResponse = (yielded: boolean) => {
 if (done) return;
 const elapsed = Date.now() - startTime.current;
 responseTimes.current.push(elapsed);
 const choice = yielded ? 'yield' : 'resist';

 if (initialDecision === null) {
 setInitialDecision(choice);
 } else if (initialDecision !== choice) {
 setChangedDecision(true);
 }

 if (yielded) setYieldLevel(escalation);

 if (escalation === 3 || (yielded && escalation >= 2)) {
 setDone(true);
 const avgSpeed = responseTimes.current.reduce((a, b) => a + b, 0) / responseTimes.current.length;
 setTimeout(() => {
 onComplete({
 scenario_id: scenarioId,
 first_response_ms: responseTimes.current[0] ?? elapsed,
 time_to_choice_ms: elapsed,
 interaction_count: responseTimes.current.length,
 distraction_clicks: 0,
 re_read_count: 0,
 choice_made: choice,
 abandoned: false,
 yielded_at_escalation_level: yielded ? escalation : 0,
 avg_response_speed_ms: Math.round(avgSpeed),
 changed_decision_under_pressure: changedDecision,
 });
 }, 700);
 }
 };

 const currentMsg = messages[Math.min(escalation, 3)];

 return (
 <ScenarioShell title={title} instruction={instruction} scenarioId={scenarioId}>
 <div className="space-y-3">
 {/* Message thread */}
 <div className="rounded-2xl border border-subtle p-4 space-y-3 card-glass"
 style={{ minHeight: 120 }}>
 <AnimatePresence>
 {messages.slice(0, escalation + 1).map((msg, idx) => (
 <motion.div
 key={idx}
 initial={{ opacity: 0, y: 8 }}
 animate={{ opacity: 1, y: 0 }}
 className="flex items-start gap-2"
 >
 <div className="w-7 h-7 rounded-full bg-tertiary flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary">
 P
 </div>
 <div className="rounded-2xl rounded-tl-none px-3 py-2 text-sm max-w-xs"
 style={{
 background: idx === escalation
 ? `rgba(${escalation === 3 ? '239,68,68' : '109,40,217'},0.15)`
 : 'var(--bg-subtle)',
 border: idx === escalation
 ? `1px solid rgba(${escalation === 3 ? '239,68,68' : '109,40,217'},0.3)`
 : '1px solid var(--border-subtle)',
 color: idx === escalation ? 'var(--text-primary)' : 'var(--text-secondary)',
 }}
 >
 {msg.text}
 </div>
 </motion.div>
 ))}
 </AnimatePresence>
 </div>

 {/* Response buttons */}
 {!done && (
 <div className="flex gap-2">
 <motion.button
 onClick={() => handleResponse(true)}
 className="flex-1 py-2.5 rounded-xl text-xs font-bold text-primary border border-violet-500/40"
 style={{ background: 'rgba(109,40,217,0.2)' }}
 whileTap={{ scale: 0.97 }}
 >
 Respond to request
 </motion.button>
 <motion.button
 onClick={() => handleResponse(false)}
 className="flex-1 py-2.5 rounded-xl text-xs font-bold text-secondary border border-subtle"
 style={{ background: 'var(--bg-subtle)' }}
 whileTap={{ scale: 0.97 }}
 >
 Stay focused
 </motion.button>
 </div>
 )}
 {done && (
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 className="flex items-center justify-center gap-2 py-3 text-emerald-400 text-sm font-bold"
 >
 <CheckCircle2 className="w-4 h-4" />
 Response pattern recorded
 </motion.div>
 )}
 </div>
 </ScenarioShell>
 );
}

// ── S6: Ambiguous Tradeoff ─────────────────────────────────────────────────────

function TradeoffChoiceScenario({ scenarioId, title, instruction, durationMs, onComplete }: ScenarioProps) {
 const startTime = useRef(Date.now());
 const reReads = useRef(0);
 const [hoveredOption, setHoveredOption] = useState<string | null>(null);
 const [chosen, setChosen] = useState<string | null>(null);
 const [firstChoice, setFirstChoice] = useState<string | null>(null);

 const handleOptionHover = (val: string) => {
 if (!chosen) {
 setHoveredOption(val);
 reReads.current++;
 }
 };

 const handleChoice = (val: string, isRisk: boolean) => {
 const elapsed = Date.now() - startTime.current;
 const changed = firstChoice !== null && firstChoice !== val;
 if (!firstChoice) setFirstChoice(val);
 setChosen(val);

 setTimeout(() => {
 onComplete({
 scenario_id: scenarioId,
 first_response_ms: elapsed,
 time_to_choice_ms: elapsed,
 interaction_count: reReads.current + 1,
 distraction_clicks: 0,
 re_read_count: Math.floor(reReads.current / 2),
 choice_made: val,
 abandoned: false,
 choice_changed: changed,
 chose_higher_risk_option: isRisk,
 });
 }, 500);
 };

 return (
 <ScenarioShell title={title} instruction={instruction} scenarioId={scenarioId}>
 <div className="rounded-2xl border border-subtle p-5 card-glass">
 <p className="text-sm font-bold text-primary mb-1 leading-relaxed">
 A system requires an allocation decision.
 </p>
 <p className="text-xs text-muted mb-5">Choose the option that seems most appropriate.</p>
 <div className="space-y-3">
 {[
 {
 val: 'A', label: 'Allocate to existing process',
 desc: 'Maintains current stability with moderate throughput. Established, proven method.',
 isRisk: false,
 },
 {
 val: 'B', label: 'Allocate to new protocol',
 desc: 'Higher potential output but introduces some uncertainty. Less validated in this context.',
 isRisk: true,
 },
 ].map(opt => (
 <motion.button
 key={opt.val}
 onClick={() => handleChoice(opt.val, opt.isRisk)}
 onMouseEnter={() => handleOptionHover(opt.val)}
 disabled={!!chosen}
 className={`w-full text-left p-4 rounded-xl border transition-all ${
 chosen === opt.val
 ? 'border-violet-500/60'
 : hoveredOption === opt.val && !chosen
 ? 'border-subtle'
 : 'border-subtle'
 }`}
 style={{
 background: chosen === opt.val
 ? 'var(--color-primary-container)'
 : hoveredOption === opt.val && !chosen
 ? 'var(--bg-secondary)'
 : 'var(--bg-card)',
 }}
 whileTap={{ scale: 0.98 }}
 >
 <div className="flex items-start gap-3">
 <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0 ${
 chosen === opt.val ? 'bg-violet-600 text-primary' : 'bg-tertiary text-muted'
 }`}>
 {chosen === opt.val ? <CheckCircle2 className="w-4 h-4" /> : opt.val}
 </div>
 <div>
 <p className={`text-sm font-bold mb-1 ${chosen === opt.val ? 'text-primary' : 'text-secondary'}`}>{opt.label}</p>
 <p className="text-xs text-muted leading-relaxed">{opt.desc}</p>
 </div>
 </div>
 </motion.button>
 ))}
 </div>
 </div>
 </ScenarioShell>
 );
}

// ── Fallback (unknown ui_type) ─────────────────────────────────────────────────

function FallbackScenario({ scenarioId, title, instruction, durationMs, onComplete }: ScenarioProps) {
 useEffect(() => {
 const timer = setTimeout(() => {
 onComplete({
 scenario_id: scenarioId,
 first_response_ms: durationMs / 2,
 time_to_choice_ms: durationMs / 2,
 interaction_count: 1,
 distraction_clicks: 0,
 re_read_count: 0,
 choice_made: 'auto_complete',
 abandoned: false,
 });
 }, 3000);
 return () => clearTimeout(timer);
 }, [durationMs, onComplete, scenarioId]);

 return (
 <ScenarioShell title={title} instruction={instruction} scenarioId={scenarioId}>
 <div className="flex items-center justify-center py-12">
 <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
 </div>
 </ScenarioShell>
 );
}

// ── Scenario Shell Wrapper ─────────────────────────────────────────────────────

function ScenarioShell({ title, instruction, scenarioId, children }: {
 title: string; instruction: string; scenarioId: string; children: React.ReactNode;
}) {
 return (
 <motion.div
 initial={{ opacity: 0, x: 20 }}
 animate={{ opacity: 1, x: 0 }}
 exit={{ opacity: 0, x: -20 }}
 transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
 className="space-y-4"
 >
 <div className="flex items-center gap-3">
 <div className="flex-shrink-0 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest text-cyan-400 border border-cyan-500/30"
 style={{ background: 'rgba(14,165,233,0.08)' }}>
 {scenarioId}
 </div>
 <div>
 <h3 className="text-base font-bold text-primary">{title}</h3>
 <p className="text-xs text-muted">{instruction}</p>
 </div>
 </div>
 {children}
 </motion.div>
 );
}

// Scenario component map
const SCENARIO_COMPONENTS: Record<string, React.ComponentType<ScenarioProps>> = {
 navigation_sim: NavigationSimScenario,
 countdown_choice: CountdownChoiceScenario,
 conflict_resolution: ConflictResolutionScenario,
 dual_task: DualTaskScenario,
 social_pressure: SocialPressureScenario,
 tradeoff_choice: TradeoffChoiceScenario,
};

// ── Calibration Phase Orchestrator ────────────────────────────────────────────

function CalibrationPhase({
 scenarios,
 onComplete,
}: {
 scenarios: CalibrationScenario[];
 onComplete: (events: CalibrationEventPayload[]) => void;
}) {
 const [currentIdx, setCurrentIdx] = useState(0);
 const [completedEvents, setCompletedEvents] = useState<CalibrationEventPayload[]>([]);

 const totalScenarios = scenarios.length;
 const progress = totalScenarios > 0 ? (currentIdx / totalScenarios) * 100 : 0;

 const handleScenarioComplete = useCallback((payload: CalibrationEventPayload) => {
 const updated = [...completedEvents, payload];
 setCompletedEvents(updated);

 if (currentIdx < totalScenarios - 1) {
 setTimeout(() => setCurrentIdx(i => i + 1), 800);
 } else {
 setTimeout(() => onComplete(updated), 800);
 }
 }, [completedEvents, currentIdx, totalScenarios, onComplete]);

 const currentScenario = scenarios[currentIdx];

 return (
 <div className="space-y-5">
 {/* Progress */}
 <div>
 <div className="flex items-center justify-between mb-2">
 <span className="text-xs text-muted font-medium">Calibration sequence</span>
 <span className="text-xs text-cyan-400 font-bold">{currentIdx + 1} / {totalScenarios}</span>
 </div>
 <div className="flex gap-1">
 {scenarios.map((_, i) => (
 <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-500 ${
 i < currentIdx ? 'bg-cyan-500' : i === currentIdx ? 'bg-cyan-400/60' : 'bg-tertiary'
 }`} />
 ))}
 </div>
 </div>

 {/* Scenario */}
 <AnimatePresence mode="wait">
 {currentScenario && (
 <ScenarioRenderer
 key={currentScenario.id}
 scenario={currentScenario}
 onComplete={handleScenarioComplete}
 />
 )}
 </AnimatePresence>
 </div>
 );
}

// ── Result Phase ──────────────────────────────────────────────────────────────

function ResultPhase({
 profile,
 onContinue,
}: {
 profile: PersonalityProfileResponse;
 onContinue: () => void;
}) {
 const display = PROFILE_DISPLAYS[profile.onboarding_profile_label] || PROFILE_DISPLAYS.unknown;
 const ProfileIcon = display.icon;

 const behavioralTraits = [
 { label: 'Decision Speed', value: profile.behavioral_impulsiveness, high: 'Fast/Impulsive', low: 'Deliberate' },
 { label: 'Focus Control', value: 1 - profile.behavioral_attention, high: 'Distracted', low: 'Focused' },
 { label: 'Notification Pull', value: profile.behavioral_notification_fixation, high: 'High Fixation', low: 'Dismissive' },
 { label: 'Urgency Response', value: profile.behavioral_urgency_susceptibility, high: 'High Susceptibility', low: 'Pressure-Resistant' },
 { label: 'Authority Compliance', value: profile.behavioral_authority_compliance, high: 'Compliant', low: 'Independent' },
 ];

 return (
 <motion.div
 initial={{ opacity: 0, scale: 0.96 }}
 animate={{ opacity: 1, scale: 1 }}
 transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
 className="space-y-5"
 >
 {/* Profile card */}
 <div className="rounded-3xl overflow-hidden border border-subtle p-7 text-center card-glass">
 {/* Icon */}
 <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
 style={{ background: `rgba(${display.accent}, 0.1)`, border: `1px solid rgba(${display.accent}, 0.2)` }}>
 <ProfileIcon className="w-8 h-8 text-primary" />
 </div>

 <span className="text-xs font-black uppercase tracking-[0.2em] text-muted mb-2 block">
 Behaviorally Derived Profile
 </span>
 <h2 className="text-3xl font-extrabold text-primary mb-3 tracking-tight">{display.label}</h2>
 <p className="text-secondary leading-relaxed text-sm max-w-sm mx-auto">{display.description}</p>

 {/* Confidence badge */}
 {profile.calibration_completed && (
 <div className="mt-5 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-subtle"
 style={{ background: 'rgba(255,255,255,0.04)' }}>
 <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
 <span className="text-xs text-secondary">
 Calibration confidence: <strong className="text-primary">{Math.round(profile.calibration_confidence * 100)}%</strong>
 </span>
 </div>
 )}
 </div>

 {/* Behavioral trait breakdown */}
 <div className="rounded-2xl border border-subtle p-5 card-glass">
 <p className="text-xs font-black uppercase tracking-widest text-muted mb-5">
 Behavioral Signal Map
 {profile.calibration_completed && <span className="ml-2 text-cyan-500">● Calibrated</span>}
 </p>
 <div className="space-y-3.5">
 {behavioralTraits.map(({ label, value, high, low }) => {
 const pct = Math.round(value * 100);
 const color = pct >= 70 ? '#ef4444' : pct >= 45 ? '#f59e0b' : '#10b981';
 return (
 <div key={label}>
 <div className="flex items-center justify-between mb-1.5">
 <span className="text-xs text-secondary font-medium">{label}</span>
 <span className="text-xs font-bold" style={{ color }}>{pct >= 70 ? high : pct >= 45 ? 'Moderate' : low}</span>
 </div>
 <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
 <motion.div
 className="h-full rounded-full"
 style={{ background: color }}
 initial={{ width: 0 }}
 animate={{ width: `${pct}%` }}
 transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
 />
 </div>
 </div>
 );
 })}
 </div>
 </div>

 {/* Mismatch insights */}
 {profile.mismatch_flags && profile.mismatch_flags.length > 0 && (
 <div className="rounded-2xl border border-amber-500/20 p-5"
 style={{ background: 'rgba(245,158,11,0.06)' }}>
 <p className="text-xs font-black uppercase tracking-widest text-amber-500 mb-3 flex items-center gap-2">
 <AlertTriangle className="w-3.5 h-3.5" />
 Behavioral Insights
 </p>
 <ul className="space-y-2">
 {profile.mismatch_flags.slice(0, 2).map((flag, i) => (
 <li key={i} className="text-xs text-secondary leading-relaxed flex items-start gap-2">
 <div className="w-1 h-1 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
 {flag}
 </li>
 ))}
 </ul>
 </div>
 )}

 {/* What's next */}
 <div className="rounded-2xl border border-subtle p-4 flex gap-4 items-start"
 style={{ background: 'rgba(99,102,241,0.07)' }}>
 <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
 style={{ background: 'rgba(99,102,241,0.2)' }}>
 <Sparkles className="w-4 h-4 text-indigo-400" />
 </div>
 <div>
 <p className="text-sm font-bold text-primary mb-1">Training adapts to your behavioral profile</p>
 <p className="text-xs text-muted leading-relaxed">
 Scenarios will target your specific vulnerability patterns. Coaching will reference your exact behavioral signals. Lessons address the dimensions shown above.
 </p>
 </div>
 </div>

 <motion.button
 onClick={onContinue}
 className="w-full relative py-4 rounded-xl font-bold text-on-primary flex items-center justify-center gap-2"
 style={{ background: display.accent }}
 whileHover={{ scale: 1.01 }}
 whileTap={{ scale: 0.98 }}
 >
 Begin Adaptive Training <ChevronRight className="w-5 h-5" />
 </motion.button>
 </motion.div>
 );
}

// ── Processing Screen ─────────────────────────────────────────────────────────

function ProcessingScreen({ stage }: { stage: string }) {
 const stages = ['Extracting behavioral signals', 'Computing trait evidence', 'Running mismatch analysis', 'Deriving cognitive profile'];
 const [activeStage, setActiveStage] = useState(0);

 useEffect(() => {
 const interval = setInterval(() => {
 setActiveStage(s => Math.min(s + 1, stages.length - 1));
 }, 1200);
 return () => clearInterval(interval);
 }, [stages.length]);

 return (
 <motion.div
 initial={{ opacity: 0, scale: 0.96 }}
 animate={{ opacity: 1, scale: 1 }}
 className="rounded-3xl border border-subtle p-10 text-center card-glass"
 >
 <div className="relative w-16 h-16 mx-auto mb-6">
 <div className="w-16 h-16 rounded-full border-2 border-violet-500/20 border-t-violet-500 animate-spin" />
 <Brain className="absolute inset-0 m-auto w-7 h-7 text-violet-400" />
 </div>
 <h3 className="text-lg font-bold text-primary mb-5">Analyzing Behavioral Data</h3>
 <div className="space-y-2 text-left">
 {stages.map((s, i) => (
 <motion.div
 key={s}
 className={`flex items-center gap-3 text-xs transition-all duration-500 ${
 i <= activeStage ? 'text-secondary' : 'text-muted'
 }`}
 >
 <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
 i < activeStage ? 'bg-emerald-500' : i === activeStage ? 'bg-violet-500 animate-pulse' : 'bg-tertiary'
 }`}>
 {i < activeStage && <CheckCircle2 className="w-3 h-3 text-primary" />}
 </div>
 {s}
 </motion.div>
 ))}
 </div>
 </motion.div>
 );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function OnboardingPage() {
 const router = useRouter();
 const dispatch = useAppDispatch();
 const { isAuthenticated, user, token } = useAppSelector((state) => state.auth);

 const [phase, setPhase] = useState<OnboardingPhase>('WELCOME');
 const [questions, setQuestions] = useState<Question[]>([]);
 const [scenarios, setScenarios] = useState<CalibrationScenario[]>([]);
 const [isLoading, setIsLoading] = useState(true);
 const [profileResult, setProfileResult] = useState<PersonalityProfileResponse | null>(null);
 const [processingStage, setProcessingStage] = useState('');

 useEffect(() => {
 if (!isAuthenticated) router.replace('/auth/login');
 }, [isAuthenticated, router]);

 useEffect(() => {
 if (!isAuthenticated) return;
 async function fetchData() {
 try {
 const [qRes, sRes] = await Promise.all([
 client.get('/onboarding/questions'),
 client.get('/onboarding/calibration/scenarios'),
 ]);
 setQuestions(qRes.data);
 setScenarios(sRes.data);
 } catch {
 toast.error('Failed to load onboarding data. Please refresh.');
 } finally {
 setIsLoading(false);
 }
 }
 fetchData();
 }, [isAuthenticated]);

 if (!isAuthenticated || !user) return null;

 const handleSelfReportComplete = async (answers: { question_id: string; answer_value: string }[]) => {
 try {
 await client.post('/onboarding/submit', { answers });
 // Move to calibration intro without waiting for full result
 setPhase('CALIBRATION_INTRO');
 } catch {
 toast.error('Failed to save prior assessment. Continuing to calibration.');
 setPhase('CALIBRATION_INTRO');
 }
 };

 const handleCalibrationComplete = async (events: CalibrationEventPayload[]) => {
 setPhase('PROCESSING');
 setProcessingStage('Extracting behavioral signals...');
 try {
 const res = await client.post('/onboarding/calibration/submit', { events });
 const profile: PersonalityProfileResponse = res.data;

 // Map to backend profile type
 const profileMap: Record<string, string> = {
 impulsive: 'impulsive',
 notification_distracted: 'distractible',
 distracted: 'distractible',
 hesitant: 'distractible',
 risk_seeking: 'overconfident',
 cautious: 'rule_following',
 emotionally_reactive: 'anxious',
 authority_driven: 'rule_following',
 balanced: 'rule_following',
 };
 const mappedProfile = profileMap[profile.onboarding_profile_label] || 'unknown';

 try {
 const updateRes = await updateProfile(mappedProfile);
 if (user && token) {
 dispatch(loginSuccess({ user: { ...user, profile_type: updateRes.profile_type }, token }));
 }
 } catch {
 // Non-fatal — profile display still works
 }

 setProfileResult(profile);
 setPhase('RESULT');
 } catch (err) {
 toast.error('Failed to process calibration data. Please try again.');
 setPhase('CALIBRATION');
 }
 };

 return (
 <>
 <Head>
 <title>Behavioral Calibration — SafeDrive AI</title>
 <meta name="description" content="Behavioral calibration system for adaptive driving simulation. System initialization and cognitive profile derivation." />
 </Head>

 <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden bg-app-shell transition-colors duration-400">
 
 {/* Theme Toggle */}
 <div className="absolute top-6 right-6 z-50">
 <ThemeToggle />
 </div>

 {/* Ambient background */}
 <div className="absolute inset-0 overflow-hidden pointer-events-none">
 <div className="absolute top-0 left-1/3 w-[600px] h-[500px] rounded-full blur-[140px]"
 style={{ background: 'radial-gradient(circle, rgba(79,70,229,0.06) 0%, transparent 70%)' }} />
 <div className="absolute bottom-0 right-1/4 w-[500px] h-[400px] rounded-full blur-[120px]"
 style={{ background: 'radial-gradient(circle, rgba(14,165,233,0.05) 0%, transparent 70%)' }} />
 {/* Subtle grid */}
 <div className="absolute inset-0 opacity-[0.02] bg-secondary border border-subtle" />
 </div>

 <div className="w-full max-w-md relative z-10">
 {/* Phase header (outside phase content) */}
 {phase !== 'WELCOME' && phase !== 'RESULT' && phase !== 'PROCESSING' && (
 <motion.div
 initial={{ opacity: 0, y: -8 }}
 animate={{ opacity: 1, y: 0 }}
 className="flex items-center gap-3 mb-6"
 >
 <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-secondary border border-subtle">
 <Brain className="w-4 h-4 text-primary" />
 </div>
 <div>
 <p className="text-xs font-black uppercase tracking-widest text-muted">SafeDrive AI</p>
 <p className="text-[10px] text-muted">
 {phase === 'SELF_REPORT' ? 'Phase 1 — Context Setup' : 'Phase 2 — System Calibration'}
 </p>
 </div>
 </motion.div>
 )}

 {/* Phase content */}
 <AnimatePresence mode="wait">
 {isLoading ? (
 <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
 className="flex flex-col items-center justify-center py-24">
 <Loader2 className="w-8 h-8 text-violet-400 animate-spin mb-4" />
 <p className="text-muted text-sm">Initializing calibration system...</p>
 </motion.div>
 ) : phase === 'WELCOME' ? (
 <motion.div key="welcome" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
 <WelcomePhase onBegin={() => setPhase('SELF_REPORT')} />
 </motion.div>
 ) : phase === 'SELF_REPORT' ? (
 <motion.div key="self_report" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
 <SelfReportPhase questions={questions} onComplete={handleSelfReportComplete} />
 </motion.div>
 ) : phase === 'CALIBRATION_INTRO' ? (
 <motion.div key="cal_intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
 <CalibrationIntroPhase onBegin={() => setPhase('CALIBRATION')} />
 </motion.div>
 ) : phase === 'CALIBRATION' ? (
 <motion.div key="calibration" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
 <CalibrationPhase scenarios={scenarios} onComplete={handleCalibrationComplete} />
 </motion.div>
 ) : phase === 'PROCESSING' ? (
 <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
 <ProcessingScreen stage={processingStage} />
 </motion.div>
 ) : phase === 'RESULT' && profileResult ? (
 <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
 <ResultPhase profile={profileResult} onContinue={() => router.push('/dashboard')} />
 </motion.div>
 ) : null}
 </AnimatePresence>
 </div>
 </div>
 </>
 );
}
