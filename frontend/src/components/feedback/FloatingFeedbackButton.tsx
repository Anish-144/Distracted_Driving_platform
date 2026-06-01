import { useState } from 'react';
import { useRouter } from 'next/router';
import { MessageSquarePlus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import FeedbackModal from './FeedbackModal';

export default function FloatingFeedbackButton() {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Hide on admin routes or auth routes
  if (router.pathname.startsWith('/admin') || router.pathname.startsWith('/auth')) {
    return null;
  }

  return (
    <>
      <AnimatePresence>
        {!isModalOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsModalOpen(true)}
            className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-4 py-3 rounded-full shadow-lg transition-colors border border-brand-400"
          >
            <MessageSquarePlus className="w-5 h-5" />
            <span className="font-semibold text-sm hidden sm:inline">Feedback</span>
          </motion.button>
        )}
      </AnimatePresence>

      <FeedbackModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
