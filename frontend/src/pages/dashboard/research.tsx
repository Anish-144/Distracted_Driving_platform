import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import AppShell from '@/components/layout/AppShell';
import { FadeUp } from '@/components/motion/ScrollReveal';
import client from '@/api/client';
import { BarChart3, Target, Activity, ZapOff, Clock, ShieldAlert, GitBranch, ArrowRight } from 'lucide-react';

interface ObservabilityMetrics {
  total_interventions_tracked: number;
  unsafe_decision_reduction_pct: number;
  authority_success_rate_pct: number;
  cognitive_overload_failure_pct: number;
  avg_hesitation_recovery_sec: number;
  intervention_fatigue_index: number;
}

const CARD = 'bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden relative';

export default function ResearchDashboard() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<ObservabilityMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const res = await client.get('/ai/observability/metrics');
        setMetrics(res.data);
      } catch (err) {
        console.error('Failed to fetch observability metrics', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchMetrics();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Behavioral Observability — SafeDrive AI</title>
      </Head>

      <AppShell>
        <div className="max-w-4xl mx-auto">
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
              Research-grade analytics tracking longitudinal behavioral adaptation, cognitive overload recovery, and intervention effectiveness. This data is deterministically calculated directly from the backend intervention log.
            </p>
          </FadeUp>

          {/* Metrics Grid */}
          {metrics && metrics.total_interventions_tracked > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
              
              {/* Unsafe Reduction */}
              <FadeUp delay={0.1}>
                <div className={`${CARD} p-6 border-l-4 border-l-green-500`}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 rounded-lg bg-green-50">
                      <ShieldAlert className="w-5 h-5 text-green-600" />
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Adaptation</span>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-600 mb-1">Unsafe Decision Reduction</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-gray-900">{metrics.unsafe_decision_reduction_pct}%</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100 leading-relaxed">
                    <strong className="text-gray-700">Explainability:</strong> Frequency drop of impulsive/unsafe decisions between your first and last simulation sessions following AI interventions.
                  </p>
                </div>
              </FadeUp>

              {/* Authority Success */}
              <FadeUp delay={0.2}>
                <div className={`${CARD} p-6 border-l-4 border-l-indigo-500`}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 rounded-lg bg-indigo-50">
                      <Target className="w-5 h-5 text-indigo-600" />
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Intervention</span>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-600 mb-1">Authority Success Rate</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-gray-900">{metrics.authority_success_rate_pct}%</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100 leading-relaxed">
                    <strong className="text-gray-700">Explainability:</strong> Rate at which high-pressure &quot;Authority&quot; escalation successfully forced a safe decision on the subsequent event.
                  </p>
                </div>
              </FadeUp>

              {/* Cognitive Overload Failure */}
              <FadeUp delay={0.3}>
                <div className={`${CARD} p-6 border-l-4 border-l-orange-500`}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 rounded-lg bg-orange-50">
                      <ZapOff className="w-5 h-5 text-orange-600" />
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Stress Test</span>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-600 mb-1">Cognitive Overload Failure</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-gray-900">{metrics.cognitive_overload_failure_pct}%</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100 leading-relaxed">
                    <strong className="text-gray-700">Explainability:</strong> Likelihood of an unsafe decision when exposed to multiple simultaneous distractions (layered stress).
                  </p>
                </div>
              </FadeUp>

              {/* Hesitation Recovery */}
              <FadeUp delay={0.4}>
                <div className={`${CARD} p-6 border-l-4 border-l-blue-500`}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 rounded-lg bg-blue-50">
                      <Clock className="w-5 h-5 text-blue-600" />
                    </div>
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
              
              {/* Fatigue Index */}
              <FadeUp delay={0.5} className="md:col-span-2">
                <div className={`${CARD} p-6 bg-gradient-to-r from-gray-900 to-gray-800 text-white`}>
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
                        <strong className="text-gray-300">Explainability:</strong> The rate at which interventions become less effective over long sessions. A high index means the driver ignores coaching as time goes on.
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
        </div>
      </AppShell>
    </>
  );
}
