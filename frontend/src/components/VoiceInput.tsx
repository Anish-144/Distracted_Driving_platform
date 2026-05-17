/**
 * VoiceInput — Browser-native speech recognition for hands-free simulation response.
 *
 * Maps spoken words to simulation decisions:
 *   "ignore" / "no" / "don't" → 'ignored'
 *   "answer" / "yes" / "check" / "look" → 'interacted'
 *
 * Falls back gracefully when Web Speech API is unavailable.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type SimulationDecision = 'ignored' | 'interacted' | 'no_response';

interface VoiceInputProps {
  /** Called when a valid voice command is detected */
  onDecision: (decision: SimulationDecision) => void;
  /** Whether the button should be active (simulation event is live) */
  isActive: boolean;
  /** Disable while an API call is in flight */
  isDisabled?: boolean;
}

// ── Keyword maps ──────────────────────────────────────────────────────────────

const IGNORE_KEYWORDS = ['ignore', 'no', "don't", 'dont', 'skip', 'stay', 'focus'];
const INTERACT_KEYWORDS = ['answer', 'yes', 'check', 'look', 'pick up', 'reply', 'read'];

function classifyTranscript(transcript: string): SimulationDecision | null {
  const lower = transcript.toLowerCase();
  if (IGNORE_KEYWORDS.some((k) => lower.includes(k))) return 'ignored';
  if (INTERACT_KEYWORDS.some((k) => lower.includes(k))) return 'interacted';
  return null;
}

// ── Check browser support ─────────────────────────────────────────────────────

function getSpeechRecognition(): any {
  if (typeof window === 'undefined') return null;
  return (
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition ||
    null
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function VoiceInput({ onDecision, isActive, isDisabled = false }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    recognitionRef.current.stop();
    setIsListening(false);
    setTranscript('');
  }, []);

  const startListening = useCallback(() => {
    if (!recognitionRef.current || isListening || isDisabled) return;
    setTranscript('');
    setIsListening(true);
    recognitionRef.current.start();
  }, [isListening, isDisabled]);

  useEffect(() => {
    const SR = getSpeechRecognition();
    if (!SR) {
      setIsSupported(false);
      return;
    }

    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      const result = event.results[event.results.length - 1];
      const text = result[0].transcript;
      setTranscript(text);

      if (result.isFinal) {
        const decision = classifyTranscript(text);
        if (decision) {
          onDecision(decision);
          stopListening();
        }
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
    };
  }, [onDecision, stopListening]);

  // Stop when event deactivates
  useEffect(() => {
    if (!isActive && isListening) {
      stopListening();
    }
  }, [isActive, isListening, stopListening]);



  // Don't render if not supported
  if (!isSupported) return null;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        onClick={isListening ? stopListening : startListening}
        disabled={!isActive || isDisabled}
        title="Use voice to respond (say 'ignore' or 'answer')"
        className={`
          w-10 h-10 rounded-full flex items-center justify-center
          transition-all duration-200 border-2
          ${!isActive || isDisabled
            ? 'border-gray-200 text-gray-300 cursor-not-allowed bg-white'
            : isListening
              ? 'border-red-400 text-red-500 bg-red-50 animate-pulse shadow-sm shadow-red-200'
              : 'border-blue-200 text-blue-500 bg-blue-50 hover:bg-blue-100 hover:border-blue-400'
          }
        `}
      >
        {isListening
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : <Mic className="w-4 h-4" />
        }
      </button>

      {/* Live transcript preview */}
      {isListening && transcript && (
        <p className="text-[10px] text-gray-500 italic max-w-[100px] text-center leading-tight truncate">
          &quot;{transcript}&quot;
        </p>
      )}
    </div>
  );
}
