'use client';
import { motion, useReducedMotion } from 'framer-motion';

interface GlowOrbProps {
  size?: number;
  color?: string;
  opacity?: number;
  className?: string;
  delay?: number;
  speed?: 'slow' | 'medium' | 'fast';
}

export function GlowOrb({
  size = 400,
  color = 'rgba(5, 150, 105, 0.15)',
  opacity = 1,
  className = '',
  delay = 0,
  speed = 'slow',
}: GlowOrbProps) {
  const shouldReduce = useReducedMotion();

  const durations = { slow: 8, medium: 5, fast: 3 };
  const duration = durations[speed];

  return (
    <motion.div
      className={`absolute rounded-full pointer-events-none select-none ${className}`}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        opacity,
        filter: 'blur(1px)',
      }}
      animate={shouldReduce ? {} : {
        y: [0, -30, -15, 0],
        x: [0, 15, -10, 0],
        scale: [1, 1.02, 0.98, 1],
      }}
      transition={{
        duration,
        delay,
        ease: 'easeInOut',
        repeat: Infinity,
        repeatType: 'loop',
      }}
    />
  );
}

// Cinematic atmospheric background for dark pages
export function AtmosphericBg({ children }: { children?: React.ReactNode }) {
  const shouldReduce = useReducedMotion();

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Primary brand orb — top left */}
      <GlowOrb
        size={600}
        color="rgba(5, 150, 105, 0.12)"
        className="-top-40 -left-40"
        speed="slow"
        delay={0}
      />
      {/* Cyan orb — top right */}
      <GlowOrb
        size={500}
        color="rgba(8, 145, 178, 0.10)"
        className="-top-20 -right-20"
        speed="medium"
        delay={1.5}
      />
      {/* Deep green — bottom left */}
      <GlowOrb
        size={400}
        color="rgba(16, 185, 129, 0.08)"
        className="bottom-20 -left-20"
        speed="slow"
        delay={3}
      />
      {/* Accent orb — bottom right */}
      <GlowOrb
        size={350}
        color="rgba(8, 145, 178, 0.08)"
        className="-bottom-10 right-1/4"
        speed="fast"
        delay={2}
      />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 grid-bg-dark opacity-30"
        style={{ maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 80%)' }}
      />

      {/* Noise texture overlay */}
      {!shouldReduce && (
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat',
            backgroundSize: '256px 256px',
          }}
        />
      )}

      {children}
    </div>
  );
}

// Floating particles
export function ParticleField({ count = 8 }: { count?: number }) {
  const shouldReduce = useReducedMotion();
  if (shouldReduce) return null;

  const particles = Array.from({ length: count }, (_, i) => ({
    id: i,
    left: `${10 + (i * 11) % 80}%`,
    delay: i * 1.3,
    duration: 8 + (i % 4) * 2,
    size: 2 + (i % 3),
    opacity: 0.2 + (i % 3) * 0.1,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-brand-400"
          style={{
            left: p.left,
            bottom: '-8px',
            width: p.size,
            height: p.size,
            opacity: 0,
          }}
          animate={{
            y: [0, -window.innerHeight * 1.2],
            x: [0, (p.id % 2 === 0 ? 1 : -1) * 30],
            opacity: [0, p.opacity, p.opacity, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: 'linear',
            repeat: Infinity,
          }}
        />
      ))}
    </div>
  );
}
