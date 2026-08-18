import { useEffect, useState } from 'react';
import { Volume2, User, Radio, Navigation, Smartphone, Car } from 'lucide-react';

export type VoiceActorRole = 'passenger' | 'phone' | 'car' | 'environment' | 'radio' | 'navigation';

interface VoiceContextBadgeProps {
  isActive: boolean;
  speakerLabel: string;
  contextHint: string;
  role: VoiceActorRole;
}

const roleConfig: Record<VoiceActorRole, { icon: React.ReactNode; color: string; bgColor: string }> = {
  passenger: {
    icon: <User className="w-3.5 h-3.5" />,
    color: '#a78bfa',
    bgColor: 'rgba(167,139,250,0.12)',
  },
  phone: {
    icon: <Smartphone className="w-3.5 h-3.5" />,
    color: '#34d399',
    bgColor: 'rgba(52,211,153,0.12)',
  },
  car: {
    icon: <Car className="w-3.5 h-3.5" />,
    color: '#fbbf24',
    bgColor: 'rgba(251,191,36,0.12)',
  },
  environment: {
    icon: <Volume2 className="w-3.5 h-3.5" />,
    color: '#94a3b8',
    bgColor: 'rgba(148,163,184,0.12)',
  },
  radio: {
    icon: <Radio className="w-3.5 h-3.5" />,
    color: '#f472b6',
    bgColor: 'rgba(244,114,182,0.12)',
  },
  navigation: {
    icon: <Navigation className="w-3.5 h-3.5" />,
    color: '#60a5fa',
    bgColor: 'rgba(96,165,250,0.12)',
  },
};

export default function VoiceContextBadge({ isActive, speakerLabel, contextHint, role }: VoiceContextBadgeProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isActive) {
      setVisible(true);
    } else {
      // Keep badge visible for 5 seconds after audio ends so user can read it
      const timer = setTimeout(() => setVisible(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [isActive]);

  const config = roleConfig[role] ?? roleConfig.environment;

  if (!visible) return null;

  return (
    <div
      className="w-full flex items-start gap-3 px-3 py-3 rounded-xl border"
      style={{
        background: config.bgColor,
        borderColor: `${config.color}40`,
        opacity: isActive ? 1 : 0.5,
        transition: 'opacity 1.5s ease',
      }}
    >
      {/* Animated speaker pulse */}
      <div className="flex-shrink-0 mt-0.5 relative">
        <div style={{ color: config.color }}>{config.icon}</div>
        {isActive && (
          <span
            className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full animate-ping"
            style={{ background: config.color, opacity: 0.6 }}
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-[10px] font-bold uppercase tracking-wider leading-none" style={{ color: config.color }}>
            {speakerLabel}
          </p>
          {isActive && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${config.color}20`, color: config.color }}>
              SPEAKING
            </span>
          )}
        </div>
        <p className="text-[11px] leading-snug" style={{ color: 'rgba(200,200,200,0.85)' }}>
          {contextHint}
        </p>
      </div>
    </div>
  );
}
