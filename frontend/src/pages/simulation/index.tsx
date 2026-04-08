import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAppSelector, useAppDispatch } from '@/store';
import { sessionStarted, sessionEnded, sessionReset } from '@/store/sessionSlice';
import { createSession } from '@/api/sessions';
import Navbar from '@/components/layout/Navbar';
import ScenarioContainer from '@/components/simulation/ScenarioContainer';
import ScoreDisplay from '@/components/simulation/ScoreDisplay';
import { ArrowLeft, Info, PlayCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function SimulationPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const { sessionId, isSimulating, score } = useAppSelector((state) => state.session);
  const [isStarting, setIsStarting] = useState(false);

  // Guard
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/auth/login');
    }
  }, [isAuthenticated, router]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      dispatch(sessionReset());
    };
  }, [dispatch]);

  const handleStartSession = async () => {
    setIsStarting(true);
    try {
      const session = await createSession();
      dispatch(sessionStarted({ sessionId: session.id, score: session.score }));
      toast.success('Session started! Get ready for distractions... 🚗');
    } catch (err: any) {
      toast.error('Failed to start session. Please try again.');
    } finally {
      setIsStarting(false);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <>
      <Head>
        <title>Driving Simulation — SafeDrive AI</title>
        <meta name="description" content="Practice responding to driving distractions in a safe training environment." />
      </Head>

      <div className="min-h-screen bg-surface-900 flex flex-col">
        <Navbar />

        <main className="flex-1 p-6 lg:p-8">
          {/* Header Bar */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Link href="/dashboard">
                <button className="btn-ghost flex items-center gap-2 text-sm">
                  <ArrowLeft className="w-4 h-4" />
                  Dashboard
                </button>
              </Link>
              <div className="w-px h-5 bg-surface-500" />
              <h1 className="text-lg font-semibold text-white">Driving Simulation</h1>
            </div>

            {isSimulating && (
              <ScoreDisplay score={score} />
            )}
          </div>

          {/* Main Content */}
          {!isSimulating ? (
            /* Pre-simulation: Instructions + Start */
            <div className="max-w-2xl mx-auto animate-fade-in">
              {/* Intro Card */}
              <div className="card mb-6 text-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center mx-auto mb-4 text-4xl shadow-brand">
                  🚗
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Simulation Ready</h2>
                <p className="text-gray-400 text-sm leading-relaxed">
                  You&apos;ll face realistic driving distractions. For each event, decide to{' '}
                  <span className="text-brand-400 font-medium">ignore it safely</span> or{' '}
                  <span className="text-red-400 font-medium">interact with it</span>.
                  Your reaction time and choices affect your score.
                </p>
              </div>

              {/* Scenarios preview */}
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Scenarios You May Encounter
              </h3>
              <div className="grid gap-3 mb-6">
                {[
                  {
                    icon: '📱',
                    name: 'Incoming Phone Call',
                    desc: 'Your phone rings. Do you answer, decline, or ignore it?',
                    difficulty: 'Medium',
                    diffColor: 'badge-warning',
                  },
                  {
                    icon: '💬',
                    name: 'WhatsApp Notification',
                    desc: 'A buzzing message notification with preview text appears.',
                    difficulty: 'Easy',
                    diffColor: 'badge-success',
                  },
                  {
                    icon: '🗺️',
                    name: 'GPS Rerouting Alert',
                    desc: 'Your GPS needs attention — new route calculated, turn in 200m.',
                    difficulty: 'Hard',
                    diffColor: 'badge-danger',
                  },
                ].map((s) => (
                  <div key={s.name} className="card-elevated flex items-center gap-4">
                    <div className="text-3xl w-12 text-center flex-shrink-0">{s.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-200 text-sm">{s.name}</span>
                        <span className={s.diffColor}>{s.difficulty}</span>
                      </div>
                      <p className="text-gray-400 text-xs">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Rules */}
              <div className="glass rounded-xl p-4 mb-6 flex gap-3">
                <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-gray-300">
                  <span className="font-medium text-white">Scoring: </span>
                  Safe decisions earn <span className="text-brand-400">+10 pts</span>. 
                  Risky interactions lose <span className="text-red-400">-15 to -20 pts</span>.
                  Reaction time matters — faster safe decisions are better.
                </div>
              </div>

              <button
                id="begin-simulation-btn"
                onClick={handleStartSession}
                disabled={isStarting}
                className="btn-primary w-full flex items-center justify-center gap-2 text-lg py-4"
              >
                {isStarting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Starting Session...
                  </>
                ) : (
                  <>
                    <PlayCircle className="w-6 h-6" />
                    Begin Simulation
                  </>
                )}
              </button>
            </div>
          ) : (
            /* Active simulation */
            <ScenarioContainer sessionId={sessionId!} />
          )}
        </main>
      </div>
    </>
  );
}
