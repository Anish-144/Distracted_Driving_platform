import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useAppSelector } from '@/store';
import { fetchLatestCognitiveReport, fetchCognitiveReportBySession, CognitiveReport } from '@/api/ai';
import AppShell from '@/components/layout/AppShell';
import { FadeUp } from '@/components/motion/ScrollReveal';
import {
  BrainCircuit, Activity, AlertTriangle, Fingerprint, Zap, Clock, ShieldCheck
} from 'lucide-react';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ReferenceLine
} from 'recharts';
import CoachingAudioCard from '@/components/voice/CoachingAudioCard';
import FeedbackModal from '@/components/feedback/FeedbackModal';

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.10em] mb-3" style={{ color: 'var(--text-muted)', fontFamily: 'Space Grotesk, sans-serif' }}>
      {children}
    </p>
  );
}

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
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: 'var(--bg-canvas)' }}>
        <div className="w-5 h-5 border-2 border-t-transparent animate-spin mb-4" style={{ borderColor: 'var(--text-primary)', borderTopColor: 'transparent', borderRadius: '50%' }} />
        <p className="text-sm font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Compiling Dossier...</p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <AppShell maxWidth="wide">
        <div className="mt-12 mx-auto max-w-lg p-8 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: '4px' }}>
          <AlertTriangle className="w-8 h-8 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
          <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>No Report Available</h3>
          <p className="text-sm mb-6 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {error || "You need to complete a full simulation session to generate a cognitive behavioral report."}
          </p>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setShowFeedback(true)}
              className="px-4 py-2 text-xs font-semibold"
              style={{ background: 'var(--bg-hover)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', borderRadius: '4px' }}
            >
              RATE SIMULATION
            </button>
            <Link
              href="/simulation"
              className="px-4 py-2 text-xs font-semibold"
              style={{ background: '#1A1814', color: '#C8FF00', borderRadius: '4px' }}
            >
              START SIMULATION →
            </Link>
          </div>
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
              <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>
                <Link href="/dashboard" className="hover:underline">Dashboard</Link>
                <span>/</span>
                <span style={{ color: 'var(--text-primary)' }}>Report</span>
              </nav>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded flex items-center justify-center" style={{ background: '#C8FF00' }}>
                  <Fingerprint className="w-4 h-4" style={{ color: '#1A1814' }} />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: 'var(--text-primary)' }}>Classified Behavioral Dossier</p>
              </div>
              <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)', fontFamily: 'Space Grotesk, sans-serif' }}>
                Cognitive Report <span className="font-mono text-sm ml-2" style={{ color: 'var(--text-muted)' }}>#{report.id.slice(0, 8)}</span>
              </h1>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Generated</p>
              <p className="text-xs font-semibold mono-data" style={{ color: 'var(--text-primary)' }}>{formatDate(report.created_at)}</p>
            </div>
          </FadeUp>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            
            {/* ── Left Column (Main Analysis) ─────────────────────────────── */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              
              {/* Executive Summary */}
              <FadeUp delay={0.1}>
                <div className="p-8 relative overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: '4px' }}>
                  <h2 className="text-sm font-bold flex items-center gap-2 mb-4 uppercase" style={{ color: 'var(--text-primary)' }}>
                    <Activity className="w-4 h-4" />
                    Executive Summary
                  </h2>
                  <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--text-secondary)' }}>
                    {report.executive_summary}
                  </p>
                  
                  {/* Voice narration card */}
                  <div className="mb-6">
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

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                    <div>
                      <SectionLabel>Score</SectionLabel>
                      <p className="text-2xl font-bold mono-data" style={{ color: 'var(--text-primary)' }}>{Math.round(report.session_context.score)}%</p>
                    </div>
                    <div>
                      <SectionLabel>Safe</SectionLabel>
                      <p className="text-2xl font-bold mono-data" style={{ color: '#C8FF00', WebkitTextStroke: '0.5px #1A1814' }}>{Math.round(report.session_context.safe_decision_rate * 100)}%</p>
                    </div>
                    <div>
                      <SectionLabel>Profile</SectionLabel>
                      <p className="text-sm font-bold capitalize" style={{ color: 'var(--text-primary)' }}>{report.session_context.driver_profile}</p>
                    </div>
                    <div>
                      <SectionLabel>Personality</SectionLabel>
                      <p className="text-sm font-bold capitalize" style={{ color: 'var(--text-primary)' }}>{report.session_context.personality_label}</p>
                    </div>
                  </div>
                </div>
              </FadeUp>

              {/* Cognitive & Emotional Analysis */}
              <FadeUp delay={0.2} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: '4px' }}>
                  <h3 className="text-[10px] font-bold uppercase tracking-wider mb-4 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                    <BrainCircuit className="w-3.5 h-3.5" />
                    Cognitive Mechanics
                  </h3>
                  <p className="text-xs leading-relaxed mb-6" style={{ color: 'var(--text-secondary)' }}>
                    {report.cognitive_analysis}
                  </p>
                  
                  <h3 className="text-[10px] font-bold uppercase tracking-wider mb-4 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Consistency Analysis
                  </h3>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {report.consistency_analysis}
                  </p>
                </div>

                <div className="p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: '4px' }}>
                  <h3 className="text-[10px] font-bold uppercase tracking-wider mb-4 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                    <Zap className="w-3.5 h-3.5" />
                    Emotional Triggers
                  </h3>
                  <div className="space-y-3">
                    {report.emotional_trigger_breakdown.map((trigger, i) => (
                      <div key={i} className="p-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '4px' }}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-bold capitalize" style={{ color: 'var(--text-primary)' }}>{trigger.trigger_type.replace('_', ' ')}</span>
                          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-surface-raised)', color: 'var(--text-primary)' }}>
                            {trigger.susceptibility_pct}% Impact
                          </span>
                        </div>
                        <p className="text-[10px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>{trigger.explanation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </FadeUp>

              {/* Behavioral Timeline */}
              <FadeUp delay={0.3}>
                <div className="p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: '4px' }}>
                  <h3 className="text-[10px] font-bold uppercase tracking-wider mb-6 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                    <Clock className="w-3.5 h-3.5" />
                    Session Evolution Timeline
                  </h3>
                  
                  {report.behavioral_timeline.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 px-4 border border-dashed rounded" style={{ borderColor: 'var(--border-subtle)' }}>
                      <Clock className="w-6 h-6 mb-2 opacity-30" style={{ color: 'var(--text-muted)' }} />
                      <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Timeline Unavailable</p>
                    </div>
                  ) : (
                    <>
                      <div className="h-[200px] w-full mb-6">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={timelineData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#D8D4CC" vertical={false} />
                            <XAxis dataKey="name" stroke="#9A9690" fontSize={10} tickLine={false} axisLine={false} />
                            <YAxis stroke="#9A9690" fontSize={10} tickLine={false} axisLine={false} />
                            <RechartsTooltip 
                              contentStyle={{ backgroundColor: '#1A1814', borderColor: '#2D2A24', borderRadius: '4px', color: '#F0EDE6' }}
                              itemStyle={{ color: '#C8FF00' }}
                            />
                            <ReferenceLine y={2.0} stroke="#8B2020" strokeDasharray="3 3" label={{ value: 'Impulsive Zone', position: 'insideTopLeft', fill: '#8B2020', fontSize: 10 }} />
                            <Line type="monotone" dataKey="reactionTime" name="Reaction Time (s)" stroke="#1A1814" strokeWidth={2} dot={{ r: 4, fill: '#1A1814', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="space-y-2">
                        {report.behavioral_timeline.map((event, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded border flex items-center justify-center shrink-0" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-strong)' }}>
                              <span className="text-[10px] font-bold mono-data">{event.event_num}</span>
                            </div>
                            <div className="flex-1 p-3 rounded border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
                              <div className="flex justify-between items-start mb-1">
                                <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>{event.scenario_type.replace('_', ' ')}</span>
                                <span className="text-[9px] px-1.5 py-0.5 rounded uppercase font-bold" style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}>
                                  {event.decision.replace('_', ' ')}
                                </span>
                              </div>
                              <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{event.interpretation}</p>
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
            <div className="flex flex-col gap-4">
              
              {/* Radar Chart */}
              <FadeUp delay={0.2}>
                <div className="p-6 flex flex-col items-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: '4px' }}>
                  <SectionLabel>Behavioral Vulnerabilities</SectionLabel>
                  <div className="w-full h-[240px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                        <PolarGrid stroke="#D8D4CC" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#5A5650', fontSize: 9 }} />
                        <Radar name="Vulnerability" dataKey="A" stroke="#1A1814" fill="#C8FF00" fillOpacity={0.8} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </FadeUp>

              {/* Adaptive Coaching Narrative */}
              <FadeUp delay={0.3}>
                <div className="p-6" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-card)', borderLeft: '4px solid #C8FF00', borderRadius: '4px' }}>
                  <SectionLabel>Psychological Coaching</SectionLabel>
                  <div className="text-xs leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                    {report.coaching_narrative.split('\n').map((paragraph, idx) => (
                      <p key={idx} className="mb-2 last:mb-0">{paragraph}</p>
                    ))}
                  </div>
                </div>
              </FadeUp>

              {/* Intervention Strategy */}
              <FadeUp delay={0.4}>
                <div className="p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: '4px' }}>
                  <SectionLabel>Intervention Strategy</SectionLabel>
                  <div className="space-y-2">
                    {report.intervention_strategy.map((strategy, i) => (
                      <div key={i} className="p-3 border rounded" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="text-[11px] font-bold" style={{ color: 'var(--text-primary)' }}>{strategy.technique}</h4>
                          <span className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-subtle)' }}>
                            {strategy.priority}
                          </span>
                        </div>
                        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{strategy.rationale}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </FadeUp>

              {/* Risk Projection & Next Steps */}
              <FadeUp delay={0.5}>
                <div className="p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: '4px' }}>
                  <div className="flex items-start gap-3 mb-4">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--text-primary)' }} />
                    <div>
                      <SectionLabel>Risk Projection</SectionLabel>
                      <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{report.risk_projection}</p>
                    </div>
                  </div>
                  
                  <div className="mt-5 pt-4 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                    <SectionLabel>Recommended Path</SectionLabel>
                    <div className="space-y-2">
                      {report.recommended_simulations.map((sim, i) => (
                        <div key={i} className="flex items-center justify-between p-2 border rounded" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
                          <div>
                            <p className="text-[11px] font-bold" style={{ color: 'var(--text-primary)' }}>{sim.type}</p>
                            <p className="text-[9px] uppercase tracking-wider mt-0.5" style={{ color: 'var(--text-muted)' }}>Targets: {sim.targets_weakness.replace('_', ' ')}</p>
                          </div>
                          <span className="text-[9px] font-bold mono-data" style={{ color: 'var(--text-primary)' }}>{sim.difficulty}</span>
                        </div>
                      ))}
                    </div>
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
