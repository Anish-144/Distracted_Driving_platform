import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Star, Send, Loader2 } from 'lucide-react';
import { submitFeedback, FeedbackType } from '@/api/feedback';
import toast from 'react-hot-toast';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: FeedbackType;
  sessionId?: string;
}

export default function FeedbackModal({ isOpen, onClose, defaultType = 'general', sessionId }: FeedbackModalProps) {
  const [type, setType] = useState<FeedbackType>(defaultType);
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setType(defaultType);
      setRating(0);
      setComment('');
      setFiles([]);
    }
  }, [isOpen, defaultType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      toast.error('Please provide details for your feedback.');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('type', type);
      if (rating > 0) formData.append('rating', rating.toString());
      formData.append('comment', comment);
      
      // Collect metadata
      formData.append('page_url', window.location.pathname);
      formData.append('browser', navigator.vendor || 'unknown');
      formData.append('device_type', /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop');
      formData.append('screen_size', `${window.innerWidth}x${window.innerHeight}`);
      formData.append('user_agent', navigator.userAgent);
      formData.append('app_version', '0.1.0');
      if (sessionId) formData.append('session_id', sessionId);

      files.forEach((file) => formData.append('files', file));

      await submitFeedback(formData);
      toast.success('Thank you for your feedback!');
      onClose();
    } catch (error) {
      toast.error('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      const valid = selected.filter(f => f.size <= 5 * 1024 * 1024); // 5MB limit
      if (valid.length < selected.length) toast.error('Some files were too large (max 5MB)');
      setFiles(prev => [...prev, ...valid].slice(0, 3)); // Max 3 files
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-primary/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={!isSubmitting ? onClose : undefined}
          />
          
          <motion.div
            className="relative bg-secondary border border-subtle rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
          >
            <div className="flex items-center justify-between p-5 border-b border-subtle bg-secondary sticky top-0 z-10">
              <div>
                <h2 className="text-xl font-bold text-primary">Provide Feedback</h2>
                <p className="text-sm text-muted">Help us improve your experience</p>
              </div>
              <button onClick={onClose} disabled={isSubmitting} className="p-2 hover:bg-primary rounded-full transition-colors">
                <X className="w-5 h-5 text-muted" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto">
              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Type Selection */}
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">Feedback Type</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'bug', label: 'Bug' },
                      { id: 'feature', label: 'Feature' },
                      { id: 'ux', label: 'UI/UX' },
                      { id: 'general', label: 'General' }
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setType(t.id as FeedbackType)}
                        className={`py-2 px-3 rounded-xl text-sm font-medium border transition-colors ${
                          type === t.id 
                          ? 'bg-brand-500/10 border-brand-500 text-brand-600' 
                          : 'bg-primary border-subtle text-muted hover:border-brand-500/50'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rating */}
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">How would you rate this page?</label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={(e) => {
                          const siblings = e.currentTarget.parentNode?.childNodes;
                          siblings?.forEach((s: any, i) => {
                            if (i < star) s.style.color = 'var(--color-brand-500)';
                            else s.style.color = 'var(--color-muted)';
                          });
                        }}
                        onMouseLeave={(e) => {
                          const siblings = e.currentTarget.parentNode?.childNodes;
                          siblings?.forEach((s: any, i) => {
                            if (i < rating) s.style.color = 'var(--color-brand-500)';
                            else s.style.color = 'var(--color-muted)';
                          });
                        }}
                        className="transition-colors focus:outline-none"
                      >
                        <Star className={`w-8 h-8 ${rating >= star ? 'fill-brand-500 text-brand-500' : 'text-muted'}`} />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Details */}
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">Details <span className="text-red-500">*</span></label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Tell us what's happening or what you'd like to see..."
                    className="w-full bg-primary border border-subtle rounded-xl p-3 text-primary placeholder-muted focus:ring-2 focus:ring-brand-500 focus:border-brand-500 min-h-[120px] resize-y"
                    required
                  />
                </div>

                {/* Attachments */}
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">Attachments (Optional)</label>
                  <label className="flex items-center justify-center w-full p-4 border-2 border-dashed border-subtle rounded-xl hover:bg-primary transition-colors cursor-pointer group">
                    <input type="file" multiple accept="image/*,video/mp4,video/webm" className="hidden" onChange={handleFileChange} />
                    <div className="flex flex-col items-center gap-2 text-muted group-hover:text-primary">
                      <Upload className="w-6 h-6" />
                      <span className="text-sm font-medium">Click to upload screenshots or video</span>
                      <span className="text-xs">Max 3 files, 5MB each</span>
                    </div>
                  </label>
                  
                  {files.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {files.map((file, i) => (
                        <div key={i} className="flex items-center justify-between bg-primary border border-subtle p-2 rounded-lg text-sm">
                          <span className="truncate max-w-[80%] text-primary">{file.name}</span>
                          <button type="button" onClick={() => setFiles(f => f.filter((_, idx) => idx !== i))} className="text-red-500 hover:text-red-600">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </form>
            </div>

            <div className="p-5 border-t border-subtle bg-secondary flex justify-end gap-3 sticky bottom-0">
              <button type="button" onClick={onClose} disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-muted hover:text-primary">
                Cancel
              </button>
              <button 
                onClick={handleSubmit} 
                disabled={isSubmitting || !comment.trim()} 
                className="btn-primary flex items-center gap-2 px-6 py-2"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Submit
              </button>
            </div>
            
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
