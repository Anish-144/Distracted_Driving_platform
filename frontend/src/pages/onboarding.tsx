import Head from 'next/head';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '@/store';
import { updateProfile } from '@/api/user';
import { loginSuccess } from '@/store/authSlice';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ClipboardCheck, 
  ChevronRight, 
  Car, 
  Zap, 
  ShieldCheck, 
  AlertTriangle,
  Loader2
} from 'lucide-react';

const QUESTIONS = [
  {
    id: 1,
    text: "When you receive a notification while driving, what's your typical reaction?",
    options: [
      { text: "I check it immediately; I don't want to miss anything.", value: "impulsive" },
      { text: "I wait for a red light or a slow moment to glance at it.", value: "distractible" },
      { text: "I ignore it entirely until I've reached my destination.", value: "rule_following" },
      { text: "It makes me anxious, so I try to ignore it but often feel stressed.", value: "anxious" }
    ]
  },
  {
    id: 2,
    text: "How do you feel about using GPS while navigating a busy city?",
    options: [
      { text: "I'm very confident and can look at the screen while steering.", value: "overconfident" },
      { text: "I rely on voice instructions but sometimes glance at the map.", value: "rule_following" },
      { text: "It's stressful; I handle it but find it distracting.", value: "anxious" },
      { text: "I often find myself checking it too frequently.", value: "distractible" }
    ]
  },
  {
    id: 3,
    text: "If a call starts ringing through your car's Bluetooth, do you...",
    options: [
      { text: "Pick up immediately without hesitation.", value: "impulsive" },
      { text: "Only pick up if it's family/important, otherwise ignore.", value: "moderate" }, // Placeholder for standard
      { text: "Ignore it; I prefer zero distractions while moving.", value: "rule_following" },
      { text: "Feel pressured to answer but worry about safety.", value: "anxious" }
    ]
  }
];

export default function OnboardingPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isAuthenticated, user, token } = useAppSelector((state) => state.auth);
  
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Guard
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/auth/login');
    }
  }, [isAuthenticated, router]);

  const handleAnswer = (value: string) => {
    const newAnswers = [...answers, value];
    setAnswers(newAnswers);

    if (currentStep < QUESTIONS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      finishQuiz(newAnswers);
    }
  };

  const finishQuiz = async (finalAnswers: string[]) => {
    setIsSubmitting(true);
    
    // Calculate profile type based on majority of answers
    const counts: Record<string, number> = {};
    finalAnswers.forEach(a => counts[a] = (counts[a] || 0) + 1);
    
    let resultProfile = 'rule_following';
    let maxCount = 0;
    
    for (const [profile, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count;
        resultProfile = profile;
      }
    }

    try {
      const response = await updateProfile(resultProfile);
      
      // Update local storage/redux state with new profile
      if (user && token) {
        dispatch(loginSuccess({
          user: { ...user, profile_type: response.profile_type },
          token: token
        }));
      }

      toast.success(`Profile assessed! You are categorized as: ${resultProfile.replace('_', ' ').toUpperCase()}`);
      router.push('/dashboard');
    } catch (err) {
      toast.error("Failed to save your profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthenticated || !user) return null;

  return (
    <>
      <Head>
        <title>Onboarding Quiz — SafeDrive AI</title>
      </Head>

      <div className="min-h-screen bg-surface-900 flex flex-col items-center justify-center px-4 py-8 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-600/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="w-full max-w-xl relative z-10">
          <div className="flex flex-col items-center mb-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center mb-6 shadow-brand animate-pulse-glow">
              <ClipboardCheck className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Driver Personality Quiz</h1>
            <p className="text-gray-400">Help us customize your training experience by answering a few quick questions.</p>
          </div>

          <div className="relative min-h-[400px]">
             <AnimatePresence mode="wait">
               {isSubmitting ? (
                 <motion.div 
                   key="submitting"
                   initial={{ opacity: 0, scale: 0.95 }}
                   animate={{ opacity: 1, scale: 1 }}
                   className="card flex flex-col items-center justify-center py-20 text-center"
                 >
                   <Loader2 className="w-12 h-12 text-brand-400 animate-spin mb-4" />
                   <h3 className="text-xl font-semibold text-white">Analyzing Your Profile...</h3>
                   <p className="text-gray-400 mt-2">We&apos;re preparing your custom safety roadmap.</p>
                 </motion.div>
               ) : (
                 <motion.div
                   key={currentStep}
                   initial={{ opacity: 0, x: 20 }}
                   animate={{ opacity: 1, x: 0 }}
                   exit={{ opacity: 0, x: -20 }}
                   transition={{ duration: 0.3 }}
                   className="space-y-6"
                 >
                   <div className="flex items-center justify-between mb-2">
                     <span className="text-xs font-bold text-brand-400 uppercase tracking-widest">
                       Question {currentStep + 1} of {QUESTIONS.length}
                     </span>
                     <div className="flex gap-1">
                       {QUESTIONS.map((_, i) => (
                         <div 
                           key={i} 
                           className={`h-1.5 w-8 rounded-full transition-colors duration-500 ${i <= currentStep ? 'bg-brand-500' : 'bg-surface-600'}`} 
                         />
                       ))}
                     </div>
                   </div>

                   <h2 className="text-2xl font-bold text-white leading-tight min-h-[3.5rem]">
                     {QUESTIONS[currentStep].text}
                   </h2>

                   <div className="grid gap-3 pt-4">
                     {QUESTIONS[currentStep].options.map((option, idx) => (
                       <button
                         key={idx}
                         onClick={() => handleAnswer(option.value)}
                         className="group card hover:bg-surface-700 hover:border-brand-500/50 transition-all duration-300 text-left p-4 flex items-center gap-4 relative overflow-hidden"
                       >
                         <div className="w-10 h-10 rounded-lg bg-surface-600 group-hover:bg-brand-900/40 flex items-center justify-center text-gray-400 group-hover:text-brand-400 transition-colors">
                           {idx === 0 && <Zap className="w-5 h-5" />}
                           {idx === 1 && <AlertTriangle className="w-5 h-5" />}
                           {idx === 2 && <ShieldCheck className="w-5 h-5" />}
                           {idx === 3 && <Car className="w-5 h-5" />}
                         </div>
                         <span className="text-gray-200 font-medium group-hover:text-white transition-colors">{option.text}</span>
                         <ChevronRight className="w-5 h-5 text-gray-600 ml-auto group-hover:text-brand-400 group-hover:translate-x-1 transition-all" />
                       </button>
                     ))}
                   </div>
                 </motion.div>
               )}
             </AnimatePresence>
          </div>
        </div>
      </div>
    </>
  );
}
