import React from 'react';
import Head from 'next/head';
import AppShell from '@/components/layout/AppShell';
import { Microscope, Construction } from 'lucide-react';

export default function AdminResearch() {
  return (
    <AppShell>
      <Head>
        <title>Research Intelligence | SafeDrive AI</title>
      </Head>
      <div className="p-6 max-w-7xl mx-auto flex flex-col h-full gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary tracking-tight">Research Intelligence</h1>
            <p className="text-muted mt-1">Surface actionable insights directly from platform telemetry.</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-tertiary flex items-center justify-center border border-subtle shadow-inner">
            <Microscope className="w-6 h-6 text-primary" />
          </div>
        </div>

        <div className="flex-1 bg-secondary border border-subtle rounded-xl flex items-center justify-center flex-col gap-4">
          <Construction className="w-12 h-12 text-muted opacity-50" />
          <h2 className="text-xl font-medium text-primary">Research Engine Under Construction</h2>
          <p className="text-muted text-sm text-center max-w-sm">
            This module is scheduled for Phase 8 implementation. It will allow you to query which personality types struggle most and identify which interventions generate the highest improvement.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
