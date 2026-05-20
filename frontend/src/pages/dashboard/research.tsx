import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import AppShell from '@/components/layout/AppShell';
import { FadeUp } from '@/components/motion/ScrollReveal';
import client from '@/api/client';
import { motion } from 'framer-motion';
import {
  BarChart3, Target, Activity, ZapOff, Clock, ShieldAlert,
  GitBranch, ArrowRight, Brain, Eye, Zap, Shield, AlertTriangle,
  CheckCircle2, XCircle, Info
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ObservabilityMetrics {
  total_interventions_tracked: number;
  unsafe_decision_reduction_pct: number;
  authority_success_rate_pct: number;
  cognitive_overload_failure_pct: number;
  avg_hesitation_recovery_sec: number;
  intervention_fatigue_index: number;
}

interface PsychologicalMetrics {
  self_awareness_score: number;
  emotional_susceptibility_score: number;
  authority_pressure_index: number;
  cognitive_overload_score: number;
  behavioral_consistency_score: number;
  impulsiveness_mismatch_pct: number;
  attention_mismatch_pct: number;
  emotional_mismatch_pct: number;
  onboarding_profile_label: string;
  has_completed_assessment: boolean;
  total_simulations_since_assessment: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CARD = 'bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden relative';
const DARK_CARD = 'bg-gray-900 rounded-2xl border border-gray-800 shadow-sm overflow-hidden relative';

const PROFILE_LABELS: Record<string, string> = {
  impulsive: 'Impulsive Reactor',
  distracted: 'Attention Fragmenter',
  hesitant: 'Deliberate Hesitator',
  risk_seeking: 'Risk-Oriented',
  cautious: 'Cautious Controller',
  emotionally_reactive: 'Emotionally Reactive',
  authority_driven: 'Authority-Compliant',
  balanced: 'Balanced Processor',
  unknown: 'Not Assessed',
};

// ── Gauge Component ───────────────────────────────────────────────────────────

function ScoreGauge({
  value,
  label,
  sublabel,
  color,
  inverse = false,
}: {
  value: number;
  label: string;
  sublabel: string;
  color: string;
  inverse?: boolean;
}) {
  const pct = Math.round(value * 100);
  const display = inverse ? 100 - pct : pct;
  const isGood = inverse ? pct <= 40 : pct >= 60;
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-20 h-20 mb-3">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="30" fill="none" stroke="#f3f4f6" strokeWidth="8" />
          <motion.circle
            cx="40" cy="40" r="30" fill="none"
            stroke={color} strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 30}`}
            initial={{ strokeDashoffset: 2 * Math.PI * 30 }}
            animate={{ strokeDashoffset: 2 * Math.PI * 30 * (1 - value) }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-extrabold text-gray-900">{Math.round(value * 100)}%</span>
        </div>
      </div>
      <p className="text-xs font-bold text-gray-700 text-center leading-tight">{label}</p>
      <p className="text-[10px] text-gray-400 text-center mt-0.5">{sublabel}</p>
    </div>
  );
}

// ── Mismatch Bar ──────────────────────────────────────────────────────────────

function MismatchBar({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: any;
}) {
  const isLow = value < 15;
  const isMed = value >= 15 && value < 35;
  const color = isLow ? '#10b981' : isMed ? '#f59e0b' : '#ef4444';
  const severity = isLow ? 'Low divergence' : isMed ? 'Moderate divergence' : 'High divergence';

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-gray-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-gray-700">{label}</span>
          <span className="text-xs font-bold" style={{ color }}>{value.toFixed(1)}%</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: color }}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(value, 100)}%` }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
        <p className="text-[10px] text-gray-400 mt-0.5">{severity}</p>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ResearchDashboard() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<ObservabilityMetrics | null>(null);
  const [psychMetrics, setPsychMetrics] = useState<PsychologicalMetrics | null>(null);
  const [activeTab, setActiveTab] = useState<'behavioral' | 'psychological'>('behavioral');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      try {
        const [obs, psych] = await Promise.all([
          client.get('/ai/observability/metrics'),
          client.get('/ai/psychological/metrics'),
        ]);
        setMetrics(obs.data);
        setPsychMetrics(psych.data);
      } catch (err) {
        console.error('Failed to fetch observability metrics', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchAll();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  const hasObservabilityData = metrics && metrics.total_interventions_tracked > 0;
  const hasPsychData = psychMetrics && psychMetrics.has_completed_assessment;

  return (
    <>
      <Head>
        <title>Behavioral Intelligence — SafeDrive AI</title>
        <meta name="description" content="Research-grade behavioral analytics and psychological intelligence metrics." />
      </Head>

      <AppShell>
        <div className="max-w-5xl mx-auto">

          {/* Header */}
          <FadeUp className="mb-8">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-indigo-600 mb-2">Longitudinal Intelligence</p>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-indigo-600" />
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Observability Engine</h1>
            </div>
            <p className="text-gray-500 text-sm max-w-2xl">
              Research-grade analytics spanning behavioral adaptation, psychological trait analysis, cognitive consistency, and intervention effectiveness.
            </p>
          </FadeUp>

          {/* Tab Navigation */}
          <FadeUp delay={0.05} className="mb-7">
            <div className="inline-flex bg-gray-100 rounded-xl p-1 gap-1">
              <button
                id="tab-behavioral"
                onClick={() => setActiveTab('behavioral')}
                className={`px-5 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${
                  activeTab === 'behavioral'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Behavioral Analytics
              </button>
              <button
                id="tab-psychological"
                onClick={() => setActiveTab('psychological')}
                className={`px-5 py-2 rounded-lg text-sm font-bold transition-all duration-200 flex items-center gap-2 ${
                  activeTab === 'psychological'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Brain className="w-4 h-4" />
                Psychological Profile
                {hasPsychData && (
                  <span className="w-2 h-2 rounded-full bg-violet-500 flex-shrink-0" />
                )}
              </button>
            </div>
          </FadeUp>

          {/* ── BEHAVIORAL ANALYTICS TAB ──────────────────────────────── */}
          {activeTab === 'behavioral' && (
            <>
              {hasObservabilityData ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">

                  <FadeUp delay={0.1}>
                    <div className={`${CARD} p-6 border-l-4 border-l-green-500`}>
                      <div className="flex justify-between items-start mb-4">
                        <div className="p-2 rounded-lg bg-green-50"><ShieldAlert className="w-5 h-5 text-green-600" /></div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Adaptation</span>
                      </div>
                      <h3 className="text-sm font-semibold text-gray-600 mb-1">Unsafe Decision Reduction</h3>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-gray-900">{metrics.unsafe_decision_reduction_pct}%</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100 leading-relaxed">
                        <strong className="text-gray-700">Explainability:</strong> Frequency drop of impulsive/unsafe decisions between your first and last simulation sessions.
                      </p>
                    </div>
                  </FadeUp>

                  <FadeUp delay={0.2}>
                    <div className={`${CARD} p-6 border-l-4 border-l-indigo-500`}>
                      <div className="flex justify-between items-start mb-4">
                        <div className="p-2 rounded-lg bg-indigo-50"><Target className="w-5 h-5 text-indigo-600" /></div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Intervention</span>
                      </div>
                      <h3 className="text-sm font-semibold text-gray-600 mb-1">Authority Success Rate</h3>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-gray-900">{metrics.authority_success_rate_pct}%</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100 leading-relaxed">
                        <strong className="text-gray-700">Explainability:</strong> Rate at which authority escalation successfully forced a safe decision on the subsequent event.
                      </p>
                    </div>
                  </FadeUp>

                  <FadeUp delay={0.3}>
                    <div className={`${CARD} p-6 border-l-4 border-l-orange-500`}>
                      <div className="flex justify-between items-start mb-4">
                        <div className="p-2 rounded-lg bg-orange-50"><ZapOff className="w-5 h-5 text-orange-600" /></div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Stress Test</span>
                      </div>
                      <h3 className="text-sm font-semibold text-gray-600 mb-1">Cognitive Overload Failure</h3>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-gray-900">{metrics.cognitive_overload_failure_pct}%</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100 leading-relaxed">
                        <strong className="text-gray-700">Explainability:</strong> Likelihood of an unsafe decision when exposed to multiple simultaneous distractions.
                      </p>
                    </div>
                  </FadeUp>

                  <FadeUp delay={0.4}>
                    <div className={`${CARD} p-6 border-l-4 border-l-blue-500`}>
                      <div className="flex justify-between items-start mb-4">
                        <div className="p-2 rounded-lg bg-blue-50"><Clock className="w-5 h-5 text-blue-600" /></div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Processing</span>
                      </div>
                      <h3 className="text-sm font-semibold text-gray-600 mb-1">Avg Hesitation Recovery</h3>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-gray-900">{metrics.avg_hesitation_recovery_sec}</span>
                        <span className="text-sm font-semibold text-gray-500">sec</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100 leading-relaxed">
                        <strong className="text-gray-700">Explainability:</strong> Average response time immediately following a severe cognitive distraction event.
                      </p>
                    </div>
                  </FadeUp>

                  <FadeUp delay={0.5} className="md:col-span-2">
                    <div className={`${DARK_CARD} p-6 text-white`}>
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Activity className="w-4 h-4 text-gray-400" />
                            <h3 className="text-sm font-semibold text-gray-300">Intervention Fatigue Index</h3>
                          </div>
                          <div className="flex items-baseline gap-2 mb-2">
                            <span className="text-4xl font-extrabold text-white">{metrics.intervention_fatigue_index}%</span>
                          </div>
                          <p className="text-xs text-gray-400 max-w-md">
                            <strong className="text-gray-300">Explainability:</strong> The rate at which AI coaching becomes less effective over long sessions. A high index means the driver starts ignoring interventions.
                          </p>
                        </div>
                        <div className="flex-shrink-0 bg-gray-800 p-4 rounded-xl border border-gray-700">
                          <p className="text-xs text-gray-400 mb-1 uppercase tracking-wider font-bold">Total Interventions</p>
                          <p className="text-2xl font-bold text-white">{metrics.total_interventions_tracked} recorded</p>
                        </div>
                      </div>
                    </div>
                  </FadeUp>
                </div>
              ) : (
                <div className="text-center py-16 bg-white border border-gray-200 rounded-2xl">
                  <GitBranch className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Awaiting Longitudinal Data</h3>
                  <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
                    The Observability Engine requires at least one complete session to generate research-grade behavioral insights.
                  </p>
                  <button
                    onClick={() => router.push('/simulation')}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl flex items-center gap-2 mx-auto transition-colors"
                  >
                    Run Simulation <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}

          {/* ── PSYCHOLOGICAL PROFILE TAB ────────────────────────────── */}
          {activeTab === 'psychological' && (
            <>
              {!hasPsychData ? (
                <div className="text-center py-16 bg-white border border-gray-200 rounded-2xl">
                  <Brain className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Assessment Not Completed</h3>
                  <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
                    Complete the Behavioral Assessment to unlock psychological trait analysis, self-awareness scores, and consistency metrics.
                  </p>
                  <button
                    onClick={() => router.push('/onboarding')}
                    className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold rounded-xl flex items-center gap-2 mx-auto transition-colors"
                  >
                    <Brain className="w-4 h-4" />
                    Take Assessment <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-5">

                  {/* Profile Header */}
                  <FadeUp>
                    <div className={`${CARD} p-6`}>
                      <div className="flex items-start gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                          <Brain className="w-7 h-7 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="text-[11px] font-bold uppercase tracking-widest text-violet-600 mb-1">Onboarding Profile</p>
                          <h2 className="text-2xl font-extrabold text-gray-900 mb-1">
                            {PROFILE_LABELS[psychMetrics!.onboarding_profile_label] || 'Unknown Profile'}
                          </h2>
                          <p className="text-sm text-gray-500">
                            Based on {psychMetrics!.total_simulations_since_assessment} simulation session(s) since assessment.
                          </p>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Self-Awareness</p>
                          <p className="text-3xl font-extrabold text-gray-900">
                            {Math.round(psychMetrics!.self_awareness_score * 100)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  </FadeUp>

                  {/* Score Gauges */}
                  <FadeUp delay={0.1}>
                    <div className={`${CARD} p-6`}>
                      <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-6">Psychological Vulnerability Scores</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <ScoreGauge
                          value={psychMetrics!.emotional_susceptibility_score}
                          label="Emotional Susceptibility"
                          sublabel="React to urgency cues"
                          color="#ef4444"
                        />
                        <ScoreGauge
                          value={psychMetrics!.authority_pressure_index}
                          label="Authority Pressure Index"
                          sublabel="Compliance to authority"
                          color="#f59e0b"
                        />
                        <ScoreGauge
                          value={psychMetrics!.cognitive_overload_score}
                          label="Overload Risk"
                          sublabel="Under compound load"
                          color="#8b5cf6"
                        />
                        <ScoreGauge
                          value={psychMetrics!.behavioral_consistency_score}
                          label="Behavioral Consistency"
                          sublabel="Self vs simulation match"
                          color="#10b981"
                          inverse
                        />
                      </div>
                    </div>
                  </FadeUp>

                  {/* Behavioral Consistency Analysis */}
                  <FadeUp delay={0.2}>
                    <div className={`${CARD} p-6`}>
                      <div className="flex items-center justify-between mb-5">
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1">Consistency Analysis</p>
                          <h3 className="text-base font-bold text-gray-900">Self-Perception vs Actual Behavior</h3>
                        </div>
                        <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full ${
                          psychMetrics!.behavioral_consistency_score >= 0.75
                            ? 'bg-green-50 text-green-700 border border-green-100'
                            : psychMetrics!.behavioral_consistency_score >= 0.5
                            ? 'bg-amber-50 text-amber-700 border border-amber-100'
                            : 'bg-red-50 text-red-700 border border-red-100'
                        }`}>
                          {psychMetrics!.behavioral_consistency_score >= 0.75
                            ? <><CheckCircle2 className="w-3.5 h-3.5" /> High Consistency</>
                            : psychMetrics!.behavioral_consistency_score >= 0.5
                            ? <><AlertTriangle className="w-3.5 h-3.5" /> Moderate Mismatch</>
                            : <><XCircle className="w-3.5 h-3.5" /> Significant Divergence</>
                          }
                        </div>
                      </div>

                      {/* Mismatch dimensions */}
                      {psychMetrics!.total_simulations_since_assessment > 0 ? (
                        <div className="mt-4">
                          <MismatchBar
                            label="Impulsiveness Mismatch"
                            value={psychMetrics!.impulsiveness_mismatch_pct}
                            icon={Zap}
                          />
                          <MismatchBar
                            label="Attention Control Mismatch"
                            value={psychMetrics!.attention_mismatch_pct}
                            icon={Eye}
                          />
                          <MismatchBar
                            label="Emotional Stability Mismatch"
                            value={psychMetrics!.emotional_mismatch_pct}
                            icon={Activity}
                          />
                        </div>
                      ) : (
                        <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl p-4 mt-2">
                          <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-blue-700 leading-relaxed">
                            Complete at least one simulation session to enable cross-session consistency analysis. Mismatch scores compare your self-reported traits to your actual in-simulation behavior.
                          </p>
                        </div>
                      )}
                    </div>
                  </FadeUp>

                  {/* Explanation */}
                  <FadeUp delay={0.3}>
                    <div className={`${DARK_CARD} p-6 text-white`}>
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                          <Shield className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white mb-2">What is the Consistency Score?</h3>
                          <p className="text-xs text-gray-400 leading-relaxed">
                            The behavioral consistency score (0–100%) measures how accurately your self-reported personality matches your actual simulation behavior. A score of 100% means you perfectly predict your own reactions. Scores below 60% indicate a cognitive gap between your self-model and your instinctive responses — a high-value insight for targeted training.
                          </p>
                          <p className="text-xs text-gray-500 mt-3">
                            This metric updates automatically after each simulation session.
                          </p>
                        </div>
                      </div>
                    </div>
                  </FadeUp>

                </div>
              )}
            </>
          )}

        </div>
      </AppShell>
    </>
  );
}
