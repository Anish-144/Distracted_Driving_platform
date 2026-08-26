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
import { login } from '@/api/auth';
import { extractErrorMessage } from '@/api/client';
import { Car, Mail, Lock, Loader2, ArrowRight, Zap, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import ThemeToggle from '@/components/common/ThemeToggle';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.2 } },
};

const itemVariants = {
  hidden:  { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] } },
};

// Feature points — human-centered copy, no status readouts
const FEATURES = [
  {
    icon: '🎯',
    label: 'Behavioral Coaching',
    desc: 'Personalized interventions based on your unique driving patterns',
  },
  {
    icon: '🤖',
    label: 'AI Pattern Recognition',
    desc: 'Real-time analysis of attention and focus habits while driving',
  },
  {
    icon: '📈',
    label: 'Progress Tracking',
    desc: 'Understand your improvement journey with clear, actionable insights',
  },
];

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setIsSubmitting(true);
    dispatch(setLoading(true));
    try {
      const response = await login(data.email, data.password);
      dispatch(loginSuccess({
        user: {
          id: response.user_id,
          name: response.name,
          email: response.email,
          profile_type: response.profile_type,
          is_admin: response.is_admin,
        },
        token: response.access_token,
      }));
      toast.success(`Welcome back, ${response.name}!`);
      if (response.is_admin) {
        router.push('/admin/dashboard');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      const msg = extractErrorMessage(err, 'Login failed. Please check your credentials.');
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
        <title>Sign In — SafeDrive AI</title>
        <meta name="description" content="Sign in to your SafeDrive AI account and continue your journey toward safer, more focused driving." />
      </Head>

      {/* Full-screen two-panel layout — fully theme-responsive */}
      <div className="min-h-screen flex overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>

        {/* Theme Toggle */}
        <div className="absolute top-5 right-5 z-50">
          <ThemeToggle />
        </div>

        {/* ── LEFT PANEL — Brand Identity ── */}
        <motion.div
          className="hidden lg:flex lg:w-[52%] flex-col justify-between relative overflow-hidden"
          style={{ backgroundColor: 'var(--bg-secondary)', borderRight: '1px solid var(--border-subtle)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7 }}
        >
          {/* Soft ambient radial mesh — warm, NOT cyber grid */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: [
                'radial-gradient(ellipse 70% 60% at 15% 20%, rgba(74, 109, 130, 0.09) 0%, transparent 70%)',
                'radial-gradient(ellipse 60% 50% at 85% 75%, rgba(107, 138, 107, 0.07) 0%, transparent 70%)',
                'radial-gradient(ellipse 50% 80% at 50% 50%, rgba(142, 126, 116, 0.04) 0%, transparent 80%)',
              ].join(', '),
            }}
          />

          {/* Main brand content — vertically centered */}
          <div className="relative z-10 flex flex-col items-start justify-center flex-1 px-14 py-16">

            {/* Brand mark */}
            <motion.div
              className="flex items-center justify-center w-12 h-12 rounded-2xl mb-8"
              style={{
                backgroundColor: 'var(--color-primary)',
                boxShadow: '0 4px 16px rgba(74, 109, 130, 0.25)',
              }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Car className="w-6 h-6" style={{ color: 'var(--color-on-primary)' }} />
            </motion.div>

            {/* Wordmark */}
            <motion.h1
              className="text-4xl font-medium mb-2"
              style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.25 }}
            >
              SafeDrive AI
            </motion.h1>

            {/* Tagline — human copy, not system language */}
            <motion.p
              className="text-sm font-medium mb-10"
              style={{ color: 'var(--text-secondary)', letterSpacing: '0.01em' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.55, delay: 0.35 }}
            >
              Drive Focused. Stay Present.
            </motion.p>

            {/* Feature list — human-centered bullets */}
            <motion.div
              className="space-y-4 w-full"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.45 }}
            >
              {FEATURES.map((feat) => (
                <div
                  key={feat.label}
                  className="flex items-start gap-4 rounded-2xl px-4 py-3.5"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--card-border)',
                    boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
                  }}
                >
                  <span className="text-xl mt-0.5 flex-shrink-0">{feat.icon}</span>
                  <div>
                    <p className="text-sm font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>
                      {feat.label}
                    </p>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {feat.desc}
                    </p>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Footer — clean, minimal */}
          <div
            className="relative z-10 px-14 pb-8"
            style={{ borderTop: '1px solid var(--border-subtle)' }}
          >
            <p className="text-xs pt-6" style={{ color: 'var(--text-muted)', letterSpacing: '0.02em' }}>
              AI-powered distracted driving prevention platform
            </p>
          </div>
        </motion.div>

        {/* ── RIGHT PANEL — Auth Form ── */}
        <motion.div
          className="flex-1 flex flex-col items-center justify-center relative px-6 py-12"
          style={{ backgroundColor: 'var(--bg-primary)' }}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Mobile brand mark */}
          <motion.div className="lg:hidden flex items-center gap-3 mb-10" variants={itemVariants}>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              <Car className="w-5 h-5" style={{ color: 'var(--color-on-primary)' }} />
            </div>
            <span className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>SafeDrive AI</span>
          </motion.div>

          {/* Form container */}
          <div className="w-full max-w-sm">

            {/* Heading */}
            <motion.div className="mb-8" variants={itemVariants}>
              <h2
                className="text-xl font-semibold mb-1.5"
                style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}
              >
                Welcome back
              </h2>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Sign in to continue your driving journey
              </p>
            </motion.div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

              {/* Email */}
              <motion.div variants={itemVariants}>
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold uppercase mb-2"
                  style={{ color: 'var(--text-secondary)', letterSpacing: '0.06em' }}
                >
                  Email Address
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-150"
                    style={{ color: focusedField === 'email' ? 'var(--color-primary)' : 'var(--text-muted)' }}
                  />
                  <input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl transition-all duration-150 outline-none"
                    style={{
                      backgroundColor: 'var(--input-bg)',
                      border: `1px solid ${focusedField === 'email' ? 'var(--color-primary)' : 'var(--input-border)'}`,
                      color: 'var(--input-text)',
                      boxShadow: focusedField === 'email' ? '0 0 0 3px rgba(74, 109, 130, 0.12)' : 'none',
                    }}
                    onFocus={() => setFocusedField('email')}
                    {...register('email')}
                    onBlur={(e) => {
                      register('email').onBlur(e);
                      setFocusedField(null);
                    }}
                  />
                </div>
                {errors.email && (
                  <p className="mt-1.5 text-xs" style={{ color: '#A85C5C' }}>{errors.email.message}</p>
                )}
              </motion.div>

              {/* Password */}
              <motion.div variants={itemVariants}>
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold uppercase mb-2"
                  style={{ color: 'var(--text-secondary)', letterSpacing: '0.06em' }}
                >
                  Password
                </label>
                <div className="relative">
                  <Lock
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-150"
                    style={{ color: focusedField === 'password' ? 'var(--color-primary)' : 'var(--text-muted)' }}
                  />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl transition-all duration-150 outline-none"
                    style={{
                      backgroundColor: 'var(--input-bg)',
                      border: `1px solid ${focusedField === 'password' ? 'var(--color-primary)' : 'var(--input-border)'}`,
                      color: 'var(--input-text)',
                      boxShadow: focusedField === 'password' ? '0 0 0 3px rgba(74, 109, 130, 0.12)' : 'none',
                    }}
                    onFocus={() => setFocusedField('password')}
                    {...register('password')}
                    onBlur={(e) => {
                      register('password').onBlur(e);
                      setFocusedField(null);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 outline-none transition-colors duration-150"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4 hover:opacity-80" /> : <Eye className="w-4 h-4 hover:opacity-80" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1.5 text-xs" style={{ color: '#A85C5C' }}>{errors.password.message}</p>
                )}
              </motion.div>

              {/* Primary CTA */}
              <motion.button
                id="login-submit-btn"
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.99] disabled:opacity-60 mt-2"
                style={{
                  backgroundColor: 'var(--color-primary)',
                  color: 'var(--color-on-primary)',
                  boxShadow: '0 4px 14px rgba(74, 109, 130, 0.25)',
                }}
                variants={itemVariants}
                whileHover={{ filter: 'brightness(1.06)', translateY: -1 }}
                whileTap={{ scale: 0.99 }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </motion.button>


            </form>

            {/* Divider */}
            <motion.div className="flex items-center gap-3 my-6" variants={itemVariants}>
              <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border-subtle)' }} />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>or</span>
              <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border-subtle)' }} />
            </motion.div>

            <motion.p className="text-center text-sm" style={{ color: 'var(--text-secondary)' }} variants={itemVariants}>
              Don&apos;t have an account?{' '}
              <Link
                href="/auth/register"
                className="font-semibold transition-colors duration-150"
                style={{ color: 'var(--color-primary)' }}
              >
                Create one
              </Link>
            </motion.p>

            {/* Footer */}
            <motion.p
              className="text-center text-xs mt-8"
              style={{ color: 'var(--text-muted)', letterSpacing: '0.01em' }}
              variants={itemVariants}
            >
              Your behavioral driving platform
            </motion.p>
          </div>
        </motion.div>
      </div>
    </>
  );
}
