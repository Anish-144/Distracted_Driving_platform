/**
 * Hydration-safe motion primitives.
 *
 * Key design decisions:
 * 1. `useReducedMotion()` reads window.matchMedia — browser-only.
 *    We use `initial={false}` on all motion components so Framer Motion
 *    skips the initial animation on hydration and never renders
 *    `opacity:0 / y:32` in the server HTML.
 *    This means server and client both render the final visible state,
 *    eliminating the hydration mismatch entirely.
 *
 * 2. `useInView` is safe for SSR — it returns false until the element
 *    is observed, but since we use `initial={false}` the "hidden" state
 *    is never written to the DOM anyway.
 *
 * 3. Animations still play on the client (Framer Motion animates FROM the
 *    rendered state TO the target on mount), preserving the visual effect.
 */
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { useRef, ReactNode } from 'react';

// ── Shared easing ──────────────────────────────────────────────────────────────
const EXPO_OUT = [0.16, 1, 0.3, 1] as const;

// ── FadeUp ────────────────────────────────────────────────────────────────────
interface FadeUpProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
  once?: boolean;
  amount?: number;
  as?: keyof JSX.IntrinsicElements;
}

export function FadeUp({
  children,
  delay = 0,
  duration = 0.7,
  className = '',
  once = true,
  amount = 0.12,
  as = 'div',
}: FadeUpProps) {
  const ref = useRef<HTMLElement>(null);
  const shouldReduce = useReducedMotion();
  const isInView = useInView(ref as any, { once, amount });

  const MotionTag = (motion as any)[as];

  // `initial={false}` → no SSR mismatch; Framer Motion starts from the
  // current rendered state and animates to target on mount.
  return (
    <MotionTag
      ref={ref}
      className={className}
      initial={false}
      animate={
        isInView
          ? { opacity: 1, y: 0 }
          : { opacity: 0, y: shouldReduce ? 0 : 20 }
      }
      transition={{
        duration: shouldReduce ? 0.15 : duration,
        delay: shouldReduce ? 0 : delay,
        ease: EXPO_OUT,
      }}
    >
      {children}
    </MotionTag>
  );
}

// ── StaggerContainer ──────────────────────────────────────────────────────────
interface StaggerContainerProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
  initialDelay?: number;
  once?: boolean;
  amount?: number;
}

const staggerVariants = {
  hidden: {},
  visible: (custom: { staggerDelay: number; initialDelay: number }) => ({
    transition: {
      staggerChildren: custom.staggerDelay,
      delayChildren: custom.initialDelay,
    },
  }),
};

const childFadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: EXPO_OUT },
  },
};

export function StaggerContainer({
  children,
  className = '',
  staggerDelay = 0.07,
  initialDelay = 0.05,
  once = true,
  amount = 0.1,
}: StaggerContainerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const shouldReduce = useReducedMotion();
  const isInView = useInView(ref, { once, amount });

  if (shouldReduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      variants={staggerVariants}
      initial={false}
      animate={isInView ? 'visible' : 'hidden'}
      custom={{ staggerDelay, initialDelay }}
    >
      {children}
    </motion.div>
  );
}

export { childFadeUp };

// ── AnimatedCard ──────────────────────────────────────────────────────────────
interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  hoverLift?: boolean;
  once?: boolean;
}

export function AnimatedCard({
  children,
  className = '',
  delay = 0,
  hoverLift = true,
  once = true,
}: AnimatedCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const shouldReduce = useReducedMotion();
  const isInView = useInView(ref, { once, amount: 0.1 });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={false}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 16, scale: 0.98 }}
      transition={{ duration: 0.6, delay, ease: EXPO_OUT }}
      whileHover={hoverLift && !shouldReduce ? { y: -3, transition: { duration: 0.2 } } : undefined}
    >
      {children}
    </motion.div>
  );
}

// ── ScaleIn ───────────────────────────────────────────────────────────────────
interface ScaleInProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  once?: boolean;
}

export function ScaleIn({ children, className = '', delay = 0, once = true }: ScaleInProps) {
  const ref = useRef<HTMLDivElement>(null);
  const shouldReduce = useReducedMotion();
  const isInView = useInView(ref, { once, amount: 0.15 });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={false}
      animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.94 }}
      transition={{
        duration: shouldReduce ? 0.1 : 0.6,
        delay: shouldReduce ? 0 : delay,
        ease: EXPO_OUT,
      }}
    >
      {children}
    </motion.div>
  );
}
