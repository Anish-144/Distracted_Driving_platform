import { useState, useCallback, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import { eventTriggered, eventResolved, sessionEnded } from '@/store/sessionSlice';
import { postEvent } from '@/api/events';
import { endSession } from '@/api/sessions';
import toast from 'react-hot-toast';
import DistractionEvent from './DistractionEvent';
import DecisionButtons from './DecisionButtons';
import Timer from './Timer';
import { CheckCircle, XCircle, Car, StopCircle } from 'lucide-react';
import Link from 'next/link';

// The 3 scenarios for Week 1
const SCENARIOS = [
  {
    id: 'scenario-001',
    event_type: 'incoming_call' as const,
    name: 'Incoming Phone Call',
    icon: '📱',
    instruction_text: 'Your phone is ringing! What do you do?',
    urgency: 'high',
  },
  {
    id: 'scenario-002',
    event_type: 'whatsapp_notification' as const,
    name: 'WhatsApp Notification',
    icon: '💬',
    instruction_text: 'You just got a WhatsApp message. How do you respond?',
    urgency: 'medium',
  },
  {
    id: 'scenario-003',
    event_type: 'gps_rerouting' as const,
    name: 'GPS Rerouting Alert',
    icon: '🗺️',
    instruction_text: 'Your GPS is rerouting. Do you look at the screen while driving?',
    urgency: 'medium',
  },
];

const TOTAL_EVENTS = 3; // One of each scenario
const EVENT_TIMEOUT = 8; // Seconds to respond

interface ScenarioContainerProps {
  sessionId: string;
}

export default function ScenarioContainer({ sessionId }: ScenarioContainerProps) {
  const dispatch = useAppDispatch();
  const { currentEvent, eventsCount, score, lastDecision, lastScoreDelta } = useAppSelector(
    (state) => state.session
  );

  const [isFinished, setIsFinished] = useState(false);
  const [finalScore, setFinalScore] = useState(score);
  const [eventStartTime, setEventStartTime] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Trigger next event
  const triggerNextEvent = useCallback(() => {
    if (eventsCount >= TOTAL_EVENTS) {
      return;
    }
    const scenario = SCENARIOS[eventsCount % SCENARIOS.length];
    dispatch(
      eventTriggered({
        id: `${sessionId}-event-${eventsCount + 1}`,
        event_type: scenario.event_type,
        triggered_at: new Date().toISOString(),
        instruction_text: scenario.instruction_text,
      })
    );
    setEventStartTime(Date.now());
  }, [dispatch, eventsCount, sessionId]);

  // Start first event automatically after a short delay
  useEffect(() => {
    const timer = setTimeout(() => {
      if (eventsCount === 0 && !currentEvent && !isFinished) {
        triggerNextEvent();
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  // Handle user decision (respond/ ignore)
  const handleDecision = async (userResponse: 'ignored' | 'interacted' | 'no_response') => {
    if (!currentEvent || isProcessing) return;
    setIsProcessing(true);

    const responseTime = eventStartTime ? (Date.now() - eventStartTime) / 1000 : 5;
    const scenario = SCENARIOS.find((s) => s.event_type === currentEvent.event_type);

    try {
      const result = await postEvent({
        session_id: sessionId,
        event_type: currentEvent.event_type as any,
        user_response: userResponse,
        response_time: Math.round(responseTime * 10) / 10,
      });

      dispatch(
        eventResolved({
          decision_type: result.decision_type,
          score_delta: result.score_delta,
          new_score: result.new_score,
        })
      );

      const isGood = result.score_delta >= 0;
      if (isGood) toast.success(`✅ Safe decision! ${result.score_delta > 0 ? `+${result.score_delta} pts` : ''}`);
      else toast.error(`⚠️ Risky! ${result.score_delta} pts`);

      // Check if all events done
      if (eventsCount + 1 >= TOTAL_EVENTS) {
        // End session
        await endSession(sessionId);
        dispatch(sessionEnded());
        setFinalScore(result.new_score);
        setIsFinished(true);
      } else {
        // Trigger next after a short pause
        setTimeout(() => {
          triggerNextEvent();
        }, 2000);
      }
    } catch (err) {
      toast.error('Failed to record response. Try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle timeout (no response)
  const handleTimeout = () => {
    handleDecision('no_response');
  };

  // Session Finished View
  if (isFinished) {
    const grade = finalScore >= 90 ? { label: 'Excellent', color: 'text-brand-400', emoji: '🏆' }
      : finalScore >= 70 ? { label: 'Good', color: 'text-accent-400', emoji: '👍' }
      : finalScore >= 50 ? { label: 'Fair', color: 'text-orange-400', emoji: '💪' }
      : { label: 'Needs Work', color: 'text-red-400', emoji: '📚' };

    return (
      <div className="max-w-md mx-auto animate-slide-up text-center">
        <div className="card">
          <div className="text-6xl mb-4">{grade.emoji}</div>
          <h2 className="text-2xl font-bold text-white mb-1">Session Complete!</h2>
          <p className={`text-lg font-semibold ${grade.color} mb-2`}>{grade.label}</p>

          <div className="w-32 h-32 mx-auto my-6 relative">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="40" fill="none" stroke="#1f2937" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="40" fill="none"
                stroke={finalScore >= 70 ? '#10b981' : finalScore >= 50 ? '#f59e0b' : '#ef4444'}
                strokeWidth="8"
                strokeDasharray={`${(finalScore / 100) * 251.2} 251.2`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-3xl font-bold ${grade.color}`}>{Math.round(finalScore)}</span>
              <span className="text-gray-400 text-xs">/ 100</span>
            </div>
          </div>

          <p className="text-gray-400 text-sm mb-6">
            You completed {TOTAL_EVENTS} distraction scenarios. 
            {finalScore >= 70 ? ' Great safe driving instincts!' : ' Keep practicing to improve!'}
          </p>

          <div className="flex gap-3">
            <Link href="/dashboard" className="flex-1">
              <button className="btn-secondary w-full">View Dashboard</button>
            </Link>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary flex-1"
            >
              Play Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Driving Scene
  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-sm text-gray-400">
          Scenario {eventsCount + (currentEvent ? 0 : 0)} of {TOTAL_EVENTS}
        </span>
        <div className="flex-1 bg-surface-600 rounded-full h-1.5">
          <div
            className="bg-brand-500 h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${(eventsCount / TOTAL_EVENTS) * 100}%` }}
          />
        </div>
        <Car className="w-4 h-4 text-brand-400" />
      </div>

      {/* Road Scene */}
      <div className="card relative min-h-[300px] flex flex-col items-center justify-center bg-gradient-to-b from-surface-700 to-surface-800 overflow-hidden mb-4">
        {/* Road visualization */}
        <div className="absolute inset-0 flex flex-col justify-end pointer-events-none">
          <div className="h-24 bg-gradient-to-t from-gray-900 to-transparent" />
          <div className="h-2 bg-gray-700" />
          <div className="h-8 bg-gray-700 flex items-center justify-center">
            <div className="flex gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="w-8 h-1 bg-amber-400/60 rounded" />
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 text-center flex flex-col items-center">
          {!currentEvent ? (
            <div className="animate-pulse">
              <div className="text-5xl mb-3">🚗</div>
              <p className="text-gray-400 text-sm">Driving... Stay alert!</p>
            </div>
          ) : (
            <>
              {/* Active distraction event */}
              <DistractionEvent
                scenario={SCENARIOS.find((s) => s.event_type === currentEvent.event_type)!}
                instructionText={currentEvent.instruction_text || ''}
              />
              <Timer duration={EVENT_TIMEOUT} onExpire={handleTimeout} key={currentEvent.id} />
            </>
          )}
        </div>
      </div>

      {/* Decision Buttons */}
      {currentEvent && (
        <DecisionButtons
          onIgnore={() => handleDecision('ignored')}
          onInteract={() => handleDecision('interacted')}
          isDisabled={isProcessing}
        />
      )}

      {/* Last decision feedback */}
      {lastDecision && !currentEvent && !isFinished && (
        <div className={`glass rounded-xl p-3 flex items-center gap-2 mt-4 animate-fade-in ${
          lastScoreDelta && lastScoreDelta > 0 ? 'border-brand-800/50' : 'border-red-800/50'
        }`}>
          {lastScoreDelta && lastScoreDelta > 0 ? (
            <CheckCircle className="w-5 h-5 text-brand-400 flex-shrink-0" />
          ) : (
            <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          )}
          <span className="text-sm text-gray-300">
            {lastScoreDelta && lastScoreDelta > 0
              ? `✅ Safe choice! Next scenario coming up...`
              : `⚠️ Risky move! Next scenario coming up...`}
          </span>
        </div>
      )}
    </div>
  );
}
