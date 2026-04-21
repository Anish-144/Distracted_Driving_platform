import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAppSelector, useAppDispatch } from '@/store';
import { sessionStarted, sessionEnded, sessionReset } from '@/store/sessionSlice';
import { createSession } from '@/api/sessions';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
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

      <div className="min-h-screen bg-gray-50 flex font-sans text-gray-900">
        <Sidebar />

        <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
          <Navbar />

          <main className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full">
            {/* Header Bar */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <Link 
                  href="/dashboard"
                  className="bg-white px-3 py-1.5 border border-gray-200 rounded-md flex items-center gap-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Dashboard
                </Link>
                <div className="w-px h-5 bg-gray-300" />
                <h1 className="text-xl font-semibold tracking-tight text-gray-900">Driving Simulation</h1>
              </div>

            {isSimulating && (
              <ScoreDisplay score={score} />
            )}
          </div>

          {/* Main Content */}
          {!isSimulating ? (
            /* Pre-simulation: Instructions + Start */
            <div className="max-w-2xl mx-auto animate-fade-in mt-4">
              {/* Intro Card */}
              <div className="bg-white border border-gray-200 rounded-lg p-6 lg:p-8 mb-8 text-center shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center mx-auto mb-5 text-3xl shadow-sm">
                  🚗
                </div>
                <h2 className="text-xl font-semibold tracking-tight text-gray-900 mb-2.5">Ready to Drive?</h2>
                <p className="text-gray-600 text-sm leading-relaxed max-w-md mx-auto">
                  You&apos;ll face realistic driving distractions. For each event, decide to{' '}
                  <span className="text-brand-600 font-medium bg-brand-50 px-1 py-0.5 rounded">ignore it safely</span> or{' '}
                  <span className="text-red-600 font-medium bg-red-50 px-1 py-0.5 rounded">interact with it</span>.
                  Your reaction time and choices affect your score.
                </p>
              </div>

              {/* Scenarios preview */}
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 px-1">
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
                  <div key={s.name} className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-4 hover:border-gray-300 transition-colors shadow-sm">
                    <div className="w-12 h-12 bg-gray-50 border border-gray-100 rounded-md flex items-center justify-center text-2xl flex-shrink-0">{s.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900 text-sm leading-none">{s.name}</span>
                        <span className="text-[10px] bg-white border border-gray-200 text-gray-600 font-medium px-1.5 py-0.5 rounded leading-none">{s.difficulty}</span>
                      </div>
                      <p className="text-gray-500 text-xs mt-1">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Rules */}
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-5 mb-8 flex gap-3.5 items-start shadow-sm">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900 leading-relaxed">
                  <span className="font-semibold text-blue-900 block mb-1">Scoring Rules</span>
                  Safe decisions earn <span className="text-green-700 font-medium bg-green-100/50 px-1 rounded">+10 pts</span>. 
                  Risky interactions lose <span className="text-red-700 font-medium bg-red-100/50 px-1 rounded">-15 to -20 pts</span>.
                  Reaction time scaling applies.
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
      </div>
    </>
  );
}
