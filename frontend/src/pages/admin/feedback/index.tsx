import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { MessageSquare, CheckCircle, Clock, Search, Filter } from 'lucide-react';
import { getAdminFeedback, getFeedbackAnalytics, FeedbackListResponse, FeedbackAnalyticsResponse, FeedbackType, FeedbackStatus } from '@/api/feedback';
import Navbar from '@/components/layout/Navbar';
import AIFeedbackInsights from '@/components/admin/AIFeedbackInsights';

export default function FeedbackDashboard() {
  const router = useRouter();
  
  const [data, setData] = useState<FeedbackListResponse | null>(null);
  const [analytics, setAnalytics] = useState<FeedbackAnalyticsResponse | null>(null);
  
  const [page, setPage] = useState(1);
  const [filterType, setFilterType] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  
  useEffect(() => {
    loadData();
  }, [page, filterType, filterStatus]);

  const loadData = async () => {
    try {
      const [listRes, statsRes] = await Promise.all([
        getAdminFeedback({ page, size: 20, type: filterType || undefined, status: filterStatus || undefined }),
        getFeedbackAnalytics()
      ]);
      setData(listRes);
      setAnalytics(statsRes);
    } catch (e) {
      console.error('Failed to load feedback admin data', e);
    }
  };

  const statusColors = {
    open: 'bg-red-500/10 text-red-500 border-red-500/20',
    in_progress: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    resolved: 'bg-green-500/10 text-green-500 border-green-500/20',
    archived: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  };

  return (
    <div className="min-h-screen bg-primary flex flex-col">
      <Navbar />
      
      <main className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
            <div>
              <h1 className="text-3xl font-bold text-primary tracking-tight">Beta Feedback</h1>
              <p className="text-muted mt-1">Manage and track user testing feedback</p>
            </div>
          </div>

          {/* Metrics */}
          {analytics && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-secondary border border-subtle rounded-2xl p-5">
                <div className="flex items-center gap-3 text-muted mb-2">
                  <MessageSquare className="w-5 h-5" />
                  <h3 className="text-sm font-medium">Total Feedback</h3>
                </div>
                <p className="text-3xl font-bold text-primary">{analytics.total_feedback}</p>
              </div>
              <div className="bg-secondary border border-subtle rounded-2xl p-5">
                <div className="flex items-center gap-3 text-red-500 mb-2">
                  <AlertCircle className="w-5 h-5" />
                  <h3 className="text-sm font-medium text-muted">Open Issues</h3>
                </div>
                <p className="text-3xl font-bold text-red-500">{analytics.open_issues}</p>
              </div>
              <div className="bg-secondary border border-subtle rounded-2xl p-5">
                <div className="flex items-center gap-3 text-green-500 mb-2">
                  <CheckCircle className="w-5 h-5" />
                  <h3 className="text-sm font-medium text-muted">Resolved</h3>
                </div>
                <p className="text-3xl font-bold text-green-500">{analytics.resolved_issues}</p>
              </div>
              <div className="bg-secondary border border-subtle rounded-2xl p-5">
                <div className="flex items-center gap-3 text-yellow-500 mb-2">
                  <Star className="w-5 h-5" />
                  <h3 className="text-sm font-medium text-muted">Avg Rating</h3>
                </div>
                <p className="text-3xl font-bold text-primary">{analytics.avg_rating.toFixed(1)} <span className="text-muted text-lg">/ 5</span></p>
              </div>
            </div>
          )}

          {/* AI Insights */}
          <AIFeedbackInsights />

          {/* Table Controls */}
          <div className="bg-secondary border border-subtle rounded-2xl p-5 flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <select 
                value={filterType} 
                onChange={e => { setFilterType(e.target.value); setPage(1); }}
                className="bg-primary border border-subtle rounded-xl px-4 py-2 text-sm text-primary focus:ring-2 focus:ring-brand-500 outline-none w-full sm:w-auto"
              >
                <option value="">All Types</option>
                <option value="bug">Bugs</option>
                <option value="feature">Features</option>
                <option value="ux">UX</option>
                <option value="general">General</option>
              </select>
              <select 
                value={filterStatus} 
                onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
                className="bg-primary border border-subtle rounded-xl px-4 py-2 text-sm text-primary focus:ring-2 focus:ring-brand-500 outline-none w-full sm:w-auto"
              >
                <option value="">All Statuses</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-secondary border border-subtle rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-primary/50 text-muted uppercase tracking-wider text-xs border-b border-subtle">
                  <tr>
                    <th className="px-6 py-4 font-medium">Type</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Comment Preview</th>
                    <th className="px-6 py-4 font-medium">Platform</th>
                    <th className="px-6 py-4 font-medium">Date</th>
                    <th className="px-6 py-4 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-subtle">
                  {data?.items.map((fb) => (
                    <tr key={fb.id} className="hover:bg-primary/30 transition-colors">
                      <td className="px-6 py-4">
                        <span className="capitalize font-medium text-primary">{fb.type}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wide border ${statusColors[fb.status]}`}>
                          {fb.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 max-w-[300px] truncate text-muted">
                        {fb.comment}
                      </td>
                      <td className="px-6 py-4 text-muted text-xs">
                        {fb.device_type} • {fb.browser}
                      </td>
                      <td className="px-6 py-4 text-muted">
                        {new Date(fb.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link href={`/admin/feedback/${fb.id}`} className="text-brand-500 hover:text-brand-600 font-medium">
                          Investigate &rarr;
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {data?.items.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-muted">
                        No feedback found matching the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {data && data.total > data.size && (
              <div className="p-4 border-t border-subtle flex items-center justify-between">
                <span className="text-sm text-muted">
                  Showing {(page - 1) * data.size + 1} to {Math.min(page * data.size, data.total)} of {data.total} results
                </span>
                <div className="flex gap-2">
                  <button 
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                    className="px-3 py-1 bg-primary border border-subtle rounded-lg text-sm disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button 
                    disabled={page * data.size >= data.total}
                    onClick={() => setPage(p => p + 1)}
                    className="px-3 py-1 bg-primary border border-subtle rounded-lg text-sm disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}

// Ensure icons used implicitly are available
import { Star, AlertCircle } from 'lucide-react';
