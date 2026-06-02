import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import AppShell from '@/components/layout/AppShell';
import { ShieldCheck, Activity, Users, Car, Target, TrendingUp, AlertTriangle } from 'lucide-react';
import { 
  getPlatformKPIs, 
  getLeaderboards, 
  getBehavioralDistribution, 
  getPlatformAIInsights, 
  regeneratePlatformAIInsights,
  PlatformKPIs,
  Leaderboards,
  BehavioralDistributionItem,
  AIPlatformInsights
} from '@/api/admin';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { motion } from 'framer-motion';

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6366f1'];

export default function AdminDashboard() {
  const [kpis, setKpis] = useState<PlatformKPIs | null>(null);
  const [leaderboards, setLeaderboards] = useState<Leaderboards | null>(null);
  const [distribution, setDistribution] = useState<BehavioralDistributionItem[]>([]);
  const [insights, setInsights] = useState<AIPlatformInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [insightsLoading, setInsightsLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [kpiData, leaderData, distData, insightsData] = await Promise.all([
          getPlatformKPIs(),
          getLeaderboards(),
          getBehavioralDistribution(),
          getPlatformAIInsights()
        ]);
        setKpis(kpiData);
        setLeaderboards(leaderData);
        setDistribution(distData.distribution);
        setInsights(insightsData);
      } catch (err) {
        console.error('Failed to load admin dashboard', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleRegenerateInsights = async () => {
    setInsightsLoading(true);
    try {
      const data = await regeneratePlatformAIInsights();
      setInsights(data);
    } catch (err) {
      console.error(err);
    } finally {
      setInsightsLoading(false);
    }
  };

  if (loading) return (
    <AppShell>
      <div className="flex h-full items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    </AppShell>
  );

  return (
    <AppShell>
      <Head>
        <title>Admin Dashboard | SafeDrive AI</title>
      </Head>
      <div className="p-6 max-w-7xl mx-auto flex flex-col gap-8 h-full overflow-y-auto pb-20">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary tracking-tight">Executive Dashboard</h1>
            <p className="text-muted mt-1">Platform operations and behavioral intelligence command center.</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-tertiary flex items-center justify-center border border-subtle shadow-inner">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
        </div>

        {/* SECTION A: KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard title="Total Users" value={kpis?.total_users} icon={Users} color="text-blue-500" />
          <KPICard title="Active (30d)" value={kpis?.active_users_30d} icon={Activity} color="text-green-500" />
          <KPICard title="Sessions Completed" value={kpis?.total_sessions_completed} icon={Car} color="text-purple-500" />
          <KPICard title="Avg Safety Score" value={kpis?.average_safety_score} suffix="/100" icon={Target} color="text-amber-500" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* SECTION I: Executive AI Insights */}
          <div className="xl:col-span-2 bg-secondary border border-subtle rounded-2xl p-6 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-brand-gradient flex items-center justify-center shadow-lg">
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-lg font-bold text-primary">AI Executive Report</h2>
              </div>
              <button 
                onClick={handleRegenerateInsights}
                disabled={insightsLoading}
                className="px-4 py-2 bg-tertiary hover:bg-subtle text-primary text-sm font-semibold rounded-lg transition-colors border border-subtle flex items-center gap-2"
              >
                {insightsLoading ? (
                  <span className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
                ) : null}
                {insightsLoading ? 'Analyzing...' : 'Regenerate'}
              </button>
            </div>
            {insights?.error ? (
              <p className="text-red-500">{insights.error}</p>
            ) : (
              <div className="prose prose-invert max-w-none text-sm text-secondary flex-1">
                {insights?.summary?.split('\n').map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            )}
            <div className="mt-4 pt-4 border-t border-subtle text-xs text-muted">
              Cached: {insights?.cached_at ? new Date(insights.cached_at).toLocaleString() : 'N/A'}
            </div>
          </div>

          {/* SECTION C: Behavioral Intelligence */}
          <div className="bg-secondary border border-subtle rounded-2xl p-6 shadow-sm flex flex-col items-center">
            <h2 className="text-lg font-bold text-primary w-full mb-4">Behavioral Distribution</h2>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="count"
                  >
                    {distribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)', borderRadius: '8px' }}
                    itemStyle={{ color: 'var(--text-primary)' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', color: 'var(--text-muted)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* SECTION B: Leaderboards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LeaderboardCard 
            title="Top Performing Drivers" 
            icon={Target} 
            data={leaderboards?.top_drivers || []} 
            columns={['Rank', 'Name', 'Score', 'Sessions']} 
            type="top"
          />
          <LeaderboardCard 
            title="Highest Risk Drivers" 
            icon={AlertTriangle} 
            data={leaderboards?.high_risk_drivers || []} 
            columns={['Risk Profile', 'Name', 'Score', 'Interventions']} 
            type="risk"
          />
        </div>

      </div>
    </AppShell>
  );
}

function KPICard({ title, value, icon: Icon, color, suffix = '' }: any) {
  return (
    <div className="bg-secondary border border-subtle rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
      <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
        <Icon className="w-32 h-32" />
      </div>
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 rounded-lg bg-tertiary ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <h3 className="text-sm font-medium text-muted">{title}</h3>
      </div>
      <p className="text-3xl font-bold text-primary mt-2">
        {value ?? '-'} <span className="text-lg text-muted font-medium">{suffix}</span>
      </p>
    </div>
  );
}

function LeaderboardCard({ title, icon: Icon, data, columns, type }: any) {
  return (
    <div className="bg-secondary border border-subtle rounded-2xl p-6 shadow-sm overflow-hidden flex flex-col">
      <div className="flex items-center gap-3 mb-6">
        <div className={`p-2 rounded-lg bg-tertiary ${type === 'risk' ? 'text-red-500' : 'text-emerald-500'}`}>
          <Icon className="w-5 h-5" />
        </div>
        <h2 className="text-lg font-bold text-primary">{title}</h2>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-muted uppercase bg-tertiary/50">
            <tr>
              {columns.map((c: string) => <th key={c} className="px-4 py-3 font-semibold">{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-muted">No data available</td>
              </tr>
            )}
            {data.map((row: any, i: number) => (
              <motion.tr 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                key={row.id} 
                className="border-b border-subtle last:border-0 hover:bg-tertiary/50 transition-colors"
              >
                {type === 'top' ? (
                  <>
                    <td className="px-4 py-3 font-medium text-primary">#{row.rank}</td>
                    <td className="px-4 py-3">{row.name}</td>
                    <td className="px-4 py-3 font-bold text-emerald-500">{row.average_score}</td>
                    <td className="px-4 py-3 text-muted">{row.sessions_completed}</td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded-full bg-red-500/10 text-red-500 text-[10px] font-bold uppercase tracking-wider">
                        {row.risk_classification}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-primary">{row.name}</td>
                    <td className="px-4 py-3 font-bold text-amber-500">{row.average_score}</td>
                    <td className="px-4 py-3 text-muted">{row.intervention_count} triggers</td>
                  </>
                )}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
