import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useAppSelector } from '@/store';
import { fetchLatestCognitiveReport, CognitiveReport } from '@/api/ai';
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

const CARD = 'bg-[#0f172a] rounded-2xl border border-slate-800 shadow-xl overflow-hidden relative';
const LABEL = 'text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400';

export default function CognitiveReportPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAppSelector((s) => s.auth);
  const [report, setReport] = useState<CognitiveReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/auth/login');
      return;
    }
    
    fetchLatestCognitiveReport()
      .then(setReport)
      .catch(err => {
        const msg = err?.response?.data?.detail || "Failed to load cognitive report.";
        setError(msg);
      })
      .finally(() => setIsLoading(false));
  }, [isAuthenticated, router]);

  if (isLoading || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950">
        <BrainCircuit className="w-12 h-12 text-blue-500 animate-pulse mb-4" />
        <p className="text-slate-400 font-medium animate-pulse">Compiling Behavioral Dossier...</p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <AppShell>
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-6">
            <ShieldAlert className="w-8 h-8 text-slate-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-200 mb-2">No Report Available</h2>
          <p className="text-slate-400 mb-8 leading-relaxed">
            {error || "You need to complete a full simulation session to generate a cognitive behavioral report."}
          </p>
          <Link
            href="/simulation"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)]"
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

      {/* Force a dark theme specifically for the dossier to make it feel like an intelligence report */}
      <div className="min-h-screen bg-slate-950 text-slate-300 pb-20 font-sans selection:bg-blue-500/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          
          {/* ── Header ────────────────────────────────────────────────────── */}
          <FadeUp className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-300 transition-colors mb-4">
                <ArrowLeft className="w-4 h-4" /> Back to Dashboard
              </Link>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                  <Fingerprint className="w-4 h-4 text-blue-400" />
                </div>
                <p className={LABEL + ' !text-blue-400'}>Classified Behavioral Dossier</p>
              </div>
              <h1 className="text-3xl font-black text-white tracking-tight">
                Cognitive Report <span className="text-slate-600 font-normal ml-2">#{report.id.slice(0, 8)}</span>
              </h1>
            </div>
            <div className="text-right">
              <p className="text-sm font-mono text-slate-500">GENERATED</p>
              <p className="text-slate-300 font-medium">{formatDate(report.created_at)}</p>
            </div>
          </FadeUp>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* ── Left Column (Main Analysis) ─────────────────────────────── */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Executive Summary */}
              <FadeUp delay={0.1}>
                <div className={`${CARD} p-8 bg-gradient-to-br from-slate-900 to-slate-950`}>
                  <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                    <BrainCircuit className="w-48 h-48" />
                  </div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-3 mb-4">
                    <Activity className="w-5 h-5 text-blue-400" />
                    Executive Behavioral Summary
                  </h2>
                  <p className="text-lg leading-relaxed text-slate-300 font-medium">
                    {report.executive_summary}
                  </p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-800/60">
                    <div>
                      <p className={LABEL}>Session Score</p>
                      <p className="text-2xl font-bold text-white">{Math.round(report.session_context.score)}%</p>
                    </div>
                    <div>
                      <p className={LABEL}>Safe Decisions</p>
                      <p className="text-2xl font-bold text-emerald-400">{Math.round(report.session_context.safe_decision_rate * 100)}%</p>
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
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                    <BrainCircuit className="w-4 h-4 text-purple-400" />
                    Cognitive Mechanics
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {report.cognitive_analysis}
                  </p>
                  
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mt-6 mb-4 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Consistency Analysis
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {report.consistency_analysis}
                  </p>
                </div>

                <div className={`${CARD} p-6`}>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    Emotional Triggers
                  </h3>
                  <div className="space-y-4">
                    {report.emotional_trigger_breakdown.map((trigger, i) => (
                      <div key={i} className="bg-slate-900/50 rounded-xl p-4 border border-slate-800">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-bold text-amber-400 capitalize">{trigger.trigger_type.replace('_', ' ')}</span>
                          <span className="text-xs font-mono bg-amber-500/10 text-amber-400 px-2 py-1 rounded">
                            {trigger.susceptibility_pct}% SUSCEPTIBILITY
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">{trigger.explanation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </FadeUp>

              {/* Behavioral Timeline */}
              <FadeUp delay={0.3}>
                <div className={`${CARD} p-6`}>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-6 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-400" />
                    Session Evolution Timeline
                  </h3>
                  
                  <div className="h-[200px] w-full mb-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={timelineData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                        <RechartsTooltip 
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                          itemStyle={{ color: '#e2e8f0' }}
                        />
                        <ReferenceLine y={2.0} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Impulsive Zone', position: 'insideTopLeft', fill: '#ef4444', fontSize: 10 }} />
                        <Line type="monotone" dataKey="reactionTime" name="Reaction Time (s)" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-3 relative before:absolute before:inset-0 before:ml-[15px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-800 before:to-transparent">
                    {report.behavioral_timeline.map((event, i) => (
                      <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full border-4 border-slate-950 bg-slate-800 text-slate-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                          <span className="text-[10px] font-bold">{event.event_num}</span>
                        </div>
                        <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2rem)] p-4 rounded-xl bg-slate-900 border border-slate-800">
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-xs font-bold text-white uppercase tracking-wider">{event.scenario_type.replace('_', ' ')}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold ${
                              event.decision.includes('safe') ? 'bg-emerald-500/10 text-emerald-400' : 
                              event.decision.includes('impulsive') ? 'bg-red-500/10 text-red-400' : 
                              'bg-amber-500/10 text-amber-400'
                            }`}>
                              {event.decision.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-2">{event.interpretation}</p>
                        </div>
                      </div>
                    ))}
                  </div>
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
                        <PolarGrid stroke="#1e293b" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                        <Radar name="Vulnerability" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </FadeUp>

              {/* Adaptive Coaching Narrative */}
              <FadeUp delay={0.3}>
                <div className={`${CARD} p-6 border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-900/20 to-transparent`}>
                  <p className={LABEL + ' mb-3 text-blue-400'}>Psychological Coaching</p>
                  <div className="prose prose-invert prose-sm prose-p:leading-relaxed max-w-none text-slate-300">
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
                      <div key={i} className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="text-sm font-bold text-white">{strategy.technique}</h4>
                          <span className={`text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${
                            strategy.priority.toLowerCase() === 'high' ? 'bg-red-500/20 text-red-400' :
                            strategy.priority.toLowerCase() === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                            'bg-blue-500/20 text-blue-400'
                          }`}>
                            {strategy.priority}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{strategy.rationale}</p>
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
                      <p className="text-sm text-slate-300 leading-relaxed">{report.risk_projection}</p>
                    </div>
                  </div>
                  
                  <div className="mt-6 pt-5 border-t border-slate-800">
                    <p className={LABEL + ' mb-3'}>Recommended Path</p>
                    {report.recommended_simulations.map((sim, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl hover:bg-slate-800 cursor-pointer transition-colors group">
                        <div>
                          <p className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">{sim.type}</p>
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">Targets: {sim.targets_weakness.replace('_', ' ')}</p>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">{sim.difficulty}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </FadeUp>

            </div>
          </div>
        </div>
      </div>
    </>
  );
}
