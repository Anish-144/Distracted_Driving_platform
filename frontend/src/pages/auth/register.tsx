import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAppDispatch } from '@/store';
import { loginSuccess, setLoading, setError } from '@/store/authSlice';
import { register as registerUser } from '@/api/auth';
import { User, Mail, Lock, Loader2, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import ThemeToggle from '@/components/common/ThemeToggle';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type RegisterForm = z.infer<typeof registerSchema>;

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } } };
const fadeUp = { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } } };

const FEATURES = [
  { num: '01', title: 'Behavioral Coaching', desc: 'Personalized driver interventions' },
  { num: '02', title: 'Pattern Recognition', desc: 'Real-time attention analysis' },
  { num: '03', title: 'Progress Tracking', desc: 'Measurable improvement over time' },
];

export default function RegisterPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    setIsSubmitting(true);
    dispatch(setLoading(true));
    try {
      const response = await registerUser({
        name: data.name,
        email: data.email,
        password: data.password,
      });
      dispatch(
        loginSuccess({
          user: {
            id: response.user_id,
            name: response.name,
            email: response.email,
            profile_type: response.profile_type,
            is_admin: response.is_admin,
          },
          token: response.access_token,
        })
      );
      toast.success(`Welcome aboard, ${response.name}!`);
      router.push('/onboarding');
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Registration failed. Please try again.';
      dispatch(setError(msg));
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
      dispatch(setLoading(false));
    }
  };

  return (
    <>
      <Head>
        <title>Create Account — SafeDrive AI</title>
        <meta name="description" content="Join SafeDrive AI and start your journey toward safer, more focused driving through behavioral intelligence." />
      </Head>

      <div className="min-h-screen flex overflow-hidden" style={{ background: 'var(--bg-canvas)' }}>

        {/* ── LEFT PANEL — Editorial Brand ─────────────────────────── */}
        <motion.div
          className="hidden lg:flex lg:w-[55%] flex-col relative"
          style={{ background: 'var(--bg-canvas)', borderRight: '1px solid var(--border-subtle)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          {/* Top rule */}
          <div className="h-px w-full" style={{ background: 'var(--border-subtle)' }} />

          {/* Logo row */}
          <div className="flex items-center justify-between px-12 py-5">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold tracking-[0.10em] uppercase" style={{ color: 'var(--text-primary)' }}>
                SAFEDRIVE
              </span>
              <div className="w-px h-3" style={{ background: 'var(--border-strong)' }} />
              <span className="text-[10px] font-medium tracking-[0.12em] uppercase" style={{ color: 'var(--text-muted)' }}>
                Training Platform
              </span>
            </div>
          </div>

          {/* Main content — vertically centered */}
          <div className="flex-1 flex flex-col justify-center px-12 pb-16">

            {/* Editorial headline */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="mb-6"
            >
              <h1
                className="leading-none font-bold mb-0"
                style={{
                  fontSize: '5.5rem',
                  letterSpacing: '-0.04em',
                  color: 'var(--text-primary)',
                  fontFamily: 'Space Grotesk, sans-serif',
                  lineHeight: 0.9,
                }}
              >
                BUILD
              </h1>
              <h1
                className="leading-none font-bold"
                style={{
                  fontSize: '5.5rem',
                  letterSpacing: '-0.04em',
                  color: 'var(--text-primary)',
                  fontFamily: 'Space Grotesk, sans-serif',
                  lineHeight: 0.9,
                }}
              >
                BETTER.
              </h1>
              <div className="mt-2">
                <span
                  className="inline-block font-bold px-4 py-1"
                  style={{
                    fontSize: '5.5rem',
                    letterSpacing: '-0.04em',
                    lineHeight: 0.9,
                    fontFamily: 'Space Grotesk, sans-serif',
                    background: '#C8FF00',
                    color: '#1A1814',
                  }}
                >
                  HABITS
                </span>
              </div>
            </motion.div>

            <motion.p
              className="text-sm mb-10"
              style={{ color: 'var(--text-secondary)', maxWidth: '380px' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              Start your journey toward safer, more focused driving through behavioral intelligence.
            </motion.p>

            {/* Feature rows */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.4 }}
              className="border-t"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              {FEATURES.map((f) => (
                <div
                  key={f.num}
                  className="grid grid-cols-[2.5rem_1fr_auto] items-center py-3 gap-4 border-b"
                  style={{ borderColor: 'var(--border-subtle)' }}
                >
                  <span className="text-xs font-semibold font-mono tabular-nums" style={{ color: 'var(--text-muted)' }}>
                    {f.num}
                  </span>
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {f.title}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {f.desc}
                  </span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Footer rule */}
          <div className="border-t px-12 py-4 flex items-center justify-between" style={{ borderColor: 'var(--border-subtle)' }}>
            <span className="text-[10px] font-medium tracking-[0.08em] uppercase" style={{ color: 'var(--text-muted)' }}>
              © 2025 Shreya Dixit Foundation
            </span>
            <span className="text-[10px] font-medium tracking-[0.08em] uppercase" style={{ color: 'var(--text-muted)' }}>
              v1.0
            </span>
          </div>
        </motion.div>

        {/* ── RIGHT PANEL — Auth Form ──────────────────────────────── */}
        <motion.div
          className="flex-1 flex flex-col overflow-y-auto"
          style={{ background: 'var(--bg-surface)' }}
          variants={stagger}
          initial="hidden"
          animate="visible"
        >
          {/* Top rule */}
          <div className="h-px w-full" style={{ background: 'var(--border-subtle)' }} />

          {/* Top bar */}
          <div className="px-10 py-5 flex items-center justify-between flex-shrink-0">
            {/* Mobile logo */}
            <span className="lg:hidden text-sm font-bold tracking-[0.10em] uppercase" style={{ color: 'var(--text-primary)' }}>
              SAFEDRIVE
            </span>
            <span className="hidden lg:block text-[10px] font-semibold tracking-[0.12em] uppercase" style={{ color: 'var(--text-muted)' }}>
              SIGN UP
            </span>
            <ThemeToggle />
          </div>

          {/* Form — centered */}
          <div className="flex-1 flex items-center justify-center px-8 py-12">
            <div className="w-full max-w-[340px]">

              <motion.div className="mb-8" variants={fadeUp}>
                <h2
                  className="font-bold mb-1.5"
                  style={{
                    fontSize: '1.75rem',
                    letterSpacing: '-0.025em',
                    color: 'var(--text-primary)',
                    fontFamily: 'Space Grotesk, sans-serif',
                  }}
                >
                  Create account.
                </h2>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Start your behavioral driving training today.
                </p>
              </motion.div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

                {/* Full Name */}
                <motion.div variants={fadeUp}>
                  <label
                    htmlFor="name"
                    className="block text-[10px] font-semibold uppercase mb-2"
                    style={{ color: 'var(--text-muted)', letterSpacing: '0.10em' }}
                  >
                    Full Name
                  </label>
                  <div className="relative">
                    <User
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
                      style={{ color: focusedField === 'name' ? 'var(--text-primary)' : 'var(--text-muted)' }}
                    />
                    <input
                      id="name"
                      type="text"
                      placeholder="John Doe"
                      className="w-full pl-9 pr-4 py-2.5 text-sm outline-none transition-all duration-150"
                      style={{
                        background: 'var(--bg-input)',
                        border: `1px solid ${focusedField === 'name' ? 'var(--border-focus)' : 'var(--input-border)'}`,
                        color: 'var(--input-text)',
                        borderRadius: '4px',
                        fontFamily: 'Space Grotesk, sans-serif',
                      }}
                      onFocus={() => setFocusedField('name')}
                      {...register('name')}
                      onBlur={(e) => { register('name').onBlur(e); setFocusedField(null); }}
                    />
                  </div>
                  {errors.name && (
                    <p className="mt-1.5 text-xs" style={{ color: 'var(--text-destructive)' }}>{errors.name.message}</p>
                  )}
                </motion.div>

                {/* Email */}
                <motion.div variants={fadeUp}>
                  <label
                    htmlFor="email"
                    className="block text-[10px] font-semibold uppercase mb-2"
                    style={{ color: 'var(--text-muted)', letterSpacing: '0.10em' }}
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
                      style={{ color: focusedField === 'email' ? 'var(--text-primary)' : 'var(--text-muted)' }}
                    />
                    <input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      className="w-full pl-9 pr-4 py-2.5 text-sm outline-none transition-all duration-150"
                      style={{
                        background: 'var(--bg-input)',
                        border: `1px solid ${focusedField === 'email' ? 'var(--border-focus)' : 'var(--input-border)'}`,
                        color: 'var(--input-text)',
                        borderRadius: '4px',
                        fontFamily: 'Space Grotesk, sans-serif',
                      }}
                      onFocus={() => setFocusedField('email')}
                      {...register('email')}
                      onBlur={(e) => { register('email').onBlur(e); setFocusedField(null); }}
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-1.5 text-xs" style={{ color: 'var(--text-destructive)' }}>{errors.email.message}</p>
                  )}
                </motion.div>

                {/* Password */}
                <motion.div variants={fadeUp}>
                  <label
                    htmlFor="password"
                    className="block text-[10px] font-semibold uppercase mb-2"
                    style={{ color: 'var(--text-muted)', letterSpacing: '0.10em' }}
                  >
                    Password
                  </label>
                  <div className="relative">
                    <Lock
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
                      style={{ color: focusedField === 'password' ? 'var(--text-primary)' : 'var(--text-muted)' }}
                    />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Min. 6 characters"
                      className="w-full pl-9 pr-9 py-2.5 text-sm outline-none transition-all duration-150"
                      style={{
                        background: 'var(--bg-input)',
                        border: `1px solid ${focusedField === 'password' ? 'var(--border-focus)' : 'var(--input-border)'}`,
                        color: 'var(--input-text)',
                        borderRadius: '4px',
                        fontFamily: 'Space Grotesk, sans-serif',
                      }}
                      onFocus={() => setFocusedField('password')}
                      {...register('password')}
                      onBlur={(e) => { register('password').onBlur(e); setFocusedField(null); }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors duration-100"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1.5 text-xs" style={{ color: 'var(--text-destructive)' }}>{errors.password.message}</p>
                  )}
                </motion.div>

                {/* Confirm Password */}
                <motion.div variants={fadeUp}>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-[10px] font-semibold uppercase mb-2"
                    style={{ color: 'var(--text-muted)', letterSpacing: '0.10em' }}
                  >
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
                      style={{ color: focusedField === 'confirmPassword' ? 'var(--text-primary)' : 'var(--text-muted)' }}
                    />
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Re-enter password"
                      className="w-full pl-9 pr-9 py-2.5 text-sm outline-none transition-all duration-150"
                      style={{
                        background: 'var(--bg-input)',
                        border: `1px solid ${focusedField === 'confirmPassword' ? 'var(--border-focus)' : 'var(--input-border)'}`,
                        color: 'var(--input-text)',
                        borderRadius: '4px',
                        fontFamily: 'Space Grotesk, sans-serif',
                      }}
                      onFocus={() => setFocusedField('confirmPassword')}
                      {...register('confirmPassword')}
                      onBlur={(e) => { register('confirmPassword').onBlur(e); setFocusedField(null); }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors duration-100"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-1.5 text-xs" style={{ color: 'var(--text-destructive)' }}>{errors.confirmPassword.message}</p>
                  )}
                </motion.div>

                {/* Submit — flat black + chartreuse text */}
                <motion.button
                  id="register-submit-btn"
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-150 disabled:opacity-40 mt-2 group"
                  style={{
                    background: 'var(--text-primary)',
                    color: '#C8FF00',
                    borderRadius: '4px',
                    fontFamily: 'Space Grotesk, sans-serif',
                    letterSpacing: '0.02em',
                  }}
                  variants={fadeUp}
                  whileHover={{ background: 'var(--color-dark-hover)' }}
                  whileTap={{ scale: 0.99 }}
                >
                  {isSubmitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />Creating account...</>
                  ) : (
                    <>CREATE ACCOUNT <ArrowRight className="w-3.5 h-3.5" /></>
                  )}
                </motion.button>
              </form>

              {/* Divider */}
              <motion.div className="flex items-center gap-3 my-6" variants={fadeUp}>
                <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>or</span>
                <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
              </motion.div>

              <motion.p className="text-sm" style={{ color: 'var(--text-secondary)' }} variants={fadeUp}>
                Already have an account?{' '}
                <Link
                  href="/auth/login"
                  className="font-semibold transition-colors duration-100"
                  style={{ color: 'var(--text-primary)', textDecoration: 'underline', textDecorationColor: '#C8FF00', textUnderlineOffset: '3px' }}
                >
                  Sign in →
                </Link>
              </motion.p>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}
