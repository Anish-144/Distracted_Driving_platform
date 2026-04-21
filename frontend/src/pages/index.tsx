import Head from 'next/head';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAppSelector } from '@/store';

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
      {/* Loading state while redirect happens */}
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-brand-600 border-t-transparent animate-spin" />
          <p className="text-gray-500 text-sm">Loading SafeDrive AI...</p>
        </div>
      </div>
    </>
  );
}
