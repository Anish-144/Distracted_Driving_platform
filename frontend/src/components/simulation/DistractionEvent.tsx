import { Phone, MessageCircle, Navigation } from 'lucide-react';

interface Scenario {
  id: string;
  event_type: string;
  name: string;
  icon: string;
  instruction_text: string;
  urgency: string;
}

interface DistractionEventProps {
  scenario: Scenario;
  instructionText: string;
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

export default function DistractionEvent({ scenario, instructionText }: DistractionEventProps) {
  const colors = colorMap[scenario.event_type] || colorMap['incoming_call'];

  return (
    <div className={`distraction-event ${scenario.urgency === 'high' ? 'urgent' : ''} 
      w-full max-w-xs mx-auto`}>
      {/* Notification card */}
      <div className={`rounded-2xl border ${colors.ring} ${colors.bg} p-4 ring-2 backdrop-blur-sm shadow-xl`}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-10 h-10 rounded-xl ${colors.bg} ${colors.text} flex items-center justify-center ring-1 ${colors.ring}`}>
            {iconMap[scenario.event_type]}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-white font-semibold text-sm">{scenario.name}</span>
              {scenario.urgency === 'high' && (
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              )}
            </div>
            <span className="text-gray-400 text-xs">Now</span>
          </div>
          <div className={`${colors.badge} w-2 h-2 rounded-full animate-pulse`} />
        </div>

        {/* Body */}
        <p className="text-gray-300 text-sm leading-relaxed mb-3">{instructionText}</p>

        {/* Emoji visual */}
        <div className="text-center text-4xl">{scenario.icon}</div>
      </div>

      {/* Attention label */}
      <div className="mt-3 text-center">
        <span className={`text-xs font-semibold uppercase tracking-wider ${colors.text}`}>
          ⚡ Distraction Detected
        </span>
      </div>
    </div>
  );
}
