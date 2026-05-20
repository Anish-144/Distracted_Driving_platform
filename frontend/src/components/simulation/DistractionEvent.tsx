import React from 'react';
import { Phone, MessageCircle, Navigation, Activity, ShieldAlert, Zap } from 'lucide-react';
import { GeneratedScenario } from '@/api/ai';

interface DistractionEventProps {
  scenario: GeneratedScenario;
  escalationLevel: number;
}

const iconMap: Record<string, React.ReactNode> = {
  incoming_call: <Phone className="w-6 h-6" />,
  whatsapp_notification: <MessageCircle className="w-6 h-6" />,
  gps_rerouting: <Navigation className="w-6 h-6" />,
};

const colorMap: Record<string, { ring: string; bg: string; text: string; badge: string }> = {
  incoming_call: {
    ring: 'ring-red-500/50',
    bg: 'bg-red-900/30',
    text: 'text-red-400',
    badge: 'bg-red-500',
  },
  whatsapp_notification: {
    ring: 'ring-green-500/50',
    bg: 'bg-green-900/20',
    text: 'text-green-400',
    badge: 'bg-green-500',
  },
  gps_rerouting: {
    ring: 'ring-blue-500/50',
    bg: 'bg-blue-900/20',
    text: 'text-blue-400',
    badge: 'bg-blue-500',
  },
};

export default function DistractionEvent({ scenario, escalationLevel }: DistractionEventProps) {
  const colors = colorMap[scenario.distraction_type] || colorMap['incoming_call'];
  
  const getActiveEscalation = () => {
    if (escalationLevel >= 3) return scenario.escalation_stage_3;
    if (escalationLevel === 2) return scenario.escalation_stage_2;
    return scenario.escalation_stage_1;
  };

  return (
    <div className="w-full max-w-md mx-auto animate-fade-in">
      {/* Narrative Context Header */}
      <div className="mb-4 text-left border-l-2 border-brand-500 pl-3">
        <span className="text-[10px] font-bold uppercase tracking-wider text-brand-400 block mb-1">
          Live Environment Context
        </span>
        <p className="text-sm text-slate-300 leading-relaxed italic">
          {scenario.narrative_context}
        </p>
      </div>

      {/* Active Distraction Card */}
      <div className={`rounded-2xl border ${colors.ring} ${colors.bg} p-5 ring-2 backdrop-blur-md shadow-2xl relative overflow-hidden transition-all duration-300`}>
        {escalationLevel >= 3 && (
          <div className="absolute inset-0 bg-red-500/10 animate-pulse pointer-events-none" />
        )}
        
        {/* Header */}
        <div className="flex items-start gap-4 mb-4 relative z-10">
          <div className={`w-12 h-12 rounded-xl ${colors.bg} ${colors.text} flex items-center justify-center ring-1 ${colors.ring} flex-shrink-0`}>
            {iconMap[scenario.distraction_type] || <Zap className="w-6 h-6" />}
          </div>
          <div className="flex-1 pt-1">
            <div className="flex items-center gap-2">
              <span className="text-white font-bold text-sm tracking-wide capitalize">
                {scenario.distraction_type.replace('_', ' ')}
              </span>
              {escalationLevel >= 2 && (
                <span className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-mono text-gray-400 bg-gray-900/50 px-1.5 py-0.5 rounded border border-gray-700">
                Lvl {escalationLevel} Escalation
              </span>
              <span className="text-[10px] font-mono text-brand-400 uppercase">
                {scenario.emotional_pressure_type.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic Escalation Text */}
        <div className="relative z-10 bg-slate-900/80 rounded-xl p-4 border border-slate-700/50 min-h-[80px] flex items-center">
          <p className="text-gray-100 text-sm font-medium leading-relaxed">
            {getActiveEscalation()}
          </p>
        </div>
      </div>

      {/* Live Metrics HUD */}
      <div className="mt-4 flex justify-between px-2">
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 tracking-wider">
          <Activity className="w-3.5 h-3.5 text-blue-400" />
          COGNITIVE LOAD: {escalationLevel === 1 ? 'MODERATE' : escalationLevel === 2 ? 'ELEVATED' : 'CRITICAL'}
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 tracking-wider">
          <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
          TARGET: {scenario.target_weakness.toUpperCase().slice(0, 20)}...
        </div>
      </div>
    </div>
  );
}
