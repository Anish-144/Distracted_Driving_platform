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
import { ShieldCheck, Mail, Lock, Loader2, ArrowRight, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import ThemeToggle from '@/components/common/ThemeToggle';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.4 } },
};

const itemVariants = {
  hidden:  { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } },
};

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

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
        },
        token: response.access_token,
      }));
      toast.success(`Welcome back, ${response.name}! 🚗`);
      router.push('/dashboard');
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Login failed. Please check your credentials.';
      dispatch(setError(msg));
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBypass = () => {
    dispatch(loginSuccess({
      user: {
        id: 'dev-user-id',
        name: 'Developer Test',
        email: 'test@example.com',
        profile_type: 'moderate',
      },
      token: 'mock-dev-token',
    }));
    toast.success('Bypassing login for testing purposes! ⚡');
    router.push('/dashboard');
  };

  return (
    <>
      <Head>
        <title>Login — SafeDrive AI</title>
        <meta name="description" content="Sign in to your SafeDrive AI account to continue your training." />
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
            className="absolute -bottom-20 right-1/4 w-[350px] h-[350px] rounded-full bg-slate-900/10"
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
              className="absolute w-1 h-1 rounded-full bg-slate-400"
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

        {/* ── Login card ── */}
        <motion.div
          className="w-full max-w-md px-4 relative z-10"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Logo */}
          <motion.div className="flex flex-col items-center mb-10" variants={itemVariants}>
            <div className="flex justify-center mb-6">
              <div 
                className="w-16 h-16 rounded-2xl flex items-center justify-center bg-slate-800 border border-slate-700"
              >
                <ShieldCheck className="w-8 h-8 text-white" />
              </div>
            </div>

            <motion.h1
              className="text-3xl font-bold text-white mb-1.5 tracking-tight"
              variants={itemVariants}
            >
              SafeDrive AI
            </motion.h1>
            <motion.p className="text-slate-400 text-sm" variants={itemVariants}>
              Sign in to your training account
            </motion.p>
          </motion.div>

          {/* Glass card */}
          <motion.div
            className="rounded-2xl p-8 bg-slate-900 border border-slate-800"
            variants={itemVariants}
          >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Email */}
              <motion.div variants={itemVariants}>
                <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"
                  />
                  <input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-slate-600 transition-colors"
                    onFocus={() => setFocusedField('email')}
                    {...register('email')}
                    onBlur={(e) => {
                      register('email').onBlur(e);
                      setFocusedField(null);
                    }}
                  />
                </div>
                {errors.email && (
                  <p className="mt-1.5 text-xs text-red-400">{errors.email.message}</p>
                )}
              </motion.div>

              {/* Password */}
              <motion.div variants={itemVariants}>
                <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"
                  />
                  <input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-slate-600 transition-colors"
                    onFocus={() => setFocusedField('password')}
                    {...register('password')}
                    onBlur={(e) => {
                      register('password').onBlur(e);
                      setFocusedField(null);
                    }}
                  />
                </div>
                {errors.password && (
                  <p className="mt-1.5 text-xs text-red-400">{errors.password.message}</p>
                )}
              </motion.div>

              {/* Submit */}
              <motion.button
                id="login-submit-btn"
                type="submit"
                disabled={isSubmitting}
                className="relative w-full py-3 rounded-xl text-sm font-bold bg-white text-black hover:bg-slate-200 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
                variants={itemVariants}
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

              {/* Dev bypass */}
              <motion.button
                type="button"
                onClick={handleBypass}
                className="w-full py-2.5 px-4 text-sm font-medium rounded-xl flex items-center justify-center gap-2 transition-all duration-200"
                style={{
                  color: '#34d399',
                  background: 'rgba(5,150,105,0.08)',
                  border: '1px solid rgba(5,150,105,0.18)',
                }}
                whileHover={{ background: 'rgba(5,150,105,0.14)' }}
                whileTap={{ scale: 0.98 }}
                variants={itemVariants}
              >
                <Zap className="w-3.5 h-3.5" />
                Bypass (Dev Test)
              </motion.button>
            </form>

            {/* Divider */}
            <motion.div className="flex items-center gap-3 my-5" variants={itemVariants}>
              <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
              <span className="text-muted text-xs">or</span>
              <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
            </motion.div>

            <motion.p className="text-center text-sm text-muted" variants={itemVariants}>
              Don&apos;t have an account?{' '}
              <Link
                href="/auth/register"
                className="font-semibold transition-colors duration-200"
                style={{ color: '#34d399' }}
              >
                Create one free
              </Link>
            </motion.p>
          </motion.div>

          <motion.p
            className="text-center text-xs text-secondary mt-6"
            variants={itemVariants}
          >
            AI-Powered Distracted Driving Training Platform
          </motion.p>
        </motion.div>
      </div>
    </>
  );
}
