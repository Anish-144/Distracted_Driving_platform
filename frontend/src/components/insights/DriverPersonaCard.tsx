import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Shield, Flame, Activity, Bell, HelpCircle } from 'lucide-react';
import client from '@/api/client';

interface PersonaData {
  persona_label: string;
  persona_tagline: string;
  persona_description: string;
  top_trait: string;
  top_trait_score: number;
  danger_zone: string;
  icon_key: string;
}

const ICON_MAP: Record<string, JSX.Element> = {
  zap:          <Zap className="w-10 h-10" />,
  bell:         <Bell className="w-10 h-10" />,
  flame:        <Flame className="w-10 h-10" />,
  activity:     <Activity className="w-10 h-10" />,
  shield:       <Shield className="w-10 h-10" />,
  help_circle:  <HelpCircle className="w-10 h-10" />,
};

const GRADIENT_MAP: Record<string, string> = {
  zap:          'from-indigo-500 to-brand-400',
  bell:         'from-rose-500 to-pink-400',
  flame:        'from-orange-500 to-red-400',
  activity:     'from-amber-400 to-yellow-500',
  shield:       'from-emerald-500 to-teal-400',
  help_circle:  'from-slate-500 to-zinc-600',
};

async function fetchPersona(): Promise<PersonaData> {
  const res = await client.get('/insights/driver-persona');
  return res.data;
}

export default function DriverPersonaCard() {
  const [persona, setPersona] = useState<PersonaData | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPersona()
      .then(setPersona)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/8 bg-white/3 p-5 animate-pulse h-32" />
    );
  }
  if (!persona) return null;

  const gradient = GRADIENT_MAP[persona.icon_key] ?? GRADIENT_MAP['help_circle'];
  const icon = ICON_MAP[persona.icon_key] ?? ICON_MAP['help_circle'];

  return (
    <div className={`relative rounded-2xl overflow-hidden bg-gradient-to-br ${gradient} p-px`}>
      {/* Holographic shimmer */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{ backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
        style={{
          background: 'linear-gradient(135deg, transparent 30%, rgba(255,255,255,0.1) 50%, transparent 70%)',
          backgroundSize: '200% 200%',
        }}
      />

      <div className={`relative rounded-2xl bg-gradient-to-br ${gradient} p-5`}>
        {!revealed ? (
          // Locked / teaser state
          <motion.div
            className="flex flex-col items-center text-center py-4 cursor-pointer"
            onClick={() => setRevealed(true)}
            whileTap={{ scale: 0.97 }}
          >
            <motion.div
              className="w-16 h-16 rounded-2xl bg-black/20 border border-white/20 flex items-center justify-center mb-3 text-white"
              animate={{ scale: [1, 1.06, 1] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <HelpCircle className="w-8 h-8" />
            </motion.div>
            <p className="text-white/70 text-xs font-bold tracking-widest uppercase mb-1">Your Driver Identity</p>
            <p className="text-white text-lg font-black">Tap to Reveal</p>
          </motion.div>
        ) : (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            >
              <div className="flex items-center gap-4 mb-4">
                <motion.div
                  className="w-16 h-16 rounded-2xl bg-black/20 border border-white/20 flex items-center justify-center text-white flex-shrink-0"
                  initial={{ rotate: -15 }}
                  animate={{ rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  {icon}
                </motion.div>
                <div>
                  <p className="text-white/60 text-[10px] font-bold tracking-widest uppercase">You are</p>
                  <h2 className="text-xl font-black text-white leading-tight">{persona.persona_label}</h2>
                  <p className="text-white/70 text-xs italic mt-0.5">&ldquo;{persona.persona_tagline}&rdquo;</p>
                </div>
              </div>

              <p className="text-white/80 text-sm leading-relaxed mb-4">{persona.persona_description}</p>

              <div className="rounded-xl bg-black/20 border border-white/10 p-3">
                <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1">🚨 Your Danger Zone</p>
                <p className="text-sm font-bold text-white">{persona.danger_zone}</p>
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
