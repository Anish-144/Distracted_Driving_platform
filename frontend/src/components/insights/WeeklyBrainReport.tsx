import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Brain, TrendingUp, TrendingDown, Target, AlertTriangle, CheckCircle } from 'lucide-react';
import client from '@/api/client';

interface WeeklyReport {
  sessions_this_week: number;
  avg_score: number;
  best_score: number;
  worst_distraction: string;
  best_distraction: string;
  distraction_breakdown: {
    distraction_type: string;
    total: number;
    unsafe: number;
    safe_rate: number;
  }[];
  improvement_vs_last_week: number;
  streak_status: string;
}

const DISTRACTION_LABELS: Record<string, string> = {
  incoming_call:           '📱 Incoming Call',
  whatsapp_notification:   '💬 WhatsApp',
  gps_rerouting:           '🗺️ GPS Alert',
  email_alert:             '📧 Email',
  social_media:            '📸 Social Media',
};

async function fetchWeeklyReport(): Promise<WeeklyReport> {
  const res = await client.get('/insights/weekly-report');
  return res.data;
}

export default function WeeklyBrainReport() {
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWeeklyReport()
      .then(setReport)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/8 bg-white/3 p-5 animate-pulse h-40" />
    );
  }

  if (!report || report.sessions_this_week === 0) {
    return (
      <div className="rounded-2xl border border-white/8 bg-white/3 p-5 text-center">
        <Brain className="w-8 h-8 text-brand-400 mx-auto mb-2" />
        <p className="text-sm text-muted">Complete sessions this week to unlock your brain report.</p>
      </div>
    );
  }

  const improved = report.improvement_vs_last_week >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-brand-500/20 bg-brand-500/5 p-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-black text-white flex items-center gap-2">
          <Brain className="w-4 h-4 text-brand-400" />
          This Week in Your Brain
        </h2>
        <span className="text-[11px] font-bold text-brand-400 bg-brand-500/10 rounded-full px-2.5 py-0.5">
          {report.streak_status}
        </span>
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { label: 'Sessions', value: report.sessions_this_week, color: 'text-white' },
          { label: 'Avg Score', value: `${report.avg_score}%`, color: 'text-brand-400' },
          { label: 'Best', value: `${report.best_score}%`, color: 'text-emerald-400' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl bg-white/5 p-2.5 text-center">
            <div className={`text-lg font-black ${s.color}`}>{s.value}</div>
            <div className="text-[10px] text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Improvement vs last week */}
      <div className={`flex items-center gap-2 rounded-xl p-3 mb-4 ${
        improved ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-orange-500/10 border border-orange-500/20'
      }`}>
        {improved
          ? <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
          : <TrendingDown className="w-4 h-4 text-orange-400 shrink-0" />
        }
        <p className={`text-xs font-bold ${improved ? 'text-emerald-400' : 'text-orange-400'}`}>
          {improved ? '+' : ''}{report.improvement_vs_last_week}% vs last week
          {improved ? ' — you\'re improving! 🔥' : ' — push harder this week!'}
        </p>
      </div>

      {/* Danger / strength zones */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-xs">
          <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
          <span className="text-muted font-medium">Danger zone:</span>
          <span className="font-bold text-red-400">{DISTRACTION_LABELS[report.worst_distraction] || report.worst_distraction}</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="text-muted font-medium">Strength:</span>
          <span className="font-bold text-emerald-400">{DISTRACTION_LABELS[report.best_distraction] || report.best_distraction}</span>
        </div>
      </div>

      {/* Distraction breakdown bars */}
      {report.distraction_breakdown.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-muted uppercase tracking-widest">Distraction breakdown</p>
          {report.distraction_breakdown.slice(0, 4).map((d, i) => (
            <div key={d.distraction_type}>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-muted">{DISTRACTION_LABELS[d.distraction_type] || d.distraction_type}</span>
                <span className={`font-bold ${d.safe_rate >= 0.7 ? 'text-emerald-400' : d.safe_rate >= 0.4 ? 'text-amber-400' : 'text-red-400'}`}>
                  {Math.round(d.safe_rate * 100)}% safe
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${d.safe_rate >= 0.7 ? 'bg-emerald-400' : d.safe_rate >= 0.4 ? 'bg-amber-400' : 'bg-red-400'}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${d.safe_rate * 100}%` }}
                  transition={{ duration: 0.8, delay: i * 0.1, ease: 'easeOut' }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
