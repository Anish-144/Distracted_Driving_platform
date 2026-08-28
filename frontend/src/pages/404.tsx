import Head from 'next/head';
import Link from 'next/link';
import { Compass, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function NotFoundPage() {
  return (
    <>
      <Head>
        <title>Page Not Found — SafeDrive AI</title>
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
            <Compass className="w-7 h-7" style={{ color: 'var(--color-on-primary)' }} />
          </div>

          <h1 className="text-2xl font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
            You&apos;ve taken a wrong turn
          </h1>
          <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>
            The page you&apos;re looking for doesn&apos;t exist or may have moved.
          </p>

          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-transform hover:scale-[1.02]"
            style={{
              backgroundColor: 'var(--color-primary)',
              color: 'var(--color-on-primary)',
            }}
          >
            Back to safety
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    </>
  );
}
