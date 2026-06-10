import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip,
} from 'recharts';
import { AlertTriangle } from 'lucide-react';
import client from '@/api/client';

interface DistractionEntry {
  type: string;
  total: number;
  fail_rate: number;
  safe_rate: number;
}

const LABELS: Record<string, string> = {
  incoming_call:           'Calls',
  whatsapp_notification:   'WhatsApp',
  gps_rerouting:           'GPS',
  email_alert:             'Email',
  social_media:            'Social',
  sms_notification:        'SMS',
  music_notification:      'Music',
  passenger_distraction:   'Passenger',
};

async function fetchDistractionMap(): Promise<DistractionEntry[]> {
  const res = await client.get('/insights/distraction-map');
  return res.data;
}

// Custom tooltip
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="rounded-xl bg-slate-900/95 border border-white/10 px-3 py-2 text-xs shadow-xl">
      <p className="font-bold text-white">{d.payload.subject}</p>
      <p className="text-red-400">Fail rate: {Math.round(d.payload.failRate * 100)}%</p>
      <p className="text-muted">Total events: {d.payload.total}</p>
    </div>
  );
}

export default function DistractionHeatmap() {
  const [data, setData] = useState<DistractionEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDistractionMap()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="h-64 rounded-2xl border border-white/8 bg-white/3 animate-pulse" />;
  }

  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-white/8 bg-white/3 p-5 text-center">
        <AlertTriangle className="w-7 h-7 text-amber-400 mx-auto mb-2" />
        <p className="text-sm text-muted">Complete sessions to reveal your distraction heatmap.</p>
      </div>
    );
  }

  const radarData = data.map(d => ({
    subject: LABELS[d.type] || d.type,
    failRate: d.fail_rate,
    safeRate: d.safe_rate,
    total: d.total,
    // recharts needs a numeric value 0-100
    value: Math.round(d.fail_rate * 100),
  }));

  // Sort by fail rate descending for the danger list
  const sorted = [...data].sort((a, b) => b.fail_rate - a.fail_rate);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/8 bg-white/3 p-5"
    >
      <h2 className="text-sm font-black text-white uppercase tracking-widest mb-1 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-red-400" />
        Distraction Vulnerability Map
      </h2>
      <p className="text-xs text-muted mb-4">Higher = more likely to fail that distraction type</p>

      {/* Radar Chart */}
      <div className="h-56 w-full mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData} margin={{ top: 8, right: 20, bottom: 8, left: 20 }}>
            <PolarGrid stroke="rgba(255,255,255,0.08)" />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Radar
              name="Fail Rate %"
              dataKey="value"
              stroke="#ef4444"
              fill="#ef4444"
              fillOpacity={0.15}
              strokeWidth={2}
              dot={{ fill: '#ef4444', r: 3 }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Ranked list */}
      <div className="space-y-2">
        {sorted.slice(0, 4).map((d, i) => (
          <div key={d.type} className="flex items-center gap-3">
            <span className={`text-[11px] font-black w-5 text-right ${
              i === 0 ? 'text-red-400' : i === 1 ? 'text-orange-400' : 'text-muted'
            }`}>#{i + 1}</span>
            <span className="text-xs font-bold text-white flex-1">
              {LABELS[d.type] || d.type}
            </span>
            <div className="flex-1 h-1.5 rounded-full bg-white/8 overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${
                  d.fail_rate > 0.6 ? 'bg-red-400' : d.fail_rate > 0.3 ? 'bg-orange-400' : 'bg-emerald-400'
                }`}
                initial={{ width: 0 }}
                animate={{ width: `${d.fail_rate * 100}%` }}
                transition={{ duration: 0.8, delay: i * 0.1, ease: 'easeOut' }}
              />
            </div>
            <span className={`text-[11px] font-bold w-10 text-right ${
              d.fail_rate > 0.6 ? 'text-red-400' : d.fail_rate > 0.3 ? 'text-orange-400' : 'text-emerald-400'
            }`}>
              {Math.round(d.fail_rate * 100)}%
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
