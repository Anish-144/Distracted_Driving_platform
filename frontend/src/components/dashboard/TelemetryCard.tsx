import { LucideIcon } from 'lucide-react';

interface TelemetryCardProps {
  icon: LucideIcon;
  theme: 'brand' | 'blue' | 'amber' | 'purple' | 'emerald';
  category: string;
  title: string;
  value: string | number;
  suffix?: string;
  explanation: string;
}

const themeStyles = {
  brand: {
    border: 'border-l-brand-500',
    bg: 'bg-brand-500/5',
    iconBg: 'bg-brand-500/10',
    iconColor: 'text-brand-400',
  },
  blue: {
    border: 'border-l-blue-500',
    bg: 'bg-blue-500/5',
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-400',
  },
  amber: {
    border: 'border-l-amber-500',
    bg: 'bg-amber-500/5',
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-400',
  },
  purple: {
    border: 'border-l-purple-500',
    bg: 'bg-purple-500/5',
    iconBg: 'bg-purple-500/10',
    iconColor: 'text-purple-400',
  },
  emerald: {
    border: 'border-l-emerald-500',
    bg: 'bg-emerald-500/5',
    iconBg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-400',
  }
};

export default function TelemetryCard({
  icon: Icon,
  theme,
  category,
  title,
  value,
  suffix,
  explanation
}: TelemetryCardProps) {
  const styles = themeStyles[theme];

  return (
    <div className={`card overflow-hidden relative p-6 flex flex-col h-full border-l-4 ${styles.border} ${styles.bg}`}>
      {/* Header Row */}
      <div className="flex justify-between items-start mb-4">
        <div className={`p-2 rounded-lg ${styles.iconBg}`}>
          <Icon className={`w-5 h-5 ${styles.iconColor}`} />
        </div>
        <span className="text-[10px] font-bold text-muted uppercase tracking-widest">{category}</span>
      </div>

      {/* Metric Title */}
      <h3 className="text-sm font-semibold text-secondary mb-1">{title}</h3>

      {/* Primary Metric */}
      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-3xl font-extrabold text-primary font-mono">{value}</span>
        {suffix && <span className="text-sm font-semibold text-muted">{suffix}</span>}
      </div>

      {/* Spacer to push footer down */}
      <div className="flex-1" />

      {/* Explainability Block with fixed min-height */}
      <div className="mt-auto pt-3 border-t border-subtle min-h-[80px]">
        <p className="text-xs text-muted leading-relaxed line-clamp-3">
          <strong className="text-primary">Explainability:</strong> {explanation}
        </p>
      </div>
    </div>
  );
}
