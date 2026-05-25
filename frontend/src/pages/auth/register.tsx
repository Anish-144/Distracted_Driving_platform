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
import { ShieldCheck, User, Mail, Lock, Loader2, ArrowRight } from 'lucide-react';
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

export default function RegisterPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } },
  };

  const itemVariants = {
    hidden:  { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } },
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (data: RegisterForm) => {
    setIsSubmitting(true);
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
          },
          token: response.access_token,
        })
      );
      toast.success(`Welcome aboard, ${response.name}! Let's get started with a quick quiz. 🚀`);
      router.push('/onboarding');
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Registration failed. Please try again.';
      dispatch(setError(msg));
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Create Account — SafeDrive AI</title>
        <meta name="description" content="Join SafeDrive AI to start your distracted driving prevention training." />
      </Head>

      {/* Full-screen cinematic scene */}
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-app-shell transition-colors duration-400">

        {/* Theme Toggle */}
        <div className="absolute top-6 right-6 z-50">
          <ThemeToggle />
        </div>

        {/* ── Ambient background ── */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Brand orbs */}
          <motion.div
            className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(5,150,105,0.12) 0%, transparent 70%)' }}
            animate={{ y: [0, -30, 0], x: [0, 15, 0], scale: [1, 1.03, 1] }}
            transition={{ duration: 9, ease: 'easeInOut', repeat: Infinity }}
          />
          <motion.div
            className="absolute -top-20 -right-20 w-[500px] h-[500px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(8,145,178,0.10) 0%, transparent 70%)' }}
            animate={{ y: [0, -20, 0], x: [0, -15, 0] }}
            transition={{ duration: 7, delay: 1.5, ease: 'easeInOut', repeat: Infinity }}
          />
          <motion.div
            className="absolute bottom-0 left-1/4 w-[400px] h-[400px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.07) 0%, transparent 70%)' }}
            animate={{ y: [0, -20, 0] }}
            transition={{ duration: 6, delay: 3, ease: 'easeInOut', repeat: Infinity }}
          />
          <motion.div
            className="absolute -bottom-20 right-1/4 w-[350px] h-[350px] rounded-full bg-surface-secondary"
            animate={{ y: [0, 20, 0] }}
            transition={{ duration: 5, delay: 2, ease: 'easeInOut', repeat: Infinity }}
          />

          {/* Grid */}
          <div 
            className="absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage: 'linear-gradient(var(--border-subtle) 1px, transparent 1px), linear-gradient(90deg, var(--border-subtle) 1px, transparent 1px)',
              backgroundSize: '40px 40px'
            }}
          />

          {/* Floating particles */}
          {[...Array(7)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-brand-400"
              style={{
                left: `${12 + i * 13}%`,
                bottom: '-4px',
                opacity: 0,
              }}
              animate={{
                y: [0, -(typeof window !== 'undefined' ? window.innerHeight + 100 : 900)],
                opacity: [0, 0.4, 0.4, 0],
              }}
              transition={{
                duration: 10 + i * 1.5,
                delay: i * 1.8,
                ease: 'linear',
                repeat: Infinity,
              }}
            />
          ))}
        </div>

        {/* ── Register card ── */}
        <motion.div
          className="w-full max-w-md px-4 relative z-10 my-12"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Logo */}
          <motion.div className="flex flex-col items-center mb-10" variants={itemVariants}>
            <div className="flex justify-center mb-6">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center bg-tertiary border border-subtle"
              >
                <ShieldCheck className="w-6 h-6 text-primary" />
              </div>
            </div>

            <motion.h1
              className="text-3xl font-bold text-on-surface mb-1.5 tracking-tight text-center"
              variants={itemVariants}
            >
              Create Account
            </motion.h1>
            <motion.p className="text-muted text-sm text-center" variants={itemVariants}>
              Start your safe driving journey today
            </motion.p>
          </motion.div>

          {/* Glass card */}
          <motion.div
            className="rounded-2xl p-8 bg-surface border border-subtle"
            variants={itemVariants}
          >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Name */}
              <motion.div variants={itemVariants}>
                <label htmlFor="name" className="block text-sm font-medium text-secondary mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <User
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-200"
                    style={{ color: focusedField === 'name' ? 'var(--color-primary)' : '#6b7280' }}
                  />
                  <input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    className="input-field pl-10 w-full text-sm"
                    onFocus={() => setFocusedField('name')}
                    {...register('name')}
                    onBlur={(e) => { register('name').onBlur(e); setFocusedField(null); }}
                  />
                </div>
                {errors.name && <p className="mt-1.5 text-xs text-red-400">{errors.name.message}</p>}
              </motion.div>

              {/* Email */}
              <motion.div variants={itemVariants}>
                <label htmlFor="email" className="block text-sm font-medium text-secondary mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-200"
                    style={{ color: focusedField === 'email' ? 'var(--color-primary)' : '#6b7280' }}
                  />
                  <input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    className="input-field pl-10 w-full text-sm"
                    onFocus={() => setFocusedField('email')}
                    {...register('email')}
                    onBlur={(e) => { register('email').onBlur(e); setFocusedField(null); }}
                  />
                </div>
                {errors.email && <p className="mt-1.5 text-xs text-red-400">{errors.email.message}</p>}
              </motion.div>

              {/* Password */}
              <motion.div variants={itemVariants}>
                <label htmlFor="password" className="block text-sm font-medium text-secondary mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-200"
                    style={{ color: focusedField === 'password' ? 'var(--color-primary)' : '#6b7280' }}
                  />
                  <input
                    id="password"
                    type="password"
                    placeholder="Min. 6 characters"
                    className="input-field pl-10 w-full text-sm"
                    onFocus={() => setFocusedField('password')}
                    {...register('password')}
                    onBlur={(e) => { register('password').onBlur(e); setFocusedField(null); }}
                  />
                </div>
                {errors.password && <p className="mt-1.5 text-xs text-red-400">{errors.password.message}</p>}
              </motion.div>

              {/* Confirm Password */}
              <motion.div variants={itemVariants}>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-secondary mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-200"
                    style={{ color: focusedField === 'confirmPassword' ? 'var(--color-primary)' : '#6b7280' }}
                  />
                  <input
                    id="confirmPassword"
                    type="password"
                    placeholder="Re-enter password"
                    className="input-field pl-10 w-full text-sm"
                    onFocus={() => setFocusedField('confirmPassword')}
                    {...register('confirmPassword')}
                    onBlur={(e) => { register('confirmPassword').onBlur(e); setFocusedField(null); }}
                  />
                </div>
                {errors.confirmPassword && <p className="mt-1.5 text-xs text-red-400">{errors.confirmPassword.message}</p>}
              </motion.div>

              <motion.button
                id="register-submit-btn"
                type="submit"
                disabled={isSubmitting}
                className="relative w-full py-2.5 rounded-lg text-sm font-bold text-on-primary bg-primary transition-all duration-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] hover:bg-opacity-90 active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
                style={{
                  background: 'var(--color-primary)',
                  color: 'var(--color-on-primary)'
                }}
                variants={itemVariants}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>
                    Create Account
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </motion.button>
            </form>

            <motion.div className="flex items-center gap-3 my-5" variants={itemVariants}>
              <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
              <span className="text-muted text-xs">or</span>
              <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
            </motion.div>

            <motion.p className="text-center text-sm text-muted" variants={itemVariants}>
              Already have an account?{' '}
              <Link href="/auth/login" className="font-semibold transition-colors duration-200" style={{ color: '#34d399' }}>
                Sign in
              </Link>
            </motion.p>
          </motion.div>

          <motion.div className="mt-6 grid grid-cols-3 gap-3" variants={itemVariants}>
            {[
              { icon: '🎯', label: 'Behavioral Training' },
              { icon: '🤖', label: 'AI Voice Agents' },
              { icon: '📊', label: 'Progress Tracking' },
            ].map((feat) => (
              <div key={feat.label} className="text-center p-3 rounded-xl border border-subtle bg-secondary">
                <div className="text-xl mb-1">{feat.icon}</div>
                <div className="text-[10px] text-muted leading-tight">{feat.label}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </>
  );
}
