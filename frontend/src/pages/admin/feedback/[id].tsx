import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { ArrowLeft, Monitor, Smartphone, Globe, Clock, Star, Paperclip, Send, Loader2 } from 'lucide-react';
import { getAdminFeedbackDetail, updateFeedbackStatus, addFeedbackNote, Feedback, FeedbackStatus, FeedbackPriority } from '@/api/feedback';
import AppShell from '@/components/layout/AppShell';
import toast from 'react-hot-toast';

export default function FeedbackDetail() {
  const router = useRouter();
  const { id } = router.query;
  
  const [data, setData] = useState<Feedback | null>(null);
  const [newNote, setNewNote] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (id) loadData(id as string);
  }, [id]);

  const loadData = async (feedbackId: string) => {
    try {
      const res = await getAdminFeedbackDetail(feedbackId);
      setData(res);
    } catch (e) {
      toast.error('Failed to load feedback details');
    }
  };

  const handleStatusChange = async (status: FeedbackStatus) => {
    if (!data) return;
    setIsUpdating(true);
    try {
      const updated = await updateFeedbackStatus(data.id, status, undefined);
      setData(updated);
      toast.success('Status updated');
    } catch (e) {
      toast.error('Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePriorityChange = async (priority: FeedbackPriority) => {
    if (!data) return;
    setIsUpdating(true);
    try {
      const updated = await updateFeedbackStatus(data.id, undefined, priority);
      setData(updated);
      toast.success('Priority updated');
    } catch (e) {
      toast.error('Failed to update priority');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data || !newNote.trim()) return;
    setIsUpdating(true);
    try {
      const updated = await addFeedbackNote(data.id, newNote);
      setData(updated);
      setNewNote('');
      toast.success('Note added');
    } catch (e) {
      toast.error('Failed to add note');
    } finally {
      setIsUpdating(false);
    }
  };

  if (!data) {
    return <div className="min-h-screen bg-primary flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>;
  }

  const statusColors = {
    open: 'bg-red-500/10 text-red-500 border-red-500/20',
    in_progress: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    resolved: 'bg-green-500/10 text-green-500 border-green-500/20',
    archived: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  };

  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          
          <Link href="/admin/feedback" className="inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-primary transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>

          {/* Header */}
          <div className="bg-secondary border border-subtle rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="uppercase text-xs font-bold tracking-wider text-brand-500 bg-brand-500/10 px-2 py-1 rounded-md border border-brand-500/20">
                  {data.type}
                </span>
                <span className={`px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wide border ${statusColors[data.status]}`}>
                  {data.status.replace('_', ' ')}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-primary">Feedback Investigation</h1>
              <p className="text-sm text-muted mt-1">ID: <span className="font-mono">{data.id}</span></p>
            </div>
            
            <div className="flex gap-2 w-full md:w-auto">
              <select 
                value={data.status}
                onChange={e => handleStatusChange(e.target.value as FeedbackStatus)}
                disabled={isUpdating}
                className="bg-primary border border-subtle rounded-xl px-4 py-2 text-sm font-medium text-primary outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="open">Status: Open</option>
                <option value="in_progress">Status: In Progress</option>
                <option value="resolved">Status: Resolved</option>
                <option value="archived">Status: Archived</option>
              </select>
              <select 
                value={data.priority}
                onChange={e => handlePriorityChange(e.target.value as FeedbackPriority)}
                disabled={isUpdating}
                className="bg-primary border border-subtle rounded-xl px-4 py-2 text-sm font-medium text-primary outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="low">Priority: Low</option>
                <option value="medium">Priority: Medium</option>
                <option value="high">Priority: High</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              
              <div className="bg-secondary border border-subtle rounded-2xl p-6">
                <h3 className="text-sm font-medium text-muted uppercase tracking-wider mb-4">User Report</h3>
                
                {data.rating && (
                  <div className="flex items-center gap-1 mb-4">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} className={`w-5 h-5 ${s <= data.rating! ? 'fill-yellow-500 text-yellow-500' : 'text-subtle'}`} />
                    ))}
                  </div>
                )}
                
                <div className="prose prose-invert max-w-none text-primary/90 whitespace-pre-wrap bg-primary/30 p-4 rounded-xl border border-subtle">
                  {data.comment}
                </div>
              </div>

              {/* Attachments */}
              {data.attachments && data.attachments.length > 0 && (
                <div className="bg-secondary border border-subtle rounded-2xl p-6">
                  <h3 className="text-sm font-medium text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Paperclip className="w-4 h-4" /> Attachments
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {data.attachments.map(att => (
                      <div key={att.id} className="rounded-xl border border-subtle overflow-hidden bg-primary group relative">
                        {att.file_type.startsWith('image/') ? (
                          <img src={`http://localhost:8000${att.file_path}`} alt="Screenshot" className="w-full h-48 object-cover" />
                        ) : (
                          <video src={`http://localhost:8000${att.file_path}`} controls className="w-full h-48 object-cover bg-black" />
                        )}
                        <a href={`http://localhost:8000${att.file_path}`} target="_blank" rel="noreferrer" className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-sm font-medium">
                          Open Full Size
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Internal Notes */}
              <div className="bg-secondary border border-subtle rounded-2xl p-6">
                <h3 className="text-sm font-medium text-muted uppercase tracking-wider mb-4">Internal Notes</h3>
                
                <div className="space-y-4 mb-6">
                  {data.notes?.map(note => (
                    <div key={note.id} className="bg-primary border border-subtle p-4 rounded-xl">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-brand-500 uppercase">Admin Note</span>
                        <span className="text-xs text-muted">{new Date(note.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-primary whitespace-pre-wrap">{note.content}</p>
                    </div>
                  ))}
                  {(!data.notes || data.notes.length === 0) && (
                    <p className="text-sm text-muted text-center py-4">No internal notes yet.</p>
                  )}
                </div>

                <form onSubmit={handleAddNote} className="flex gap-3">
                  <input
                    type="text"
                    value={newNote}
                    onChange={e => setNewNote(e.target.value)}
                    placeholder="Add an internal note..."
                    className="flex-1 bg-primary border border-subtle rounded-xl px-4 py-2 text-sm text-primary focus:ring-2 focus:ring-brand-500 outline-none"
                    disabled={isUpdating}
                  />
                  <button 
                    type="submit" 
                    disabled={isUpdating || !newNote.trim()}
                    className="btn-primary p-2 aspect-square flex items-center justify-center"
                  >
                    {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </form>
              </div>

            </div>

            {/* Sidebar Metadata */}
            <div className="space-y-6">
              <div className="bg-secondary border border-subtle rounded-2xl p-6">
                <h3 className="text-sm font-medium text-muted uppercase tracking-wider mb-4">Environment Metadata</h3>
                
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <Globe className="w-5 h-5 text-muted shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted font-medium mb-0.5">Page URL</p>
                      <p className="text-sm text-primary truncate" title={data.page_url || 'N/A'}>{data.page_url || 'N/A'}</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <Monitor className="w-5 h-5 text-muted shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted font-medium mb-0.5">Browser & Device</p>
                      <p className="text-sm text-primary truncate">{data.browser || 'Unknown'} • <span className="capitalize">{data.device_type || 'Unknown'}</span></p>
                      <p className="text-xs text-muted mt-1 break-words">{data.user_agent}</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <Smartphone className="w-5 h-5 text-muted shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted font-medium mb-0.5">Screen Resolution</p>
                      <p className="text-sm text-primary truncate">{data.screen_size || 'Unknown'}</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-muted shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted font-medium mb-0.5">Submitted At</p>
                      <p className="text-sm text-primary truncate">{new Date(data.created_at).toLocaleString()}</p>
                    </div>
                  </li>
                </ul>
              </div>

              {data.user_id && (
                <div className="bg-secondary border border-subtle rounded-2xl p-6">
                  <h3 className="text-sm font-medium text-muted uppercase tracking-wider mb-4">User Details</h3>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-500/20 text-brand-500 flex items-center justify-center font-bold text-sm">
                      {data.user_id.slice(0,2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-primary">User #{data.user_id.split('-')[0]}</p>
                      <Link href={`/admin/users/${data.user_id}`} className="text-xs text-brand-500 hover:underline">View Profile</Link>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </AppShell>
  );
}
