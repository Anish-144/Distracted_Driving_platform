import Head from 'next/head';
import { useRouter } from 'next/router';
import { useState, useEffect, useRef } from 'react';
import { useAppSelector, useAppDispatch } from '@/store';
import { updateProfile } from '@/api/user';
import { loginSuccess } from '@/store/authSlice';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import client from '@/api/client';
import {
  Brain, ChevronRight, Loader2, CheckCircle2, Sparkles,
  ArrowLeft, Activity, Eye, Zap, Shield, Clock, Target
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface QuestionOption {
  value: string;
  text: string;
}

interface Question {
  id: string;
  text: string;
  dimension: string;
  options: QuestionOption[];
}

interface PersonalityProfileResponse {
  onboarding_profile_label: string;
  impulsiveness_score: number;
  attention_control_score: number;
  emotional_reactivity_score: number;
  authority_compliance_score: number;
  cognitive_patience_score: number;
  risk_tolerance_score: number;
  stress_resilience_score: number;
  multitasking_tendency_score: number;
  consistency_score: number;
  self_awareness_score: number;
  has_completed_assessment: boolean;
}

// ── Profile Label Display Map ─────────────────────────────────────────────────

const PROFILE_DISPLAYS: Record<string, { label: string; color: string; description: string; icon: any }> = {
  impulsive: {
    label: 'Impulsive Reactor',
    color: 'from-red-500 to-orange-500',
    description: 'You act before fully evaluating — your reflexes lead your decisions. High urgency cues override deliberate thinking.',
    icon: Zap,
  },
  distracted: {
    label: 'Attention Fragmenter',
    color: 'from-amber-500 to-yellow-500',
    description: 'Attention shifts rapidly between stimuli. You find it difficult to sustain focus when multiple inputs compete.',
    icon: Activity,
  },
  hesitant: {
    label: 'Deliberate Hesitator',
    color: 'from-blue-500 to-cyan-500',
    description: 'You process carefully but delay commitment — uncertainty extends your decision cycle under pressure.',
    icon: Clock,
  },
  risk_seeking: {
    label: 'Risk-Oriented Thinker',
    color: 'from-purple-500 to-violet-500',
    description: 'You trust instinct over convention. Rules feel optional when your judgment says otherwise.',
    icon: Target,
  },
  cautious: {
    label: 'Cautious Controller',
    color: 'from-emerald-500 to-teal-500',
    description: 'You prioritize safety over speed. Rule-based thinking is your default — social pressure rarely overrides your standards.',
    icon: Shield,
  },
  emotionally_reactive: {
    label: 'Emotionally Reactive',
    color: 'from-pink-500 to-rose-500',
    description: 'Emotional urgency cues strongly influence your decisions. Social obligation and guilt are high-impact triggers.',
    icon: Brain,
  },
  authority_driven: {
    label: 'Authority-Compliant',
    color: 'from-indigo-500 to-blue-600',
    description: 'Social hierarchy strongly shapes your responses. Requests from authority figures create hard-to-resist urgency.',
    icon: Eye,
  },
  balanced: {
    label: 'Balanced Processor',
    color: 'from-gray-500 to-slate-600',
    description: 'Your cognitive responses are situationally adaptive — neither strongly impulsive nor overly cautious.',
    icon: Brain,
  },
  unknown: {
    label: 'Profiling...',
    color: 'from-gray-500 to-gray-600',
    description: 'Your profile is being assessed.',
    icon: Brain,
  },
};

// ── Dimension Icons ───────────────────────────────────────────────────────────

const DIMENSION_ICONS: Record<string, any> = {
  impulsiveness: Zap,
  attention_control: Eye,
  emotional_reactivity: Activity,
  authority_compliance: Shield,
  cognitive_patience: Clock,
  risk_tolerance: Target,
  stress_resilience: Brain,
  multitasking: Brain,
};

const DIMENSION_LABELS: Record<string, string> = {
  impulsiveness: 'Impulsiveness',
  attention_control: 'Focus Control',
  emotional_reactivity: 'Emotional Reactivity',
  authority_compliance: 'Authority Response',
  cognitive_patience: 'Cognitive Patience',
  risk_tolerance: 'Risk Orientation',
  stress_resilience: 'Stress Resilience',
  multitasking: 'Multitasking Tendency',
};

// ── Trait Bar Component ───────────────────────────────────────────────────────

function TraitBar({ label, value, icon: Icon }: { label: string; value: number; icon: any }) {
  const pct = Math.round(value * 100);
  const color = pct >= 70 ? '#ef4444' : pct >= 45 ? '#f59e0b' : '#10b981';
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5 text-gray-500" />
          <span className="text-xs text-gray-600 font-medium">{label}</span>
        </div>
        <span className="text-xs font-bold" style={{ color }}>{pct}%</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
        />
      </div>
    </div>
  );
}

// ── Result Screen ─────────────────────────────────────────────────────────────

function ResultScreen({ profile, onContinue }: { profile: PersonalityProfileResponse; onContinue: () => void }) {
  const display = PROFILE_DISPLAYS[profile.onboarding_profile_label] || PROFILE_DISPLAYS.unknown;
  const ProfileIcon = display.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6"
    >
      {/* Profile Result Card */}
      <div className="bg-gray-900/60 backdrop-blur-sm border border-white/10 rounded-3xl p-8 text-center">
        <div className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${display.color} flex items-center justify-center mx-auto mb-5 shadow-2xl`}>
          <ProfileIcon className="w-10 h-10 text-white" />
        </div>
        <span className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2 block">Psychological Profile Derived</span>
        <h2 className="text-3xl font-extrabold text-white mb-3 tracking-tight">{display.label}</h2>
        <p className="text-gray-400 leading-relaxed max-w-sm mx-auto text-sm">{display.description}</p>
      </div>

      {/* Trait Breakdown */}
      <div className="bg-gray-900/60 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-5">Cognitive Trait Breakdown</p>
        <div className="space-y-1">
          <TraitBar label="Impulsiveness" value={profile.impulsiveness_score} icon={Zap} />
          <TraitBar label="Focus Control" value={1 - profile.attention_control_score} icon={Eye} />
          <TraitBar label="Emotional Reactivity" value={profile.emotional_reactivity_score} icon={Activity} />
          <TraitBar label="Authority Compliance" value={profile.authority_compliance_score} icon={Shield} />
          <TraitBar label="Risk Tolerance" value={profile.risk_tolerance_score} icon={Target} />
          <TraitBar label="Stress Vulnerability" value={1 - profile.stress_resilience_score} icon={Brain} />
          <TraitBar label="Multitasking Tendency" value={profile.multitasking_tendency_score} icon={Brain} />
        </div>
      </div>

      {/* What happens next */}
      <div className="bg-brand-900/30 border border-brand-500/20 rounded-2xl p-5 flex gap-4 items-start">
        <div className="w-8 h-8 rounded-xl bg-brand-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Sparkles className="w-4 h-4 text-brand-400" />
        </div>
        <div>
          <p className="text-sm font-bold text-white mb-1">Your simulation will adapt to this profile</p>
          <p className="text-xs text-gray-400 leading-relaxed">
            Scenarios will target your specific psychological weak points. Coaching will reference your exact cognitive patterns. Lessons will address the traits shown above.
          </p>
        </div>
      </div>

      <motion.button
        onClick={onContinue}
        className="w-full py-4 rounded-2xl font-bold text-white text-base flex items-center justify-center gap-2.5"
        style={{ background: 'linear-gradient(135deg, #059669, #0284c7)', boxShadow: '0 4px 20px rgba(5,150,105,0.3)' }}
        whileHover={{ scale: 1.01, boxShadow: '0 6px 24px rgba(5,150,105,0.4)' }}
        whileTap={{ scale: 0.98 }}
      >
        Begin Adaptive Training <ChevronRight className="w-5 h-5" />
      </motion.button>
    </motion.div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isAuthenticated, user, token } = useAppSelector((state) => state.auth);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<{ question_id: string; answer_value: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profileResult, setProfileResult] = useState<PersonalityProfileResponse | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAuthenticated) router.replace('/auth/login');
  }, [isAuthenticated, router]);

  useEffect(() => {
    async function fetchQuestions() {
      try {
        const res = await client.get('/onboarding/questions');
        setQuestions(res.data);
      } catch {
        toast.error('Failed to load assessment questions.');
      } finally {
        setIsLoading(false);
      }
    }
    if (isAuthenticated) fetchQuestions();
  }, [isAuthenticated]);

  if (!isAuthenticated || !user) return null;

  const totalSteps = questions.length;
  const progress = totalSteps > 0 ? ((currentStep) / totalSteps) * 100 : 0;

  const handleAnswer = async (questionId: string, value: string) => {
    setSelectedOption(value);
    await new Promise(res => setTimeout(res, 280)); // brief visual confirmation delay

    const newAnswers = [...answers, { question_id: questionId, answer_value: value }];
    setAnswers(newAnswers);
    setSelectedOption(null);

    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Submit assessment
      setIsSubmitting(true);
      try {
        const res = await client.post('/onboarding/submit', { answers: newAnswers });
        const profile: PersonalityProfileResponse = res.data;
        setProfileResult(profile);

        // Map onboarding label to a profile type the backend recognizes
        const profileMap: Record<string, string> = {
          impulsive: 'impulsive',
          distracted: 'distractible',
          hesitant: 'distractible',
          risk_seeking: 'overconfident',
          cautious: 'rule_following',
          emotionally_reactive: 'anxious',
          authority_driven: 'rule_following',
          balanced: 'rule_following',
        };
        const mappedProfile = profileMap[profile.onboarding_profile_label] || 'unknown';

        const updateRes = await updateProfile(mappedProfile);
        if (user && token) {
          dispatch(loginSuccess({
            user: { ...user, profile_type: updateRes.profile_type },
            token,
          }));
        }
      } catch {
        toast.error('Failed to process your assessment. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleContinue = () => {
    router.push('/dashboard');
  };

  return (
    <>
      <Head>
        <title>Behavioral Assessment — SafeDrive AI</title>
        <meta name="description" content="Psychological personality assessment for adaptive driving simulation." />
      </Head>

      <div className="min-h-screen bg-surface-900 flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
        {/* Ambient background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/3 w-[600px] h-[400px] rounded-full blur-[120px]"
            style={{ background: 'radial-gradient(circle, rgba(5,150,105,0.04) 0%, transparent 70%)' }} />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[400px] rounded-full blur-[100px]"
            style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.04) 0%, transparent 70%)' }} />
        </div>

        <div className="w-full max-w-xl relative z-10">

          {/* Header */}
          {!profileResult && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center mb-10 text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center mb-5 shadow-2xl">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-violet-400 mb-2">Behavioral Intelligence System</span>
              <h1 className="text-3xl font-extrabold text-white mb-2 tracking-tight">Cognitive Profile Assessment</h1>
              <p className="text-gray-400 text-sm leading-relaxed max-w-sm">
                This assessment evaluates your psychological decision-making tendencies. There are no right or wrong answers — honest responses generate the most accurate profile.
              </p>
            </motion.div>
          )}

          {/* Content */}
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-20"
              >
                <Loader2 className="w-10 h-10 text-violet-400 animate-spin mb-4" />
                <p className="text-gray-400 text-sm">Loading assessment...</p>
              </motion.div>
            ) : isSubmitting ? (
              <motion.div
                key="submitting"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="bg-gray-900/60 backdrop-blur-sm border border-white/10 rounded-3xl p-12 text-center"
              >
                <div className="relative w-16 h-16 mx-auto mb-6">
                  <div className="w-16 h-16 rounded-full border-2 border-violet-500/20 border-t-violet-500 animate-spin" />
                  <Brain className="absolute inset-0 m-auto w-7 h-7 text-violet-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Analyzing Cognitive Profile</h3>
                <p className="text-gray-400 text-sm">Processing your responses across 8 psychological dimensions...</p>
              </motion.div>
            ) : profileResult ? (
              <ResultScreen profile={profileResult} onContinue={handleContinue} />
            ) : questions.length > 0 ? (
              <motion.div key={currentStep} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
                {/* Progress bar */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
                      Question {currentStep + 1} <span className="text-gray-600">of {totalSteps}</span>
                    </span>
                    <span className="text-xs font-bold text-violet-400">{Math.round(progress)}% complete</span>
                  </div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500"
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                  {/* Dimension pills */}
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {questions.map((q, i) => {
                      const isComplete = i < currentStep;
                      const isCurrent = i === currentStep;
                      return (
                        <div
                          key={q.id}
                          className={`h-1.5 rounded-full transition-all duration-500 ${
                            isComplete ? 'bg-violet-500 flex-1' :
                            isCurrent ? 'bg-violet-400/60 flex-1' :
                            'bg-white/8 w-3'
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Question Card */}
                <div className="bg-gray-900/60 backdrop-blur-sm border border-white/10 rounded-3xl p-7 mb-4">
                  {/* Dimension badge */}
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-violet-400 bg-violet-500/10 border border-violet-500/20 rounded-full px-3 py-1 mb-5">
                    <Brain className="w-3 h-3" />
                    {DIMENSION_LABELS[questions[currentStep]?.dimension] || questions[currentStep]?.dimension}
                  </span>

                  <h2 className="text-xl font-bold text-white leading-relaxed mb-7">
                    {questions[currentStep]?.text}
                  </h2>

                  <div className="space-y-3">
                    {questions[currentStep]?.options.map((option, idx) => {
                      const isSelected = selectedOption === option.value;
                      return (
                        <motion.button
                          key={option.value}
                          onClick={() => handleAnswer(questions[currentStep].id, option.value)}
                          className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 flex items-center gap-4 group ${
                            isSelected
                              ? 'bg-violet-500/15 border-violet-500/50'
                              : 'bg-white/3 border-white/8 hover:bg-white/6 hover:border-white/20'
                          }`}
                          whileHover={{ x: 4 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-violet-500 text-white'
                              : 'bg-white/8 text-gray-500 group-hover:bg-white/12 group-hover:text-gray-300'
                          }`}>
                            {isSelected ? <CheckCircle2 className="w-4 h-4" /> : String.fromCharCode(65 + idx)}
                          </div>
                          <span className={`text-sm leading-relaxed transition-colors font-medium ${
                            isSelected ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'
                          }`}>
                            {option.text}
                          </span>
                          <ChevronRight className={`w-4 h-4 ml-auto flex-shrink-0 transition-all ${
                            isSelected ? 'text-violet-400 translate-x-1' : 'text-gray-700 group-hover:text-gray-500 group-hover:translate-x-1'
                          }`} />
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Trust note */}
                <p className="text-center text-xs text-gray-600">
                  Responses are used solely to personalize your training experience.
                </p>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}
