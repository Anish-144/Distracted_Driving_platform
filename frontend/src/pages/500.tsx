import Head from 'next/head';
import { AlertTriangle, RotateCw } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ServerErrorPage() {
  return (
    <>
      <Head>
        <title>Something Went Wrong — SafeDrive AI</title>
      </Head>
      <div
        className="min-h-screen flex items-center justify-center px-6"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        <motion.div
          className="flex flex-col items-center text-center max-w-sm"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <div
            className="flex items-center justify-center w-14 h-14 rounded-2xl mb-6"
            style={{
              backgroundColor: 'var(--color-primary)',
              boxShadow: '0 4px 16px rgba(74, 109, 130, 0.25)',
            }}
          >
            <AlertTriangle className="w-7 h-7" style={{ color: 'var(--color-on-primary)' }} />
          </div>

          <h1 className="text-2xl font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
            Something went wrong
          </h1>
          <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>
            We hit an unexpected error on our end. Please try again in a moment.
          </p>

          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-transform hover:scale-[1.02]"
            style={{
              backgroundColor: 'var(--color-primary)',
              color: 'var(--color-on-primary)',
            }}
          >
            <RotateCw className="w-4 h-4" />
            Try again
          </button>
        </motion.div>
      </div>
    </>
  );
}
