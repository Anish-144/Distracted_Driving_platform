import { useState, useEffect } from 'react';
import { Sparkles, Loader2, AlertCircle, RefreshCw, Clock } from 'lucide-react';
import { getFeedbackAIInsights, regenerateFeedbackAIInsights } from '@/api/feedback';

export default function AIFeedbackInsights() {
  const [insights, setInsights] = useState<{ insights?: string; summary?: string; analyzed_count?: number; cached_at?: string; error?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchInsights = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getFeedbackAIInsights();
      if (data.error) throw new Error(data.error);
      setInsights(data);
    } catch (err: any) {
      setError(err.message || 'Failed to generate AI insights.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await regenerateFeedbackAIInsights();
      if (data.error) throw new Error(data.error);
      setInsights(data);
    } catch (err: any) {
      setError(err.message || 'Failed to regenerate AI insights.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  return (
    <div className="bg-secondary border border-brand-500/20 rounded-2xl p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 -mr-16 -mt-16 text-brand-500/5">
        <Sparkles className="w-64 h-64" />
      </div>
      
      <div className="relative z-10 flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-primary flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-brand-500" />
          AI Testing Insights
        </h3>
        <button 
          onClick={handleRegenerate} 
          disabled={loading}
          className="text-xs font-medium text-brand-500 hover:text-brand-600 px-3 py-1 bg-brand-500/10 rounded-full transition-colors flex items-center gap-1 disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Analyzing...' : 'Regenerate'}
        </button>
      </div>

      <div className="relative z-10">
        {loading && (
          <div className="flex flex-col items-center justify-center py-8 text-muted">
            <Loader2 className="w-6 h-6 animate-spin mb-2" />
            <p className="text-sm">Synthesizing recent beta feedback...</p>
          </div>
        )}

        {!loading && error && (
          <div className="flex items-center gap-2 text-red-500 bg-red-500/10 p-4 rounded-xl text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {!loading && insights?.insights && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs font-medium text-muted tracking-wider">
              <span className="uppercase">Analyzed {insights.analyzed_count} open reports</span>
              {insights.cached_at && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Cached: {new Date(insights.cached_at).toLocaleString()}
                </span>
              )}
            </div>
            <div className="prose prose-sm prose-invert max-w-none text-primary/90 whitespace-pre-wrap">
              {insights.insights}
            </div>
          </div>
        )}

        {!loading && !error && !insights?.insights && (
          <p className="text-sm text-muted">No insights available or no open feedback to analyze.</p>
        )}
      </div>
    </div>
  );
}
