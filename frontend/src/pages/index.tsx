import Head from 'next/head';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAppSelector } from '@/store';
import { ShieldCheck } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/dashboard');
    } else {
      router.replace('/auth/login');
    }
  }, [isAuthenticated, router]);

  return (
    <>
      <Head>
        <title>SafeDrive AI — Distracted Driving Training Platform</title>
        <meta name="description" content="AI-powered behavioral training to help you recognize and overcome distracted driving habits." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      {/* Premium loading state */}
      <div
        className="min-h-screen flex items-center justify-center flex-col gap-6"
        style={{ background: 'var(--bg-base)' }}
      >
        {/* Ambient glow */}
        <div
          className="absolute w-96 h-96 rounded-full pointer-events-none"
          style={{
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(108,99,255,0.08)',
            filter: 'blur(80px)',
          }}
        />

        {/* Logo */}
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #6C63FF 0%, #8B5CF6 100%)',
              boxShadow: '0 0 32px rgba(108,99,255,0.4)',
            }}
          >
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>

          <div className="text-center">
            <p
              className="font-bold text-lg tracking-tight"
              style={{ color: 'var(--text-primary)', fontFamily: 'Geist, Inter, sans-serif' }}
            >
              SafeDrive AI
            </p>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Loading your platform...
            </p>
          </div>

          {/* Spinner */}
          <div
            className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }}
          />
        </div>
      </div>
    </>
  );
}
