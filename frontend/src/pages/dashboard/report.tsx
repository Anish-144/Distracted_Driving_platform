import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useAppSelector } from '@/store';
import { fetchLatestCognitiveReport, fetchCognitiveReportBySession, CognitiveReport } from '@/api/ai';
import AppShell from '@/components/layout/AppShell';
import { FadeUp } from '@/components/motion/ScrollReveal';
import {
 BrainCircuit, Activity, Target, AlertTriangle, ArrowLeft,
 ShieldAlert, Fingerprint, Zap, Clock, ShieldCheck
} from 'lucide-react';
import {
 Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
 LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ReferenceLine
} from 'recharts';
import CoachingAudioCard from '@/components/voice/CoachingAudioCard';
import FeedbackModal from '@/components/feedback/FeedbackModal';

const CARD = 'card overflow-hidden relative';
const LABEL = 'text-[11px] font-bold uppercase tracking-[0.15em] text-muted';

export default function CognitiveReportPage() {
 const router = useRouter();
 const { isAuthenticated, user } = useAppSelector((s) => s.auth);
 const [report, setReport] = useState<CognitiveReport | null>(null);
 const [isLoading, setIsLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [showFeedback, setShowFeedback] = useState(false);

 useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/auth/login');
      return;
    }
    
    const sessionId = router.query.sessionId as string | undefined;
    const fetchReport = sessionId 
      ? fetchCognitiveReportBySession(sessionId)
      : fetchLatestCognitiveReport();

    fetchReport
      .then(setReport)
      .catch(err => {
        const msg = err?.response?.data?.detail || "Failed to load cognitive report.";
        setError(msg);
      })
      .finally(() => setIsLoading(false));
  }, [isAuthenticated, router, router.query.sessionId]);

 if (isLoading || !isAuthenticated || !user) {
 return (
 <div className="min-h-screen flex flex-col items-center justify-center bg-transparent">
 <BrainCircuit className="w-12 h-12 text-brand-500 animate-pulse mb-4" />
 <p className="text-muted font-medium animate-pulse">Compiling Behavioral Dossier...</p>
 </div>
 );
 }

 if (error || !report) {
 return (
 <AppShell maxWidth="wide">
 <div className="empty-state-card mt-12 mx-auto max-w-lg">
 <div className="icon-wrapper">
 <ShieldAlert className="icon" />
 </div>
 <h3>No Report Available</h3>
 <p>
 {error || "You need to complete a full simulation session to generate a cognitive behavioral report."}
 </p>
 <button
  onClick={() => setShowFeedback(true)}
  className="px-4 py-2 bg-brand-500/10 text-brand-500 font-semibold rounded-xl border border-brand-500/20 hover:bg-brand-500/20 transition-colors"
 >
  Rate Simulation
 </button>
 <Link
 href="/simulation"
 className="btn-primary"
 >
 Start Simulation
 </Link>
 </div>
 </AppShell>
 );
 }

 // Formatting data for Recharts
 const radarData = [
 { subject: 'Urgency Susceptibility', A: report.metrics.urgency_susceptibility_index * 100, fullMark: 100 },
 { subject: 'Authority Pressure', A: report.metrics.authority_pressure_sensitivity * 100, fullMark: 100 },
 { subject: 'Cognitive Overload', A: report.metrics.cognitive_overload_score * 100, fullMark: 100 },
 { subject: 'Emotional Reactivity', A: report.metrics.emotional_reactivity_index * 100, fullMark: 100 },
 { subject: 'Defensive Attention', A: report.metrics.defensive_attention_stability * 100, fullMark: 100 },
 { subject: 'Reassurance Seeking', A: report.metrics.reassurance_seeking_probability * 100, fullMark: 100 },
 ];

 const timelineData = report.behavioral_timeline.map((event) => ({
 name: `Evt ${event.event_num}`,
 reactionTime: event.reaction_time,
 decision: event.decision,
 scenario: event.scenario_type,
 }));

 const formatDate = (dateStr: string) => {
 return new Date(dateStr).toLocaleString(undefined, {
 month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
 });
 };

 return (
 <>
 <Head>
 <title>Behavioral Dossier — SafeDrive AI</title>
 </Head>

 <AppShell maxWidth="wide">
 <div className="max-w-7xl mx-auto pb-12">
 
 {/* ── Header ────────────────────────────────────────────────────── */}
 <FadeUp className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
 <div>
 <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm font-medium mb-4">
 <Link href="/dashboard" className="text-muted hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 rounded">
 Dashboard
 </Link>
 <span className="text-tertiary" aria-hidden="true">/</span>
 <span className="text-primary font-semibold" aria-current="page">Report</span>
 </nav>
 <div className="flex items-center gap-3 mb-2">
 <div className="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
 <Fingerprint className="w-4 h-4 text-brand-400" />
 </div>
 <p className={LABEL + ' !text-brand-400'}>Classified Behavioral Dossier</p>
 </div>
 <h1 className="text-3xl font-black text-primary tracking-tight">
 Cognitive Report <span className="text-muted font-normal ml-2">#{report.id.slice(0, 8)}</span>
 </h1>
 </div>
 <div className="text-right">
 <p className="text-sm font-mono text-muted">GENERATED</p>
 <p className="text-secondary font-medium">{formatDate(report.created_at)}</p>
 </div>
 </FadeUp>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 
 {/* ── Left Column (Main Analysis) ─────────────────────────────── */}
 <div className="lg:col-span-2 space-y-6">
 
 {/* Executive Summary */}
 <FadeUp delay={0.1}>
 <div className={`${CARD} p-8`}>
 <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
 <BrainCircuit className="w-48 h-48" />
 </div>
 <h2 className="text-xl font-bold text-primary flex items-center gap-3 mb-4">
 <Activity className="w-5 h-5 text-brand-400" />
 Executive Behavioral Summary
 </h2>
 <p className="text-lg leading-relaxed text-secondary font-medium">
 {report.executive_summary}
 </p>
 
 
  {/* Voice narration card — tap to hear AI coach narrate the executive summary */}
  <div className="mt-5">
   <CoachingAudioCard
    mode="report"
    autoFetch={false}
    reportPayload={{
     driver_type: report.session_context.driver_profile,
     personality_label: report.session_context.personality_label,
     safe_decision_rate: report.session_context.safe_decision_rate,
     executive_summary: report.executive_summary,
     with_audio: true,
    }}
   />
  </div>
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-subtle">
 <div>
 <p className={LABEL}>Session Score</p>
 <p className="text-2xl font-bold text-primary">{Math.round(report.session_context.score)}%</p>
 </div>
 <div>
 <p className={LABEL}>Safe Decisions</p>
 <p className="text-2xl font-bold text-brand-400">{Math.round(report.session_context.safe_decision_rate * 100)}%</p>
 </div>
 <div>
 <p className={LABEL}>Driver Profile</p>
 <p className="text-lg font-bold text-purple-400 capitalize">{report.session_context.driver_profile}</p>
 </div>
 <div>
 <p className={LABEL}>Consistency</p>
 <p className="text-lg font-bold text-amber-400 capitalize">{report.session_context.personality_label}</p>
 </div>
 </div>
 </div>
 </FadeUp>

 {/* Cognitive & Emotional Analysis */}
 <FadeUp delay={0.2} className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div className={`${CARD} p-6`}>
 <h3 className="text-sm font-bold uppercase tracking-wider text-muted mb-4 flex items-center gap-2">
 <BrainCircuit className="w-4 h-4 text-purple-400" />
 Cognitive Mechanics
 </h3>
 <p className="text-sm text-secondary leading-relaxed">
 {report.cognitive_analysis}
 </p>
 
 <h3 className="text-sm font-bold uppercase tracking-wider text-muted mt-6 mb-4 flex items-center gap-2">
 <ShieldCheck className="w-4 h-4 text-brand-400" />
 Consistency Analysis
 </h3>
 <p className="text-sm text-secondary leading-relaxed">
 {report.consistency_analysis}
 </p>
 </div>

 <div className={`${CARD} p-6`}>
 <h3 className="text-sm font-bold uppercase tracking-wider text-muted mb-4 flex items-center gap-2">
 <Zap className="w-4 h-4 text-amber-400" />
 Emotional Triggers
 </h3>
 <div className="space-y-4">
 {report.emotional_trigger_breakdown.map((trigger, i) => (
 <div key={i} className="bg-secondary rounded-xl p-4 border border-subtle">
 <div className="flex justify-between items-center mb-2">
 <span className="font-bold text-amber-400 capitalize">{trigger.trigger_type.replace('_', ' ')}</span>
 <span className="text-xs font-mono bg-amber-500/10 text-amber-400 px-2 py-1 rounded">
 {trigger.susceptibility_pct}% SUSCEPTIBILITY
 </span>
 </div>
 <p className="text-xs text-muted leading-relaxed">{trigger.explanation}</p>
 </div>
 ))}
 </div>
 </div>
 </FadeUp>

 {/* Behavioral Timeline */}
 <FadeUp delay={0.3}>
 <div className={`${CARD} p-6`}>
 <h3 className="text-sm font-bold uppercase tracking-wider text-muted mb-6 flex items-center gap-2">
 <Clock className="w-4 h-4 text-brand-400" />
 Session Evolution Timeline
 </h3>
 
 {report.behavioral_timeline.length === 0 ? (
   <div className="flex flex-col items-center justify-center py-10 px-4 bg-secondary/30 rounded-xl border border-subtle border-dashed mb-6">
     <Clock className="w-8 h-8 text-muted mb-3 opacity-30" />
     <p className="text-sm font-medium text-secondary">Timeline Unavailable</p>
     <p className="text-xs text-muted text-center max-w-xs mt-1">
       Detailed event timeline plotting requires full AI processing, which is currently running in fallback mode.
     </p>
   </div>
 ) : (
   <>
 <div className="h-[200px] w-full mb-6">
 <ResponsiveContainer width="100%" height="100%">
 <LineChart data={timelineData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
 <CartesianGrid strokeDasharray="3 3" stroke="#ffffff1a" vertical={false} />
 <XAxis dataKey="name" stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} />
 <YAxis stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} />
 <RechartsTooltip 
 contentStyle={{ backgroundColor: '#0a101d', borderColor: '#1f2937', borderRadius: '8px' }}
 itemStyle={{ color: '#f3f4f6' }}
 />
 <ReferenceLine y={2.0} stroke="#f87171" strokeDasharray="3 3" label={{ value: 'Impulsive Zone', position: 'insideTopLeft', fill: '#f87171', fontSize: 10 }} />
 <Line type="monotone" dataKey="reactionTime" name="Reaction Time (s)" stroke="#34d399" strokeWidth={2} dot={{ r: 4, fill: '#34d399', strokeWidth: 0 }} activeDot={{ r: 6 }} />
 </LineChart>
 </ResponsiveContainer>
 </div>

 <div className="space-y-3 relative before:absolute before:inset-0 before:ml-[15px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-tertiary before:from-transparent before:via-white/10 before:to-transparent">
 {report.behavioral_timeline.map((event, i) => (
 <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
 <div className="flex items-center justify-center w-8 h-8 rounded-full border-4 border-[#0a101d] bg-tertiary text-muted shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
 <span className="text-[10px] font-bold">{event.event_num}</span>
 </div>
 <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2rem)] p-4 rounded-xl bg-secondary border border-subtle">
 <div className="flex justify-between items-start mb-1">
 <span className="text-xs font-bold text-primary uppercase tracking-wider">{event.scenario_type.replace('_', ' ')}</span>
 <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold ${
 event.decision.includes('safe') ? 'bg-brand-500/10 text-brand-400' : 
 event.decision.includes('impulsive') ? 'bg-red-500/10 text-red-400' : 
 'bg-amber-500/10 text-amber-400'
 }`}>
 {event.decision.replace('_', ' ')}
 </span>
 </div>
 <p className="text-xs text-muted mt-2">{event.interpretation}</p>
 </div>
 </div>
 ))}
 </div>
 </>
 )}
 </div>
 </FadeUp>
 </div>

 {/* ── Right Column (Radar & Interventions) ────────────────────── */}
 <div className="space-y-6">
 
 {/* Radar Chart */}
 <FadeUp delay={0.2}>
 <div className={`${CARD} p-6 flex flex-col items-center`}>
 <p className={LABEL + ' mb-6 self-start'}>Behavioral Vulnerabilities</p>
 <div className="w-full h-[280px]">
 <ResponsiveContainer width="100%" height="100%">
 <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
 <PolarGrid stroke="rgba(255,255,255,0.1)" />
 <PolarAngleAxis dataKey="subject" tick={{ fill: '#9ca3af', fontSize: 10 }} />
 <Radar name="Vulnerability" dataKey="A" stroke="#34d399" fill="#34d399" fillOpacity={0.3} />
 </RadarChart>
 </ResponsiveContainer>
 </div>
 </div>
 </FadeUp>

 {/* Adaptive Coaching Narrative */}
 <FadeUp delay={0.3}>
 <div className={`${CARD} p-6 border-l-4 border-l-brand-500 bg-tertiary /10 to-transparent`}>
 <p className={LABEL + ' mb-3 text-brand-400'}>Psychological Coaching</p>
 <div className="prose prose-invert prose-sm prose-p:leading-relaxed max-w-none text-secondary">
 {report.coaching_narrative.split('\n').map((paragraph, idx) => (
 <p key={idx}>{paragraph}</p>
 ))}
 </div>
 </div>
 </FadeUp>

 {/* Intervention Strategy */}
 <FadeUp delay={0.4}>
 <div className={`${CARD} p-6`}>
 <p className={LABEL + ' mb-4'}>Intervention Strategy</p>
 <div className="space-y-3">
 {report.intervention_strategy.map((strategy, i) => (
 <div key={i} className="p-3 bg-secondary rounded-xl border border-subtle">
 <div className="flex justify-between items-start mb-1">
 <h4 className="text-sm font-bold text-primary">{strategy.technique}</h4>
 <span className={`text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${
 strategy.priority.toLowerCase() === 'high' ? 'bg-red-500/20 text-red-400' :
 strategy.priority.toLowerCase() === 'medium' ? 'bg-amber-500/20 text-amber-400' :
 'bg-brand-500/20 text-brand-400'
 }`}>
 {strategy.priority}
 </span>
 </div>
 <p className="text-xs text-muted mt-1">{strategy.rationale}</p>
 </div>
 ))}
 </div>
 </div>
 </FadeUp>

 {/* Risk Projection & Next Steps */}
 <FadeUp delay={0.5}>
 <div className={`${CARD} p-6`}>
 <div className="flex items-start gap-3 mb-4">
 <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
 <div>
 <p className={LABEL + ' text-red-400 mb-1'}>Risk Projection</p>
 <p className="text-sm text-secondary leading-relaxed">{report.risk_projection}</p>
 </div>
 </div>
 
 <div className="mt-6 pt-5 border-t border-subtle">
 <p className={LABEL + ' mb-3'}>Recommended Path</p>
 {report.recommended_simulations.map((sim, i) => (
 <div key={i} className="flex items-center justify-between p-3 bg-secondary rounded-xl border border-transparent">
 <div>
 <p className="text-sm font-bold text-primary">{sim.type}</p>
 <p className="text-[10px] text-muted uppercase tracking-wider mt-0.5">Targets: {sim.targets_weakness.replace('_', ' ')}</p>
 </div>
 <span className="text-[10px] font-mono text-muted">{sim.difficulty}</span>
 </div>
 ))}
 </div>
 </div>
 </FadeUp>

 </div>
 </div>
 </div>
      <FeedbackModal 
        isOpen={showFeedback} 
        onClose={() => setShowFeedback(false)} 
        defaultType="simulation" 
        sessionId={report?.session_id || router.query.sessionId as string}
      />
    </AppShell>
  </>
 );
}
